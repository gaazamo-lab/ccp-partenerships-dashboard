import { ApiError, type MicrositesRepository } from '@partner-crm/api-client';
import type {
  ApiEnvelope,
  Microsite,
  MicrositeReview,
  MicrositeTemplate,
  PublicMicrosite,
} from '@partner-crm/types';

import {
  ACCESS_CODE_MIN,
  archiveBlockers,
  isEditable,
  normaliseStakeholderIds,
  publishBlockers,
  reviewBlockers,
  seedBlocks,
  statusAfterEdit,
  statusAfterReview,
  toPublicView,
  unpublishBlocker,
  validateAccess,
  validateCreate,
  validateUpdate,
} from '@/features/microsites/domain';

import { SEED_TEMPLATES, type SeedMicrosite, seedMicrosites, seedReviews } from './seed';

/**
 * In-memory S091 backend for mock mode.
 *
 * It enforces the same rules as the service (`new-module-rules.md` § S091) and
 * fails the same way — an `ApiError` carrying `{ code, message, fieldErrors }`
 * with 401/404/409/422/429 — so the screens handle one error shape in both
 * modes. Nothing is persisted: a reload restores the seed, and unlocks live
 * only as long as this module does.
 */

export interface MemoryRepositoryOptions {
  /** Name recorded on reviews; the backend takes it from the session. */
  actor?: () => string;
  now?: () => Date;
  seed?: SeedMicrosite[];
  reviews?: MicrositeReview[];
  templates?: MicrositeTemplate[];
  /** Failed unlocks allowed per slug inside the lock-out window. */
  maxUnlockAttempts?: number;
}

const UNLOCK_WINDOW_MS = 5 * 60 * 1000;

function ok<T>(data: T): ApiEnvelope<T> {
  return { success: true, data: structuredClone(data) };
}

function fail(status: number, code: string, message: string, fieldErrors: Record<string, string> = {}): never {
  throw new ApiError(message, status, {
    code,
    message,
    fieldErrors,
    correlationId: `mock-${Math.random().toString(36).slice(2, 10)}`,
  });
}

function invalid(fieldErrors: Record<string, string>): void {
  const messages = Object.values(fieldErrors);
  if (messages.length > 0) fail(422, 'VALIDATION_ERROR', messages[0] as string, fieldErrors);
}

function conflict(messages: string[]): void {
  if (messages.length > 0) fail(409, 'STATE_CONFLICT', messages[0] as string);
}

export interface MemoryMicrositesRepository extends MicrositesRepository {
  /** Mock-only: whether a PASSWORD code is stored (codes are never returned). */
  hasAccessCode(id: string): boolean;
}

