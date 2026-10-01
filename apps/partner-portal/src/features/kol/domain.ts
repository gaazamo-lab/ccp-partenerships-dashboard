/**
 * S092 KOL & Thought-Leader Tracker — pure domain rules.
 *
 * Mirrors `docs/architecture/new-module-rules.md` (section S092) so the
 * in-memory repository, the forms and the backend reject the same commands.
 * Nothing here touches React, the network or the clock: callers pass `now`.
 */

import type {
  KolAvailability,
  KolCategory,
  KolContent,
  KolContentStage,
  KolContentStageInput,
  KolContentType,
  KolEngagement,
  KolEngagementInput,
  KolEngagementStage,
  KolEngagementType,
  KolInfluenceLevel,
  KolInput,
  KolMediaMention,
  KolMediaMentionInput,
  KolMentionSentiment,
  KolParticipationInput,
  KolProfile,
  KolRiskLevel,
  KolStatus,
} from '@partner-crm/types';

/* ------------------------------------------------------------------ */
/* Vocabularies                                                        */
/* ------------------------------------------------------------------ */

export const KOL_CATEGORIES: readonly KolCategory[] = [
  'SENIOR_ADVOCATE',
  'JUDGE',
  'RETIRED_JUDGE',
  'ACADEMIC',
  'POLICY_INFLUENCER',
  'PRACTITIONER',
  'MEDIA_PERSONALITY',
  'ALUMNUS',
];

export const CATEGORY_LABELS: Record<KolCategory, string> = {
  SENIOR_ADVOCATE: 'Senior advocate',
  JUDGE: 'Serving judge',
  RETIRED_JUDGE: 'Retired judge',
  ACADEMIC: 'Legal academic',
  POLICY_INFLUENCER: 'Policy influencer',
  PRACTITIONER: 'Practitioner',
  MEDIA_PERSONALITY: 'Media personality',
  ALUMNUS: 'Notable alumnus',
};

export const KOL_STATUSES: readonly KolStatus[] = ['PROSPECT', 'ACTIVE', 'DORMANT', 'ARCHIVED'];

export const INFLUENCE_LEVELS: readonly KolInfluenceLevel[] = [
  'EMERGING',
  'ESTABLISHED',
  'NATIONAL',
  'INTERNATIONAL',
];

export const AVAILABILITY_LEVELS: readonly KolAvailability[] = [
  'AVAILABLE',
  'LIMITED',
  'UNAVAILABLE',
];

export const RISK_LEVELS: readonly KolRiskLevel[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH'];

export const ENGAGEMENT_TYPES: readonly KolEngagementType[] = [
  'OP_ED',
  'PANEL',
  'KEYNOTE',
  'WEBINAR',
  'PODCAST',
  'CONSULTATION',
  'CAMPAIGN',
  'MEDIA_INTERVIEW',
];

export const ENGAGEMENT_TYPE_LABELS: Record<KolEngagementType, string> = {
  OP_ED: 'Op-ed request',
  PANEL: 'Panel',
  KEYNOTE: 'Keynote',
  WEBINAR: 'Webinar (S087)',
  PODCAST: 'Podcast (S093)',
  CONSULTATION: 'Consultation',
  CAMPAIGN: 'Campaign',
  MEDIA_INTERVIEW: 'Media interview',
};

export const ENGAGEMENT_STAGES: readonly KolEngagementStage[] = [
  'PLANNED',
  'INVITED',
  'CONFIRMED',
  'COMPLETED',
  'DECLINED',
  'CANCELLED',
];

/** The stages an engagement moves through on the happy path; the planner's columns. */
export const PIPELINE_STAGES: readonly KolEngagementStage[] = [
  'PLANNED',
  'INVITED',
  'CONFIRMED',
  'COMPLETED',
];

/** Stages that still need someone to act. */
export const OPEN_ENGAGEMENT_STAGES: readonly KolEngagementStage[] = [
  'PLANNED',
  'INVITED',
  'CONFIRMED',
];

export const CONTENT_TYPES: readonly KolContentType[] = [
  'OP_ED',
  'ARTICLE',
  'BLOG_POST',
  'VIDEO',
  'PODCAST_EPISODE',
];

export const CONTENT_TYPE_LABELS: Record<KolContentType, string> = {
  OP_ED: 'Op-ed',
  ARTICLE: 'Article',
  BLOG_POST: 'Blog post',
  VIDEO: 'Video',
  PODCAST_EPISODE: 'Podcast episode',
};

export const CONTENT_STAGES: readonly KolContentStage[] = [
  'COMMISSIONED',
  'DRAFT_SUBMITTED',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PUBLISHED',
  'WITHDRAWN',
];

/** The content workflow's main line, as drawn by the stage stepper. */
export const CONTENT_FLOW: readonly KolContentStage[] = [
  'COMMISSIONED',
  'DRAFT_SUBMITTED',
  'IN_REVIEW',
  'APPROVED',
  'PUBLISHED',
];

/** Stages where content is waiting on the CLET review desk. */
export const CONTENT_REVIEW_STAGES: readonly KolContentStage[] = ['DRAFT_SUBMITTED', 'IN_REVIEW'];

export const SENTIMENTS: readonly KolMentionSentiment[] = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];

