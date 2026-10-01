/**
 * S083 International Relations & Protocols Workspace.
 *
 * S083 owns engagements, protocol, correspondence, gifts and follow-up. Partner
 * and contact identities stay in S081, travel in S084, events in S078,
 * translation in S086 and gift disclosure in S011 — referenced here by ID.
 */

export type IrDirection = 'INBOUND' | 'OUTBOUND';
export type IrClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
export type IrLanguage = 'EN' | 'FR' | 'AR';

export type IrEngagementType =
  | 'VIP_VISIT'
  | 'COURTESY_CALL'
  | 'DELEGATION'
  | 'CONFERENCE'
  | 'BILATERAL_MEETING';

/** S083 §4: Draft → Submitted → Under review → Approved → Scheduled → In progress → Completed → Closed. */
export type IrEngagementStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED'
  | 'RETURNED'
  | 'CANCELLED';

export interface IrDelegationMember {
  id: string;
  name: string;
  /** S081 contact ID when the member already exists in the CRM. */
  contactRef: string | null;
  role: string;
  organisation: string;
  nationality: string;
  /** S084 travel or visa request ID. */
  travelRequestRef: string | null;
}

export type IrTaskStatus = 'OPEN' | 'DONE' | 'EXCEPTION';

export interface IrProtocolTask {
  id: string;
  title: string;
  mandatory: boolean;
  assignee: string;
  dueDate: string | null;
  status: IrTaskStatus;
  evidenceRef: string | null;
  exceptionReason: string | null;
}

export interface IrFollowUp {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  mandatory: boolean;
  status: IrTaskStatus;
  exceptionReason: string | null;
}

export type IrSupportSystem = 'S084' | 'S078' | 'S086' | 'S074';
export type IrHandoffStatus = 'REQUESTED' | 'ACKNOWLEDGED' | 'COMPLETED' | 'FAILED';

export interface IrSupportRequest {
  id: string;
  system: IrSupportSystem;
  description: string;
  externalRef: string | null;
  status: IrHandoffStatus;
  requestedAt: string;
  updatedAt: string;
}

export interface IrApproval {
  id: string;
  decision: 'SUBMITTED' | 'APPROVED' | 'RETURNED' | 'REOPENED' | 'CANCELLED';
  comment: string;
  actor: string;
  version: number;
  occurredAt: string;
}

export interface IrEngagement {
  id: string;
  reference: string;
  type: IrEngagementType;
  direction: IrDirection;
  title: string;
  purpose: string;
  /** S081 stakeholder ID of the partner organisation. */
  partnerStakeholderId: string | null;
  partnerName: string;
  owner: string;
  host: string;
  venue: string;
  startAt: string;
  endAt: string;
  timeZone: string;
  classification: IrClassification;
  status: IrEngagementStatus;
  checklistVersion: number;
  agendaRef: string | null;
  briefingPackRef: string | null;
  minutesRef: string | null;
  finalReportRef: string | null;
  delegation: IrDelegationMember[];
  protocolTasks: IrProtocolTask[];
  followUps: IrFollowUp[];
  supportRequests: IrSupportRequest[];
  approvals: IrApproval[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface IrEngagementInput {
  type: IrEngagementType;
  direction: IrDirection;
  title: string;
  purpose: string;
  partnerStakeholderId: string | null;
  partnerName: string;
  owner: string;
  host: string;
  venue: string;
  startAt: string;
  endAt: string;
  timeZone: string;
  classification: IrClassification;
  agendaRef: string | null;
  briefingPackRef: string | null;
  minutesRef: string | null;
}

export interface IrTransitionInput {
  status: IrEngagementStatus;
  comment: string;
}

export type IrDelegationInput = Omit<IrDelegationMember, 'id'>;
export type IrProtocolTaskInput = Omit<IrProtocolTask, 'id' | 'status' | 'exceptionReason'>;
export type IrFollowUpInput = Omit<IrFollowUp, 'id' | 'status' | 'exceptionReason'>;

export interface IrTaskUpdateInput {
  status: IrTaskStatus;
  evidenceRef?: string | null;
  exceptionReason?: string | null;
}

export interface IrSupportRequestInput {
  system: IrSupportSystem;
  description: string;
}

export interface IrSupportStatusInput {
  status: IrHandoffStatus;
  externalRef: string | null;
}

export type IrCorrespondenceStatus =
  | 'RECEIVED'
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'RETURNED'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'AWAITING_RESPONSE'
  | 'RESPONDED'
  | 'CLOSED';

export interface IrCorrespondence {
  id: string;
  reference: string;
  direction: IrDirection;
  engagementId: string | null;
  sender: string;
  recipient: string;
  subject: string;
  classification: IrClassification;
  language: IrLanguage;
  owner: string;
  receivedAt: string | null;
  sentAt: string | null;
  responseDeadline: string | null;
  status: IrCorrespondenceStatus;
  body: string;
  templateId: string | null;
  templateVersion: number | null;
  /** Reviewed manual translation reference while S086 is unavailable. */
  translationRef: string | null;
  /** S003 record ID for the registered or approved letter. */
  documentRef: string | null;
  /** S074 message correlation ID once dispatched. */
  dispatchRef: string | null;
  approvedVersion: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface IrCorrespondenceInput {
  direction: IrDirection;
  engagementId: string | null;
  sender: string;
  recipient: string;
  subject: string;
  classification: IrClassification;
  language: IrLanguage;
  owner: string;
  receivedAt: string | null;
  responseDeadline: string | null;
  body: string;
  templateId: string | null;
  translationRef: string | null;
  documentRef: string | null;
}

export interface IrCorrespondenceTransitionInput {
  status: IrCorrespondenceStatus;
  comment: string;
}

export interface IrLetterTemplate {
  id: string;
  name: string;
  language: IrLanguage;
  version: number;
  subject: string;
  body: string;
  active: boolean;
  updatedAt: string;
}

export type IrLetterTemplateInput = Pick<IrLetterTemplate, 'name' | 'language' | 'subject' | 'body'>;

export type IrGiftDirection = 'GIVEN' | 'RECEIVED';
export type IrGiftFlagStatus = 'NOT_REQUIRED' | 'PENDING' | 'ACKNOWLEDGED' | 'FAILED';

export interface IrGift {
  id: string;
  direction: IrGiftDirection;
  engagementId: string | null;
  giver: string;
  recipient: string;
  description: string;
  giftDate: string;
  valueKnown: boolean;
  value: number | null;
  currency: string | null;
  /** S011 cross-flag state; only received gifts are flagged. */
  s011Status: IrGiftFlagStatus;
  s011Ref: string | null;
  flagAttempts: number;
  createdAt: string;
}

export type IrGiftInput = Pick<
  IrGift,
  | 'direction'
  | 'engagementId'
  | 'giver'
  | 'recipient'
  | 'description'
  | 'giftDate'
  | 'valueKnown'
  | 'value'
  | 'currency'
>;
