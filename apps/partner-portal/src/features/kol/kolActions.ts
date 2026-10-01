import type {
  KolContent,
  KolContentStage,
  KolEngagement,
  KolEngagementStage,
} from '@partner-crm/types';

import {
  ENGAGEMENT_ACTION_LABELS,
  canRecordParticipation,
  contentActionLabel,
  nextContentStages,
  nextEngagementStages,
} from '@/features/kol/domain';
import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import type { ActionMenuItem } from '@/features/shared';

export type EngagementDialog =
  | { engagement: KolEngagement; action: KolEngagementStage | 'PARTICIPATION' }
  | null;

export type ContentDialog = { content: KolContent; target: KolContentStage } | null;

const SIDE_EXITS: KolEngagementStage[] = ['DECLINED', 'CANCELLED'];

/** The forward move an engagement is waiting on, if any. */
export function primaryEngagementAction(
  engagement: KolEngagement,
): KolEngagementStage | 'PARTICIPATION' | null {
  if (engagement.stage === 'CONFIRMED') return 'PARTICIPATION';
  if (engagement.stage === 'COMPLETED' && !engagement.participation) return 'PARTICIPATION';
  return nextEngagementStages(engagement.stage).find((stage) => !SIDE_EXITS.includes(stage)) ?? null;
}

export function engagementActionLabel(action: KolEngagementStage | 'PARTICIPATION', engagement: KolEngagement) {
  if (action !== 'PARTICIPATION') return ENGAGEMENT_ACTION_LABELS[action];
  if (engagement.stage === 'CONFIRMED') return 'Record participation & complete';
  return engagement.participation ? 'Update participation' : 'Record participation';
}

/** Every action available on an engagement, for an `ActionMenu`. */
export function engagementMenuItems(
  engagement: KolEngagement,
  canManage: boolean,
  open: (dialog: NonNullable<EngagementDialog>) => void,
): ActionMenuItem[] {
  const items: ActionMenuItem[] = [];
  const stages = nextEngagementStages(engagement.stage);
  for (const stage of stages) {
    items.push({
      id: stage,
      label: ENGAGEMENT_ACTION_LABELS[stage],
      destructive: SIDE_EXITS.includes(stage),
      disabled: !canManage,
      disabledReason: MANAGE_DENIED_REASON,
      onSelect: () => open({ engagement, action: stage }),
    });
  }
  if (canRecordParticipation(engagement.stage)) {
    items.unshift({
      id: 'participation',
      label: engagementActionLabel('PARTICIPATION', engagement),
      disabled: !canManage,
      disabledReason: MANAGE_DENIED_REASON,
      onSelect: () => open({ engagement, action: 'PARTICIPATION' }),
    });
  }
  return items;
}

/** Every stage move available on a content item, for an `ActionMenu`. */
export function contentMenuItems(
  content: KolContent,
  canManage: boolean,
  open: (dialog: NonNullable<ContentDialog>) => void,
): ActionMenuItem[] {
  return nextContentStages(content.stage).map((target) => ({
    id: target,
    label: contentActionLabel(content.stage, target),
    destructive: target === 'WITHDRAWN',
    disabled: !canManage,
    disabledReason: MANAGE_DENIED_REASON,
    onSelect: () => open({ content, target }),
  }));
}

/** The forward move a content item is waiting on (never withdrawal). */
export function primaryContentAction(content: KolContent): KolContentStage | null {
  const next = nextContentStages(content.stage).filter((stage) => stage !== 'WITHDRAWN');
  // From review, approval is the expected path; requesting changes stays in the menu.
  return next.includes('APPROVED') ? 'APPROVED' : (next[0] ?? null);
}
