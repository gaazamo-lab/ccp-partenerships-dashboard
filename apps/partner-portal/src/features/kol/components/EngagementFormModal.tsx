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

import type { KolEngagementType } from '@partner-crm/types';

import {
  type EngagementFieldErrors,
  engagementCreationError,
  hasErrors,
  validateEngagementInput,
} from '@/features/kol/domain';
import { ENGAGEMENT_TYPE_OPTIONS, displayName, fromDateInput } from '@/features/kol/kolForm';
import { useKol } from '@/features/kol/state/useKol';
import { FormGrid, SelectField, TextField, TextareaField } from '@/features/shared';

interface EngagementFormModalProps {
  /** Fixed KOL; when omitted the modal offers a picker of non-archived KOLs. */
  kolId?: string;
  defaultOwner: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EngagementFormModal({ kolId, defaultOwner, open, onOpenChange }: EngagementFormModalProps) {
  const { profiles, createEngagement } = useKol();
  const { toast } = useToast();
  const [selectedKol, setSelectedKol] = useState(kolId ?? '');
  const [type, setType] = useState<KolEngagementType>('PANEL');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [owner, setOwner] = useState(defaultOwner);
  const [externalRef, setExternalRef] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<EngagementFieldErrors & { kol?: string }>({});
  const [saving, setSaving] = useState(false);

  const profile = profiles.find((item) => item.id === selectedKol);
  const archivedError = profile ? engagementCreationError(profile) : null;
  const kolOptions = profiles
    .filter((item) => item.status !== 'ARCHIVED')
    .map((item) => ({ value: item.id, label: displayName(item) }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = {
      type,
      title,
      scheduledFor: fromDateInput(date),
      owner,
      externalRef: externalRef.trim() || null,
      notes,
    };
    const found: EngagementFieldErrors & { kol?: string } = validateEngagementInput(input);
    if (!selectedKol) found.kol = 'Choose the KOL to invite.';
    setErrors(found);
    if (hasErrors(found) || archivedError || !selectedKol) return;
    setSaving(true);
    const saved = await createEngagement(selectedKol, input);
    setSaving(false);
    if (!saved) return;
    toast({
      title: 'Engagement planned',
      description: `${saved.title} is in the outreach planner as Planned.`,
      variant: 'success',
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <form onSubmit={(event) => void submit(event)} noValidate>
          <ModalHeader>
            <ModalTitle>Invite / plan engagement</ModalTitle>
            <ModalDescription>
              Op-eds, panels, keynotes, S087 webinars, S093 podcasts, consultations and campaigns
              start as Planned and move through the outreach planner.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {archivedError ? (
              <Notice variant="warning" title="This KOL is archived" leftBorder>
                {archivedError}
              </Notice>
            ) : null}
            <FormGrid>
              {kolId ? null : (
                <SelectField
                  label="KOL"
                  required
                  className="sm:col-span-2"
                  value={selectedKol}
                  onChange={(value) => {
                    setSelectedKol(value);
                    setErrors((current) => ({ ...current, kol: undefined }));
                  }}
                  options={kolOptions}
                  searchable
                  searchPlaceholder="Search KOLs"
                  placeholder="Choose a KOL"
                  error={errors.kol}
                />
              )}
              <SelectField
                label="Engagement type"
                required
                value={type}
                onChange={(value) => setType(value as KolEngagementType)}
                options={ENGAGEMENT_TYPE_OPTIONS}
                error={errors.type}
              />
              <TextField
                label="Scheduled for"
                type="date"
                value={date}
                onChange={setDate}
                error={errors.scheduledFor}
                // description="Leave blank while the date is still being agreed."
              />
              <TextField
                label="Title"
                required
                className="sm:col-span-2"
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  setErrors((current) => ({ ...current, title: undefined }));
                }}
                error={errors.title}
                placeholder="e.g. Access to justice panel — Legal Year opening"
              />
              <TextField
                label="CLET owner"
                required
                value={owner}
                onChange={(value) => {
                  setOwner(value);
                  setErrors((current) => ({ ...current, owner: undefined }));
                }}
                error={errors.owner}
              />
              <TextField
                label="Event / webinar / episode reference"
                value={externalRef}
                onChange={setExternalRef}
                placeholder="e.g. S078-EVT-2026-031, S087-WEB-…, S093-EP-…"
              />
              <TextareaField
                label="Notes"
                className="sm:col-span-2"
                rows={3}
                value={notes}
                onChange={setNotes}
                placeholder="Brief, protocol clearances, logistics."
              />
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={saving || Boolean(archivedError)}>
              Plan engagement
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
