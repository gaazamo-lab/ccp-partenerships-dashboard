import type {
  ApiEnvelope,
  IrCorrespondence,
  IrCorrespondenceInput,
  IrCorrespondenceTransitionInput,
  IrDelegationInput,
  IrEngagement,
  IrEngagementInput,
  IrFollowUpInput,
  IrGift,
  IrGiftInput,
  IrLetterTemplate,
  IrLetterTemplateInput,
  IrProtocolTaskInput,
  IrSupportRequestInput,
  IrSupportStatusInput,
  IrTaskUpdateInput,
  IrTransitionInput,
} from '@partner-crm/types';

import type { ApiClient } from './index';

/** S083 International Relations & Protocols Workspace transport boundary. */
export interface InternationalRepository {
  listEngagements(): Promise<ApiEnvelope<IrEngagement[]>>;
  getEngagement(id: string): Promise<ApiEnvelope<IrEngagement>>;
  createEngagement(input: IrEngagementInput): Promise<ApiEnvelope<IrEngagement>>;
  updateEngagement(id: string, input: IrEngagementInput): Promise<ApiEnvelope<IrEngagement>>;
  transitionEngagement(id: string, input: IrTransitionInput): Promise<ApiEnvelope<IrEngagement>>;
  addDelegate(id: string, input: IrDelegationInput): Promise<ApiEnvelope<IrEngagement>>;
  removeDelegate(id: string, memberId: string): Promise<ApiEnvelope<IrEngagement>>;
  addProtocolTask(id: string, input: IrProtocolTaskInput): Promise<ApiEnvelope<IrEngagement>>;
  updateProtocolTask(
    id: string,
    taskId: string,
    input: IrTaskUpdateInput,
  ): Promise<ApiEnvelope<IrEngagement>>;
  addFollowUp(id: string, input: IrFollowUpInput): Promise<ApiEnvelope<IrEngagement>>;
  updateFollowUp(
    id: string,
    followUpId: string,
    input: IrTaskUpdateInput,
  ): Promise<ApiEnvelope<IrEngagement>>;
  requestSupport(id: string, input: IrSupportRequestInput): Promise<ApiEnvelope<IrEngagement>>;
  updateSupport(
    id: string,
    requestId: string,
    input: IrSupportStatusInput,
  ): Promise<ApiEnvelope<IrEngagement>>;
  listCorrespondence(): Promise<ApiEnvelope<IrCorrespondence[]>>;
  createCorrespondence(input: IrCorrespondenceInput): Promise<ApiEnvelope<IrCorrespondence>>;
  updateCorrespondence(
    id: string,
    input: IrCorrespondenceInput,
  ): Promise<ApiEnvelope<IrCorrespondence>>;
  transitionCorrespondence(
    id: string,
    input: IrCorrespondenceTransitionInput,
  ): Promise<ApiEnvelope<IrCorrespondence>>;
  listTemplates(): Promise<ApiEnvelope<IrLetterTemplate[]>>;
  createTemplate(input: IrLetterTemplateInput): Promise<ApiEnvelope<IrLetterTemplate>>;
  updateTemplate(id: string, input: IrLetterTemplateInput): Promise<ApiEnvelope<IrLetterTemplate>>;
  listGifts(): Promise<ApiEnvelope<IrGift[]>>;
  createGift(input: IrGiftInput): Promise<ApiEnvelope<IrGift>>;
  retryGiftFlag(id: string): Promise<ApiEnvelope<IrGift>>;
}

/**
 * The backend keeps correspondence `receivedAt` / `responseDeadline` as calendar dates, while the
 * UI edits them as `datetime-local` values and blank engagement times as ''. Send dates as
 * `YYYY-MM-DD` (blank as null) and read dates back as instants (deadlines fall due at close of
 * business) so the overdue rules and the date inputs keep working.
 */
const dateOnly = (value: string | null | undefined): string | null => (value ? value.slice(0, 10) : null);
const orNull = (value: string | null | undefined): string | null => value || null;
const asInstant = (value: string | null, time: string): string | null =>
  value && value.length === 10 ? `${value}T${time}.000Z` : value;

