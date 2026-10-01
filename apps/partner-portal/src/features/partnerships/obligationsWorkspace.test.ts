import { describe, expect, it } from 'vitest';

import {
  isDueWithin,
  obligationSummary,
  obligationWorkspaceRows,
  parseDueWithin,
} from './obligationsWorkspace';
import { agreementFixture, obligationFixture } from './testFixtures';

const TODAY = '2026-09-26';

describe('obligations workspace', () => {
  const agreements = [agreementFixture({ id: 'a', reference: 'CLET/MOU/2026/001' })];
  const rows = obligationWorkspaceRows(
    [
      obligationFixture({ id: 'late', agreementId: 'a', dueDate: '2026-09-20' }),
      obligationFixture({ id: 'week', agreementId: 'a', dueDate: '2026-10-01' }),
      obligationFixture({ id: 'month', agreementId: 'a', dueDate: '2026-10-20' }),
      obligationFixture({
        id: 'done',
        agreementId: 'a',
        dueDate: '2026-09-01',
        status: 'COMPLETED',
        evidenceReferences: ['S003-DOC-2026-0001'],
      }),
      obligationFixture({ id: 'orphan', agreementId: 'missing', dueDate: '2027-03-01' }),
    ],
    agreements,
    TODAY,
  );

  it('derives effective status, days to due, evidence count and the agreement link', () => {
    expect(rows.map((row) => [row.id, row.status, row.daysToDue])).toEqual([
      ['done', 'COMPLETED', -25],
      ['late', 'OVERDUE', -6],
      ['week', 'NOT_STARTED', 5],
      ['month', 'NOT_STARTED', 24],
      ['orphan', 'NOT_STARTED', 156],
    ]);
    expect(rows[0]).toMatchObject({ evidenceCount: 1, agreementReference: 'CLET/MOU/2026/001' });
    expect(rows.at(-1)?.agreementTitle).toBe('Unknown agreement');
  });

  it('filters open obligations due within a window, including overdue ones', () => {
    expect(rows.filter((row) => isDueWithin(row, 7)).map((row) => row.id)).toEqual([
      'late',
      'week',
    ]);
    expect(rows.filter((row) => isDueWithin(row, 30)).map((row) => row.id)).toEqual([
      'late',
      'week',
      'month',
    ]);
    expect(parseDueWithin('30')).toBe(30);
    expect(parseDueWithin('45')).toBeNull();
    expect(parseDueWithin(null)).toBeNull();
  });

  it('summarises overdue and upcoming obligations for the KPI tiles', () => {
    expect(obligationSummary(rows)).toEqual({
      overdue: 1,
      dueIn7: 2,
      dueIn30: 3,
      open: 4,
      missingEvidence: 0,
    });
  });
});
