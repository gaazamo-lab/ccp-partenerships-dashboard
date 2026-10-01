import { describe, expect, it } from 'vitest';

import type { ConsultationQuestion } from '@partner-crm/types';

import {
  conditionProblems,
  evaluateCondition,
  isVisible,
  paginate,
  pruneHiddenAnswers,
  visiblePages,
  visibleQuestions,
} from './logic';
import { localizeQuestion, missingTranslations } from './translation';

const questions: ConsultationQuestion[] = [
  { id: 's1', type: 'SECTION', prompt: 'About you', required: false },
  { id: 'role', type: 'SINGLE_CHOICE', prompt: 'Role', required: true, options: ['Student', 'Employer'] },
  { id: 'school', type: 'DROPDOWN', prompt: 'School', required: true, options: ['UG', 'KNUST'], visibleIf: [{ questionId: 'role', operator: 'EQUALS', value: 'Student' }] },
  { id: 'year', type: 'NUMBER', prompt: 'Year', required: false, visibleIf: [{ questionId: 'school', operator: 'ANSWERED' }] },
  { id: 's2', type: 'SECTION', prompt: 'Rating', required: false },
  { id: 'score', type: 'RATING', prompt: 'Score', required: true, min: 1, max: 5 },
  { id: 'why', type: 'LONG_TEXT', prompt: 'Why low?', required: false, visibleIf: [{ questionId: 'score', operator: 'LESS_THAN', value: 3 }] },
  { id: 's3', type: 'SECTION', prompt: 'Employers only', required: false, visibleIf: [{ questionId: 'role', operator: 'EQUALS', value: 'Employer' }] },
  { id: 'hires', type: 'MULTI_CHOICE', prompt: 'Hires', required: true, options: ['Pupils', 'Associates'] },
];

describe('conditions', () => {
  it('evaluates each operator', () => {
    const answers = { role: 'Student', score: 2, tags: ['a', 'b'], note: 'Needs more practice' };
    expect(evaluateCondition({ questionId: 'role', operator: 'EQUALS', value: 'Student' }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: 'role', operator: 'NOT_EQUALS', value: 'Student' }, answers)).toBe(false);
    expect(evaluateCondition({ questionId: 'tags', operator: 'INCLUDES', value: 'b' }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: 'note', operator: 'INCLUDES', value: 'practice' }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: 'score', operator: 'LESS_THAN', value: 3 }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: 'score', operator: 'GREATER_THAN', value: '3' }, answers)).toBe(false);
    expect(evaluateCondition({ questionId: 'score', operator: 'EQUALS', value: '2' }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: 'missing', operator: 'ANSWERED' }, answers)).toBe(false);
    expect(evaluateCondition({ questionId: 'missing', operator: 'NOT_EQUALS', value: 'x' }, answers)).toBe(true);
    expect(evaluateCondition({ questionId: 'missing', operator: 'LESS_THAN', value: 3 }, answers)).toBe(false);
  });

  it('requires every condition on a question', () => {
    const question: ConsultationQuestion = { id: 'q', type: 'SHORT_TEXT', prompt: 'Q', required: false, visibleIf: [
      { questionId: 'role', operator: 'EQUALS', value: 'Student' },
      { questionId: 'score', operator: 'GREATER_THAN', value: 3 },
    ] };
    expect(isVisible(question, { role: 'Student', score: 4 })).toBe(true);
    expect(isVisible(question, { role: 'Student', score: 2 })).toBe(false);
  });
});

describe('visibility', () => {
  it('shows branches only when they apply and cascades hidden answers', () => {
    const student = visibleQuestions(questions, { role: 'Student', school: 'UG', score: 4 }).map((item) => item.id);
    expect(student).toEqual(['role', 'school', 'year', 'score']);
    // Switching to employer hides the school, so the stale school answer no longer shows "year".
    const employer = visibleQuestions(questions, { role: 'Employer', school: 'UG', score: 2 }).map((item) => item.id);
    expect(employer).toEqual(['role', 'score', 'why', 'hires']);
  });

  it('prunes answers to hidden questions before submission', () => {
    expect(pruneHiddenAnswers(questions, { role: 'Employer', school: 'UG', year: 2, score: 5, why: 'stale', hires: [] })).toEqual({ role: 'Employer', score: 5 });
  });
});

describe('section paging', () => {
  it('splits at section breaks', () => {
    expect(paginate(questions).map((page) => page.section?.id)).toEqual(['s1', 's2', 's3']);
    expect(paginate([{ id: 'a', type: 'SHORT_TEXT', prompt: 'A', required: false }])).toHaveLength(1);
  });

  it('drops hidden sections and pages with nothing to show', () => {
    expect(visiblePages(questions, { role: 'Student' }).map((page) => page.section?.id)).toEqual(['s1', 's2']);
    expect(visiblePages(questions, { role: 'Employer' }).map((page) => page.section?.id)).toEqual(['s1', 's2', 's3']);
  });
});

describe('builder checks', () => {
  it('flags conditions that refer to later or unknown questions', () => {
    const broken: ConsultationQuestion[] = [
      { id: 'a', type: 'SHORT_TEXT', prompt: 'A', required: false, visibleIf: [{ questionId: 'b', operator: 'ANSWERED' }] },
      { id: 'b', type: 'RATING', prompt: 'B', required: false, visibleIf: [{ questionId: 'a', operator: 'EQUALS' }] },
    ];
    expect(conditionProblems(broken, 0)).toEqual(['Each condition must refer to an earlier question.']);
    expect(conditionProblems(broken, 1)).toEqual(['Each condition needs a value to compare with.']);
  });
});

describe('translations', () => {
  const question: ConsultationQuestion = {
    id: 'q', type: 'SINGLE_CHOICE', prompt: 'Role?', required: true, options: ['Student', 'Employer'],
    translations: { fr: { prompt: 'Rôle ?', options: ['Étudiant', ''] } },
  };

  it('localises text but keeps primary-language answer values', () => {
    const localized = localizeQuestion(question, 'fr', 'en');
    expect(localized.prompt).toBe('Rôle ?');
    expect(localized.options).toEqual([{ value: 'Student', label: 'Étudiant' }, { value: 'Employer', label: 'Employer' }]);
    expect(localizeQuestion(question, 'ar', 'en').prompt).toBe('Role?');
  });

  it('reports questions still missing a translation', () => {
    expect(missingTranslations([question], 'fr')).toEqual(['q']);
    expect(missingTranslations([question], 'ar')).toEqual(['q']);
  });
});
