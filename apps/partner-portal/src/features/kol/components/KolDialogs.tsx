import type { ContentDialog, EngagementDialog } from '@/features/kol/kolActions';

import { ContentStageModal } from './ContentStageModal';
import { EngagementStageModal } from './EngagementStageModal';
import { ParticipationModal } from './ParticipationModal';

/** Renders whichever engagement dialog is pending. Keyed so each opening starts fresh. */
export function EngagementDialogs({
  dialog,
  onClose,
}: {
  dialog: EngagementDialog;
  onClose: () => void;
}) {
  if (!dialog) return null;
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  const key = `${dialog.engagement.id}-${dialog.action}`;
  return dialog.action === 'PARTICIPATION' ? (
    <ParticipationModal key={key} engagement={dialog.engagement} open onOpenChange={onOpenChange} />
  ) : (
    <EngagementStageModal
      key={key}
      engagement={dialog.engagement}
      target={dialog.action}
      open
      onOpenChange={onOpenChange}
    />
  );
}

export function ContentDialogs({ dialog, onClose }: { dialog: ContentDialog; onClose: () => void }) {
  if (!dialog) return null;
  return (
    <ContentStageModal
      key={`${dialog.content.id}-${dialog.target}`}
      content={dialog.content}
      target={dialog.target}
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    />
  );
}
