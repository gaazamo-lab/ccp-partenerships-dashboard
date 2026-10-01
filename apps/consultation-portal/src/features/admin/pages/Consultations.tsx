import { useNavigate } from 'react-router';

import { Badge, Button, type TableColumn } from '@rfdtech/components';
import { ClipboardList, Download, Plus } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import type { Consultation } from '@partner-crm/types';
import { DataTable, type DataTableFilter, PageHeader, formatCount, formatDate } from '@partner-crm/ui';

import { ROUTES, adminConsultationRoute } from '@/constants/routes';
import { StatusBadge } from '@/features/consultations/components/StatusBadge';
import { AUDIENCE_LABELS, CATEGORIES, CONSULTATION_STATUSES, STATUS_LABELS } from '@/features/consultations/constants';
import { downloadCsv } from '@/features/consultations/export';
import { deniedReason } from '@/features/consultations/permissions';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

const columns: TableColumn<Consultation>[] = [
  {
    id: 'title',
    header: 'Consultation',
    accessorKey: 'title',
    sortable: true,
    cell: ({ row }) => (
      <span>
        <span className="block font-medium">{row.title}</span>
        <span className="block text-xs text-foreground-muted">{row.category}</span>
      </span>
    ),
  },
  { id: 'status', header: 'Status', accessorKey: 'status', sortable: true, cell: ({ row }) => <StatusBadge status={row.status} /> },
  { id: 'audience', header: 'Audience', accessorFn: (row) => AUDIENCE_LABELS[row.audienceSource] },
  { id: 'responses', header: 'Responses', accessorFn: (row) => formatCount(row.responseCount), align: 'right' },
  { id: 'closesAt', header: 'Closes', accessorKey: 'closesAt', sortable: true, cell: ({ row }) => formatDate(row.closesAt) },
];

function csvRows(rows: Consultation[]) {
  const header = ['id', 'title', 'category', 'status', 'audience', 'opens', 'closes', 'invited', 'responses', 'approved_by'];
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [header, ...rows.map((row) => [row.id, row.title, row.category, row.status, row.audienceSource, row.opensAt, row.closesAt, row.invitedCount ?? '', row.responseCount, row.approvedBy ?? ''])]
    .map((line) => line.map(escape).join(','))
    .join('\n');
}

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { consultations, loading } = useConsultations();
  const denied = deniedReason(user?.role, 'manage');
  const exportDenied = deniedReason(user?.role, 'export');
  const categories = [...new Set([...CATEGORIES, ...consultations.map((item) => item.category)])];

  const filters: DataTableFilter<Consultation>[] = [
    { key: 'status', label: 'Status', options: CONSULTATION_STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })), value: (row) => row.status },
    { key: 'category', label: 'Category', options: categories, value: (row) => row.category },
  ];

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Consultations"
        // description="Create, review, publish, close and analyse surveys and public consultations."
        meta={<Badge variant="outline">System S088</Badge>}
        actions={
          <Button disabled={Boolean(denied)} title={denied} onClick={() => void navigate(ROUTES.ADMIN_CREATE)}>
            <Plus size={17} aria-hidden /> New consultation
          </Button>
        }
      />
      <DataTable
        paramPrefix="consultations"
        columns={columns}
        data={consultations}
        rowKey={(row) => row.id}
        loading={loading}
        searchFields={(row) => [row.title, row.category, row.slug, row.summary]}
        searchPlaceholder="Search title or category"
        filters={filters}
        onRowClick={(row) => void navigate(adminConsultationRoute(row.id))}
        actions={(visible) => (
          <Button
            variant="outline"
            size="sm"
            disabled={Boolean(exportDenied) || !visible.length}
            title={exportDenied}
            onClick={() => downloadCsv('consultations.csv', csvRows(visible))}
          >
            <Download size={15} aria-hidden /> CSV
          </Button>
        )}
        empty={{
          message: 'No consultations yet',
          hint: 'Create the first consultation to start building a survey.',
          icon: <ClipboardList size={20} aria-hidden />,
        }}
      />
    </section>
  );
}
