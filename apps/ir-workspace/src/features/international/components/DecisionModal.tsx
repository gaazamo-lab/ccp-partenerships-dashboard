import { type FormEvent, type ReactNode, useState } from 'react';

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
} from '@rfdtech/components';

import { TextareaField } from '@partner-crm/ui';

interface DecisionModalProps {
  title: string;
  description?: ReactNode;
  /** Reasons the action cannot happen yet; the confirm button stays disabled. */
  blockers: string[];
  commentRequired: boolean;
  confirmLabel: string;
  destructive?: boolean;
  actor: string;
  onConfirm: (comment: string) => Promise<boolean>;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}

/** Status changes for engagements and letters: blockers, an attributed comment, confirm. */
export function DecisionModal({
  title,
  description,
  blockers,
  commentRequired,
  confirmLabel,
  destructive,
  actor,
  onConfirm,
  onOpenChange,
  children,
}: DecisionModalProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (commentRequired && !comment.trim()) {
      setError('A comment is required for this decision.');
      return;
    }
    if (blockers.length) return;
    setSaving(true);
    const done = await onConfirm(comment.trim());
    setSaving(false);
    if (done) onOpenChange(false);
  };

  return (
    <Modal open onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={(event) => void submit(event)}>
          <ModalHeader>
            <ModalTitle>{title}</ModalTitle>
            {description ? <ModalDescription>{description}</ModalDescription> : null}
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
              <Notice variant="info" title="Recorded decision" leftBorder>
                This action is attributed to {actor} and kept in the record history.
              </Notice>
            )}
            {children}
            <TextareaField
              label="Comment"
              required={commentRequired}
              rows={3}
              value={comment}
              onChange={(value) => {
                setComment(value);
                setError('');
              }}
              placeholder={
                commentRequired ? 'Explain the reason for this decision.' : 'Optional note for the history.'
              }
              error={error}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={destructive ? 'destructive' : 'primary'}
              disabled={blockers.length > 0 || saving}
              loading={saving}
            >
              {confirmLabel}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
