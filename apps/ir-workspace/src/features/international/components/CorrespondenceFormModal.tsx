import { useState } from 'react';

import { useToast } from '@rfdtech/components';

import type {
  IrClassification,
  IrCorrespondence,
  IrCorrespondenceInput,
  IrDirection,
  IrLanguage,
} from '@partner-crm/types';
import { FormGrid, SelectField, TextField, TextareaField } from '@partner-crm/ui';

import { correspondenceErrors } from '../domain';
import { fromLocalInput } from '../format';
import { CLASSIFICATION_OPTIONS, CLET_SENDER, LANGUAGE_OPTIONS } from '../labels';
import { useIr } from '../state/useIr';
import { FormModal } from './FormModal';

interface CorrespondenceFormModalProps {
  direction: IrDirection;
  onOpenChange: (open: boolean) => void;
  onCreated?: (item: IrCorrespondence) => void;
}

/** Registers an inbound letter or opens an outbound draft. */
export function CorrespondenceFormModal({ direction, onOpenChange, onCreated }: CorrespondenceFormModalProps) {
  const { createCorrespondence, engagements, actor } = useIr();
  const { toast } = useToast();
  const inbound = direction === 'INBOUND';
  const [values, setValues] = useState<IrCorrespondenceInput>({
    direction,
    engagementId: null,
    sender: inbound ? '' : CLET_SENDER.EN,
    recipient: inbound ? 'Director-General, CLET' : '',
    subject: '',
    classification: 'INTERNAL',
    language: 'EN',
    owner: actor,
    receivedAt: null,
    responseDeadline: null,
    body: '',
    templateId: null,
    translationRef: null,
    documentRef: null,
  });
  const [received, setReceived] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof IrCorrespondenceInput, string>>>({});
  const set = <K extends keyof IrCorrespondenceInput>(key: K, value: IrCorrespondenceInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const input: IrCorrespondenceInput = {
      ...values,
      receivedAt: inbound && received ? fromLocalInput(received) : null,
      responseDeadline: deadline ? fromLocalInput(deadline) : null,
    };
    const next = correspondenceErrors(input);
    setErrors(next);
    if (Object.keys(next).length) return false;
    const saved = await createCorrespondence(input);
    if (!saved) return false;
    toast({
      title: inbound ? 'Letter registered' : 'Draft created',
      description: inbound
        ? `${saved.reference} registered as received.`
        : `${saved.reference} opened as a draft. Choose a template to prepare the letter.`,
      variant: 'success',
    });
    onCreated?.(saved);
    return true;
  };

  return (
    <FormModal
      title={inbound ? 'Register inbound letter' : 'Draft outbound letter'}
      // description="A reference (CLET/COR/year/sequence) is assigned when you save."
      submitLabel={inbound ? 'Register letter' : 'Create draft'}
      size="lg"
      onSubmit={submit}
      onOpenChange={onOpenChange}
    >
      <FormGrid>
        <TextField
          label="Subject"
          required
          value={values.subject}
          onChange={(value) => set('subject', value)}
          error={errors.subject}
          className="sm:col-span-2"
        />
        <TextField label="Sender" required value={values.sender} onChange={(value) => set('sender', value)} error={errors.sender} />
        <TextField
          label="Recipient"
          required
          value={values.recipient}
          onChange={(value) => set('recipient', value)}
          error={errors.recipient}
        />
        <SelectField
          label="Language"
          required
          value={values.language}
          onChange={(value) => {
            const language = value as IrLanguage;
            setValues((current) => ({
              ...current,
              language,
              sender: !inbound && Object.values(CLET_SENDER).includes(current.sender) ? CLET_SENDER[language] : current.sender,
            }));
          }}
          options={LANGUAGE_OPTIONS}
        />
        <SelectField
          label="Classification"
          value={values.classification}
          onChange={(value) => set('classification', value as IrClassification)}
          options={CLASSIFICATION_OPTIONS}
        />
        <TextField label="Owner" required value={values.owner} onChange={(value) => set('owner', value)} error={errors.owner} />
        <SelectField
          label="Engagement"
          value={values.engagementId ?? ''}
          onChange={(value) => set('engagementId', value || null)}
          options={engagements.map((item) => ({ value: item.id, label: `${item.reference} · ${item.title}` }))}
          placeholder="Not linked"
          clearable
          searchable
        />
        {inbound ? (
          <TextField
            label="Received"
            type="datetime-local"
            required
            value={received}
            onChange={setReceived}
            error={errors.receivedAt}
          />
        ) : null}
        <TextField
          label="Response deadline"
          type="datetime-local"
          value={deadline}
          onChange={setDeadline}
          error={errors.responseDeadline}
          // description="Overdue once passed while a response is owed."
        />
        <TextField
          label="S003 document reference"
          value={values.documentRef ?? ''}
          onChange={(value) => set('documentRef', value || null)}
          placeholder="S003-DOC-…"
        />
        <TextField
          label="Translation reference"
          value={values.translationRef ?? ''}
          onChange={(value) => set('translationRef', value || null)}
          placeholder="S086 job or reviewed manual translation"
        />
        {inbound ? (
          <TextareaField
            label="Summary"
            rows={3}
            value={values.body}
            onChange={(value) => set('body', value)}
            className="sm:col-span-2"
          />
        ) : null}
      </FormGrid>
    </FormModal>
  );
}
