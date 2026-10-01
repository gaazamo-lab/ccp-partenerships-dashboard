import type { KolRepository } from '@partner-crm/api-client';
import type {
  ApiEnvelope,
  KolContent,
  KolEngagement,
  KolInput,
  KolMediaMention,
  KolProfile,
} from '@partner-crm/types';

import {
  engagementCreationError,
  engagementTransitionError,
  firstError,
  normaliseTags,
  participationError,
  validateContentInput,
  validateContentMove,
  validateEngagementInput,
  validateKolInput,
  validateMentionInput,
} from '@/features/kol/domain';

import { seedContent, seedEngagements, seedMentions, seedProfiles } from './seedData';

export interface MemoryKolRepositoryDeps {
  /** Whether an S081 stakeholder ID exists in the register. */
  stakeholderExists: (id: string) => boolean;
  /** Display name recorded against participation and reviews. */
  currentUser: () => string;
  /** Injectable clock for tests. */
  now?: () => Date;
}

export interface MemoryKolSeed {
  profiles: KolProfile[];
  engagements: KolEngagement[];
  content: KolContent[];
  mentions: KolMediaMention[];
}

/** Thrown for rejected commands, carrying the same `status` the backend would return. */
export class KolRuleError extends Error {
  readonly status: 404 | 409 | 422;

  constructor(message: string, status: 404 | 409 | 422) {
    super(message);
    this.name = 'KolRuleError';
    this.status = status;
  }
}

function ok<T>(data: T): Promise<ApiEnvelope<T>> {
  return Promise.resolve({ success: true, data: structuredClone(data) });
}

function reject(message: string, status: 404 | 409 | 422): Promise<never> {
  return Promise.reject(new KolRuleError(message, status));
}

function cleanInput(input: KolInput): KolInput {
  return {
    ...input,
    fullName: input.fullName.trim(),
    honorific: input.honorific.trim(),
    organisation: input.organisation.trim(),
    position: input.position.trim(),
    stakeholderId: input.stakeholderId?.trim() || null,
    alumniRef: input.alumniRef?.trim() || null,
    email: input.email.trim(),
    phone: input.phone.trim(),
    expertise: normaliseTags(input.expertise),
    influenceAreas: normaliseTags(input.influenceAreas),
    relationshipOwner: input.relationshipOwner.trim(),
    riskNotes: input.riskNotes.trim(),
    bio: input.bio.trim(),
  };
}

/**
 * Seeded, rule-enforcing stand-in for the S092 backend used in mock data mode.
 * Every command validates with the same domain rules the backend applies and
 * rejects with a readable `Error` (404 missing, 409 state conflict, 422 validation).
 */
