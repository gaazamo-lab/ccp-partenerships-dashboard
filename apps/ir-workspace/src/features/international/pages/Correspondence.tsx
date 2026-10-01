import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, type TableColumn, exportToCsv } from '@rfdtech/components';
import { Download, Inbox, Mail, Send } from 'lucide-react';

import type { IrCorrespondence, IrDirection } from '@partner-crm/types';
import { DataTable, type DataTableFilter, PageHeader, formatDate, useNow } from '@partner-crm/ui';

import { correspondenceRoute } from '@/constants/routes';

import { CorrespondenceStatusBadge, DeadlineBadge, LanguageBadge } from '../components/Badges';
import { CorrespondenceFormModal } from '../components/CorrespondenceFormModal';
import { LoadNotice } from '../components/LoadNotice';
import { correspondenceDeadlineState } from '../domain';
import {
  CORRESPONDENCE_STATUS_LABEL,
  CORRESPONDENCE_STATUS_OPTIONS,
  DEADLINE_OPTIONS,
  DIRECTION_OPTIONS,
  LANGUAGE_OPTIONS,
} from '../labels';
import { DENIED_REASON, canIr } from '../permissions';
import { useIr } from '../state/useIr';
import { TABLE } from '../tables';

export function Component() {
  const navigate = useNavigate();
  const { correspondence, loading, role } = useIr();
  const now = useNow();
  const [creating, setCreating] = useState<IrDirection | null>(null);
  const canManage = canIr(role, 'correspondence.manage');

  const columns = useMemo<TableColumn<IrCorrespondence>[]>(
    () => [
      {
        id: 'reference',
        header: 'Reference',
        accessorKey: 'reference',
        sortable: true,
        minWidth: 150,
        cell: ({ row }) => <span className="font-mono text-xs font-semibold text-primary">{row.reference}</span>,
      },
      {
        id: 'subject',
        header: 'Subject',
        accessorKey: 'subject',
        sortable: true,
        minWidth: 300,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              {row.direction === 'INBOUND' ? (
                <Inbox size={14} className="shrink-0 text-foreground-muted" aria-label="Inbound" />
              ) : (
                <Send size={14} className="shrink-0 text-foreground-muted" aria-label="Outbound" />
              )}
              <span className="truncate" dir="auto">
                {row.subject}
              </span>
            </p>
            <p className="mt-1 truncate text-xs text-foreground-muted" dir="auto">
              {row.direction === 'INBOUND' ? `From ${row.sender}` : `To ${row.recipient}`}
            </p>
          </div>
        ),
      },
      {
        id: 'language',
        header: 'Lang.',
        accessorKey: 'language',
        minWidth: 70,
        cell: ({ row }) => <LanguageBadge language={row.language} />,
      },
      { id: 'owner', header: 'Owner', accessorKey: 'owner', sortable: true, minWidth: 130 },
      {
        id: 'responseDeadline',
        header: 'Response due',
        accessorKey: 'responseDeadline',
        sortable: true,
        minWidth: 150,
        cell: ({ row }) => (
          <div className="space-y-1">
            <p>{row.responseDeadline ? formatDate(row.responseDeadline) : '—'}</p>
            <DeadlineBadge state={correspondenceDeadlineState(row, now)} />
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        sortable: true,
        minWidth: 150,
        cell: ({ row }) => <CorrespondenceStatusBadge status={row.status} />,
      },
    ],
    [now],
  );

  const filters = useMemo<DataTableFilter<IrCorrespondence>[]>(
    () => [
      { key: 'direction', label: 'Direction', options: DIRECTION_OPTIONS, value: (row) => row.direction },
      { key: 'status', label: 'Status', options: CORRESPONDENCE_STATUS_OPTIONS, value: (row) => row.status },
      { key: 'language', label: 'Language', options: LANGUAGE_OPTIONS, value: (row) => row.language },
      {
        key: 'deadline',
        label: 'Deadline',
        options: DEADLINE_OPTIONS,
        value: (row) => correspondenceDeadlineState(row, now),
      },
      {
        key: 'owner',
        label: 'Owner',
        options: [...new Set(correspondence.map((item) => item.owner))].sort(),
        value: (row) => row.owner,
      },
    ],
    [correspondence, now],
  );

  const denied = canManage ? undefined : DENIED_REASON['correspondence.manage'];

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Correspondence register"
        // description="Diplomatic letters in and out, with deadlines, approvals and dispatch references."
        meta={<Badge variant="outline">System S083</Badge>}
        actions={
          <>
            <Button variant="outline" disabled={!canManage} title={denied} onClick={() => setCreating('INBOUND')}>
              <Inbox size={16} aria-hidden /> Register inbound
            </Button>
            <Button disabled={!canManage} title={denied} onClick={() => setCreating('OUTBOUND')}>
              <Send size={16} aria-hidden /> Draft outbound
            </Button>
          </>
        }
      />
      <LoadNotice />

      <DataTable
        paramPrefix={TABLE.CORRESPONDENCE}
        columns={columns}
        data={correspondence}
        loading={loading}
        rowKey={(row) => row.id}
        searchPlaceholder="Search reference, subject, sender or recipient"
        searchFields={(row) => [row.reference, row.subject, row.sender, row.recipient, row.owner, row.documentRef]}
        filters={filters}
        onRowClick={(row) => void navigate(correspondenceRoute(row.id))}
        empty={{
          message: 'No correspondence registered',
          hint: 'Register an inbound letter or draft an outbound one from an approved template.',
          icon: <Mail size={22} aria-hidden />,
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
                  { header: 'Direction', accessor: (row) => row.direction },
                  { header: 'Subject', accessor: (row) => row.subject },
                  { header: 'Sender', accessor: (row) => row.sender },
                  { header: 'Recipient', accessor: (row) => row.recipient },
                  { header: 'Language', accessor: (row) => row.language },
                  { header: 'Classification', accessor: (row) => row.classification },
                  { header: 'Owner', accessor: (row) => row.owner },
                  { header: 'Received', accessor: (row) => row.receivedAt },
                  { header: 'Sent', accessor: (row) => row.sentAt },
                  { header: 'Response deadline', accessor: (row) => row.responseDeadline },
                  { header: 'Status', accessor: (row) => CORRESPONDENCE_STATUS_LABEL[row.status] },
                  { header: 'Overdue', accessor: (row) => (correspondenceDeadlineState(row, now) === 'OVERDUE' ? 'Yes' : 'No') },
                  { header: 'Version', accessor: (row) => row.version },
                  { header: 'Approved version', accessor: (row) => row.approvedVersion },
                  { header: 'Template version', accessor: (row) => row.templateVersion },
                  { header: 'S003 document', accessor: (row) => row.documentRef },
                  { header: 'S074 dispatch', accessor: (row) => row.dispatchRef },
                ],
                's083-correspondence.csv',
              )
            }
          >
            <Download size={16} aria-hidden /> Export
          </Button>
        )}
      />

      {creating ? (
        <CorrespondenceFormModal
          direction={creating}
          onOpenChange={(open) => !open && setCreating(null)}
          onCreated={(item) => {
            if (item.direction === 'OUTBOUND') void navigate(correspondenceRoute(item.id));
          }}
        />
      ) : null}
    </section>
  );
}
