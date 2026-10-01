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
  type ModalSize,
} from '@rfdtech/components';

interface FormModalProps {
  title: string;
  description?: ReactNode;
  submitLabel: string;
  size?: ModalSize;
  /** Validate and save; resolve `true` to close. Entered data stays on `false`. */
  onSubmit: () => Promise<boolean> | boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}

/** Modal + form + footer, with the submit button disabled while saving. */
export function FormModal({
  title,
  description,
  submitLabel,
  size = 'md',
  onSubmit,
  onOpenChange,
  disabled,
  children,
}: FormModalProps) {
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (await onSubmit()) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onOpenChange={onOpenChange}>
      <ModalContent size={size}>
        <form onSubmit={(event) => void submit(event)} noValidate>
          <ModalHeader>
            <ModalTitle>{title}</ModalTitle>
            {description ? <ModalDescription>{description}</ModalDescription> : null}
          </ModalHeader>
          <ModalBody className="space-y-5">{children}</ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={disabled || saving} loading={saving}>
              {submitLabel}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
