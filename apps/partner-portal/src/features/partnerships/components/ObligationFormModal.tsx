import { type FormEvent, useMemo, useState } from 'react';

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Notice,
  useToast,
} from '@rfdtech/components';

import type {
  ObligationStatus,
  PartnershipObligation,
  UpdateObligationInput,
} from '@partner-crm/types';

import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import {
  FormGrid,
  SelectField,
  type SelectOption,
  TextField,
  TextareaField,
} from '@/features/shared';

/** S003 evidence references are resolved literally by Records Management. */
const EVIDENCE_PATTERN = /^S003-(DOC|EVID|ARCH)-\d{4}-\d{4}$/i;

const REMINDER_OPTIONS: SelectOption[] = [
  { value: 'off', label: 'No reminder' },
  { value: '7', label: '7 days before' },
  { value: '14', label: '14 days before' },
  { value: '30', label: '30 days before' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'WAIVED', label: 'Waived' },
];

type ObligationErrors = Partial<
  Record<'title' | 'owner' | 'dueDate' | 'escalationOwner' | 'evidence', string>
>;

export function ObligationFormModal({
  open,
  onOpenChange,
  agreementId,
  actor,
  obligation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreementId: string;
  actor: string;
  obligation?: PartnershipObligation;
}) {
  const { createObligation, updateObligation } = usePartnerships();
  const { toast } = useToast();

  const [form, setForm] = useState<UpdateObligationInput>(() => ({
    title: obligation?.title ?? '',
    description: obligation?.description ?? '',
    owner: obligation?.owner ?? '',
    dueDate: obligation?.dueDate ?? '',
    status: obligation?.status ?? 'NOT_STARTED',
    evidenceReferences: obligation ? [...obligation.evidenceReferences] : [],
    reminderLeadDays: obligation?.reminderLeadDays ?? 14,
    escalationOwner: obligation?.escalationOwner ?? '',
  }));
  const [evidenceText, setEvidenceText] = useState(() =>
    (obligation?.evidenceReferences ?? []).join('\n'),
  );
  const [errors, setErrors] = useState<ObligationErrors>({});

  const setField = <K extends keyof UpdateObligationInput>(
    field: K,
    value: UpdateObligationInput[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (field in current ? { ...current, [field]: undefined } : current));
  };

  const evidenceReferences = useMemo(
    () => [
      ...new Set(
        evidenceText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ],
    [evidenceText],
  );

  const validate = (): ObligationErrors => {
    const found: ObligationErrors = {};
    if (!form.title.trim()) found.title = 'Title is required.';
    if (!form.owner.trim()) found.owner = 'Owner is required.';
    if (!form.dueDate) found.dueDate = 'Due date is required.';
    // A reminder with nobody to escalate to is a reminder that goes nowhere.
    if (form.reminderLeadDays !== null && !form.escalationOwner?.trim()) {
      found.escalationOwner = 'Set an escalation owner or turn reminders off.';
    }
    if (evidenceReferences.some((reference) => !EVIDENCE_PATTERN.test(reference))) {
      found.evidence = 'One or more S003 references has an invalid format.';
    } else if (form.status === 'COMPLETED' && evidenceReferences.length === 0) {
      found.evidence = 'Completion requires at least one evidence reference.';
    }
    return found;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (obligation) {
      updateObligation(
        obligation.id,
        {
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          owner: form.owner.trim(),
          evidenceReferences,
          escalationOwner: form.escalationOwner?.trim() || null,
        },
        actor,
      );
    } else {
      createObligation(
        {
          agreementId,
          title: form.title.trim(),
          description: form.description.trim(),
          owner: form.owner.trim(),
          dueDate: form.dueDate,
          reminderLeadDays: form.reminderLeadDays,
          escalationOwner: form.escalationOwner?.trim() || null,
        },
        actor,
      );
    }

    toast({
      title: obligation ? 'Obligation updated' : 'Obligation added',
      description: obligation
        ? 'Status, evidence, reminder, and escalation settings were saved.'
        : 'The deliverable is now tracked against this agreement.',
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={handleSubmit} noValidate>
          <ModalHeader>
            <ModalTitle>{obligation ? 'Edit obligation' : 'Add obligation'}</ModalTitle>
            <ModalDescription>
              Maintain ownership, deadlines, evidence, reminders, and completion state.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {obligation ? (
              <Notice variant="info" title="Evidence boundary" leftBorder>
                Store only S003 references here. Evidence files remain authoritative in Records
                Management.
              </Notice>
            ) : null}

            <TextField
              label="Obligation"
              required
              autoFocus
              value={form.title}
              onChange={(value) => setField('title', value)}
              error={errors.title}
            />
            <TextareaField
              label="Description"
              rows={3}
              value={form.description}
              onChange={(value) => setField('description', value)}
              // description="What has to happen for this to count as done."
            />

            <FormGrid>
              <TextField
                label="Owner"
                required
                value={form.owner}
                onChange={(value) => setField('owner', value)}
                error={errors.owner}
              />
              <TextField
                label="Due date"
                type="date"
                required
                value={form.dueDate}
                onChange={(value) => setField('dueDate', value)}
                error={errors.dueDate}
              />
              {obligation ? (
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(value) => setField('status', value as ObligationStatus)}
                  options={STATUS_OPTIONS}
                />
              ) : null}
              <SelectField
                label="Reminder schedule"
                value={form.reminderLeadDays === null ? 'off' : String(form.reminderLeadDays)}
                onChange={(value) =>
                  setField('reminderLeadDays', !value || value === 'off' ? null : Number(value))
                }
                options={REMINDER_OPTIONS}
                // description="Configured for delivery through S074."
              />
              <TextField
                className="sm:col-span-2"
                label="Escalation owner"
                required={form.reminderLeadDays !== null}
                value={form.escalationOwner ?? ''}
                onChange={(value) => setField('escalationOwner', value || null)}
                placeholder="Director, Strategic Partnerships"
                // description="Receives escalation when the obligation becomes overdue."
                error={errors.escalationOwner}
              />
            </FormGrid>

            {obligation ? (
              <TextareaField
                label="S003 evidence references"
                rows={4}
                value={evidenceText}
                onChange={(value) => {
                  setEvidenceText(value);
                  setErrors((current) =>
                    current.evidence ? { ...current, evidence: undefined } : current,
                  );
                }}
                placeholder={'S003-EVID-2026-0001\nS003-DOC-2026-0002'}
                // description="Enter one DOC, EVID, or ARCH reference per line."
                error={errors.evidence}
              />
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{obligation ? 'Save changes' : 'Add obligation'}</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
