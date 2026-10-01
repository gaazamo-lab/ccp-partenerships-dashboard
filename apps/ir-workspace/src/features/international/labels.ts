import type {
  IrClassification,
  IrCorrespondenceStatus,
  IrDirection,
  IrEngagementStatus,
  IrEngagementType,
  IrGiftFlagStatus,
  IrHandoffStatus,
  IrLanguage,
  IrSupportSystem,
} from '@partner-crm/types';

import type { DeadlineState, EngagementStage, EngagementTiming } from './domain';

type Option<T extends string> = { value: T; label: string };

function options<T extends string>(labels: Record<T, string>): Option<T>[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export const ENGAGEMENT_TYPE_LABEL: Record<IrEngagementType, string> = {
  VIP_VISIT: 'VIP visit',
  COURTESY_CALL: 'Courtesy call',
  DELEGATION: 'Delegation',
  CONFERENCE: 'Conference',
  BILATERAL_MEETING: 'Bilateral meeting',
};

export const DIRECTION_LABEL: Record<IrDirection, string> = {
  INBOUND: 'Inbound',
  OUTBOUND: 'Outbound',
};

export const CLASSIFICATION_LABEL: Record<IrClassification, string> = {
  PUBLIC: 'Public',
  INTERNAL: 'Internal',
  CONFIDENTIAL: 'Confidential',
};

export const LANGUAGE_LABEL: Record<IrLanguage, string> = {
  EN: 'English',
  FR: 'French',
  AR: 'Arabic',
};

export const ENGAGEMENT_STATUS_LABEL: Record<IrEngagementStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
};

export const CORRESPONDENCE_STATUS_LABEL: Record<IrCorrespondenceStatus, string> = {
  RECEIVED: 'Received',
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  RETURNED: 'Returned',
  APPROVED: 'Approved',
  DISPATCHED: 'Dispatched',
  AWAITING_RESPONSE: 'Awaiting response',
  RESPONDED: 'Responded',
  CLOSED: 'Closed',
};

export const SUPPORT_SYSTEM_LABEL: Record<IrSupportSystem, string> = {
  S084: 'S084 Travel & visa',
  S078: 'S078 Events',
  S086: 'S086 Translation',
  S074: 'S074 Official communications',
};

export const HANDOFF_STATUS_LABEL: Record<IrHandoffStatus, string> = {
  REQUESTED: 'Requested',
  ACKNOWLEDGED: 'Acknowledged',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export const FLAG_STATUS_LABEL: Record<IrGiftFlagStatus, string> = {
  NOT_REQUIRED: 'Not required',
  PENDING: 'Pending',
  ACKNOWLEDGED: 'Acknowledged',
  FAILED: 'Failed',
};

export const STAGE_LABEL: Record<EngagementStage, string> = {
  PLANNING: 'Planning',
  AWAITING_APPROVAL: 'Awaiting approval',
  READY: 'Approved or scheduled',
  UNDERWAY: 'Underway',
  WRAP_UP: 'Wrap-up',
  FINISHED: 'Closed or cancelled',
};

export const TIMING_LABEL: Record<EngagementTiming, string> = {
  NEXT_30_DAYS: 'Next 30 days',
  LATER: 'Later',
  UNDERWAY: 'Underway now',
  PAST: 'Past',
  UNSCHEDULED: 'No dates yet',
};

export const DEADLINE_LABEL: Record<DeadlineState, string> = {
  OVERDUE: 'Overdue',
  DUE_SOON: 'Due within 7 days',
  ON_TRACK: 'On track',
  NONE: 'No response owed',
};

export const ENGAGEMENT_TYPE_OPTIONS = options(ENGAGEMENT_TYPE_LABEL);
export const DIRECTION_OPTIONS = options(DIRECTION_LABEL);
export const CLASSIFICATION_OPTIONS = options(CLASSIFICATION_LABEL);
export const LANGUAGE_OPTIONS = options(LANGUAGE_LABEL);
export const ENGAGEMENT_STATUS_OPTIONS = options(ENGAGEMENT_STATUS_LABEL);
export const CORRESPONDENCE_STATUS_OPTIONS = options(CORRESPONDENCE_STATUS_LABEL);
export const SUPPORT_SYSTEM_OPTIONS = options(SUPPORT_SYSTEM_LABEL);
export const FLAG_STATUS_OPTIONS = options(FLAG_STATUS_LABEL);
export const STAGE_OPTIONS = options(STAGE_LABEL);
export const TIMING_OPTIONS = options(TIMING_LABEL);
export const DEADLINE_OPTIONS = options(DEADLINE_LABEL);

export const TIME_ZONE_OPTIONS = [
  'Africa/Accra',
  'Africa/Lagos',
  'Africa/Abidjan',
  'Africa/Dakar',
  'Africa/Nairobi',
  'Africa/Addis_Ababa',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Europe/London',
  'Europe/Paris',
  'Europe/Brussels',
  'America/New_York',
  'Asia/Tokyo',
  'Asia/Riyadh',
].map((zone) => ({ value: zone, label: zone.replace('_', ' ') }));

/** The CLET sender line per letter language. */
export const CLET_SENDER: Record<IrLanguage, string> = {
  EN: 'Council for Legal Education and Training',
  FR: 'Conseil pour l’Éducation et la Formation Juridiques',
  AR: 'مجلس التعليم والتدريب القانوني',
};
