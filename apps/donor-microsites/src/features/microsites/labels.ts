import type { BadgeVariant } from '@rfdtech/components';

import type {
  MicrositeAccess,
  MicrositeBlockType,
  MicrositePurpose,
  MicrositeReview,
  MicrositeStatus,
} from '@partner-crm/types';

export const PURPOSE_LABELS: Record<MicrositePurpose, string> = {
  ANNUAL_REPORT: 'Annual report',
  DONOR_IMPACT: 'Donor impact report',
  CAMPAIGN: 'Fundraising campaign',
  EVENT_HUB: 'Event hub',
  THOUGHT_LEADERSHIP: 'Thought leadership',
};

export const STATUS_LABELS: Record<MicrositeStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export const STATUS_VARIANTS: Record<MicrositeStatus, BadgeVariant> = {
  DRAFT: 'default',
  IN_REVIEW: 'warning',
  CHANGES_REQUESTED: 'error',
  APPROVED: 'primary',
  PUBLISHED: 'success',
  ARCHIVED: 'outline',
};

export const ACCESS_LABELS: Record<MicrositeAccess, string> = {
  PUBLIC: 'Public',
  PASSWORD: 'Password protected',
  NAMED_AUDIENCE: 'Named audience',
};

export const ACCESS_DESCRIPTIONS: Record<MicrositeAccess, string> = {
  PUBLIC: 'Anyone with the link can view it, and it is listed on the public home page.',
  PASSWORD: 'Visitors enter a shared access code — suited to donor groups and Board packs.',
  NAMED_AUDIENCE: 'Only invited S081 donor or Board contacts, each with a personal code.',
};

export const ACCESS_VARIANTS: Record<MicrositeAccess, BadgeVariant> = {
  PUBLIC: 'outline',
  PASSWORD: 'primary',
  NAMED_AUDIENCE: 'warning',
};

export const BLOCK_LABELS: Record<MicrositeBlockType, string> = {
  HERO: 'Hero banner',
  RICH_TEXT: 'Text section',
  METRICS: 'Key metrics',
  FUND_UTILISATION: 'Fund utilisation',
  STORY: 'Impact story',
  QUOTE: 'Pull quote',
  GALLERY: 'Media gallery',
  CALL_TO_ACTION: 'Call to action',
  DOWNLOADS: 'Downloads',
};

export const BLOCK_DESCRIPTIONS: Record<MicrositeBlockType, string> = {
  HERO: 'Title band in the accent colour, with an optional S080 image.',
  RICH_TEXT: 'Headline and paragraphs of narrative copy.',
  METRICS: 'Headline figures, each traced to an S225/S150 source.',
  FUND_UTILISATION: 'Where the money went, as amounts and shares.',
  STORY: 'A student, programme or partner story with an image.',
  QUOTE: 'A highlighted testimonial with attribution.',
  GALLERY: 'A grid of S080 photos or graphics.',
  CALL_TO_ACTION: 'Invite the visitor to give, register or get in touch.',
  DOWNLOADS: 'Reports and documents to download.',
};

export const DECISION_LABELS: Record<MicrositeReview['decision'], string> = {
  SUBMITTED: 'Submitted for review',
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes requested',
};

export const DECISION_VARIANTS: Record<MicrositeReview['decision'], BadgeVariant> = {
  SUBMITTED: 'primary',
  APPROVED: 'success',
  CHANGES_REQUESTED: 'error',
};

export const PURPOSE_OPTIONS = (Object.keys(PURPOSE_LABELS) as MicrositePurpose[]).map((value) => ({
  value,
  label: PURPOSE_LABELS[value],
}));
export const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as MicrositeStatus[]).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));
export const ACCESS_OPTIONS = (Object.keys(ACCESS_LABELS) as MicrositeAccess[]).map((value) => ({
  value,
  label: ACCESS_LABELS[value],
}));
