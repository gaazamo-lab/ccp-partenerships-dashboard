import { type ReactNode, useMemo, useState } from 'react';

import { Badge, Button, type TableColumn } from '@rfdtech/components';
import { CheckCircle2 } from 'lucide-react';

import type { IrEngagement, IrTaskStatus } from '@partner-crm/types';
import { DataTable, formatDate, useNow } from '@partner-crm/ui';

import { followUpColumn } from '../domain';
import { MandatoryBadge, TaskStatusBadge } from './Badges';
import { ResolveChecklistItemModal } from './ChecklistItemModals';

/** A protocol task or a follow-up, normalised for display. */
export interface ChecklistRow {
  id: string;
  title: string;
  mandatory: boolean;
  person: string;
  dueDate: string | null;
  status: IrTaskStatus;
  evidenceRef: string | null;
  exceptionReason: string | null;
}

interface ChecklistTableProps {
  engagement: IrEngagement;
  kind: 'protocol' | 'followUp';
  rows: ChecklistRow[];
  canManage: boolean;
  paramPrefix: string;
  personLabel: string;
  empty: { message: string; hint: string; icon: ReactNode; action?: ReactNode };
}

export function ChecklistTable({
  engagement,
  kind,
  rows,
  canManage,
  paramPrefix,
  personLabel,
  empty,
}: ChecklistTableProps) {
  const now = useNow();
  const [resolving, setResolving] = useState<ChecklistRow | null>(null);

  const columns = useMemo<TableColumn<ChecklistRow>[]>(
    () => [
      {
        id: 'title',
        header: kind === 'protocol' ? 'Task' : 'Follow-up',
        accessorKey: 'title',
        minWidth: 260,
        cell: ({ row }) => (
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-foreground">{row.title}</p>
            {row.evidenceRef ? (
              <p className="font-mono text-xs text-foreground-muted">Evidence: {row.evidenceRef}</p>
            ) : null}
            {row.exceptionReason ? (
              <p className="text-xs text-foreground-muted">Exception: {row.exceptionReason}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'mandatory',
        header: 'Type',
        minWidth: 100,
        cell: ({ row }) => <MandatoryBadge mandatory={row.mandatory} />,
      },
      { id: 'person', header: personLabel, accessorKey: 'person', minWidth: 140 },
      {
        id: 'dueDate',
        header: 'Due',
        accessorKey: 'dueDate',
        minWidth: 130,
        cell: ({ row }) => (
          <div className="space-y-1">
            <p>{formatDate(row.dueDate)}</p>
            {row.dueDate && followUpColumn({ status: row.status, dueDate: row.dueDate }, now) === 'OVERDUE' ? (
              <Badge variant="error" size="sm">
                Overdue
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        minWidth: 100,
        cell: ({ row }) => <TaskStatusBadge status={row.status} />,
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        minWidth: 120,
        cell: ({ row }) =>
          row.status === 'OPEN' ? (
            <Button size="sm" variant="outline" disabled={!canManage} onClick={() => setResolving(row)}>
              <CheckCircle2 size={14} aria-hidden /> Resolve
            </Button>
          ) : null,
      },
    ],
    [kind, personLabel, now, canManage],
  );

  return (
    <>
      <DataTable
        paramPrefix={paramPrefix}
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        paginated={false}
        empty={empty}
      />
      {resolving ? (
        <ResolveChecklistItemModal
          engagement={engagement}
          kind={kind}
          item={resolving}
          onOpenChange={(open) => !open && setResolving(null)}
        />
      ) : null}
    </>
  );
}
