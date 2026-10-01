import { describe, expect, it } from 'vitest';

import type { Consultation, ConsultationQuestion } from '@partner-crm/types';

import {
  buildConsultation,
  completionSignal,
  createResponse,
  defaultFormValues,
  duplicateConsultation,
  identityErrors,
  slugify,
  toConsultationInput,
  toFormValues,
  validateConsultationForm,
  validateRequiredAnswers,
} from './domain';
import { initialConsultations } from './mockData';

const questions: ConsultationQuestion[] = [
  { id: 'required', type: 'SHORT_TEXT', prompt: 'Required', required: true },
  { id: 'optional', type: 'LONG_TEXT', prompt: 'Optional', required: false },
  { id: 'follow-up', type: 'LONG_TEXT', prompt: 'Why?', required: true, visibleIf: [{ questionId: 'required', operator: 'EQUALS', value: 'No' }] },
];

function fixture(id: string): Consultation {
  const consultation = initialConsultations.find((item) => item.id === id);
  if (!consultation) throw new Error(`Missing fixture ${id}`);
  return structuredClone(consultation);
}

const respondent = { name: 'Test Person', email: 'test@example.com', stakeholderGroup: 'Public' };

describe('response rules', () => {
  it('identifies unanswered required questions', () => {
    expect(validateRequiredAnswers(questions, { optional: 'Comment' })).toEqual(['required']);
    expect(validateRequiredAnswers(questions, { required: 'Yes' })).toEqual([]);
  });

  it('does not require questions hidden by skip logic', () => {
    expect(validateRequiredAnswers(questions, { required: 'Yes' })).toEqual([]);
    expect(validateRequiredAnswers(questions, { required: 'No' })).toEqual(['follow-up']);
  });

  it('drops respondent PII when explicit linking consent is absent', () => {
    const response = createResponse('CON-1', { language: 'en', answers: { required: 'Answer' }, consentToIdentityLink: false, respondent }, new Date('2026-09-20T10:00:00.000Z'));
    expect(response.respondent).toBeNull();
    expect(response.consentToIdentityLink).toBe(false);
    expect(response.themes).toEqual({});
  });

  it('retains respondent identity only after explicit consent', () => {
    expect(createResponse('CON-1', { language: 'fr', answers: {}, consentToIdentityLink: true, respondent }).respondent).toEqual(respondent);
  });

  it('requires identity and consent when anonymous responses are not allowed', () => {
    const blank = { consent: false, respondent: { name: '', email: '', stakeholderGroup: '' } };
    expect(Object.keys(identityErrors({ anonymousAllowed: false, collectIdentity: true }, blank)).sort()).toEqual(['consent', 'email', 'name']);
    expect(identityErrors({ anonymousAllowed: false, collectIdentity: true }, { consent: true, respondent })).toEqual({});
    expect(identityErrors({ anonymousAllowed: false, collectIdentity: true }, { consent: true, respondent: { ...respondent, email: 'nope' } }).email).toBeDefined();
  });

  it('only checks identity fields for anonymous-allowed consultations after opting in', () => {
    const blank = { consent: false, respondent: { name: '', email: '', stakeholderGroup: '' } };
    expect(identityErrors({ anonymousAllowed: true, collectIdentity: true }, blank)).toEqual({});
    expect(identityErrors({ anonymousAllowed: true, collectIdentity: true }, { ...blank, consent: true }).name).toBeDefined();
  });
});

describe('completion signal', () => {
  it('is responses over invitations across open targeted consultations', () => {
    const open = fixture('CON-2026-001');
    const second = { ...open, id: 'X', invitedCount: 100, responseCount: 25 };
    const publicOpen = { ...open, id: 'P', invitedCount: null, responseCount: 999 };
    const closed = { ...open, id: 'C', status: 'CLOSED' as const };
    const signal = completionSignal([open, second, publicOpen, closed]);
    expect(signal).toEqual({ rate: Math.round(((132 + 25) / (209 + 100)) * 100), responded: 157, invited: 309, consultations: 2 });
  });

  it('is null when nothing targeted is open', () => {
    expect(completionSignal([fixture('CON-2026-003')])).toBeNull();
  });
});

describe('consultation form', () => {
  it('validates required fields, dates, segments and questions', () => {
    const values = { ...defaultFormValues(new Date('2026-09-20T00:00:00Z')), audienceSource: 'CRM' as const, closesAt: '2026-09-01' };
    const errors = validateConsultationForm(values, []);
    expect(errors.title).toBeDefined();
    expect(errors.closesAt).toBeDefined();
    expect(errors.audienceSegmentIds).toBeDefined();
    expect(errors.questionsForm).toBeDefined();
  });

  it('accepts a seeded consultation and flags duplicate slugs', () => {
    const values = toFormValues(fixture('CON-2026-001'));
    expect(validateConsultationForm(values, [])).toEqual({});
    expect(validateConsultationForm(values, [values.slug]).slug).toBeDefined();
  });

  it('forces identity collection when anonymous responses are disallowed', () => {
    const values = { ...toFormValues(fixture('CON-2026-001')), anonymousAllowed: false, collectIdentity: false };
    expect(toConsultationInput(values, values.questions).collectIdentity).toBe(true);
  });

  it('builds drafts and duplicates without results', () => {
    const source = fixture('CON-2026-003');
    const draft = buildConsultation(toConsultationInput(toFormValues(source), source.questions), 'new-id');
    expect(draft).toMatchObject({ id: 'new-id', status: 'DRAFT', responseCount: 0, outcomeSummary: null, approvedBy: null, invitedCount: null });
    const copy = duplicateConsultation(fixture('CON-2026-004'), 'copy-id', ['annual-legal-education-conference-feedback-2026-copy']);
    expect(copy.slug).toBe('annual-legal-education-conference-feedback-2026-copy-2');
    expect(copy.status).toBe('DRAFT');
    expect(copy.triggers.every((trigger) => !trigger.active)).toBe(true);
  });

  it('creates stable URL slugs', () => {
    expect(slugify(' Legal Education: Review 2027 ')).toBe('legal-education-review-2027');
  });
});
