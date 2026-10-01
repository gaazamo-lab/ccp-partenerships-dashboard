import { describe, expect, it } from 'vitest';

import {
  buildMilestones,
  eventsInMonth,
  filterMilestones,
  groupByDate,
  monthGrid,
  monthKey,
  shiftMonth,
} from './calendar';
import { createRenewalAlerts } from './renewalAlerts';
import { agreementFixture, obligationFixture, reviewFixture } from './testFixtures';

const TODAY = '2026-09-26';

function portfolio() {
  const active = agreementFixture({
    id: 'a',
    reference: 'CLET/MOU/2026/001',
    status: 'ACTIVE',
    owner: 'Nana Asante',
    effectiveDate: '2026-01-01',
    expiryDate: '2027-01-01',
  });
  const terminated = agreementFixture({
    id: 't',
    reference: 'CLET/MOU/2026/009',
    status: 'TERMINATED',
    expiryDate: '2027-02-01',
  });
  const alerts = createRenewalAlerts('a', '2027-01-01', [], TODAY);
  alerts[0] = { ...alerts[0]!, status: 'CANCELLED' };
  return {
    agreements: [active, terminated],
    obligations: [
      obligationFixture({ id: 'o1', agreementId: 'a', owner: 'Ama Owusu', dueDate: '2026-10-01' }),
      obligationFixture({ id: 'o2', agreementId: 't', dueDate: '2026-10-05' }),
    ],
    reviews: [
      reviewFixture({ agreementId: 'a', reviewDate: '2026-06-01', nextReviewDate: '2026-12-15' }),
    ],
    renewalAlerts: [...alerts, ...createRenewalAlerts('t', '2027-02-01', [], TODAY)],
  };
}

describe('milestone calendar aggregation', () => {
  it('aggregates expiries, live renewal alerts, obligations and next reviews in date order', () => {
    const events = buildMilestones(portfolio(), TODAY);

    expect(events.map((event) => [event.kind, event.date])).toEqual([
      ['OBLIGATION', '2026-10-01'],
      ['RENEWAL_ALERT', '2026-10-03'],
      ['RENEWAL_ALERT', '2026-12-02'],
      ['REVIEW', '2026-12-15'],
      ['EXPIRY', '2027-01-01'],
    ]);
    expect(events.every((event) => event.agreementId === 'a')).toBe(true);
    expect(events.find((event) => event.kind === 'OBLIGATION')?.owner).toBe('Ama Owusu');
    expect(events.find((event) => event.kind === 'EXPIRY')?.owner).toBe('Nana Asante');
  });

  it('schedules a first review twelve months after activation when none is recorded', () => {
    const events = buildMilestones({ ...portfolio(), reviews: [] }, TODAY);

    expect(events.find((event) => event.kind === 'REVIEW')).toMatchObject({
      date: '2027-01-01',
      label: 'First value review due',
    });
  });

  it('filters by kind and owner', () => {
    const events = buildMilestones(portfolio(), TODAY);

    expect(filterMilestones(events, { kinds: ['EXPIRY', 'REVIEW'] })).toHaveLength(2);
    expect(filterMilestones(events, { owner: 'Ama Owusu' }).map((event) => event.kind)).toEqual([
      'OBLIGATION',
    ]);
    expect(filterMilestones(events, {})).toHaveLength(events.length);
  });

  it('selects and groups the events of one month', () => {
    const events = buildMilestones(portfolio(), TODAY);
    const december = eventsInMonth(events, 2026, 11);

    expect(december.map((event) => event.date)).toEqual(['2026-12-02', '2026-12-15']);
    expect([...groupByDate(december).keys()]).toEqual(['2026-12-02', '2026-12-15']);
  });

  it('navigates months across year boundaries', () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
    expect(monthKey(2026, 8)).toBe('2026-09');
  });

  it('builds Monday-first weeks padded with adjacent-month days', () => {
    const grid = monthGrid(2026, 8); // September 2026 starts on a Tuesday.

    expect(grid).toHaveLength(5);
    expect(grid[0]?.[0]).toEqual({ date: '2026-08-31', day: 31, inMonth: false });
    expect(grid[0]?.[1]).toEqual({ date: '2026-09-01', day: 1, inMonth: true });
    expect(grid.at(-1)?.at(-1)).toEqual({ date: '2026-10-04', day: 4, inMonth: false });
    expect(grid.flat().filter((day) => day.inMonth)).toHaveLength(30);
  });
});
