import { useMemo } from 'react';
import { Link } from 'react-router';

import { Badge } from '@rfdtech/components';
import { AlertTriangle, CalendarDays, Gift, ListChecks, Mail, ShieldCheck } from 'lucide-react';

import {
  EmptyState,
  type Kpi,
  KpiGrid,
  PageHeader,
  SectionCard,
  filterLink,
  formatDate,
  useNow,
} from '@partner-crm/ui';

import { ROUTES, correspondenceRoute, engagementRoute } from '@/constants/routes';
import { DeadlineBadge, EngagementStatusBadge } from '@/features/international/components/Badges';
import { LoadNotice } from '@/features/international/components/LoadNotice';
import {
  clashSummary,
  correspondenceDeadlineState,
  engagementStage,
  findClashes,
  isUpcomingVisit,
  openMandatoryFollowUps,
} from '@/features/international/domain';
import { formatRange } from '@/features/international/format';
import { useIr } from '@/features/international/state/useIr';
import { TABLE } from '@/features/international/tables';

export function Component() {
  const { engagements, correspondence, gifts, loading } = useIr();
  const now = useNow();

  const upcoming = useMemo(
    () =>
      engagements
        .filter((item) => isUpcomingVisit(item, now))
        .sort((left, right) => left.startAt.localeCompare(right.startAt)),
    [engagements, now],
  );
  const clashes = useMemo(() => findClashes(engagements), [engagements]);
  const dueSoon = useMemo(
    () =>
      correspondence
        .filter((item) => {
          const state = correspondenceDeadlineState(item, now);
          return state === 'OVERDUE' || state === 'DUE_SOON';
        })
        .sort((left, right) =>
          (left.responseDeadline ?? '').localeCompare(right.responseDeadline ?? ''),
        ),
    [correspondence, now],
  );

  const kpis = useMemo<Kpi[]>(() => {
    const awaiting = engagements.filter(
      (item) => engagementStage(item.status) === 'AWAITING_APPROVAL',
    ).length;
    const overdue = correspondence.filter(
      (item) => correspondenceDeadlineState(item, now) === 'OVERDUE',
    ).length;
    const followUps = engagements.reduce(
      (sum, item) => sum + openMandatoryFollowUps(item).length,
      0,
    );
    const flags = gifts.filter(
      (gift) => gift.s011Status === 'PENDING' || gift.s011Status === 'FAILED',
    );
    return [
      {
        id: 'upcoming',
        label: 'Upcoming in 30 days',
        value: upcoming.length,
        description: 'Visits, calls and conferences',
        icon: <CalendarDays size={20} aria-hidden />,
        to: filterLink(ROUTES.ENGAGEMENTS, TABLE.ENGAGEMENTS, { timing: 'NEXT_30_DAYS' }),
      },
      {
        id: 'awaiting',
        label: 'Awaiting approval',
        value: awaiting,
        description: 'Submitted or under review',
        icon: <ShieldCheck size={20} aria-hidden />,
        to: filterLink(ROUTES.ENGAGEMENTS, TABLE.ENGAGEMENTS, { stage: 'AWAITING_APPROVAL' }),
      },
      {
        id: 'overdue',
        label: 'Overdue correspondence',
        value: overdue,
        description: 'Response deadline passed',
        icon: <Mail size={20} aria-hidden />,
        to: filterLink(ROUTES.CORRESPONDENCE, TABLE.CORRESPONDENCE, { deadline: 'OVERDUE' }),
      },
      {
        id: 'follow-ups',
        label: 'Open mandatory follow-ups',
        value: followUps,
        description: 'Block engagement closure',
        icon: <ListChecks size={20} aria-hidden />,
        to: filterLink(ROUTES.FOLLOW_UPS, TABLE.FOLLOW_UPS, { mandatory: 'YES' }),
      },
      {
        id: 's011',
        label: 'S011 flags pending/failed',
        value: flags.length,
        description: `${flags.filter((gift) => gift.s011Status === 'FAILED').length} failed · retry from the register`,
        icon: <Gift size={20} aria-hidden />,
        to: filterLink(ROUTES.GIFTS, TABLE.GIFTS, { attention: 'YES' }),
      },
    ];
  }, [engagements, correspondence, gifts, upcoming.length, now]);

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="International relations"
        // description="Engagements, protocol, diplomatic correspondence and official gifts."
        meta={<Badge variant="outline">System S083</Badge>}
      />
      <LoadNotice />
      <KpiGrid kpis={kpis} columns={5} loading={loading} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
        <SectionCard
          title="Upcoming engagements"
          // description="Starting in the next 30 days"
          actions={
            <Link to={ROUTES.CALENDAR} className="text-sm font-medium text-primary hover:underline">
              Open calendar
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState
              message="Nothing scheduled in the next 30 days"
              hint="Register a visit or courtesy call from the Engagements page."
              icon={<CalendarDays size={22} aria-hidden />}
            />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <Link
                    to={engagementRoute(item.id)}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="block text-xs text-foreground-muted">
                        {formatRange(item.startAt, item.endAt, item.timeZone)} ·{' '}
                        {item.host || 'Host not set'}
                      </span>
                    </span>
                    <EngagementStatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <div className="flex flex-col gap-6">
          <SectionCard title="Clash warnings" /* description="Overlaps sharing a host or venue" */>
            {clashes.length === 0 ? (
              <p className="text-sm text-foreground-muted">
                No clashes. Hosts and venues are free of overlaps.
              </p>
            ) : (
              <ul className="space-y-2">
                {clashes.map((clash) => (
                  <li
                    key={`${clash.first.id}-${clash.second.id}`}
                    className="flex gap-2 rounded-lg border border-error/30 bg-error/5 p-3 text-sm"
                  >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-error" aria-hidden />
                    <span>
                      <Link
                        to={engagementRoute(clash.first.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {clash.first.title}
                      </Link>{' '}
                      and{' '}
                      <Link
                        to={engagementRoute(clash.second.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {clash.second.title}
                      </Link>
                      <span className="block text-xs text-foreground-muted">
                        {clashSummary(clash)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Correspondence due" /* description="Overdue or due within 7 days" */>
            {dueSoon.length === 0 ? (
              <p className="text-sm text-foreground-muted">No responses due this week.</p>
            ) : (
              <ul className="divide-y divide-border">
                {dueSoon.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={correspondenceRoute(item.id)}
                      className="flex items-center justify-between gap-3 py-2.5"
                    >
                      <span className="min-w-0">
                        <span
                          className="block truncate text-sm font-medium text-foreground"
                          dir="auto"
                        >
                          {item.subject}
                        </span>
                        <span className="block text-xs text-foreground-muted">
                          {item.reference} · due {formatDate(item.responseDeadline)} · {item.owner}
                        </span>
                      </span>
                      <DeadlineBadge state={correspondenceDeadlineState(item, now)} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </section>
  );
}
