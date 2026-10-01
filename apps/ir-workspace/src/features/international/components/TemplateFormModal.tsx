import { useState } from 'react';

import { useToast } from '@rfdtech/components';

import type { IrLanguage, IrLetterTemplate, IrLetterTemplateInput } from '@partner-crm/types';
import { FormGrid, SelectField, TextField, TextareaField } from '@partner-crm/ui';

import { letterDirection } from '../domain';
import { LANGUAGE_OPTIONS } from '../labels';
import { useIr } from '../state/useIr';
import { FormModal } from './FormModal';

interface TemplateFormModalProps {
  /** When set, saves the next version of this (active) template. */
  template?: IrLetterTemplate;
  onOpenChange: (open: boolean) => void;
}

export function TemplateFormModal({ template, onOpenChange }: TemplateFormModalProps) {
  const { createTemplate, updateTemplate } = useIr();
  const { toast } = useToast();
  const [values, setValues] = useState<IrLetterTemplateInput>({
    name: template?.name ?? '',
    language: template?.language ?? 'EN',
    subject: template?.subject ?? '',
    body: template?.body ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof IrLetterTemplateInput, string>>>({});
  const set = <K extends keyof IrLetterTemplateInput>(key: K, value: IrLetterTemplateInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const next: typeof errors = {};
    if (!values.name.trim()) next.name = 'Name the template.';
    if (!values.subject.trim()) next.subject = 'Enter a subject line.';
    if (!values.body.trim()) next.body = 'Write the template body.';
    setErrors(next);
    if (Object.keys(next).length) return false;
    const saved = template ? await updateTemplate(template.id, values) : await createTemplate(values);
    if (!saved) return false;
    toast({
      title: template ? 'New template version saved' : 'Template created',
      description: `${saved.name} (${saved.language}) is now version ${saved.version}. Existing letters keep the version they were drafted from.`,
      variant: 'success',
    });
    return true;
  };

  return (
    <FormModal
      title={template ? `New version of “${template.name}”` : 'New letter template'}
      // description={`Placeholders: ${PLACEHOLDERS.map((key) => `{{${key}}}`).join(', ')}`}
      submitLabel={template ? `Save as version ${template.version + 1}` : 'Create template'}
      size="xl"
      onSubmit={submit}
      onOpenChange={onOpenChange}
    >
      <FormGrid>
        <TextField
          label="Name"
          required
          value={values.name}
          onChange={(value) => set('name', value)}
          disabled={Boolean(template)}
          error={errors.name}
        />
        <SelectField
          label="Language"
          required
          value={values.language}
          onChange={(value) => set('language', value as IrLanguage)}
          options={LANGUAGE_OPTIONS}
          disabled={Boolean(template)}
          // description="One active template per name and language."
        />
      </FormGrid>
      <div dir={letterDirection(values.language)} className="space-y-5">
        <TextField label="Subject" required value={values.subject} onChange={(value) => set('subject', value)} error={errors.subject} />
        <TextareaField
          label="Body"
          required
          rows={12}
          value={values.body}
          onChange={(value) => set('body', value)}
          error={errors.body}
        />
      </div>
    </FormModal>
  );
}
