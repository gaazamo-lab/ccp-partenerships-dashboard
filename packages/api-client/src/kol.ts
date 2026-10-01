import type {
  ApiEnvelope,
  KolContent,
  KolContentInput,
  KolContentStageInput,
  KolEngagement,
  KolEngagementInput,
  KolEngagementStageInput,
  KolInput,
  KolListQuery,
  KolMediaMention,
  KolMediaMentionInput,
  KolParticipationInput,
  KolProfile,
} from '@partner-crm/types';

import type { ApiClient } from './index';
import { queryString } from './query';

/** S092 KOL Tracker transport boundary. */
export interface KolRepository {
  list(query?: KolListQuery): Promise<ApiEnvelope<KolProfile[]>>;
  get(id: string): Promise<ApiEnvelope<KolProfile>>;
  create(input: KolInput): Promise<ApiEnvelope<KolProfile>>;
  update(id: string, input: KolInput): Promise<ApiEnvelope<KolProfile>>;
  listEngagements(kolId?: string): Promise<ApiEnvelope<KolEngagement[]>>;
  createEngagement(kolId: string, input: KolEngagementInput): Promise<ApiEnvelope<KolEngagement>>;
  moveEngagement(id: string, input: KolEngagementStageInput): Promise<ApiEnvelope<KolEngagement>>;
  recordParticipation(
    id: string,
    input: KolParticipationInput,
  ): Promise<ApiEnvelope<KolEngagement>>;
  listContent(kolId?: string): Promise<ApiEnvelope<KolContent[]>>;
  createContent(kolId: string, input: KolContentInput): Promise<ApiEnvelope<KolContent>>;
  moveContent(id: string, input: KolContentStageInput): Promise<ApiEnvelope<KolContent>>;
  listMentions(kolId?: string): Promise<ApiEnvelope<KolMediaMention[]>>;
  addMention(kolId: string, input: KolMediaMentionInput): Promise<ApiEnvelope<KolMediaMention>>;
}

/** The backend takes calendar dates (`YYYY-MM-DD`); the forms hand over ISO midnight timestamps. */
function dateOnly<T extends string | null | undefined>(value: T): T | string {
  return typeof value === 'string' ? value.slice(0, 10) : value;
}

export function createHttpKolRepository(client: ApiClient): KolRepository {
  return {
    list: (query = {}) => client.request(`/kols${queryString(query)}`),
    get: (id) => client.request(`/kols/${id}`),
    create: (input) => client.request('/kols', { method: 'POST', body: input }),
    update: (id, input) => client.request(`/kols/${id}`, { method: 'PUT', body: input }),
    listEngagements: (kolId) => client.request(`/kol-engagements${queryString({ kolId })}`),
    createEngagement: (kolId, input) =>
      client.request(`/kols/${kolId}/engagements`, {
        method: 'POST',
        body: { ...input, scheduledFor: dateOnly(input.scheduledFor) },
      }),
    moveEngagement: (id, input) =>
      client.request(`/kol-engagements/${id}/stage`, { method: 'POST', body: input }),
    recordParticipation: (id, input) =>
      client.request(`/kol-engagements/${id}/participation`, { method: 'PUT', body: input }),
    listContent: (kolId) => client.request(`/kol-content${queryString({ kolId })}`),
    createContent: (kolId, input) =>
      client.request(`/kols/${kolId}/content`, { method: 'POST', body: input }),
    moveContent: (id, input) =>
      client.request(`/kol-content/${id}/stage`, { method: 'POST', body: input }),
    listMentions: (kolId) => client.request(`/kol-mentions${queryString({ kolId })}`),
    addMention: (kolId, input) =>
      client.request(`/kols/${kolId}/mentions`, {
        method: 'POST',
        body: { ...input, publishedAt: dateOnly(input.publishedAt) },
      }),
  };
}
