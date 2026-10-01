import { createContext } from 'react';

import type {
  AddObligationProgressInput,
  ConfigureRenewalAlertsInput,
  CreateObligationInput,
  CreatePartnershipInput,
  CreatePartnershipReviewInput,
  ImportPartnershipInput,
  ObligationProgressNote,
  PartnershipAgreement,
  PartnershipHistoryEntry,
  PartnershipImportResult,
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

export interface PartnershipsContextValue {
  agreements: PartnershipAgreement[];
  obligations: PartnershipObligation[];
  obligationProgress: ObligationProgressNote[];
  reviews: PartnershipReview[];
  renewals: PartnershipRenewal[];
  renewalAlerts: PartnershipRenewalAlert[];
  history: PartnershipHistoryEntry[];
  /** Partnership records always come from the S082 backend. */
  dataMode: 'api';
  /** True while the initial (or a retried) portfolio load is in flight. */
  loading: boolean;
  /** The last portfolio load failure, readable by users; null when the load succeeded. */
  error: string | null;
  /** Reloads the whole portfolio from the backend. */
  reload(): void;
  /**
   * Refreshes one agreement's children, including obligation progress notes,
   * from the backend. Detail pages call it on open.
   */
  loadAgreementDetail(agreementId: string): void;
  createAgreement(input: CreatePartnershipInput): PartnershipAgreement;
  importAgreements(inputs: ImportPartnershipInput[], actor: string): PartnershipImportResult;
  updateAgreement(id: string, input: UpdatePartnershipInput): void;
  transitionAgreement(id: string, input: PartnershipTransitionInput, actor: string): void;
  renewAgreement(id: string, input: RenewPartnershipInput, actor: string): void;
  terminateAgreement(id: string, input: TerminatePartnershipInput, actor: string): void;
  createObligation(input: CreateObligationInput, actor: string): PartnershipObligation;
  updateObligation(id: string, input: UpdateObligationInput, actor: string): void;
  addObligationProgress(input: AddObligationProgressInput, actor: string): void;
  configureRenewalAlerts(input: ConfigureRenewalAlertsInput, actor: string): void;
  dispatchRenewalAlert(id: string, actor: string): void;
  acknowledgeRenewalAlert(id: string, actor: string): void;
  createReview(input: CreatePartnershipReviewInput, actor: string): PartnershipReview;
  updateReview(id: string, input: UpdatePartnershipReviewInput, actor: string): void;
}

export const PartnershipsContext = createContext<PartnershipsContextValue | null>(null);
