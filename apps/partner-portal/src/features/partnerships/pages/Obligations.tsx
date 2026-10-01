import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  Badge,
  Button,
  Notice,
  type TableColumn,
  exportToCsv,
  useToast,
} from '@rfdtech/components';
import {
  AlarmClock,
  CalendarRange,
  ClipboardList,
  Download,
  ListChecks,
  MessageSquare,
  Pencil,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import type { ObligationStatus, PartnershipObligation } from '@partner-crm/types';

import { ROUTES, partnershipRoute } from '@/constants/routes';
import { ObligationFormModal } from '@/features/partnerships/components/ObligationFormModal';
import { ObligationProgressModal } from '@/features/partnerships/components/ObligationProgressModal';
import { ObligationStatusBadge } from '@/features/partnerships/components/PartnershipStatusBadge';
import {
  DUE_WITHIN_OPTIONS,
  type DueWithin,
  type ObligationWorkspaceRow,
  isDueWithin,
  obligationSummary,
  obligationWorkspaceRows,
  parseDueWithin,
} from '@/features/partnerships/obligationsWorkspace';
import { canManagePartnership } from '@/features/partnerships/permissions';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import {
  DataTable,
  type DataTableFilter,
  type Kpi,
  KpiGrid,
  PageHeader,
  filterLink,
  formatDate,
  titleCase,
} from '@/features/shared';

const PARAM_PREFIX = 'obligations';
/** Query param for the "due within" quick filter; it sits beside the table's own params. */
const DUE_PARAM = `${PARAM_PREFIX}.due`;

const STATUSES: ObligationStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'OVERDUE',
  'COMPLETED',
  'WAIVED',
];

function dueWithinLink(days: DueWithin) {
  return `${ROUTES.PARTNERSHIP_OBLIGATIONS}?${new URLSearchParams({ [DUE_PARAM]: String(days) })}`;
}

function daysToDueLabel(row: ObligationWorkspaceRow) {
  if (row.status === 'COMPLETED' || row.status === 'WAIVED') return 'Closed';
  if (row.daysToDue === 0) return 'Due today';
  if (row.daysToDue < 0) {
    const late = Math.abs(row.daysToDue);
    return `${late} day${late === 1 ? '' : 's'} overdue`;
  }
  return `${row.daysToDue} day${row.daysToDue === 1 ? '' : 's'}`;
}