export const REACH_WINDOW_DAYS = 90;

/* ------------------------------------------------------------------ */
/* Engagement stage machine                                            */
/* ------------------------------------------------------------------ */

export const ENGAGEMENT_TRANSITIONS: Record<KolEngagementStage, readonly KolEngagementStage[]> = {
  PLANNED: ['INVITED', 'CANCELLED'],
  INVITED: ['CONFIRMED', 'DECLINED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  DECLINED: [],
  CANCELLED: [],
};

export const ENGAGEMENT_ACTION_LABELS: Record<KolEngagementStage, string> = {
  PLANNED: 'Return to planned',
  INVITED: 'Send invitation',
  CONFIRMED: 'Mark confirmed',
  COMPLETED: 'Mark completed',
  DECLINED: 'Record decline',
  CANCELLED: 'Cancel engagement',
};

export function isTerminalEngagement(stage: KolEngagementStage): boolean {
  return ENGAGEMENT_TRANSITIONS[stage].length === 0;
}

export function nextEngagementStages(stage: KolEngagementStage): readonly KolEngagementStage[] {
  return ENGAGEMENT_TRANSITIONS[stage];
}

/** `null` when `from → to` is allowed, otherwise the reason it is not. */
export function engagementTransitionError(
  from: KolEngagementStage,
  to: KolEngagementStage,
): string | null {
  if (from === to) return `The engagement is already ${labelOf(to)}.`;
  if (isTerminalEngagement(from)) {
    return `A ${labelOf(from)} engagement is closed and cannot move to ${labelOf(to)}.`;
  }
  if (!ENGAGEMENT_TRANSITIONS[from].includes(to)) {
    return `An engagement cannot move from ${labelOf(from)} to ${labelOf(to)}.`;
  }
  return null;
}

/** Participation can be recorded on a completed engagement, or on a confirmed one (which completes it). */
export function canRecordParticipation(stage: KolEngagementStage): boolean {
  return stage === 'CONFIRMED' || stage === 'COMPLETED';
}

export function participationError(
  engagement: Pick<KolEngagement, 'stage'>,
  input: KolParticipationInput,
): string | null {
  if (!canRecordParticipation(engagement.stage)) {
    return `Participation can only be recorded on a completed engagement (this one is ${labelOf(engagement.stage)}).`;
  }
  if (!Number.isInteger(input.contributionScore) || input.contributionScore < 1 || input.contributionScore > 5) {
    return 'Contribution score must be a whole number from 1 to 5.';
  }
  return null;
}

export type EngagementFieldErrors = Partial<Record<keyof KolEngagementInput, string>>;

export function validateEngagementInput(input: KolEngagementInput): EngagementFieldErrors {
  const errors: EngagementFieldErrors = {};
  if (!ENGAGEMENT_TYPES.includes(input.type)) errors.type = 'Choose an engagement type.';
  if (!input.title.trim()) errors.title = 'Give the engagement a title.';
  if (!input.owner.trim()) errors.owner = 'Name the CLET owner for this engagement.';
  if (input.scheduledFor && Number.isNaN(Date.parse(input.scheduledFor))) {
    errors.scheduledFor = 'Enter a valid date.';
  }
  return errors;
}

/** Engagements cannot be planned for an archived KOL. */
export function engagementCreationError(profile: Pick<KolProfile, 'status' | 'fullName'>): string | null {
  return profile.status === 'ARCHIVED'
    ? `${profile.fullName} is archived. Reactivate the profile before planning an engagement.`
    : null;
}

/* ------------------------------------------------------------------ */
/* Content stage machine                                               */
/* ------------------------------------------------------------------ */

export const CONTENT_TRANSITIONS: Record<KolContentStage, readonly KolContentStage[]> = {
  COMMISSIONED: ['DRAFT_SUBMITTED', 'WITHDRAWN'],
  DRAFT_SUBMITTED: ['IN_REVIEW', 'WITHDRAWN'],
  IN_REVIEW: ['CHANGES_REQUESTED', 'APPROVED', 'WITHDRAWN'],
  CHANGES_REQUESTED: ['DRAFT_SUBMITTED', 'WITHDRAWN'],
  APPROVED: ['PUBLISHED', 'WITHDRAWN'],
  PUBLISHED: [],
  WITHDRAWN: [],
};

export const CONTENT_ACTION_LABELS: Record<KolContentStage, string> = {
  COMMISSIONED: 'Recommission',
  DRAFT_SUBMITTED: 'Submit draft',
  IN_REVIEW: 'Start review',
  CHANGES_REQUESTED: 'Request changes',
  APPROVED: 'Approve',
  PUBLISHED: 'Publish on S076',
  WITHDRAWN: 'Withdraw',
};

export function isTerminalContent(stage: KolContentStage): boolean {
  return CONTENT_TRANSITIONS[stage].length === 0;
}

export function nextContentStages(stage: KolContentStage): readonly KolContentStage[] {
  return CONTENT_TRANSITIONS[stage];
}

/** The label for moving into `to`, which reads differently for a resubmission. */
export function contentActionLabel(from: KolContentStage, to: KolContentStage): string {
  if (from === 'CHANGES_REQUESTED' && to === 'DRAFT_SUBMITTED') return 'Resubmit revised draft';
  return CONTENT_ACTION_LABELS[to];
}

export type ContentMoveErrors = Partial<
  Record<'stage' | 'draftRef' | 'reviewNotes' | 'publishedUrl', string>
>;

/** Field-level reasons a content stage move would be rejected. Empty when it is allowed. */
export function validateContentMove(
  current: Pick<KolContent, 'stage'>,
  input: KolContentStageInput,
): ContentMoveErrors {
  const errors: ContentMoveErrors = {};
  const from = current.stage;
  const to = input.stage;
  if (from === to) {
    errors.stage = `The content is already ${labelOf(to)}.`;
    return errors;
  }
  if (isTerminalContent(from)) {
    errors.stage = `${titleOf(from)} content is closed and cannot move to ${labelOf(to)}.`;
    return errors;
  }
  if (!CONTENT_TRANSITIONS[from].includes(to)) {
    errors.stage = `Content cannot move from ${labelOf(from)} to ${labelOf(to)}.`;
    return errors;
  }
  if (to === 'DRAFT_SUBMITTED' && !input.draftRef?.trim()) {
    errors.draftRef = 'Add the S003 reference for the submitted draft.';
  }
  if (to === 'CHANGES_REQUESTED' && !input.reviewNotes?.trim()) {
    errors.reviewNotes = 'Explain what needs to change so the author can revise.';
  }
  if (to === 'PUBLISHED') {
    if (!input.publishedUrl?.trim()) {
      errors.publishedUrl = 'Add the published S076 URL.';
    } else if (!isValidUrl(input.publishedUrl.trim())) {
      errors.publishedUrl = 'Enter a full URL starting with http:// or https://.';
    }
  }
  return errors;
}

export type ContentFieldErrors = Partial<Record<'title' | 'contentType' | 'dueDate', string>>;

export function validateContentInput(input: {
  title: string;
  contentType: KolContentType;
  dueDate: string | null;
}): ContentFieldErrors {
  const errors: ContentFieldErrors = {};
  if (!input.title.trim()) errors.title = 'Give the piece a working title.';
  if (!CONTENT_TYPES.includes(input.contentType)) errors.contentType = 'Choose a content type.';
  if (input.dueDate && Number.isNaN(Date.parse(input.dueDate))) {
    errors.dueDate = 'Enter a valid date.';
  }
  return errors;
}

/** Position on the stepper (1-based). `CHANGES_REQUESTED` sits on the review step. */
export function contentStepValue(stage: KolContentStage): number {
  if (stage === 'PUBLISHED') return CONTENT_FLOW.length + 1;
  if (stage === 'CHANGES_REQUESTED') return CONTENT_FLOW.indexOf('IN_REVIEW') + 1;
  const index = CONTENT_FLOW.indexOf(stage);
  return index === -1 ? 0 : index + 1;
}

/* ------------------------------------------------------------------ */
/* Profile validation                                                  */
/* ------------------------------------------------------------------ */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Case-insensitive uniqueness of a KOL email, ignoring the record being edited. */
export function isEmailTaken(
  email: string,
  profiles: ReadonlyArray<Pick<KolProfile, 'id' | 'email'>>,
  excludeId?: string,
): boolean {
  const needle = email.trim().toLowerCase();
  if (!needle) return false;
  return profiles.some(
    (profile) => profile.id !== excludeId && profile.email.trim().toLowerCase() === needle,
  );
}

export function riskNotesRequired(level: KolRiskLevel): boolean {
  return level === 'MEDIUM' || level === 'HIGH';
}

export type KolFieldErrors = Partial<Record<keyof KolInput, string>>;

export interface KolValidationContext {
  profiles: ReadonlyArray<Pick<KolProfile, 'id' | 'email'>>;
  /** The profile being edited, so its own email does not count as a duplicate. */
  excludeId?: string;
  /** Whether an S081 stakeholder ID exists. Omit to skip the check. */
  stakeholderExists?: (id: string) => boolean;
}

export function validateKolInput(input: KolInput, context: KolValidationContext): KolFieldErrors {
  const errors: KolFieldErrors = {};
  if (!input.fullName.trim()) errors.fullName = 'Enter the KOL’s full name.';
  if (!KOL_CATEGORIES.includes(input.category)) errors.category = 'Choose a category.';
  if (!input.relationshipOwner.trim()) {
    errors.relationshipOwner = 'Name the CLET relationship owner.';
  }
  const email = input.email.trim();
  if (email) {
    if (!isValidEmail(email)) {
      errors.email = 'Enter a valid email address, e.g. name@example.com.';
    } else if (isEmailTaken(email, context.profiles, context.excludeId)) {
      errors.email = 'Another KOL profile already uses this email.';
    }
  }
  if (riskNotesRequired(input.riskLevel) && !input.riskNotes.trim()) {
    errors.riskNotes = `Risk notes are required when the risk level is ${labelOf(input.riskLevel)}.`;
  }
  if (input.stakeholderId && context.stakeholderExists && !context.stakeholderExists(input.stakeholderId)) {
    errors.stakeholderId = 'The linked S081 stakeholder no longer exists.';
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Media mentions                                                      */
/* ------------------------------------------------------------------ */

export type MentionFieldErrors = Partial<Record<keyof KolMediaMentionInput, string>>;

export function validateMentionInput(input: KolMediaMentionInput): MentionFieldErrors {
  const errors: MentionFieldErrors = {};
  if (!input.outlet.trim()) errors.outlet = 'Name the outlet.';
  if (!input.headline.trim()) errors.headline = 'Enter the headline.';
  if (input.url.trim() && !isValidUrl(input.url.trim())) {
    errors.url = 'Enter a full URL starting with http:// or https://.';
  }
  if (!input.publishedAt || Number.isNaN(Date.parse(input.publishedAt))) {
    errors.publishedAt = 'Enter the publication date.';
  }
  if (!Number.isFinite(input.reach) || input.reach < 0) {
    errors.reach = 'Reach must be zero or more.';
  } else if (!Number.isInteger(input.reach)) {
    errors.reach = 'Reach must be a whole number.';
  }
  if (!SENTIMENTS.includes(input.sentiment)) errors.sentiment = 'Choose a sentiment.';
  return errors;
}

/* ------------------------------------------------------------------ */
/* Impact                                                              */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

export function totalReach(mentions: ReadonlyArray<Pick<KolMediaMention, 'reach'>>): number {
  return mentions.reduce((sum, mention) => sum + Math.max(0, mention.reach), 0);
}

/** Mentions published in the `days` before `now` (inclusive of today). */
export function mentionsWithin<T extends Pick<KolMediaMention, 'publishedAt'>>(
  mentions: readonly T[],
  days: number,
  now: number,
): T[] {
  const since = now - days * DAY_MS;
  return mentions.filter((mention) => {
    const at = Date.parse(mention.publishedAt);
    return !Number.isNaN(at) && at >= since && at <= now;
  });
}

export function completedEngagements<T extends Pick<KolEngagement, 'stage'>>(
  engagements: readonly T[],
): T[] {
  return engagements.filter((engagement) => engagement.stage === 'COMPLETED');
}

export function openEngagements<T extends Pick<KolEngagement, 'stage'>>(
  engagements: readonly T[],
): T[] {
  return engagements.filter((engagement) => OPEN_ENGAGEMENT_STAGES.includes(engagement.stage));
}

export function publishedContent<T extends Pick<KolContent, 'stage'>>(content: readonly T[]): T[] {
  return content.filter((item) => item.stage === 'PUBLISHED');
}

/** Mean of recorded contribution scores to one decimal place, or `null` when none are recorded. */
export function meanContributionScore(
  engagements: ReadonlyArray<Pick<KolEngagement, 'participation'>>,
): number | null {
  const scores = engagements
    .map((engagement) => engagement.participation?.contributionScore)
    .filter((score): score is 1 | 2 | 3 | 4 | 5 => typeof score === 'number');
  if (scores.length === 0) return null;
  const mean = scores.reduce<number>((sum, score) => sum + score, 0) / scores.length;
  return Math.round(mean * 10) / 10;
}

export interface ImpactInputs {
  reach: number;
  completed: number;
  published: number;
  meanScore: number | null;
}

/** Reach counted as full marks for the reach component of the impact score. */
export const REACH_BENCHMARK = 500_000;

/**
 * A 0–100 impact score: reach (40), completed engagements (25), published
 * content (20) and mean contribution score (15). Each part saturates at its
 * benchmark so one very loud mention cannot outweigh sustained contribution.
 */
export function impactScore({ reach, completed, published, meanScore }: ImpactInputs): number {
  const reachPart = 40 * Math.min(1, Math.max(0, reach) / REACH_BENCHMARK);
  const engagementPart = 25 * Math.min(1, completed / 4);
  const contentPart = 20 * Math.min(1, published / 3);
  const scorePart = meanScore === null ? 0 : 15 * (meanScore / 5);
  return Math.round(reachPart + engagementPart + contentPart + scorePart);
}

export interface KolImpact extends ImpactInputs {
  kolId: string;
  mentionCount: number;
  negativeMentions: number;
  score: number;
}

export interface KolDataset {
  engagements: readonly KolEngagement[];
  content: readonly KolContent[];
  mentions: readonly KolMediaMention[];
}

export function kolImpact(kolId: string, data: KolDataset): KolImpact {
  const engagements = data.engagements.filter((item) => item.kolId === kolId);
  const mentions = data.mentions.filter((item) => item.kolId === kolId);
  const inputs: ImpactInputs = {
    reach: totalReach(mentions),
    completed: completedEngagements(engagements).length,
    published: publishedContent(data.content.filter((item) => item.kolId === kolId)).length,
    meanScore: meanContributionScore(engagements),
  };
  return {
    kolId,
    ...inputs,
    mentionCount: mentions.length,
    negativeMentions: mentions.filter((item) => item.sentiment === 'NEGATIVE').length,
    score: impactScore(inputs),
  };
}

export interface ImpactSummary extends ImpactInputs {
  recentReach: number;
  mentionCount: number;
  openEngagements: number;
}

export function impactSummary(data: KolDataset, now: number, days = REACH_WINDOW_DAYS): ImpactSummary {
  return {
    reach: totalReach(data.mentions),
    recentReach: totalReach(mentionsWithin(data.mentions, days, now)),
    mentionCount: data.mentions.length,
    completed: completedEngagements(data.engagements).length,
    openEngagements: openEngagements(data.engagements).length,
    published: publishedContent(data.content).length,
    meanScore: meanContributionScore(data.engagements),
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function labelOf(value: string): string {
  return value.toLowerCase().replaceAll('_', ' ');
}

function titleOf(value: string): string {
  const label = labelOf(value);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** The first message in a field-error map, for surfacing a rejected command as one line. */
export function firstError(errors: Partial<Record<string, string>>): string | null {
  for (const message of Object.values(errors)) {
    if (message) return message;
  }
  return null;
}

export function hasErrors(errors: Partial<Record<string, string>>): boolean {
  return firstError(errors) !== null;
}

/** Normalises a list of free-text tags: trimmed, non-empty, de-duplicated case-insensitively. */
export function normaliseTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, ' ');
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

/** Display name with honorific, e.g. `Prof. Yaw Boadu-Ayeboafoh`. */
export function displayName(profile: Pick<KolProfile, 'honorific' | 'fullName'>): string {
  return [profile.honorific, profile.fullName].filter(Boolean).join(' ');
}
