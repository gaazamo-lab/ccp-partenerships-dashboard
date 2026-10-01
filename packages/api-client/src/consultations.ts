import type {
  ApiEnvelope,
  Consultation,
  ConsultationInvitation,
  ConsultationInvitationInput,
  ConsultationListQuery,
  ConsultationOutcomeInput,
  ConsultationResponse,
  ConsultationStatusInput,
  ConsultationTheme,
  ConsultationThemeInput,
  CreateConsultationInput,
  PaginatedEnvelope,
  ResponseThemesInput,
  SubmitConsultationResponseInput,
  UpdateConsultationInput,
} from '@partner-crm/types';

import type { ApiClient } from './index';
import { queryString } from './query';

/** S088_consult transport boundary: public participation plus administration. */
export interface ConsultationsRepository {
  listPublic(query?: ConsultationListQuery): Promise<PaginatedEnvelope<Consultation>>;
  getPublic(slug: string): Promise<ApiEnvelope<Consultation>>;
  submit(slug: string, input: SubmitConsultationResponseInput): Promise<ApiEnvelope<{ id: string }>>;
  listAdmin(query?: ConsultationListQuery): Promise<PaginatedEnvelope<Consultation>>;
  getAdmin(id: string): Promise<ApiEnvelope<Consultation>>;
  create(input: CreateConsultationInput, id?: string): Promise<ApiEnvelope<Consultation>>;
  update(id: string, input: UpdateConsultationInput): Promise<ApiEnvelope<Consultation>>;
  duplicate(id: string): Promise<ApiEnvelope<Consultation>>;
  updateStatus(id: string, input: ConsultationStatusInput): Promise<ApiEnvelope<Consultation>>;
  publishOutcome(id: string, input: ConsultationOutcomeInput): Promise<ApiEnvelope<Consultation>>;
  listResponses(id: string): Promise<ApiEnvelope<ConsultationResponse[]>>;
  listInvitations(id: string): Promise<ApiEnvelope<ConsultationInvitation[]>>;
  sendInvitations(
    id: string,
    input: ConsultationInvitationInput,
  ): Promise<ApiEnvelope<ConsultationInvitation>>;
  addTheme(id: string, input: ConsultationThemeInput): Promise<ApiEnvelope<ConsultationTheme>>;
  tagResponse(responseId: string, input: ResponseThemesInput): Promise<ApiEnvelope<ConsultationResponse>>;
}

export function createHttpConsultationsRepository(client: ApiClient): ConsultationsRepository {
  return {
    listPublic: (query = {}) => client.request(`/public/consultations${queryString(query)}`),
    getPublic: (slug) => client.request(`/public/consultations/${slug}`),
    submit: (slug, input) =>
      client.request(`/public/consultations/${slug}/responses`, { method: 'POST', body: input }),
    listAdmin: (query = {}) => client.request(`/consultations${queryString(query)}`),
    getAdmin: (id) => client.request(`/consultations/${id}`),
    create: (input, id) =>
      client.request('/consultations', { method: 'POST', body: { ...input, id } }),
    update: (id, input) => client.request(`/consultations/${id}`, { method: 'PUT', body: input }),
    duplicate: (id) => client.request(`/consultations/${id}/duplicate`, { method: 'POST' }),
    updateStatus: (id, input) =>
      client.request(`/consultations/${id}/status`, { method: 'POST', body: input }),
    publishOutcome: (id, input) =>
      client.request(`/consultations/${id}/outcome`, { method: 'PUT', body: input }),
    listResponses: (id) => client.request(`/consultations/${id}/responses`),
    listInvitations: (id) => client.request(`/consultations/${id}/invitations`),
    sendInvitations: (id, input) =>
      client.request(`/consultations/${id}/invitations`, { method: 'POST', body: input }),
    addTheme: (id, input) =>
      client.request(`/consultations/${id}/themes`, { method: 'POST', body: input }),
    tagResponse: (responseId, input) =>
      client.request(`/consultation-responses/${responseId}/themes`, {
        method: 'PUT',
        body: input,
      }),
  };
}
