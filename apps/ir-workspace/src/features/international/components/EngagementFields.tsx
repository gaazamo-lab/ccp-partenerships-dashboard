import type { IrClassification, IrDirection, IrEngagementType } from '@partner-crm/types';
import { FormGrid, SelectField, TextField, TextareaField } from '@partner-crm/ui';

import type { EngagementFormErrors, EngagementFormValues } from '../engagementForm';
import {
  CLASSIFICATION_OPTIONS,
  DIRECTION_OPTIONS,
  ENGAGEMENT_TYPE_OPTIONS,
  TIME_ZONE_OPTIONS,
} from '../labels';

interface EngagementFieldsProps {
  values: EngagementFormValues;
  errors: EngagementFormErrors;
  onChange: (next: EngagementFormValues) => void;
  /** Hides the S003 reference fields, which the minutes tab manages. */
  showReferences?: boolean;
}

/** The engagement register fields (SRS FR-01, FR-04), shared by create and edit. */
export function EngagementFields({ values, errors, onChange, showReferences = true }: EngagementFieldsProps) {
  const set = <K extends keyof EngagementFormValues>(key: K, value: EngagementFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="space-y-6">
      <FormGrid>
        <TextField
          label="Title"
          required
          value={values.title}
          onChange={(value) => set('title', value)}
          placeholder="e.g. ECOWAS Commission delegation on legal education"
          error={errors.title}
          className="sm:col-span-2"
        />
        <SelectField
          label="Engagement type"
          required
          value={values.type}
          onChange={(value) => set('type', value as IrEngagementType)}
          options={ENGAGEMENT_TYPE_OPTIONS}
        />
        <SelectField
          label="Direction"
          required
          value={values.direction}
          onChange={(value) => set('direction', value as IrDirection)}
          options={DIRECTION_OPTIONS}
          // description="Inbound: partners visit CLET. Outbound: CLET travels."
        />
        <TextareaField
          label="Purpose"
          value={values.purpose}
          onChange={(value) => set('purpose', value)}
          rows={3}
          placeholder="What the engagement should achieve."
          // description="Required before the plan can be submitted for approval."
          error={errors.purpose}
          className="sm:col-span-2"
        />
      </FormGrid>

      <FormGrid>
        <TextField
          label="Partner organisation"
          value={values.partnerName}
          onChange={(value) => set('partnerName', value)}
          placeholder="e.g. ECOWAS Commission"
        />
        <TextField
          label="S081 partner reference"
          value={values.partnerStakeholderId ?? ''}
          onChange={(value) => set('partnerStakeholderId', value || null)}
          placeholder="S081 stakeholder ID (optional)"
          // description="The partner stays in S081; only its ID is kept here."
        />
        <TextField
          label="Accountable owner"
          required
          value={values.owner}
          onChange={(value) => set('owner', value)}
          error={errors.owner}
        />
        <SelectField
          label="Classification"
          value={values.classification}
          onChange={(value) => set('classification', value as IrClassification)}
          options={CLASSIFICATION_OPTIONS}
        />
      </FormGrid>

      <FormGrid>
        <TextField
          label="Host"
          value={values.host}
          onChange={(value) => set('host', value)}
          placeholder="e.g. Director-General, CLET"
          // description="Used for clash detection."
        />
        <TextField
          label="Venue"
          value={values.venue}
          onChange={(value) => set('venue', value)}
          placeholder="e.g. CLET Head Office — Council Chamber"
          // description="Used for clash detection."
        />
        <TextField
          label="Starts"
          type="datetime-local"
          value={values.startAt}
          onChange={(value) => set('startAt', value)}
          error={errors.startAt}
        />
        <TextField
          label="Ends"
          type="datetime-local"
          value={values.endAt}
          onChange={(value) => set('endAt', value)}
          error={errors.endAt}
        />
        <SelectField
          label="Time zone"
          value={values.timeZone}
          onChange={(value) => set('timeZone', value)}
          options={TIME_ZONE_OPTIONS}
          searchable
          error={errors.timeZone}
        />
      </FormGrid>

      {showReferences ? (
        <FormGrid>
          <TextField
            label="Agenda (S003)"
            value={values.agendaRef ?? ''}
            onChange={(value) => set('agendaRef', value || null)}
            placeholder="S003-DOC-…"
          />
          <TextField
            label="Briefing pack (S003)"
            value={values.briefingPackRef ?? ''}
            onChange={(value) => set('briefingPackRef', value || null)}
            placeholder="S003-DOC-…"
          />
        </FormGrid>
      ) : null}
    </div>
  );
}
