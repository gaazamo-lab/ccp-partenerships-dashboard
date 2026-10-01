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

import { StakeholderFields } from '@/features/stakeholders/components/StakeholderFields';
import {
  type StakeholderErrors,
  stakeholderToInput,
  validateStakeholder,
} from '@/features/stakeholders/stakeholderForm';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type { Stakeholder, StakeholderInput } from '@/features/stakeholders/types';

interface StakeholderFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stakeholder: Stakeholder;
}

export function StakeholderFormModal({
  open,
  onOpenChange,
  stakeholder,
}: StakeholderFormModalProps) {
  const { updateStakeholder } = useCrm();
  const { toast } = useToast();
  const [form, setForm] = useState<StakeholderInput>(() => stakeholderToInput(stakeholder));
  const [duplicate, setDuplicate] = useState<Stakeholder | null>(null);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState<StakeholderErrors>({});

  const setField = <K extends keyof StakeholderInput>(field: K, value: StakeholderInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDuplicate(null);
    setFormError('');
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateStakeholder(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const result = updateStakeholder(stakeholder.id, form);
    if (!result.ok) {
      if (result.duplicate) setDuplicate(result.duplicate);
      else setFormError(result.message ?? 'The stakeholder could not be updated.');
      return;
    }
    toast({
      title: 'Stakeholder updated',
      description: `${form.name} now reflects the latest relationship details.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          onSubmit={handleSubmit}
          noValidate
        >
          <ModalHeader>
            <ModalTitle>Edit stakeholder</ModalTitle>
            <ModalDescription>
              Maintain the authoritative external organisation record in S081.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {/* <Notice variant="info" title="Authoritative data boundary" leftBorder>
              Student, staff, and alumni records belong to S027, S140, and S034 and cannot be
              created here.
            </Notice> */}
            {formError ? (
              <Notice variant="error" title="Changes not saved" leftBorder>
                {formError}
              </Notice>
            ) : null}
            {duplicate ? (
              <Notice variant="warning" title="Another record already matches" leftBorder>
                {duplicate.name} already uses this organisation name or website. Two records
                cannot share them — change the value, or update {duplicate.name} instead.
              </Notice>
            ) : null}
            <StakeholderFields form={form} onChange={setField} errors={errors} autoFocus />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
