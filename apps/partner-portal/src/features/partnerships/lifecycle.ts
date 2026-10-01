import type {
  PartnershipAgreement,
  PartnershipObligation,
  PartnershipStatus,
} from '@partner-crm/types';

export const nextLifecycleStatus: Partial<Record<PartnershipStatus, PartnershipStatus>> = {
  DRAFT: 'LEGAL_REVIEW',
  LEGAL_REVIEW: 'SIGNATURE_PENDING',
  SIGNATURE_PENDING: 'ACTIVE',
  ACTIVE: 'RENEWAL_DUE',
};

export const lifecycleActionLabel: Partial<Record<PartnershipStatus, string>> = {
  LEGAL_REVIEW: 'Submit for legal review',
  SIGNATURE_PENDING: 'Approve for signature',
  ACTIVE: 'Activate agreement',
  RENEWAL_DUE: 'Start renewal',
  EXPIRED: 'Mark expired',
};

export function transitionBlockers(
  agreement: PartnershipAgreement,
  obligations: PartnershipObligation[],
  target: PartnershipStatus,
) {
  const blockers: string[] = [];

  if (target === 'LEGAL_REVIEW' || target === 'SIGNATURE_PENDING' || target === 'ACTIVE') {
    if (!agreement.legalContractRef) blockers.push('Link the S136 legal record.');
  }

  if (target === 'ACTIVE') {
    if (!agreement.signedDocumentRef) blockers.push('Link the executed S003 document.');
    if (!agreement.effectiveDate) blockers.push('Set the effective date.');
    if (!agreement.expiryDate) blockers.push('Set the expiry date.');
    if (!obligations.length) blockers.push('Define at least one agreement obligation.');
  }

  return blockers;
}

export function terminationBlockers(obligations: PartnershipObligation[]) {
  const open = obligations.filter((item) => !['COMPLETED', 'WAIVED'].includes(item.status));
  return open.length
    ? [`Close or waive ${open.length} outstanding obligation${open.length === 1 ? '' : 's'}.`]
    : [];
}

export function canMarkExpired(
  agreement: PartnershipAgreement,
  today = new Date().toISOString().slice(0, 10),
) {
  if (!agreement.expiryDate || agreement.status !== 'ACTIVE') return false;
  return agreement.expiryDate < today;
}
