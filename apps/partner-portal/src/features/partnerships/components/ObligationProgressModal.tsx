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

import type { ObligationStatus, PartnershipObligation } from '@partner-crm/types';

import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import { SelectField, type SelectOption, TextareaField, labelize } from '@/features/shared';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'WAIVED', label: 'Waived' },
];

export function ObligationProgressModal({
  obligation,
  actor,
  open,
  onOpenChange,
}: {
  obligation: PartnershipObligation;
  actor: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addObligationProgress } = usePartnerships();
  const { toast } = useToast();
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<ObligationStatus>(obligation.status);
  const [error, setError] = useState('');
  const completionBlocked = status === 'COMPLETED' && !obligation.evidenceReferences.length;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) {
      setError('A progress note is required.');
      return;
    }
    if (completionBlocked) return;
    addObligationProgress({ obligationId: obligation.id, note: note.trim(), status }, actor);
    toast({
      title: 'Progress recorded',
      description: `${obligation.title} is now ${labelize(status)}.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={submit} noValidate>
          <ModalHeader>
            <ModalTitle>Add progress update</ModalTitle>
            <ModalDescription>{obligation.title}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {completionBlocked ? (
              <Notice variant="warning" title="Evidence required" leftBorder>
                Edit the obligation and add an S003 evidence reference before marking it complete.
              </Notice>
            ) : null}
            <SelectField
              label="Status after update"
              value={status}
              onChange={(value) => setStatus(value as ObligationStatus)}
              options={STATUS_OPTIONS}
            />
            <TextareaField
              label="Progress note"
              required
              rows={4}
              value={note}
              onChange={(value) => {
                setNote(value);
                setError('');
              }}
              placeholder="Summarise progress, blockers, decisions, or the reason for waiver."
              error={error}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={completionBlocked}>
              Save update
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
