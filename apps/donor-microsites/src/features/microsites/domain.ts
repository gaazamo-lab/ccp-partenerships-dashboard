/**
 * S091 microsite rules, as pure functions.
 *
 * The in-memory repository, the provider and the screens all ask these
 * functions — so the button that is disabled, the message beside it and the
 * rule the repository enforces can never disagree. Mirrors
 * `docs/architecture/new-module-rules.md` § S091.
 */
import type {
  CreateMicrositeInput,
  Microsite,
  MicrositeAccess,
  MicrositeAccessInput,
  MicrositeBlock,
  MicrositeBlockType,
  MicrositeReview,
  MicrositeReviewInput,
  MicrositeStatus,
  MicrositeTemplate,
  PublicMicrosite,
  UpdateMicrositeInput,
} from '@partner-crm/types';

/* ------------------------------------------------------------------ status */

export const MICROSITE_STATUSES: readonly MicrositeStatus[] = [
  'DRAFT',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED',
];

/** Content (`PUT /microsites/:id`) may only change in these states. */
export const EDITABLE_STATUSES: readonly MicrositeStatus[] = [
  'DRAFT',
  'CHANGES_REQUESTED',
  'APPROVED',
];

/** Every legal move, including the implicit "edit sends it back to draft". */
export const STATUS_TRANSITIONS: Record<MicrositeStatus, readonly MicrositeStatus[]> = {
  DRAFT: ['IN_REVIEW', 'ARCHIVED'],
  IN_REVIEW: ['APPROVED', 'CHANGES_REQUESTED', 'ARCHIVED'],
  CHANGES_REQUESTED: ['DRAFT', 'ARCHIVED'],
  APPROVED: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
  PUBLISHED: ['APPROVED', 'ARCHIVED'],
  ARCHIVED: [],
};

export function canTransition(from: MicrositeStatus, to: MicrositeStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function isEditable(status: MicrositeStatus): boolean {
  return EDITABLE_STATUSES.includes(status);
}

/** Why content cannot be edited right now, or `null` when it can. */
export function editBlocker(status: MicrositeStatus): string | null {
  switch (status) {
    case 'IN_REVIEW':
      return 'This version is with RMF/CCP review. Wait for a decision before editing.';
    case 'PUBLISHED':
      return 'Published content is frozen. Unpublish the site to make changes.';
    case 'ARCHIVED':
      return 'Archived microsites are read-only.';
    default:
      return null;
  }
}

/**
 * The status after a content edit: approval covers one specific version, and
 * a requested change is answered by a new draft.
 */
export function statusAfterEdit(status: MicrositeStatus): MicrositeStatus {
  return status === 'APPROVED' || status === 'CHANGES_REQUESTED' ? 'DRAFT' : status;
}

/* -------------------------------------------------------------------- slugs */

export const SLUG_MIN = 3;
export const SLUG_MAX = 60;
const SLUG_PATTERN = /^[a-z0-9-]+$/;

export function slugError(slug: string): string | null {
  if (!slug) return 'Slug is required.';
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    return `Slug must be ${SLUG_MIN}–${SLUG_MAX} characters.`;
  }
  if (!SLUG_PATTERN.test(slug)) {
    return 'Use lowercase letters, numbers and hyphens only.';
  }
  return null;
}

/** `2026 Annual Report — Côte d'Ivoire` -> `2026-annual-report-cote-d-ivoire`. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
}

function slugTaken(slug: string, existing: readonly Pick<Microsite, 'id' | 'slug'>[], selfId?: string) {
  return existing.some((site) => site.id !== selfId && site.slug === slug);
}

/* --------------------------------------------------------------- validation */

export type FieldErrors = Record<string, string>;

const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isHexColour(value: string): boolean {
  return HEX_COLOUR.test(value);
}

export function validateCreate(
  input: CreateMicrositeInput,
  existing: readonly Pick<Microsite, 'id' | 'slug'>[],
  templates: readonly Pick<MicrositeTemplate, 'id'>[],
): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.title.trim()) errors.title = 'Title is required.';
  const slugProblem = slugError(input.slug);
  if (slugProblem) errors.slug = slugProblem;
  else if (slugTaken(input.slug, existing)) errors.slug = 'Another microsite already uses this slug.';
  if (!input.owner.trim()) errors.owner = 'Owner is required.';
  if (!templates.some((template) => template.id === input.templateId)) {
    errors.templateId = 'Choose a template.';
  }
  return errors;
}

