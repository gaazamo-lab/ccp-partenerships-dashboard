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

import { FormGrid, SelectField, TextField } from '@/features/shared';
import { type ConsentErrors, validateConsent } from '@/features/stakeholders/consent';
import { CONSENT_CHANNELS } from '@/features/stakeholders/constants';
import { todayIso } from '@/features/stakeholders/engagements';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type {
  ConsentChannel,
  ConsentInput,
  StakeholderContact,
} from '@/features/stakeholders/types';

export type ConsentAction = 'record' | 'withdraw';

/**
 * Records an S188 consent decision — given or withdrawn — with the date and
 * channel the Data Protection Act record needs. A withdrawn contact drops out
 * of every segment immediately.
 */
export function ConsentModal({
  open,
  onOpenChange,
  contact,
  action,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: StakeholderContact;
  action: ConsentAction;
}) {
  const { recordConsent } = useCrm();
  const { toast } = useToast();
  const [form, setForm] = useState<ConsentInput>({
    consent: action === 'record' ? 'Consented' : 'Withdrawn',
    consentDate: todayIso(),
    consentChannel: action === 'record' ? 'Form' : (contact.consentChannel ?? 'Email'),
  });
  const [errors, setErrors] = useState<ConsentErrors>({});
  const [error, setError] = useState('');
  const withdrawing = action === 'withdraw';

  const setField = <K extends keyof ConsentInput>(field: K, value: ConsentInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (field in current ? { ...current, [field]: undefined } : current));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateConsent(form, todayIso());
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    const result = recordConsent(contact.id, form);
    if (!result.ok) {
      setError(result.message ?? 'Consent could not be saved.');
      return;
    }
    toast({
      title: withdrawing ? 'Consent withdrawn' : 'Consent recorded',
      description: withdrawing
        ? `${contact.name} is excluded from every segment from now on.`
        : `${contact.name} can now receive S075 and S088 outreach.`,
      variant: withdrawing ? 'warning' : 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={handleSubmit} noValidate>
          <ModalHeader>
            <ModalTitle>{withdrawing ? 'Withdraw consent' : 'Record consent'}</ModalTitle>
            <ModalDescription>
              {contact.name} · S188 consent record under the Data Protection Act, 2012.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {error ? (
              <Notice variant="error" title="Consent not saved" leftBorder>
                {error}
              </Notice>
            ) : null}
            {withdrawing ? (
              <Notice variant="warning" title="Outreach stops immediately" leftBorder>
                Newsletters and consultations resolve segments at send time, so {contact.name}{' '}
                will not be included in any future send.
              </Notice>
            ) : null}
            <FormGrid>
              <TextField
                label={withdrawing ? 'Withdrawn on' : 'Consent given on'}
                type="date"
                required
                max={todayIso()}
                value={form.consentDate ?? ''}
                onChange={(value) => setField('consentDate', value || null)}
                error={errors.consentDate}
              />
              <SelectField
                label="Channel"
                required
                value={form.consentChannel ?? ''}
                onChange={(value) =>
                  setField('consentChannel', (value || null) as ConsentChannel | null)
                }
                options={CONSENT_CHANNELS}
                placeholder="How it was received"
                error={errors.consentChannel}
              />
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={withdrawing ? 'destructive' : 'primary'}>
              {withdrawing ? 'Withdraw consent' : 'Record consent'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
