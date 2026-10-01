import { describe, expect, it } from 'vitest';

import type { IrCorrespondence, IrEngagement, IrGiftInput } from '@partner-crm/types';

import {
  approvalDecisionFor,
  closureBlockers,
  contentEditable,
  correspondenceDeadlineState,
  correspondenceErrors,
  correspondenceTransitionBlockers,
  correspondenceTransitions,
  draftErrors,
  engagementCommentRequired,
  engagementStage,
  engagementTiming,
  engagementToInput,
  engagementTransitionBlockers,
  findClashes,
  flagRetryBlocker,
  followUpColumn,
  giftErrors,
  initialFlagStatus,
  isContentChange,
  isCorrespondenceOverdue,
  isMaterialEngagementChange,
  letterDirection,
  nextReference,
  readinessBlockers,
  renderTemplate,
  statusAfterEdit,
  submissionErrors,
  supportUpdateBlockers,
  taskUpdateBlockers,
  unresolvedPlaceholders,
} from './domain';

const NOW = new Date('2026-09-26T09:00:00.000Z').getTime();

function engagement(overrides: Partial<IrEngagement> = {}): IrEngagement {
  return {
    id: 'e1',
    reference: 'CLET/IR/2026/001',
    type: 'VIP_VISIT',
    direction: 'INBOUND',
    title: 'ECOWAS delegation',
    purpose: 'Harmonise legal education',
    partnerStakeholderId: 'stk-014',
    partnerName: 'ECOWAS Commission',
    owner: 'Akosua Mensah',
    host: 'Director-General, CLET',
    venue: 'Council Chamber',
    startAt: '2026-10-05T09:00:00.000Z',
    endAt: '2026-10-05T16:00:00.000Z',
    timeZone: 'Africa/Accra',
    classification: 'INTERNAL',
    status: 'DRAFT',
    checklistVersion: 1,
    agendaRef: null,
    briefingPackRef: null,
    minutesRef: null,
    finalReportRef: null,
    delegation: [],
    protocolTasks: [],
    followUps: [],
    supportRequests: [],
    approvals: [],
    version: 1,
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
    ...overrides,
  };
}

function letter(overrides: Partial<IrCorrespondence> = {}): IrCorrespondence {
  return {
    id: 'c1',
    reference: 'CLET/COR/2026/001',
    direction: 'OUTBOUND',
    engagementId: null,
    sender: 'Council for Legal Education and Training',
    recipient: 'H.E. the Ambassador',
    subject: 'Courtesy call',
    classification: 'INTERNAL',
    language: 'AR',
    owner: 'Efua Asante',
    receivedAt: null,
    sentAt: null,
    responseDeadline: null,
    status: 'DRAFT',
    body: 'سعادة السفير',
    templateId: 'irl-004',
    templateVersion: 1,
    translationRef: null,
    documentRef: null,
    dispatchRef: null,
    approvedVersion: null,
    version: 1,
    createdAt: '2026-09-20T09:00:00.000Z',
    updatedAt: '2026-09-20T09:00:00.000Z',
    ...overrides,
  };
}

const ctx = { actor: 'Nana Yaw Boateng', comment: '' };

describe('references', () => {
  it('continues the sequence for the year and kind', () => {
    expect(nextReference('IR', 2026, [])).toBe('CLET/IR/2026/001');
    expect(
      nextReference('IR', 2026, ['CLET/IR/2026/004', 'CLET/IR/2025/019', 'CLET/COR/2026/030']),
    ).toBe('CLET/IR/2026/005');
    expect(nextReference('COR', 2026, ['CLET/COR/2026/030'])).toBe('CLET/COR/2026/031');
  });
});

