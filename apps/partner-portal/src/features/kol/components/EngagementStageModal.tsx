import { type FormEvent, useState } from 'react';

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Notice,
  useToast,
} from '@rfdtech/components';

import type { KolEngagement, KolEngagementStage } from '@partner-crm/types';

import { ENGAGEMENT_ACTION_LABELS, engagementTransitionError } from '@/features/kol/domain';
import { useKol } from '@/features/kol/state/useKol';
import { TextareaField, labelize } from '@/features/shared';

interface EngagementStageModalProps {
  engagement: KolEngagement;
  target: KolEngagementStage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REASON_REQUIRED: KolEngagementStage[] = ['DECLINED', 'CANCELLED'];

export function EngagementStageModal({ engagement, target, open, onOpenChange }: EngagementStageModalProps) {
  const { moveEngagement } = useKol();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const blocker = engagementTransitionError(engagement.stage, target);
  const reasonRequired = REASON_REQUIRED.includes(target);
  const destructive = reasonRequired;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (blocker) return;
    if (reasonRequired && !note.trim()) {
      setError('Record the reason so the relationship history stays accurate.');
      return;
    }
    setSaving(true);
    const saved = await moveEngagement(engagement.id, { stage: target, note: note.trim() });
    setSaving(false);
    if (!saved) return;
    toast({
      title: 'Engagement updated',
      description: `${saved.title} is now ${labelize(saved.stage)}.`,
      variant: destructive ? 'warning' : 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={(event) => void submit(event)} noValidate>
          <ModalHeader>
            <ModalTitle>{ENGAGEMENT_ACTION_LABELS[target]}</ModalTitle>
            <ModalDescription>{engagement.title}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {blocker ? (
              <Notice variant="warning" title="This move is not allowed" leftBorder>
                {blocker}
              </Notice>
            ) : null}
            {target === 'COMPLETED' ? (
              <Notice variant="info" title="Record participation next" leftBorder>
                Completing without participation leaves the contribution score empty. Use “Record
                participation” to capture attendance, outputs and feedback.
              </Notice>
            ) : null}
            <TextareaField
              label={reasonRequired ? 'Reason' : 'Note'}
              required={reasonRequired}
              rows={3}
              value={note}
              onChange={(value) => {
                setNote(value);
                setError('');
              }}
              error={error}
              placeholder={
                reasonRequired
                  ? 'Why is this engagement not going ahead?'
                  : 'Optional — e.g. invitation letter sent, date confirmed by chambers.'
              }
              // description="Added to the engagement notes with today’s date."
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Back
            </Button>
            <Button
              type="submit"
              variant={destructive ? 'destructive' : 'primary'}
              loading={saving}
              disabled={saving || Boolean(blocker)}
            >
              {ENGAGEMENT_ACTION_LABELS[target]}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
