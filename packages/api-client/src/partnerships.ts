import type {
  AddObligationProgressInput,
  ApiEnvelope,
  ConfigureRenewalAlertsInput,
  CreateObligationInput,
  CreatePartnershipInput,
  CreatePartnershipReviewInput,
  ObligationProgressNote,
  ImportPartnershipInput,
  PaginatedEnvelope,
  PartnershipAgreement,
  PartnershipHistoryEntry,
  PartnershipListQuery,
  PartnershipImportResult,
  PartnershipIntegrationHealth,
  PartnershipObligation,
  PartnershipRenewal,
  PartnershipRenewalAlert,
  PartnershipReview,
  PartnershipTransitionInput,
  RenewPartnershipInput,
  TerminatePartnershipInput,
  UpdateObligationInput,
  UpdatePartnershipInput,
  UpdatePartnershipReviewInput,
} from '@partner-crm/types';

import type { ApiClient } from './index';
import { queryString } from './query';

export interface PartnershipsRepository {
  list(query?: PartnershipListQuery): Promise<PaginatedEnvelope<PartnershipAgreement>>;
  get(id: string): Promise<ApiEnvelope<PartnershipAgreement>>;
  /** `id` is an optional client-generated UUID so optimistic UIs keep a stable ID. */
  create(input: CreatePartnershipInput, id?: string): Promise<ApiEnvelope<PartnershipAgreement>>;
  importMany(inputs: ImportPartnershipInput[]): Promise<ApiEnvelope<PartnershipImportResult>>;
  update(id: string, input: UpdatePartnershipInput): Promise<ApiEnvelope<PartnershipAgreement>>;
  transition(
    id: string,
    input: PartnershipTransitionInput,
  ): Promise<ApiEnvelope<PartnershipAgreement>>;
  renew(id: string, input: RenewPartnershipInput): Promise<ApiEnvelope<PartnershipAgreement>>;
  terminate(
    id: string,
    input: TerminatePartnershipInput,
  ): Promise<ApiEnvelope<PartnershipAgreement>>;
  listObligations(agreementId: string): Promise<ApiEnvelope<PartnershipObligation[]>>;
  createObligation(
    input: CreateObligationInput,
    id?: string,
  ): Promise<ApiEnvelope<PartnershipObligation>>;
  updateObligation(
    id: string,
    input: UpdateObligationInput,
  ): Promise<ApiEnvelope<PartnershipObligation>>;
  listObligationProgress(obligationId: string): Promise<ApiEnvelope<ObligationProgressNote[]>>;
  addObligationProgress(
    input: AddObligationProgressInput,
  ): Promise<ApiEnvelope<ObligationProgressNote>>;
  listReviews(agreementId: string): Promise<ApiEnvelope<PartnershipReview[]>>;
  createReview(
    input: CreatePartnershipReviewInput,
    id?: string,
  ): Promise<ApiEnvelope<PartnershipReview>>;
  updateReview(id: string, input: UpdatePartnershipReviewInput): Promise<ApiEnvelope<PartnershipReview>>;
  listRenewals(agreementId: string): Promise<ApiEnvelope<PartnershipRenewal[]>>;
  listRenewalAlerts(agreementId: string): Promise<ApiEnvelope<PartnershipRenewalAlert[]>>;
  configureRenewalAlerts(
    input: ConfigureRenewalAlertsInput,
  ): Promise<ApiEnvelope<PartnershipRenewalAlert[]>>;
  dispatchRenewalAlert(id: string): Promise<ApiEnvelope<PartnershipRenewalAlert>>;
  acknowledgeRenewalAlert(id: string): Promise<ApiEnvelope<PartnershipRenewalAlert>>;
  listHistory(agreementId: string): Promise<ApiEnvelope<PartnershipHistoryEntry[]>>;
  listAuditEvents(query?: PartnershipListQuery): Promise<PaginatedEnvelope<PartnershipHistoryEntry>>;
  listIntegrationHealth(): Promise<ApiEnvelope<PartnershipIntegrationHealth[]>>;
}


export function createHttpPartnershipsRepository(client: ApiClient): PartnershipsRepository {
  return {
    list: (query = {}) => client.request(`/partnerships${queryString(query)}`),
    get: (id) => client.request(`/partnerships/${id}`),
    create: (input, id) =>
      client.request('/partnerships', { method: 'POST', body: { ...input, id } }),
    importMany: (inputs) =>
      client.request('/partnerships/imports', { method: 'POST', body: { agreements: inputs } }),
    update: (id, input) => client.request(`/partnerships/${id}`, { method: 'PATCH', body: input }),
    transition: (id, input) =>
      client.request(`/partnerships/${id}/status`, { method: 'POST', body: input }),
    renew: (id, input) =>
      client.request(`/partnerships/${id}/renewals`, { method: 'POST', body: input }),
    terminate: (id, input) =>
      client.request(`/partnerships/${id}/termination`, { method: 'POST', body: input }),
    listObligations: (agreementId) => client.request(`/partnerships/${agreementId}/obligations`),
    createObligation: (input, id) =>
      client.request(`/partnerships/${input.agreementId}/obligations`, {
        method: 'POST',
        body: { ...input, id },
      }),
    updateObligation: (id, input) =>
      client.request(`/partnership-obligations/${id}`, { method: 'PATCH', body: input }),
    listObligationProgress: (obligationId) =>
      client.request(`/partnership-obligations/${obligationId}/progress`),
    addObligationProgress: (input) =>
      client.request(`/partnership-obligations/${input.obligationId}/progress`, {
        method: 'POST',
        body: input,
      }),
    listReviews: (agreementId) => client.request(`/partnerships/${agreementId}/reviews`),
    createReview: (input, id) =>
      client.request(`/partnerships/${input.agreementId}/reviews`, {
        method: 'POST',
        body: { ...input, id },
      }),
    updateReview: (id, input) =>
      client.request(`/partnership-reviews/${id}`, { method: 'PATCH', body: input }),
    listRenewals: (agreementId) => client.request(`/partnerships/${agreementId}/renewals`),
    listRenewalAlerts: (agreementId) =>
      client.request(`/partnerships/${agreementId}/renewal-alerts`),
    configureRenewalAlerts: (input) =>
      client.request(`/partnerships/${input.agreementId}/renewal-alerts`, {
        method: 'PUT',
        body: input,
      }),
    dispatchRenewalAlert: (id) =>
      client.request(`/partnership-renewal-alerts/${id}/dispatch`, { method: 'POST' }),
    acknowledgeRenewalAlert: (id) =>
      client.request(`/partnership-renewal-alerts/${id}/acknowledgement`, { method: 'POST' }),
    listHistory: (agreementId) => client.request(`/partnerships/${agreementId}/history`),
    listAuditEvents: (query = {}) => client.request(`/partnership-audit-events${queryString(query)}`),
    listIntegrationHealth: () => client.request('/partnerships/integrations/health'),
  };
}
