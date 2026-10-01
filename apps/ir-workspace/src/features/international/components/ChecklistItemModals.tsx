import { useState } from 'react';

import { Notice, useToast } from '@rfdtech/components';

import type { IrEngagement, IrTaskStatus } from '@partner-crm/types';
import { CheckboxField, FormGrid, SelectField, TextField, TextareaField } from '@partner-crm/ui';

import { taskUpdateBlockers } from '../domain';
import { useIr } from '../state/useIr';
import { FormModal } from './FormModal';

type ItemKind = 'protocol' | 'followUp';

interface AddItemModalProps {
  engagement: IrEngagement;
  kind: ItemKind;
  onOpenChange: (open: boolean) => void;
}

/** Adds a protocol task (new checklist version) or a follow-up action. */
export function AddChecklistItemModal({ engagement, kind, onOpenChange }: AddItemModalProps) {
  const { addProtocolTask, addFollowUp } = useIr();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [person, setPerson] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [mandatory, setMandatory] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isTask = kind === 'protocol';

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Describe the action.';
    if (!person.trim()) next.person = isTask ? 'Assign the task to someone.' : 'Name the owner.';
    if (!isTask && !dueDate) next.dueDate = 'Follow-ups need a due date.';
    setErrors(next);
    if (Object.keys(next).length) return false;
    const saved = isTask
      ? await addProtocolTask(engagement.id, {
          title,
          assignee: person,
          dueDate: dueDate || null,
          mandatory,
          evidenceRef: null,
        })
      : await addFollowUp(engagement.id, { title, owner: person, dueDate, mandatory });
    if (!saved) return false;
    toast({
      title: isTask ? 'Protocol task added' : 'Follow-up assigned',
      description: isTask
        ? `Checklist is now version ${saved.checklistVersion}.`
        : `${person} owns “${title}”.`,
      variant: 'success',
    });
    return true;
  };

  return (
    <FormModal
      title={isTask ? 'Add protocol task' : 'Assign follow-up'}
      // description={
        // isTask
          // ? 'Mandatory tasks must be done (with evidence) or excepted before the visit can be scheduled.'
          // : 'Mandatory follow-ups must be done or excepted before the engagement can close.'
      // }
      submitLabel={isTask ? 'Add task' : 'Assign follow-up'}
      onSubmit={submit}
      onOpenChange={onOpenChange}
    >
      <FormGrid>
        <TextField
          label={isTask ? 'Task' : 'Action'}
          required
          value={title}
          onChange={setTitle}
          error={errors.title}
          className="sm:col-span-2"
        />
        <TextField
          label={isTask ? 'Assignee' : 'Owner'}
          required
          value={person}
          onChange={setPerson}
          error={errors.person}
        />
        <TextField
          label="Due date"
          type="date"
          required={!isTask}
          value={dueDate}
          onChange={setDueDate}
          error={errors.dueDate}
        />
        <CheckboxField
          label="Mandatory"
          checked={mandatory}
          onChange={setMandatory}
          // description={isTask ? 'Blocks scheduling while open.' : 'Blocks closure while open.'}
          className="sm:col-span-2"
        />
      </FormGrid>
    </FormModal>
  );
}

interface ResolveModalProps {
  engagement: IrEngagement;
  kind: ItemKind;
  item: { id: string; title: string; mandatory: boolean; status: IrTaskStatus };
  onOpenChange: (open: boolean) => void;
}

/** Completes an item (evidence for mandatory tasks) or records an authorised exception. */
export function ResolveChecklistItemModal({ engagement, kind, item, onOpenChange }: ResolveModalProps) {
  const { updateProtocolTask, updateFollowUp } = useIr();
  const { toast } = useToast();
  const [status, setStatus] = useState<'DONE' | 'EXCEPTION'>('DONE');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const evidenceRequired = kind === 'protocol' && item.mandatory;

  const submit = async () => {
    const input = { status, evidenceRef: evidenceRef || null, exceptionReason: exceptionReason || null };
    const blockers = taskUpdateBlockers(item, input, kind);
    setError(blockers[0] ?? null);
    if (blockers.length) return false;
    const saved =
      kind === 'protocol'
        ? await updateProtocolTask(engagement.id, item.id, input)
        : await updateFollowUp(engagement.id, item.id, input);
    if (!saved) return false;
    toast({
      title: status === 'DONE' ? 'Marked done' : 'Exception recorded',
      description: item.title,
      variant: 'success',
    });
    return true;
  };

  return (
    <FormModal
      title={item.title}
      // description={item.mandatory ? 'Mandatory item' : 'Optional item'}
      submitLabel={status === 'DONE' ? 'Mark done' : 'Record exception'}
      onSubmit={submit}
      onOpenChange={onOpenChange}
    >
      <SelectField
        label="Outcome"
        required
        value={status}
        onChange={(value) => {
          setStatus(value as 'DONE' | 'EXCEPTION');
          setError(null);
        }}
        options={[
          { value: 'DONE', label: 'Done' },
          { value: 'EXCEPTION', label: 'Authorised exception' },
        ]}
      />
      {status === 'DONE' && kind === 'protocol' ? (
        <TextField
          label="Evidence reference"
          required={evidenceRequired}
          value={evidenceRef}
          onChange={setEvidenceRef}
          placeholder="S003-DOC-… or the confirming system's ID"
          error={error && evidenceRequired ? error : undefined}
        />
      ) : null}
      {status === 'EXCEPTION' ? (
        <>
          <Notice variant="info" leftBorder>
            Record who authorised the exception and why. It is kept with the checklist.
          </Notice>
          <TextareaField
            label="Exception reason"
            required
            rows={3}
            value={exceptionReason}
            onChange={setExceptionReason}
            error={error ?? undefined}
          />
        </>
      ) : null}
    </FormModal>
  );
}
