import { type FormEvent, useState } from 'react';

import {
  Button,
  Field,
  FieldControl,
  FieldLabel,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Notice,
  Radio,
  RadioGroup,
  useToast,
} from '@rfdtech/components';

import { useAuth } from '@partner-crm/auth';

import { TextField, TextareaField } from '@/features/shared';
import {
  type ScreeningDecisionErrors,
  validateScreeningDecision,
} from '@/features/stakeholders/screening';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type {
  ScreeningDecisionInput,
  Stakeholder,
  StakeholderContact,
} from '@/features/stakeholders/types';

type Outcome = ScreeningDecisionInput['outcome'];

const OUTCOMES: Array<{ value: Outcome; label: string; description: string }> = [
  {
    value: 'Cleared',
    label: 'Cleared',
    description: 'No sanctions, PEP or watchlist match. Engagement may proceed.',
  },
  {
    value: 'Review required',
    label: 'Review required',
    description: 'Possible match needing escalation. Engagement stays blocked.',
  },
  {
    value: 'Rejected',
    label: 'Rejected',
    description: 'Confirmed match. Engagement stays blocked until the contact is deactivated.',
  },
];

/**
 * Records the S203 decision for one contact. The reviewer is always the
 * signed-in user and the timestamp is set when the decision is saved, so the
 * S204 audit trail cannot be back-dated from this form.
 */
export function ScreeningDecisionModal({
  open,
  onOpenChange,
  contact,
  stakeholder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: StakeholderContact;
  stakeholder: Stakeholder;
}) {
  const { recordScreening } = useCrm();
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<ScreeningDecisionInput>({
    outcome: 'Cleared',
    notes: '',
    caseRef: contact.screeningRecord?.caseRef ?? '',
  });
  const [errors, setErrors] = useState<ScreeningDecisionErrors>({});
  const [error, setError] = useState('');

  const setField = <K extends keyof ScreeningDecisionInput>(
    field: K,
    value: ScreeningDecisionInput[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors({});
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateScreeningDecision(form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    const reviewer = user?.name ?? 'Unknown reviewer';
    const result = recordScreening(
      contact.id,
      { ...form, caseRef: form.caseRef?.trim() || null },
      reviewer,
    );
    if (!result.ok) {
      setError(result.message ?? 'The decision could not be saved.');
      return;
    }
    toast({
      title: `Screening ${form.outcome.toLowerCase()}`,
      description:
        form.outcome === 'Cleared'
          ? `${contact.name} is eligible for engagement.`
          : `${stakeholder.name} remains blocked from engagement.`,
      variant: form.outcome === 'Cleared' ? 'success' : 'warning',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={handleSubmit} noValidate>
          <ModalHeader>
            <ModalTitle>Record screening decision</ModalTitle>
            <ModalDescription>
              {contact.name} · {contact.role || 'Contact'} at {stakeholder.name}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {error ? (
              <Notice variant="error" title="Decision not saved" leftBorder>
                {error}
              </Notice>
            ) : null}

            <Field>
              <FieldLabel>S203 outcome</FieldLabel>
              <FieldControl>
                <RadioGroup
                  value={form.outcome}
                  onValueChange={(value) => setField('outcome', value as Outcome)}
                  variant="card"
                >
                  {OUTCOMES.map((option) => (
                    <Radio
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      // description={option.description}
                    />
                  ))}
                </RadioGroup>
              </FieldControl>
            </Field>

            <TextField
              label="S203 case reference"
              required={form.outcome === 'Rejected'}
              value={form.caseRef ?? ''}
              onChange={(value) => setField('caseRef', value.toUpperCase())}
              placeholder="S203-2026-00123"
              error={errors.caseRef}
            />
            <TextareaField
              label="Reviewer notes"
              required={form.outcome !== 'Cleared'}
              rows={4}
              value={form.notes}
              onChange={(value) => setField('notes', value)}
              // description="What the screening found and why you reached this outcome."
              error={errors.notes}
            />

            <p className="text-sm text-foreground-muted">
              Recorded by <strong className="text-foreground">{user?.name ?? 'you'}</strong> at
              the time you save. The decision is logged to S204.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={form.outcome === 'Rejected' ? 'destructive' : 'primary'}
            >
              Save decision
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