export function createMemoryKolRepository(
  deps: MemoryKolRepositoryDeps,
  seed: MemoryKolSeed = {
    profiles: seedProfiles,
    engagements: seedEngagements,
    content: seedContent,
    mentions: seedMentions,
  },
): KolRepository {
  const store: MemoryKolSeed = structuredClone(seed);
  const now = () => (deps.now ? deps.now() : new Date()).toISOString();
  const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

  const findProfile = (id: string) => store.profiles.find((item) => item.id === id);

  const validateProfile = (input: KolInput, excludeId?: string) =>
    firstError(
      validateKolInput(input, {
        profiles: store.profiles,
        excludeId,
        stakeholderExists: deps.stakeholderExists,
      }),
    );

  return {
    list(query = {}) {
      const term = query.search?.trim().toLowerCase() ?? '';
      const rows = store.profiles.filter((profile) => {
        if (query.category && profile.category !== query.category) return false;
        if (query.status && profile.status !== query.status) return false;
        if (query.stakeholderId && profile.stakeholderId !== query.stakeholderId) return false;
        if (term) {
          const haystack = [
            profile.fullName,
            profile.organisation,
            profile.position,
            profile.email,
            ...profile.expertise,
            ...profile.influenceAreas,
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      });
      return ok(rows);
    },

    get(id) {
      const profile = findProfile(id);
      return profile ? ok(profile) : reject('KOL profile not found.', 404);
    },

    create(raw) {
      const input = cleanInput(raw);
      const error = validateProfile(input);
      if (error) return reject(error, 422);
      const timestamp = now();
      const profile: KolProfile = { id: newId('kol'), ...input, createdAt: timestamp, updatedAt: timestamp };
      store.profiles.unshift(profile);
      return ok(profile);
    },

    update(id, raw) {
      const index = store.profiles.findIndex((item) => item.id === id);
      const current = store.profiles[index];
      if (!current) return reject('KOL profile not found.', 404);
      const input = cleanInput(raw);
      const error = validateProfile(input, id);
      if (error) return reject(error, 422);
      const profile: KolProfile = { ...current, ...input, updatedAt: now() };
      store.profiles[index] = profile;
      return ok(profile);
    },

    listEngagements(kolId) {
      return ok(store.engagements.filter((item) => !kolId || item.kolId === kolId));
    },

    createEngagement(kolId, raw) {
      const profile = findProfile(kolId);
      if (!profile) return reject('KOL profile not found.', 404);
      const archived = engagementCreationError(profile);
      if (archived) return reject(archived, 409);
      const input = {
        ...raw,
        title: raw.title.trim(),
        owner: raw.owner.trim(),
        externalRef: raw.externalRef?.trim() || null,
        notes: raw.notes.trim(),
        scheduledFor: raw.scheduledFor || null,
      };
      const error = firstError(validateEngagementInput(input));
      if (error) return reject(error, 422);
      const timestamp = now();
      const engagement: KolEngagement = {
        id: newId('keng'),
        kolId,
        ...input,
        stage: 'PLANNED',
        participation: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      store.engagements.unshift(engagement);
      return ok(engagement);
    },

    moveEngagement(id, input) {
      const index = store.engagements.findIndex((item) => item.id === id);
      const current = store.engagements[index];
      if (!current) return reject('Engagement not found.', 404);
      const error = engagementTransitionError(current.stage, input.stage);
      if (error) return reject(error, 409);
      const timestamp = now();
      const note = input.note.trim();
      const entry = note
        ? `[${timestamp.slice(0, 10)}] ${input.stage.toLowerCase()}: ${note}`
        : '';
      const engagement: KolEngagement = {
        ...current,
        stage: input.stage,
        notes: [current.notes, entry].filter(Boolean).join('\n'),
        updatedAt: timestamp,
      };
      store.engagements[index] = engagement;
      return ok(engagement);
    },

    recordParticipation(id, input) {
      const index = store.engagements.findIndex((item) => item.id === id);
      const current = store.engagements[index];
      if (!current) return reject('Engagement not found.', 404);
      const error = participationError(current, input);
      if (error) return reject(error, current.stage === 'COMPLETED' || current.stage === 'CONFIRMED' ? 422 : 409);
      const timestamp = now();
      const engagement: KolEngagement = {
        ...current,
        stage: 'COMPLETED',
        participation: {
          attended: input.attended,
          outputs: input.outputs.trim(),
          feedback: input.feedback.trim(),
          contributionScore: input.contributionScore,
          recordedAt: timestamp,
          recordedBy: deps.currentUser(),
        },
        updatedAt: timestamp,
      };
      store.engagements[index] = engagement;
      return ok(engagement);
    },

    listContent(kolId) {
      return ok(store.content.filter((item) => !kolId || item.kolId === kolId));
    },

    createContent(kolId, raw) {
      if (!findProfile(kolId)) return reject('KOL profile not found.', 404);
      const input = { ...raw, title: raw.title.trim(), dueDate: raw.dueDate || null };
      const error = firstError(validateContentInput(input));
      if (error) return reject(error, 422);
      const timestamp = now();
      const content: KolContent = {
        id: newId('kcnt'),
        kolId,
        ...input,
        stage: 'COMMISSIONED',
        draftRef: null,
        reviewer: null,
        reviewNotes: '',
        cmsRef: null,
        publishedUrl: null,
        publishedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      store.content.unshift(content);
      return ok(content);
    },

    moveContent(id, input) {
      const index = store.content.findIndex((item) => item.id === id);
      const current = store.content[index];
      if (!current) return reject('Content item not found.', 404);
      const errors = validateContentMove(current, input);
      if (errors.stage) return reject(errors.stage, 409);
      const error = firstError(errors);
      if (error) return reject(error, 422);
      const timestamp = now();
      const next: KolContent = { ...current, stage: input.stage, updatedAt: timestamp };
      if (input.stage === 'DRAFT_SUBMITTED') next.draftRef = input.draftRef?.trim() ?? null;
      if (['IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'].includes(input.stage)) {
        next.reviewer = deps.currentUser();
      }
      if (input.reviewNotes !== undefined && input.reviewNotes.trim()) {
        next.reviewNotes = input.reviewNotes.trim();
      }
      if (input.stage === 'PUBLISHED') {
        next.publishedUrl = input.publishedUrl?.trim() ?? null;
        next.cmsRef = input.cmsRef?.trim() || current.cmsRef;
        next.publishedAt = timestamp;
      }
      store.content[index] = next;
      return ok(next);
    },

    listMentions(kolId) {
      return ok(store.mentions.filter((item) => !kolId || item.kolId === kolId));
    },

    addMention(kolId, raw) {
      if (!findProfile(kolId)) return reject('KOL profile not found.', 404);
      const input = {
        ...raw,
        outlet: raw.outlet.trim(),
        headline: raw.headline.trim(),
        url: raw.url.trim(),
        contentId: raw.contentId || null,
      };
      const error = firstError(validateMentionInput(input));
      if (error) return reject(error, 422);
      if (input.contentId) {
        const content = store.content.find((item) => item.id === input.contentId);
        if (!content || content.kolId !== kolId) {
          return reject('The linked content item does not belong to this KOL.', 422);
        }
      }
      const mention: KolMediaMention = { id: newId('kmen'), kolId, ...input, source: 'MANUAL' };
      store.mentions.unshift(mention);
      return ok(mention);
    },
  };
}
