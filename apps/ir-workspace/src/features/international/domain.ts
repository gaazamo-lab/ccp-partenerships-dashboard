/**
 * S083 business rules as pure functions.
 *
 * The in-memory repository enforces these rules (so mock mode behaves like the
 * backend) and the screens use the same functions to explain, before the user
 * clicks, why an action is unavailable. Nothing here reads the clock: callers
 * pass `now` so the rules stay deterministic and testable.
 */
import type {
  IrApproval,
  IrCorrespondence,
  IrCorrespondenceInput,
  IrCorrespondenceStatus,
  IrDirection,
  IrEngagement,
  IrEngagementInput,
  IrEngagementStatus,
  IrFollowUp,
  IrGiftDirection,
  IrGiftFlagStatus,
  IrGiftInput,
  IrHandoffStatus,
  IrLanguage,
  IrProtocolTask,
  IrSupportRequest,
  IrSupportStatusInput,
  IrTaskUpdateInput,
} from '@partner-crm/types';

const DAY_MS = 86_400_000;

function blank(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

function same(left: string | null | undefined, right: string | null | undefined): boolean {
  return (left ?? '').trim().toLowerCase() === (right ?? '').trim().toLowerCase();
}

function time(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/* -------------------------------------------------------------------------- */
/* References                                                                  */
/* -------------------------------------------------------------------------- */

export type ReferenceKind = 'IR' | 'COR';

/** `CLET/IR/2026/007` — the next sequence for that kind and year. */
export function nextReference(kind: ReferenceKind, year: number, existing: string[]): string {
  const prefix = `CLET/${kind}/${year}/`;
  const highest = existing
    .filter((reference) => reference.startsWith(prefix))
    .map((reference) => Number.parseInt(reference.slice(prefix.length), 10))
    .filter((value) => Number.isFinite(value))
    .reduce((max, value) => Math.max(max, value), 0);
  return `${prefix}${String(highest + 1).padStart(3, '0')}`;
}

/* -------------------------------------------------------------------------- */
/* Engagement state machine                                                    */
/* -------------------------------------------------------------------------- */

export const ENGAGEMENT_TRANSITIONS: Record<IrEngagementStatus, IrEngagementStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'RETURNED', 'CANCELLED'],
  RETURNED: ['SUBMITTED', 'CANCELLED'],
  APPROVED: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['CLOSED'],
  CLOSED: ['IN_PROGRESS'],
  CANCELLED: [],
};

/** Transitions an approver makes rather than the engagement owner's team. */
export const APPROVER_TRANSITIONS: IrEngagementStatus[] = ['UNDER_REVIEW', 'APPROVED', 'RETURNED'];

export function canTransitionEngagement(from: IrEngagementStatus, to: IrEngagementStatus): boolean {
  return ENGAGEMENT_TRANSITIONS[from].includes(to);
}

/** Return, cancel and reopen must carry a reason. */
export function engagementCommentRequired(from: IrEngagementStatus, to: IrEngagementStatus): boolean {
  return to === 'RETURNED' || to === 'CANCELLED' || (from === 'CLOSED' && to === 'IN_PROGRESS');
}

/** The approval-history decision a transition records, if any. */
export function approvalDecisionFor(
  from: IrEngagementStatus,
  to: IrEngagementStatus,
): IrApproval['decision'] | null {
  if (to === 'SUBMITTED') return 'SUBMITTED';
  if (to === 'APPROVED') return 'APPROVED';
  if (to === 'RETURNED') return 'RETURNED';
  if (to === 'CANCELLED') return 'CANCELLED';
  if (from === 'CLOSED' && to === 'IN_PROGRESS') return 'REOPENED';
  return null;
}

