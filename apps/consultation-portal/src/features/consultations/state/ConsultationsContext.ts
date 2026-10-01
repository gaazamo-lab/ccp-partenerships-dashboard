import { createContext, useContext } from 'react';

import type {
  Consultation,
  ConsultationInvitation,
  ConsultationInvitationInput,
  ConsultationResponse,
  ConsultationStatusInput,
  ConsultationTheme,
  ConsultationThemeInput,
  CreateConsultationInput,
  ResponseThemesInput,
  Segment,
  SubmitConsultationResponseInput,
  UpdateConsultationInput,
} from '@partner-crm/types';

export interface ConsultationsContextValue {
  dataMode: 'api' | 'mock';
  /** Staff view of every consultation (loaded after sign-in in api mode). */
  consultations: Consultation[];
  /** What the public site may list: scheduled, open and closed consultations. */
  publicConsultations: Consultation[];
  responses: ConsultationResponse[];
  invitations: ConsultationInvitation[];
  segments: Segment[];
  loading: boolean;
  error: string | null;
  publicLoading: boolean;
  publicError: string | null;

  reload(): Promise<void>;
  loadPublic(): Promise<void>;
  loadPublicConsultation(slug: string): Promise<void>;
  /** Fresh record, responses and invitations for one consultation (api mode). */
  loadConsultationDetail(id: string): Promise<void>;

  submitResponse(slug: string, input: SubmitConsultationResponseInput): Promise<{ id: string }>;
  createConsultation(input: CreateConsultationInput): Promise<Consultation>;
  updateConsultation(id: string, input: UpdateConsultationInput): Promise<Consultation>;
  duplicateConsultation(id: string): Promise<Consultation>;
  changeStatus(id: string, input: ConsultationStatusInput): Promise<Consultation>;
  publishOutcome(id: string, outcomeSummary: string): Promise<Consultation>;
  sendInvitations(id: string, input: ConsultationInvitationInput): Promise<ConsultationInvitation>;
  addTheme(id: string, input: ConsultationThemeInput): Promise<ConsultationTheme>;
  tagResponse(responseId: string, input: ResponseThemesInput): Promise<ConsultationResponse>;
}

export const ConsultationsContext = createContext<ConsultationsContextValue | null>(null);

export function useConsultations() {
  const value = useContext(ConsultationsContext);
  if (!value) throw new Error('useConsultations must be used inside ConsultationsProvider.');
  return value;
}
