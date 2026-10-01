import * as XLSX from 'xlsx';

import type {
  PartnershipAgreement,
  PartnershipHistoryEntry,
  PartnershipObligation,
  PartnershipRenewal,
  PartnershipRenewalAlert,
  PartnershipReview,
} from '@partner-crm/types';

import { effectiveObligationStatus } from './obligations';
import { effectiveRenewalAlertStatus } from './renewalAlerts';

export interface PartnershipExportRow {
  Reference: string;
  Agreement: string;
  Stakeholder: string;
  Type: string;
  Status: string;
  Owner: string;
  'Effective date': string;
  'Expiry date': string;
  'Value commitment': string;
  Deliverables: string;
  'Legal reference': string;
  'Signed document': string;
}

export function partnershipExportRows(
  agreements: PartnershipAgreement[],
  stakeholderName: (id: string) => string,
): PartnershipExportRow[] {
  return agreements.map((item) => ({
    Reference: item.reference,
    Agreement: item.title,
    Stakeholder: stakeholderName(item.stakeholderId),
    Type: item.agreementType,
    Status: item.status,
    Owner: item.owner,
    'Effective date': item.effectiveDate ?? '',
    'Expiry date': item.expiryDate ?? '',
    'Value commitment': item.valueCommitment,
    Deliverables: item.deliverables.join(' | '),
    'Legal reference': item.legalContractRef ?? '',
    'Signed document': item.signedDocumentRef ?? '',
  }));
}

export function createPartnershipWorkbook(
  agreements: PartnershipAgreement[],
  obligations: PartnershipObligation[],
  reviews: PartnershipReview[],
  stakeholderName: (id: string) => string,
) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(partnershipExportRows(agreements, stakeholderName)),
    'Agreements',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      obligations.map((item) => ({
        'Agreement reference':
          agreements.find((agreement) => agreement.id === item.agreementId)?.reference ??
          item.agreementId,
        Obligation: item.title,
        Owner: item.owner,
        'Due date': item.dueDate,
        Status: item.status,
        Evidence: item.evidenceReferences.join(' | '),
        'Escalation owner': item.escalationOwner ?? '',
      })),
    ),
    'Obligations',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      reviews.map((item) => ({
        'Agreement reference':
          agreements.find((agreement) => agreement.id === item.agreementId)?.reference ??
          item.agreementId,
        'Review date': item.reviewDate,
        Reviewer: item.reviewer,
        Outcome: item.outcome,
        'Strategic score': item.strategicScore,
        Recommendation: item.renewalRecommendation,
        'Next review': item.nextReviewDate,
      })),
    ),
    'Value reviews',
  );
  return workbook;
}

export function exportPartnershipWorkbook(
  agreements: PartnershipAgreement[],
  obligations: PartnershipObligation[],
  reviews: PartnershipReview[],
  stakeholderName: (id: string) => string,
) {
  XLSX.writeFile(
    createPartnershipWorkbook(agreements, obligations, reviews, stakeholderName),
    's082-partnership-portfolio.xlsx',
  );
}

export interface AgreementDossier {
  agreement: PartnershipAgreement;
  obligations: PartnershipObligation[];
  reviews: PartnershipReview[];
  renewals: PartnershipRenewal[];
  renewalAlerts: PartnershipRenewalAlert[];
  history: PartnershipHistoryEntry[];
}

/** Excel reserves the sheet name "History", so the event log is "Event history". */
export const DOSSIER_SHEETS = ['Agreement', 'Obligations', 'Reviews', 'Renewals', 'Event history'];

/** Keeps an empty sheet self-describing instead of a blank grid with no headers. */
function sheetFrom<T extends Record<string, unknown>>(rows: T[], headers: string[]) {
  return rows.length
    ? XLSX.utils.json_to_sheet(rows, { header: headers })
    : XLSX.utils.aoa_to_sheet([headers]);
}

/**
 * The single-agreement dossier: record, obligations, reviews, renewal history
 * (completed renewals plus the alert schedule) and the event log.
 */
