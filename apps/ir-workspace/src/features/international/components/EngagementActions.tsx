import { useState } from 'react';

import { Button, useToast } from '@rfdtech/components';
import { ArrowRight, Ban, RotateCcw, Undo2 } from 'lucide-react';

import type { IrEngagement, IrEngagementStatus } from '@partner-crm/types';
import { ActionMenu, type ActionMenuItem } from '@partner-crm/ui';

import {
  APPROVER_TRANSITIONS,
  ENGAGEMENT_TRANSITIONS,
  engagementActionLabel,
  engagementCommentRequired,
  engagementTransitionBlockers,
} from '../domain';
import { ENGAGEMENT_STATUS_LABEL } from '../labels';
import { DENIED_REASON, canIr } from '../permissions';
import { useIr } from '../state/useIr';
import { DecisionModal } from './DecisionModal';

/** The primary lifecycle step as a button; the alternatives (return, cancel) in a menu. */
export function EngagementActions({ engagement }: { engagement: IrEngagement }) {
  const { transitionEngagement, actor, role } = useIr();
  const { toast } = useToast();
  const [target, setTarget] = useState<IrEngagementStatus | null>(null);

  const targets = ENGAGEMENT_TRANSITIONS[engagement.status];
  const primary = targets.find((status) => status !== 'CANCELLED' && status !== 'RETURNED');
  const secondary = targets.filter((status) => status !== primary);

  const permissionFor = (status: IrEngagementStatus) =>
    APPROVER_TRANSITIONS.includes(status) ? 'engagement.approve' : 'engagement.transition';
  const allowed = (status: IrEngagementStatus) => canIr(role, permissionFor(status));

  const menu: ActionMenuItem[] = secondary.map((status) => ({
    id: status,
    label: engagementActionLabel(engagement.status, status),
    icon: status === 'CANCELLED' ? <Ban size={16} aria-hidden /> : <Undo2 size={16} aria-hidden />,
    destructive: status === 'CANCELLED',
    disabled: !allowed(status),
    disabledReason: DENIED_REASON[permissionFor(status)],
    onSelect: () => setTarget(status),
  }));

  const confirm = async (comment: string) => {
    if (!target) return false;
    const saved = await transitionEngagement(engagement.id, { status: target, comment });
    if (!saved) return false;
    toast({
      title: engagementActionLabel(engagement.status, target),
      description: `${saved.reference} is now ${ENGAGEMENT_STATUS_LABEL[saved.status].toLowerCase()}.`,
      variant: target === 'CANCELLED' || target === 'RETURNED' ? 'warning' : 'success',
    });
    return true;
  };

  return (
    <>
      {primary ? (
        <Button
          disabled={!allowed(primary)}
          title={allowed(primary) ? undefined : DENIED_REASON[permissionFor(primary)]}
          onClick={() => setTarget(primary)}
        >
          {engagement.status === 'CLOSED' ? (
            <RotateCcw size={16} aria-hidden />
          ) : (
            <ArrowRight size={16} aria-hidden />
          )}{' '}
          {engagementActionLabel(engagement.status, primary)}
        </Button>
      ) : null}
      <ActionMenu items={menu} label="More lifecycle actions" />

      {target ? (
        <DecisionModal
          title={engagementActionLabel(engagement.status, target)}
          // description={`${engagement.reference} · ${ENGAGEMENT_STATUS_LABEL[engagement.status]} → ${ENGAGEMENT_STATUS_LABEL[target]}`}
          blockers={engagementTransitionBlockers(engagement, target, { actor, comment: 'x' })}
          commentRequired={engagementCommentRequired(engagement.status, target)}
          confirmLabel={engagementActionLabel(engagement.status, target)}
          destructive={target === 'CANCELLED'}
          actor={actor}
          onConfirm={confirm}
          onOpenChange={(open) => !open && setTarget(null)}
        />
      ) : null}
    </>
  );
}
