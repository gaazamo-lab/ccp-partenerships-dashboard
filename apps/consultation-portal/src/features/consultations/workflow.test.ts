import { describe, expect, it } from 'vitest';

import type { Consultation, ConsultationQuestion } from '@partner-crm/types';

import { cleanQuestions, duplicateQuestion, moveQuestion, questionErrors, removeQuestion, withType } from './builder';
import { audienceReach, buildInvitation, invitationBlockers } from './invitations';
import { actionBlockers, actionsFor, applyStatusChange, lifecycleAction, transitionInputErrors } from './lifecycle';
import { initialConsultations, initialSegments } from './mockData';
import { can, deniedReason } from './permissions';

function fixture(id: string): Consultation {
  const consultation = initialConsultations.find((item) => item.id === id);
  if (!consultation) throw new Error(`Missing fixture ${id}`);
  return structuredClone(consultation);
}

const now = new Date('2026-09-26T12:00:00.000Z');

describe('lifecycle', () => {
  it('offers the actions for each status', () => {
    expect(actionsFor('DRAFT').map((action) => action.id)).toEqual(['submit']);
    expect(actionsFor('REVIEW').map((action) => action.id)).toEqual(['approve', 'return']);
    expect(actionsFor('OPEN').map((action) => action.id)).toEqual(['extend', 'close']);
    expect(actionsFor('CLOSED').map((action) => action.id)).toEqual(['reopen', 'archive']);
    expect(actionsFor('ARCHIVED')).toEqual([]);
  });

  it('blocks submitting an incomplete draft', () => {
    const draft = { ...fixture('CON-2026-004'), questions: [] };
    expect(actionBlockers(draft, lifecycleAction('submit'), now)).toContain('Add at least one question (section breaks alone are not enough).');
    expect(actionBlockers(fixture('CON-2026-004'), lifecycleAction('submit'), now)).toEqual([]);
  });

  it('records the approver and clears it on return to draft', () => {
    const review = fixture('CON-2026-005');
    const approved = applyStatusChange(review, { status: 'SCHEDULED' }, 'Reviewer A', now);
    expect(approved).toMatchObject({ status: 'SCHEDULED', approvedBy: 'Reviewer A' });
    expect(applyStatusChange(approved, { status: 'DRAFT', comment: 'Fix Q2' }, 'Reviewer A', now).approvedBy).toBeNull();
  });

  it('extends and closes with the right dates', () => {
    const open = fixture('CON-2026-001');
    const extended = applyStatusChange(open, { status: 'OPEN', closesAt: '2026-11-30T23:59:00.000Z' }, 'M', now);
    expect(extended.closesAt).toBe('2026-11-30T23:59:00.000Z');
    expect(applyStatusChange(open, { status: 'CLOSED' }, 'M', now).closesAt).toBe(now.toISOString());
  });

  it('validates comments and close dates', () => {
    const open = fixture('CON-2026-001');
    expect(transitionInputErrors(open, lifecycleAction('extend'), '', '2026-10-01', now)).toEqual({
      comment: 'Add a comment explaining this decision.',
      closesAt: 'Choose a date after the current close date.',
    });
    expect(transitionInputErrors(open, lifecycleAction('extend'), 'More time', '2026-11-30', now)).toEqual({});
    expect(transitionInputErrors(fixture('CON-2026-003'), lifecycleAction('reopen'), 'x', '2026-01-01', now).closesAt).toBeDefined();
  });
});

