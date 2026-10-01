import { useState } from 'react';

import { Button, Notice } from '@rfdtech/components';
import { LifeBuoy, Plus, RefreshCw } from 'lucide-react';

import type { IrEngagement, IrSupportRequest } from '@partner-crm/types';
import { EmptyState, SectionCard, formatDateTime } from '@partner-crm/ui';

import { SUPPORT_TRANSITIONS } from '../../domain';
import { SUPPORT_SYSTEM_LABEL } from '../../labels';
import { HandoffStatusBadge } from '../Badges';
import { SupportRequestModal, SupportStatusModal } from '../SupportModals';

export function SupportTab({ engagement, canManage }: { engagement: IrEngagement; canManage: boolean }) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [updating, setUpdating] = useState<IrSupportRequest | null>(null);
  const requests = engagement.supportRequests;
  const pending = requests.filter((item) => item.status !== 'COMPLETED').length;

  return (
    <SectionCard
      title="Support handoffs"
      // description="Travel (S084), events (S078), translation (S086) and official messages (S074)."
      actions={
        <Button size="sm" disabled={!canManage} onClick={() => setRequestOpen(true)}>
          <Plus size={15} aria-hidden /> Request support
        </Button>
      }
    >
      <div className="space-y-4">
        <Notice variant="info" title="Requested is not completed" leftBorder>
          Each handoff shows what the responsible system has reported. {pending} of {requests.length}{' '}
          request{requests.length === 1 ? '' : 's'} not yet completed. Failed handoffs stay visible until retried.
        </Notice>

        {requests.length === 0 ? (
          <EmptyState
            message="No support requested yet"
            hint="Request visas and travel, event logistics, translation or official communications."
            icon={<LifeBuoy size={22} aria-hidden />}
          />
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                    {SUPPORT_SYSTEM_LABEL[request.system]}
                  </p>
                  <p className="font-semibold text-foreground">{request.description}</p>
                  <p className="text-xs text-foreground-muted">
                    External ID:{' '}
                    <span className="font-mono">{request.externalRef ?? 'not issued yet'}</span> · requested{' '}
                    {formatDateTime(request.requestedAt)} · updated {formatDateTime(request.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <HandoffStatusBadge status={request.status} />
                  {SUPPORT_TRANSITIONS[request.status].length > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canManage}
                      onClick={() => setUpdating(request)}
                    >
                      {request.status === 'FAILED' ? (
                        <>
                          <RefreshCw size={14} aria-hidden /> Retry
                        </>
                      ) : (
                        'Update'
                      )}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {requestOpen ? <SupportRequestModal engagement={engagement} onOpenChange={setRequestOpen} /> : null}
      {updating ? (
        <SupportStatusModal
          engagement={engagement}
          request={updating}
          onOpenChange={(open) => !open && setUpdating(null)}
        />
      ) : null}
    </SectionCard>
  );
}
