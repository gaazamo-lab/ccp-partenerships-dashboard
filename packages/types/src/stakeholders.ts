/**
 * S081 Stakeholder / Partner CRM contracts. S081 is the authoritative source
 * for partner organisations and contacts; other modules reference them by ID.
 */

export type StakeholderCategory =
  | 'Donor'
  | 'Embassy'
  | 'Government'
  | 'International body'
  | 'Judiciary'
  | 'Media'
  | 'Peer institution'
  | 'Professional body'
  | 'University';

/** Categories whose new contacts must clear S203 screening before engagement. */
export const REGULATED_CATEGORIES: readonly StakeholderCategory[] = [
  'Donor',
  'Embassy',
  'International body',
];

export type RelationshipStatus = 'Active' | 'Inactive' | 'MOU linked' | 'Screening pending';
export type HealthLevel = 'At risk' | 'Healthy' | 'Strong';
export type PipelineStage = 'Prospect' | 'Engaged' | 'Negotiation' | 'MOU' | 'Dormant';
export type ScreeningStatus = 'Cleared' | 'Not required' | 'Pending' | 'Review required' | 'Rejected';
export type ConsentStatus = 'Consented' | 'Expired' | 'Not recorded' | 'Withdrawn';
export type ConsentChannel = 'Email' | 'Form' | 'In person' | 'Letter' | 'Phone';

/** The S203 decision captured when a screening outcome is recorded. */
export interface ScreeningRecord {
  outcome: Exclude<ScreeningStatus, 'Not required' | 'Pending'>;
  reviewer: string;
  reviewedAt: string;
  notes: string;
  /** S203 case reference, when the screening service issued one. */
  caseRef: string | null;
}

export interface StakeholderContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  consent: ConsentStatus;
  consentDate: string | null;
  consentChannel: ConsentChannel | null;
  screening: ScreeningStatus;
  screeningRecord: ScreeningRecord | null;
  active: boolean;
}

export type EngagementType =
  | 'Call'
  | 'Campaign'
  | 'Correspondence'
  | 'Email'
  | 'Event'
  | 'Meeting'
  | 'MOU';

export interface Engagement {
  id: string;
  type: EngagementType;
  title: string;
  summary: string;
  date: string;
  source: string;
}

export interface Stakeholder {
  id: string;
  name: string;
  shortName: string;
  category: StakeholderCategory;
  owner: string;
  status: RelationshipStatus;
  health: HealthLevel;
  pipelineStage: PipelineStage;
  lastEngagement: string;
  location: string;
  website: string;
  description: string;
  contacts: StakeholderContact[];
  engagements: Engagement[];
}

/** Rules a segment resolves against the live register. Empty lists mean "any". */
export interface SegmentCriteria {
  categories: StakeholderCategory[];
  statuses: RelationshipStatus[];
  owners: string[];
  /** Only count contacts with recorded S188 consent. */
  consentedOnly: boolean;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  members: number;
  consented: number;
  usedBy: string[];
  updated: string;
  categories?: StakeholderCategory[];
  criteria?: SegmentCriteria;
}

export interface StakeholderInput {
  name: string;
  shortName: string;
  category: StakeholderCategory;
  owner: string;
  location: string;
  website: string;
  description: string;
  health?: HealthLevel;
  pipelineStage?: PipelineStage;
}

export type ContactInput = Pick<StakeholderContact, 'name' | 'role' | 'email' | 'phone' | 'consent'> & {
  regulated: boolean;
  consentDate?: string | null;
  consentChannel?: ConsentChannel | null;
};

export interface ScreeningDecisionInput {
  outcome: ScreeningRecord['outcome'];
  notes: string;
  caseRef: string | null;
}

export interface ConsentInput {
  consent: ConsentStatus;
  consentDate: string | null;
  consentChannel: ConsentChannel | null;
}

export type EngagementInput = Pick<Engagement, 'type' | 'title' | 'summary'> & {
  /** ISO date; defaults to today when omitted. */
  date?: string;
};

export interface SegmentInput {
  name: string;
  description: string;
  categories: StakeholderCategory[];
  usedBy: string[];
  criteria?: SegmentCriteria;
}

export interface StakeholderImportResult {
  created: number;
  duplicates: number;
  skipped: Array<{ row: number; name: string; reason: string }>;
}

export interface StakeholderListQuery {
  search?: string;
  category?: StakeholderCategory;
  status?: RelationshipStatus;
  owner?: string;
}
