/**
 * S092 Influencer / KOL & Thought-Leader Tracker.
 *
 * KOL profiles are extension records: the relationship anchor stays in S081
 * (`stakeholderId`) or the Alumni CRM S034 (`alumniRef`). Nothing here
 * duplicates stakeholder or contact master data.
 */

export type KolCategory =
  | 'SENIOR_ADVOCATE'
  | 'JUDGE'
  | 'RETIRED_JUDGE'
  | 'ACADEMIC'
  | 'POLICY_INFLUENCER'
  | 'PRACTITIONER'
  | 'MEDIA_PERSONALITY'
  | 'ALUMNUS';

export type KolStatus = 'PROSPECT' | 'ACTIVE' | 'DORMANT' | 'ARCHIVED';
export type KolInfluenceLevel = 'EMERGING' | 'ESTABLISHED' | 'NATIONAL' | 'INTERNATIONAL';
export type KolAvailability = 'AVAILABLE' | 'LIMITED' | 'UNAVAILABLE';
export type KolRiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface KolProfile {
  id: string;
  fullName: string;
  honorific: string;
  category: KolCategory;
  organisation: string;
  position: string;
  /** S081 stakeholder organisation the KOL is linked to, when one exists. */
  stakeholderId: string | null;
  /** S034 alumni record reference, when the KOL is a notable alumnus. */
  alumniRef: string | null;
  email: string;
  phone: string;
  expertise: string[];
  influenceAreas: string[];
  influenceLevel: KolInfluenceLevel;
  availability: KolAvailability;
  relationshipOwner: string;
  status: KolStatus;
  riskLevel: KolRiskLevel;
  riskNotes: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
}

export type KolEngagementType =
  | 'OP_ED'
  | 'PANEL'
  | 'KEYNOTE'
  | 'WEBINAR'
  | 'PODCAST'
  | 'CONSULTATION'
  | 'CAMPAIGN'
  | 'MEDIA_INTERVIEW';

export type KolEngagementStage =
  | 'PLANNED'
  | 'INVITED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED';

export interface KolParticipation {
  attended: boolean;
  outputs: string;
  feedback: string;
  /** 1 (low) to 5 (high) contribution rating recorded by the owner. */
  contributionScore: 1 | 2 | 3 | 4 | 5;
  recordedAt: string;
  recordedBy: string;
}

export interface KolEngagement {
  id: string;
  kolId: string;
  type: KolEngagementType;
  title: string;
  stage: KolEngagementStage;
  scheduledFor: string | null;
  owner: string;
  /** S078 event, S087 webinar or S093 episode reference, when one exists. */
  externalRef: string | null;
  notes: string;
  participation: KolParticipation | null;
  createdAt: string;
  updatedAt: string;
}

export type KolContentType = 'OP_ED' | 'ARTICLE' | 'BLOG_POST' | 'VIDEO' | 'PODCAST_EPISODE';

export type KolContentStage =
  | 'COMMISSIONED'
  | 'DRAFT_SUBMITTED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'WITHDRAWN';

export interface KolContent {
  id: string;
  kolId: string;
  title: string;
  contentType: KolContentType;
  stage: KolContentStage;
  dueDate: string | null;
  /** S003 reference for the submitted draft. */
  draftRef: string | null;
  reviewer: string | null;
  reviewNotes: string;
  /** S076 CMS reference once published. */
  cmsRef: string | null;
  publishedUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type KolMentionSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface KolMediaMention {
  id: string;
  kolId: string;
  contentId: string | null;
  outlet: string;
  headline: string;
  url: string;
  publishedAt: string;
  reach: number;
  sentiment: KolMentionSentiment;
  /** `S085` when attributed by Press Monitoring; `MANUAL` when logged by staff. */
  source: 'S085' | 'MANUAL';
}

export interface KolInput {
  fullName: string;
  honorific: string;
  category: KolCategory;
  organisation: string;
  position: string;
  stakeholderId: string | null;
  alumniRef: string | null;
  email: string;
  phone: string;
  expertise: string[];
  influenceAreas: string[];
  influenceLevel: KolInfluenceLevel;
  availability: KolAvailability;
  relationshipOwner: string;
  status: KolStatus;
  riskLevel: KolRiskLevel;
  riskNotes: string;
  bio: string;
}

export interface KolEngagementInput {
  type: KolEngagementType;
  title: string;
  scheduledFor: string | null;
  owner: string;
  externalRef: string | null;
  notes: string;
}

export interface KolEngagementStageInput {
  stage: KolEngagementStage;
  note: string;
}

export type KolParticipationInput = Omit<KolParticipation, 'recordedAt' | 'recordedBy'>;

export interface KolContentInput {
  title: string;
  contentType: KolContentType;
  dueDate: string | null;
}

export interface KolContentStageInput {
  stage: KolContentStage;
  draftRef?: string | null;
  reviewNotes?: string;
  cmsRef?: string | null;
  publishedUrl?: string | null;
}

export type KolMediaMentionInput = Omit<KolMediaMention, 'id' | 'kolId' | 'source'>;

export interface KolListQuery {
  search?: string;
  category?: KolCategory;
  status?: KolStatus;
  stakeholderId?: string;
}
