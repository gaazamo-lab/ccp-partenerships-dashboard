import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { Badge, type TableColumn, exportToCsv } from '@rfdtech/components';
import { CheckCircle2, FileText, Megaphone, Star, TrendingUp } from 'lucide-react';

import { ROUTES, kolProfileRoute } from '@/constants/routes';
import {
  EngagementTypeBreakdown,
  RiskWatchlist,
  TopContributors,
} from '@/features/kol/components/ImpactPanels';
import { RiskBadge } from '@/features/kol/components/KolBadges';
import { LoadNotice } from '@/features/kol/components/LoadNotice';
import { ENGAGEMENT_TYPE_LABELS, REACH_WINDOW_DAYS, impactSummary } from '@/features/kol/domain';
import {
  type KolImpactRow,
  categoryMix,
  engagementTypeBreakdown,
  impactRows,
} from '@/features/kol/impactReport';
import { useKol } from '@/features/kol/state/useKol';
import { useKolAccess } from '@/features/kol/state/useKolAccess';
import {
  DataTable,
  ExportMenu,
  type Kpi,
  KpiGrid,
  PageHeader,
  PortfolioDonutChart,
  SectionCard,
  formatCount,
  formatDate,
  titleCase,
  useNow,
} from '@/features/shared';

/** `DataTable` sorts column text; zero-padding keeps numbers in numeric order. */
const pad = (value: number | null) => String(Math.round((value ?? 0) * 10)).padStart(12, '0');

