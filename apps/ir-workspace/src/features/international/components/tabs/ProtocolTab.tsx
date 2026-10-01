import { useState } from 'react';

import { Badge, Button, Notice } from '@rfdtech/components';
import { ClipboardCheck, Plus } from 'lucide-react';

import type { IrEngagement } from '@partner-crm/types';
import { SectionCard } from '@partner-crm/ui';

import { openMandatoryTasks } from '../../domain';
import { AddChecklistItemModal } from '../ChecklistItemModals';
import { ChecklistTable } from '../ChecklistTable';

export function ProtocolTab({ engagement, canManage }: { engagement: IrEngagement; canManage: boolean }) {
  const [addOpen, setAddOpen] = useState(false);
  const open = openMandatoryTasks(engagement);
  // const done = engagement.protocolTasks.filter((task) => task.status !== 'OPEN').length;

  return (
    <SectionCard
      title={
        <span className="flex flex-wrap items-center gap-2">
          Protocol checklist <Badge variant="outline">Checklist v{engagement.checklistVersion}</Badge>
        </span>
      }
      // description={`${done} of ${engagement.protocolTasks.length} tasks resolved. Every change to the checklist creates a new version.`}
      actions={
        <Button size="sm" disabled={!canManage} onClick={() => setAddOpen(true)}>
          <Plus size={15} aria-hidden /> Add task
        </Button>
      }
    >
      <div className="space-y-4">
        {open.length > 0 ? (
          <Notice variant="warning" title="Outstanding mandatory tasks" leftBorder>
            {open.length} mandatory task{open.length === 1 ? '' : 's'} must be done (with evidence) or
            excepted before this visit can be marked scheduled: {open.map((task) => task.title).join('; ')}.
          </Notice>
        ) : engagement.protocolTasks.length > 0 ? (
          <Notice variant="success" title="Mandatory protocol complete" leftBorder>
            Every mandatory task is done or has an authorised exception.
          </Notice>
        ) : null}
        <ChecklistTable
          engagement={engagement}
          kind="protocol"
          paramPrefix="protocol"
          personLabel="Assignee"
          canManage={canManage}
          rows={engagement.protocolTasks.map((task) => ({ ...task, person: task.assignee }))}
          empty={{
            message: 'No protocol tasks yet',
            hint: 'Add reception, security, interpretation, precedence and gift tasks with owners and deadlines.',
            icon: <ClipboardCheck size={22} aria-hidden />,
            action: (
              <Button size="sm" disabled={!canManage} onClick={() => setAddOpen(true)}>
                <Plus size={15} aria-hidden /> Add task
              </Button>
            ),
          }}
        />
      </div>
      {addOpen ? <AddChecklistItemModal engagement={engagement} kind="protocol" onOpenChange={setAddOpen} /> : null}
    </SectionCard>
  );
}
