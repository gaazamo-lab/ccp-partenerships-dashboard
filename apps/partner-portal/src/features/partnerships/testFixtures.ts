import type {
  ImportPartnershipInput,
  PartnershipAgreement,
  PartnershipObligation,
  PartnershipReview,
} from '@partner-crm/types';

export function agreementFixture(
  overrides: Partial<PartnershipAgreement> = {},
): PartnershipAgreement {
  return {
    id: 'agreement-1',
    stakeholderId: 'stakeholder-1',
    partyStakeholderIds: ['stakeholder-1'],
    reference: 'CLET/MOU/2026/001',
    title: 'Legal education partnership',
    agreementType: 'MOU',
    status: 'DRAFT',
    owner: 'Partnership Manager',
    effectiveDate: '2026-01-01',
    expiryDate: '2027-01-01',
    valueCommitment: 'Joint professional development',
    deliverables: ['Annual programme'],
    legalContractRef: 'S136-CTR-2026-0001',
    signedDocumentRef: 'S003-DOC-2026-0001',
    renewalCount: 0,
    termination: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function obligationFixture(
  overrides: Partial<PartnershipObligation> = {},
): PartnershipObligation {
  return {
    id: 'obligation-1',
    agreementId: 'agreement-1',
    title: 'Publish programme',
    description: 'Publish the annual programme.',
    owner: 'Partnership Manager',
    dueDate: '2026-10-01',
    status: 'NOT_STARTED',
    evidenceReferences: [],
    reminderLeadDays: 14,
    escalationOwner: 'Registrar',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function reviewFixture(overrides: Partial<PartnershipReview> = {}): PartnershipReview {
  return {
    id: 'review-1',
    agreementId: 'agreement-1',
    reviewDate: '2026-08-01',
    reviewer: 'Partnership Manager',
    outcome: 'ON_TRACK',
    summary: 'The partnership delivered its planned value.',
    periodStart: '2025-08-01',
    periodEnd: '2026-07-31',
    outputs: ['Annual programme delivered'],
    strategicScore: 4,
    issues: [],
    recommendations: ['Renew the agreement'],
    renewalRecommendation: 'RENEW',
    nextReviewDate: '2027-08-01',
    ...overrides,
  };
}

export function importFixture(
  overrides: Partial<ImportPartnershipInput> = {},
): ImportPartnershipInput {
  return {
    reference: 'CLET/MOU/2025/010',
    stakeholderId: 'stakeholder-1',
    partyStakeholderIds: ['stakeholder-1'],
    title: 'Imported partnership',
    agreementType: 'MOU',
    status: 'ACTIVE',
    owner: 'Partnership Manager',
    effectiveDate: '2025-01-01',
    expiryDate: '2027-01-01',
    valueCommitment: 'Imported partnership value',
    deliverables: ['First output'],
    legalContractRef: 'S136-CTR-2025-0010',
    signedDocumentRef: 'S003-DOC-2025-0010',
    ...overrides,
  };
}
