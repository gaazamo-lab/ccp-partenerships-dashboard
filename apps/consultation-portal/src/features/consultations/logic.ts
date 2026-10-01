import type {
  ConsultationAnswer,
  ConsultationCondition,
  ConsultationConditionOperator,
  ConsultationQuestion,
  ConsultationQuestionType,
} from '@partner-crm/types';

import { CHOICE_TYPES, NUMERIC_TYPES } from './constants';

type Answers = Record<string, ConsultationAnswer | undefined>;

/**
 * Skip logic and section paging.
 *
 * A question is shown only when every one of its `visibleIf` conditions holds.
 * Conditions may only point at earlier questions, so visibility is resolved in
 * a single pass in order; an answer to a question that is itself hidden counts
 * as unanswered, which is what makes branches cascade correctly.
 */

export function isAnswered(answer: ConsultationAnswer | undefined): boolean {
  if (answer === undefined || answer === null) return false;
  if (typeof answer === 'number') return !Number.isNaN(answer);
  if (Array.isArray(answer)) return answer.length > 0;
  return answer.trim() !== '';
}

function asNumber(value: ConsultationAnswer | string | number | undefined): number | null {
  if (value === undefined || Array.isArray(value)) return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function sameValue(answer: ConsultationAnswer, expected: string | number | undefined) {
  if (expected === undefined) return false;
  if (Array.isArray(answer)) return answer.includes(String(expected));
  if (typeof answer === 'number') return answer === asNumber(expected);
  return answer === String(expected);
}

export function evaluateCondition(condition: ConsultationCondition, answers: Answers): boolean {
  const answer = answers[condition.questionId];
  if (condition.operator === 'ANSWERED') return isAnswered(answer);
  if (!isAnswered(answer) || answer === undefined) {
    // An unanswered question is "not equal" to anything, and matches nothing else.
    return condition.operator === 'NOT_EQUALS';
  }
  switch (condition.operator) {
    case 'EQUALS':
      return Array.isArray(answer)
        ? answer.length === 1 && answer[0] === String(condition.value ?? '')
        : sameValue(answer, condition.value);
    case 'NOT_EQUALS':
      return !sameValue(answer, condition.value);
    case 'INCLUDES':
      return Array.isArray(answer)
        ? answer.includes(String(condition.value ?? ''))
        : String(answer).toLowerCase().includes(String(condition.value ?? '').toLowerCase());
    case 'GREATER_THAN':
    case 'LESS_THAN': {
      const left = asNumber(answer);
      const right = asNumber(condition.value);
      if (left === null || right === null) return false;
      return condition.operator === 'GREATER_THAN' ? left > right : left < right;
    }
    default:
      return false;
  }
}

/** Whether a single question's own conditions hold for these answers. */
export function isVisible(question: ConsultationQuestion, answers: Answers): boolean {
  return (question.visibleIf ?? []).every((condition) => evaluateCondition(condition, answers));
}

/**
 * IDs of every question (and section) visible for these answers, resolved in
 * order so a hidden question's answer cannot keep a later question visible. A
 * hidden section hides every question up to the next section.
 */
export function visibleQuestionIds(questions: ConsultationQuestion[], answers: Answers): Set<string> {
  const visible = new Set<string>();
  const effective: Answers = {};
  let sectionVisible = true;
  for (const question of questions) {
    if (question.type === 'SECTION') {
      sectionVisible = isVisible(question, effective);
      if (sectionVisible) visible.add(question.id);
      continue;
    }
    if (sectionVisible && isVisible(question, effective)) {
      visible.add(question.id);
      effective[question.id] = answers[question.id];
    }
  }
  return visible;
}

/** Answerable questions (no section breaks) currently shown to the respondent. */
export function visibleQuestions(questions: ConsultationQuestion[], answers: Answers): ConsultationQuestion[] {
  const ids = visibleQuestionIds(questions, answers);
  return questions.filter((question) => question.type !== 'SECTION' && ids.has(question.id));
}

export interface QuestionPage {
  /** The section break that starts this page; `null` for questions before the first one. */
  section: ConsultationQuestion | null;
  questions: ConsultationQuestion[];
}

/** Splits the form at every section break. Pages without questions are dropped. */
export function paginate(questions: ConsultationQuestion[]): QuestionPage[] {
  const pages: QuestionPage[] = [];
  let current: QuestionPage = { section: null, questions: [] };
  for (const question of questions) {
    if (question.type === 'SECTION') {
      if (current.section || current.questions.length) pages.push(current);
      current = { section: question, questions: [] };
    } else {
      current.questions.push(question);
    }
  }
  if (current.section || current.questions.length) pages.push(current);
  return pages.filter((page) => page.questions.length > 0);
}

/** The pages a respondent actually steps through, with hidden questions removed. */
export function visiblePages(questions: ConsultationQuestion[], answers: Answers): QuestionPage[] {
  const ids = visibleQuestionIds(questions, answers);
  return paginate(questions)
    .filter((page) => !page.section || ids.has(page.section.id))
    .map((page) => ({ ...page, questions: page.questions.filter((question) => ids.has(question.id)) }))
    .filter((page) => page.questions.length > 0);
}

/** Drops answers to questions that are hidden, so skipped branches are never submitted. */
export function pruneHiddenAnswers(
  questions: ConsultationQuestion[],
  answers: Answers,
): Record<string, ConsultationAnswer> {
  const ids = visibleQuestionIds(questions, answers);
  const pruned: Record<string, ConsultationAnswer> = {};
  for (const [id, answer] of Object.entries(answers)) {
    if (ids.has(id) && answer !== undefined && isAnswered(answer)) pruned[id] = answer;
  }
  return pruned;
}

/** Earlier answerable questions a condition on question `index` may refer to. */
export function conditionSources(questions: ConsultationQuestion[], index: number): ConsultationQuestion[] {
  return questions.slice(0, Math.max(0, index)).filter((question) => question.type !== 'SECTION');
}

export function operatorsFor(type: ConsultationQuestionType): ConsultationConditionOperator[] {
  if (type === 'MULTI_CHOICE') return ['INCLUDES', 'ANSWERED'];
  if (CHOICE_TYPES.includes(type)) return ['EQUALS', 'NOT_EQUALS', 'ANSWERED'];
  if (NUMERIC_TYPES.includes(type)) return ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'ANSWERED'];
  return ['EQUALS', 'NOT_EQUALS', 'INCLUDES', 'ANSWERED'];
}

/** Problems with a question's conditions: unknown, later or self references and missing values. */
export function conditionProblems(questions: ConsultationQuestion[], index: number): string[] {
  const question = questions[index];
  if (!question?.visibleIf?.length) return [];
  const sources = conditionSources(questions, index);
  const problems: string[] = [];
  for (const condition of question.visibleIf) {
    const source = sources.find((item) => item.id === condition.questionId);
    if (!source) {
      problems.push('Each condition must refer to an earlier question.');
      continue;
    }
    if (!operatorsFor(source.type).includes(condition.operator)) {
      problems.push(`“${condition.operator.toLowerCase().replace('_', ' ')}” does not apply to that question type.`);
    }
    if (condition.operator !== 'ANSWERED' && (condition.value === undefined || String(condition.value).trim() === '')) {
      problems.push('Each condition needs a value to compare with.');
    }
  }
  return [...new Set(problems)];
}