/** Only these link targets are rendered; everything else is dropped. */
export function safeHref(url: string): string | null {
  const value = url.trim();
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return null;
}

const METRIC_SOURCE = /^S(225|150):\S+$/;
const CURRENCY = /^[A-Z]{3}$/;

/** Problems per block, keyed by block ID. Empty when every block is valid. */
export function validateBlocks(blocks: readonly MicrositeBlock[]): Record<string, string[]> {
  const problems: Record<string, string[]> = {};
  const add = (id: string, message: string) => {
    (problems[id] ??= []).push(message);
  };

  for (const block of blocks) {
    block.metrics.forEach((metric, index) => {
      const row = `Metric ${index + 1}`;
      if (!metric.label.trim() || !metric.value.trim()) add(block.id, `${row} needs a label and a value.`);
      if (!METRIC_SOURCE.test(metric.sourceRef.trim())) {
        add(block.id, `${row} needs an S225 or S150 source reference, e.g. S225:annual-intake-2026.`);
      }
    });
    block.allocations.forEach((allocation, index) => {
      const row = `Allocation ${index + 1}`;
      if (!allocation.label.trim()) add(block.id, `${row} needs a label.`);
      if (!Number.isFinite(allocation.amount) || allocation.amount < 0) {
        add(block.id, `${row} amount must be zero or more.`);
      }
    });
    if (block.type === 'FUND_UTILISATION' && !CURRENCY.test(block.currency)) {
      add(block.id, 'Currency must be a three-letter ISO code such as GHS.');
    }
    block.links.forEach((link, index) => {
      const row = `Link ${index + 1}`;
      if (!link.label.trim()) add(block.id, `${row} needs a label.`);
      if (!safeHref(link.url)) add(block.id, `${row} must be an https://, mailto: or site-relative address.`);
    });
    block.assetRefs.forEach((ref, index) => {
      if (!ref.trim()) add(block.id, `Media item ${index + 1} is empty.`);
    });
  }
  return problems;
}

export function validateUpdate(
  siteId: string,
  input: UpdateMicrositeInput,
  existing: readonly Pick<Microsite, 'id' | 'slug'>[],
): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.title.trim()) errors.title = 'Title is required.';
  const slugProblem = slugError(input.slug);
  if (slugProblem) errors.slug = slugProblem;
  else if (slugTaken(input.slug, existing, siteId)) errors.slug = 'Another microsite already uses this slug.';
  if (input.accentColor && !isHexColour(input.accentColor)) {
    errors.accentColor = 'Use a hex colour such as #1F4E79, or leave empty for the CLET brand colour.';
  }
  const blockProblems = validateBlocks(input.blocks);
  for (const [id, messages] of Object.entries(blockProblems)) {
    errors[`blocks.${id}`] = messages.join(' ');
  }
  return errors;
}

/* ------------------------------------------------------------------- access */

export const ACCESS_CODE_MIN = 8;

/**
 * Whether the requested access settings are acceptable.
 * `hasStoredCode`: a code is already stored for this site (codes are never
 * returned, so the caller supplies what it knows).
 */
export function validateAccess(
  input: MicrositeAccessInput,
  current: { access: MicrositeAccess; hasStoredCode: boolean },
): FieldErrors {
  const errors: FieldErrors = {};
  if (input.access === 'PASSWORD') {
    const code = input.accessCode;
    if (code !== undefined && code !== '') {
      if (code.length < ACCESS_CODE_MIN) {
        errors.accessCode = `Access code must be at least ${ACCESS_CODE_MIN} characters.`;
      }
    } else if (current.access !== 'PASSWORD' || !current.hasStoredCode) {
      errors.accessCode = 'Set an access code to password-protect this microsite.';
    }
  }
  if (input.access === 'NAMED_AUDIENCE' && normaliseStakeholderIds(input.audienceStakeholderIds).length === 0) {
    errors.audienceStakeholderIds = 'Add at least one S081 stakeholder ID for a named audience.';
  }
  return errors;
}

/** Trims, drops blanks and duplicates (case-insensitive), keeps first spelling. */
export function normaliseStakeholderIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id.toLowerCase())) continue;
    seen.add(id.toLowerCase());
    result.push(id);
  }
  return result;
}

