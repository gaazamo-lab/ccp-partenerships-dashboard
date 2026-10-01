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

import { useAuth } from '@partner-crm/auth';
import type { Consultation } from '@partner-crm/types';
import { TextField, TextareaField } from '@partner-crm/ui';

import { STATUS_LABELS } from '@/features/consultations/constants';
import {
  type LifecycleAction,
  actionBlockers,
  transitionInput,
  transitionInputErrors,
} from '@/features/consultations/lifecycle';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

interface LifecycleModalProps {
  consultation: Consultation;
  action: LifecycleAction;
  onClose: () => void;
}

/** Confirms a lifecycle transition with a comment (and a new close date for extend/reopen). */
export function LifecycleModal({ consultation, action, onClose }: LifecycleModalProps) {
  const { changeStatus } = useConsultations();
  const { toast } = useToast();
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const blockers = actionBlockers(consultation, action);
  const errors = transitionInputErrors(consultation, action, comment, closesAt);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (blockers.length || Object.keys(errors).length) return;
    setSaving(true);
    try {
      await changeStatus(consultation.id, transitionInput(action, comment, closesAt));
      toast({
        title: action.label,
        description:
          action.id === 'approve'
            ? `Approved by ${user?.name ?? 'you'}. The consultation is now scheduled.`
            : `${consultation.title} is now ${STATUS_LABELS[action.to].toLowerCase()}.`,
        variant: 'success',
      });
      onClose();
    } catch {
      // Toasted by the provider; keep the modal open with the entered comment.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ModalContent size="md">
        <form onSubmit={(event) => void submit(event)} noValidate>
          <ModalHeader>
            <ModalTitle>{action.label}</ModalTitle>
            <ModalDescription>{action.description}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {blockers.length ? (
              <Notice variant="warning" title="Resolve these first" leftBorder>
                <ul className="list-disc space-y-1 pl-5">
                  {blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </Notice>
            ) : (
              <Notice variant="info" leftBorder>
                {STATUS_LABELS[consultation.status]} → {STATUS_LABELS[action.to]}. The decision is recorded against{' '}
                {user?.name ?? 'your account'}.
              </Notice>
            )}
            {action.needsCloseDate ? (
              <TextField
                label="New close date"
                type="date"
                required
                value={closesAt}
                // description={`Currently closes ${formatDate(consultation.closesAt)}.`}
                error={submitted ? errors.closesAt : undefined}
                onChange={setClosesAt}
              />
            ) : null}
            <TextareaField
              label="Comment"
              required={action.commentRequired}
              rows={4}
              value={comment}
              placeholder={
                action.id === 'return' ? 'What needs to change before this can be approved?' : 'Optional note for the record.'
              }
              error={submitted ? errors.comment : undefined}
              onChange={setComment}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={action.destructive ? 'destructive' : 'primary'}
              disabled={blockers.length > 0 || saving}
              loading={saving}
            >
              {action.label}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
