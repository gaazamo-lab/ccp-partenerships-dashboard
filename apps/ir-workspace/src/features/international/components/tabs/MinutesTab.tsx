import { useState } from 'react';

import { Button } from '@rfdtech/components';
import { FileText, ListChecks, Pencil, Plus } from 'lucide-react';

import type { IrEngagement } from '@partner-crm/types';
import { DetailGrid, DetailItem, SectionCard } from '@partner-crm/ui';

// import { openMandatoryFollowUps } from '../../domain';
import { AddChecklistItemModal } from '../ChecklistItemModals';
import { ChecklistTable } from '../ChecklistTable';
import { ReferencesModal } from '../ReferencesModal';

function Ref({ value, hint }: { value: string | null; hint?: string }) {
  return value ? (
    <span className="font-mono text-sm">{value}</span>
  ) : (
    <span className="text-foreground-muted">{hint ?? 'Not linked'}</span>
  );
}

export function MinutesTab({
  engagement,
  canManage,
}: {
  engagement: IrEngagement;
  canManage: boolean;
}) {
  const [refsOpen, setRefsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // const open = openMandatoryFollowUps(engagement);

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Records"
        // description="S003 references for the agenda, briefing pack, minutes and final report."
        actions={
          <Button size="sm" variant="outline" disabled={!canManage} onClick={() => setRefsOpen(true)}>
            <Pencil size={15} aria-hidden /> Update references
          </Button>
        }
      >
        <DetailGrid columns={4}>
          <DetailItem label="Agenda" value={<Ref value={engagement.agendaRef} />} />
          <DetailItem label="Briefing pack" value={<Ref value={engagement.briefingPackRef} />} />
          <DetailItem
            label="Minutes"
            value={<Ref value={engagement.minutesRef} hint="Needed to close" />}
          />
          <DetailItem
            label="Final report"
            value={<Ref value={engagement.finalReportRef} hint="Issued by the records service" />}
            hint="Set by the backend when the report is filed in S003"
          />
        </DetailGrid>
      </SectionCard>

      <SectionCard
        title="Follow-up actions"
        // description={
          // open.length
            // ? `${open.length} mandatory follow-up${open.length === 1 ? '' : 's'} open — closure is blocked until done or excepted.`
            // : 'Owners and due dates for everything agreed during the engagement.'
        // }
        actions={
          <Button size="sm" disabled={!canManage} onClick={() => setAddOpen(true)}>
            <Plus size={15} aria-hidden /> Assign follow-up
          </Button>
        }
      >
        <ChecklistTable
          engagement={engagement}
          kind="followUp"
          paramPrefix="followup-tab"
          personLabel="Owner"
          canManage={canManage}
          rows={engagement.followUps.map((item) => ({ ...item, person: item.owner, evidenceRef: null }))}
          empty={{
            message: 'No follow-ups assigned',
            hint: 'After the meeting, assign each agreed action to an owner with a due date.',
            icon: <ListChecks size={22} aria-hidden />,
            action: (
              <Button size="sm" disabled={!canManage} onClick={() => setAddOpen(true)}>
                <FileText size={15} aria-hidden /> Assign follow-up
              </Button>
            ),
          }}
        />
      </SectionCard>

      {refsOpen ? <ReferencesModal engagement={engagement} onOpenChange={setRefsOpen} /> : null}
      {addOpen ? <AddChecklistItemModal engagement={engagement} kind="followUp" onOpenChange={setAddOpen} /> : null}
    </div>
  );
}
