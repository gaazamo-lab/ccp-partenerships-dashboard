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

import type { PartnershipAgreement, RenewPartnershipInput } from '@partner-crm/types';

import { LEGAL_REF_PATTERN, SIGNED_DOC_PATTERN } from '@/features/partnerships/partnershipForm';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import { FormGrid, TextField, TextareaField } from '@/features/shared';

type RenewalErrors = Partial<Record<keyof RenewPartnershipInput, string>>;

function validate(form: RenewPartnershipInput): RenewalErrors {
  const errors: RenewalErrors = {};

  if (!form.effectiveDate) errors.effectiveDate = 'A new effective date is required.';
  if (!form.expiryDate) {
    errors.expiryDate = 'A new expiry date is required.';
  } else if (form.effectiveDate && form.expiryDate <= form.effectiveDate) {
    errors.expiryDate = 'Expiry must be after the effective date.';
  }

  if (!form.legalContractRef.trim()) {
    errors.legalContractRef = 'The renewed contract reference is required.';
  } else if (!LEGAL_REF_PATTERN.test(form.legalContractRef.trim())) {
    errors.legalContractRef = 'Use the format S136-CTR-YYYY-NNNN.';
  }

  if (!form.signedDocumentRef.trim()) {
    errors.signedDocumentRef = 'The signed-document reference is required.';
  } else if (!SIGNED_DOC_PATTERN.test(form.signedDocumentRef.trim())) {
    errors.signedDocumentRef = 'Use the format S003-DOC-YYYY-NNNN.';
  }

  if (!form.termsSummary.trim()) errors.termsSummary = 'Summarise the renewed terms.';

  return errors;
}

export function RenewalFormModal({
  agreement,
  actor,
  open,
  onOpenChange,
}: {
  agreement: PartnershipAgreement;
  actor: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { renewAgreement } = usePartnerships();
  const { toast } = useToast();
  const [form, setForm] = useState<RenewPartnershipInput>({
    effectiveDate: '',
    expiryDate: '',
    legalContractRef: '',
    signedDocumentRef: '',
    termsSummary: agreement.valueCommitment,
  });
  const [errors, setErrors] = useState<RenewalErrors>({});

  const setField = <K extends keyof RenewPartnershipInput>(
    field: K,
    value: RenewPartnershipInput[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (field in current ? { ...current, [field]: undefined } : current));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    renewAgreement(
      agreement.id,
      {
        ...form,
        legalContractRef: form.legalContractRef.trim(),
        signedDocumentRef: form.signedDocumentRef.trim(),
        termsSummary: form.termsSummary.trim(),
      },
      actor,
    );
    toast({
      title: 'Renewal recorded',
      description: `${agreement.reference} is active under its renewed term.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={submit} noValidate>
          <ModalHeader>
            <ModalTitle>Complete agreement renewal</ModalTitle>
            <ModalDescription>
              Capture the executed term and replace the active legal and signed-document references.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            <Notice variant="info" title="New authoritative term" leftBorder>
              The prior term remains visible in lifecycle history. The renewed agreement returns to
              Active and its renewal milestones are recalculated from the new expiry date.
            </Notice>

            <FormGrid>
              <TextField
                label="New effective date"
                type="date"
                required
                value={form.effectiveDate}
                onChange={(value) => setField('effectiveDate', value)}
                error={errors.effectiveDate}
              />
              <TextField
                label="New expiry date"
                type="date"
                required
                value={form.expiryDate}
                onChange={(value) => setField('expiryDate', value)}
                min={form.effectiveDate || undefined}
                error={errors.expiryDate}
              />
              <TextField
                label="New S136 legal reference"
                required
                value={form.legalContractRef}
                onChange={(value) => setField('legalContractRef', value)}
                placeholder="S136-CTR-YYYY-NNNN"
                error={errors.legalContractRef}
              />
              <TextField
                label="New S003 signed document"
                required
                value={form.signedDocumentRef}
                onChange={(value) => setField('signedDocumentRef', value)}
                placeholder="S003-DOC-YYYY-NNNN"
                error={errors.signedDocumentRef}
              />
            </FormGrid>

            <TextareaField
              label="Renewed value and terms"
              required
              rows={4}
              value={form.termsSummary}
              onChange={(value) => setField('termsSummary', value)}
              // description="Summarise material changes and the value of the renewed term."
              error={errors.termsSummary}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Record renewal</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