export function Component() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { agreements, obligations, loading, error, reload } = usePartnerships();

  const [progressObligation, setProgressObligation] = useState<PartnershipObligation | null>(null);
  const [editingObligation, setEditingObligation] = useState<PartnershipObligation | null>(null);

  const canManage = canManagePartnership(user?.role, 'manage_obligations');
  const canExport = canManagePartnership(user?.role, 'export');
  const actor = user?.name ?? 'Authenticated user';

  const dueWithin = parseDueWithin(new URLSearchParams(location.search).get(DUE_PARAM));

  const setDueWithin = (days: DueWithin | null) => {
    // The table writes its own params straight to the URL, so start from the
    // live query string rather than the router's copy.
    const params = new URLSearchParams(window.location.search);
    if (days) params.set(DUE_PARAM, String(days));
    else params.delete(DUE_PARAM);
    const search = params.toString();
    void navigate({ search: search ? `?${search}` : '' }, { replace: true });
  };

  const rows = useMemo(
    () => obligationWorkspaceRows(obligations, agreements),
    [obligations, agreements],
  );
  const visibleRows = useMemo(
    () => (dueWithin ? rows.filter((row) => isDueWithin(row, dueWithin)) : rows),
    [rows, dueWithin],
  );
  const summary = useMemo(() => obligationSummary(rows), [rows]);

  const kpis: Kpi[] = [
    {
      id: 'overdue',
      label: 'Overdue',
      value: summary.overdue,
      description: 'Past due and not completed or waived',
      icon: <TriangleAlert size={20} aria-hidden />,
      to: filterLink(ROUTES.PARTNERSHIP_OBLIGATIONS, PARAM_PREFIX, { status: 'OVERDUE' }),
    },
    {
      id: 'due-7',
      label: 'Due within 7 days',
      value: summary.dueIn7,
      description: 'Open items, overdue included',
      icon: <AlarmClock size={20} aria-hidden />,
      to: dueWithinLink(7),
    },
    {
      id: 'due-30',
      label: 'Due within 30 days',
      value: summary.dueIn30,
      description: 'Open items, overdue included',
      icon: <CalendarRange size={20} aria-hidden />,
      to: dueWithinLink(30),
    },
    {
      id: 'open',
      label: 'Open obligations',
      value: summary.open,
      description: `${rows.length} tracked across ${agreements.length} agreements`,
      icon: <ListChecks size={20} aria-hidden />,
      to: ROUTES.PARTNERSHIP_OBLIGATIONS,
    },
  ];

  const rowActionsDisabled = (row: ObligationWorkspaceRow) => !canManage || row.agreementTerminated;
  const disabledReason = (row: ObligationWorkspaceRow) =>
    !canManage
      ? 'Your role cannot update obligations.'
      : row.agreementTerminated
        ? 'The agreement is terminated.'
        : undefined;

  const columns: TableColumn<ObligationWorkspaceRow>[] = [
    {
      id: 'title',
      header: 'Obligation',
      accessorKey: 'title',
      sortable: true,
      minWidth: 240,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{row.title}</p>
          {row.obligation.description ? (
            <p className="mt-1 truncate text-xs text-foreground-muted">
              {row.obligation.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'agreement',
      header: 'Agreement',
      accessorKey: 'agreementReference',
      sortable: true,
      minWidth: 200,
      cell: ({ row }) => (
        <button
          type="button"
          className="min-w-0 text-left hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            void navigate(partnershipRoute(row.agreementId));
          }}
        >
          <span className="block font-mono text-xs font-semibold text-primary">
            {row.agreementReference}
          </span>
          <span className="block truncate text-xs text-foreground-muted">{row.agreementTitle}</span>
        </button>
      ),
    },
    { id: 'owner', header: 'Owner', accessorKey: 'owner', sortable: true, minWidth: 140 },
    {
      id: 'dueDate',
      header: 'Due',
      accessorKey: 'dueDate',
      sortable: true,
      minWidth: 120,
      cell: ({ row }) => formatDate(row.dueDate),
    },
    {
      id: 'daysToDue',
      header: 'Days to due',
      // Zero-padded so the table's text sort orders numbers correctly.
      accessorFn: (row) => String(row.daysToDue + 100_000).padStart(7, '0'),
      sortable: true,
      minWidth: 130,
      cell: ({ row }) => (
        <span
          className={
            row.status === 'OVERDUE'
              ? 'font-semibold text-error'
              : row.daysToDue <= 7 && row.status !== 'COMPLETED' && row.status !== 'WAIVED'
                ? 'font-semibold text-warning'
                : 'text-foreground-muted'
          }
        >
          {daysToDueLabel(row)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      minWidth: 130,
      cell: ({ row }) => <ObligationStatusBadge status={row.status} />,
    },
    {
      id: 'evidence',
      header: 'Evidence',
      accessorFn: (row) => String(row.evidenceCount).padStart(4, '0'),
      sortable: true,
      width: 110,
      cell: ({ row }) =>
        row.evidenceCount ? (
          <Badge variant="outline">
            {row.evidenceCount} ref{row.evidenceCount === 1 ? '' : 's'}
          </Badge>
        ) : (
          <span className="text-foreground-muted">None</span>
        ),
    },
    {
      id: 'actions',
      header: '',
      width: 200,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1" title={disabledReason(row)}>
          <Button
            variant="ghost"
            size="sm"
            disabled={rowActionsDisabled(row)}
            onClick={(event) => {
              event.stopPropagation();
              setProgressObligation(row.obligation);
            }}
          >
            <MessageSquare size={14} aria-hidden /> Update
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={rowActionsDisabled(row)}
            onClick={(event) => {
              event.stopPropagation();
              setEditingObligation(row.obligation);
            }}
          >
            <Pencil size={14} aria-hidden /> Edit
          </Button>
        </div>
      ),
    },
  ];

  const filters: DataTableFilter<ObligationWorkspaceRow>[] = [
    {
      key: 'status',
      label: 'Status',
      options: STATUSES.map((value) => ({ value, label: titleCase(value) })),
      value: (row) => row.status,
    },
    {
      key: 'owner',
      label: 'Owner',
      options: [...new Set(rows.map((row) => row.owner))].sort(),
      value: (row) => row.owner,
    },
    {
      key: 'agreement',
      label: 'Agreement',
      options: agreements
        .map((agreement) => ({
          value: agreement.id,
          label: `${agreement.reference} · ${agreement.title}`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
      value: (row) => row.agreementId,
    },
  ];

  const exportRows = (visible: ObligationWorkspaceRow[]) => {
    exportToCsv(
      visible,
      [
        { header: 'Agreement reference', accessor: (row) => row.agreementReference },
        { header: 'Agreement', accessor: (row) => row.agreementTitle },
        { header: 'Obligation', accessor: (row) => row.title },
        { header: 'Description', accessor: (row) => row.obligation.description },
        { header: 'Owner', accessor: (row) => row.owner },
        { header: 'Due date', accessor: (row) => row.dueDate },
        { header: 'Days to due', accessor: (row) => row.daysToDue },
        { header: 'Status', accessor: (row) => row.status },
        { header: 'Evidence count', accessor: (row) => row.evidenceCount },
        { header: 'Evidence', accessor: (row) => row.obligation.evidenceReferences.join(' | ') },
        { header: 'Escalation owner', accessor: (row) => row.obligation.escalationOwner ?? '' },
      ],
      's082-obligations.csv',
    );
    toast({
      title: 'Obligations exported',
      description: `${visible.length} obligation${visible.length === 1 ? '' : 's'} written to CSV.`,
      variant: 'success',
    });
  };

  return (
    <ObligationsLayout
      error={error}
      loading={loading}
      onRetry={reload}
      kpis={kpis}
      dueWithin={dueWithin}
      onDueWithin={setDueWithin}
    >
      <DataTable
        paramPrefix={PARAM_PREFIX}
        columns={columns}
        data={visibleRows}
        loading={loading}
        rowKey={(row) => row.id}
        searchPlaceholder="Search obligation, owner, or agreement"
        searchFields={(row) => [
          row.title,
          row.owner,
          row.agreementReference,
          row.agreementTitle,
          row.obligation.escalationOwner,
        ]}
        filters={filters}
        empty={
          dueWithin && rows.length
            ? {
                message: `Nothing open is due within ${dueWithin} days`,
                hint: 'Widen the window or show all dates to see the rest of the register.',
                icon: <ClipboardList size={22} aria-hidden />,
                action: (
                  <Button variant="outline" onClick={() => setDueWithin(null)}>
                    Show all dates
                  </Button>
                ),
              }
            : {
                message: 'No obligations tracked yet',
                hint: 'Open an agreement and add its dated, owned commitments on the Obligations tab.',
                icon: <ClipboardList size={22} aria-hidden />,
                action: (
                  <Button onClick={() => void navigate(ROUTES.PARTNERSHIPS)}>
                    Browse agreements
                  </Button>
                ),
              }
        }
        actions={(visible) => (
          <Button
            variant="ghost"
            size="sm"
            disabled={visible.length === 0 || !canExport}
            title={canExport ? undefined : 'Your role cannot export obligations.'}
            onClick={() => exportRows(visible)}
          >
            <Download size={16} aria-hidden /> Export
          </Button>
        )}
      />

      {progressObligation ? (
        <ObligationProgressModal
          open
          onOpenChange={(open) => !open && setProgressObligation(null)}
          actor={actor}
          obligation={progressObligation}
        />
      ) : null}
      {editingObligation ? (
        <ObligationFormModal
          open
          onOpenChange={(open) => !open && setEditingObligation(null)}
          agreementId={editingObligation.agreementId}
          actor={actor}
          obligation={editingObligation}
        />
      ) : null}
    </ObligationsLayout>
  );
}

function ObligationsLayout({
  error,
  loading,
  onRetry,
  kpis,
  dueWithin,
  onDueWithin,
  children,
}: {
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  kpis: Kpi[];
  dueWithin: DueWithin | null;
  onDueWithin: (days: DueWithin | null) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Obligations"
        // description="Every agreement commitment in one register — owners, deadlines, evidence and progress."
        // meta={<Badge variant="outline">System S082</Badge>}
        backTo={{ to: ROUTES.PARTNERSHIPS, label: 'Back to partnerships' }}
      />

      {error ? (
        <Notice variant="error" title="Obligations could not be loaded" leftBorder>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" disabled={loading} onClick={onRetry}>
              <RefreshCw size={14} aria-hidden /> Try again
            </Button>
          </div>
        </Notice>
      ) : null}

      <KpiGrid kpis={kpis} loading={loading} />

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Due within quick filter"
      >
        <span className="text-sm text-foreground-muted">Due within</span>
        <Button
          size="sm"
          variant={dueWithin === null ? 'primary' : 'outline'}
          aria-pressed={dueWithin === null}
          onClick={() => onDueWithin(null)}
        >
          All dates
        </Button>
        {DUE_WITHIN_OPTIONS.map((days) => (
          <Button
            key={days}
            size="sm"
            variant={dueWithin === days ? 'primary' : 'outline'}
            aria-pressed={dueWithin === days}
            onClick={() => onDueWithin(days)}
          >
            {days} days
          </Button>
        ))}
        {dueWithin ? (
          <span className="text-xs text-foreground-muted">
            Open obligations due in the next {dueWithin} days, overdue included.
          </span>
        ) : null}
      </div>

      {children}
    </section>
  );
}