export const ENGAGEMENT_ACTION_LABEL: Record<IrEngagementStatus, string> = {
  DRAFT: 'Move to draft',
  SUBMITTED: 'Submit for approval',
  UNDER_REVIEW: 'Start review',
  APPROVED: 'Approve plan',
  RETURNED: 'Return for changes',
  SCHEDULED: 'Mark scheduled',
  IN_PROGRESS: 'Start engagement',
  COMPLETED: 'Mark completed',
  CLOSED: 'Close engagement',
  CANCELLED: 'Cancel engagement',
};

/** Label for a transition, accounting for resubmission and reopening. */
export function engagementActionLabel(from: IrEngagementStatus, to: IrEngagementStatus): string {
  if (from === 'RETURNED' && to === 'SUBMITTED') return 'Resubmit';
  if (from === 'CLOSED' && to === 'IN_PROGRESS') return 'Reopen engagement';
  return ENGAGEMENT_ACTION_LABEL[to];
}

type EngagementCore = Pick<
  IrEngagementInput,
  'title' | 'purpose' | 'owner' | 'startAt' | 'endAt' | 'timeZone'
>;

/** Field-level errors that block submission (SRS FR-01). Keys match input fields. */
export function submissionErrors(input: EngagementCore): Partial<Record<keyof EngagementCore, string>> {
  const errors: Partial<Record<keyof EngagementCore, string>> = {};
  if (blank(input.title)) errors.title = 'Enter a title.';
  if (blank(input.purpose)) errors.purpose = 'Enter the purpose of the engagement.';
  if (blank(input.owner)) errors.owner = 'Name the accountable owner.';
  if (blank(input.startAt)) errors.startAt = 'Enter the start date and time.';
  if (blank(input.endAt)) errors.endAt = 'Enter the end date and time.';
  else if (!blank(input.startAt) && time(input.endAt) <= time(input.startAt)) {
    errors.endAt = 'The end must be after the start.';
  }
  if (blank(input.timeZone)) errors.timeZone = 'Choose the time zone.';
  return errors;
}

/**
 * Errors that block saving at all. A draft may be incomplete — only a title
 * and owner are needed — but dates that are present must be in order.
 */
export function draftErrors(input: IrEngagementInput): Partial<Record<keyof IrEngagementInput, string>> {
  const errors: Partial<Record<keyof IrEngagementInput, string>> = {};
  if (blank(input.title)) errors.title = 'Enter a title.';
  if (blank(input.owner)) errors.owner = 'Name the accountable owner.';
  if (!blank(input.startAt) && Number.isNaN(time(input.startAt))) errors.startAt = 'Enter a valid date.';
  if (!blank(input.endAt) && Number.isNaN(time(input.endAt))) errors.endAt = 'Enter a valid date.';
  if (!blank(input.startAt) && !blank(input.endAt) && time(input.endAt) <= time(input.startAt)) {
    errors.endAt = 'The end must be after the start.';
  }
  return errors;
}

export function openMandatoryTasks(engagement: Pick<IrEngagement, 'protocolTasks'>): IrProtocolTask[] {
  return engagement.protocolTasks.filter((task) => task.mandatory && task.status === 'OPEN');
}

export function openMandatoryFollowUps(engagement: Pick<IrEngagement, 'followUps'>): IrFollowUp[] {
  return engagement.followUps.filter((item) => item.mandatory && item.status === 'OPEN');
}

/** What stands between an approved plan and "scheduled / ready" (FR-03). */
export function readinessBlockers(engagement: Pick<IrEngagement, 'protocolTasks'>): string[] {
  const open = openMandatoryTasks(engagement);
  if (open.length === 0) return [];
  return [
    `${plural(open.length, 'mandatory protocol task')} still open: ${open.map((task) => task.title).join('; ')}.`,
  ];
}

/** What stands between a completed engagement and closure (FR-10). */
export function closureBlockers(engagement: Pick<IrEngagement, 'followUps' | 'minutesRef'>): string[] {
  const blockers: string[] = [];
  if (blank(engagement.minutesRef)) blockers.push('Record the meeting minutes reference (S003).');
  const open = openMandatoryFollowUps(engagement);
  if (open.length > 0) {
    blockers.push(
      `${plural(open.length, 'mandatory follow-up')} still open: ${open.map((item) => item.title).join('; ')}. Complete them or record an authorised exception.`,
    );
  }
  return blockers;
}