describe('invitations', () => {
  it('counts consent-verified reach per segment', () => {
    expect(audienceReach(['SEG-UNI', 'SEG-BAR', 'SEG-GONE'], initialSegments)).toEqual({ members: 238, consented: 209, excluded: 29, unknownSegments: ['SEG-GONE'] });
  });

  it('builds deterministic invitation and reminder counts', () => {
    const open = fixture('CON-2026-001');
    const invitation = buildInvitation(open, { kind: 'INVITATION', segmentIds: ['SEG-UNI'] }, initialSegments, [], 'M', now, 'id-1');
    expect(invitation).toMatchObject({ recipientCount: 128, excludedCount: 14, communicationRef: 'S074-CON-2026-001-001' });
    const reminder = buildInvitation(open, { kind: 'REMINDER', segmentIds: ['SEG-UNI', 'SEG-BAR'] }, initialSegments, [invitation], 'M', now, 'id-2');
    expect(reminder).toMatchObject({ recipientCount: 209 - 132, excludedCount: 29 + 132, communicationRef: 'S074-CON-2026-001-002' });
  });

  it('blocks sends that the lifecycle or audience does not allow', () => {
    expect(invitationBlockers(fixture('CON-2026-003'), { kind: 'INVITATION', segmentIds: ['SEG-UNI'] }).length).toBeGreaterThan(0);
    expect(invitationBlockers(fixture('CON-2026-002'), { kind: 'REMINDER', segmentIds: ['SEG-BAR'] })).toEqual(['Reminders can only be sent while the consultation is open.']);
    expect(invitationBlockers(fixture('CON-2026-001'), { kind: 'INVITATION', segmentIds: [] })).toEqual(['Choose at least one audience segment.']);
  });
});

describe('question builder', () => {
  const base: ConsultationQuestion[] = [
    { id: 'a', type: 'SINGLE_CHOICE', prompt: 'A', required: true, options: ['Yes', 'No'] },
    { id: 'b', type: 'LONG_TEXT', prompt: 'B', required: false, visibleIf: [{ questionId: 'a', operator: 'EQUALS', value: 'No' }] },
  ];

  it('reorders, duplicates and removes with condition clean-up', () => {
    expect(moveQuestion(base, 'b', -1).map((item) => item.id)).toEqual(['b', 'a']);
    expect(moveQuestion(base, 'a', -1)).toBe(base);
    expect(duplicateQuestion(base, 'a', 'a2').map((item) => item.id)).toEqual(['a', 'a2', 'b']);
    expect(removeQuestion(base, 'a')).toEqual([{ ...base[1], visibleIf: [] }]);
  });

  it('flags a condition that points below its question after a move', () => {
    expect(questionErrors(moveQuestion(base, 'b', -1)).b).toEqual(['Each condition must refer to an earlier question.']);
  });

  it('resets type-specific fields when the type changes', () => {
    const nps = withType(base[0] as ConsultationQuestion, 'NPS');
    expect(nps).toMatchObject({ min: 0, max: 10, minLabel: 'Not at all likely' });
    expect(nps.options).toBeUndefined();
    expect(withType(base[1] as ConsultationQuestion, 'SECTION').required).toBe(false);
  });

  it('requires two unique options and trims before saving', () => {
    expect(questionErrors([{ id: 'c', type: 'DROPDOWN', prompt: 'C', required: false, options: ['One', ' '] }]).c).toEqual(['Add at least two options.']);
    expect(cleanQuestions([{ id: 'c', type: 'DROPDOWN', prompt: ' C ', required: false, options: [' One ', '', 'Two'] }])[0]).toMatchObject({ prompt: 'C', options: ['One', 'Two'] });
  });
});

describe('permissions', () => {
  it('maps roles to the S088 matrix', () => {
    expect(can('Consultation Manager', 'manage')).toBe(true);
    expect(can('Consultation Manager', 'approve')).toBe(false);
    expect(can('Registrar', 'approve')).toBe(true);
    expect(can('Registrar', 'manage')).toBe(false);
    expect(can('CRM Administrator', 'approve')).toBe(true);
    expect(can('Executive Viewer', 'export')).toBe(true);
    expect(can('Auditor', 'manage')).toBe(false);
    expect(can(undefined, 'view')).toBe(false);
    expect(deniedReason('Auditor', 'view_identity')).toBeDefined();
  });
});
