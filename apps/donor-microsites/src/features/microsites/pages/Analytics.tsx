import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { Badge, type TableColumn, exportToCsv, exportToPdf } from '@rfdtech/components';
import { BarChart3, Clock, Download, Eye, Users } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import type { Microsite } from '@partner-crm/types';
import {
  DataTable,
  EmptyState,
  ExportMenu,
  KpiGrid,
  PageHeader,
  SectionCard,
  formatCount,
  formatDateTime,
} from '@partner-crm/ui';

import { siteRoute } from '@/constants/routes';
import { LoadGate } from '@/features/microsites/components/LoadGate';
import {
  MicrositeAccessBadge,
  MicrositeStatusBadge,
} from '@/features/microsites/components/MicrositeBadges';
import { ViewsBarChart } from '@/features/microsites/components/ViewsBarChart';
import { formatDuration } from '@/features/microsites/domain';
import { ACCESS_LABELS, PURPOSE_LABELS, STATUS_LABELS } from '@/features/microsites/labels';
import { canMicrosite } from '@/features/microsites/permissions';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

const EXPORT_COLUMNS = [
  { header: 'Microsite', accessor: (row: Microsite) => row.title },
  { header: 'Slug', accessor: (row: Microsite) => row.slug },
  { header: 'Purpose', accessor: (row: Microsite) => PURPOSE_LABELS[row.purpose] },
  { header: 'Status', accessor: (row: Microsite) => STATUS_LABELS[row.status] },
  { header: 'Access', accessor: (row: Microsite) => ACCESS_LABELS[row.access] },
  { header: 'Views', accessor: (row: Microsite) => row.analytics.views },
  { header: 'Unique visitors', accessor: (row: Microsite) => row.analytics.uniqueVisitors },
  { header: 'Average time (s)', accessor: (row: Microsite) => row.analytics.averageSeconds },
  { header: 'Downloads', accessor: (row: Microsite) => row.analytics.downloads },
  { header: 'Last viewed', accessor: (row: Microsite) => row.analytics.lastViewedAt ?? '' },
];

const today = () => new Date().toISOString().slice(0, 10);