export interface TransitionContext {
  actor: string;
  comment: string;
}

/** Every reason the transition cannot happen now; empty when it can. */
export function engagementTransitionBlockers(
  engagement: IrEngagement,
  to: IrEngagementStatus,
  context: TransitionContext,
): string[] {
  const from = engagement.status;
  if (!canTransitionEngagement(from, to)) {
    return [`An engagement cannot move from ${from.toLowerCase().replaceAll('_', ' ')} to ${to.toLowerCase().replaceAll('_', ' ')}.`];
  }
  const blockers: string[] = [];
  if (to === 'SUBMITTED') {
    const errors = submissionErrors(engagement);
    blockers.push(...Object.values(errors).map((message) => `Required before submission: ${message}`));
  }
  if (to === 'APPROVED' && same(context.actor, engagement.owner)) {
    blockers.push('Four-eyes rule: the engagement owner cannot approve their own plan.');
  }
  if (to === 'SCHEDULED') blockers.push(...readinessBlockers(engagement));
  if (to === 'CLOSED') blockers.push(...closureBlockers(engagement));
  if (engagementCommentRequired(from, to) && blank(context.comment)) {
    blockers.push('A comment explaining the decision is required.');
  }
  return blockers;
}

/** Fields whose change invalidates an approval (COM-02). References are not material. */
const MATERIAL_FIELDS: Array<keyof IrEngagementInput> = [
  'type',
  'direction',
  'title',
  'purpose',
  'partnerStakeholderId',
  'partnerName',
  'owner',
  'host',
  'venue',
  'startAt',
  'endAt',
  'timeZone',
  'classification',
];

export function isMaterialEngagementChange(before: IrEngagementInput, after: IrEngagementInput): boolean {
  return MATERIAL_FIELDS.some((field) => (before[field] ?? '') !== (after[field] ?? ''));
}

/** A material edit while approved or scheduled sends the plan back for approval. */
export function statusAfterEdit(
  status: IrEngagementStatus,
  material: boolean,
): IrEngagementStatus {
  if (material && (status === 'APPROVED' || status === 'SCHEDULED')) return 'SUBMITTED';
  return status;
}

export function engagementEditable(status: IrEngagementStatus): boolean {
  return status !== 'CLOSED' && status !== 'CANCELLED';
}

export function engagementToInput(engagement: IrEngagement): IrEngagementInput {
  return {
    type: engagement.type,
    direction: engagement.direction,
    title: engagement.title,
    purpose: engagement.purpose,
    partnerStakeholderId: engagement.partnerStakeholderId,
    partnerName: engagement.partnerName,
    owner: engagement.owner,
    host: engagement.host,
    venue: engagement.venue,
    startAt: engagement.startAt,
    endAt: engagement.endAt,
    timeZone: engagement.timeZone,
    classification: engagement.classification,
    agendaRef: engagement.agendaRef,
    briefingPackRef: engagement.briefingPackRef,
    minutesRef: engagement.minutesRef,
  };
}

/* -------------------------------------------------------------------------- */
/* Tasks, follow-ups and support handoffs                                      */
/* -------------------------------------------------------------------------- */

export function taskUpdateBlockers(
  item: { mandatory: boolean; status: IrProtocolTask['status'] },
  input: IrTaskUpdateInput,
  kind: 'protocol' | 'followUp',
): string[] {
  if (item.status !== 'OPEN') return ['Only open items can be completed or excepted.'];
  if (input.status === 'OPEN') return ['Choose done or exception.'];
  if (input.status === 'EXCEPTION' && blank(input.exceptionReason)) {
    return ['Record the reason for the authorised exception.'];
  }
  if (input.status === 'DONE' && kind === 'protocol' && item.mandatory && blank(input.evidenceRef)) {
    return ['A mandatory protocol task needs an evidence reference before it can be marked done.'];
  }
  return [];
}