describe('engagement state machine', () => {
  it('rejects transitions the machine does not allow', () => {
    const blockers = engagementTransitionBlockers(engagement({ status: 'DRAFT' }), 'APPROVED', ctx);
    expect(blockers[0]).toMatch(/cannot move from draft to approved/);
    expect(engagementTransitionBlockers(engagement({ status: 'CANCELLED' }), 'DRAFT', ctx)).toHaveLength(1);
  });

  it('requires the core fields before submission', () => {
    const incomplete = engagement({ purpose: '', timeZone: '', endAt: '' });
    const blockers = engagementTransitionBlockers(incomplete, 'SUBMITTED', ctx);
    expect(blockers.join(' ')).toMatch(/purpose/);
    expect(blockers.join(' ')).toMatch(/time zone/);
    expect(blockers.join(' ')).toMatch(/end date/);
    expect(engagementTransitionBlockers(engagement(), 'SUBMITTED', ctx)).toEqual([]);
  });

  it('requires the end after the start', () => {
    expect(
      submissionErrors({ ...engagement(), endAt: '2026-10-05T08:00:00.000Z' }).endAt,
    ).toMatch(/after the start/);
  });

  it('lets a draft be saved incomplete but not with dates out of order', () => {
    const input = { ...engagementToInput(engagement()), purpose: '', startAt: '', endAt: '' };
    expect(draftErrors(input)).toEqual({});
    expect(draftErrors({ ...input, title: ' ' }).title).toBeDefined();
    expect(
      draftErrors({ ...input, startAt: '2026-10-05T10:00', endAt: '2026-10-05T09:00' }).endAt,
    ).toBeDefined();
  });

  it('blocks the owner from approving their own plan (four-eyes)', () => {
    const inReview = engagement({ status: 'UNDER_REVIEW' });
    expect(
      engagementTransitionBlockers(inReview, 'APPROVED', { actor: ' akosua mensah ', comment: '' }),
    ).toEqual(['Four-eyes rule: the engagement owner cannot approve their own plan.']);
    expect(engagementTransitionBlockers(inReview, 'APPROVED', ctx)).toEqual([]);
  });

  it('requires comments to return, cancel and reopen', () => {
    expect(engagementCommentRequired('UNDER_REVIEW', 'RETURNED')).toBe(true);
    expect(engagementCommentRequired('SCHEDULED', 'CANCELLED')).toBe(true);
    expect(engagementCommentRequired('CLOSED', 'IN_PROGRESS')).toBe(true);
    expect(engagementCommentRequired('SCHEDULED', 'IN_PROGRESS')).toBe(false);
    const inReview = engagement({ status: 'UNDER_REVIEW' });
    expect(engagementTransitionBlockers(inReview, 'RETURNED', ctx)).toEqual([
      'A comment explaining the decision is required.',
    ]);
    expect(
      engagementTransitionBlockers(inReview, 'RETURNED', { ...ctx, comment: 'Add the delegation.' }),
    ).toEqual([]);
    expect(engagementTransitionBlockers(engagement({ status: 'CLOSED', minutesRef: 'x' }), 'IN_PROGRESS', ctx)).toHaveLength(1);
  });

  it('cannot cancel once completed', () => {
    expect(
      engagementTransitionBlockers(engagement({ status: 'COMPLETED' }), 'CANCELLED', { ...ctx, comment: 'x' }),
    ).toHaveLength(1);
  });

  it('blocks scheduling while a mandatory protocol task is open', () => {
    const approved = engagement({
      status: 'APPROVED',
      protocolTasks: [
        { id: 't1', title: 'Airport reception', mandatory: true, assignee: 'K', dueDate: null, status: 'OPEN', evidenceRef: null, exceptionReason: null },
        { id: 't2', title: 'Gift selection', mandatory: false, assignee: 'E', dueDate: null, status: 'OPEN', evidenceRef: null, exceptionReason: null },
        { id: 't3', title: 'Security', mandatory: true, assignee: 'K', dueDate: null, status: 'EXCEPTION', evidenceRef: null, exceptionReason: 'Waived' },
      ],
    });
    expect(readinessBlockers(approved)).toEqual(['1 mandatory protocol task still open: Airport reception.']);
    expect(engagementTransitionBlockers(approved, 'SCHEDULED', ctx)).toHaveLength(1);
    const ready = { ...approved, protocolTasks: approved.protocolTasks.slice(1) };
    expect(engagementTransitionBlockers(ready, 'SCHEDULED', ctx)).toEqual([]);
  });

  it('blocks closure without minutes or with an open mandatory follow-up', () => {
    const completed = engagement({
      status: 'COMPLETED',
      followUps: [
        { id: 'f1', title: 'Share framework', owner: 'Y', dueDate: '2026-09-20', mandatory: true, status: 'OPEN', exceptionReason: null },
        { id: 'f2', title: 'Thank-you', owner: 'E', dueDate: '2026-09-20', mandatory: false, status: 'OPEN', exceptionReason: null },
      ],
    });
    const blockers = closureBlockers(completed);
    expect(blockers).toHaveLength(2);
    expect(blockers[0]).toMatch(/minutes/);
    expect(blockers[1]).toMatch(/Share framework/);
    const resolved = engagement({
      status: 'COMPLETED',
      minutesRef: 'S003-DOC-1',
      followUps: [{ ...completed.followUps[0]!, status: 'EXCEPTION', exceptionReason: 'Authorised by DG' }, completed.followUps[1]!],
    });
    expect(engagementTransitionBlockers(resolved, 'CLOSED', ctx)).toEqual([]);
  });

  it('records the right approval-history decisions', () => {
    expect(approvalDecisionFor('DRAFT', 'SUBMITTED')).toBe('SUBMITTED');
    expect(approvalDecisionFor('RETURNED', 'SUBMITTED')).toBe('SUBMITTED');
    expect(approvalDecisionFor('UNDER_REVIEW', 'APPROVED')).toBe('APPROVED');
    expect(approvalDecisionFor('UNDER_REVIEW', 'RETURNED')).toBe('RETURNED');
    expect(approvalDecisionFor('SCHEDULED', 'CANCELLED')).toBe('CANCELLED');
    expect(approvalDecisionFor('CLOSED', 'IN_PROGRESS')).toBe('REOPENED');
    expect(approvalDecisionFor('SCHEDULED', 'IN_PROGRESS')).toBeNull();
  });

  it('invalidates approval after a material edit only', () => {
    const before = engagementToInput(engagement());
    expect(isMaterialEngagementChange(before, { ...before, venue: 'Boardroom B' })).toBe(true);
    expect(isMaterialEngagementChange(before, { ...before, agendaRef: 'S003-DOC-9' })).toBe(false);
    expect(statusAfterEdit('APPROVED', true)).toBe('SUBMITTED');
    expect(statusAfterEdit('SCHEDULED', true)).toBe('SUBMITTED');
    expect(statusAfterEdit('APPROVED', false)).toBe('APPROVED');
    expect(statusAfterEdit('DRAFT', true)).toBe('DRAFT');
  });

  it('groups statuses into stages and dates into timing windows', () => {
    expect(engagementStage('UNDER_REVIEW')).toBe('AWAITING_APPROVAL');
    expect(engagementStage('RETURNED')).toBe('PLANNING');
    expect(engagementTiming(engagement(), NOW)).toBe('NEXT_30_DAYS');
    expect(engagementTiming(engagement({ startAt: '2026-12-01T09:00:00Z', endAt: '2026-12-01T10:00:00Z' }), NOW)).toBe('LATER');
    expect(engagementTiming(engagement({ startAt: '2026-09-01T09:00:00Z', endAt: '2026-09-01T10:00:00Z' }), NOW)).toBe('PAST');
    expect(engagementTiming(engagement({ startAt: '', endAt: '' }), NOW)).toBe('UNSCHEDULED');
  });
});

