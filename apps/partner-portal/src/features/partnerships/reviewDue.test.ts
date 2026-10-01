import { describe, expect, it } from 'vitest';

import {
  addMonths,
  agreementsWithReviewDue,
  daysBetween,
  latestReview,
  reviewSchedule,
} from './reviewDue';
import { agreementFixture, reviewFixture } from './testFixtures';
import { realisedOutputs, strategicScoreTrend } from './valueRealisation';

describe('review-due computation', () => {
  it('adds calendar months and clamps to the end of shorter months', () => {
    expect(addMonths('2026-08-01', 12)).toBe('2027-08-01');
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28');
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28');
    expect(daysBetween('2026-09-26', '2026-10-03')).toBe(7);
    expect(daysBetween('2026-09-26', '2026-09-20')).toBe(-6);
  });

  it('uses the latest review’s next-review date and flags it when on or before today', () => {
    const agreement = agreementFixture({ status: 'ACTIVE' });
    const reviews = [
      reviewFixture({ id: 'old', reviewDate: '2025-08-01', nextReviewDate: '2026-01-01' }),
      reviewFixture({ id: 'new', reviewDate: '2026-08-01', nextReviewDate: '2026-09-26' }),
    ];

    expect(latestReview(reviews)?.id).toBe('new');
    expect(reviewSchedule(agreement, reviews, '2026-09-25')).toMatchObject({
      dueDate: '2026-09-26',
      basis: 'NEXT_REVIEW_DATE',
      due: false,
      latestReviewId: 'new',
    });
    expect(reviewSchedule(agreement, reviews, '2026-09-26')).toMatchObject({
      due: true,
      daysOverdue: 0,
    });
  });

  it('expects a first review twelve months after activation when none exists', () => {
    const agreement = agreementFixture({ status: 'ACTIVE', effectiveDate: '2025-09-01' });

    expect(reviewSchedule(agreement, [], '2026-09-26')).toMatchObject({
      dueDate: '2026-09-01',
      basis: 'FIRST_REVIEW',
      due: true,
      daysOverdue: 25,
    });
    expect(reviewSchedule(agreement, [], '2026-08-31')?.due).toBe(false);
  });

  it('ignores agreements that are not in force or never activated', () => {
    expect(reviewSchedule(agreementFixture({ status: 'DRAFT' }), [], '2030-01-01')).toBeNull();
    expect(reviewSchedule(agreementFixture({ status: 'TERMINATED' }), [], '2030-01-01')).toBeNull();
    expect(
      reviewSchedule(agreementFixture({ status: 'ACTIVE', effectiveDate: null }), [], '2030-01-01'),
    ).toBeNull();
  });

  it('lists due agreements most overdue first and ignores other agreements’ reviews', () => {
    const agreements = [
      agreementFixture({ id: 'a', status: 'ACTIVE', effectiveDate: '2025-06-01' }),
      agreementFixture({ id: 'b', status: 'RENEWAL_DUE', effectiveDate: '2024-01-01' }),
      agreementFixture({ id: 'c', status: 'ACTIVE', effectiveDate: '2026-01-01' }),
    ];
    const reviews = [
      reviewFixture({ agreementId: 'b', reviewDate: '2026-01-01', nextReviewDate: '2026-03-01' }),
      reviewFixture({ agreementId: 'c', reviewDate: '2026-06-01', nextReviewDate: '2027-06-01' }),
    ];

    expect(
      agreementsWithReviewDue(agreements, reviews, '2026-09-26').map((item) => item.id),
    ).toEqual(['b', 'a']);
  });
});

describe('value realisation', () => {
  it('orders strategic scores oldest first and reports the latest change', () => {
    const trend = strategicScoreTrend([
      reviewFixture({ id: 'r2', reviewDate: '2026-08-01', strategicScore: 4 }),
      reviewFixture({ id: 'r1', reviewDate: '2025-08-01', strategicScore: 2 }),
    ]);

    expect(trend.points.map((point) => point.score)).toEqual([2, 4]);
    expect(trend.latest?.reviewId).toBe('r2');
    expect(trend.change).toBe(2);
    expect(strategicScoreTrend([reviewFixture()]).change).toBeNull();
    expect(strategicScoreTrend([]).latest).toBeNull();
  });

  it('collects realised outputs newest first without duplicates', () => {
    const outputs = realisedOutputs([
      reviewFixture({ reviewDate: '2025-08-01', outputs: ['Programme delivered', 'Old output'] }),
      reviewFixture({ reviewDate: '2026-08-01', outputs: ['New output', 'programme delivered'] }),
    ]);

    expect(outputs.map((item) => item.output)).toEqual([
      'New output',
      'programme delivered',
      'Old output',
    ]);
  });
});
