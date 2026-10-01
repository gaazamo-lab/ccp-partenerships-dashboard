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

import type { PartnershipAgreement, TerminatePartnershipInput } from '@partner-crm/types';

import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import { FormGrid, TextField, TextareaField } from '@/features/shared';

/** Exit evidence lives in S003, as either a document or a closed archive. */
const EXIT_REF_PATTERN = /^S003-(DOC|ARCH)-\d{4}-\d{4}$/i;

type TerminationErrors = Partial<Record<keyof TerminatePartnershipInput, string>>;

function validate(form: TerminatePartnershipInput): TerminationErrors {
  const errors: TerminationErrors = {};
  if (!form.terminatedAt) errors.terminatedAt = 'A termination date is required.';
  if (!form.reason.trim()) errors.reason = 'Reason is required.';
  if (!EXIT_REF_PATTERN.test(form.documentationRef.trim())) {
    errors.documentationRef = 'Enter a valid S003 DOC or ARCH reference.';
  }
  if (!EXIT_REF_PATTERN.test(form.finalArchiveRef.trim())) {
    errors.finalArchiveRef = 'Enter a valid S003 DOC or ARCH reference.';
  }
  return errors;
}

export function TerminationFormModal({
  agreement,
  approvedBy,
  blockers,
  open,
  onOpenChange,
}: {
  agreement: PartnershipAgreement;
  approvedBy: string;
  blockers: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { terminateAgreement } = usePartnerships();
  const { toast } = useToast();
  const [form, setForm] = useState<TerminatePartnershipInput>({
    terminatedAt: new Date().toISOString().slice(0, 10),
    reason: '',
    documentationRef: '',
    finalArchiveRef: '',
  });
  const [errors, setErrors] = useState<TerminationErrors>({});

  const setField = <K extends keyof TerminatePartnershipInput>(
    field: K,
    value: TerminatePartnershipInput[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (field in current ? { ...current, [field]: undefined } : current));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (blockers.length > 0 || Object.keys(found).length > 0) return;

    terminateAgreement(
      agreement.id,
      {
        ...form,
        reason: form.reason.trim(),
        documentationRef: form.documentationRef.trim(),
        finalArchiveRef: form.finalArchiveRef.trim(),
      },
      approvedBy,
    );
    toast({
      title: 'Agreement terminated',
      description: `${agreement.reference} has been closed with its final archive recorded.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={submit} noValidate>
          <ModalHeader>
            <ModalTitle>Terminate agreement</ModalTitle>
            <ModalDescription>
              Complete the formal exit record and preserve the supporting evidence references.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {blockers.length > 0 ? (
              <Notice variant="warning" title="Termination is blocked" leftBorder>
                <ul className="list-disc space-y-1 pl-5">
                  {blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              </Notice>
            ) : (
              <Notice variant="warning" title="Final lifecycle action" leftBorder>
                Termination is final in this frontend workflow and will be attributed to{' '}
                {approvedBy}.
              </Notice>
            )}

            <TextField
              label="Termination date"
              type="date"
              required
              value={form.terminatedAt}
              onChange={(value) => setField('terminatedAt', value)}
              error={errors.terminatedAt}
            />
            <TextareaField
              label="Termination reason"
              required
              rows={4}
              value={form.reason}
              onChange={(value) => setField('reason', value)}
              // description="The grounds for exit, as they will read in the closed record."
              error={errors.reason}
            />

            <FormGrid>
              <TextField
                label="Termination document"
                required
                value={form.documentationRef}
                onChange={(value) => setField('documentationRef', value)}
                placeholder="S003-DOC-YYYY-NNNN"
                error={errors.documentationRef}
              />
              <TextField
                label="Final evidence archive"
                required
                value={form.finalArchiveRef}
                onChange={(value) => setField('finalArchiveRef', value)}
                placeholder="S003-ARCH-YYYY-NNNN"
                // description="Reference the complete exit and evidence archive."
                error={errors.finalArchiveRef}
              />
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={blockers.length > 0}>
              Confirm termination
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
