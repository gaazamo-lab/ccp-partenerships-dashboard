import type { ConsultationQuestion } from '@partner-crm/types';

import { CHOICE_TYPES } from './constants';

export interface LocalizedOption {
  /** Stored answer value — always the primary-language option, so results aggregate across languages. */
  value: string;
  label: string;
}

export interface LocalizedQuestion {
  prompt: string;
  description?: string;
  options: LocalizedOption[];
  minLabel?: string;
  maxLabel?: string;
}

/**
 * The question as a respondent reading `language` sees it. Anything missing in
 * the translation falls back to the primary-language text rather than showing
 * a blank.
 */
export function localizeQuestion(
  question: ConsultationQuestion,
  language: string,
  primaryLanguage: string,
): LocalizedQuestion {
  const translation = language === primaryLanguage ? undefined : question.translations?.[language];
  const options = (question.options ?? []).map((option, index) => ({
    value: option,
    label: translation?.options?.[index]?.trim() || option,
  }));
  return {
    prompt: translation?.prompt?.trim() || question.prompt,
    description: translation?.description?.trim() || question.description,
    options,
    minLabel: question.minLabel,
    maxLabel: question.maxLabel,
  };
}

/** Questions that still need a prompt (or option labels) in `language`. */
export function missingTranslations(questions: ConsultationQuestion[], language: string): string[] {
  return questions
    .filter((question) => {
      const translation = question.translations?.[language];
      if (!translation?.prompt?.trim()) return true;
      if (CHOICE_TYPES.includes(question.type)) {
        const options = question.options ?? [];
        return options.some((_, index) => !translation.options?.[index]?.trim());
      }
      return false;
    })
    .map((question) => question.id);
}
