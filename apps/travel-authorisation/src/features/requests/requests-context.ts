import { createContext, useContext } from 'react';

import type {
  AmendmentInput,
  ApprovalStatus,
  ClosureRecord,
  EstimateInput,
  IntegrationStatus,
  NewTravelRequest,
  TravelRequest,
} from './types';

export interface RequestsContextValue {
  requests: TravelRequest[];
  /** True while the register is loading from S084 (always false in mock mode). */
  loading: boolean;
  /** Set when S084 could not be reached, so screens can say so rather than look empty. */
  error: string | null;
  reload: () => void;
  createRequest: (input: NewTravelRequest) => string;
  setEvidence: (
    requestId: string,
    evidenceIndex: number,
    status: 'Received' | 'Missing' | 'Exception',
    detail?: string,
  ) => void;
  advanceRequest: (requestId: string) => { ok: boolean; message?: string };
  decideApproval: (
    requestId: string,
    approvalId: string,
    decision: Exclude<ApprovalStatus, 'Pending' | 'Not required' | 'Superseded'>,
    comment: string,
  ) => void;
  saveEstimate: (requestId: string, input: EstimateInput) => void;
  issueDocument: (requestId: string, signatory: string, templateVersion: string) => void;
  amendRequest: (requestId: string, input: AmendmentInput) => void;
  cancelRequest: (requestId: string, reason: string) => void;
  updateIntegration: (
    requestId: string,
    system: string,
    status: IntegrationStatus,
    reference: string,
    note: string,
  ) => void;
  closeRequest: (requestId: string, closure: ClosureRecord) => void;
  retryNotification: (requestId: string, notificationId: string) => void;
}

export const RequestsContext = createContext<RequestsContextValue | null>(null);

export function useRequests() {
  const value = useContext(RequestsContext);
  if (!value) throw new Error('useRequests must be used within RequestsProvider.');
  return value;
}
