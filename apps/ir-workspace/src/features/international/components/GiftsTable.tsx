import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';

import { Button, type TableColumn, useToast } from '@rfdtech/components';
import { Gift, RefreshCw } from 'lucide-react';

import type { IrGift } from '@partner-crm/types';
import { DataTable, type DataTableFilter, formatDate } from '@partner-crm/ui';

import { engagementRoute } from '@/constants/routes';

import { FLAG_STATUS_OPTIONS } from '../labels';
import { formatMoney } from '../format';
import { DENIED_REASON, canIr } from '../permissions';
import { useIr } from '../state/useIr';
import { FlagStatusBadge } from './Badges';

interface GiftsTableProps {
  gifts: IrGift[];
  paramPrefix: string;
  /** Full register gets search and filters; an engagement tab does not. */
  withFilters?: boolean;
  emptyAction?: ReactNode;
  actions?: (visible: IrGift[]) => ReactNode;
}

export function GiftsTable({ gifts, paramPrefix, withFilters, emptyAction, actions }: GiftsTableProps) {
  const { engagements, retryGiftFlag, role, loading } = useIr();
  const { toast } = useToast();
  const [retrying, setRetrying] = useState<string | null>(null);
  const canManage = canIr(role, 'gift.manage');

  const engagementById = useMemo(() => new Map(engagements.map((item) => [item.id, item])), [engagements]);

  const retry = useCallback(
    async (gift: IrGift) => {
      setRetrying(gift.id);
      const saved = await retryGiftFlag(gift.id);
      setRetrying(null);
      if (saved) {
        toast({
          title: 'S011 acknowledged the flag',
          description: `${saved.s011Ref} · attempt ${saved.flagAttempts}. No duplicate flag was created.`,
          variant: 'success',
        });
      }
    },
    [retryGiftFlag, toast],
  );

  const columns = useMemo<TableColumn<IrGift>[]>(
    () => [
      {
        id: 'description',
        header: 'Gift',
        accessorKey: 'description',
        sortable: true,
        minWidth: 260,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{row.description}</p>
            <p className="mt-1 truncate text-xs text-foreground-muted">
              {row.direction === 'RECEIVED' ? 'Received' : 'Given'} · {row.giver} → {row.recipient}
            </p>
          </div>
        ),
      },
      {
        id: 'giftDate',
        header: 'Date',
        accessorKey: 'giftDate',
        sortable: true,
        minWidth: 120,
        cell: ({ row }) => formatDate(row.giftDate),
      },
      {
        id: 'value',
        header: 'Value',
        accessorFn: (row) => row.value ?? -1,
        minWidth: 130,
        cell: ({ row }) => formatMoney(row.value, row.currency),
      },
      {
        id: 'engagement',
        header: 'Engagement',
        minWidth: 150,
        cell: ({ row }) => {
          const engagement = row.engagementId ? engagementById.get(row.engagementId) : undefined;
          return engagement ? (
            <Link to={engagementRoute(engagement.id)} className="font-mono text-xs text-primary hover:underline">
              {engagement.reference}
            </Link>
          ) : (
            <span className="text-foreground-muted">Not linked</span>
          );
        },
      },
      {
        id: 's011',
        header: 'S011 flag',
        accessorKey: 's011Status',
        sortable: true,
        minWidth: 200,
        cell: ({ row }) => (
          <div className="space-y-1">
            <FlagStatusBadge status={row.s011Status} />
            <p className="text-xs text-foreground-muted">
              {row.s011Ref ?? (row.s011Status === 'NOT_REQUIRED' ? 'Given gift' : 'No S011 reference yet')}
              {row.flagAttempts > 0 ? ` · ${row.flagAttempts} attempt${row.flagAttempts === 1 ? '' : 's'}` : ''}
            </p>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        minWidth: 130,
        align: 'right',
        cell: ({ row }) =>
          row.s011Status === 'PENDING' || row.s011Status === 'FAILED' ? (
            <Button
              size="sm"
              variant="outline"
              disabled={!canManage || retrying === row.id}
              loading={retrying === row.id}
              title={canManage ? 'Send the S011 flag again (idempotent)' : DENIED_REASON['gift.manage']}
              onClick={() => void retry(row)}
            >
              <RefreshCw size={14} aria-hidden /> Retry flag
            </Button>
          ) : null,
      },
    ],
    [engagementById, canManage, retrying, retry],
  );

  const filters = useMemo<DataTableFilter<IrGift>[]>(
    () =>
      withFilters
        ? [
            {
              key: 'direction',
              label: 'Direction',
              options: [
                { value: 'RECEIVED', label: 'Received' },
                { value: 'GIVEN', label: 'Given' },
              ],
              value: (row) => row.direction,
            },
            { key: 's011', label: 'S011 status', options: FLAG_STATUS_OPTIONS, value: (row) => row.s011Status },
            {
              key: 'attention',
              label: 'Needs attention',
              options: [{ value: 'YES', label: 'Flag pending or failed' }],
              value: (row) => (row.s011Status === 'PENDING' || row.s011Status === 'FAILED' ? 'YES' : 'NO'),
            },
          ]
        : [],
    [withFilters],
  );

  return (
    <DataTable
      paramPrefix={paramPrefix}
      columns={columns}
      data={gifts}
      loading={loading}
      rowKey={(row) => row.id}
      searchFields={withFilters ? (row) => [row.description, row.giver, row.recipient, row.s011Ref] : undefined}
      searchPlaceholder="Search gift, giver, recipient or S011 reference"
      filters={filters}
      paginated={withFilters}
      actions={actions}
      empty={{
        message: 'No gifts recorded',
        hint: 'Record gifts given or received during official engagements so S011 is informed.',
        icon: <Gift size={22} aria-hidden />,
        action: emptyAction,
      }}
    />
  );
}