/** Visitor-weighted mean: a busy site's average counts for more than a quiet one's. */
function weightedAverageSeconds(sites: Microsite[]): number {
  const visitors = sites.reduce((sum, site) => sum + site.analytics.uniqueVisitors, 0);
  if (visitors === 0) return 0;
  return (
    sites.reduce(
      (sum, site) => sum + site.analytics.averageSeconds * site.analytics.uniqueVisitors,
      0,
    ) / visitors
  );
}

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sites, loading } = useMicrosites();
  const canExport = canMicrosite(user?.role, 'export');

  // Anything that has ever been live carries analytics worth reporting.
  const reported = useMemo(
    () => sites.filter((site) => site.publishedAt !== null || site.analytics.views > 0),
    [sites],
  );
  const published = useMemo(() => sites.filter((site) => site.status === 'PUBLISHED'), [sites]);

  const totals = useMemo(
    () => ({
      views: reported.reduce((sum, site) => sum + site.analytics.views, 0),
      visitors: reported.reduce((sum, site) => sum + site.analytics.uniqueVisitors, 0),
      downloads: reported.reduce((sum, site) => sum + site.analytics.downloads, 0),
      averageSeconds: weightedAverageSeconds(reported),
    }),
    [reported],
  );

  const columns = useMemo<TableColumn<Microsite>[]>(
    () => [
      {
        id: 'title',
        header: 'Microsite',
        accessorKey: 'title',
        sortable: true,
        minWidth: 240,
        cell: ({ row }) => <span className="font-semibold text-foreground">{row.title}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => STATUS_LABELS[row.status],
        width: 160,
        cell: ({ row }) => <MicrositeStatusBadge status={row.status} />,
      },
      {
        id: 'access',
        header: 'Access',
        accessorFn: (row) => ACCESS_LABELS[row.access],
        width: 170,
        cell: ({ row }) => <MicrositeAccessBadge access={row.access} />,
      },
      {
        id: 'views',
        header: 'Views',
        accessorFn: (row) => String(row.analytics.views).padStart(9, '0'),
        sortable: true,
        align: 'right',
        width: 100,
        cell: ({ row }) => formatCount(row.analytics.views),
      },
      {
        id: 'visitors',
        header: 'Unique visitors',
        accessorFn: (row) => String(row.analytics.uniqueVisitors).padStart(9, '0'),
        sortable: true,
        align: 'right',
        width: 140,
        cell: ({ row }) => formatCount(row.analytics.uniqueVisitors),
      },
      {
        id: 'time',
        header: 'Avg. time',
        accessorFn: (row) => String(row.analytics.averageSeconds).padStart(6, '0'),
        sortable: true,
        align: 'right',
        width: 110,
        cell: ({ row }) => formatDuration(row.analytics.averageSeconds),
      },
      {
        id: 'downloads',
        header: 'Downloads',
        accessorFn: (row) => String(row.analytics.downloads).padStart(9, '0'),
        sortable: true,
        align: 'right',
        width: 120,
        cell: ({ row }) => formatCount(row.analytics.downloads),
      },
      {
        id: 'lastViewed',
        header: 'Last viewed',
        accessorFn: (row) => row.analytics.lastViewedAt ?? '',
        sortable: true,
        width: 180,
        cell: ({ row }) => formatDateTime(row.analytics.lastViewedAt),
      },
    ],
    [],
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Engagement analytics"
        // description="Views, visitors, reading time and downloads per microsite. Figures feed the S225 reporting warehouse."
        meta={<Badge variant="outline">System S091 · feeds S225</Badge>}
        actions={
          <ExportMenu
            disabled={!canExport || reported.length === 0}
            options={[
              {
                id: 'csv',
                label: 'Analytics (CSV)',
                description: 'One row per microsite, for S225 or a spreadsheet.',
                onSelect: () =>
                  exportToCsv(reported, EXPORT_COLUMNS, `s091-microsite-analytics-${today()}.csv`),
              },
              {
                id: 'pdf',
                label: 'Engagement report (PDF)',
                description: 'A printable summary for RMF and the Board.',
                onSelect: () =>
                  exportToPdf(reported, EXPORT_COLUMNS, `s091-engagement-report-${today()}.pdf`, {
                    title: 'CLET donor microsites — engagement report',
                    recordCount: reported.length,
                    generatedAt: new Date().toISOString(),
                  }),
              },
            ]}
          />
        }
      />

      <LoadGate>
        <KpiGrid
          kpis={[
            {
              id: 'views',
              label: 'Total views',
              value: formatCount(totals.views),
              icon: <Eye size={18} aria-hidden />,
            },
            {
              id: 'visitors',
              label: 'Unique visitors',
              value: formatCount(totals.visitors),
              icon: <Users size={18} aria-hidden />,
            },
            {
              id: 'time',
              label: 'Average time on site',
              value: formatDuration(totals.averageSeconds),
              description: 'Weighted by visitors',
              icon: <Clock size={18} aria-hidden />,
            },
            {
              id: 'downloads',
              label: 'Downloads',
              value: formatCount(totals.downloads),
              icon: <Download size={18} aria-hidden />,
            },
          ]}
        />

        <SectionCard
          title="Views per published microsite" /* description="Live sites only, largest first. Select a bar to open the site." */
        >
          {published.length === 0 ? (
            <EmptyState
              message="No microsite is live yet"
              hint="Views appear here once an approved microsite is published."
              icon={<BarChart3 size={22} aria-hidden />}
            />
          ) : (
            <ViewsBarChart
              bars={published.map((site) => ({
                id: site.id,
                label: site.title,
                value: site.analytics.views,
                hint: `${formatCount(site.analytics.uniqueVisitors)} unique visitors`,
              }))}
            />
          )}
        </SectionCard>

        <DataTable
          paramPrefix="analytics"
          columns={columns}
          data={reported}
          loading={loading}
          rowKey={(row) => row.id}
          onRowClick={(row) => void navigate(siteRoute(row.id))}
          searchFields={(row) => [row.title, row.slug]}
          searchPlaceholder="Search microsites"
          paginated={false}
          empty={{
            message: 'No analytics yet',
            hint: 'Publish a microsite to start collecting views and downloads.',
            icon: <BarChart3 size={22} aria-hidden />,
          }}
        />
      </LoadGate>
    </section>
  );
}
