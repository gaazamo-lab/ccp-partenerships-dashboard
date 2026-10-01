import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import {
  DOSSIER_SHEETS,
  createAgreementDossierWorkbook,
  createMigrationTemplateWorkbook,
  createPartnershipWorkbook,
  dossierFileName,
  partnershipExportRows,
} from './dataPortability';
import { createRenewalAlerts } from './renewalAlerts';
import { agreementFixture, obligationFixture, reviewFixture } from './testFixtures';

describe('partnership exports', () => {
  it('maps agreements to stable, human-readable CSV fields', () => {
    const rows = partnershipExportRows(
      [agreementFixture({ effectiveDate: null, signedDocumentRef: null })],
      () => 'Ghana Bar Association',
    );

    expect(rows).toEqual([
      expect.objectContaining({
        Reference: 'CLET/MOU/2026/001',
        Stakeholder: 'Ghana Bar Association',
        'Effective date': '',
        'Signed document': '',
        Deliverables: 'Annual programme',
      }),
    ]);
  });

  it('creates a three-sheet portfolio workbook with linked agreement references', () => {
    const workbook = createPartnershipWorkbook(
      [agreementFixture()],
      [obligationFixture()],
      [reviewFixture()],
      () => 'Ghana Bar Association',
    );

    expect(workbook.SheetNames).toEqual(['Agreements', 'Obligations', 'Value reviews']);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Obligations!)).toEqual([
      expect.objectContaining({ 'Agreement reference': 'CLET/MOU/2026/001' }),
    ]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Value reviews']!)).toEqual([
      expect.objectContaining({ Recommendation: 'RENEW', 'Strategic score': 4 }),
    ]);
  });

  it('creates a five-sheet agreement dossier with headers even on empty sheets', () => {
    const workbook = createAgreementDossierWorkbook(
      {
        agreement: agreementFixture(),
        obligations: [obligationFixture({ dueDate: '2026-01-01' })],
        reviews: [reviewFixture()],
        renewals: [],
        renewalAlerts: createRenewalAlerts(
          'agreement-1',
          '2027-01-01',
          ['a@clet.gov.gh'],
          '2026-01-01',
        ),
        history: [],
      },
      () => 'Ghana Bar Association',
      '2026-09-26',
    );

    expect(workbook.SheetNames).toEqual(DOSSIER_SHEETS);
    const fields = XLSX.utils.sheet_to_json<{ Field: string; Value: string }>(
      workbook.Sheets.Agreement!,
    );
    expect(fields).toContainEqual({ Field: 'Primary stakeholder', Value: 'Ghana Bar Association' });
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Obligations!)).toEqual([
      expect.objectContaining({ Status: 'OVERDUE' }),
    ]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets.Renewals!)).toHaveLength(3);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Event history']!, { header: 1 })).toEqual([
      ['Occurred', 'Event', 'Summary', 'Actor'],
    ]);
    expect(dossierFileName(agreementFixture())).toBe('s082-dossier-CLET-MOU-2026-001.xlsx');
  });

  it('provides the required migration-template columns', () => {
    const workbook = createMigrationTemplateWorkbook();
    const [row] = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets.Partnerships!);

    expect(row).toMatchObject({
      reference: 'CLET/MOU/2025/001',
      stakeholder: 'Ghana Bar Association',
      agreementType: 'MOU',
      status: 'ACTIVE',
    });
  });
});