describe('tasks, follow-ups and support handoffs', () => {
  it('needs evidence to complete a mandatory protocol task', () => {
    const task = { mandatory: true, status: 'OPEN' as const };
    expect(taskUpdateBlockers(task, { status: 'DONE' }, 'protocol')[0]).toMatch(/evidence/);
    expect(taskUpdateBlockers(task, { status: 'DONE', evidenceRef: 'S003-1' }, 'protocol')).toEqual([]);
    expect(taskUpdateBlockers({ ...task, mandatory: false }, { status: 'DONE' }, 'protocol')).toEqual([]);
    expect(taskUpdateBlockers(task, { status: 'DONE' }, 'followUp')).toEqual([]);
  });

  it('needs a reason to record an exception, and only from open', () => {
    const task = { mandatory: true, status: 'OPEN' as const };
    expect(taskUpdateBlockers(task, { status: 'EXCEPTION' }, 'followUp')[0]).toMatch(/reason/);
    expect(taskUpdateBlockers(task, { status: 'EXCEPTION', exceptionReason: 'DG waived' }, 'followUp')).toEqual([]);
    expect(taskUpdateBlockers({ ...task, status: 'DONE' }, { status: 'EXCEPTION', exceptionReason: 'x' }, 'followUp')).toHaveLength(1);
    expect(taskUpdateBlockers(task, { status: 'OPEN' }, 'protocol')).toHaveLength(1);
  });

  it('treats support submission as distinct from completion', () => {
    const requested = {
      id: 's1', system: 'S084' as const, description: 'Visa', externalRef: null,
      status: 'REQUESTED' as const, requestedAt: '', updatedAt: '',
    };
    expect(supportUpdateBlockers(requested, { status: 'COMPLETED', externalRef: 'S084-1' }, [requested])[0]).toMatch(/cannot move/);
    expect(supportUpdateBlockers(requested, { status: 'ACKNOWLEDGED', externalRef: null }, [requested])[0]).toMatch(/S084 reference/);
    expect(supportUpdateBlockers(requested, { status: 'ACKNOWLEDGED', externalRef: 'S084-1' }, [requested])).toEqual([]);
    const failed = { ...requested, status: 'FAILED' as const };
    expect(supportUpdateBlockers(failed, { status: 'REQUESTED', externalRef: null }, [failed])).toEqual([]);
  });

  it('keeps external IDs distinct across handoffs', () => {
    const travel = { id: 's1', system: 'S084' as const, description: 'Visa', externalRef: 'S084-TR-1', status: 'ACKNOWLEDGED' as const, requestedAt: '', updatedAt: '' };
    const event = { ...travel, id: 's2', system: 'S078' as const, externalRef: null, status: 'REQUESTED' as const };
    expect(supportUpdateBlockers(event, { status: 'ACKNOWLEDGED', externalRef: 's084-tr-1' }, [travel, event])[0]).toMatch(/own external ID/);
  });

  it('places follow-ups on the board', () => {
    expect(followUpColumn({ status: 'OPEN', dueDate: '2026-09-20' }, NOW)).toBe('OVERDUE');
    expect(followUpColumn({ status: 'OPEN', dueDate: '2026-09-26' }, NOW)).toBe('OPEN');
    expect(followUpColumn({ status: 'OPEN', dueDate: '2026-10-20' }, NOW)).toBe('OPEN');
    expect(followUpColumn({ status: 'DONE', dueDate: '2026-09-20' }, NOW)).toBe('DONE');
    expect(followUpColumn({ status: 'EXCEPTION', dueDate: '2026-09-20' }, NOW)).toBe('EXCEPTION');
  });
});

