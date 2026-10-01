/**
 * S088_consult Public-Survey / Consultation Platform contracts.
 *
 * Audiences are resolved from S081 segments (and S034/S027 with confirmed
 * consent); personal data is held apart from answers unless the respondent
 * explicitly consents to the link (PRD AC-15).
 */

export type ConsultationStatus =
  | 'DRAFT'
  | 'REVIEW'
  | 'SCHEDULED'
  | 'OPEN'
  | 'CLOSED'
  | 'ARCHIVED';

export type ConsultationQuestionType =
  | 'SECTION'
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'SINGLE_CHOICE'
  | 'MULTI_CHOICE'
  | 'DROPDOWN'
  | 'RATING'
  | 'NPS'
  | 'NUMBER'
  | 'DATE';

export type ConsultationConditionOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'INCLUDES'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'ANSWERED';

/** Skip logic: a question is shown only when every condition holds. */
export interface ConsultationCondition {
  questionId: string;
  operator: ConsultationConditionOperator;
  value?: string | number;
}

export interface ConsultationQuestionTranslation {
  prompt: string;
  description?: string;
  options?: string[];
}

export interface ConsultationQuestion {
  id: string;
  type: ConsultationQuestionType;
  prompt: string;
  description?: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  /** Labels for the low and high ends of RATING and NPS scales. */
  minLabel?: string;
  maxLabel?: string;
  visibleIf?: ConsultationCondition[];
  /** Keyed by language code other than the consultation's first language. */
  translations?: Record<string, ConsultationQuestionTranslation>;
}

export type ConsultationAudienceSource =
  | 'PUBLIC'
  | 'CRM'
  | 'STUDENT'
  | 'ALUMNI'
  | 'EMPLOYER'
  | 'MIXED';

export type ConsultationTriggerType = 'POST_EVENT' | 'REGISTRATION_COMPLETED' | 'CALENDAR';

/** Automated deployment rule (post-event feedback, registrations, calendar). */
export interface ConsultationTrigger {
  id: string;
  type: ConsultationTriggerType;
  /** S078 event ID, registration programme or calendar label. */
  sourceRef: string;
  delayDays: number;
  active: boolean;
}

export interface ConsultationTheme {
  id: string;
  label: string;
  description: string;
}

export interface Consultation {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  status: ConsultationStatus;
  languages: string[];
  opensAt: string;
  closesAt: string;
  estimatedMinutes: number;
  anonymousAllowed: boolean;
  collectIdentity: boolean;
  audienceSource: ConsultationAudienceSource;
  /** S081 segment IDs the invitation list is resolved from. */
  audienceSegmentIds: string[];
  invitedCount: number | null;
  responseCount: number;
  questions: ConsultationQuestion[];
  triggers: ConsultationTrigger[];
  themes: ConsultationTheme[];
  /** Published "what we heard" summary once the consultation closes (§88). */
  outcomeSummary: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ConsultationAnswer = string | string[] | number;

export interface ConsultationRespondent {
  name: string;
  email: string;
  stakeholderGroup: string;
}

export interface ConsultationResponse {
  id: string;
  consultationId: string;
  submittedAt: string;
  language: string;
  answers: Record<string, ConsultationAnswer>;
  consentToIdentityLink: boolean;
  respondent: ConsultationRespondent | null;
  /** Qualitative coding: question ID → theme IDs applied to that answer. */
  themes: Record<string, string[]>;
}

export interface SubmitConsultationResponseInput {
  language: string;
  answers: Record<string, ConsultationAnswer>;
  consentToIdentityLink: boolean;
  respondent?: ConsultationRespondent;
}

export interface CreateConsultationInput {
  title: string;
  slug: string;
  summary: string;
  description: string;
  category: string;
  languages: string[];
  opensAt: string;
  closesAt: string;
  estimatedMinutes: number;
  anonymousAllowed: boolean;
  collectIdentity: boolean;
  audienceSource: ConsultationAudienceSource;
  audienceSegmentIds: string[];
  questions: ConsultationQuestion[];
  triggers: ConsultationTrigger[];
}

export type UpdateConsultationInput = CreateConsultationInput;

export interface ConsultationStatusInput {
  status: ConsultationStatus;
  comment?: string;
  /** Required when reopening or extending a consultation past its close date. */
  closesAt?: string;
}

export interface ConsultationOutcomeInput {
  outcomeSummary: string;
}

export type ConsultationInvitationKind = 'INVITATION' | 'REMINDER';

export interface ConsultationInvitation {
  id: string;
  consultationId: string;
  kind: ConsultationInvitationKind;
  segmentIds: string[];
  /** Consent-verified recipients at the moment of sending. */
  recipientCount: number;
  excludedCount: number;
  /** S074 correlation ID of the queued message batch. */
  communicationRef: string | null;
  sentBy: string;
  sentAt: string;
}

export interface ConsultationInvitationInput {
  kind: ConsultationInvitationKind;
  segmentIds: string[];
}

export type ConsultationThemeInput = Pick<ConsultationTheme, 'label' | 'description'>;

export interface ResponseThemesInput {
  questionId: string;
  themeIds: string[];
}

export interface ConsultationListQuery {
  status?: ConsultationStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}
