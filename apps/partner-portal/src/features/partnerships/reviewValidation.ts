import type { UpdatePartnershipReviewInput } from '@partner-crm/types';

export function validatePartnershipReview(input: UpdatePartnershipReviewInput) {
  const errors: string[] = [];
  if (!input.reviewDate) errors.push('Review date is required.');
  if (!input.reviewer.trim()) errors.push('Reviewer is required.');
  if (!input.periodStart || !input.periodEnd) errors.push('Review period is required.');
  if (input.periodStart && input.periodEnd && input.periodEnd < input.periodStart)
    errors.push('Period end must follow the start.');
  if (!input.summary.trim()) errors.push('Executive summary is required.');
  if (!input.outputs.length) errors.push('At least one realised output is required.');
  if (!input.recommendations.length) errors.push('At least one recommendation is required.');
  if (!input.nextReviewDate) errors.push('Next review date is required.');
  if (input.nextReviewDate && input.reviewDate && input.nextReviewDate <= input.reviewDate)
    errors.push('Next review must be after this review.');
  if (input.strategicScore < 1 || input.strategicScore > 5)
    errors.push('Strategic score must be between 1 and 5.');
  return errors;
}
