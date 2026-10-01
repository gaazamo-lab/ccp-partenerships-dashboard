import type {
  ImportPartnershipInput,
  PartnershipAgreement,
  PartnershipStatus,
} from '@partner-crm/types';

export type PartnershipImportSourceRow = Record<string, unknown>;

interface ImportStakeholder {
  id: string;
  name: string;
}

const agreementTypes = new Set(['MOU', 'PARTNERSHIP_AGREEMENT', 'COOPERATION_FRAMEWORK']);
const statuses = new Set<PartnershipStatus>([
  'DRAFT',
  'LEGAL_REVIEW',
  'SIGNATURE_PENDING',
  'ACTIVE',
  'RENEWAL_DUE',
  'EXPIRED',
  'TERMINATED',
]);
const requiredColumns = [
  'reference',
  'title',
  'stakeholder',
  'agreementType',
  'status',
  'owner',
  'valueCommitment',
];

const cell = (row: PartnershipImportSourceRow, key: string) => String(row[key] ?? '').trim();

export function validatePartnershipImportRows(
  sourceRows: PartnershipImportSourceRow[],
  stakeholders: ImportStakeholder[],
) {
  const rows: ImportPartnershipInput[] = [];
  const errors: string[] = [];

  sourceRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowErrors: string[] = [];
    const stakeholderValue = cell(row, 'stakeholder');
    const stakeholder = stakeholders.find(
      (item) =>
        item.id.toLowerCase() === stakeholderValue.toLowerCase() ||
        item.name.toLowerCase() === stakeholderValue.toLowerCase(),
    );
    const type = cell(row, 'agreementType');
    const status = cell(row, 'status') as PartnershipStatus;
    const missing = requiredColumns.filter((key) => !cell(row, key));
    const effectiveDate = cell(row, 'effectiveDate') || null;
    const expiryDate = cell(row, 'expiryDate') || null;

    if (missing.length) rowErrors.push(`missing ${missing.join(', ')}`);
    if (!stakeholder) rowErrors.push('stakeholder must match an existing S081 ID or name');
    if (!agreementTypes.has(type)) rowErrors.push('invalid agreementType');
    if (!statuses.has(status)) rowErrors.push('invalid status');
    if (status === 'TERMINATED')
      rowErrors.push(
        'terminated records require a termination archive and cannot be imported here',
      );
    if (effectiveDate && expiryDate && expiryDate <= effectiveDate)
      rowErrors.push('expiryDate must follow effectiveDate');

    if (rowErrors.length) {
      errors.push(`Row ${rowNumber}: ${rowErrors.join('; ')}.`);
      return;
    }

    rows.push({
      reference: cell(row, 'reference'),
      title: cell(row, 'title'),
      stakeholderId: stakeholder!.id,
      partyStakeholderIds: [stakeholder!.id],
      agreementType: type as ImportPartnershipInput['agreementType'],
      status,
      owner: cell(row, 'owner'),
      effectiveDate,
      expiryDate,
      valueCommitment: cell(row, 'valueCommitment'),
      deliverables: Array.from(
        new Set(
          cell(row, 'deliverables')
            .split('|')
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ),
      legalContractRef: cell(row, 'legalContractRef') || null,
      signedDocumentRef: cell(row, 'signedDocumentRef') || null,
    });
  });

  return { rows, errors };
}

export function partitionPartnershipImports(
  inputs: ImportPartnershipInput[],
  agreements: Pick<PartnershipAgreement, 'reference' | 'stakeholderId' | 'title'>[],
) {
  const existingKeys = new Set(
    agreements.flatMap((item) => [
      item.reference.toLowerCase(),
      `${item.stakeholderId}|${item.title.toLowerCase()}`,
    ]),
  );
  const accepted: ImportPartnershipInput[] = [];
  const errors: string[] = [];

  inputs.forEach((input, index) => {
    const referenceKey = input.reference.toLowerCase();
    const titleKey = `${input.stakeholderId}|${input.title.toLowerCase()}`;
    if (existingKeys.has(referenceKey) || existingKeys.has(titleKey)) {
      errors.push(`Row ${index + 2}: duplicate reference or stakeholder/title combination.`);
      return;
    }
    existingKeys.add(referenceKey);
    existingKeys.add(titleKey);
    accepted.push(input);
  });

  return { accepted, errors };
}
