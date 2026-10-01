import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, type TableColumn, exportToCsv } from '@rfdtech/components';
import { Download, PanelsTopLeft, Plus } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import type { Microsite } from '@partner-crm/types';
import { DataTable, PageHeader, formatCount, formatDate } from '@partner-crm/ui';

import { ROUTES, siteRoute } from '@/constants/routes';
import { LoadGate } from '@/features/microsites/components/LoadGate';
import { MicrositeAccessBadge, MicrositeStatusBadge } from '@/features/microsites/components/MicrositeBadges';
import {
  ACCESS_LABELS,
  ACCESS_OPTIONS,
  PURPOSE_LABELS,
  PURPOSE_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from '@/features/microsites/labels';
import { PERMISSION_REASONS, canMicrosite } from '@/features/microsites/permissions';
import { useMicrosites } from '@/features/microsites/state/useMicrosites';

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sites, loading } = useMicrosites();
  const canBuild = canMicrosite(user?.role, 'build');
  const canExport = canMicrosite(user?.role, 'export');

  const columns = useMemo<TableColumn<Microsite>[]>(
    () => [
      {
        id: 'title',
        header: 'Microsite',
        accessorKey: 'title',
        sortable: true,
        minWidth: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{row.title}</p>
            <p className="truncate font-mono text-xs text-foreground-muted">/sites/{row.slug}</p>
          </div>
        ),
      },
      {
        id: 'purpose',
        header: 'Purpose',
        accessorFn: (row) => PURPOSE_LABELS[row.purpose],
        sortable: true,
        width: 180,
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row) => STATUS_LABELS[row.status],
        sortable: true,
        width: 170,
        cell: ({ row }) => <MicrositeStatusBadge status={row.status} />,
      },
      {
        id: 'access',
        header: 'Access',
        accessorFn: (row) => ACCESS_LABELS[row.access],
        sortable: true,
        width: 180,
        cell: ({ row }) => <MicrositeAccessBadge access={row.access} />,
      },
      { id: 'owner', header: 'Owner', accessorKey: 'owner', sortable: true, width: 150 },
      {
        id: 'version',
        header: 'Version',
        accessorFn: (row) => row.version,
        width: 100,
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            v{row.version}
            {row.publishedVersion !== null && row.publishedVersion !== row.version ? (
              <Badge variant="outline" size="sm">
                live v{row.publishedVersion}
              </Badge>
            ) : null}
          </span>
        ),
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
        id: 'updatedAt',
        header: 'Updated',
        accessorKey: 'updatedAt',
        sortable: true,
        width: 140,
        cell: ({ row }) => formatDate(row.updatedAt),
      },
    ],
    [],
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Microsites"
        // description="Every annual report, donor impact, campaign, event and thought-leadership site, at every stage."
        meta={<Badge variant="outline">System S091</Badge>}
        actions={
          <Button
            disabled={!canBuild}
            title={canBuild ? undefined : PERMISSION_REASONS.build}
            onClick={() => void navigate(ROUTES.SITE_CREATE)}
          >
            <Plus size={16} aria-hidden /> New microsite
          </Button>
        }
      />

      <LoadGate>
        <DataTable
          paramPrefix="microsites"
          columns={columns}
          data={sites}
          loading={loading}
          rowKey={(row) => row.id}
          onRowClick={(row) => void navigate(siteRoute(row.id))}
          searchFields={(row) => [row.title, row.slug, row.owner, row.tagline]}
          searchPlaceholder="Search by title, slug or owner"
          filters={[
            { key: 'purpose', label: 'Purpose', options: PURPOSE_OPTIONS, value: (row) => row.purpose },
            { key: 'status', label: 'Status', options: STATUS_OPTIONS, value: (row) => row.status },
            { key: 'access', label: 'Access', options: ACCESS_OPTIONS, value: (row) => row.access },
          ]}
          empty={{
            message: 'No microsites yet',
            hint: 'Start from a template to build the first annual report or donor impact site.',
            icon: <PanelsTopLeft size={22} aria-hidden />,
            action: (
              <Button disabled={!canBuild} onClick={() => void navigate(ROUTES.SITE_CREATE)}>
                <Plus size={16} aria-hidden /> New microsite
              </Button>
            ),
          }}
          actions={(visible) => (
            <Button
              variant="ghost"
              size="sm"
              disabled={visible.length === 0 || !canExport}
              title={canExport ? undefined : PERMISSION_REASONS.export}
              onClick={() =>
                exportToCsv(
                  visible,
                  [
                    { header: 'Title', accessor: (row: Microsite) => row.title },
                    { header: 'Slug', accessor: (row: Microsite) => row.slug },
                    { header: 'Purpose', accessor: (row: Microsite) => PURPOSE_LABELS[row.purpose] },
                    { header: 'Status', accessor: (row: Microsite) => STATUS_LABELS[row.status] },
                    { header: 'Access', accessor: (row: Microsite) => ACCESS_LABELS[row.access] },
                    { header: 'Owner', accessor: (row: Microsite) => row.owner },
                    { header: 'Version', accessor: (row: Microsite) => row.version },
                    { header: 'Published version', accessor: (row: Microsite) => row.publishedVersion ?? '' },
                    { header: 'Published at', accessor: (row: Microsite) => row.publishedAt ?? '' },
                    { header: 'Views', accessor: (row: Microsite) => row.analytics.views },
                    { header: 'Unique visitors', accessor: (row: Microsite) => row.analytics.uniqueVisitors },
                    { header: 'Downloads', accessor: (row: Microsite) => row.analytics.downloads },
                    { header: 'S003 archive ref', accessor: (row: Microsite) => row.archiveRef ?? '' },
                    { header: 'Updated at', accessor: (row: Microsite) => row.updatedAt },
                  ],
                  's091-microsites.csv',
                )
              }
            >
              <Download size={16} aria-hidden /> Export
            </Button>
          )}
        />
      </LoadGate>
    </section>
  );
}
