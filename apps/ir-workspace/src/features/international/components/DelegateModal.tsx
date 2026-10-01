import { useState } from 'react';

import { useToast } from '@rfdtech/components';

import type { IrDelegationInput, IrEngagement } from '@partner-crm/types';
import { FormGrid, TextField } from '@partner-crm/ui';

import { useIr } from '../state/useIr';
import { FormModal } from './FormModal';

const EMPTY: IrDelegationInput = {
  name: '',
  contactRef: null,
  role: '',
  organisation: '',
  nationality: '',
  travelRequestRef: null,
};

export function DelegateModal({
  engagement,
  onOpenChange,
}: {
  engagement: IrEngagement;
  onOpenChange: (open: boolean) => void;
}) {
  const { addDelegate } = useIr();
  const { toast } = useToast();
  const [values, setValues] = useState<IrDelegationInput>({ ...EMPTY, organisation: engagement.partnerName });
  const [errors, setErrors] = useState<Partial<Record<keyof IrDelegationInput, string>>>({});
  const set = <K extends keyof IrDelegationInput>(key: K, value: IrDelegationInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = 'Enter the member’s name.';
    if (!values.role.trim()) next.role = 'Enter their role in the delegation.';
    if (!values.organisation.trim()) next.organisation = 'Enter their organisation.';
    setErrors(next);
    if (Object.keys(next).length) return false;
    const saved = await addDelegate(engagement.id, values);
    if (!saved) return false;
    toast({ title: 'Delegate added', description: `${values.name} joined the roster.`, variant: 'success' });
    return true;
  };

  return (
    <FormModal
      title="Add delegation member"
      // description="Link the S081 contact and the S084 travel or visa request rather than copying their details."
      submitLabel="Add member"
      onSubmit={submit}
      onOpenChange={onOpenChange}
    >
      <FormGrid>
        <TextField label="Name" required value={values.name} onChange={(value) => set('name', value)} error={errors.name} />
        <TextField
          label="Delegation role"
          required
          value={values.role}
          onChange={(value) => set('role', value)}
          placeholder="e.g. Head of delegation"
          error={errors.role}
        />
        <TextField
          label="Organisation"
          required
          value={values.organisation}
          onChange={(value) => set('organisation', value)}
          error={errors.organisation}
        />
        <TextField label="Nationality" value={values.nationality} onChange={(value) => set('nationality', value)} />
        <TextField
          label="S081 contact reference"
          value={values.contactRef ?? ''}
          onChange={(value) => set('contactRef', value || null)}
          placeholder="e.g. con-041"
          // description="Leave empty if the person is not yet in the CRM."
        />
        <TextField
          label="S084 travel / visa request"
          value={values.travelRequestRef ?? ''}
          onChange={(value) => set('travelRequestRef', value || null)}
          placeholder="e.g. S084-TR-2026-0412"
        />
      </FormGrid>
    </FormModal>
  );
}
