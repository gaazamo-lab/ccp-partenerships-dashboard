import { Badge } from '@rfdtech/components';
import { CheckCircle2, Target, TrendingDown, TrendingUp } from 'lucide-react';

import type { PartnershipAgreement, PartnershipReview } from '@partner-crm/types';

import { realisedOutputs, strategicScoreTrend } from '@/features/partnerships/valueRealisation';
import { SectionCard, formatDate } from '@/features/shared';

/**
 * Value committed at signature beside what reviews say was realised, plus the
 * strategic-score trend across reviews.
 */
export function ValueRealisationCard({
  agreement,
  reviews,
}: {
  agreement: PartnershipAgreement;
  reviews: PartnershipReview[];
}) {
  const trend = strategicScoreTrend(reviews);
  const outputs = realisedOutputs(reviews);

  return (
    <SectionCard
      title="Value committed vs realised"
      // description="What the agreement promised, what reviews recorded, and how its strategic value is trending."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(14rem,0.8fr)]">
        <div className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground-muted">
            <Target size={14} aria-hidden /> Committed
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">{agreement.valueCommitment}</p>
          <ul className="mt-3 space-y-1 text-sm text-foreground-muted">
            {agreement.deliverables.map((deliverable) => (
              <li key={deliverable} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>{deliverable}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-foreground-muted">
            <CheckCircle2 size={14} aria-hidden /> Realised ({outputs.length})
          </p>
          {outputs.length ? (
            <ul className="mt-2 space-y-2 text-sm text-foreground">
              {outputs.map((item) => (
                <li key={`${item.reviewDate}-${item.output}`} className="flex gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" aria-hidden />
                  <span>
                    {item.output}
                    <span className="block text-xs text-foreground-muted">
                      Review of {formatDate(item.reviewDate)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-foreground-muted">
              No realised outputs yet. Record a review to capture what the partnership delivered.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface-subtle p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-foreground-muted">
              Strategic score trend
            </p>
            {trend.change === null ? null : trend.change > 0 ? (
              <Badge variant="success">
                <TrendingUp size={12} aria-hidden /> +{trend.change}
              </Badge>
            ) : trend.change < 0 ? (
              <Badge variant="error">
                <TrendingDown size={12} aria-hidden /> {trend.change}
              </Badge>
            ) : (
              <Badge variant="outline">No change</Badge>
            )}
          </div>
          {trend.points.length ? (
            <>
              <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
                {trend.latest?.score} <span className="text-sm text-foreground-muted">/ 5</span>
              </p>
              <div
                className="mt-3 flex h-20 items-end gap-2"
                role="img"
                aria-label={`Strategic scores: ${trend.points
                  .map((point) => `${formatDate(point.reviewDate)} ${point.score} of 5`)
                  .join(', ')}`}
              >
                {trend.points.map((point) => (
                  <div
                    key={point.reviewId}
                    className="flex h-full flex-1 flex-col justify-end"
                    title={`${formatDate(point.reviewDate)}: ${point.score} / 5`}
                  >
                    <div
                      className="w-full rounded-t bg-primary"
                      style={{ height: `${(point.score / 5) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-2 text-[10px] text-foreground-muted">
                {trend.points.map((point) => (
                  <span key={point.reviewId} className="flex-1 truncate text-center">
                    {point.reviewDate.slice(0, 7)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-foreground-muted">
              The trend appears once the first review is recorded.
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