describe('calendar clashes', () => {
  const visit = engagement({ id: 'a', reference: 'A' });

  it('flags overlapping engagements with the same host, case-insensitively', () => {
    const call = engagement({
      id: 'b', reference: 'B', host: 'director-general, clet ', venue: 'DG office',
      startAt: '2026-10-05T14:00:00.000Z', endAt: '2026-10-05T15:00:00.000Z',
    });
    const clashes = findClashes([visit, call]);
    expect(clashes).toHaveLength(1);
    expect(clashes[0]).toMatchObject({ sharedHost: true, sharedVenue: false });
  });

  it('flags a shared venue', () => {
    const other = engagement({ id: 'b', host: 'Registrar', venue: 'COUNCIL CHAMBER', startAt: '2026-10-05T15:00:00.000Z', endAt: '2026-10-05T18:00:00.000Z' });
    expect(findClashes([visit, other])[0]).toMatchObject({ sharedHost: false, sharedVenue: true });
  });

  it('ignores back-to-back, unrelated or cancelled engagements', () => {
    const later = engagement({ id: 'b', startAt: '2026-10-05T16:00:00.000Z', endAt: '2026-10-05T17:00:00.000Z' });
    const elsewhere = engagement({ id: 'c', host: 'Registrar', venue: 'Makola campus' });
    const cancelled = engagement({ id: 'd', status: 'CANCELLED' });
    expect(findClashes([visit, later, elsewhere, cancelled])).toEqual([]);
  });
});

