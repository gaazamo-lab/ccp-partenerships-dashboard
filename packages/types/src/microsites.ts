/**
 * S091 Donor / Annual-Report Microsite Builder.
 *
 * Microsites are assembled from typed content blocks. Media is referenced by
 * S080 DAM asset IDs and figures by their S225/S150 source reference — the
 * builder stores references, never copies of the authoritative data.
 */

export type MicrositePurpose =
  | 'ANNUAL_REPORT'
  | 'DONOR_IMPACT'
  | 'CAMPAIGN'
  | 'EVENT_HUB'
  | 'THOUGHT_LEADERSHIP';

export type MicrositeStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

/**
 * `PUBLIC`: anyone with the link. `PASSWORD`: a shared access code.
 * `NAMED_AUDIENCE`: only invited S081 donor contacts, each with a personal code.
 */
export type MicrositeAccess = 'PUBLIC' | 'PASSWORD' | 'NAMED_AUDIENCE';

export type MicrositeBlockType =
  | 'HERO'
  | 'RICH_TEXT'
  | 'METRICS'
  | 'FUND_UTILISATION'
  | 'STORY'
  | 'QUOTE'
  | 'GALLERY'
  | 'CALL_TO_ACTION'
  | 'DOWNLOADS';

export interface MicrositeMetric {
  label: string;
  value: string;
  /** Where the figure came from, e.g. `S225:annual-intake-2026`. */
  sourceRef: string;
}

export interface MicrositeAllocation {
  label: string;
  amount: number;
}

export interface MicrositeLink {
  label: string;
  url: string;
}

export interface MicrositeBlock {
  id: string;
  type: MicrositeBlockType;
  heading: string;
  body: string;
  /** S080 DAM asset IDs used by hero, story and gallery blocks. */
  assetRefs: string[];
  metrics: MicrositeMetric[];
  allocations: MicrositeAllocation[];
  currency: string;
  links: MicrositeLink[];
  attribution: string;
}

export interface MicrositeAnalytics {
  views: number;
  uniqueVisitors: number;
  averageSeconds: number;
  downloads: number;
  lastViewedAt: string | null;
}

export interface MicrositeReview {
  id: string;
  micrositeId: string;
  version: number;
  decision: 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUESTED';
  comment: string;
  actor: string;
  occurredAt: string;
}

export interface Microsite {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  purpose: MicrositePurpose;
  templateId: string;
  status: MicrositeStatus;
  access: MicrositeAccess;
  /** S081 stakeholder IDs allowed in when access is `NAMED_AUDIENCE`. */
  audienceStakeholderIds: string[];
  /** Hex colour for the accent band. Brand primary is used when empty. */
  accentColor: string;
  owner: string;
  blocks: MicrositeBlock[];
  version: number;
  publishedVersion: number | null;
  publishedAt: string | null;
  archivedAt: string | null;
  /** S003 archive reference captured when the site is archived. */
  archiveRef: string | null;
  analytics: MicrositeAnalytics;
  createdAt: string;
  updatedAt: string;
}

export interface MicrositeTemplate {
  id: string;
  name: string;
  purpose: MicrositePurpose;
  description: string;
  blockTypes: MicrositeBlockType[];
}

export interface CreateMicrositeInput {
  title: string;
  slug: string;
  tagline: string;
  purpose: MicrositePurpose;
  templateId: string;
  owner: string;
}

export interface UpdateMicrositeInput {
  title: string;
  slug: string;
  tagline: string;
  accentColor: string;
  blocks: MicrositeBlock[];
}

export interface MicrositeAccessInput {
  access: MicrositeAccess;
  /** Required when switching to `PASSWORD`; omitted keeps the existing code. */
  accessCode?: string;
  audienceStakeholderIds: string[];
}

export interface MicrositeReviewInput {
  decision: MicrositeReview['decision'];
  comment: string;
}

export interface ArchiveMicrositeInput {
  archiveRef: string;
}

/** What the public viewer receives: never includes access codes or audience IDs. */
export interface PublicMicrosite {
  slug: string;
  title: string;
  tagline: string;
  purpose: MicrositePurpose;
  accentColor: string;
  blocks: MicrositeBlock[];
  publishedAt: string;
}

export interface MicrositeUnlockInput {
  accessCode: string;
}
