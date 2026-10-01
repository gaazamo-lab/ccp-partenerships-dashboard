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

import type { PartnershipAgreement, PartnershipStatus } from '@partner-crm/types';

import { lifecycleActionLabel } from '@/features/partnerships/lifecycle';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import { TextareaField, labelize } from '@/features/shared';

interface LifecycleTransitionModalProps {
  agreement: PartnershipAgreement;
  targetStatus: PartnershipStatus;
  blockers: string[];
  actor: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LifecycleTransitionModal({
  agreement,
  targetStatus,
  blockers,
  actor,
  open,
  onOpenChange,
}: LifecycleTransitionModalProps) {
  const { transitionAgreement } = usePartnerships();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const action = lifecycleActionLabel[targetStatus] ?? 'Update lifecycle';

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) {
      setError('A decision note is required.');
      return;
    }
    if (blockers.length) return;
    transitionAgreement(agreement.id, { status: targetStatus, note: note.trim() }, actor);
    toast({
      title: 'Lifecycle updated',
      description: `${agreement.reference} is now ${labelize(targetStatus)}.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={submit}>
          <ModalHeader>
            <ModalTitle>{action}</ModalTitle>
            <ModalDescription>
              Record the decision and preserve it in the agreement history.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {blockers.length ? (
              <Notice variant="warning" title="Complete these requirements first" leftBorder>
                <ul className="list-disc space-y-1 pl-5">
                  {blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </Notice>
            ) : (
              <Notice variant="info" title="Controlled transition" leftBorder>
                This action will be attributed to {actor}. Production authorization will be enforced
                by the backend and written to S204.
              </Notice>
            )}
            <TextareaField
              label="Decision note"
              required
              rows={4}
              value={note}
              onChange={(value) => {
                setNote(value);
                setError('');
              }}
              placeholder="Summarise the review, approval, or reason for this transition."
              // description="Recorded against this transition in the agreement history."
              error={error}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={blockers.length > 0}>
              Confirm transition
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