export const SUPPORT_TRANSITIONS: Record<IrHandoffStatus, IrHandoffStatus[]> = {
  REQUESTED: ['ACKNOWLEDGED', 'FAILED'],
  ACKNOWLEDGED: ['COMPLETED', 'FAILED'],
  FAILED: ['REQUESTED'],
  COMPLETED: [],
};

export function supportUpdateBlockers(
  request: IrSupportRequest,
  input: IrSupportStatusInput,
  siblings: IrSupportRequest[],
): string[] {
  if (!SUPPORT_TRANSITIONS[request.status].includes(input.status)) {
    return [`A ${request.status.toLowerCase()} handoff cannot move to ${input.status.toLowerCase()}.`];
  }
  const blockers: string[] = [];
  const needsRef = input.status === 'ACKNOWLEDGED' || input.status === 'COMPLETED';
  if (needsRef && blank(input.externalRef)) {
    blockers.push(`Enter the ${request.system} reference that acknowledges this request.`);
  }
  if (
    !blank(input.externalRef) &&
    siblings.some((other) => other.id !== request.id && same(other.externalRef, input.externalRef))
  ) {
    blockers.push('Each handoff keeps its own external ID — this reference is already used by another request.');
  }
  return blockers;
}

/* -------------------------------------------------------------------------- */
/* Calendar clashes                                                            */
/* -------------------------------------------------------------------------- */

export interface Clash {
  first: IrEngagement;
  second: IrEngagement;
  sharedHost: boolean;
  sharedVenue: boolean;
}

export function rangesOverlap(
  left: Pick<IrEngagement, 'startAt' | 'endAt'>,
  right: Pick<IrEngagement, 'startAt' | 'endAt'>,
): boolean {
  const [ls, le, rs, re] = [time(left.startAt), time(left.endAt), time(right.startAt), time(right.endAt)];
  if ([ls, le, rs, re].some(Number.isNaN)) return false;
  return ls < re && rs < le;
}

/** Overlapping, non-cancelled engagements that share a host or venue (case-insensitive). */
export function findClashes(engagements: IrEngagement[]): Clash[] {
  const live = engagements.filter((item) => item.status !== 'CANCELLED');
  const clashes: Clash[] = [];
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const first = live[i]!;
      const second = live[j]!;
      if (!rangesOverlap(first, second)) continue;
      const sharedHost = !blank(first.host) && same(first.host, second.host);
      const sharedVenue = !blank(first.venue) && same(first.venue, second.venue);
      if (sharedHost || sharedVenue) clashes.push({ first, second, sharedHost, sharedVenue });
    }
  }
  return clashes;
}

export function clashesFor(engagement: IrEngagement, engagements: IrEngagement[]): Clash[] {
  return findClashes(engagements).filter(
    (clash) => clash.first.id === engagement.id || clash.second.id === engagement.id,
  );
}

export function clashSummary(clash: Clash, perspectiveId?: string): string {
  const other = clash.first.id === perspectiveId ? clash.second : clash.first;
  const shared = [clash.sharedHost ? 'host' : null, clash.sharedVenue ? 'venue' : null]
    .filter(Boolean)
    .join(' and ');
  if (perspectiveId) return `Overlaps ${other.reference} (${other.title}) with the same ${shared}.`;
  return `${clash.first.reference} and ${clash.second.reference} overlap with the same ${shared}.`;
}

/* -------------------------------------------------------------------------- */
/* Dashboard windows                                                           */
/* -------------------------------------------------------------------------- */

export type EngagementTiming = 'NEXT_30_DAYS' | 'LATER' | 'UNDERWAY' | 'PAST' | 'UNSCHEDULED';

