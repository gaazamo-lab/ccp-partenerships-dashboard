import type {
  Consultation,
  ConsultationAnswer,
  ConsultationQuestion,
  ConsultationRespondent,
  ConsultationResponse,
  CreateConsultationInput,
  SubmitConsultationResponseInput,
} from '@partner-crm/types';

import { questionErrors } from './builder';
import { languageCode } from './constants';
import { isAnswered, visibleQuestions } from './logic';

type Answers = Record<string, ConsultationAnswer | undefined>;

/**
 * Required questions left unanswered. Hidden questions (skip logic) and section
 * breaks are never required — a respondent cannot answer what they never saw.
 */
export function validateRequiredAnswers(questions: ConsultationQuestion[], answers: Answers) {
  return visibleQuestions(questions, answers)
    .filter((question) => question.required && !isAnswered(answers[question.id]))
    .map((question) => question.id);
}

/** Per-question answer problems (required, numeric range) for the visible questions. */
export function answerErrors(questions: ConsultationQuestion[], answers: Answers): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const question of visibleQuestions(questions, answers)) {
    const answer = answers[question.id];
    if (!isAnswered(answer)) {
      if (question.required) errors[question.id] = 'required';
      continue;
    }
    if (question.type === 'NUMBER') {
      const value = typeof answer === 'number' ? answer : Number(answer);
      if (Number.isNaN(value)) errors[question.id] = 'number';
      else if (question.min !== undefined && value < question.min) errors[question.id] = 'min';
      else if (question.max !== undefined && value > question.max) errors[question.id] = 'max';
    }
  }
  return errors;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface IdentityState {
  consent: boolean;
  respondent: ConsultationRespondent;
}

/**
 * Identity rules (PRD AC-15). Where anonymous responses are not allowed the
 * respondent must give their details *and* explicitly consent to the link; where
 * they are allowed, details are only checked once the respondent opts in.
 */
export function identityErrors(
  consultation: Pick<Consultation, 'anonymousAllowed' | 'collectIdentity'>,
  identity: IdentityState,
): Partial<Record<'consent' | 'name' | 'email', string>> {
  const identityRequired = !consultation.anonymousAllowed;
  const errors: Partial<Record<'consent' | 'name' | 'email', string>> = {};
  if (identityRequired && !identity.consent) {
    errors.consent = 'This consultation requires identified responses. Confirm your consent to continue.';
  }
  if (identityRequired || identity.consent) {
    if (!identity.respondent.name.trim()) errors.name = 'Enter your name.';
    if (!identity.respondent.email.trim()) errors.email = 'Enter your email address.';
    else if (!EMAIL.test(identity.respondent.email.trim())) errors.email = 'Enter a valid email address.';
  }
  return errors;
}

export function createResponse(
  consultationId: string,
  input: SubmitConsultationResponseInput,
  now = new Date(),
  id: string = crypto.randomUUID(),
): ConsultationResponse {
  return {
    id,
    consultationId,
    submittedAt: now.toISOString(),
    language: input.language,
    answers: input.answers,
    consentToIdentityLink: input.consentToIdentityLink,
    // PII is only ever stored against a response after explicit consent.
    respondent: input.consentToIdentityLink && input.respondent ? input.respondent : null,
    themes: {},
  };
}

export function consultationProgress(consultation: Pick<Consultation, 'invitedCount' | 'responseCount'>) {
  if (!consultation.invitedCount) return null;
  return Math.min(100, Math.round((consultation.responseCount / consultation.invitedCount) * 100));
}

/**
 * Dashboard "completion signal": responses over consent-verified invitations,
 * across open consultations with an invited audience. `null` when nothing open
 * is targeted — open public consultations have no denominator.
 */
