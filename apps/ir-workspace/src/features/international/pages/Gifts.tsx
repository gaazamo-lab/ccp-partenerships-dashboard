import { useState } from 'react';

import { Badge, Button, exportToCsv } from '@rfdtech/components';
import { Download, Plus } from 'lucide-react';

import { PageHeader } from '@partner-crm/ui';

import { GiftFormModal } from '../components/GiftFormModal';
import { GiftsTable } from '../components/GiftsTable';
import { LoadNotice } from '../components/LoadNotice';
import { FLAG_STATUS_LABEL } from '../labels';
import { DENIED_REASON, canIr } from '../permissions';
import { useIr } from '../state/useIr';
import { TABLE } from '../tables';

export function Component() {
  const { gifts, engagements, role } = useIr();
  const [open, setOpen] = useState(false);
  const canManage = canIr(role, 'gift.manage');
  const reference = (id: string | null) => engagements.find((item) => item.id === id)?.reference ?? '';

  const recordButton = (
    <Button
      disabled={!canManage}
      title={canManage ? undefined : DENIED_REASON['gift.manage']}
      onClick={() => setOpen(true)}
    >
      <Plus size={17} aria-hidden /> Record gift
    </Button>
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Gifts register"
        // description="Official gifts given and received, with S011 cross-flag acknowledgement and retry."
        meta={<Badge variant="outline">System S083 · S011</Badge>}
        actions={recordButton}
      />
      <LoadNotice />
      <GiftsTable
        gifts={gifts}
        paramPrefix={TABLE.GIFTS}
        withFilters
        emptyAction={recordButton}
        actions={(visible) => (
          <Button
            variant="ghost"
            size="sm"
            disabled={visible.length === 0 || !canIr(role, 'export')}
            onClick={() =>
              exportToCsv(
                visible,
                [
                  { header: 'Direction', accessor: (row) => row.direction },
                  { header: 'Date', accessor: (row) => row.giftDate },
                  { header: 'Giver', accessor: (row) => row.giver },
                  { header: 'Recipient', accessor: (row) => row.recipient },
                  { header: 'Description', accessor: (row) => row.description },
                  { header: 'Value known', accessor: (row) => (row.valueKnown ? 'Yes' : 'No') },
                  { header: 'Value', accessor: (row) => row.value },
                  { header: 'Currency', accessor: (row) => row.currency },
                  { header: 'Engagement', accessor: (row) => reference(row.engagementId) },
                  { header: 'S011 status', accessor: (row) => FLAG_STATUS_LABEL[row.s011Status] },
                  { header: 'S011 reference', accessor: (row) => row.s011Ref },
                  { header: 'Flag attempts', accessor: (row) => row.flagAttempts },
                ],
                's083-gifts-register.csv',
              )
            }
          >
            <Download size={16} aria-hidden /> Export
          </Button>
        )}
      />
      {open ? <GiftFormModal onOpenChange={setOpen} /> : null}
    </section>
  );
}