export function engagementTiming(engagement: Pick<IrEngagement, 'startAt' | 'endAt'>, now: number): EngagementTiming {
  const start = time(engagement.startAt);
  const end = time(engagement.endAt);
  if (Number.isNaN(start)) return 'UNSCHEDULED';
  if (!Number.isNaN(end) && end < now) return 'PAST';
  if (start <= now) return 'UNDERWAY';
  return start - now <= 30 * DAY_MS ? 'NEXT_30_DAYS' : 'LATER';
}

export type EngagementStage =
  | 'PLANNING'
  | 'AWAITING_APPROVAL'
  | 'READY'
  | 'UNDERWAY'
  | 'WRAP_UP'
  | 'FINISHED';

export function engagementStage(status: IrEngagementStatus): EngagementStage {
  switch (status) {
    case 'DRAFT':
    case 'RETURNED':
      return 'PLANNING';
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return 'AWAITING_APPROVAL';
    case 'APPROVED':
    case 'SCHEDULED':
      return 'READY';
    case 'IN_PROGRESS':
      return 'UNDERWAY';
    case 'COMPLETED':
      return 'WRAP_UP';
    case 'CLOSED':
    case 'CANCELLED':
      return 'FINISHED';
  }
}

export function isUpcomingVisit(engagement: IrEngagement, now: number): boolean {
  if (engagement.status === 'CANCELLED' || engagement.status === 'CLOSED') return false;
  return engagementTiming(engagement, now) === 'NEXT_30_DAYS';
}

export type FollowUpColumn = 'OPEN' | 'OVERDUE' | 'DONE' | 'EXCEPTION';

export function followUpColumn(item: Pick<IrFollowUp, 'status' | 'dueDate'>, now: number): FollowUpColumn {
  if (item.status === 'DONE') return 'DONE';
  if (item.status === 'EXCEPTION') return 'EXCEPTION';
  const due = time(item.dueDate);
  // Due at the end of its day, not at midnight.
  if (!Number.isNaN(due) && due + DAY_MS <= now) return 'OVERDUE';
  return 'OPEN';
}

/* -------------------------------------------------------------------------- */
/* Correspondence                                                              */
/* -------------------------------------------------------------------------- */

export const CORRESPONDENCE_TRANSITIONS: Record<
  IrDirection,
  Partial<Record<IrCorrespondenceStatus, IrCorrespondenceStatus[]>>
> = {
  INBOUND: {
    RECEIVED: ['AWAITING_RESPONSE'],
    AWAITING_RESPONSE: ['RESPONDED'],
    RESPONDED: ['CLOSED'],
  },
  OUTBOUND: {
    DRAFT: ['IN_REVIEW'],
    IN_REVIEW: ['APPROVED', 'RETURNED'],
    RETURNED: ['IN_REVIEW'],
    APPROVED: ['DISPATCHED'],
    DISPATCHED: ['AWAITING_RESPONSE', 'CLOSED'],
    AWAITING_RESPONSE: ['RESPONDED'],
    RESPONDED: ['CLOSED'],
  },
};

export const CORRESPONDENCE_APPROVER_TRANSITIONS: IrCorrespondenceStatus[] = ['APPROVED', 'RETURNED'];

export function correspondenceTransitions(item: Pick<IrCorrespondence, 'direction' | 'status'>): IrCorrespondenceStatus[] {
  return CORRESPONDENCE_TRANSITIONS[item.direction][item.status] ?? [];
}

export function correspondenceActionLabel(
  item: Pick<IrCorrespondence, 'status'>,
  to: IrCorrespondenceStatus,
): string {
  switch (to) {
    case 'IN_REVIEW':
      return item.status === 'RETURNED' ? 'Resubmit for review' : 'Submit for review';
    case 'APPROVED':
      return 'Approve letter';
    case 'RETURNED':
      return 'Return with comment';
    case 'DISPATCHED':
      return 'Dispatch via S074';
    case 'AWAITING_RESPONSE':
      return 'Mark awaiting response';
    case 'RESPONDED':
      return 'Record response';
    case 'CLOSED':
      return item.status === 'DISPATCHED' ? 'Close (no response expected)' : 'Close';
    default:
      return 'Update status';
  }
}