describe('correspondence', () => {
  it('follows separate inbound and outbound machines', () => {
    expect(correspondenceTransitions({ direction: 'INBOUND', status: 'RECEIVED' })).toEqual(['AWAITING_RESPONSE']);
    expect(correspondenceTransitions({ direction: 'OUTBOUND', status: 'IN_REVIEW' })).toEqual(['APPROVED', 'RETURNED']);
    expect(correspondenceTransitions({ direction: 'OUTBOUND', status: 'DISPATCHED' })).toEqual(['AWAITING_RESPONSE', 'CLOSED']);
    expect(correspondenceTransitions({ direction: 'OUTBOUND', status: 'CLOSED' })).toEqual([]);
    expect(correspondenceTransitionBlockers(letter({ status: 'DRAFT' }), 'APPROVED', '')[0]).toMatch(/cannot move/);
  });

  it('requires a comment to return a letter', () => {
    const inReview = letter({ status: 'IN_REVIEW' });
    expect(correspondenceTransitionBlockers(inReview, 'RETURNED', '')).toEqual(['Explain what needs to change.']);
    expect(correspondenceTransitionBlockers(inReview, 'RETURNED', 'Use the formal salutation')).toEqual([]);
  });

  it('will not send a letter to review with unfilled placeholders', () => {
    const draft = letter({ body: 'Dear {{recipient}}, {{ date }}' });
    expect(correspondenceTransitionBlockers(draft, 'IN_REVIEW', '')[0]).toMatch(/\{\{recipient\}\}, \{\{date\}\}/);
    expect(correspondenceTransitionBlockers(letter({ body: '' }), 'IN_REVIEW', '')).toHaveLength(1);
  });

  it('blocks dispatch of unapproved text', () => {
    expect(correspondenceTransitionBlockers(letter({ status: 'APPROVED', approvedVersion: null }), 'DISPATCHED', '')[0]).toMatch(/Obtain approval/);
    expect(correspondenceTransitionBlockers(letter({ status: 'APPROVED', approvedVersion: 2, version: 3 }), 'DISPATCHED', '')[0]).toMatch(/version 3 is current but version 2 was approved/);
    expect(correspondenceTransitionBlockers(letter({ status: 'APPROVED', approvedVersion: 3, version: 3 }), 'DISPATCHED', '')).toEqual([]);
  });

  it('only lets text change before review, after return or after approval', () => {
    expect(contentEditable({ direction: 'OUTBOUND', status: 'DRAFT' })).toBe(true);
    expect(contentEditable({ direction: 'OUTBOUND', status: 'APPROVED' })).toBe(true);
    expect(contentEditable({ direction: 'OUTBOUND', status: 'IN_REVIEW' })).toBe(false);
    expect(contentEditable({ direction: 'OUTBOUND', status: 'DISPATCHED' })).toBe(false);
    expect(contentEditable({ direction: 'INBOUND', status: 'RECEIVED' })).toBe(true);
    expect(isContentChange(letter(), { ...letter(), language: 'FR' })).toBe(true);
    expect(isContentChange(letter(), { ...letter() })).toBe(false);
  });

  it('is overdue only while a response is owed past the deadline', () => {
    const past = '2026-09-25T17:00:00.000Z';
    expect(isCorrespondenceOverdue({ status: 'RECEIVED', responseDeadline: past }, NOW)).toBe(true);
    expect(isCorrespondenceOverdue({ status: 'AWAITING_RESPONSE', responseDeadline: past }, NOW)).toBe(true);
    expect(isCorrespondenceOverdue({ status: 'RESPONDED', responseDeadline: past }, NOW)).toBe(false);
    expect(isCorrespondenceOverdue({ status: 'RECEIVED', responseDeadline: null }, NOW)).toBe(false);
    expect(correspondenceDeadlineState({ status: 'RECEIVED', responseDeadline: '2026-09-29T17:00:00Z' }, NOW)).toBe('DUE_SOON');
  });

  it('requires received date for inbound registration', () => {
    const input = {
      direction: 'INBOUND' as const, engagementId: null, sender: 'Embassy', recipient: 'DG', subject: 'Visit',
      classification: 'INTERNAL' as const, language: 'FR' as const, owner: 'Y', receivedAt: null,
      responseDeadline: null, body: '', templateId: null, translationRef: null, documentRef: null,
    };
    expect(correspondenceErrors(input).receivedAt).toBeDefined();
    expect(correspondenceErrors({ ...input, direction: 'OUTBOUND' })).toEqual({});
  });
});

