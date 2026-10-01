import { useState } from 'react';

import { useToast } from '@rfdtech/components';

import type { IrEngagement } from '@partner-crm/types';
import { FormGrid, TextField } from '@partner-crm/ui';

import { engagementToInput } from '../domain';
import { useIr } from '../state/useIr';
import { FormModal } from './FormModal';

/** Agenda, briefing-pack and minutes references. These are not material changes. */
export function ReferencesModal({
  engagement,
  onOpenChange,
}: {
  engagement: IrEngagement;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateEngagement } = useIr();
  const { toast } = useToast();
  const [agendaRef, setAgendaRef] = useState(engagement.agendaRef ?? '');
  const [briefingPackRef, setBriefingPackRef] = useState(engagement.briefingPackRef ?? '');
  const [minutesRef, setMinutesRef] = useState(engagement.minutesRef ?? '');

  const submit = async () => {
    const saved = await updateEngagement(engagement.id, {
      ...engagementToInput(engagement),
      agendaRef: agendaRef || null,
      briefingPackRef: briefingPackRef || null,
      minutesRef: minutesRef || null,
    });
    if (!saved) return false;
    toast({ title: 'Records updated', description: 'S003 references saved.', variant: 'success' });
    return true;
  };

  return (
    <FormModal
      title="Records and minutes"
      // description="S003 record IDs. Documents stay in the records service under the engagement's access rules."
      submitLabel="Save references"
      onSubmit={submit}
      onOpenChange={onOpenChange}
    >
      <FormGrid columns={1}>
        <TextField label="Agenda" value={agendaRef} onChange={setAgendaRef} placeholder="S003-DOC-…" />
        <TextField label="Briefing pack" value={briefingPackRef} onChange={setBriefingPackRef} placeholder="S003-DOC-…" />
        <TextField
          label="Meeting minutes"
          value={minutesRef}
          onChange={setMinutesRef}
          placeholder="S003-DOC-…"
          // description="Required before the engagement can be closed."
        />
      </FormGrid>
    </FormModal>
  );
}