export function correspondenceTransitionBlockers(
  item: IrCorrespondence,
  to: IrCorrespondenceStatus,
  comment: string,
): string[] {
  if (!correspondenceTransitions(item).includes(to)) {
    return [`This ${item.direction.toLowerCase()} item cannot move from ${item.status.toLowerCase().replaceAll('_', ' ')} to ${to.toLowerCase().replaceAll('_', ' ')}.`];
  }
  const blockers: string[] = [];
  if (to === 'IN_REVIEW') {
    if (blank(item.subject)) blockers.push('Enter a subject before review.');
    if (blank(item.recipient)) blockers.push('Enter the recipient before review.');
    if (blank(item.body)) blockers.push('Write the letter body before review.');
    const unresolved = unresolvedPlaceholders(`${item.subject}\n${item.body}`);
    if (unresolved.length > 0) {
      blockers.push(`Fill in the remaining placeholders: ${unresolved.map((key) => `{{${key}}}`).join(', ')}.`);
    }
  }
  if (to === 'DISPATCHED' && item.approvedVersion !== item.version) {
    blockers.push(
      item.approvedVersion === null
        ? 'Unapproved text cannot be dispatched. Obtain approval first.'
        : `Unapproved text cannot be dispatched: version ${item.version} is current but version ${item.approvedVersion} was approved.`,
    );
  }
  if (to === 'RETURNED' && blank(comment)) blockers.push('Explain what needs to change.');
  return blockers;
}

/** Overdue: the response deadline has passed and a response is still owed. */
export function isCorrespondenceOverdue(
  item: Pick<IrCorrespondence, 'responseDeadline' | 'status'>,
  now: number,
): boolean {
  if (item.status !== 'RECEIVED' && item.status !== 'AWAITING_RESPONSE') return false;
  const deadline = time(item.responseDeadline);
  return !Number.isNaN(deadline) && deadline < now;
}

export type DeadlineState = 'OVERDUE' | 'DUE_SOON' | 'ON_TRACK' | 'NONE';

export function correspondenceDeadlineState(
  item: Pick<IrCorrespondence, 'responseDeadline' | 'status'>,
  now: number,
): DeadlineState {
  if (item.status !== 'RECEIVED' && item.status !== 'AWAITING_RESPONSE') return 'NONE';
  const deadline = time(item.responseDeadline);
  if (Number.isNaN(deadline)) return 'NONE';
  if (deadline < now) return 'OVERDUE';
  return deadline - now <= 7 * DAY_MS ? 'DUE_SOON' : 'ON_TRACK';
}

export function correspondenceErrors(
  input: IrCorrespondenceInput,
): Partial<Record<keyof IrCorrespondenceInput, string>> {
  const errors: Partial<Record<keyof IrCorrespondenceInput, string>> = {};
  if (blank(input.sender)) errors.sender = 'Enter the sender.';
  if (blank(input.recipient)) errors.recipient = 'Enter the recipient.';
  if (blank(input.subject)) errors.subject = 'Enter a subject.';
  if (blank(input.owner)) errors.owner = 'Name the responsible owner.';
  if (input.direction === 'INBOUND' && blank(input.receivedAt)) {
    errors.receivedAt = 'Inbound letters need the date received.';
  }
  if (
    !blank(input.responseDeadline) &&
    !blank(input.receivedAt) &&
    time(input.responseDeadline) < time(input.receivedAt)
  ) {
    errors.responseDeadline = 'The deadline cannot be before the date received.';
  }
  return errors;
}

