import { Link } from 'react-router';

import { Badge } from '@rfdtech/components';
import { Award, BarChart3, ShieldCheck } from 'lucide-react';

import { kolProfileRoute } from '@/constants/routes';
import { RiskBadge } from '@/features/kol/components/KolBadges';
import { ENGAGEMENT_TYPE_LABELS } from '@/features/kol/domain';
import type { KolImpactRow, TypeBreakdownRow } from '@/features/kol/impactReport';
import { EmptyState, SectionCard, formatCount } from '@/features/shared';

export function TopContributors({ rows }: { rows: KolImpactRow[] }) {
  const top = rows
    .filter((row) => row.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
  return (
    <SectionCard title="Top contributors" /* description="Highest impact scores (out of 100)" */>
      {top.length === 0 ? (
        <EmptyState
          message="No impact recorded yet"
          hint="Scores appear once engagements are completed, content is published or coverage is logged."
          icon={<Award size={22} aria-hidden />}
        />
      ) : (
        <ol className="space-y-2">
          {top.map((row, index) => (
            <li
              key={row.kolId}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <Link
                  to={kolProfileRoute(row.kolId)}
                  className="block truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {row.name}
                </Link>
                <span className="block text-xs text-foreground-muted">
                  {formatCount(row.reach)} reach · {row.completed} completed · {row.published}{' '}
                  published
                  {row.meanScore === null ? '' : ` · ${row.meanScore}/5`}
                </span>
              </span>
              <span className="text-lg font-bold tabular-nums text-primary">{row.score}</span>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

export function RiskWatchlist({ rows }: { rows: KolImpactRow[] }) {
  const watch = rows
    .filter((row) => row.profile.riskLevel === 'MEDIUM' || row.profile.riskLevel === 'HIGH')
    .sort((left, right) =>
      left.profile.riskLevel === right.profile.riskLevel
        ? right.negativeMentions - left.negativeMentions
        : left.profile.riskLevel === 'HIGH'
          ? -1
          : 1,
    );
  return (
    <SectionCard
      title="Risk watchlist" /* description="Medium and high risk KOLs, with their risk notes" */
    >
      {watch.length === 0 ? (
        <EmptyState
          message="No KOLs on the watchlist"
          hint="KOLs rated medium or high risk will be listed here."
          icon={<ShieldCheck size={22} aria-hidden />}
        />
      ) : (
        <ul className="space-y-3">
          {watch.map((row) => (
            <li key={row.kolId} className="rounded-lg border border-border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={kolProfileRoute(row.kolId)}
                  className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {row.name}
                </Link>
                <RiskBadge level={row.profile.riskLevel} />
                {row.negativeMentions > 0 ? (
                  <Badge variant="error" size="sm">
                    {row.negativeMentions} negative mention{row.negativeMentions === 1 ? '' : 's'}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-foreground-muted">{row.profile.riskNotes}</p>
              <p className="mt-1 text-xs text-foreground-muted">Owner: {row.owner}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function EngagementTypeBreakdown({ rows }: { rows: TypeBreakdownRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  return (
    <SectionCard
      title="Engagement type breakdown" /* description="All engagements by type, with completion and mean score" */
    >
      {rows.length === 0 ? (
        <EmptyState
          message="No engagements yet"
          hint="Plan engagements from the outreach planner or a KOL profile."
          icon={<BarChart3 size={22} aria-hidden />}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.type}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">
                  {ENGAGEMENT_TYPE_LABELS[row.type]}
                </span>
                <span className="text-xs text-foreground-muted">
                  {row.total} total · {row.completed} completed · {row.open} open
                  {row.meanScore === null ? '' : ` · ${row.meanScore}/5`}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-subtle" aria-hidden>
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.total / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
