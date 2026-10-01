import type {
  AmendmentInput,
  ApiEnvelope,
  ApprovalDecisionInput,
  CancelRequestInput,
  ClosureInput,
  EstimateInput,
  EvidenceDecisionInput,
  IntegrationUpdateInput,
  IssueDocumentInput,
  NewTravelRequest,
  TravelPolicy,
  TravelPolicyInput,
  TravelRequest,
  TravelRequestListQuery,
} from '@partner-crm/types';

import type { ApiClient } from './index';
import { queryString } from './query';

/**
 * S084 Visa & Travel Authorisation transport boundary.
 *
 * Every mutation returns the whole updated request. The workspace shows the
 * evidence checklist, approval chain, handoffs and history side by side, and a
 * single decision can move several of them at once — returning the aggregate
 * saves the screens from reconciling partial state.
 */
export interface TravelRepository {
  list(query?: TravelRequestListQuery): Promise<ApiEnvelope<TravelRequest[]>>;
  get(id: string): Promise<ApiEnvelope<TravelRequest>>;
  /** `id` is a client-generated UUID, so an optimistic UI keeps the id it navigated to. */
  create(input: NewTravelRequest, id?: string): Promise<ApiEnvelope<TravelRequest>>;
  update(id: string, input: NewTravelRequest): Promise<ApiEnvelope<TravelRequest>>;
  /** `index` is the position in the request's own evidence list. */
  setEvidence(
    id: string,
    index: number,
    input: EvidenceDecisionInput,
  ): Promise<ApiEnvelope<TravelRequest>>;
  /** Moves the request one step forward; refused if a gate is unmet. */
  advance(id: string): Promise<ApiEnvelope<TravelRequest>>;
  decideApproval(
    id: string,
    approvalId: string,
    input: ApprovalDecisionInput,
  ): Promise<ApiEnvelope<TravelRequest>>;
  saveEstimate(id: string, input: EstimateInput): Promise<ApiEnvelope<TravelRequest>>;
  issueDocument(id: string, input: IssueDocumentInput): Promise<ApiEnvelope<TravelRequest>>;
  amend(id: string, input: AmendmentInput): Promise<ApiEnvelope<TravelRequest>>;
  cancel(id: string, input: CancelRequestInput): Promise<ApiEnvelope<TravelRequest>>;
  close(id: string, input: ClosureInput): Promise<ApiEnvelope<TravelRequest>>;
  updateIntegration(
    id: string,
    input: IntegrationUpdateInput,
  ): Promise<ApiEnvelope<TravelRequest>>;
  getPolicy(): Promise<ApiEnvelope<TravelPolicy>>;
  updatePolicy(input: TravelPolicyInput): Promise<ApiEnvelope<TravelPolicy>>;
}

export function createHttpTravelRepository(client: ApiClient): TravelRepository {
  return {
    list: (query) => client.request(`/travel-requests${queryString(query)}`),
    get: (id) => client.request(`/travel-requests/${id}`),
    create: (input, id) =>
      client.request('/travel-requests', { method: 'POST', body: id ? { ...input, id } : input }),
    update: (id, input) => client.request(`/travel-requests/${id}`, { method: 'PUT', body: input }),
    setEvidence: (id, index, input) =>
      client.request(`/travel-requests/${id}/evidence/${index}`, { method: 'PUT', body: input }),
    advance: (id) => client.request(`/travel-requests/${id}/advance`, { method: 'POST' }),
    decideApproval: (id, approvalId, input) =>
      client.request(`/travel-requests/${id}/approvals/${approvalId}`, {
        method: 'POST',
        body: input,
      }),
    saveEstimate: (id, input) =>
      client.request(`/travel-requests/${id}/estimate`, { method: 'PUT', body: input }),
    issueDocument: (id, input) =>
      client.request(`/travel-requests/${id}/documents`, { method: 'POST', body: input }),
    amend: (id, input) =>
      client.request(`/travel-requests/${id}/amendments`, { method: 'POST', body: input }),
    cancel: (id, input) =>
      client.request(`/travel-requests/${id}/cancellation`, { method: 'POST', body: input }),
    close: (id, input) =>
      client.request(`/travel-requests/${id}/closure`, { method: 'POST', body: input }),
    updateIntegration: (id, input) =>
      client.request(`/travel-requests/${id}/integrations`, { method: 'PUT', body: input }),
    getPolicy: () => client.request('/travel-policy'),
    updatePolicy: (input) => client.request('/travel-policy', { method: 'PUT', body: input }),
  };
}