/** Body, subject, recipient and language are the approved text. */
export function isContentChange(
  before: Pick<IrCorrespondence, 'body' | 'subject' | 'recipient' | 'language'>,
  after: Pick<IrCorrespondenceInput, 'body' | 'subject' | 'recipient' | 'language'>,
): boolean {
  return (
    before.body !== after.body ||
    before.subject !== after.subject ||
    before.recipient !== after.recipient ||
    before.language !== after.language
  );
}

/** Outbound text can change only before review, after a return, or after approval (which it invalidates). */
export function contentEditable(item: Pick<IrCorrespondence, 'direction' | 'status'>): boolean {
  if (item.direction === 'INBOUND') return item.status === 'RECEIVED';
  return item.status === 'DRAFT' || item.status === 'RETURNED' || item.status === 'APPROVED';
}

export function correspondenceToInput(item: IrCorrespondence): IrCorrespondenceInput {
  return {
    direction: item.direction,
    engagementId: item.engagementId,
    sender: item.sender,
    recipient: item.recipient,
    subject: item.subject,
    classification: item.classification,
    language: item.language,
    owner: item.owner,
    receivedAt: item.receivedAt,
    responseDeadline: item.responseDeadline,
    body: item.body,
    templateId: item.templateId,
    translationRef: item.translationRef,
    documentRef: item.documentRef,
  };
}

/* -------------------------------------------------------------------------- */
/* Letter templates                                                            */
/* -------------------------------------------------------------------------- */

export const PLACEHOLDERS = ['recipient', 'sender', 'date', 'subject', 'engagement'] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

/** Fills known placeholders that have a value; anything else is left visible. */
export function renderTemplate(text: string, values: Partial<Record<Placeholder, string>>): string {
  return text.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    const value = values[key as Placeholder];
    return PLACEHOLDERS.includes(key as Placeholder) && value && value.trim() ? value : match;
  });
}

export function unresolvedPlaceholders(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) found.add(match[1]!);
  return [...found];
}

const LETTER_LOCALE: Record<IrLanguage, string> = { EN: 'en-GB', FR: 'fr-FR', AR: 'ar-EG' };

export function formatLetterDate(date: Date, language: IrLanguage): string {
  return new Intl.DateTimeFormat(LETTER_LOCALE[language], { dateStyle: 'long' }).format(date);
}

export function letterDirection(language: IrLanguage): 'rtl' | 'ltr' {
  return language === 'AR' ? 'rtl' : 'ltr';
}

/* -------------------------------------------------------------------------- */
/* Gifts                                                                       */
/* -------------------------------------------------------------------------- */

export function giftErrors(input: IrGiftInput): Partial<Record<keyof IrGiftInput, string>> {
  const errors: Partial<Record<keyof IrGiftInput, string>> = {};
  if (blank(input.giver)) errors.giver = 'Enter who gave the gift.';
  if (blank(input.recipient)) errors.recipient = 'Enter who received the gift.';
  if (blank(input.description)) errors.description = 'Describe the gift.';
  if (blank(input.giftDate)) errors.giftDate = 'Enter the date of the gift.';
  if (input.valueKnown) {
    if (input.value === null || !Number.isFinite(input.value) || input.value < 0) {
      errors.value = 'Enter a value of zero or more.';
    }
    if (!input.currency || !/^[A-Z]{3}$/.test(input.currency)) {
      errors.currency = 'Use a three-letter currency code, e.g. GHS.';
    }
  } else if (input.value !== null) {
    errors.value = 'Leave the value empty when it is unknown.';
  }
  return errors;
}

export function initialFlagStatus(direction: IrGiftDirection): IrGiftFlagStatus {
  return direction === 'RECEIVED' ? 'PENDING' : 'NOT_REQUIRED';
}

export function flagRetryBlocker(status: IrGiftFlagStatus): string | null {
  if (status === 'ACKNOWLEDGED') return 'S011 has already acknowledged this gift; no further flag is sent.';
  if (status === 'NOT_REQUIRED') return 'Only received gifts are cross-flagged to S011.';
  return null;
}
