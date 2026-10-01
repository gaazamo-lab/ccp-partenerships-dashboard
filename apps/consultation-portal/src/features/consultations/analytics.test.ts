import { describe, expect, it } from 'vitest';

import type { Consultation, ConsultationQuestion, ConsultationResponse } from '@partner-crm/types';

import {
  codingProgress,
  languageBreakdown,
  meanScore,
  npsScore,
  numberSummary,
  openTextAnswers,
  questionDistribution,
  responsesPerDay,
  stakeholderGroupBreakdown,
  themeFrequency,
} from './analytics';

let sequence = 0;
function response(answers: ConsultationResponse['answers'], extra: Partial<ConsultationResponse> = {}): ConsultationResponse {
  sequence += 1;
  return { id: `R${sequence}`, consultationId: 'C', submittedAt: '2026-09-01T10:00:00.000Z', language: 'en', answers, consentToIdentityLink: false, respondent: null, themes: {}, ...extra };
}

const choice: ConsultationQuestion = { id: 'c', type: 'SINGLE_CHOICE', prompt: 'C', required: true, options: ['A', 'B'] };
const multi: ConsultationQuestion = { id: 'm', type: 'MULTI_CHOICE', prompt: 'M', required: true, options: ['X', 'Y'] };
const rating: ConsultationQuestion = { id: 'r', type: 'RATING', prompt: 'R', required: true, min: 1, max: 5 };
const nps: ConsultationQuestion = { id: 'n', type: 'NPS', prompt: 'N', required: false, min: 0, max: 10 };
const number: ConsultationQuestion = { id: 'x', type: 'NUMBER', prompt: 'X', required: false };

describe('distributions', () => {
  const responses = [
    response({ c: 'A', m: ['X', 'Y'], r: 5 }),
    response({ c: 'A', m: ['X'], r: 3 }),
    response({ c: 'Retired option', m: [], r: 4 }),
    response({}),
  ];

  it('counts choices over respondents who answered, grouping unknown values as Other', () => {
    expect(questionDistribution(choice, responses)).toEqual([
      { label: 'A', count: 2, share: 66.7 },
      { label: 'B', count: 0, share: 0 },
      { label: 'Other', count: 1, share: 33.3 },
    ]);
  });

  it('lets multiple-choice shares exceed 100% in total', () => {
    expect(questionDistribution(multi, responses)).toEqual([
      { label: 'X', count: 2, share: 100 },
      { label: 'Y', count: 1, share: 50 },
    ]);
  });

  it('covers every rating point and computes the mean', () => {
    expect(questionDistribution(rating, responses).map((row) => row.count)).toEqual([0, 0, 1, 1, 1]);
    expect(meanScore(rating, responses)).toBe(4);
    expect(meanScore(rating, [response({})])).toBeNull();
  });
});

describe('NPS', () => {
  it('is % promoters minus % detractors', () => {
    const responses = [9, 10, 8, 7, 6, 0, 10].map((value) => response({ n: value }));
    expect(npsScore(nps, responses)).toEqual({ promoters: 3, passives: 2, detractors: 2, total: 7, score: 14 });
    expect(npsScore(nps, []).score).toBeNull();
    expect(questionDistribution(nps, responses)).toHaveLength(11);
  });
});

it('summarises number answers', () => {
  expect(numberSummary(number, [response({ x: 10 }), response({ x: '20' }), response({})])).toEqual({ count: 2, mean: 15, min: 10, max: 20 });
});

it('counts responses per day with gaps filled', () => {
  const responses = [
    response({}, { submittedAt: '2026-09-03T09:00:00.000Z' }),
    response({}, { submittedAt: '2026-09-01T09:00:00.000Z' }),
    response({}, { submittedAt: '2026-09-01T18:00:00.000Z' }),
  ];
  expect(responsesPerDay(responses)).toEqual([
    { date: '2026-09-01', count: 2 },
    { date: '2026-09-02', count: 0 },
    { date: '2026-09-03', count: 1 },
  ]);
  expect(responsesPerDay([])).toEqual([]);
});

it('breaks down by stakeholder group only for consented identities', () => {
  const respondent = { name: 'A', email: 'a@example.com', stakeholderGroup: 'Employer' };
  const responses = [
    response({}, { consentToIdentityLink: true, respondent }),
    response({}, { consentToIdentityLink: true, respondent }),
    response({}),
    response({}, { language: 'fr' }),
  ];
  expect(stakeholderGroupBreakdown(responses)).toEqual([
    { label: 'Employer', count: 2, share: 50 },
    { label: 'Not linked (anonymous)', count: 2, share: 50 },
  ]);
  expect(languageBreakdown(responses)[0]).toEqual({ label: 'English', count: 3, share: 75 });
});

describe('themes', () => {
  const consultation = {
    questions: [{ id: 't', type: 'LONG_TEXT', prompt: 'T', required: false }],
    themes: [{ id: 'a', label: 'Access', description: '' }, { id: 'b', label: 'Budget', description: '' }],
  } as unknown as Consultation;
  const responses = [
    response({ t: 'One' }, { themes: { t: ['a', 'b'] } }),
    response({ t: 'Two' }, { themes: { t: ['a'] } }),
    response({ t: '   ' }),
    response({ t: 'Three' }),
  ];

  it('counts theme frequency across coded answers', () => {
    expect(themeFrequency(consultation, responses)).toEqual([
      { themeId: 'a', label: 'Access', count: 2, share: 100 },
      { themeId: 'b', label: 'Budget', count: 1, share: 50 },
    ]);
  });

  it('lists non-empty open-text answers and coding progress', () => {
    const answers = openTextAnswers(consultation, responses);
    expect(answers.map((answer) => answer.text).sort()).toEqual(['One', 'Three', 'Two']);
    expect(codingProgress(answers)).toBe(67);
  });
});