export function createAgreementDossierWorkbook(
  dossier: AgreementDossier,
  stakeholderName: (id: string) => string,
  today = new Date().toISOString().slice(0, 10),
) {
  const { agreement } = dossier;
  const workbook = XLSX.utils.book_new();

  const agreementRows: Array<[string, string | number]> = [
    ['Reference', agreement.reference],
    ['Agreement', agreement.title],
    ['Type', agreement.agreementType],
    ['Status', agreement.status],
    ['Primary stakeholder', stakeholderName(agreement.stakeholderId)],
    ['Parties', agreement.partyStakeholderIds.map(stakeholderName).join(' | ')],
    ['CCP owner', agreement.owner],
    ['Effective date', agreement.effectiveDate ?? ''],
    ['Expiry date', agreement.expiryDate ?? ''],
    ['Value commitment', agreement.valueCommitment],
    ['Deliverables', agreement.deliverables.join(' | ')],
    ['S136 legal reference', agreement.legalContractRef ?? ''],
    ['S003 signed document', agreement.signedDocumentRef ?? ''],
    ['Renewals completed', agreement.renewalCount],
    ['Termination reason', agreement.termination?.reason ?? ''],
    ['Terminated on', agreement.termination?.terminatedAt ?? ''],
    ['Termination approved by', agreement.termination?.approvedBy ?? ''],
    ['Created', agreement.createdAt],
    ['Last updated', agreement.updatedAt],
    ['Dossier generated', today],
  ];
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([['Field', 'Value'], ...agreementRows]),
    'Agreement',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFrom(
      dossier.obligations.map((item) => ({
        Obligation: item.title,
        Description: item.description,
        Owner: item.owner,
        'Due date': item.dueDate,
        Status: effectiveObligationStatus(item, today),
        Evidence: item.evidenceReferences.join(' | '),
        'Reminder lead days': item.reminderLeadDays ?? '',
        'Escalation owner': item.escalationOwner ?? '',
        'Last updated': item.updatedAt,
      })),
      [
        'Obligation',
        'Description',
        'Owner',
        'Due date',
        'Status',
        'Evidence',
        'Reminder lead days',
        'Escalation owner',
        'Last updated',
      ],
    ),
    'Obligations',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFrom(
      [...dossier.reviews]
        .sort((left, right) => right.reviewDate.localeCompare(left.reviewDate))
        .map((item) => ({
          'Review date': item.reviewDate,
          Reviewer: item.reviewer,
          'Period start': item.periodStart,
          'Period end': item.periodEnd,
          Outcome: item.outcome,
          'Strategic score': item.strategicScore,
          'Realised outputs': item.outputs.join(' | '),
          Issues: item.issues.join(' | '),
          Recommendations: item.recommendations.join(' | '),
          'Renewal recommendation': item.renewalRecommendation,
          'Next review': item.nextReviewDate,
          Summary: item.summary,
        })),
      [
        'Review date',
        'Reviewer',
        'Period start',
        'Period end',
        'Outcome',
        'Strategic score',
        'Realised outputs',
        'Issues',
        'Recommendations',
        'Renewal recommendation',
        'Next review',
        'Summary',
      ],
    ),
    'Reviews',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFrom(
      [
        ...dossier.renewals.map((item) => ({
          Record: 'Renewal',
          Date: item.renewedAt.slice(0, 10),
          Detail: item.termsSummary,
          'Previous expiry': item.previousExpiryDate ?? '',
          'New term': `${item.effectiveDate} to ${item.expiryDate}`,
          References: `${item.legalContractRef} | ${item.signedDocumentRef}`,
          Status: 'COMPLETED',
          By: item.renewedBy,
        })),
        ...dossier.renewalAlerts.map((item) => ({
          Record: `${item.milestoneDays}-day renewal alert`,
          Date: item.scheduledFor,
          Detail: item.recipients.join(' | '),
          'Previous expiry': '',
          'New term': '',
          References: item.communicationRef ?? '',
          Status: effectiveRenewalAlertStatus(item, today),
          By: item.acknowledgedBy ?? '',
        })),
      ],
      ['Record', 'Date', 'Detail', 'Previous expiry', 'New term', 'References', 'Status', 'By'],
    ),
    'Renewals',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    sheetFrom(
      [...dossier.history]
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
        .map((item) => ({
          Occurred: item.occurredAt,
          Event: item.action,
          Summary: item.summary,
          Actor: item.actor,
        })),
      ['Occurred', 'Event', 'Summary', 'Actor'],
    ),
    'Event history',
  );

  return workbook;
}

export function dossierFileName(agreement: Pick<PartnershipAgreement, 'reference'>) {
  const slug = agreement.reference.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `s082-dossier-${slug}.xlsx`;
}

export function exportAgreementDossier(
  dossier: AgreementDossier,
  stakeholderName: (id: string) => string,
) {
  XLSX.writeFile(
    createAgreementDossierWorkbook(dossier, stakeholderName),
    dossierFileName(dossier.agreement),
  );
}

export function createMigrationTemplateWorkbook() {
  const sheet = XLSX.utils.json_to_sheet([
    {
      reference: 'CLET/MOU/2025/001',
      title: 'Example legacy agreement',
      stakeholder: 'Ghana Bar Association',
      agreementType: 'MOU',
      status: 'ACTIVE',
      owner: 'Nana Asante',
      effectiveDate: '2025-01-01',
      expiryDate: '2027-12-31',
      valueCommitment: 'Describe the intended partnership value',
      deliverables: 'First deliverable | Second deliverable',
      legalContractRef: 'S136-CTR-2025-0001',
      signedDocumentRef: 'S003-DOC-2025-0001',
    },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Partnerships');
  return workbook;
}

export function downloadMigrationTemplate() {
  XLSX.writeFile(createMigrationTemplateWorkbook(), 's082-migration-template.xlsx');
}