/** Splits free text (commas, spaces or new lines) into stakeholder IDs. */
export function parseStakeholderIds(text: string): string[] {
  return normaliseStakeholderIds(text.split(/[\s,;]+/));
}

/** Whether the site's stored access settings would allow it to be published. */
export function accessSettingsValid(
  site: Pick<Microsite, 'access' | 'audienceStakeholderIds'>,
  hasStoredCode: boolean,
): boolean {
  if (site.access === 'PASSWORD') return hasStoredCode;
  if (site.access === 'NAMED_AUDIENCE') return site.audienceStakeholderIds.length > 0;
  return true;
}

/* ------------------------------------------------------------------ reviews */

/** Who submitted the site's current version, from its review history. */
export function submitterOf(
  site: Pick<Microsite, 'id' | 'version'>,
  reviews: readonly MicrositeReview[],
): string | null {
  const submissions = reviews
    .filter(
      (review) =>
        review.micrositeId === site.id &&
        review.version === site.version &&
        review.decision === 'SUBMITTED',
    )
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return submissions[0]?.actor ?? null;
}

function sameActor(left: string | null, right: string): boolean {
  return left !== null && left.trim().toLowerCase() === right.trim().toLowerCase();
}

/** Reasons the review decision cannot be recorded; empty when it can. */
export function reviewBlockers(
  site: Pick<Microsite, 'id' | 'version' | 'status'>,
  input: MicrositeReviewInput,
  actor: string,
  reviews: readonly MicrositeReview[],
): string[] {
  const blockers: string[] = [];
  if (input.decision === 'SUBMITTED') {
    if (site.status !== 'DRAFT') {
      blockers.push(
        site.status === 'CHANGES_REQUESTED'
          ? 'Make the requested changes first — the next edit returns the site to draft.'
          : 'Only a draft can be submitted for review.',
      );
    }
    return blockers;
  }

  if (site.status !== 'IN_REVIEW') {
    blockers.push('Only a microsite in review can be approved or sent back.');
  }
  if (input.decision === 'CHANGES_REQUESTED' && !input.comment.trim()) {
    blockers.push('Explain the changes you are requesting.');
  }
  if (input.decision === 'APPROVED' && sameActor(submitterOf(site, reviews), actor)) {
    blockers.push('You submitted this version, so someone else must approve it (four-eyes rule).');
  }
  return blockers;
}

export function statusAfterReview(decision: MicrositeReviewInput['decision']): MicrositeStatus {
  if (decision === 'SUBMITTED') return 'IN_REVIEW';
  return decision;
}

/* ------------------------------------------------------------------ publish */

export interface PublishCheck {
  id: 'approved' | 'blocks' | 'access';
  label: string;
  passed: boolean;
}

export function publishChecks(
  site: Pick<Microsite, 'status' | 'blocks' | 'access' | 'audienceStakeholderIds'>,
  hasStoredCode: boolean,
): PublishCheck[] {
  return [
    { id: 'approved', label: 'The current version is approved', passed: site.status === 'APPROVED' },
    { id: 'blocks', label: 'The microsite has at least one content block', passed: site.blocks.length > 0 },
    {
      id: 'access',
      label: 'Access settings are complete',
      passed: accessSettingsValid(site, hasStoredCode),
    },
  ];
}

export function publishBlockers(
  site: Pick<Microsite, 'status' | 'blocks' | 'access' | 'audienceStakeholderIds'>,
  hasStoredCode: boolean,
): string[] {
  const messages: Record<PublishCheck['id'], string> = {
    approved: 'Only an approved microsite can be published.',
    blocks: 'Add at least one content block before publishing.',
    access: 'Complete the access settings before publishing.',
  };
  return publishChecks(site, hasStoredCode)
    .filter((check) => !check.passed)
    .map((check) => messages[check.id]);
}

export function unpublishBlocker(status: MicrositeStatus): string | null {
  return status === 'PUBLISHED' ? null : 'Only a published microsite can be unpublished.';
}

export function archiveBlockers(status: MicrositeStatus, archiveRef: string): string[] {
  const blockers: string[] = [];
  if (status === 'ARCHIVED') blockers.push('This microsite is already archived.');
  if (!archiveRef.trim()) blockers.push('An S003 archive reference is required.');
  return blockers;
}

/* ------------------------------------------------------------------- blocks */

