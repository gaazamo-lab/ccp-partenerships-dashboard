import { type FormEvent, useMemo, useState } from 'react';

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

import type { PartnershipAgreement, UpdatePartnershipInput } from '@partner-crm/types';

import { AgreementFields } from '@/features/partnerships/components/AgreementFields';
import {
  type AgreementErrors,
  agreementPartyIds,
  isBlockedParty,
  parseDeliverables,
  validateAgreement,
} from '@/features/partnerships/partnershipForm';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import { useCrm } from '@/features/stakeholders/state/CrmContext';

interface AgreementFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreement: PartnershipAgreement;
}

export function AgreementFormModal({ open, onOpenChange, agreement }: AgreementFormModalProps) {
  const { stakeholders } = useCrm();
  const { updateAgreement } = usePartnerships();
  const { toast } = useToast();

  const [form, setForm] = useState<UpdatePartnershipInput>(() => ({
    stakeholderId: agreement.stakeholderId,
    partyStakeholderIds: agreement.partyStakeholderIds.filter(
      (id) => id !== agreement.stakeholderId,
    ),
    title: agreement.title,
    agreementType: agreement.agreementType,
    owner: agreement.owner,
    effectiveDate: agreement.effectiveDate,
    expiryDate: agreement.expiryDate,
    valueCommitment: agreement.valueCommitment,
    deliverables: [...agreement.deliverables],
    legalContractRef: agreement.legalContractRef,
    signedDocumentRef: agreement.signedDocumentRef,
  }));
  const [deliverablesText, setDeliverablesText] = useState(() => agreement.deliverables.join('\n'));
  const [errors, setErrors] = useState<AgreementErrors>({});

  const setField = <K extends keyof UpdatePartnershipInput>(
    field: K,
    value: UpdatePartnershipInput[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const selectedPartyIds = useMemo(() => agreementPartyIds(form), [form]);
  const deliverables = useMemo(() => parseDeliverables(deliverablesText), [deliverablesText]);

  const blockedParties = stakeholders.filter(
    (item) => selectedPartyIds.includes(item.id) && isBlockedParty(item),
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateAgreement(form, deliverables, { withSignedDocument: true });
    setErrors(found);
    if (Object.keys(found).length > 0 || blockedParties.length > 0) return;

    updateAgreement(agreement.id, {
      ...form,
      title: form.title.trim(),
      owner: form.owner.trim(),
      valueCommitment: form.valueCommitment.trim(),
      partyStakeholderIds: selectedPartyIds,
      deliverables,
      legalContractRef: form.legalContractRef?.trim() || null,
      signedDocumentRef: form.signedDocumentRef?.trim() || null,
    });
    toast({
      title: 'Agreement updated',
      description: `${agreement.reference} now reflects the latest parties, deliverables, and references.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="xl">
        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit}
          noValidate
        >
          <ModalHeader>
            <ModalTitle>Edit agreement record</ModalTitle>
            <ModalDescription>
              Maintain the structured S082 record without duplicating stakeholder or document master
              data.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            <Notice variant="info" title="System boundary" leftBorder>
              CLET is an implicit party. External organisations and contacts remain authoritative in
              S081; signed files remain in S003 and legal records in S136.
            </Notice>
            {blockedParties.length > 0 ? (
              <Notice variant="warning" title="Party cannot proceed" leftBorder>
                {blockedParties.map((item) => item.name).join(', ')} must clear S203 screening or be
                reactivated before this record can be saved.
              </Notice>
            ) : null}
            <AgreementFields
              form={form}
              onChange={setField}
              stakeholders={stakeholders}
              errors={errors}
              deliverablesText={deliverablesText}
              onDeliverablesTextChange={(value) => {
                setDeliverablesText(value);
                setErrors((current) =>
                  current.deliverables ? { ...current, deliverables: undefined } : current,
                );
              }}
              deliverableCount={deliverables.length}
              includeSignedDocument
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={blockedParties.length > 0}>
              Save changes
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
