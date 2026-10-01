export type PartnershipStatus =
  | 'DRAFT'
  | 'LEGAL_REVIEW'
  | 'SIGNATURE_PENDING'
  | 'ACTIVE'
  | 'RENEWAL_DUE'
  | 'EXPIRED'
  | 'TERMINATED';

export type ObligationStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'WAIVED';

export interface PartnershipAgreement {
  id: string;
  stakeholderId: string;
  partyStakeholderIds: string[];
  reference: string;
  title: string;
  agreementType: 'MOU' | 'PARTNERSHIP_AGREEMENT' | 'COOPERATION_FRAMEWORK';
  status: PartnershipStatus;
  owner: string;
  effectiveDate: string | null;
  expiryDate: string | null;
  valueCommitment: string;
  deliverables: string[];
  legalContractRef: string | null;
  signedDocumentRef: string | null;
  renewalCount: number;
  termination: PartnershipTermination | null;
  createdAt: string;
  updatedAt: string;
}

export type PartnershipHistoryAction =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'RENEWED'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'OBLIGATION_UPDATED'
  | 'REVIEW_UPDATED'
  | 'RENEWAL_ALERT_UPDATED';

export interface PartnershipTermination {
  terminatedAt: string;
  reason: string;
  documentationRef: string;
  finalArchiveRef: string;
  approvedBy: string;
}

export interface PartnershipRenewal {
  id: string;
  agreementId: string;
  previousEffectiveDate: string | null;
  previousExpiryDate: string | null;
  previousLegalContractRef: string | null;
  previousSignedDocumentRef: string | null;
  effectiveDate: string;
  expiryDate: string;
  legalContractRef: string;
  signedDocumentRef: string;
  termsSummary: string;
  renewedBy: string;
  renewedAt: string;
}

export type RenewalAlertMilestone = 180 | 90 | 30;
export type RenewalAlertStatus =
  'SCHEDULED' | 'DUE' | 'SENT' | 'ACKNOWLEDGED' | 'FAILED' | 'CANCELLED';

export interface PartnershipRenewalAlert {
  id: string;
  agreementId: string;
  milestoneDays: RenewalAlertMilestone;
  scheduledFor: string;
  recipients: string[];
  status: RenewalAlertStatus;
  communicationRef: string | null;
  sentAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

export interface PartnershipHistoryEntry {
  id: string;
  agreementId: string;
  action: PartnershipHistoryAction;
  summary: string;
  actor: string;
  occurredAt: string;
}

export interface PartnershipObligation {
  id: string;
  agreementId: string;
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  status: ObligationStatus;
  evidenceReferences: string[];
  reminderLeadDays: number | null;
  escalationOwner: string | null;
  updatedAt: string;
}

export interface ObligationProgressNote {
  id: string;
  obligationId: string;
  note: string;
  status: ObligationStatus;
  actor: string;
  createdAt: string;
}

export interface PartnershipReview {
  id: string;
  agreementId: string;
  reviewDate: string;
  reviewer: string;
  outcome: 'EXCEEDS_EXPECTATIONS' | 'ON_TRACK' | 'NEEDS_ATTENTION' | 'NO_LONGER_STRATEGIC';
  summary: string;
  periodStart: string;
  periodEnd: string;
  outputs: string[];
  strategicScore: 1 | 2 | 3 | 4 | 5;
  issues: string[];
  recommendations: string[];
  renewalRecommendation: 'RENEW' | 'RENEW_WITH_CHANGES' | 'TERMINATE' | 'DEFER';
  nextReviewDate: string;
}

export type CreatePartnershipReviewInput = Omit<PartnershipReview, 'id'>;
export type UpdatePartnershipReviewInput = Omit<PartnershipReview, 'id' | 'agreementId'>;

export interface CreatePartnershipInput {
  stakeholderId: string;
  partyStakeholderIds: string[];
  title: string;
  agreementType: PartnershipAgreement['agreementType'];
  owner: string;
  effectiveDate: string | null;
  expiryDate: string | null;
  valueCommitment: string;
  deliverables: string[];
  legalContractRef: string | null;
}

export interface ImportPartnershipInput extends CreatePartnershipInput {
  reference: string;
  status: PartnershipStatus;
  signedDocumentRef: string | null;
}

export interface PartnershipImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface UpdatePartnershipInput extends CreatePartnershipInput {
  signedDocumentRef: string | null;
}

export interface PartnershipTransitionInput {
  status: PartnershipStatus;
  note: string;
}

export interface RenewPartnershipInput {
  effectiveDate: string;
  expiryDate: string;
  legalContractRef: string;
  signedDocumentRef: string;
  termsSummary: string;
}

export interface TerminatePartnershipInput {
  terminatedAt: string;
  reason: string;
  documentationRef: string;
  finalArchiveRef: string;
}

export interface CreateObligationInput {
  agreementId: string;
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  reminderLeadDays: number | null;
  escalationOwner: string | null;
}

export interface UpdateObligationInput {
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  status: ObligationStatus;
  evidenceReferences: string[];
  reminderLeadDays: number | null;
  escalationOwner: string | null;
}

export interface AddObligationProgressInput {
  obligationId: string;
  note: string;
  status: ObligationStatus;
}

export interface ConfigureRenewalAlertsInput {
  agreementId: string;
  recipients: string[];
}

export interface PartnershipListQuery {
  search?: string;
  stakeholderId?: string;
  status?: PartnershipStatus;
  owner?: string;
  page?: number;
  pageSize?: number;
}

export type PartnershipIntegrationState =
  | 'CONTRACT_READY'
  | 'REFERENCE_ONLY'
  | 'MOCKED'
  | 'PENDING';

export interface PartnershipIntegrationHealth {
  system: 'S003' | 'S074' | 'S136' | 'S203' | 'S204' | 'S217' | 'S225';
  name: string;
  state: PartnershipIntegrationState;
  lastCheckedAt: string | null;
  detail: string;
}
