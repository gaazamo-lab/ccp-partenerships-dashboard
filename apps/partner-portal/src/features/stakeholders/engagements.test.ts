import { describe, expect, it } from 'vitest';

import { validateConsent } from '@/features/stakeholders/consent';
import {
  engagementVolumeByMonth,
  filterEngagements,
  latestEngagementDate,
  parseEngagementDate,
  sortEngagements,
} from '@/features/stakeholders/engagements';
import { pipelineMatrix } from '@/features/stakeholders/pipeline';
import { makeStakeholder } from '@/features/stakeholders/testFixtures';
import type { Engagement } from '@/features/stakeholders/types';

function engagement(id: string, date: string, overrides: Partial<Engagement> = {}): Engagement {
  return { id, date, type: 'Meeting', title: id, summary: '', source: 'Partner CRM', ...overrides };
}

describe('engagement dates', () => {
  it('reads ISO dates and the legacy display form as the same local day', () => {
    expect(parseEngagementDate('2026-09-12')).toBe(parseEngagementDate('12 Sep 2026'));
    expect(parseEngagementDate('Not yet engaged')).toBeNaN();
  });

  it('sorts newest first across both formats, undated last', () => {
    const sorted = sortEngagements([
      engagement('a', '02 Aug 2026'),
      engagement('b', 'unknown'),
      engagement('c', '2026-09-12'),
      engagement('d', '2026-08-28'),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['c', 'd', 'a', 'b']);
  });

  it('filters by type and source', () => {
    const list = [
      engagement('a', '2026-09-01', { type: 'Call' }),
      engagement('b', '2026-09-02', { source: 'S078 Events', type: 'Event' }),
    ];
    expect(filterEngagements(list, { type: 'Call' }).map((item) => item.id)).toEqual(['a']);
    expect(filterEngagements(list, { source: 'S078 Events' }).map((item) => item.id)).toEqual([
      'b',
    ]);
    expect(filterEngagements(list, {})).toHaveLength(2);
  });

  it('derives lastEngagement as an ISO date', () => {
    expect(latestEngagementDate([engagement('a', '12 Sep 2026'), engagement('b', '2026-01-01')]))
      .toBe('2026-09-12');
    expect(latestEngagementDate([])).toBe('Not yet engaged');
  });

  it('buckets volume by month inside the range, filling empty months', () => {
    const series = engagementVolumeByMonth(
      [
        engagement('a', '2026-06-18'),
        engagement('b', '2026-08-02'),
        engagement('c', '2026-08-28'),
        engagement('d', '2026-10-01'),
      ],
      '2026-06-01',
      '2026-09-30',
    );
    expect(series.map((item) => [item.month, item.count])).toEqual([
      ['2026-06', 1],
      ['2026-07', 0],
      ['2026-08', 2],
      ['2026-09', 0],
    ]);
  });
});

describe('validateConsent', () => {
  it('requires a date and channel for given or withdrawn consent', () => {
    const errors = validateConsent(
      { consent: 'Withdrawn', consentDate: null, consentChannel: null },
      '2026-09-26',
    );
    expect(errors.consentDate).toBeTruthy();
    expect(errors.consentChannel).toBeTruthy();
  });

  it('rejects future dates and accepts "Not recorded" without detail', () => {
    expect(
      validateConsent(
        { consent: 'Consented', consentDate: '2026-12-01', consentChannel: 'Form' },
        '2026-09-26',
      ).consentDate,
    ).toMatch(/future/);
    expect(
      validateConsent({ consent: 'Not recorded', consentDate: null, consentChannel: null }, '2026-09-26'),
    ).toEqual({});
  });
});

describe('pipelineMatrix', () => {
  it('counts stakeholders by category and stage, dropping empty categories', () => {
    const matrix = pipelineMatrix([
      makeStakeholder({ id: '1', category: 'Donor', pipelineStage: 'Prospect' }),
      makeStakeholder({ id: '2', category: 'Donor', pipelineStage: 'MOU' }),
      makeStakeholder({ id: '3', category: 'Media', pipelineStage: 'Prospect' }),
    ]);
    expect(matrix.rows.map((row) => row.category)).toEqual(['Donor', 'Media']);
    expect(matrix.rows[0]!.counts).toMatchObject({ Prospect: 1, MOU: 1, Engaged: 0 });
    expect(matrix.totals.Prospect).toBe(2);
    expect(matrix.total).toBe(3);
  });
});
