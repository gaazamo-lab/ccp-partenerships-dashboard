import type {
  ApiEnvelope,
  ConsentInput,
  ContactInput,
  EngagementInput,
  RelationshipStatus,
  ScreeningDecisionInput,
  Segment,
  SegmentInput,
  Stakeholder,
  StakeholderImportResult,
  StakeholderInput,
  StakeholderListQuery,
} from '@partner-crm/types';

import type { ApiClient } from './index';
import { queryString } from './query';

export interface SegmentMember {
  stakeholderId: string;
  stakeholderName: string;
  contactId: string;
  contactName: string;
  email: string;
  consent: string;
}

export interface CreateStakeholderOptions {
  /** Client-generated UUID; lets an optimistic UI keep the same ID as the server. */
  id?: string;
  /** Create despite a duplicate match. Requires `overrideReason`. */
  force?: boolean;
  overrideReason?: string;
}

/**
 * S081 Stakeholder / Partner CRM transport boundary. Contact, screening,
 * consent and engagement mutations return the whole updated stakeholder so the
 * 360 profile never has to reconcile partial state.
 */
export interface StakeholdersRepository {
  list(query?: StakeholderListQuery): Promise<ApiEnvelope<Stakeholder[]>>;
  get(id: string): Promise<ApiEnvelope<Stakeholder>>;
  create(input: StakeholderInput, options?: CreateStakeholderOptions): Promise<ApiEnvelope<Stakeholder>>;
  update(id: string, input: StakeholderInput): Promise<ApiEnvelope<Stakeholder>>;
  setStatus(id: string, status: RelationshipStatus): Promise<ApiEnvelope<Stakeholder>>;
  importMany(rows: StakeholderInput[]): Promise<ApiEnvelope<StakeholderImportResult>>;
  addContact(stakeholderId: string, input: ContactInput, id?: string): Promise<ApiEnvelope<Stakeholder>>;
  updateContact(contactId: string, input: ContactInput): Promise<ApiEnvelope<Stakeholder>>;
  deactivateContact(contactId: string): Promise<ApiEnvelope<Stakeholder>>;
  recordScreening(contactId: string, input: ScreeningDecisionInput): Promise<ApiEnvelope<Stakeholder>>;
  recordConsent(contactId: string, input: ConsentInput): Promise<ApiEnvelope<Stakeholder>>;
  addEngagement(
    stakeholderId: string,
    input: EngagementInput,
    id?: string,
  ): Promise<ApiEnvelope<Stakeholder>>;
  listSegments(): Promise<ApiEnvelope<Segment[]>>;
  createSegment(input: SegmentInput, id?: string): Promise<ApiEnvelope<Segment>>;
  updateSegment(id: string, input: SegmentInput): Promise<ApiEnvelope<Segment>>;
  deleteSegment(id: string): Promise<void>;
  listSegmentMembers(id: string): Promise<ApiEnvelope<SegmentMember[]>>;
}

export function createHttpStakeholdersRepository(client: ApiClient): StakeholdersRepository {
  return {
    list: (query = {}) => client.request(`/stakeholders${queryString(query)}`),
    get: (id) => client.request(`/stakeholders/${id}`),
    create: (input, options = {}) =>
      client.request('/stakeholders', { method: 'POST', body: { ...input, ...options } }),
    update: (id, input) => client.request(`/stakeholders/${id}`, { method: 'PUT', body: input }),
    setStatus: (id, status) =>
      client.request(`/stakeholders/${id}/status`, { method: 'POST', body: { status } }),
    importMany: (rows) =>
      client.request('/stakeholders/imports', { method: 'POST', body: { rows } }),
    addContact: (stakeholderId, input, id) =>
      client.request(`/stakeholders/${stakeholderId}/contacts`, {
        method: 'POST',
        body: { ...input, id },
      }),
    updateContact: (contactId, input) =>
      client.request(`/stakeholder-contacts/${contactId}`, { method: 'PUT', body: input }),
    deactivateContact: (contactId) =>
      client.request(`/stakeholder-contacts/${contactId}/deactivate`, { method: 'POST' }),
    recordScreening: (contactId, input) =>
      client.request(`/stakeholder-contacts/${contactId}/screening`, {
        method: 'POST',
        body: input,
      }),
    recordConsent: (contactId, input) =>
      client.request(`/stakeholder-contacts/${contactId}/consent`, { method: 'PUT', body: input }),
    addEngagement: (stakeholderId, input, id) =>
      client.request(`/stakeholders/${stakeholderId}/engagements`, {
        method: 'POST',
        body: { ...input, id },
      }),
    listSegments: () => client.request('/segments'),
    createSegment: (input, id) =>
      client.request('/segments', { method: 'POST', body: { ...input, id } }),
    updateSegment: (id, input) => client.request(`/segments/${id}`, { method: 'PUT', body: input }),
    deleteSegment: (id) => client.request(`/segments/${id}`, { method: 'DELETE' }),
    listSegmentMembers: (id) => client.request(`/segments/${id}/members`),
  };
}
