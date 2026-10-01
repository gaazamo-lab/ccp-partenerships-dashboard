import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import {
  Badge,
  Button,
  Timeline,
  TimelineData,
  TimelineFooter,
  TimelineItem,
  TimelineTitle,
} from '@rfdtech/components';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleAlert,
  FileSignature,
  HeartHandshake,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import type { PartnershipAgreement } from '@partner-crm/types';

import { ROUTES, stakeholderProfileRoute } from '@/constants/routes';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import {
  EmptyState,
  type Kpi,
  KpiGrid,
  PageHeader,
  PortfolioDonutChart,
  SectionCard,
  filterLink,
  rate,
  useNow,
} from '@/features/shared';
import { PIPELINE_STAGES } from '@/features/stakeholders/constants';
import { displayDate, sortEngagements } from '@/features/stakeholders/engagements';
import { permissionHint } from '@/features/stakeholders/permissions';
import { pipelineMatrix } from '@/features/stakeholders/pipeline';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type {
  EngagementType,
  Stakeholder,
  StakeholderCategory,
} from '@/features/stakeholders/types';

const activityMode: Record<EngagementType, 'primary' | 'success' | 'warning' | 'muted'> = {
  Meeting: 'primary',
  Call: 'muted',
  Email: 'muted',
  Correspondence: 'muted',
  Event: 'success',
  Campaign: 'primary',
  MOU: 'warning',
};

const RECENT_ACTIVITY_COUNT = 4;

/**
 * The category bands shown in the portfolio donut. Stakeholder categories
 * are finer-grained than the way the portfolio is reviewed, so they're grouped
 * here rather than charting nine thin slices. `color` is fixed per band (not
 * reassigned by position) so a category keeps its identity if others filter
 * out — categorical slots 1-4 from the design system's validated palette, in
 * this fixed order so adjacent ring segments never land the CVD-risky
 * orange/yellow pair next to each other; slot 5 covers the professional, peer
 * and media relationships.
 */
const PORTFOLIO_BANDS: Array<{
  label: string;
  categories: StakeholderCategory[];
  color: string;
}> = [
  { label: 'Universities & faculties', categories: ['University'], color: '#2a78d6' },
  {
    label: 'Government & judiciary',
    categories: ['Government', 'Judiciary'],
    color: '#eb6834',
  },
  {
    label: 'International partners',
    categories: ['Embassy', 'International body'],
    color: '#1baf7a',
  },
  { label: 'Donors & philanthropy', categories: ['Donor'], color: '#eda100' },
  {
    label: 'Professional, peer & media',
    categories: ['Professional body', 'Peer institution', 'Media'],
    color: '#e87ba4',
  },
];

const RENEWAL_WINDOW_DAYS = 90;

interface FollowUp {
  id: string;
  title: string;
  detail: string;
  due: string;
  icon: LucideIcon;
  to: string;
}

function isHealthy(stakeholder: Stakeholder): boolean {
  return stakeholder.health !== 'At risk';
}

function renewsWithinWindow(agreement: PartnershipAgreement, now: number): boolean {
  if (!agreement.expiryDate) return false;
  if (!['ACTIVE', 'RENEWAL_DUE'].includes(agreement.status)) return false;
  const remaining = Math.ceil((new Date(agreement.expiryDate).getTime() - now) / 86_400_000);
  return remaining >= 0 && remaining <= RENEWAL_WINDOW_DAYS;
}

