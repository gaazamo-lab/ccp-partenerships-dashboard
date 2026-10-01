import type {
  ConsultationAudienceSource,
  ConsultationConditionOperator,
  ConsultationQuestionType,
  ConsultationStatus,
  ConsultationTriggerType,
} from '@partner-crm/types';

export interface LanguageOption {
  code: string;
  label: string;
  /** How the language names itself, shown in the public switcher. */
  nativeLabel: string;
  rtl: boolean;
}

/** Languages a consultation can be published in. The first selected one is primary. */
export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', rtl: false },
  { code: 'fr', label: 'French', nativeLabel: 'Français', rtl: false },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', rtl: true },
  { code: 'tw', label: 'Twi', nativeLabel: 'Twi', rtl: false },
  { code: 'ee', label: 'Ewe', nativeLabel: 'Eʋegbe', rtl: false },
  { code: 'ha', label: 'Hausa', nativeLabel: 'Hausa', rtl: false },
  { code: 'gaa', label: 'Ga', nativeLabel: 'Gã', rtl: false },
  { code: 'dag', label: 'Dagbani', nativeLabel: 'Dagbanli', rtl: false },
];

const LEGACY_LANGUAGE_NAMES: Record<string, string> = { English: 'en', French: 'fr', Arabic: 'ar' };

/** Accepts a language code (or a legacy display name) and returns the code. */
export function languageCode(value: string): string {
  return LEGACY_LANGUAGE_NAMES[value] ?? value;
}

export function languageLabel(value: string): string {
  const code = languageCode(value);
  return LANGUAGES.find((language) => language.code === code)?.label ?? value;
}

export function languageNativeLabel(value: string): string {
  const code = languageCode(value);
  return LANGUAGES.find((language) => language.code === code)?.nativeLabel ?? value;
}

export function isRtl(value: string): boolean {
  const code = languageCode(value);
  return LANGUAGES.find((language) => language.code === code)?.rtl ?? false;
}

export const QUESTION_TYPE_LABELS: Record<ConsultationQuestionType, string> = {
  SECTION: 'Section break',
  SHORT_TEXT: 'Short text',
  LONG_TEXT: 'Long text',
  SINGLE_CHOICE: 'Single choice',
  MULTI_CHOICE: 'Multiple choice',
  DROPDOWN: 'Dropdown',
  RATING: 'Rating scale',
  NPS: 'Net Promoter Score (0–10)',
  NUMBER: 'Number',
  DATE: 'Date',
};

export const ANSWER_TYPES = (Object.keys(QUESTION_TYPE_LABELS) as ConsultationQuestionType[]).filter(
  (type) => type !== 'SECTION',
);

export const CHOICE_TYPES: ConsultationQuestionType[] = ['SINGLE_CHOICE', 'MULTI_CHOICE', 'DROPDOWN'];
export const SCALE_TYPES: ConsultationQuestionType[] = ['RATING', 'NPS'];
export const NUMERIC_TYPES: ConsultationQuestionType[] = ['RATING', 'NPS', 'NUMBER'];
export const TEXT_TYPES: ConsultationQuestionType[] = ['SHORT_TEXT', 'LONG_TEXT'];

export const OPERATOR_LABELS: Record<ConsultationConditionOperator, string> = {
  EQUALS: 'is',
  NOT_EQUALS: 'is not',
  INCLUDES: 'includes',
  GREATER_THAN: 'is greater than',
  LESS_THAN: 'is less than',
  ANSWERED: 'has been answered',
};

export const AUDIENCE_LABELS: Record<ConsultationAudienceSource, string> = {
  PUBLIC: 'Open public',
  CRM: 'Partner CRM (S081)',
  STUDENT: 'Students (NLEMS S027, consent confirmed)',
  ALUMNI: 'Alumni (S034)',
  EMPLOYER: 'Employers (S081)',
  MIXED: 'Mixed audience',
};

export const TRIGGER_LABELS: Record<ConsultationTriggerType, string> = {
  POST_EVENT: 'Post-event feedback (S078)',
  REGISTRATION_COMPLETED: 'Registration completed',
  CALENDAR: 'Institutional calendar',
};

export const TRIGGER_SOURCE_HINTS: Record<ConsultationTriggerType, string> = {
  POST_EVENT: 'S078 event ID, e.g. S078-EVT-2026-014',
  REGISTRATION_COMPLETED: 'Registration programme, e.g. Bar Course 2026/27 enrolment',
  CALENDAR: 'Calendar label, e.g. End of Semester 1',
};

export const STATUS_LABELS: Record<ConsultationStatus, string> = {
  DRAFT: 'Draft',
  REVIEW: 'In review',
  SCHEDULED: 'Scheduled',
  OPEN: 'Open',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

export const CONSULTATION_STATUSES: ConsultationStatus[] = [
  'DRAFT',
  'REVIEW',
  'SCHEDULED',
  'OPEN',
  'CLOSED',
  'ARCHIVED',
];

export const CATEGORIES = [
  'Legal education',
  'Professional development',
  'Public engagement',
  'Accreditation',
  'Regulatory',
  'Event feedback',
  'Student experience',
];

/** Statuses where the question set may still change. */
export const EDITABLE_STATUSES: ConsultationStatus[] = ['DRAFT', 'REVIEW'];

/** Statuses the public site lists. */
export const PUBLIC_STATUSES: ConsultationStatus[] = ['SCHEDULED', 'OPEN', 'CLOSED'];
