import { useMemo, useState } from 'react';

import { Badge, Button, exportToCsv } from '@rfdtech/components';
import { Activity, HeartHandshake, Network, Printer, TrendingUp } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { IntegrationReadinessCard } from '@/features/partnerships/components/IntegrationReadinessCard';
import { exportPartnershipWorkbook } from '@/features/partnerships/dataPortability';
import { effectiveObligationStatus } from '@/features/partnerships/obligations';
import { canManagePartnership } from '@/features/partnerships/permissions';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import { exportStakeholderWorkbook } from '@/features/reports/stakeholderWorkbook';
import {
  compositionByCategory,
  describeCriteria,
  resolveSegmentMembers,
  segmentCounts,
  segmentCriteria,
} from '@/features/segments/resolution';
import {
  EmptyState,
  ExportMenu,
  type ExportOption,
  type Kpi,
  KpiGrid,
  PageHeader,
  PortfolioDonutChart,
  type PortfolioSlice,
  SectionCard,
  TextField,
  formatCount,
  rate,
  useNow,
} from '@/features/shared';
import { ENGAGEMENT_TYPES } from '@/features/stakeholders/constants';
import {
  displayDate,
  engagementVolumeByMonth,
  parseEngagementDate,
  toIsoDate,
  todayIso,
} from '@/features/stakeholders/engagements';
import { canManageStakeholders } from '@/features/stakeholders/permissions';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type { EngagementType, HealthLevel } from '@/features/stakeholders/types';

/**
 * Points each health level contributes to a category's score. These are the
 * reporting weights, not a stored field — a category of all-Strong
 * relationships scores 96, not 100, because "Strong" is the ceiling the
 * portfolio review actually recognises.
 */
const HEALTH_SCORES: Record<HealthLevel, number> = { Strong: 96, Healthy: 82, 'At risk': 48 };

const ENGAGEMENT_LABELS: Record<EngagementType, string> = {
  Meeting: 'Meetings',
  Call: 'Calls',
  Email: 'Emails',
  Correspondence: 'Correspondence',
  Event: 'Events',
  Campaign: 'Campaigns',
  MOU: 'MOU milestones',
};
const MIX_COLOURS: Record<EngagementType, string> = {
  Meeting: 'bg-primary',
  Call: 'bg-info',
  Email: 'bg-primary/50',
  Correspondence: 'bg-foreground-muted',
  Event: 'bg-success',
  Campaign: 'bg-warning',
  MOU: 'bg-error',
};
const RENEWAL_WINDOWS = [30, 90, 180];

/**
 * Categorical slots 1-6 from the design system's validated palette (see
 * PORTFOLIO_BANDS in the dashboard), extended past its first four so each of
 * the stakeholder categories gets its own donut segment. Anything past the
 * sixth slot folds into "Other" rather than crowding the ring or reusing a hue.
 */
const CATEGORY_COLOURS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const OTHER_CATEGORY_COLOUR = '#898781';
const MAX_PIE_SLICES = CATEGORY_COLOURS.length;

function defaultFrom(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 11, 1);
  return toIsoDate(date);
}

