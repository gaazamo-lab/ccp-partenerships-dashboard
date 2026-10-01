import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, Notice, type TableColumn, exportToCsv } from '@rfdtech/components';
import {
  CalendarClock,
  ClipboardCheck,
  Download,
  FileSignature,
  Plus,
  RefreshCw,
  ScrollText,
  Upload,
} from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import type { PartnershipAgreement, PartnershipStatus } from '@partner-crm/types';

import { ROUTES, partnershipRoute } from '@/constants/routes';
import { PartnershipImportModal } from '@/features/partnerships/components/PartnershipImportModal';
import { PartnershipStatusBadge } from '@/features/partnerships/components/PartnershipStatusBadge';
import {
  type PartnershipExportRow,
  partnershipExportRows,
} from '@/features/partnerships/dataPortability';
import { canManagePartnership } from '@/features/partnerships/permissions';
import { reviewSchedules } from '@/features/partnerships/reviewDue';
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
import { useCrm } from '@/features/stakeholders/state/CrmContext';

const PARAM_PREFIX = 'partnerships';

const STATUSES: PartnershipStatus[] = [
  'DRAFT',
  'LEGAL_REVIEW',
  'SIGNATURE_PENDING',
  'ACTIVE',
  'RENEWAL_DUE',
  'EXPIRED',
  'TERMINATED',
];

const IN_NEGOTIATION: PartnershipStatus[] = ['DRAFT', 'LEGAL_REVIEW', 'SIGNATURE_PENDING'];

const AGREEMENT_TYPES = [
  { value: 'MOU', label: 'MOU' },
  { value: 'PARTNERSHIP_AGREEMENT', label: 'Partnership agreement' },
  { value: 'COOPERATION_FRAMEWORK', label: 'Cooperation framework' },
];

const REVIEW_FILTER_OPTIONS = [
  { value: 'DUE', label: 'Review due or overdue' },
  { value: 'SCHEDULED', label: 'Review scheduled' },
];