function correspondenceBody(input: IrCorrespondenceInput) {
  return {
    ...input,
    receivedAt: dateOnly(input.receivedAt),
    responseDeadline: dateOnly(input.responseDeadline),
  };
}

function engagementBody(input: IrEngagementInput) {
  return { ...input, startAt: orNull(input.startAt), endAt: orNull(input.endAt) };
}

function readCorrespondence(item: IrCorrespondence): IrCorrespondence {
  return {
    ...item,
    receivedAt: asInstant(item.receivedAt, '09:00:00'),
    responseDeadline: asInstant(item.responseDeadline, '17:00:00'),
  };
}

function readEnvelope<T, U>(
  promise: Promise<ApiEnvelope<T>>,
  map: (value: T) => U,
): Promise<ApiEnvelope<U>> {
  return promise.then((envelope) => ({ ...envelope, data: map(envelope.data) }));
}

export function createHttpInternationalRepository(client: ApiClient): InternationalRepository {
  const engagement = (id: string) => `/ir/engagements/${id}`;
  return {
    listEngagements: () => client.request('/ir/engagements'),
    getEngagement: (id) => client.request(engagement(id)),
    createEngagement: (input) =>
      client.request('/ir/engagements', { method: 'POST', body: engagementBody(input) }),
    updateEngagement: (id, input) =>
      client.request(engagement(id), { method: 'PUT', body: engagementBody(input) }),
    transitionEngagement: (id, input) =>
      client.request(`${engagement(id)}/status`, { method: 'POST', body: input }),
    addDelegate: (id, input) =>
      client.request(`${engagement(id)}/delegation`, { method: 'POST', body: input }),
    removeDelegate: (id, memberId) =>
      client.request(`${engagement(id)}/delegation/${memberId}`, { method: 'DELETE' }),
    addProtocolTask: (id, input) =>
      client.request(`${engagement(id)}/protocol-tasks`, { method: 'POST', body: input }),
    updateProtocolTask: (id, taskId, input) =>
      client.request(`${engagement(id)}/protocol-tasks/${taskId}`, { method: 'PATCH', body: input }),
    addFollowUp: (id, input) =>
      client.request(`${engagement(id)}/follow-ups`, { method: 'POST', body: input }),
    updateFollowUp: (id, followUpId, input) =>
      client.request(`${engagement(id)}/follow-ups/${followUpId}`, { method: 'PATCH', body: input }),
    requestSupport: (id, input) =>
      client.request(`${engagement(id)}/support-requests`, { method: 'POST', body: input }),
    updateSupport: (id, requestId, input) =>
      client.request(`${engagement(id)}/support-requests/${requestId}`, {
        method: 'PATCH',
        body: input,
      }),
    listCorrespondence: () =>
      readEnvelope(client.request<ApiEnvelope<IrCorrespondence[]>>('/ir/correspondence'), (items) =>
        items.map(readCorrespondence),
      ),
    createCorrespondence: (input) =>
      readEnvelope(
        client.request<ApiEnvelope<IrCorrespondence>>('/ir/correspondence', {
          method: 'POST',
          body: correspondenceBody(input),
        }),
        readCorrespondence,
      ),
    updateCorrespondence: (id, input) =>
      readEnvelope(
        client.request<ApiEnvelope<IrCorrespondence>>(`/ir/correspondence/${id}`, {
          method: 'PUT',
          body: correspondenceBody(input),
        }),
        readCorrespondence,
      ),
    transitionCorrespondence: (id, input) =>
      readEnvelope(
        client.request<ApiEnvelope<IrCorrespondence>>(`/ir/correspondence/${id}/status`, {
          method: 'POST',
          body: input,
        }),
        readCorrespondence,
      ),
    listTemplates: () => client.request('/ir/letter-templates'),
    createTemplate: (input) =>
      client.request('/ir/letter-templates', { method: 'POST', body: input }),
    updateTemplate: (id, input) =>
      client.request(`/ir/letter-templates/${id}`, { method: 'PUT', body: input }),
    listGifts: () => client.request('/ir/gifts'),
    createGift: (input) => client.request('/ir/gifts', { method: 'POST', body: input }),
    retryGiftFlag: (id) => client.request(`/ir/gifts/${id}/s011-flag`, { method: 'POST' }),
  };
}
