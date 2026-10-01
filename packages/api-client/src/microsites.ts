import type {
  ApiEnvelope,
  ArchiveMicrositeInput,
  CreateMicrositeInput,
  Microsite,
  MicrositeAccessInput,
  MicrositeReview,
  MicrositeReviewInput,
  MicrositeTemplate,
  MicrositeUnlockInput,
  PublicMicrosite,
  UpdateMicrositeInput,
} from '@partner-crm/types';

import type { ApiClient } from './index';

/** S091 Donor Microsite Builder transport boundary. */
export interface MicrositesRepository {
  list(): Promise<ApiEnvelope<Microsite[]>>;
  get(id: string): Promise<ApiEnvelope<Microsite>>;
  create(input: CreateMicrositeInput): Promise<ApiEnvelope<Microsite>>;
  update(id: string, input: UpdateMicrositeInput): Promise<ApiEnvelope<Microsite>>;
  setAccess(id: string, input: MicrositeAccessInput): Promise<ApiEnvelope<Microsite>>;
  review(id: string, input: MicrositeReviewInput): Promise<ApiEnvelope<Microsite>>;
  listReviews(id: string): Promise<ApiEnvelope<MicrositeReview[]>>;
  publish(id: string): Promise<ApiEnvelope<Microsite>>;
  unpublish(id: string): Promise<ApiEnvelope<Microsite>>;
  archive(id: string, input: ArchiveMicrositeInput): Promise<ApiEnvelope<Microsite>>;
  listTemplates(): Promise<ApiEnvelope<MicrositeTemplate[]>>;
  listPublic(): Promise<ApiEnvelope<PublicMicrosite[]>>;
  /** Resolves when the site is public or this browser session already unlocked it. */
  getPublic(slug: string): Promise<ApiEnvelope<PublicMicrosite>>;
  unlock(slug: string, input: MicrositeUnlockInput): Promise<ApiEnvelope<PublicMicrosite>>;
  recordView(slug: string): Promise<void>;
}

export function createHttpMicrositesRepository(client: ApiClient): MicrositesRepository {
  return {
    list: () => client.request('/microsites'),
    get: (id) => client.request(`/microsites/${id}`),
    create: (input) => client.request('/microsites', { method: 'POST', body: input }),
    update: (id, input) => client.request(`/microsites/${id}`, { method: 'PUT', body: input }),
    setAccess: (id, input) =>
      client.request(`/microsites/${id}/access`, { method: 'PUT', body: input }),
    review: (id, input) =>
      client.request(`/microsites/${id}/reviews`, { method: 'POST', body: input }),
    listReviews: (id) => client.request(`/microsites/${id}/reviews`),
    publish: (id) => client.request(`/microsites/${id}/publish`, { method: 'POST' }),
    unpublish: (id) => client.request(`/microsites/${id}/unpublish`, { method: 'POST' }),
    archive: (id, input) =>
      client.request(`/microsites/${id}/archive`, { method: 'POST', body: input }),
    listTemplates: () => client.request('/microsite-templates'),
    listPublic: () => client.request('/public/microsites'),
    getPublic: (slug) => client.request(`/public/microsites/${slug}`),
    unlock: (slug, input) =>
      client.request(`/public/microsites/${slug}/unlock`, { method: 'POST', body: input }),
    recordView: (slug) => client.request(`/public/microsites/${slug}/views`, { method: 'POST' }),
  };
}