const EXPORT_COLUMNS: Array<keyof PartnershipExportRow> = [
  'Reference',
  'Agreement',
  'Stakeholder',
  'Type',
  'Status',
  'Owner',
  'Effective date',
  'Expiry date',
  'Value commitment',
  'Deliverables',
  'Legal reference',
  'Signed document',
];

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { agreements, reviews, loading, error, reload } = usePartnerships();
  const { stakeholders } = useCrm();
  const [importOpen, setImportOpen] = useState(false);

  const stakeholderName = useMemo(() => {
    const byId = new Map(stakeholders.map((item) => [item.id, item.name]));
    return (id: string) => byId.get(id) ?? 'Unknown stakeholder';
  }, [stakeholders]);

  const schedules = useMemo(() => reviewSchedules(agreements, reviews), [agreements, reviews]);

  const columns = useMemo<TableColumn<PartnershipAgreement>[]>(
    () => [
      {
        id: 'reference',
        header: 'Reference',
        accessorKey: 'reference',
        sortable: true,
        minWidth: 170,
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">{row.reference}</span>
        ),
      },
      {
        id: 'title',
        header: 'Agreement',
        accessorKey: 'title',
        sortable: true,
        minWidth: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{row.title}</p>
            <p className="mt-1 truncate text-xs text-foreground-muted">
              {stakeholderName(row.stakeholderId)}
            </p>
          </div>
        ),
      },
      { id: 'owner', header: 'CCP owner', accessorKey: 'owner', sortable: true, minWidth: 150 },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        sortable: true,
        minWidth: 150,
        cell: ({ row }) => <PartnershipStatusBadge status={row.status} />,
      },
      {
        id: 'expiryDate',
        header: 'Expiry',
        accessorKey: 'expiryDate',
        sortable: true,
        minWidth: 130,
        cell: ({ row }) => formatDate(row.expiryDate),
      },
      {
        id: 'nextReview',
        header: 'Next review',
        accessorFn: (row) => schedules.get(row.id)?.dueDate ?? '',
        sortable: true,
        minWidth: 150,
        cell: ({ row }) => {
          const schedule = schedules.get(row.id);
          if (!schedule) return <span className="text-foreground-muted">Not scheduled</span>;
          return (
            <span className="flex flex-wrap items-center gap-2">
              {formatDate(schedule.dueDate)}
              {schedule.due ? <Badge variant="error">Due</Badge> : null}
            </span>
          );
        },
      },
    ],
    [schedules, stakeholderName],
  );

  const filters = useMemo<DataTableFilter<PartnershipAgreement>[]>(
    () => [
      {
        key: 'status',
        label: 'Status',
        options: STATUSES.map((value) => ({ value, label: titleCase(value) })),
        value: (row) => row.status,
      },
      {
        key: 'type',
        label: 'Agreement type',
        options: AGREEMENT_TYPES,
        value: (row) => row.agreementType,
      },
      {
        key: 'owner',
        label: 'CCP owner',
        options: [...new Set(agreements.map((item) => item.owner))].sort(),
        value: (row) => row.owner,
      },
      {
        key: 'review',
        label: 'Value review',
        options: REVIEW_FILTER_OPTIONS,
        value: (row) => {
          const schedule = schedules.get(row.id);
          if (!schedule) return null;
          return schedule.due ? 'DUE' : 'SCHEDULED';
        },
      },
    ],
    [agreements, schedules],
  );

  const kpis = useMemo<Kpi[]>(() => {
    const count = (predicate: (item: PartnershipAgreement) => boolean) =>
      agreements.filter(predicate).length;
    return [
      {
        id: 'active',
        label: 'Active agreements',
        value: count((item) => item.status === 'ACTIVE'),
        description: 'Currently in force',
        icon: <FileSignature size={20} aria-hidden />,
        to: filterLink(ROUTES.PARTNERSHIPS, PARAM_PREFIX, { status: 'ACTIVE' }),
      },
      {
        id: 'in-negotiation',
        label: 'In negotiation',
        value: count((item) => IN_NEGOTIATION.includes(item.status)),
        description: 'Draft, legal, or signature',
        icon: <ScrollText size={20} aria-hidden />,
        // Three statuses, and the table filters on one at a time — send the
        // user to the earliest stage rather than to a filter that can't be set.
        to: filterLink(ROUTES.PARTNERSHIPS, PARAM_PREFIX, { status: 'DRAFT' }),
      },
      {
        id: 'renewal-due',
        label: 'Renewal due',
        value: count((item) => item.status === 'RENEWAL_DUE'),
        description: 'Requires portfolio action',
        icon: <CalendarClock size={20} aria-hidden />,
        to: filterLink(ROUTES.PARTNERSHIPS, PARAM_PREFIX, { status: 'RENEWAL_DUE' }),
      },
      {
        id: 'review-due',
        label: 'Review due',
        value: [...schedules.values()].filter((schedule) => schedule.due).length,
        description: 'Value review on or past its date',
        icon: <ClipboardCheck size={20} aria-hidden />,
        to: filterLink(ROUTES.PARTNERSHIPS, PARAM_PREFIX, { review: 'DUE' }),
      },
    ];
  }, [agreements, schedules]);

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="MOUs & partnerships"
        // description="Manage institutional agreements from negotiation through obligations, renewal, and termination."
        // meta={<Badge variant="outline">System S082</Badge>}
        actions={
          <>
            <Button
              variant="outline"
              disabled={!canManagePartnership(user?.role, 'import')}
              onClick={() => setImportOpen(true)}
            >
              <Upload size={16} aria-hidden /> Import
            </Button>
            <Button
              disabled={!canManagePartnership(user?.role, 'create')}
              onClick={() => void navigate(ROUTES.PARTNERSHIP_CREATE)}
            >
              <Plus size={17} aria-hidden /> Create partnership
            </Button>
          </>
        }
      />

      {error ? (
        <Notice variant="error" title="Agreements could not be loaded" leftBorder>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" disabled={loading} onClick={reload}>
              <RefreshCw size={14} aria-hidden /> Try again
            </Button>
          </div>
        </Notice>
      ) : null}

      <KpiGrid kpis={kpis} columns={4} loading={loading} />

      {error && agreements.length === 0 ? null : (
        <DataTable
          loading={loading}
          paramPrefix={PARAM_PREFIX}
          columns={columns}
          data={agreements}
          rowKey={(row) => row.id}
          searchPlaceholder="Search agreement, stakeholder, reference, or owner"
          searchFields={(row) => [
            row.reference,
            row.title,
            row.owner,
            stakeholderName(row.stakeholderId),
          ]}
          filters={filters}
          onRowClick={(row) => void navigate(partnershipRoute(row.id))}
          empty={{
            message: 'No agreements yet',
            hint: 'Create the first MOU or partnership agreement, or import an existing register.',
            icon: <ScrollText size={22} aria-hidden />,
            action: (
              <Button
                disabled={!canManagePartnership(user?.role, 'create')}
                onClick={() => void navigate(ROUTES.PARTNERSHIP_CREATE)}
              >
                <Plus size={17} aria-hidden /> Create partnership
              </Button>
            ),
          }}
          actions={(visible) => (
            <Button
              variant="ghost"
              size="sm"
              disabled={visible.length === 0 || !canManagePartnership(user?.role, 'export')}
              onClick={() =>
                exportToCsv(
                  partnershipExportRows(visible, stakeholderName),
                  EXPORT_COLUMNS.map((header) => ({
                    header,
                    accessor: (row: PartnershipExportRow) => row[header],
                  })),
                  's082-partnerships.csv',
                )
              }
            >
              <Download size={16} aria-hidden /> Export
            </Button>
          )}
        />
      )}

      {importOpen ? <PartnershipImportModal open onOpenChange={setImportOpen} /> : null}
    </section>
  );
}
