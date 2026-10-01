import type {
  ConsentChannel,
  ConsentStatus,
  EngagementType,
  HealthLevel,
  PipelineStage,
  RelationshipStatus,
  ScreeningStatus,
  StakeholderCategory,
} from '@/features/stakeholders/types';

/**
 * The one list of S081 stakeholder categories. Forms, filters, imports and
 * reports all read it, so a new category (like "Peer institution") only has to
 * be added here.
 */
export const STAKEHOLDER_CATEGORIES: StakeholderCategory[] = [
  'Judiciary',
  'Professional body',
  'University',
  'Government',
  'Donor',
  'Embassy',
  'International body',
  'Media',
  'Peer institution',
];

export const RELATIONSHIP_STATUSES: RelationshipStatus[] = [
  'Active',
  'Screening pending',
  'MOU linked',
  'Inactive',
];

export const HEALTH_LEVELS: HealthLevel[] = ['Strong', 'Healthy', 'At risk'];

/** In funnel order, from first contact to a signed relationship, then dormant. */
export const PIPELINE_STAGES: PipelineStage[] = [
  'Prospect',
  'Engaged',
  'Negotiation',
  'MOU',
  'Dormant',
];

export const ENGAGEMENT_TYPES: EngagementType[] = [
  'Meeting',
  'Call',
  'Email',
  'Correspondence',
  'Event',
  'Campaign',
  'MOU',
];

export const CONSENT_STATUSES: ConsentStatus[] = [
  'Consented',
  'Withdrawn',
  'Expired',
  'Not recorded',
];

export const CONSENT_CHANNELS: ConsentChannel[] = ['Form', 'Email', 'In person', 'Letter', 'Phone'];

/** Screening results that keep a contact (and its organisation) from being engaged. */
export const BLOCKING_SCREENING: ScreeningStatus[] = ['Pending', 'Review required', 'Rejected'];

/** Screening results still waiting on an S203 decision. */
export const OPEN_SCREENING: ScreeningStatus[] = ['Pending', 'Review required'];

/** Source label for activity logged directly in S081. */
export const CRM_SOURCE = 'Partner CRM';
