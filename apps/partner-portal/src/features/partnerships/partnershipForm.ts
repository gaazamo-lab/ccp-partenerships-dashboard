import type { UpdatePartnershipInput } from '@partner-crm/types';

import type { SelectOption } from '@/features/shared';
import type { Stakeholder } from '@/features/stakeholders/types';

/**
 * S136 contract and S003 document references are matched literally by the
 * owning systems, so the shape is enforced before the record is saved — a
 * near-miss reference looks correct in the portal and resolves to nothing.
 */
export const LEGAL_REF_PATTERN = /^S136-CTR-\d{4}-\d{4}$/i;
export const SIGNED_DOC_PATTERN = /^S003-DOC-\d{4}-\d{4}$/i;

export const AGREEMENT_TYPES: SelectOption[] = [
  { value: 'MOU', label: 'Memorandum of Understanding' },
  { value: 'PARTNERSHIP_AGREEMENT', label: 'Partnership agreement' },
  { value: 'COOPERATION_FRAMEWORK', label: 'Cooperation framework' },
];

export const EMPTY_AGREEMENT: UpdatePartnershipInput = {
  stakeholderId: '',
  partyStakeholderIds: [],
  title: '',
  agreementType: 'MOU',
  owner: '',
  effectiveDate: null,
  expiryDate: null,
  valueCommitment: '',
  deliverables: [],
  legalContractRef: null,
  signedDocumentRef: null,
};

export type AgreementErrors = Partial<
  Record<keyof UpdatePartnershipInput | 'deliverables', string>
>;

/** A stakeholder in either of these states cannot be a party to an agreement. */
export function isBlockedParty(stakeholder: Stakeholder): boolean {
  return stakeholder.status === 'Screening pending' || stakeholder.status === 'Inactive';
}

/** Primary partner plus any co-signing parties, de-duplicated. */
export function agreementPartyIds(form: UpdatePartnershipInput): string[] {
  return [...new Set([form.stakeholderId, ...form.partyStakeholderIds].filter(Boolean))];
}

/** One trimmed, de-duplicated deliverable per non-empty line. */
export function parseDeliverables(text: string): string[] {
  return [
    ...new Set(
      text
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

interface ValidateOptions {
  /** Only the edit form carries the S003 reference; the create form has none yet. */
  withSignedDocument?: boolean;
}

export function validateAgreement(
  form: UpdatePartnershipInput,
  deliverables: string[],
  { withSignedDocument = false }: ValidateOptions = {},
): AgreementErrors {
  const errors: AgreementErrors = {};

  if (!form.stakeholderId) errors.stakeholderId = 'A primary partner is required.';
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (!form.owner.trim()) errors.owner = 'Owner is required.';
  if (!form.valueCommitment.trim()) errors.valueCommitment = 'Value commitment is required.';
  if (deliverables.length === 0) errors.deliverables = 'At least one deliverable is required.';

  if (form.legalContractRef && !LEGAL_REF_PATTERN.test(form.legalContractRef.trim())) {
    errors.legalContractRef = 'Use the format S136-CTR-YYYY-NNNN.';
  }
  if (
    withSignedDocument &&
    form.signedDocumentRef &&
    !SIGNED_DOC_PATTERN.test(form.signedDocumentRef.trim())
  ) {
    errors.signedDocumentRef = 'Use the format S003-DOC-YYYY-NNNN.';
  }
  if (form.effectiveDate && form.expiryDate && form.expiryDate <= form.effectiveDate) {
    errors.expiryDate = 'Expiry must be after the effective date.';
  }

  return errors;
}
