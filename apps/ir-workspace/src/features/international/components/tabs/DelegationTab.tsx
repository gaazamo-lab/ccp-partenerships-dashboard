import { useMemo, useState } from 'react';

import { Button, type TableColumn, useToast } from '@rfdtech/components';
import { Trash2, UserPlus, Users } from 'lucide-react';

import type { IrDelegationMember, IrEngagement } from '@partner-crm/types';
import { DataTable, SectionCard } from '@partner-crm/ui';

import { useIr } from '../../state/useIr';
import { DelegateModal } from '../DelegateModal';

export function DelegationTab({ engagement, canManage }: { engagement: IrEngagement; canManage: boolean }) {
  const { removeDelegate } = useIr();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const columns = useMemo<TableColumn<IrDelegationMember>[]>(
    () => [
      {
        id: 'name',
        header: 'Member',
        accessorKey: 'name',
        minWidth: 220,
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-foreground">{row.name}</p>
            <p className="text-xs text-foreground-muted">{row.role}</p>
          </div>
        ),
      },
      {
        id: 'organisation',
        header: 'Organisation',
        accessorKey: 'organisation',
        minWidth: 180,
        cell: ({ row }) => (
          <div>
            <p>{row.organisation}</p>
            <p className="text-xs text-foreground-muted">{row.nationality || 'Nationality not recorded'}</p>
          </div>
        ),
      },
      {
        id: 'contactRef',
        header: 'S081 contact',
        minWidth: 120,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.contactRef ?? <span className="text-foreground-muted">Not in CRM</span>}</span>
        ),
      },
      {
        id: 'travel',
        header: 'S084 travel / visa',
        minWidth: 160,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.travelRequestRef ?? <span className="text-foreground-muted">None</span>}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        minWidth: 70,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Remove ${row.name}`}
            disabled={!canManage || removing === row.id}
            onClick={() => {
              setRemoving(row.id);
              void removeDelegate(engagement.id, row.id).then((saved) => {
                setRemoving(null);
                if (saved) toast({ title: 'Delegate removed', description: row.name, variant: 'success' });
              });
            }}
          >
            <Trash2 size={15} aria-hidden />
          </Button>
        ),
      },
    ],
    [canManage, removing, removeDelegate, engagement.id, toast],
  );

  return (
    <SectionCard
      title="Delegation roster"
      // description="Contact identities stay in S081 and travel in S084 — this roster keeps their references."
      actions={
        <Button size="sm" disabled={!canManage} onClick={() => setAddOpen(true)}>
          <UserPlus size={15} aria-hidden /> Add member
        </Button>
      }
    >
      <DataTable
        paramPrefix="delegation"
        columns={columns}
        data={engagement.delegation}
        rowKey={(row) => row.id}
        paginated={false}
        empty={{
          message: 'No delegation members yet',
          hint: 'Add each member with their role, and link their S081 contact and S084 travel request.',
          icon: <Users size={22} aria-hidden />,
          action: (
            <Button size="sm" disabled={!canManage} onClick={() => setAddOpen(true)}>
              <UserPlus size={15} aria-hidden /> Add member
            </Button>
          ),
        }}
      />
      {addOpen ? <DelegateModal engagement={engagement} onOpenChange={setAddOpen} /> : null}
    </SectionCard>
  );
}