export function Component() {
  const { stakeholders, segments } = useCrm();
  const { user } = useAuth();
  const { agreements, obligations, reviews, history } = usePartnerships();
  const canExportPartnerships = canManagePartnership(user?.role, 'export');
  const canExportCrm = canManageStakeholders(user?.role, 'export');
  const now = useNow();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(todayIso);
  const rangeInvalid = Boolean(from && to && from > to);

  const stakeholderName = useMemo(() => {
    const byId = new Map(stakeholders.map((item) => [item.id, item.name]));
    return (id: string) => byId.get(id) ?? id;
  }, [stakeholders]);

  const categories = useMemo(() => {
    const groups = new Map<
      string,
      { name: string; count: number; score: number; engagements: number }
    >();
    for (const stakeholder of stakeholders) {
      const current = groups.get(stakeholder.category) ?? {
        name: stakeholder.category,
        count: 0,
        score: 0,
        engagements: 0,
      };
      groups.set(stakeholder.category, {
        name: stakeholder.category,
        count: current.count + 1,
        score: current.score + HEALTH_SCORES[stakeholder.health],
        engagements: current.engagements + stakeholder.engagements.length,
      });
    }
    return [...groups.values()]
      .map((group) => ({ ...group, health: Math.round(group.score / group.count) }))
      .sort((left, right) => right.count - left.count);
  }, [stakeholders]);

  const portfolioMix = useMemo<PortfolioSlice[]>(() => {
    const top = categories.slice(0, MAX_PIE_SLICES);
    const rest = categories.slice(MAX_PIE_SLICES);

    const slices = top.map((item, index) => ({
      label: item.name,
      count: item.count,
      health: item.health,
      activities: item.engagements,
      color: CATEGORY_COLOURS[index] ?? OTHER_CATEGORY_COLOUR,
    }));

    if (rest.length > 0) {
      const count = rest.reduce((sum, item) => sum + item.count, 0);
      const score = rest.reduce((sum, item) => sum + item.score, 0);
      const activities = rest.reduce((sum, item) => sum + item.engagements, 0);
      slices.push({
        label: `Other (${rest.length})`,
        count,
        health: Math.round(score / count),
        activities,
        color: OTHER_CATEGORY_COLOUR,
      });
    }

    return slices;
  }, [categories]);

  const engagements = useMemo(
    () => stakeholders.flatMap((stakeholder) => stakeholder.engagements),
    [stakeholders],
  );

  /** Engagements inside the selected reporting period. */
  const inRange = useMemo(() => {
    if (rangeInvalid) return [];
    const fromTime = from ? parseEngagementDate(from) : -Infinity;
    const toTime = to ? parseEngagementDate(to) : Infinity;
    return engagements.filter((engagement) => {
      const time = parseEngagementDate(engagement.date);
      return !Number.isNaN(time) && time >= fromTime && time <= toTime;
    });
  }, [engagements, from, to, rangeInvalid]);

  const engagementMix = useMemo(
    () =>
      ENGAGEMENT_TYPES.map((type) => {
        const count = inRange.filter((engagement) => engagement.type === type).length;
        return {
          type,
          name: ENGAGEMENT_LABELS[type],
          count,
          share: Math.round(rate(count, inRange.length)),
        };
      }),
    [inRange],
  );

  const monthly = useMemo(
    () => (rangeInvalid ? [] : engagementVolumeByMonth(engagements, from, to)),
    [engagements, from, to, rangeInvalid],
  );
  const monthlyPeak = Math.max(1, ...monthly.map((item) => item.count));

  const composition = useMemo(
    () =>
      segments.map((segment) => {
        const criteria = segmentCriteria(segment);
        const members = resolveSegmentMembers(criteria, stakeholders);
        return {
          segment,
          rules: describeCriteria(criteria),
          counts: segmentCounts(members),
          byCategory: compositionByCategory(members),
        };
      }),
    [segments, stakeholders],
  );

  const portfolioHealth = useMemo(() => {
    if (stakeholders.length === 0) return 0;
    const total = stakeholders.reduce((sum, item) => sum + HEALTH_SCORES[item.health], 0);
    return Math.round(total / stakeholders.length);
  }, [stakeholders]);

  const renewals = useMemo(() => {
    return RENEWAL_WINDOWS.map((days) => ({
      days,
      count: agreements.filter((item) => {
        if (!item.expiryDate || ['TERMINATED', 'EXPIRED'].includes(item.status)) return false;
        const remaining = Math.ceil((new Date(item.expiryDate).getTime() - now) / 86_400_000);
        return remaining >= 0 && remaining <= days;
      }).length,
    }));
  }, [agreements, now]);

  const obligationStats = useMemo(() => {
    const statuses = obligations.map((obligation) => effectiveObligationStatus(obligation));
    const completed = statuses.filter((status) => status === 'COMPLETED').length;
    return {
      overdue: statuses.filter((status) => status === 'OVERDUE').length,
      completion: Math.round(rate(completed, obligations.length)),
    };
  }, [obligations]);

  const portfolioKpis = useMemo<Kpi[]>(
    () => [
      {
        id: 'active-agreements',
        label: 'Active agreements',
        value: agreements.filter((item) => item.status === 'ACTIVE').length,
        description: `${formatCount(agreements.length)} total S082 records`,
        icon: <Network size={20} aria-hidden />,
      },
      {
        id: 'obligation-completion',
        label: 'Obligation completion',
        value: `${obligationStats.completion}%`,
        description:
          obligationStats.overdue > 0 ? `${obligationStats.overdue} overdue` : 'None overdue',
        icon: <Activity size={20} aria-hidden />,
      },
      {
        id: 'renewals',
        label: 'Renewals within 90 days',
        value: renewals.find((item) => item.days === 90)?.count ?? 0,
        description: `${renewals.find((item) => item.days === 30)?.count ?? 0} within 30 days`,
        icon: <HeartHandshake size={20} aria-hidden />,
      },
      {
        id: 'value-reviews',
        label: 'Value reviews',
        value: reviews.length,
        description: `${reviews.filter((item) => item.outcome === 'NEEDS_ATTENTION').length} need attention`,
        icon: <TrendingUp size={20} aria-hidden />,
      },
    ],
    [agreements, obligationStats, renewals, reviews],
  );

  const relationshipKpis = useMemo<Kpi[]>(
    () => [
      {
        id: 'total-portfolio',
        label: 'Total portfolio',
        value: stakeholders.length,
        description: `${categories.length} stakeholder categories`,
        icon: <Network size={20} aria-hidden />,
      },
      {
        id: 'engagements',
        label: 'Engagements in period',
        value: inRange.length,
        description: `${formatCount(engagements.length)} recorded in total`,
        icon: <Activity size={20} aria-hidden />,
      },
      {
        id: 'relationship-health',
        label: 'Relationship health',
        value: `${portfolioHealth}%`,
        description: 'Portfolio average',
        icon: <HeartHandshake size={20} aria-hidden />,
      },
    ],
    [stakeholders.length, categories.length, inRange.length, engagements.length, portfolioHealth],
  );

  const exportOptions = useMemo<ExportOption[]>(
    () => [
      {
        id: 's081-workbook',
        label: 'S081 CRM workbook',
        description: 'Stakeholders, contacts, engagements, segments and pipeline as Excel',
        onSelect: () => exportStakeholderWorkbook(stakeholders, segments),
        disabled: !canExportCrm,
      },
      {
        id: 's081-csv',
        label: 'S081 relationship report',
        description: 'One row per stakeholder, with health, pipeline and engagement counts',
        disabled: !canExportCrm,
        onSelect: () =>
          exportToCsv(
            stakeholders,
            [
              { header: 'Stakeholder', accessor: (row) => row.name },
              { header: 'Category', accessor: (row) => row.category },
              { header: 'Owner', accessor: (row) => row.owner },
              { header: 'Status', accessor: (row) => row.status },
              { header: 'Pipeline stage', accessor: (row) => row.pipelineStage },
              { header: 'Health', accessor: (row) => row.health },
              { header: 'Engagements', accessor: (row) => row.engagements.length },
              { header: 'Last engagement', accessor: (row) => displayDate(row.lastEngagement) },
            ],
            's081-relationship-report.csv',
          ),
      },
      {
        id: 's082-workbook',
        label: 'S082 partnerships workbook',
        description: 'Agreements, obligations and value reviews as Excel',
        disabled: !canExportPartnerships,
        onSelect: () =>
          exportPartnershipWorkbook(agreements, obligations, reviews, stakeholderName),
      },
      {
        id: 's082-audit',
        label: 'S082 audit history',
        description: 'Every recorded lifecycle event, with actor and timestamp',
        disabled: !canExportPartnerships,
        onSelect: () =>
          exportToCsv(
            history,
            [
              {
                header: 'Agreement',
                accessor: (row) =>
                  agreements.find((item) => item.id === row.agreementId)?.reference ??
                  row.agreementId,
              },
              { header: 'Event', accessor: (row) => row.action },
              { header: 'Summary', accessor: (row) => row.summary },
              { header: 'Actor', accessor: (row) => row.actor },
              { header: 'Occurred at', accessor: (row) => row.occurredAt },
            ],
            's082-audit-history.csv',
          ),
      },
    ],
    [
      agreements,
      obligations,
      reviews,
      stakeholders,
      segments,
      history,
      stakeholderName,
      canExportCrm,
      canExportPartnerships,
    ],
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Relationship reporting"
        // description="Current portfolio health, engagement volume, and segment composition — computed from live CRM data when the page opens."
        meta={
          <>
            {/* <Badge variant="primary">Combined S081 + S082 portfolio</Badge> */}
            {/* <Badge variant="outline">Generated {displayDate(todayIso())}</Badge> */}
          </>
        }
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => window.print()}
              title="Use your browser's “Save as PDF” destination for a PDF copy."
            >
              <Printer size={16} aria-hidden /> Print / PDF
            </Button>
            <ExportMenu
              options={exportOptions}
              disabled={!canExportCrm && !canExportPartnerships}
            />
          </>
        }
      />

      <KpiGrid kpis={portfolioKpis} />

      <SectionCard
        title="S082 renewal horizon"
        // description="Agreements expiring in each governance window"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {renewals.map((item) => (
            <div key={item.days} className="rounded-xl bg-surface-subtle p-4">
              <p className="text-2xl font-bold tabular-nums text-foreground">{item.count}</p>
              <p className="mt-1 text-sm text-foreground-muted">Within {item.days} days</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <IntegrationReadinessCard />

      <SectionCard
        title="Reporting period"
        // description="Applies to engagement volume and mix below"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
          <TextField
            label="From"
            type="date"
            value={from}
            max={to || undefined}
            onChange={setFrom}
            error={rangeInvalid ? 'Start must be on or before the end date.' : undefined}
          />
          <TextField label="To" type="date" value={to} min={from || undefined} onChange={setTo} />
        </div>
      </SectionCard>

      <KpiGrid kpis={relationshipKpis} columns={3} />

      <SectionCard
        title="Engagement volume by month"
        // description={
        // from || to
        // ? `${from ? displayDate(from) : 'Earliest'} – ${to ? displayDate(to) : 'latest'}`
        // : 'All recorded engagement'
        // }
      >
        {monthly.length === 0 ? (
          <EmptyState
            message="No engagement in this period"
            hint="Widen the reporting period, or log engagements from a stakeholder profile."
          />
        ) : (
          <div
            className="flex h-48 items-end gap-2"
            role="img"
            aria-label={`Engagements per month: ${monthly.map((item) => `${item.label} ${item.count}`).join(', ')}`}
          >
            {monthly.map((item) => (
              <div key={item.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold tabular-nums text-foreground">
                  {item.count || ''}
                </span>
                <div
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${Math.max(2, (item.count / monthlyPeak) * 140)}px` }}
                />
                <span className="truncate text-[11px] text-foreground-muted">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <SectionCard
          title="Portfolio by category"
          // description="Health score and recorded activity"
        >
          {categories.length === 0 ? (
            <EmptyState
              message="No stakeholders to report on"
              hint="Category health appears once organisations are on the register."
            />
          ) : (
            <PortfolioDonutChart data={portfolioMix} />
          )}
        </SectionCard>

        <SectionCard title="Engagement mix" /* description="Engagements in the reporting period" */>
          {inRange.length === 0 ? (
            <EmptyState
              message="No engagements in this period"
              hint="Meetings, calls, events and campaigns logged against a stakeholder appear here."
            />
          ) : (
            <div className="space-y-3">
              {engagementMix.map(({ type, name, count, share }) => (
                <div
                  key={type}
                  className="flex items-center gap-3 rounded-xl bg-surface-subtle p-3"
                >
                  <span className={`size-3 shrink-0 rounded-full ${MIX_COLOURS[type]}`} />
                  <span className="flex-1 text-sm font-semibold text-foreground">{name}</span>
                  <span className="text-sm tabular-nums text-foreground-muted">{count}</span>
                  <span className="w-10 text-right text-sm font-bold tabular-nums text-foreground">
                    {share}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Segment composition"
        // description="Current members of each audience segment, by stakeholder category"
      >
        {composition.length === 0 ? (
          <EmptyState
            message="No segments defined"
            hint="Create a segment to see who S075 and S088 would reach."
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {composition.map(({ segment, rules, counts, byCategory }) => (
              <div key={segment.id} className="flex flex-col gap-2 py-4 md:flex-row md:items-start">
                <div className="min-w-0 md:w-72">
                  <p className="font-semibold text-foreground">{segment.name}</p>
                  <p className="text-xs text-foreground-muted">{rules}</p>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {byCategory.length === 0 ? (
                    <span className="text-sm text-foreground-muted">No current members</span>
                  ) : (
                    byCategory.map((item) => (
                      <Badge key={item.category} variant="default">
                        {item.category} · {item.count}
                      </Badge>
                    ))
                  )}
                </div>
                <div className="text-sm tabular-nums text-foreground-muted md:text-right">
                  <span className="font-bold text-foreground">{formatCount(counts.members)}</span>{' '}
                  members · {Math.round(rate(counts.consented, counts.members))}% consented
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </section>
  );
}
