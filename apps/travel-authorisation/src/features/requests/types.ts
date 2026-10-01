/**
 * S084 domain types.
 *
 * The contract lives in `@partner-crm/types` so the API client, the backend
 * schemas and these screens cannot drift apart. This file re-exports it, which
 * keeps the app's own imports short and gives one place to add a purely
 * presentational type if one is ever needed.
 */

export type {
  AmendmentInput,
  ApprovalDecisionInput,
  ApprovalStatus,
  ApprovalStep,
  CancelRequestInput,
  ClosureInput,
  ClosureRecord,
  EstimateInput,
  EvidenceDecisionInput,
  EvidenceItem,
  EvidenceStatus,
  IntegrationHandoff,
  IntegrationStatus,
  IntegrationUpdateInput,
  IssueDocumentInput,
  IssuedDocument,
  NewTravelRequest,
  NotificationRecord,
  RequestStatus,
  TravelDirection,
  TravelEstimate,
  TravelHistoryEntry,
  TravelPolicy,
  TravelPolicyInput,
  TravelRequest,
  TravelRequestListQuery,
} from '@partner-crm/types';
