import { useState } from 'react';

import { Notice, useToast } from '@rfdtech/components';

import type { IrEngagement, IrHandoffStatus, IrSupportRequest, IrSupportSystem } from '@partner-crm/types';
import { SelectField, TextField, TextareaField } from '@partner-crm/ui';

import { SUPPORT_TRANSITIONS, supportUpdateBlockers } from '../domain';
import { HANDOFF_STATUS_LABEL, SUPPORT_SYSTEM_LABEL, SUPPORT_SYSTEM_OPTIONS } from '../labels';
import { useIr } from '../state/useIr';
import { FormModal } from './FormModal';

const PLACEHOLDER: Record<IrSupportSystem, string> = {
  S084: 'e.g. Visa invitation letters and hotel block for the delegation',
  S078: 'e.g. Signing ceremony and working lunch',
  S086: 'e.g. French translation of the joint statement',
  S074: 'e.g. Official confirmation to the Embassy',
};

export function SupportRequestModal({
  engagement,
  onOpenChange,
}: {
  engagement: IrEngagement;
  onOpenChange: (open: boolean) => void;
}) {
  const { requestSupport } = useIr();
  const { toast } = useToast();
  const [system, setSystem] = useState<IrSupportSystem>('S084');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!description.trim()) {
      setError('Describe what is being requested.');
      return false;
    }
    const saved = await requestSupport(engagement.id, { system, description });
    if (!saved) return false;
    toast({
      title: 'Support requested',
      description: `${SUPPORT_SYSTEM_LABEL[system]} request logged as Requested — it is not complete until ${system} confirms.`,
      variant: 'success',
    });
    return true;
  };

  return (
    <FormModal
      title="Request support"
      // description="Travel, events, translation and official messages are delivered by their own systems."
      submitLabel="Send request"
      onSubmit={submit}
      onOpenChange={onOpenChange}
    >
      <SelectField
        label="Responsible system"
        required
        value={system}
        onChange={(value) => setSystem(value as IrSupportSystem)}
        options={SUPPORT_SYSTEM_OPTIONS}
      />
      <TextareaField
        label="What is needed"
        required
        rows={3}
        value={description}
        onChange={(value) => {
          setDescription(value);
          setError('');
        }}
        placeholder={PLACEHOLDER[system]}
        error={error}
      />
    </FormModal>
  );
}

const NEXT_LABEL: Record<IrHandoffStatus, string> = {
  REQUESTED: 'Retry — send again',
  ACKNOWLEDGED: 'Acknowledged by the system',
  COMPLETED: 'Completed by the system',
  FAILED: 'Failed',
};

export function SupportStatusModal({
  engagement,
  request,
  onOpenChange,
}: {
  engagement: IrEngagement;
  request: IrSupportRequest;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateSupport } = useIr();
  const { toast } = useToast();
  const options = SUPPORT_TRANSITIONS[request.status];
  const [status, setStatus] = useState<IrHandoffStatus>(options[0] ?? request.status);
  const [externalRef, setExternalRef] = useState(request.externalRef ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const input = { status, externalRef: externalRef || null };
    const blockers = supportUpdateBlockers(request, input, engagement.supportRequests);
    setError(blockers.join(' ') || null);
    if (blockers.length) return false;
    const saved = await updateSupport(engagement.id, request.id, input);
    if (!saved) return false;
    toast({
      title: 'Handoff updated',
      description: `${request.system}: ${HANDOFF_STATUS_LABEL[request.status]} → ${HANDOFF_STATUS_LABEL[status]}.`,
      variant: status === 'FAILED' ? 'warning' : 'success',
    });
    return true;
  };

  return (
    <FormModal
      title={`Update ${request.system} handoff`}
      // description={request.description}
      submitLabel="Update status"
      onSubmit={submit}
      onOpenChange={onOpenChange}
      disabled={options.length === 0}
    >
      <Notice variant="info" leftBorder>
        Record what {request.system} actually reported. A request is only complete when the
        responsible system confirms it.
      </Notice>
      <SelectField
        label="New status"
        required
        value={status}
        onChange={(value) => setStatus(value as IrHandoffStatus)}
        options={options.map((value) => ({ value, label: NEXT_LABEL[value] }))}
      />
      <TextField
        label={`${request.system} reference`}
        required={status === 'ACKNOWLEDGED' || status === 'COMPLETED'}
        value={externalRef}
        onChange={setExternalRef}
        placeholder={`${request.system}-…`}
        // description="The external ID issued by the responsible system. Each handoff has its own."
        error={error ?? undefined}
      />
    </FormModal>
  );
}