export function Component() {
  const navigate = useNavigate();
  const { profiles, engagements, content, mentions, loading } = useKol();
  const { canManage, canExport } = useKolAccess();
  const now = useNow();

  const data = useMemo(
    () => ({ engagements, content, mentions }),
    [engagements, content, mentions],
  );
  const rows = useMemo(() => impactRows(profiles, data), [profiles, data]);
  const summary = useMemo(() => impactSummary(data, now), [data, now]);
  const mix = useMemo(() => categoryMix(profiles), [profiles]);
  const types = useMemo(() => engagementTypeBreakdown(data), [data]);

  const kpis: Kpi[] = [
    {
      id: 'reach',
      label: 'Total media reach',
      value: formatCount(summary.reach),
      description: `${summary.mentionCount} mentions (S085 + manual)`,
      icon: <Megaphone size={20} aria-hidden />,
    },
    {
      id: 'recent',
      label: `${REACH_WINDOW_DAYS}-day reach`,
      value: formatCount(summary.recentReach),
      description: 'Coverage in the last 90 days',
      icon: <TrendingUp size={20} aria-hidden />,
    },
    {
      id: 'completed',
      label: 'Engagements completed',
      value: summary.completed,
      description: `${summary.openEngagements} still in the pipeline`,
      icon: <CheckCircle2 size={20} aria-hidden />,
      to: ROUTES.KOL_PIPELINE,
    },
    {
      id: 'published',
      label: 'Content published',
      value: summary.published,
      description: 'Live on S076',
      icon: <FileText size={20} aria-hidden />,
      to: `${ROUTES.KOL_PIPELINE}#content`,
    },
    {
      id: 'score',
      label: 'Mean contribution',
      value: summary.meanScore === null ? '—' : `${summary.meanScore} / 5`,
      description: 'Across recorded participation',
      icon: <Star size={20} aria-hidden />,
    },
  ];

  const columns = useMemo<TableColumn<KolImpactRow>[]>(
    () => [
      {
        id: 'name',
        header: 'KOL',
        accessorKey: 'name',
        sortable: true,
        minWidth: 220,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{row.name}</p>
            <p className="mt-1 truncate text-xs text-foreground-muted">{row.category}</p>
          </div>
        ),
      },
      {
        id: 'reach',
        header: 'Reach',
        accessorFn: (row) => pad(row.reach),
        sortable: true,
        align: 'right',
        minWidth: 110,
        cell: ({ row }) => formatCount(row.reach),
      },
      {
        id: 'mentions',
        header: 'Mentions',
        accessorFn: (row) => pad(row.mentionCount),
        sortable: true,
        align: 'right',
        cell: ({ row }) => row.mentionCount,
      },
      {
        id: 'completed',
        header: 'Completed',
        accessorFn: (row) => pad(row.completed),
        sortable: true,
        align: 'right',
        cell: ({ row }) => row.completed,
      },
      {
        id: 'published',
        header: 'Published',
        accessorFn: (row) => pad(row.published),
        sortable: true,
        align: 'right',
        cell: ({ row }) => row.published,
      },
      {
        id: 'meanScore',
        header: 'Mean score',
        accessorFn: (row) => pad(row.meanScore),
        sortable: true,
        align: 'right',
        cell: ({ row }) => (row.meanScore === null ? '—' : `${row.meanScore} / 5`),
      },
      {
        id: 'risk',
        header: 'Risk',
        accessorFn: (row) => row.profile.riskLevel,
        sortable: true,
        cell: ({ row }) => <RiskBadge level={row.profile.riskLevel} />,
      },
      {
        id: 'score',
        header: 'Impact',
        accessorFn: (row) => pad(row.score),
        sortable: true,
        align: 'right',
        cell: ({ row }) => (
          <Badge variant={row.score >= 50 ? 'success' : 'default'}>{row.score}</Badge>
        ),
      },
    ],
    [],
  );

  const exportImpact = () =>
    exportToCsv(
      rows,
      [
        { header: 'KOL', accessor: (row: KolImpactRow) => row.name },
        { header: 'Category', accessor: (row: KolImpactRow) => row.category },
        { header: 'Relationship owner', accessor: (row: KolImpactRow) => row.owner },
        { header: 'Reach', accessor: (row: KolImpactRow) => row.reach },
        { header: 'Mentions', accessor: (row: KolImpactRow) => row.mentionCount },
        { header: 'Negative mentions', accessor: (row: KolImpactRow) => row.negativeMentions },
        { header: 'Engagements completed', accessor: (row: KolImpactRow) => row.completed },
        { header: 'Content published', accessor: (row: KolImpactRow) => row.published },
        { header: 'Mean contribution', accessor: (row: KolImpactRow) => row.meanScore ?? '' },
        { header: 'Risk', accessor: (row: KolImpactRow) => titleCase(row.profile.riskLevel) },
        { header: 'Impact score', accessor: (row: KolImpactRow) => row.score },
      ],
      's092-kol-impact.csv',
    );

  const nameOf = (kolId: string) => rows.find((row) => row.kolId === kolId)?.name ?? kolId;

  const exportEngagements = () =>
    exportToCsv(
      engagements,
      [
        { header: 'KOL', accessor: (row) => nameOf(row.kolId) },
        { header: 'Engagement', accessor: (row) => row.title },
        { header: 'Type', accessor: (row) => ENGAGEMENT_TYPE_LABELS[row.type] },
        { header: 'Stage', accessor: (row) => titleCase(row.stage) },
        { header: 'Date', accessor: (row) => formatDate(row.scheduledFor) },
        { header: 'Owner', accessor: (row) => row.owner },
        { header: 'Reference', accessor: (row) => row.externalRef ?? '' },
        {
          header: 'Attended',
          accessor: (row) => (row.participation ? (row.participation.attended ? 'Yes' : 'No') : ''),
        },
        {
          header: 'Contribution score',
          accessor: (row) => row.participation?.contributionScore ?? '',
        },
        { header: 'Outputs', accessor: (row) => row.participation?.outputs ?? '' },
      ],
      's092-kol-engagements.csv',
    );

  const exportMentions = () =>
    exportToCsv(
      mentions,
      [
        { header: 'KOL', accessor: (row) => nameOf(row.kolId) },
        { header: 'Outlet', accessor: (row) => row.outlet },
        { header: 'Headline', accessor: (row) => row.headline },
        { header: 'Published', accessor: (row) => formatDate(row.publishedAt) },
        { header: 'Reach', accessor: (row) => row.reach },
        { header: 'Sentiment', accessor: (row) => titleCase(row.sentiment) },
        { header: 'Source', accessor: (row) => row.source },
        { header: 'URL', accessor: (row) => row.url },
      ],
      's092-kol-media-mentions.csv',
    );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="KOL impact"
        // description="Reach, participation, contribution and risk across the thought-leader portfolio."
        backTo={{ to: ROUTES.KOLS, label: 'Back to KOL register' }}
        // meta={<Badge variant="outline">System S092</Badge>}
        actions={
          <ExportMenu
            disabled={!canExport}
            options={[
              {
                id: 'impact',
                label: 'Impact by KOL',
                description: 'One row per KOL with reach, outputs and score.',
                onSelect: exportImpact,
              },
              {
                id: 'engagements',
                label: 'Engagement log',
                description: 'Every engagement with participation.',
                onSelect: exportEngagements,
              },
              {
                id: 'mentions',
                label: 'Media mentions',
                description: 'S085 and manual coverage with reach.',
                onSelect: exportMentions,
              },
            ]}
          />
        }
      />

      <LoadNotice canManage={canManage} />

      <KpiGrid kpis={kpis} columns={5} loading={loading} />

      <SectionCard
        title="Reach and impact by KOL" /* description="Sort any column; select a row to open the profile." */
      >
        <DataTable
          paramPrefix="kol-impact"
          columns={columns}
          data={rows}
          rowKey={(row) => row.kolId}
          loading={loading}
          searchPlaceholder="Search KOL or category"
          searchFields={(row) => [row.name, row.category, row.owner]}
          onRowClick={(row) => void navigate(kolProfileRoute(row.kolId))}
          empty={{
            message: 'No KOLs to report on yet',
            hint: 'Add KOLs to the register to start measuring impact.',
            icon: <TrendingUp size={22} aria-hidden />,
          }}
        />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <TopContributors rows={rows} />
        <RiskWatchlist rows={rows} />
        <SectionCard
          title="Category mix" /* description="KOLs by audience band; the badge is the share currently active." */
        >
          <PortfolioDonutChart data={mix} />
        </SectionCard>
        <EngagementTypeBreakdown rows={types} />
      </div>
    </section>
  );
}
