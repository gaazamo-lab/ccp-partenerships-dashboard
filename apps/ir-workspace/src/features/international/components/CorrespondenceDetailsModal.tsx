import { useState } from 'react';

import { useToast } from '@rfdtech/components';

import type { IrCorrespondence } from '@partner-crm/types';
import { FormGrid, SelectField, TextField } from '@partner-crm/ui';

import { correspondenceErrors, correspondenceToInput } from '../domain';
import { fromLocalInput, toLocalInput } from '../format';
import { useIr } from '../state/useIr';
import { FormModal } from './FormModal';

/** Register metadata that is not the approved text: owner, deadline and references. */
export function CorrespondenceDetailsModal({
  item,
  onOpenChange,
}: {
  item: IrCorrespondence;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateCorrespondence, engagements } = useIr();
  const { toast } = useToast();
  const [owner, setOwner] = useState(item.owner);
  const [deadline, setDeadline] = useState(toLocalInput(item.responseDeadline));
  const [documentRef, setDocumentRef] = useState(item.documentRef ?? '');
  const [translationRef, setTranslationRef] = useState(item.translationRef ?? '');
  const [engagementId, setEngagementId] = useState(item.engagementId ?? '');
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    const input = {
      ...correspondenceToInput(item),
      owner,
      responseDeadline: deadline ? fromLocalInput(deadline) : null,
      documentRef: documentRef || null,
      translationRef: translationRef || null,
      engagementId: engagementId || null,
    };
    const errors = correspondenceErrors(input);
    setError(errors.owner ?? errors.responseDeadline);
    if (Object.keys(errors).length) return false;
    const saved = await updateCorrespondence(item.id, input);
    if (!saved) return false;
    toast({ title: 'Register details saved', description: saved.reference, variant: 'success' });
    return true;
  };

  return (
    <FormModal
      title="Edit register details"
      // description="These details do not change the letter text or its approval."
      submitLabel="Save details"
      onSubmit={submit}
      onOpenChange={onOpenChange}
    >
      <FormGrid>
        <TextField label="Owner" required value={owner} onChange={setOwner} error={error} />
        <TextField label="Response deadline" type="datetime-local" value={deadline} onChange={setDeadline} />
        <TextField label="S003 document reference" value={documentRef} onChange={setDocumentRef} placeholder="S003-DOC-…" />
        <TextField
          label="Translation reference"
          value={translationRef}
          onChange={setTranslationRef}
          // description="S086 job, or reviewed manual translation while S086 is unavailable."
        />
        <SelectField
          label="Engagement"
          value={engagementId}
          onChange={setEngagementId}
          options={engagements.map((entry) => ({ value: entry.id, label: `${entry.reference} · ${entry.title}` }))}
          placeholder="Not linked"
          clearable
          searchable
          className="sm:col-span-2"
        />
      </FormGrid>
    </FormModal>
  );
}
