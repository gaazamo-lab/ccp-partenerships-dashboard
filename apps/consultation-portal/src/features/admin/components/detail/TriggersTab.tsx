import { type FormEvent, useState } from 'react';

import { Badge, Button, Switch, useToast } from '@rfdtech/components';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';

import type {
  Consultation,
  ConsultationTrigger,
  ConsultationTriggerType,
} from '@partner-crm/types';
import { EmptyState, FormGrid, SectionCard, SelectField, TextField } from '@partner-crm/ui';

import { TRIGGER_LABELS, TRIGGER_SOURCE_HINTS } from '@/features/consultations/constants';
import { consultationInput } from '@/features/consultations/domain';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

interface TriggersTabProps {
  consultation: Consultation;
  denied?: string;
}

const TYPE_OPTIONS = (Object.keys(TRIGGER_LABELS) as ConsultationTriggerType[]).map((value) => ({
  value,
  label: TRIGGER_LABELS[value],
}));

/** Automated deployment rules: post-event (S078), registration completed, calendar. */
export function TriggersTab({ consultation, denied }: TriggersTabProps) {
  const { updateConsultation } = useConsultations();
  const { toast } = useToast();
  const [type, setType] = useState<ConsultationTriggerType>('POST_EVENT');
  const [sourceRef, setSourceRef] = useState('');
  const [delayDays, setDelayDays] = useState('1');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const readOnly = Boolean(denied) || consultation.status === 'ARCHIVED';
  const delay = Number(delayDays);
  const errors = {
    sourceRef: sourceRef.trim() ? undefined : 'Enter the event, programme or calendar reference.',
    delayDays:
      Number.isInteger(delay) && delay >= 0 && delay <= 90
        ? undefined
        : 'Enter a whole number of days between 0 and 90.',
  };

  const save = async (triggers: ConsultationTrigger[], title: string) => {
    setSaving(true);
    try {
      await updateConsultation(consultation.id, { ...consultationInput(consultation), triggers });
      toast({ title, variant: 'success' });
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (errors.sourceRef || errors.delayDays) return;
    const trigger: ConsultationTrigger = {
      id: `TRG-${crypto.randomUUID().slice(0, 8)}`,
      type,
      sourceRef: sourceRef.trim(),
      delayDays: delay,
      active: true,
    };
    if (await save([...consultation.triggers, trigger], 'Trigger added')) {
      setSourceRef('');
      setSubmitted(false);
    }
  };

  return (
    <div className="flex flex-col gap-body">
      <SectionCard
        title="Automated triggers" /* description="Deploy this consultation automatically after an event, a completed registration or on an institutional calendar date." */
      >
        {consultation.triggers.length ? (
          <ul className="divide-y divide-border">
            {consultation.triggers.map((trigger) => (
              <li
                key={trigger.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{TRIGGER_LABELS[trigger.type]}</span>
                    <Badge variant={trigger.active ? 'success' : 'outline'}>
                      {trigger.active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground-muted">
                    {trigger.sourceRef} ·{' '}
                    {trigger.delayDays === 0
                      ? 'same day'
                      : `${trigger.delayDays} day${trigger.delayDays === 1 ? '' : 's'} after`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    aria-label={`${trigger.active ? 'Pause' : 'Activate'} trigger`}
                    checked={trigger.active}
                    disabled={readOnly || saving}
                    onCheckedChange={(active) =>
                      void save(
                        consultation.triggers.map((item) =>
                          item.id === trigger.id ? { ...item, active } : item,
                        ),
                        active ? 'Trigger activated' : 'Trigger paused',
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove trigger"
                    disabled={readOnly || saving}
                    title={denied}
                    onClick={() =>
                      void save(
                        consultation.triggers.filter((item) => item.id !== trigger.id),
                        'Trigger removed',
                      )
                    }
                  >
                    <Trash2 size={16} aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<CalendarClock size={20} aria-hidden />}
            message="No triggers configured"
            hint="Add a rule below to send this consultation automatically."
          />
        )}
      </SectionCard>

      <SectionCard title="Add trigger">
        <form onSubmit={(event) => void add(event)} className="space-y-4" noValidate>
          <FormGrid>
            <SelectField
              label="When"
              required
              value={type}
              options={TYPE_OPTIONS}
              disabled={readOnly}
              onChange={(value) => setType(value as ConsultationTriggerType)}
            />
            <TextField
              label="Source reference"
              required
              value={sourceRef}
              placeholder={TRIGGER_SOURCE_HINTS[type]}
              // description={TRIGGER_SOURCE_HINTS[type]}
              disabled={readOnly}
              error={submitted ? errors.sourceRef : undefined}
              onChange={setSourceRef}
            />
            <TextField
              label="Delay (days)"
              type="number"
              min={0}
              max={90}
              value={delayDays}
              disabled={readOnly}
              error={submitted ? errors.delayDays : undefined}
              onChange={setDelayDays}
            />
          </FormGrid>
          <Button
            type="submit"
            variant="outline"
            disabled={readOnly || saving}
            loading={saving}
            title={denied}
          >
            <Plus size={15} aria-hidden /> Add trigger
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