export function completionSignal(consultations: Consultation[]) {
  const targeted = consultations.filter((item) => item.status === 'OPEN' && item.invitedCount);
  const invited = targeted.reduce((sum, item) => sum + (item.invitedCount ?? 0), 0);
  if (!invited) return null;
  const responded = targeted.reduce((sum, item) => sum + Math.min(item.responseCount, item.invitedCount ?? 0), 0);
  return { rate: Math.round((responded / invited) * 100), responded, invited, consultations: targeted.length };
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ------------------------------------------------------------------ */
/* Consultation form                                                   */
/* ------------------------------------------------------------------ */

/** The builder form: `CreateConsultationInput` with calendar dates (YYYY-MM-DD). */
export type ConsultationFormValues = CreateConsultationInput;

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function defaultFormValues(now = new Date()): ConsultationFormValues {
  return {
    title: '',
    slug: '',
    summary: '',
    description: '',
    category: '',
    languages: ['en'],
    opensAt: isoDay(new Date(now.getTime() + 86_400_000)),
    closesAt: isoDay(new Date(now.getTime() + 31 * 86_400_000)),
    estimatedMinutes: 5,
    anonymousAllowed: true,
    collectIdentity: false,
    audienceSource: 'PUBLIC',
    audienceSegmentIds: [],
    questions: [],
    triggers: [],
  };
}

export function toFormValues(consultation: Consultation): ConsultationFormValues {
  return {
    title: consultation.title,
    slug: consultation.slug,
    summary: consultation.summary,
    description: consultation.description,
    category: consultation.category,
    languages: consultation.languages.map(languageCode),
    opensAt: consultation.opensAt.slice(0, 10),
    closesAt: consultation.closesAt.slice(0, 10),
    estimatedMinutes: consultation.estimatedMinutes,
    anonymousAllowed: consultation.anonymousAllowed,
    collectIdentity: consultation.collectIdentity,
    audienceSource: consultation.audienceSource,
    audienceSegmentIds: [...consultation.audienceSegmentIds],
    questions: structuredClone(consultation.questions),
    triggers: structuredClone(consultation.triggers),
  };
}

export type FormErrors = Partial<Record<keyof ConsultationFormValues | 'questionsForm', string>> & {
  questionErrors?: Record<string, string[]>;
};

export function validateConsultationForm(
  values: ConsultationFormValues,
  takenSlugs: string[] = [],
): FormErrors {
  const errors: FormErrors = {};
  if (!values.title.trim()) errors.title = 'Enter a title.';
  if (!values.category.trim()) errors.category = 'Choose a category.';
  if (!values.summary.trim()) errors.summary = 'Enter a short summary for the consultation card.';
  if (!values.description.trim()) errors.description = 'Explain the purpose and how responses will be used.';
  const slug = values.slug.trim() || slugify(values.title);
  if (!slug) errors.slug = 'Enter a public URL slug.';
  else if (takenSlugs.includes(slug)) errors.slug = 'Another consultation already uses this URL.';
  if (!values.opensAt) errors.opensAt = 'Choose an opening date.';
  if (!values.closesAt) errors.closesAt = 'Choose a closing date.';
  else if (values.opensAt && values.closesAt <= values.opensAt) {
    errors.closesAt = 'The closing date must be later than the opening date.';
  }
  if (!Number.isFinite(values.estimatedMinutes) || values.estimatedMinutes < 1 || values.estimatedMinutes > 120) {
    errors.estimatedMinutes = 'Enter between 1 and 120 minutes.';
  }
  if (!values.languages.length) errors.languages = 'Choose at least one language.';
  if (values.audienceSource !== 'PUBLIC' && !values.audienceSegmentIds.length) {
    errors.audienceSegmentIds = 'Targeted consultations need at least one consent-verified segment.';
  }
  const problems = questionErrors(values.questions);
  const { _form: formProblems, ...perQuestion } = problems;
  if (formProblems?.length) errors.questionsForm = formProblems[0];
  if (Object.keys(perQuestion).length) {
    errors.questionErrors = perQuestion;
    errors.questionsForm ??= 'Fix the highlighted questions.';
  }
  return errors;
}

export function hasFormErrors(errors: FormErrors) {
  return Object.keys(errors).length > 0;
}

/** Form values to the create/update payload: ISO timestamps, trimmed text. */
export function toConsultationInput(values: ConsultationFormValues, cleanedQuestions: ConsultationQuestion[]): CreateConsultationInput {
  return {
    ...values,
    title: values.title.trim(),
    slug: values.slug.trim() || slugify(values.title),
    summary: values.summary.trim(),
    description: values.description.trim(),
    category: values.category.trim(),
    opensAt: new Date(`${values.opensAt}T08:00:00`).toISOString(),
    closesAt: new Date(`${values.closesAt}T23:59:00`).toISOString(),
    // An identified-only consultation must collect identity.
    collectIdentity: values.anonymousAllowed ? values.collectIdentity : true,
    audienceSegmentIds: values.audienceSource === 'PUBLIC' ? [] : values.audienceSegmentIds,
    questions: cleanedQuestions,
  };
}

export function buildConsultation(input: CreateConsultationInput, id: string, now = new Date()): Consultation {
  const timestamp = now.toISOString();
  return {
    ...input,
    id,
    status: 'DRAFT',
    invitedCount: input.audienceSource === 'PUBLIC' ? null : 0,
    responseCount: 0,
    themes: [],
    outcomeSummary: null,
    approvedBy: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** A fresh draft copied from an existing consultation: questions and settings, no results. */
export function duplicateConsultation(
  source: Consultation,
  id: string,
  takenSlugs: string[],
  now = new Date(),
): Consultation {
  let slug = `${source.slug}-copy`;
  for (let counter = 2; takenSlugs.includes(slug); counter += 1) slug = `${source.slug}-copy-${counter}`;
  return {
    ...structuredClone(source),
    id,
    slug,
    title: `Copy of ${source.title}`,
    status: 'DRAFT',
    invitedCount: source.audienceSource === 'PUBLIC' ? null : 0,
    responseCount: 0,
    triggers: source.triggers.map((trigger) => ({ ...trigger, active: false })),
    outcomeSummary: null,
    approvedBy: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** Plain-text rendering of an answer for tables, exports and the response modal. */
export function formatAnswer(answer: ConsultationAnswer | undefined): string {
  if (answer === undefined) return '';
  if (Array.isArray(answer)) return answer.join('; ');
  return String(answer);
}

/** The update payload for an existing consultation, e.g. to change only its triggers. */
export function consultationInput(consultation: Consultation): CreateConsultationInput {
  return {
    title: consultation.title,
    slug: consultation.slug,
    summary: consultation.summary,
    description: consultation.description,
    category: consultation.category,
    languages: consultation.languages,
    opensAt: consultation.opensAt,
    closesAt: consultation.closesAt,
    estimatedMinutes: consultation.estimatedMinutes,
    anonymousAllowed: consultation.anonymousAllowed,
    collectIdentity: consultation.collectIdentity,
    audienceSource: consultation.audienceSource,
    audienceSegmentIds: consultation.audienceSegmentIds,
    questions: consultation.questions,
    triggers: consultation.triggers,
  };
}
