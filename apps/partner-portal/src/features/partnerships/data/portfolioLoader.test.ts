import { describe, expect, it, vi } from 'vitest';

import type { PartnershipsRepository } from '@partner-crm/api-client';
import type { PartnershipAgreement } from '@partner-crm/types';

import { agreementFixture, obligationFixture, reviewFixture } from '../testFixtures';
import {
  loadPortfolio,
  mapWithConcurrency,
  replaceForAgreement,
  replaceRecord,
} from './portfolioLoader';

function fakeRepository(agreements: PartnershipAgreement[], pageSize = 2) {
  const ok = <T>(data: T) => Promise.resolve({ success: true, data });
  const list = vi.fn((query: { page?: number } = {}) => {
    const page = query.page ?? 1;
    const data = agreements.slice((page - 1) * pageSize, page * pageSize);
    const hasNext = page * pageSize < agreements.length;
    return Promise.resolve({
      success: true,
      data,
      meta: {
        count: agreements.length,
        page,
        pageSize,
        next: hasNext ? `?page=${page + 1}` : null,
        previous: null,
      },
    });
  });
  const repository = {
    list,
    listObligations: (id: string) =>
      ok([obligationFixture({ id: `obl-${id}`, agreementId: id, dueDate: '2020-01-01' })]),
    listReviews: (id: string) => ok([reviewFixture({ id: `rev-${id}`, agreementId: id })]),
    listRenewals: () => ok([]),
    listRenewalAlerts: () => ok([]),
    listHistory: (id: string) =>
      ok([
        {
          id: `h-${id}`,
          agreementId: id,
          action: 'CREATED',
          summary: 'Created',
          actor: 'Server',
          occurredAt: `2026-01-0${id.slice(-1)}T00:00:00Z`,
        },
      ]),
  };
  return { repository: repository as unknown as PartnershipsRepository, list };
}

describe('api-mode portfolio loading', () => {
  it('follows pagination and loads every agreement’s children', async () => {
    const agreements = [1, 2, 3].map((n) => agreementFixture({ id: `a${n}` }));
    const { repository, list } = fakeRepository(agreements);

    const snapshot = await loadPortfolio(repository);

    expect(list).toHaveBeenCalledTimes(2);
    expect(snapshot.agreements.map((item) => item.id)).toEqual(['a1', 'a2', 'a3']);
    expect(snapshot.obligations.map((item) => [item.id, item.status])).toEqual([
      ['obl-a1', 'OVERDUE'],
      ['obl-a2', 'OVERDUE'],
      ['obl-a3', 'OVERDUE'],
    ]);
    expect(snapshot.reviews).toHaveLength(3);
    expect(snapshot.history.map((item) => item.id)).toEqual(['h-a3', 'h-a2', 'h-a1']);
  });

  it('limits concurrency while preserving result order', async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapWithConcurrency([30, 10, 20, 5], 2, async (delay) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, delay));
      inFlight -= 1;
      return delay * 2;
    });

    expect(results).toEqual([60, 20, 40, 10]);
    expect(peak).toBe(2);
  });

  it('replaces optimistic records and per-agreement children with server copies', () => {
    const local = [reviewFixture({ id: 'tmp' }), reviewFixture({ id: 'other', agreementId: 'b' })];

    expect(
      replaceRecord(local, reviewFixture({ id: 'server' }), 'tmp').map((item) => item.id),
    ).toEqual(['server', 'other']);
    expect(replaceRecord(local, reviewFixture({ id: 'new' })).map((item) => item.id)).toEqual([
      'new',
      'tmp',
      'other',
    ]);
    expect(
      replaceForAgreement(local, 'agreement-1', [reviewFixture({ id: 'fresh' })]).map(
        (item) => item.id,
      ),
    ).toEqual(['fresh', 'other']);
  });
});
