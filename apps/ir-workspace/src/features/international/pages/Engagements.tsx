import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, type TableColumn, Tooltip, exportToCsv } from '@rfdtech/components';
import { AlertTriangle, Download, Globe2, Plus } from 'lucide-react';

import type { IrEngagement } from '@partner-crm/types';
import { DataTable, type DataTableFilter, PageHeader, useNow } from '@partner-crm/ui';

import { ROUTES, engagementRoute } from '@/constants/routes';

import { EngagementStatusBadge } from '../components/Badges';
import { LoadNotice } from '../components/LoadNotice';
import { engagementStage, engagementTiming, findClashes } from '../domain';
import { formatInZone } from '../format';
import {
  DIRECTION_LABEL,
  DIRECTION_OPTIONS,
  ENGAGEMENT_STATUS_LABEL,
  ENGAGEMENT_STATUS_OPTIONS,
  ENGAGEMENT_TYPE_LABEL,
  ENGAGEMENT_TYPE_OPTIONS,
  STAGE_OPTIONS,
  TIMING_OPTIONS,
} from '../labels';
import { DENIED_REASON, canIr } from '../permissions';
import { useIr } from '../state/useIr';
import { TABLE } from '../tables';

export function Component() {
  const navigate = useNavigate();
  const { engagements, loading, role } = useIr();
  const now = useNow();
  const canCreate = canIr(role, 'engagement.edit');

  const clashing = useMemo(() => {
    const ids = new Set<string>();
    for (const clash of findClashes(engagements)) {
      ids.add(clash.first.id);
      ids.add(clash.second.id);
    }
    return ids;
  }, [engagements]);

  const columns = useMemo<TableColumn<IrEngagement>[]>(
    () => [
      {
        id: 'reference',
        header: 'Reference',
        accessorKey: 'reference',
        sortable: true,
        minWidth: 150,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">{row.reference}</span>
        ),
      },
      {
        id: 'title',
        header: 'Engagement',
        accessorKey: 'title',
        sortable: true,
        minWidth: 300,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <span className="truncate">{row.title}</span>
              {clashing.has(row.id) ? (
                <Tooltip content="Clashes with another engagement (same host or venue)">
                  <AlertTriangle size={15} className="shrink-0 text-warning" aria-label="Calendar clash" />
                </Tooltip>
              ) : null}
            </p>
            <p className="mt-1 truncate text-xs text-foreground-muted">
              {row.partnerName || 'No partner linked'} · {ENGAGEMENT_TYPE_LABEL[row.type]} ·{' '}
              {DIRECTION_LABEL[row.direction]}
            </p>
          </div>
        ),
      },
      {
        id: 'startAt',
        header: 'Starts',
        accessorKey: 'startAt',
        sortable: true,
        minWidth: 170,
        cell: ({ row }) => (
          <div>
            <p>{formatInZone(row.startAt, row.timeZone)}</p>
            <p className="text-xs text-foreground-muted">{row.timeZone}</p>
          </div>
        ),
      },
      { id: 'owner', header: 'Owner', accessorKey: 'owner', sortable: true, minWidth: 140 },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        sortable: true,
        minWidth: 130,
        cell: ({ row }) => <EngagementStatusBadge status={row.status} />,
      },
    ],
    [clashing],
  );

  const filters = useMemo<DataTableFilter<IrEngagement>[]>(
    () => [
      { key: 'status', label: 'Status', options: ENGAGEMENT_STATUS_OPTIONS, value: (row) => row.status },
      { key: 'stage', label: 'Stage', options: STAGE_OPTIONS, value: (row) => engagementStage(row.status) },
      {
        key: 'timing',
        label: 'Timing',
        options: TIMING_OPTIONS,
        value: (row) => engagementTiming(row, now),
      },
      { key: 'type', label: 'Type', options: ENGAGEMENT_TYPE_OPTIONS, value: (row) => row.type },
      { key: 'direction', label: 'Direction', options: DIRECTION_OPTIONS, value: (row) => row.direction },
      {
        key: 'owner',
        label: 'Owner',
        options: [...new Set(engagements.map((item) => item.owner))].sort(),
        value: (row) => row.owner,
      },
    ],
    [engagements, now],
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Engagements"
        // description="Inbound and outbound visits, courtesy calls, delegations and conferences."
        meta={<Badge variant="outline">System S083</Badge>}
        actions={
          <Button
            disabled={!canCreate}
            title={canCreate ? undefined : DENIED_REASON['engagement.edit']}
            onClick={() => void navigate(ROUTES.ENGAGEMENT_CREATE)}
          >
            <Plus size={17} aria-hidden /> New engagement
          </Button>
        }
      />
      <LoadNotice />

      <DataTable
        paramPrefix={TABLE.ENGAGEMENTS}
        columns={columns}
        data={engagements}
        loading={loading}
        rowKey={(row) => row.id}
        searchPlaceholder="Search title, reference, partner, host or venue"
        searchFields={(row) => [row.reference, row.title, row.partnerName, row.host, row.venue, row.owner]}
        filters={filters}
        onRowClick={(row) => void navigate(engagementRoute(row.id))}
        empty={{
          message: 'No engagements registered yet',
          hint: 'Register the first visit, courtesy call or conference to start protocol planning.',
          icon: <Globe2 size={22} aria-hidden />,
          action: (
            <Button disabled={!canCreate} onClick={() => void navigate(ROUTES.ENGAGEMENT_CREATE)}>
              <Plus size={17} aria-hidden /> New engagement
            </Button>
          ),
        }}
        actions={(visible) => (
          <Button
            variant="ghost"
            size="sm"
            disabled={visible.length === 0 || !canIr(role, 'export')}
            onClick={() =>
              exportToCsv(
                visible,
                [
                  { header: 'Reference', accessor: (row) => row.reference },
                  { header: 'Title', accessor: (row) => row.title },
                  { header: 'Type', accessor: (row) => ENGAGEMENT_TYPE_LABEL[row.type] },
                  { header: 'Direction', accessor: (row) => DIRECTION_LABEL[row.direction] },
                  { header: 'Partner', accessor: (row) => row.partnerName },
                  { header: 'S081 partner ID', accessor: (row) => row.partnerStakeholderId },
                  { header: 'Owner', accessor: (row) => row.owner },
                  { header: 'Host', accessor: (row) => row.host },
                  { header: 'Venue', accessor: (row) => row.venue },
                  { header: 'Starts', accessor: (row) => row.startAt },
                  { header: 'Ends', accessor: (row) => row.endAt },
                  { header: 'Time zone', accessor: (row) => row.timeZone },
                  { header: 'Classification', accessor: (row) => row.classification },
                  { header: 'Status', accessor: (row) => ENGAGEMENT_STATUS_LABEL[row.status] },
                  { header: 'Version', accessor: (row) => row.version },
                ],
                's083-engagements.csv',
              )
            }
          >
            <Download size={16} aria-hidden /> Export
          </Button>
        )}
      />
    </section>
  );
}