describe('templates', () => {
  it('fills the five placeholders and leaves the rest visible', () => {
    const text = 'سعادة {{recipient}}، من {{sender}} بتاريخ {{date}} بشأن {{subject}} و{{engagement}} {{unknown}}';
    const rendered = renderTemplate(text, {
      recipient: 'السفير', sender: 'المجلس', date: '٢٠ سبتمبر', subject: 'الزيارة', engagement: 'الوفد',
    });
    expect(rendered).toBe('سعادة السفير، من المجلس بتاريخ ٢٠ سبتمبر بشأن الزيارة والوفد {{unknown}}');
    expect(renderTemplate('Dear {{recipient}}', { recipient: '' })).toBe('Dear {{recipient}}');
    expect(unresolvedPlaceholders(rendered)).toEqual(['unknown']);
  });

  it('renders Arabic right-to-left', () => {
    expect(letterDirection('AR')).toBe('rtl');
    expect(letterDirection('FR')).toBe('ltr');
  });
});

describe('gifts', () => {
  const base: IrGiftInput = {
    direction: 'RECEIVED', engagementId: null, giver: 'Kenya School of Law', recipient: 'CLET',
    description: 'Shield', giftDate: '2026-09-14', valueKnown: false, value: null, currency: null,
  };

  it('keeps unknown values empty and known values with a currency', () => {
    expect(giftErrors(base)).toEqual({});
    expect(giftErrors({ ...base, value: 10 }).value).toMatch(/empty/);
    expect(giftErrors({ ...base, valueKnown: true, value: -1, currency: 'GHS' }).value).toBeDefined();
    expect(giftErrors({ ...base, valueKnown: true, value: 0, currency: 'ghs' }).currency).toBeDefined();
    expect(giftErrors({ ...base, valueKnown: true, value: 180, currency: 'USD' })).toEqual({});
  });

  it('flags only received gifts, and never after acknowledgement', () => {
    expect(initialFlagStatus('RECEIVED')).toBe('PENDING');
    expect(initialFlagStatus('GIVEN')).toBe('NOT_REQUIRED');
    expect(flagRetryBlocker('PENDING')).toBeNull();
    expect(flagRetryBlocker('FAILED')).toBeNull();
    expect(flagRetryBlocker('ACKNOWLEDGED')).toMatch(/already acknowledged/);
    expect(flagRetryBlocker('NOT_REQUIRED')).toMatch(/Only received/);
  });
});
