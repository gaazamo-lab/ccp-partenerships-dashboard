import type { PartnershipReview } from '@partner-crm/types';

export interface ScoreTrendPoint {
  reviewId: string;
  reviewDate: string;
  score: PartnershipReview['strategicScore'];
}

export interface ScoreTrend {
  points: ScoreTrendPoint[];
  latest: ScoreTrendPoint | null;
  /** Latest score minus the previous one; null with fewer than two reviews. */
  change: number | null;
}

/** Strategic scores in review order, oldest first, for a simple trend line. */
export function strategicScoreTrend(reviews: PartnershipReview[]): ScoreTrend {
  const points = [...reviews]
    .sort((left, right) => left.reviewDate.localeCompare(right.reviewDate))
    .map((review) => ({
      reviewId: review.id,
      reviewDate: review.reviewDate,
      score: review.strategicScore,
    }));
  const latest = points.at(-1) ?? null;
  const previous = points.at(-2) ?? null;
  return {
    points,
    latest,
    change: latest && previous ? latest.score - previous.score : null,
  };
}

/** Every realised output across reviews, newest review first, without duplicates. */
export function realisedOutputs(reviews: PartnershipReview[]) {
  const seen = new Set<string>();
  const outputs: Array<{ output: string; reviewDate: string }> = [];
  [...reviews]
    .sort((left, right) => right.reviewDate.localeCompare(left.reviewDate))
    .forEach((review) =>
      review.outputs.forEach((output) => {
        const key = output.trim().toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        outputs.push({ output, reviewDate: review.reviewDate });
      }),
    );
  return outputs;
}
