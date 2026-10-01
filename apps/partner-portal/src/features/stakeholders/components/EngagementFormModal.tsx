import { type FormEvent, useState } from 'react';

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

import { FormGrid, SelectField, TextField, TextareaField } from '@/features/shared';
import { ENGAGEMENT_TYPES } from '@/features/stakeholders/constants';
import { todayIso } from '@/features/stakeholders/engagements';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type { EngagementInput, EngagementType } from '@/features/stakeholders/types';

type EngagementErrors = Partial<Record<'title' | 'summary' | 'date', string>>;

function validate(form: EngagementInput, today: string): EngagementErrors {
  const errors: EngagementErrors = {};
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (!form.summary.trim()) errors.summary = 'Summary is required.';
  if (!form.date) errors.date = 'Enter the date the engagement took place.';
  else if (form.date > today) errors.date = 'Log engagements once they have happened.';
  return errors;
}

export function EngagementFormModal({
  open,
  onOpenChange,
  stakeholderId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stakeholderId: string;
}) {
  const { addEngagement } = useCrm();
  const { toast } = useToast();
  const [form, setForm] = useState<EngagementInput>(() => ({
    type: 'Meeting',
    title: '',
    summary: '',
    date: todayIso(),
  }));
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<EngagementErrors>({});

  const setField = <K extends keyof EngagementInput>(field: K, value: EngagementInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => (field in current ? { ...current, [field]: undefined } : current));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form, todayIso());
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    const result = addEngagement(stakeholderId, {
      ...form,
      title: form.title.trim(),
      summary: form.summary.trim(),
    });
    if (!result.ok) {
      setError(result.message ?? 'Engagement could not be recorded.');
      return;
    }
    toast({
      title: 'Engagement recorded',
      description: 'The activity has been added to the stakeholder 360 timeline.',
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <form onSubmit={handleSubmit} noValidate>
          <ModalHeader>
            <ModalTitle>Log engagement</ModalTitle>
            <ModalDescription>
              Add a meeting, call, email, letter, event, campaign or MOU milestone to the
              relationship history.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {error ? (
              <Notice variant="error" title="Engagement blocked" leftBorder>
                {error}
              </Notice>
            ) : null}

            <FormGrid>
              <SelectField
                label="Activity type"
                value={form.type}
                onChange={(value) => setField('type', value as EngagementType)}
                options={ENGAGEMENT_TYPES}
              />
              <TextField
                label="Date"
                type="date"
                required
                max={todayIso()}
                value={form.date ?? ''}
                onChange={(value) => setField('date', value)}
                error={errors.date}
              />
            </FormGrid>
            <TextField
              label="Title"
              required
              autoFocus
              value={form.title}
              onChange={(value) => setField('title', value)}
              error={errors.title}
            />
            <TextareaField
              label="Summary"
              required
              rows={4}
              value={form.summary}
              onChange={(value) => setField('summary', value)}
              // description="What happened, and what it means for the relationship."
              error={errors.summary}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save engagement</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