export function Component() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stakeholders } = useCrm();
  const { agreements } = usePartnerships();

  const now = useNow();
  const createHint = permissionHint(user?.role, 'create');

  const recentActivity = useMemo(
    () =>
      sortEngagements(
        stakeholders.flatMap((stakeholder) =>
          stakeholder.engagements.map((engagement) => ({
            ...engagement,
            // Carry the organisation through the sort so each row can link back.
            summary: stakeholder.name,
            id: `${stakeholder.id}:${engagement.id}`,
          })),
        ),
      ).slice(0, RECENT_ACTIVITY_COUNT),
    [stakeholders],
  );

  const pipeline = useMemo(() => pipelineMatrix(stakeholders), [stakeholders]);

  const summary = useMemo(() => {
    const contacts = stakeholders.flatMap((item) => item.contacts);
    return {
      active: stakeholders.filter((item) => item.status !== 'Inactive').length,
      healthRate: Math.round(rate(stakeholders.filter(isHealthy).length, stakeholders.length)),
      atRisk: stakeholders.filter((item) => !isHealthy(item)).length,
      screeningPending: contacts.filter(
        (contact) => contact.screening === 'Pending' || contact.screening === 'Review required',
      ).length,
      screeningBlocked: contacts.filter((contact) => contact.screening === 'Review required')
        .length,
      activeMous: agreements.filter((item) => item.status === 'ACTIVE').length,
      renewingSoon: agreements.filter((item) => renewsWithinWindow(item, now)).length,
    };
  }, [stakeholders, agreements, now]);

  const kpis = useMemo<Kpi[]>(
    () => [
      {
        id: 'active-stakeholders',
        label: 'Active stakeholders',
        value: summary.active,
        description: `of ${stakeholders.length} on the register`,
        icon: <UsersRound size={20} aria-hidden />,
        to: filterLink(ROUTES.STAKEHOLDERS, 'stakeholders', { status: 'Active' }),
      },
      {
        id: 'healthy-relationships',
        label: 'Healthy relationships',
        value: `${summary.healthRate}%`,
        description: summary.atRisk > 0 ? `${summary.atRisk} at risk` : 'None flagged at risk',
        icon: <HeartHandshake size={20} aria-hidden />,
        to: ROUTES.REPORTS,
      },
      {
        id: 'screening-pending',
        label: 'Screening pending',
        value: summary.screeningPending,
        description:
          summary.screeningBlocked > 0
            ? `${summary.screeningBlocked} need a decision`
            : 'Nothing blocked',
        icon: <ShieldCheck size={20} aria-hidden />,
        to: ROUTES.COMPLIANCE,
      },
      {
        id: 'active-mous',
        label: 'Active MOUs',
        value: summary.activeMous,
        description: `${summary.renewingSoon} renew within ${RENEWAL_WINDOW_DAYS} days`,
        icon: <FileSignature size={20} aria-hidden />,
        to: filterLink(ROUTES.PARTNERSHIPS, 'partnerships', { status: 'ACTIVE' }),
      },
    ],
    [summary, stakeholders.length],
  );

  const portfolio = useMemo(
    () =>
      PORTFOLIO_BANDS.map((band) => {
        const members = stakeholders.filter((item) => band.categories.includes(item.category));
        return {
          label: band.label,
          count: members.length,
          health: Math.round(rate(members.filter(isHealthy).length, members.length)),
          color: band.color,
        };
      }).filter((band) => band.count > 0),
    [stakeholders],
  );

  const followUps = useMemo<FollowUp[]>(() => {
    const items: FollowUp[] = [];

    if (summary.screeningBlocked > 0) {
      items.push({
        id: 'screening',
        title: 'Complete sanctions review',
        detail: `${summary.screeningBlocked} contact${summary.screeningBlocked === 1 ? '' : 's'} flagged by S203`,
        due: 'Due today',
        icon: CircleAlert,
        to: ROUTES.COMPLIANCE,
      });
    }

    if (summary.renewingSoon > 0) {
      items.push({
        id: 'renewals',
        title: 'Prepare renewal paperwork',
        detail: `${summary.renewingSoon} agreement${summary.renewingSoon === 1 ? '' : 's'} expiring within ${RENEWAL_WINDOW_DAYS} days`,
        due: 'This quarter',
        icon: CalendarDays,
        to: filterLink(ROUTES.PARTNERSHIPS, 'partnerships', { status: 'RENEWAL_DUE' }),
      });
    }

    if (summary.atRisk > 0) {
      items.push({
        id: 'at-risk',
        title: 'Review at-risk relationships',
        detail: `${summary.atRisk} stakeholder${summary.atRisk === 1 ? '' : 's'} below the health target`,
        due: 'Needs an owner',
        icon: ShieldCheck,
        to: ROUTES.REPORTS,
      });
    }

    return items;
  }, [summary]);

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title={`Good morning, ${user?.name?.split(' ')[0] ?? 'there'}`}
        // description="Here is the current health of CLET's external stakeholder relationships."
        // meta={<Badge variant="outline">System S081</Badge>}
        actions={
          <Button
            onClick={() => void navigate(ROUTES.STAKEHOLDER_CREATE)}
            disabled={Boolean(createHint)}
            title={createHint}
          >
            <Building2 size={17} aria-hidden /> Add stakeholder
          </Button>
        }
      />

      <KpiGrid kpis={kpis} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.8fr)]">
        <SectionCard
          title="Relationship portfolio"
          // description="Engagement health by stakeholder category"
          actions={
            <Button variant="ghost" size="sm" onClick={() => void navigate(ROUTES.REPORTS)}>
              View report <ArrowRight size={16} aria-hidden />
            </Button>
          }
        >
          {portfolio.length === 0 ? (
            <EmptyState
              message="No stakeholders on the register yet"
              hint="Category health appears here once organisations are added."
            />
          ) : (
            <PortfolioDonutChart data={portfolio} />
          )}
        </SectionCard>

        <SectionCard
          title="Recent activity" /* description="Latest engagement across connected systems" */
        >
          {recentActivity.length === 0 ? (
            <EmptyState
              message="No engagement recorded yet"
              hint="Log a meeting or call from a stakeholder profile and it appears here."
            />
          ) : (
            <Timeline>
              {recentActivity.map((item, index) => (
                <TimelineItem
                  key={item.id}
                  mode={activityMode[item.type]}
                  isLast={index === recentActivity.length - 1}
                >
                  <TimelineTitle>{item.title}</TimelineTitle>
                  <TimelineData>
                    {item.summary} · {item.type}
                  </TimelineData>
                  <TimelineFooter>
                    {displayDate(item.date)} · {item.source}
                  </TimelineFooter>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Pipeline by stage and category"
        // description="Where each relationship sits, from first contact to MOU"
        actions={
          <Button variant="ghost" size="sm" onClick={() => void navigate(ROUTES.STAKEHOLDERS)}>
            Open register <ArrowRight size={16} aria-hidden />
          </Button>
        }
      >
        {pipeline.rows.length === 0 ? (
          <EmptyState
            message="No pipeline yet"
            hint="Stakeholders appear here by stage once they are on the register."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">
                    Category
                  </th>
                  {PIPELINE_STAGES.map((stage) => (
                    <th key={stage} scope="col" className="px-3 py-2 text-right font-semibold">
                      {stage}
                    </th>
                  ))}
                  <th scope="col" className="py-2 pl-3 text-right font-semibold">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {pipeline.rows.map((row) => (
                  <tr key={row.category}>
                    <th scope="row" className="py-2 pr-3 text-left font-medium text-foreground">
                      <button
                        type="button"
                        className="hover:text-primary hover:underline"
                        onClick={() =>
                          void navigate(
                            filterLink(ROUTES.STAKEHOLDERS, 'stakeholders', {
                              category: row.category,
                            }),
                          )
                        }
                      >
                        {row.category}
                      </button>
                    </th>
                    {PIPELINE_STAGES.map((stage) => (
                      <td
                        key={stage}
                        className={`px-3 py-2 text-right tabular-nums ${
                          row.counts[stage]
                            ? 'font-semibold text-foreground'
                            : 'text-foreground-muted'
                        }`}
                      >
                        {row.counts[stage] || '–'}
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right font-bold tabular-nums text-foreground">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold text-foreground">
                    All categories
                  </th>
                  {PIPELINE_STAGES.map((stage) => (
                    <td key={stage} className="px-3 py-2 text-right font-bold tabular-nums">
                      <button
                        type="button"
                        className="hover:text-primary hover:underline"
                        onClick={() =>
                          void navigate(
                            filterLink(ROUTES.STAKEHOLDERS, 'stakeholders', { pipeline: stage }),
                          )
                        }
                      >
                        {pipeline.totals[stage]}
                      </button>
                    </td>
                  ))}
                  <td className="py-2 pl-3 text-right font-bold tabular-nums">{pipeline.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Priority follow-ups"
          // description="Items that need an owner action"
          actions={
            followUps.length > 0 ? (
              <Badge variant="warning">{followUps.length} open</Badge>
            ) : (
              <Badge variant="success">Clear</Badge>
            )
          }
        >
          {followUps.length === 0 ? (
            <EmptyState
              message="Nothing needs attention"
              hint="Screening, renewals and at-risk relationships are all within target."
            />
          ) : (
            <div className="divide-y divide-border-subtle">
              {followUps.map(({ id, title, detail, due, icon: Icon, to }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => void navigate(to)}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface-subtle"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{title}</span>
                    <span className="block truncate text-xs text-foreground-muted">{detail}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-foreground-muted">
                    {due}
                  </span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Jump back in"
          // description="Continue working with key relationships"
          actions={
            <Button variant="ghost" size="sm" onClick={() => void navigate(ROUTES.STAKEHOLDERS)}>
              All stakeholders <ArrowRight size={16} aria-hidden />
            </Button>
          }
        >
          {stakeholders.length === 0 ? (
            <EmptyState
              message="No stakeholders yet"
              hint="Add an organisation and it will show up here."
              action={
                <Button
                  onClick={() => void navigate(ROUTES.STAKEHOLDER_CREATE)}
                  disabled={Boolean(createHint)}
                  title={createHint}
                >
                  <Building2 size={17} aria-hidden /> Add stakeholder
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {stakeholders.slice(0, 4).map((stakeholder) => (
                <button
                  key={stakeholder.id}
                  type="button"
                  onClick={() => void navigate(stakeholderProfileRoute(stakeholder.id))}
                  className="flex items-center gap-3 rounded-xl border border-border-subtle p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-xs font-bold text-white">
                    {stakeholder.shortName}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {stakeholder.name}
                    </span>
                    <span className="block text-xs text-foreground-muted">
                      {stakeholder.category}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </section>
  );
}
