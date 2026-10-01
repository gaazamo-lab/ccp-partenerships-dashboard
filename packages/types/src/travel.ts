/**
 * S084 Visa & Travel Authorisation contracts.
 *
 * CLET does not own the downstream outcomes: a visa is decided by the mission,
 * funds are disbursed by S144, and the signed files live in S003. Those appear
 * here only as references and handoff statuses.
 */

export type TravelDirection = 'Inbound' | 'Outbound';

export type RequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'Screening'
  | 'Pending approvals'
  | 'Approved'
  | 'Support issued'
  | 'Travel authorised'
  | 'Completed'
  | 'Closed'
  | 'Returned'
  | 'Rejected'
  | 'Cancelled';

export type ApprovalStatus =
  | 'Pending'
  | 'Approved'
  | 'Returned'
  | 'Rejected'
  | 'Superseded'
  | 'Not required';

export type IntegrationStatus = 'Complete' | 'Pending' | 'Failed' | 'Not started';

export type EvidenceStatus = 'Received' | 'Missing' | 'Exception';

export interface EvidenceItem {
  id?: string;
  label: string;
  required?: boolean;
  /** Personal or financial; the UI masks the reference until it is opened. */
  sensitive?: boolean;
  status: EvidenceStatus;
  reference?: string;
  exceptionReason?: string;
  reviewedBy?: string;
}

export interface ApprovalStep {
  id: string;
  label: string;
  assignee: string;
  status: ApprovalStatus;
  decidedAt?: string;
  comment?: string;
  /** The record version the decision was taken against; an amendment invalidates it. */
  recordVersion?: number;
}

export interface IntegrationHandoff {
  system: string;
  label: string;
  status: IntegrationStatus;
  reference?: string;
  correlationId?: string;
  note?: string;
  updatedAt?: string;
}

export interface IssuedDocument {
  id: string;
  type: 'Support letter' | 'Travel authorisation';
  reference: string;
  templateVersion: string;
  signatory: string;
  issuedAt: string;
  status: 'Current' | 'Superseded';
}

export interface NotificationRecord {
  id: string;
  subject: string;
  recipient: string;
  status: 'Delivered' | 'Pending' | 'Failed';
  correlationId: string;
  sentAt: string;
}

export interface ClosureRecord {
  outcome: string;
  actualStartDate?: string;
  actualEndDate?: string;
  claimReference?: string;
  unresolvedActions?: string;
  closedAt?: string;
}

export interface TravelEstimate {
  currency: string;
  perDiem: number;
  transport: number;
  accommodation: number;
  other?: number;
  eligibleDays?: number;
  dailyRate?: number;
  rateVersion?: string;
}

export interface TravelHistoryEntry {
  title: string;
  detail: string;
  at: string;
}

export interface TravelRequest {
  /** Server identifier. Routes and keys use this; screens show `reference`. */
  id: string;
  /** Human reference, e.g. `S084-2026-0043`. */
  reference: string;
  direction: TravelDirection;
  category: string;
  traveller: string;
  nationality?: string;
  purpose: string;
  destination: string;
  host?: string;
  startDate: string;
  endDate: string;
  owner: string;
  requester?: string;
  studentNumber?: string;
  programme?: string;
  level?: string;
  sponsor?: string;
  emergencyContact?: string;
  returnDeclaration?: boolean;
  status: RequestStatus;
  nextAction: string;
  submittedAt?: string;
  updatedAt: string;
  sourceReference?: string;
  policyVersion: string;
  recordVersion: number;
  estimate?: TravelEstimate;
  evidence: EvidenceItem[];
  approvals: ApprovalStep[];
  integrations: IntegrationHandoff[];
  issuedDocuments?: IssuedDocument[];
  notifications?: NotificationRecord[];
  closure?: ClosureRecord;
  cancellationReason?: string;
  lastChangeReason?: string;
  history: TravelHistoryEntry[];
}

export interface NewTravelRequest {
  direction: TravelDirection;
  category: string;
  traveller: string;
  nationality?: string;
  purpose: string;
  destination: string;
  host?: string;
  startDate: string;
  endDate: string;
  sourceReference?: string;
  studentNumber?: string;
  programme?: string;
  level?: string;
  sponsor?: string;
  emergencyContact?: string;
  returnDeclaration?: boolean;
}

export interface EvidenceDecisionInput {
  status: EvidenceStatus;
  /** The S003 reference when received, or the reason when waived. */
  detail?: string;
}

export interface ApprovalDecisionInput {
  decision: 'Approved' | 'Returned' | 'Rejected';
  comment: string;
}

export interface EstimateInput {
  currency: string;
  eligibleDays: number;
  dailyRate: number;
  transport: number;
  accommodation: number;
  other: number;
  rateVersion: string;
}

export interface IssueDocumentInput {
  signatory: string;
  templateVersion: string;
}

export interface AmendmentInput {
  destination: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface CancelRequestInput {
  reason: string;
}

export interface IntegrationUpdateInput {
  system: string;
  status: IntegrationStatus;
  reference?: string;
  note?: string;
}

export interface ClosureInput {
  outcome: string;
  actualStartDate?: string;
  actualEndDate?: string;
  claimReference?: string;
  unresolvedActions?: string;
}

export interface TravelPolicy {
  id: string;
  policyVersion: string;
  rateVersion: string;
  currency: string;
  /** Daily per-diem by band, e.g. `{ Regional: 1200 }`. */
  dailyRates: Record<string, number>;
  supportTemplate: string;
  authorisationTemplate: string;
  escalationDays: number;
  updatedBy?: string;
  updatedAt: string;
}

export type TravelPolicyInput = Omit<TravelPolicy, 'id' | 'updatedBy' | 'updatedAt'>;

export interface TravelRequestListQuery {
  status?: RequestStatus;
  direction?: TravelDirection;
  search?: string;
}
