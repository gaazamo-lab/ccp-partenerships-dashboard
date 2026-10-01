import { useState } from 'react';

import { Notice, useToast } from '@rfdtech/components';

import type { IrGiftDirection, IrGiftInput } from '@partner-crm/types';
import { CheckboxField, FormGrid, SelectField, TextField, TextareaField } from '@partner-crm/ui';

import { giftErrors } from '../domain';
import { useIr } from '../state/useIr';
import { FormModal } from './FormModal';

const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'XOF', 'NGN', 'KES', 'JPY', 'MAD', 'EGP'];

interface GiftFormModalProps {
  /** Pre-links the gift to an engagement (from the engagement's Gifts tab). */
  engagementId?: string | null;
  onOpenChange: (open: boolean) => void;
}

export function GiftFormModal({ engagementId = null, onOpenChange }: GiftFormModalProps) {
  const { createGift, engagements } = useIr();
  const { toast } = useToast();
  const [values, setValues] = useState<IrGiftInput>({
    direction: 'RECEIVED',
    engagementId,
    giver: '',
    recipient: '',
    description: '',
    giftDate: '',
    valueKnown: true,
    value: null,
    currency: 'GHS',
  });
  const [valueText, setValueText] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof IrGiftInput, string>>>({});
  const set = <K extends keyof IrGiftInput>(key: K, value: IrGiftInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const input: IrGiftInput = {
      ...values,
      value: values.valueKnown && valueText.trim() !== '' ? Number(valueText) : null,
      currency: values.valueKnown ? values.currency : null,
    };
    const next = giftErrors(input);
    setErrors(next);
    if (Object.keys(next).length) return false;
    const saved = await createGift(input);
    if (!saved) return false;
    toast({
      title: 'Gift recorded',
      description:
        saved.s011Status === 'PENDING'
          ? 'Cross-flag to S011 queued. S011 has not acknowledged yet — retry from the gifts register.'
          : 'Given gifts are not flagged to S011.',
      variant: saved.s011Status === 'PENDING' ? 'warning' : 'success',
    });
    return true;
  };

  return (
    <FormModal
      title="Record official gift"
      // description="Gifts received are cross-flagged to the S011 gifts register."
      submitLabel="Record gift"
      size="lg"
      onSubmit={submit}
      onOpenChange={onOpenChange}
    >
      <FormGrid>
        <SelectField
          label="Direction"
          required
          value={values.direction}
          onChange={(value) => set('direction', value as IrGiftDirection)}
          options={[
            { value: 'RECEIVED', label: 'Received by CLET' },
            { value: 'GIVEN', label: 'Given by CLET' },
          ]}
        />
        <SelectField
          label="Engagement"
          value={values.engagementId ?? ''}
          onChange={(value) => set('engagementId', value || null)}
          options={engagements.map((item) => ({ value: item.id, label: `${item.reference} · ${item.title}` }))}
          placeholder="Not linked"
          clearable
          searchable
        />
        <TextField label="Giver" required value={values.giver} onChange={(value) => set('giver', value)} error={errors.giver} />
        <TextField
          label="Recipient"
          required
          value={values.recipient}
          onChange={(value) => set('recipient', value)}
          error={errors.recipient}
        />
        <TextareaField
          label="Description"
          required
          rows={2}
          value={values.description}
          onChange={(value) => set('description', value)}
          error={errors.description}
          className="sm:col-span-2"
        />
        <TextField
          label="Date"
          type="date"
          required
          value={values.giftDate}
          onChange={(value) => set('giftDate', value)}
          error={errors.giftDate}
        />
        <CheckboxField
          label="Value is known"
          checked={values.valueKnown}
          onChange={(checked) => {
            set('valueKnown', checked);
            if (!checked) setValueText('');
          }}
          // description="Untick when the value cannot be established; it is recorded as unknown."
        />
        {values.valueKnown ? (
          <>
            <TextField
              label="Value"
              type="number"
              required
              min={0}
              value={valueText}
              onChange={setValueText}
              error={errors.value}
            />
            <SelectField
              label="Currency"
              required
              value={values.currency ?? ''}
              onChange={(value) => set('currency', value || null)}
              options={CURRENCIES}
              error={errors.currency}
            />
          </>
        ) : null}
      </FormGrid>
      {values.direction === 'RECEIVED' ? (
        <Notice variant="info" leftBorder>
          The S011 flag starts as Pending. A repeated retry never creates a second flag.
        </Notice>
      ) : null}
    </FormModal>
  );
}
