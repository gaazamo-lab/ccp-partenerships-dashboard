import type { ConsultationQuestion, ConsultationQuestionType } from '@partner-crm/types';

import { CHOICE_TYPES } from './constants';
import { conditionProblems } from './logic';

/**
 * Pure edits behind the question builder. Kept out of the component so the
 * rules — what a type change resets, what a delete cleans up — are tested.
 */

export function newQuestionId(): string {
  return `q-${crypto.randomUUID().slice(0, 8)}`;
}

export function blankQuestion(type: ConsultationQuestionType = 'LONG_TEXT', id = newQuestionId()): ConsultationQuestion {
  return withType({ id, type: 'LONG_TEXT', prompt: '', required: false }, type);
}

/** Changes a question's type, keeping what still applies and resetting the rest. */
export function withType(question: ConsultationQuestion, type: ConsultationQuestionType): ConsultationQuestion {
  const next: ConsultationQuestion = {
    id: question.id,
    type,
    prompt: question.prompt,
    description: question.description,
    required: type === 'SECTION' ? false : question.required,
    visibleIf: question.visibleIf,
    translations: question.translations,
  };
  if (CHOICE_TYPES.includes(type)) next.options = question.options?.length ? question.options : ['', ''];
  if (type === 'RATING') {
    next.min = question.type === 'RATING' ? (question.min ?? 1) : 1;
    next.max = question.type === 'RATING' ? (question.max ?? 5) : 5;
  }
  if (type === 'NPS') {
    next.min = 0;
    next.max = 10;
  }
  if (type === 'RATING' || type === 'NPS') {
    next.minLabel = question.minLabel ?? (type === 'NPS' ? 'Not at all likely' : undefined);
    next.maxLabel = question.maxLabel ?? (type === 'NPS' ? 'Extremely likely' : undefined);
  }
  if (type === 'NUMBER') {
    next.min = question.type === 'NUMBER' ? question.min : undefined;
    next.max = question.type === 'NUMBER' ? question.max : undefined;
  }
  return next;
}

export function moveQuestion(questions: ConsultationQuestion[], id: string, direction: -1 | 1) {
  const index = questions.findIndex((question) => question.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= questions.length) return questions;
  const next = [...questions];
  const [moved] = next.splice(index, 1);
  if (moved) next.splice(target, 0, moved);
  return next;
}

/** Inserts a copy directly below the original, with a fresh ID. */
export function duplicateQuestion(questions: ConsultationQuestion[], id: string, copyId = newQuestionId()) {
  const index = questions.findIndex((question) => question.id === id);
  const source = questions[index];
  if (!source) return questions;
  const copy: ConsultationQuestion = {
    ...structuredClone(source),
    id: copyId,
    prompt: source.prompt ? `${source.prompt} (copy)` : '',
  };
  const next = [...questions];
  next.splice(index + 1, 0, copy);
  return next;
}

/** Removes a question and every condition elsewhere that pointed at it. */
export function removeQuestion(questions: ConsultationQuestion[], id: string) {
  return questions
    .filter((question) => question.id !== id)
    .map((question) =>
      question.visibleIf?.some((condition) => condition.questionId === id)
        ? { ...question, visibleIf: question.visibleIf.filter((condition) => condition.questionId !== id) }
        : question,
    );
}

/** Field-level problems for each question, keyed by question ID. */
export function questionErrors(questions: ConsultationQuestion[]): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  questions.forEach((question, index) => {
    const problems: string[] = [];
    if (!question.prompt.trim()) {
      problems.push(question.type === 'SECTION' ? 'Give the section a heading.' : 'Enter the question text.');
    }
    if (CHOICE_TYPES.includes(question.type)) {
      const options = (question.options ?? []).map((option) => option.trim()).filter(Boolean);
      if (options.length < 2) problems.push('Add at least two options.');
      if (new Set(options).size !== options.length) problems.push('Options must be unique.');
    }
    if (question.type === 'RATING') {
      const min = question.min ?? 1;
      const max = question.max ?? 5;
      if (max <= min) problems.push('The highest rating must be greater than the lowest.');
      if (max - min > 10) problems.push('Keep rating scales to eleven points or fewer.');
    }
    if (question.type === 'NUMBER' && question.min !== undefined && question.max !== undefined && question.max <= question.min) {
      problems.push('The maximum must be greater than the minimum.');
    }
    problems.push(...conditionProblems(questions, index));
    if (problems.length) errors[question.id] = problems;
  });
  if (!questions.some((question) => question.type !== 'SECTION')) {
    errors._form = ['Add at least one question (section breaks alone are not enough).'];
  }
  return errors;
}

/** Trims text and drops empty options before saving. */
export function cleanQuestions(questions: ConsultationQuestion[]): ConsultationQuestion[] {
  return questions.map((question) => {
    const options = question.options?.map((option) => option.trim()).filter(Boolean);
    const translations = question.translations
      ? Object.fromEntries(
          Object.entries(question.translations).map(([code, translation]) => [
            code,
            {
              prompt: translation.prompt.trim(),
              description: translation.description?.trim() || undefined,
              options: translation.options?.map((option) => option.trim()),
            },
          ]),
        )
      : undefined;
    return {
      ...question,
      prompt: question.prompt.trim(),
      description: question.description?.trim() || undefined,
      options: CHOICE_TYPES.includes(question.type) ? options : undefined,
      visibleIf: question.visibleIf?.length ? question.visibleIf : undefined,
      translations,
    };
  });
}