export const BLOCK_TYPES: readonly MicrositeBlockType[] = [
  'HERO',
  'RICH_TEXT',
  'METRICS',
  'FUND_UTILISATION',
  'STORY',
  'QUOTE',
  'GALLERY',
  'CALL_TO_ACTION',
  'DOWNLOADS',
];

/** Blocks whose `assetRefs` hold S080 media. */
export const MEDIA_BLOCK_TYPES: readonly MicrositeBlockType[] = ['HERO', 'STORY', 'GALLERY'];
/** Blocks whose `links` are rendered. */
export const LINK_BLOCK_TYPES: readonly MicrositeBlockType[] = ['CALL_TO_ACTION', 'DOWNLOADS'];

const DEFAULT_HEADINGS: Record<MicrositeBlockType, string> = {
  HERO: '',
  RICH_TEXT: 'Introduction',
  METRICS: 'Impact at a glance',
  FUND_UTILISATION: 'How the funds were used',
  STORY: 'Story of change',
  QUOTE: '',
  GALLERY: 'Gallery',
  CALL_TO_ACTION: 'Get involved',
  DOWNLOADS: 'Downloads',
};

export const DEFAULT_CURRENCY = 'GHS';

/** A new, empty block of the given type with sensible defaults. */
export function createBlock(type: MicrositeBlockType, id: string): MicrositeBlock {
  return {
    id,
    type,
    heading: DEFAULT_HEADINGS[type],
    body: '',
    assetRefs: [],
    metrics: [],
    allocations: [],
    currency: DEFAULT_CURRENCY,
    links: [],
    attribution: '',
  };
}

/** One empty block per template entry, in the template's order. */
export function seedBlocks(
  template: Pick<MicrositeTemplate, 'blockTypes'>,
  nextId: () => string,
): MicrositeBlock[] {
  return template.blockTypes.map((type) => createBlock(type, nextId()));
}

export function moveBlock<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as T);
  return next;
}

/** Whether a block has anything a visitor would see. */
export function blockHasContent(block: MicrositeBlock): boolean {
  return Boolean(
    block.heading.trim() ||
      block.body.trim() ||
      block.assetRefs.length ||
      block.metrics.length ||
      block.allocations.length ||
      block.links.length,
  );
}

/* ------------------------------------------------------------ presentation */

export interface AllocationShare {
  label: string;
  amount: number;
  /** Share of the total, 0–100, one decimal place. */
  percent: number;
}

export function allocationShares(block: Pick<MicrositeBlock, 'allocations'>): {
  total: number;
  rows: AllocationShare[];
} {
  const rows = block.allocations.filter((row) => Number.isFinite(row.amount) && row.amount >= 0);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return {
    total,
    rows: rows.map((row) => ({
      label: row.label,
      amount: row.amount,
      percent: total > 0 ? Number(((row.amount / total) * 100).toFixed(1)) : 0,
    })),
  };
}

/** `GHS 4,200,000`. Falls back gracefully on an unknown currency code. */
export function formatMoney(amount: number, currency: string): string {
  const code = currency.trim().toUpperCase() || DEFAULT_CURRENCY;
  try {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace(/\u00a0/g, ' ');
  } catch {
    return `${code} ${Math.round(amount).toLocaleString('en-GH')}`;
  }
}

/** Asset references that are already a web address render as images. */
export function isImageUrl(ref: string): boolean {
  return ref.trim().startsWith('https://');
}

/** The accent to paint with; the brand primary when unset or malformed. */
export function accentOf(site: Pick<PublicMicrosite, 'accentColor'>): string {
  return site.accentColor && isHexColour(site.accentColor) ? site.accentColor : 'var(--clet-primary)';
}

/** What the public viewer would receive for this site — used by the admin preview. */
export function toPublicView(
  site: Pick<Microsite, 'slug' | 'title' | 'tagline' | 'purpose' | 'accentColor' | 'blocks' | 'publishedAt' | 'updatedAt'>,
): PublicMicrosite {
  return {
    slug: site.slug,
    title: site.title,
    tagline: site.tagline,
    purpose: site.purpose,
    accentColor: site.accentColor,
    blocks: site.blocks,
    publishedAt: site.publishedAt ?? site.updatedAt,
  };
}

/** `184` -> `3m 04s`. */
export function formatDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return minutes > 0 ? `${minutes}m ${String(rest).padStart(2, '0')}s` : `${rest}s`;
}
