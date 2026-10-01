import {
  Timeline,
  TimelineData,
  TimelineItem,
  type TimelineItemMode,
  TimelineTitle,
} from '@rfdtech/components';
import { History } from 'lucide-react';

import type { IrApproval, IrEngagement } from '@partner-crm/types';
import { EmptyState, SectionCard, formatDateTime } from '@partner-crm/ui';

const MODE: Record<IrApproval['decision'], TimelineItemMode> = {
  SUBMITTED: 'primary',
  APPROVED: 'success',
  RETURNED: 'warning',
  REOPENED: 'warning',
  CANCELLED: 'error',
};

const LABEL: Record<IrApproval['decision'], string> = {
  SUBMITTED: 'Submitted for approval',
  APPROVED: 'Approved',
  RETURNED: 'Returned for changes',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled',
};

export function HistoryTab({ engagement }: { engagement: IrEngagement }) {
  const entries = [...engagement.approvals].reverse();

  return (
    <SectionCard
      title="Approval history"
      // description="Each submission, decision, return, reopening and cancellation, with actor, comment and version."
    >
      {entries.length === 0 ? (
        <EmptyState
          message="No approval decisions yet"
          hint="Submit the plan for approval once the purpose, owner, dates and time zone are complete."
          icon={<History size={22} aria-hidden />}
        />
      ) : (
        <Timeline>
          {entries.map((entry, index) => (
            <TimelineItem key={entry.id} mode={MODE[entry.decision]} isLast={index === entries.length - 1}>
              <TimelineTitle as="h3">
                {LABEL[entry.decision]} · version {entry.version}
              </TimelineTitle>
              <TimelineData>
                {entry.actor} · {formatDateTime(entry.occurredAt)}
              </TimelineData>
              {entry.comment ? <p className="mt-1 text-sm text-foreground">{entry.comment}</p> : null}
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </SectionCard>
  );
}
