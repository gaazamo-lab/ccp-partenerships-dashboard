import { describe, expect, it } from 'vitest';

import { validatePartnershipReview } from './reviewValidation';
import { reviewFixture } from './testFixtures';

describe('value-realisation review validation', () => {
  it('accepts a complete structured review', () => {
    const { id: _id, agreementId: _agreementId, ...review } = reviewFixture();
    expect(validatePartnershipReview(review)).toEqual([]);
  });

  it('reports missing evidence and invalid review dates', () => {
    const {
      id: _id,
      agreementId: _agreementId,
      ...review
    } = reviewFixture({
      reviewDate: '2026-08-01',
      periodStart: '2026-07-31',
      periodEnd: '2025-08-01',
      outputs: [],
      recommendations: [],
      nextReviewDate: '2026-08-01',
      strategicScore: 6 as 5,
    });
    const errors = validatePartnershipReview(review);

    expect(errors).toContain('Period end must follow the start.');
    expect(errors).toContain('At least one realised output is required.');
    expect(errors).toContain('At least one recommendation is required.');
    expect(errors).toContain('Next review must be after this review.');
    expect(errors).toContain('Strategic score must be between 1 and 5.');
  });
});
