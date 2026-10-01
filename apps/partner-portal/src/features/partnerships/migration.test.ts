import { describe, expect, it } from 'vitest';

import { partitionPartnershipImports, validatePartnershipImportRows } from './migration';
import { agreementFixture, importFixture } from './testFixtures';

describe('partnership migration', () => {
  it('maps a valid row to the S082 import contract and de-duplicates deliverables', () => {
    const result = validatePartnershipImportRows(
      [
        {
          reference: ' CLET/MOU/2025/010 ',
          title: 'Imported partnership',
          stakeholder: 'Ghana Bar Association',
          agreementType: 'MOU',
          status: 'ACTIVE',
          owner: 'Nana Asante',
          effectiveDate: '2025-01-01',
          expiryDate: '2027-01-01',
          valueCommitment: 'Joint delivery',
          deliverables: 'Programme | Report | Programme',
        },
      ],
      [{ id: 'stakeholder-1', name: 'Ghana Bar Association' }],
    );

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      reference: 'CLET/MOU/2025/010',
      stakeholderId: 'stakeholder-1',
      partyStakeholderIds: ['stakeholder-1'],
      deliverables: ['Programme', 'Report'],
    });
  });

  it('rejects unresolved stakeholders, invalid states, and reversed dates', () => {
    const result = validatePartnershipImportRows(
      [
        {
          reference: 'LEGACY-1',
          title: 'Invalid import',
          stakeholder: 'Unknown partner',
          agreementType: 'LETTER',
          status: 'TERMINATED',
          owner: 'Nana Asante',
          effectiveDate: '2027-01-01',
          expiryDate: '2026-01-01',
          valueCommitment: 'Value',
        },
      ],
      [],
    );

    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toContain('stakeholder must match');
    expect(result.errors[0]).toContain('invalid agreementType');
    expect(result.errors[0]).toContain('termination archive');
    expect(result.errors[0]).toContain('expiryDate must follow effectiveDate');
  });

  it('skips duplicates against existing records and earlier rows in the same batch', () => {
    const existing = agreementFixture({ reference: 'CLET/MOU/2025/010' });
    const duplicateReference = importFixture();
    const accepted = importFixture({ reference: 'CLET/MOU/2025/011', title: 'Another agreement' });
    const duplicateBatchTitle = importFixture({
      reference: 'CLET/MOU/2025/012',
      title: 'Another agreement',
    });
    const result = partitionPartnershipImports(
      [duplicateReference, accepted, duplicateBatchTitle],
      [existing],
    );

    expect(result.accepted).toEqual([accepted]);
    expect(result.errors).toHaveLength(2);
  });
});
