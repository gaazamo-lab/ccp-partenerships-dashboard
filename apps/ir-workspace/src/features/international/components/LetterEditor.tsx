import { useMemo, useState } from 'react';

import { Button, Notice, useToast } from '@rfdtech/components';
import { Save, Wand2 } from 'lucide-react';

import type { IrCorrespondence } from '@partner-crm/types';
import { FormGrid, SectionCard, SelectField, TextField, TextareaField } from '@partner-crm/ui';

import {
  type Placeholder,
  correspondenceToInput,
  formatLetterDate,
  isContentChange,
  letterDirection,
  renderTemplate,
  // unresolvedPlaceholders,
} from '../domain';
import { LANGUAGE_LABEL } from '../labels';
import { useIr } from '../state/useIr';
import { LetterPreview } from './LetterPreview';

interface LetterEditorProps {
  item: IrCorrespondence;
  editable: boolean;
  /** Current time, for the {{date}} default. */
  now: number;
}

/**
 * Letter preparation: choose an active template in the letter's language, fill
 * the placeholders, then edit the rendered text. Saving changed text after
 * approval creates a new version and sends the letter back to draft.
 */
export function LetterEditor({ item, editable, now }: LetterEditorProps) {
  const { templates, engagements, updateCorrespondence } = useIr();
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState(item.templateId ?? '');
  const [subject, setSubject] = useState(item.subject);
  const [body, setBody] = useState(item.body);
  const [saving, setSaving] = useState(false);
  const engagement = engagements.find((entry) => entry.id === item.engagementId);
  const [values, setValues] = useState<Record<Placeholder, string>>(() => ({
    recipient: item.recipient,
    sender: item.sender,
    date: formatLetterDate(new Date(now), item.language),
    subject: item.subject,
    engagement: engagement?.title ?? '',
  }));

  const options = useMemo(
    () =>
      templates
        .filter((template) => template.active && template.language === item.language)
        .map((template) => ({
          value: template.id,
          label: `${template.name} · v${template.version}`,
        })),
    [templates, item.language],
  );
  // const recorded = templates.find((template) => template.id === item.templateId);
  const selected = templates.find((template) => template.id === templateId);
  const dirty =
    subject !== item.subject || body !== item.body || templateId !== (item.templateId ?? '');
  // const unresolved = unresolvedPlaceholders(`${subject}\n${body}`);
  const invalidatesApproval =
    item.status === 'APPROVED' && isContentChange(item, { ...item, subject, body });

  const applyTemplate = () => {
    if (!selected) return;
    setSubject(renderTemplate(selected.subject, values));
    setBody(renderTemplate(selected.body, values));
  };

  const save = async () => {
    setSaving(true);
    const saved = await updateCorrespondence(item.id, {
      ...correspondenceToInput(item),
      subject,
      body,
      templateId: templateId || null,
    });
    setSaving(false);
    if (!saved) return;
    toast({
      title: 'Letter saved',
      description:
        saved.status !== item.status
          ? `Version ${saved.version} saved. The approval of version ${item.approvedVersion} no longer applies.`
          : `Version ${saved.version} saved.`,
      variant: saved.status !== item.status ? 'warning' : 'success',
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        title="Prepare letter"
        // description={`${LANGUAGE_LABEL[item.language]} · template version ${item.templateVersion ?? '—'} recorded${recorded ? ` (${recorded.name})` : ''}`}
        actions={
          <Button
            size="sm"
            disabled={!editable || !dirty || saving}
            loading={saving}
            onClick={() => void save()}
          >
            <Save size={15} aria-hidden /> Save version
          </Button>
        }
      >
        <div className="space-y-5">
          {!editable ? (
            <Notice variant="info" leftBorder>
              The text is locked in this status. It can change while in draft, after a return, or
              after approval (which creates a new version needing fresh approval).
            </Notice>
          ) : null}
          {invalidatesApproval ? (
            <Notice variant="warning" title="Saving invalidates the approval" leftBorder>
              Version {item.approvedVersion} was approved. Saving these changes creates version{' '}
              {item.version + 1} and returns the letter to draft.
            </Notice>
          ) : null}
          <FormGrid>
            <SelectField
              label={`Template (${LANGUAGE_LABEL[item.language]})`}
              value={templateId}
              onChange={setTemplateId}
              options={options}
              placeholder={
                options.length ? 'Choose a template' : 'No active template in this language'
              }
              clearable
              disabled={!editable}
            />
            <div className="flex items-end">
              <Button variant="outline" disabled={!editable || !selected} onClick={applyTemplate}>
                <Wand2 size={15} aria-hidden /> Render from template
              </Button>
            </div>
            {(Object.keys(values) as Placeholder[]).map((key) => (
              <TextField
                key={key}
                label={`{{${key}}}`}
                value={values[key]}
                disabled={!editable}
                onChange={(value) => setValues((current) => ({ ...current, [key]: value }))}
              />
            ))}
          </FormGrid>
          <div dir={letterDirection(item.language)} className="space-y-5">
            <TextField label="Subject" value={subject} onChange={setSubject} disabled={!editable} />
            <TextareaField
              label="Body"
              rows={14}
              value={body}
              onChange={setBody}
              disabled={!editable}
              // description={
              // unresolved.length
              // ? `Unfilled placeholders: ${unresolved.map((key) => `{{${key}}}`).join(', ')} — fill them before review.`
              // : 'Edit the rendered text freely before submitting for review.'
              // }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Letter preview" /* description="Current text on the CLET letterhead" */>
        <LetterPreview
          reference={item.reference}
          language={item.language}
          subject={subject}
          body={body}
          classification={item.classification}
        />
      </SectionCard>
    </div>
  );
}
