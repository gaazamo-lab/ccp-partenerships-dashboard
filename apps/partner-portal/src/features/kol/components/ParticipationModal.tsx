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

import type { KolEngagement, KolParticipation } from '@partner-crm/types';

import { participationError } from '@/features/kol/domain';
import { useKol } from '@/features/kol/state/useKol';
import { CheckboxField, FormGrid, SelectField, TextareaField } from '@/features/shared';

interface ParticipationModalProps {
  engagement: KolEngagement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SCORE_OPTIONS = [
  { value: '5', label: '5 — Outstanding' },
  { value: '4', label: '4 — Strong' },
  { value: '3', label: '3 — Solid' },
  { value: '2', label: '2 — Limited' },
  { value: '1', label: '1 — Poor' },
];

export function ParticipationModal({ engagement, open, onOpenChange }: ParticipationModalProps) {
  const { recordParticipation } = useKol();
  const { toast } = useToast();
  const existing = engagement.participation;
  const [attended, setAttended] = useState(existing?.attended ?? true);
  const [outputs, setOutputs] = useState(existing?.outputs ?? '');
  const [feedback, setFeedback] = useState(existing?.feedback ?? '');
  const [score, setScore] = useState(String(existing?.contributionScore ?? ''));
  const [scoreError, setScoreError] = useState('');
  const [saving, setSaving] = useState(false);

  const stageBlocker = participationError(engagement, {
    attended,
    outputs,
    feedback,
    contributionScore: 3,
  });
  const completes = engagement.stage === 'CONFIRMED';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (stageBlocker) return;
    if (!score) {
      setScoreError('Rate the contribution from 1 to 5.');
      return;
    }
    setSaving(true);
    const saved = await recordParticipation(engagement.id, {
      attended,
      outputs: outputs.trim(),
      feedback: feedback.trim(),
      contributionScore: Number(score) as KolParticipation['contributionScore'],
    });
    setSaving(false);
    if (!saved) return;
    toast({
      title: 'Participation recorded',
      description: completes
        ? `${saved.title} is now completed.`
        : `Participation for ${saved.title} has been saved.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={(event) => void submit(event)} noValidate>
          <ModalHeader>
            <ModalTitle>{existing ? 'Update participation' : 'Record participation'}</ModalTitle>
            <ModalDescription>{engagement.title}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {stageBlocker ? (
              <Notice variant="warning" title="Participation cannot be recorded yet" leftBorder>
                {stageBlocker}
              </Notice>
            ) : completes ? (
              <Notice variant="info" title="This completes the engagement" leftBorder>
                Recording participation on a confirmed engagement moves it to Completed.
              </Notice>
            ) : null}
            <FormGrid>
              <CheckboxField
                label="The KOL attended / delivered"
                checked={attended}
                onChange={setAttended}
                // description="Untick for a no-show or a withdrawn contribution."
              />
              <SelectField
                label="Contribution score"
                required
                value={score}
                onChange={(value) => {
                  setScore(value);
                  setScoreError('');
                }}
                options={SCORE_OPTIONS}
                placeholder="Rate 1 to 5"
                error={scoreError}
              />
              <TextareaField
                label="Outputs"
                className="sm:col-span-2"
                rows={3}
                value={outputs}
                onChange={setOutputs}
                placeholder="Speech text, recording, op-ed, clips, attendance figures…"
              />
              <TextareaField
                label="Feedback"
                className="sm:col-span-2"
                rows={3}
                value={feedback}
                onChange={setFeedback}
                placeholder="Audience and organiser feedback, lessons for next time."
              />
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={saving || Boolean(stageBlocker)}>
              Save participation
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
