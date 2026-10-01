import { useState } from 'react';

import { Button, useToast } from '@rfdtech/components';
import { ArrowRight } from 'lucide-react';

import type { IrCorrespondence, IrCorrespondenceStatus } from '@partner-crm/types';
import { ActionMenu, type ActionMenuItem } from '@partner-crm/ui';

import {
  CORRESPONDENCE_APPROVER_TRANSITIONS,
  correspondenceActionLabel,
  correspondenceTransitionBlockers,
  correspondenceTransitions,
} from '../domain';
import { CORRESPONDENCE_STATUS_LABEL } from '../labels';
import { DENIED_REASON, canIr } from '../permissions';
import { useIr } from '../state/useIr';
import { DecisionModal } from './DecisionModal';

export function CorrespondenceActions({ item }: { item: IrCorrespondence }) {
  const { transitionCorrespondence, actor, role } = useIr();
  const { toast } = useToast();
  const [target, setTarget] = useState<IrCorrespondenceStatus | null>(null);

  const targets = correspondenceTransitions(item);
  const primary = targets.find((status) => status !== 'RETURNED');
  const secondary = targets.filter((status) => status !== primary);
  const permissionFor = (status: IrCorrespondenceStatus) =>
    CORRESPONDENCE_APPROVER_TRANSITIONS.includes(status)
      ? 'correspondence.approve'
      : 'correspondence.manage';
  const allowed = (status: IrCorrespondenceStatus) => canIr(role, permissionFor(status));

  const menu: ActionMenuItem[] = secondary.map((status) => ({
    id: status,
    label: correspondenceActionLabel(item, status),
    disabled: !allowed(status),
    disabledReason: DENIED_REASON[permissionFor(status)],
    onSelect: () => setTarget(status),
  }));

  const confirm = async (comment: string) => {
    if (!target) return false;
    const saved = await transitionCorrespondence(item.id, { status: target, comment });
    if (!saved) return false;
    toast({
      title: correspondenceActionLabel(item, target),
      description:
        target === 'DISPATCHED'
          ? `Version ${saved.version} sent via S074 (${saved.dispatchRef}).`
          : `${saved.reference} is now ${CORRESPONDENCE_STATUS_LABEL[saved.status].toLowerCase()}.${comment ? ` Comment: ${comment}` : ''}`,
      variant: target === 'RETURNED' ? 'warning' : 'success',
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
          <ArrowRight size={16} aria-hidden /> {correspondenceActionLabel(item, primary)}
        </Button>
      ) : null}
      <ActionMenu items={menu} label="More correspondence actions" />
      {target ? (
        <DecisionModal
          title={correspondenceActionLabel(item, target)}
          // description={`${item.reference} · version ${item.version}${item.approvedVersion ? ` · approved version ${item.approvedVersion}` : ''}`}
          blockers={correspondenceTransitionBlockers(item, target, 'x')}
          commentRequired={target === 'RETURNED'}
          confirmLabel={correspondenceActionLabel(item, target)}
          actor={actor}
          onConfirm={confirm}
          onOpenChange={(open) => !open && setTarget(null)}
        />
      ) : null}
    </>
  );
}
