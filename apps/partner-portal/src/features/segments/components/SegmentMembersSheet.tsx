import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  type TableColumn,
} from '@rfdtech/components';
import { Download, UsersRound } from 'lucide-react';

import { stakeholderProfileRoute } from '@/constants/routes';
import { exportSegmentMembers } from '@/features/segments/exportMembers';
import { DataTable, formatCount } from '@/features/shared';
import {
  type ResolvedMember,
  describeCriteria,
  resolveSegmentMembers,
  segmentCriteria,
} from '@/features/segments/resolution';
import { ConsentBadge } from '@/features/stakeholders/components/StatusBadges';
import type { Segment, Stakeholder } from '@/features/stakeholders/types';

const columns: TableColumn<ResolvedMember>[] = [
  {
    id: 'contact',
    header: 'Contact',
    accessorKey: 'contactName',
    sortable: true,
    minWidth: 200,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{row.contactName}</p>
        <p className="truncate text-xs text-foreground-muted">{row.email}</p>
      </div>
    ),
  },
  { id: 'organisation', header: 'Organisation', accessorKey: 'stakeholderName', sortable: true, minWidth: 200 },
  { id: 'category', header: 'Category', accessorKey: 'category', sortable: true, minWidth: 140 },
  {
    id: 'consent',
    header: 'Consent',
    accessorKey: 'consent',
    sortable: true,
    width: 140,
    cell: ({ row }) => <ConsentBadge consent={row.consent} />,
  },
];

/** The segment's current membership, resolved from the register as it opens. */
export function SegmentMembersSheet({
  open,
  onOpenChange,
  segment,
  stakeholders,
  exportHint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: Segment;
  stakeholders: Stakeholder[];
  exportHint?: string;
}) {
  const navigate = useNavigate();
  const criteria = useMemo(() => segmentCriteria(segment), [segment]);
  const members = useMemo(
    () => resolveSegmentMembers(criteria, stakeholders),
    [criteria, stakeholders],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{segment.name}</SheetTitle>
          <SheetDescription>
            {formatCount(members.length)} current members · {describeCriteria(criteria)}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <DataTable
            paramPrefix={`segment-${segment.id}`}
            columns={columns}
            data={members}
            rowKey={(row) => row.contactId}
            searchPlaceholder="Search contact, email or organisation"
            searchFields={(row) => [row.contactName, row.email, row.stakeholderName]}
            pageSize={15}
            onRowClick={(row) => {
              onOpenChange(false);
              void navigate(stakeholderProfileRoute(row.stakeholderId));
            }}
            empty={{
              message: 'Nobody matches this segment right now',
              hint: 'Widen the rules, or record consent and clear screening for the contacts you expect to see.',
              icon: <UsersRound size={22} aria-hidden />,
            }}
          />
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            disabled={members.length === 0 || Boolean(exportHint)}
            title={exportHint}
            onClick={() => exportSegmentMembers(segment, members)}
          >
            <Download size={16} aria-hidden /> Export members (CSV)
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