export function createMemoryMicrositesRepository(
  options: MemoryRepositoryOptions = {},
): MemoryMicrositesRepository {
  const actor = options.actor ?? (() => 'Mock user');
  const now = options.now ?? (() => new Date());
  const maxAttempts = options.maxUnlockAttempts ?? 5;
  const templates = structuredClone(options.templates ?? SEED_TEMPLATES);
  const sites = new Map<string, Microsite>();
  const codes = new Map<string, string>();
  const reviews: MicrositeReview[] = structuredClone(options.reviews ?? seedReviews());
  const unlocked = new Set<string>();
  const visitorsCounted = new Set<string>();
  const failedUnlocks = new Map<string, number[]>();

  for (const { site, accessCode } of structuredClone(options.seed ?? seedMicrosites())) {
    sites.set(site.id, site);
    if (accessCode) codes.set(site.id, accessCode);
  }

  const stamp = () => now().toISOString();
  const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

  function find(id: string): Microsite {
    const site = sites.get(id);
    if (!site) fail(404, 'NOT_FOUND', 'This microsite no longer exists.');
    return site;
  }

  function findPublished(slug: string): Microsite {
    const site = [...sites.values()].find((item) => item.slug === slug && item.status === 'PUBLISHED');
    if (!site) fail(404, 'NOT_FOUND', 'This microsite is not available.');
    return site;
  }

  function save(site: Microsite): Microsite {
    sites.set(site.id, site);
    return site;
  }

  function publicView(site: Microsite): PublicMicrosite {
    return toPublicView(site);
  }

  function isRestricted(site: Microsite) {
    return site.access !== 'PUBLIC';
  }

  function recentFailures(slug: string): number[] {
    const cutoff = now().getTime() - UNLOCK_WINDOW_MS;
    const recent = (failedUnlocks.get(slug) ?? []).filter((time) => time > cutoff);
    failedUnlocks.set(slug, recent);
    return recent;
  }

  return {
    hasAccessCode: (id) => codes.has(id),

    async list() {
      return ok(
        [...sites.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
      );
    },

    async get(id) {
      return ok(find(id));
    },

    async create(input) {
      const trimmed = {
        ...input,
        title: input.title.trim(),
        slug: input.slug.trim(),
        tagline: input.tagline.trim(),
        owner: input.owner.trim(),
      };
      invalid(validateCreate(trimmed, [...sites.values()], templates));
      const template = templates.find((item) => item.id === trimmed.templateId) as MicrositeTemplate;
      const at = stamp();
      const site: Microsite = {
        id: newId('ms'),
        slug: trimmed.slug,
        title: trimmed.title,
        tagline: trimmed.tagline,
        purpose: trimmed.purpose,
        templateId: template.id,
        status: 'DRAFT',
        access: 'PUBLIC',
        audienceStakeholderIds: [],
        accentColor: '',
        owner: trimmed.owner,
        blocks: seedBlocks(template, () => newId('blk')),
        version: 1,
        publishedVersion: null,
        publishedAt: null,
        archivedAt: null,
        archiveRef: null,
        analytics: { views: 0, uniqueVisitors: 0, averageSeconds: 0, downloads: 0, lastViewedAt: null },
        createdAt: at,
        updatedAt: at,
      };
      return ok(save(site));
    },

    async update(id, input) {
      const site = find(id);
      if (!isEditable(site.status)) {
        fail(409, 'STATE_CONFLICT', `A microsite that is ${site.status.toLowerCase().replace('_', ' ')} cannot be edited.`);
      }
      const next = {
        ...input,
        title: input.title.trim(),
        slug: input.slug.trim(),
        tagline: input.tagline.trim(),
        accentColor: input.accentColor.trim(),
      };
      invalid(validateUpdate(id, next, [...sites.values()]));
      return ok(
        save({
          ...site,
          ...next,
          blocks: structuredClone(next.blocks),
          status: statusAfterEdit(site.status),
          version: site.version + 1,
          updatedAt: stamp(),
        }),
      );
    },

    async setAccess(id, input) {
      const site = find(id);
      if (site.status === 'ARCHIVED') fail(409, 'STATE_CONFLICT', 'Archived microsites cannot change access.');
      invalid(validateAccess(input, { access: site.access, hasStoredCode: codes.has(id) }));
      if (input.access === 'PASSWORD' && input.accessCode && input.accessCode.length >= ACCESS_CODE_MIN) {
        codes.set(id, input.accessCode);
      }
      if (input.access !== 'PASSWORD') codes.delete(id);
      // New settings apply at once: nobody keeps an unlock granted under the old ones.
      unlocked.delete(site.slug);
      return ok(
        save({
          ...site,
          access: input.access,
          audienceStakeholderIds:
            input.access === 'NAMED_AUDIENCE' ? normaliseStakeholderIds(input.audienceStakeholderIds) : [],
          updatedAt: stamp(),
        }),
      );
    },

    async review(id, input) {
      const site = find(id);
      const who = actor();
      conflict(reviewBlockers(site, input, who, reviews));
      reviews.push({
        id: newId('rev'),
        micrositeId: id,
        version: site.version,
        decision: input.decision,
        comment: input.comment.trim(),
        actor: who,
        occurredAt: stamp(),
      });
      return ok(save({ ...site, status: statusAfterReview(input.decision), updatedAt: stamp() }));
    },

    async listReviews(id) {
      find(id);
      // Newest first; entries recorded in the same instant keep reverse insertion order.
      return ok(
        reviews
          .map((review, index) => ({ review, index }))
          .filter(({ review }) => review.micrositeId === id)
          .sort(
            (left, right) =>
              right.review.occurredAt.localeCompare(left.review.occurredAt) || right.index - left.index,
          )
          .map(({ review }) => review),
      );
    },

    async publish(id) {
      const site = find(id);
      conflict(publishBlockers(site, codes.has(id)));
      const at = stamp();
      return ok(
        save({ ...site, status: 'PUBLISHED', publishedVersion: site.version, publishedAt: at, updatedAt: at }),
      );
    },

    async unpublish(id) {
      const site = find(id);
      const blocker = unpublishBlocker(site.status);
      if (blocker) conflict([blocker]);
      return ok(save({ ...site, status: 'APPROVED', updatedAt: stamp() }));
    },

    async archive(id, input) {
      const site = find(id);
      const blockers = archiveBlockers(site.status, input.archiveRef);
      if (!input.archiveRef.trim()) invalid({ archiveRef: blockers[blockers.length - 1] as string });
      conflict(blockers);
      const at = stamp();
      unlocked.delete(site.slug);
      return ok(
        save({ ...site, status: 'ARCHIVED', archiveRef: input.archiveRef.trim(), archivedAt: at, updatedAt: at }),
      );
    },

    async listTemplates() {
      return ok(templates);
    },

    async listPublic() {
      // Restricted sites are never advertised; their audience gets the link directly.
      return ok(
        [...sites.values()]
          .filter((site) => site.status === 'PUBLISHED' && site.access === 'PUBLIC')
          .sort((left, right) => (right.publishedAt ?? '').localeCompare(left.publishedAt ?? ''))
          .map(publicView),
      );
    },

    async getPublic(slug) {
      const site = findPublished(slug);
      if (isRestricted(site) && !unlocked.has(slug)) {
        fail(401, 'MICROSITE_LOCKED', 'This microsite is restricted. Enter your access code to continue.');
      }
      return ok(publicView(site));
    },

    async unlock(slug, input) {
      const site = findPublished(slug);
      if (!isRestricted(site)) return ok(publicView(site));
      if (recentFailures(slug).length >= maxAttempts) {
        fail(429, 'TOO_MANY_ATTEMPTS', 'Too many incorrect codes. Wait a few minutes and try again.');
      }
      const code = input.accessCode.trim();
      const accepted =
        site.access === 'PASSWORD'
          ? code.length > 0 && code === codes.get(site.id)
          : // Mock stand-in for personal invite codes: the invitee's S081 ID.
            site.audienceStakeholderIds.some((id) => id.toLowerCase() === code.toLowerCase());
      if (!accepted) {
        failedUnlocks.set(slug, [...recentFailures(slug), now().getTime()]);
        fail(401, 'INVALID_ACCESS_CODE', 'That access code is not correct.');
      }
      failedUnlocks.delete(slug);
      unlocked.add(slug);
      return ok(publicView(site));
    },

    async recordView(slug) {
      const site = findPublished(slug);
      const firstVisit = !visitorsCounted.has(slug);
      visitorsCounted.add(slug);
      save({
        ...site,
        analytics: {
          ...site.analytics,
          views: site.analytics.views + 1,
          uniqueVisitors: site.analytics.uniqueVisitors + (firstVisit ? 1 : 0),
          lastViewedAt: stamp(),
        },
      });
    },
  };
}
