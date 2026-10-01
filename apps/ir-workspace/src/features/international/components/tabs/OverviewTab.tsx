import { type ReactNode, useState } from 'react';

import { Button } from '@rfdtech/components';
import { CalendarClock, FileText, Link2, Pencil, Users } from 'lucide-react';

import type { IrEngagement } from '@partner-crm/types';
import { DetailGrid, DetailItem, SectionCard } from '@partner-crm/ui';

import { formatInZone } from '../../format';
import { CLASSIFICATION_LABEL, DIRECTION_LABEL, ENGAGEMENT_TYPE_LABEL } from '../../labels';
import { EngagementEditModal } from '../EngagementEditModal';

function RefRow({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-foreground-muted">{label}</span>
        <span className="block truncate font-mono text-sm font-semibold text-foreground">
          {value ?? 'Not linked'}
        </span>
      </span>
    </div>
  );
}

export function OverviewTab({
  engagement,
  canEdit,
}: {
  engagement: IrEngagement;
  canEdit: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
      <SectionCard
        title="Engagement record"
        // description={`Version ${engagement.version} · updated ${formatDateTime(engagement.updatedAt)}`}
        actions={
          <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => setEditOpen(true)}>
            <Pencil size={15} aria-hidden /> Edit
          </Button>
        }
      >
        <div className="space-y-4">
          <DetailGrid columns={2}>
            <DetailItem label="Type" value={ENGAGEMENT_TYPE_LABEL[engagement.type]} />
            <DetailItem label="Direction" value={DIRECTION_LABEL[engagement.direction]} />
            <DetailItem label="Accountable owner" value={engagement.owner} />
            <DetailItem
              label="Classification"
              value={CLASSIFICATION_LABEL[engagement.classification]}
            />
            <DetailItem label="Host" value={engagement.host || 'Not set'} />
            <DetailItem label="Venue" value={engagement.venue || 'Not set'} />
            <DetailItem
              label="Starts"
              value={formatInZone(engagement.startAt, engagement.timeZone)}
              hint={engagement.timeZone || 'Time zone not set'}
            />
            <DetailItem
              label="Ends"
              value={formatInZone(engagement.endAt, engagement.timeZone)}
              hint={engagement.timeZone || 'Time zone not set'}
            />
          </DetailGrid>
          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
              Purpose
            </p>
            <p className="mt-1 text-sm leading-6 text-foreground">
              {engagement.purpose || (
                <span className="text-foreground-muted">
                  Not recorded — required before submission.
                </span>
              )}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Authoritative links" /* description="Where each part of this engagement really lives" */
      >
        <div className="space-y-3">
          <RefRow
            icon={<Link2 size={18} aria-hidden />}
            label={`S081 partner · ${engagement.partnerName || 'no partner named'}`}
            value={engagement.partnerStakeholderId}
          />
          <RefRow
            icon={<CalendarClock size={18} aria-hidden />}
            label="S003 agenda"
            value={engagement.agendaRef}
          />
          <RefRow
            icon={<FileText size={18} aria-hidden />}
            label="S003 briefing pack"
            value={engagement.briefingPackRef}
          />
          <RefRow
            icon={<Users size={18} aria-hidden />}
            label="Delegation"
            value={`${engagement.delegation.length} member${engagement.delegation.length === 1 ? '' : 's'}`}
          />
        </div>
      </SectionCard>

      {editOpen ? <EngagementEditModal engagement={engagement} onOpenChange={setEditOpen} /> : null}
    </div>
  );
}
