import { FormGrid, SelectField, TextField, TextareaField } from '@/features/shared';
import {
  HEALTH_LEVELS,
  PIPELINE_STAGES,
  STAKEHOLDER_CATEGORIES,
} from '@/features/stakeholders/constants';
import type { StakeholderErrors } from '@/features/stakeholders/stakeholderForm';
import type {
  HealthLevel,
  PipelineStage,
  StakeholderCategory,
  StakeholderInput,
} from '@/features/stakeholders/types';

interface StakeholderFieldsProps {
  form: StakeholderInput;
  onChange: <K extends keyof StakeholderInput>(field: K, value: StakeholderInput[K]) => void;
  /** Populated only once the user has tried to submit. */
  errors: StakeholderErrors;
  autoFocus?: boolean;
}

/** Who the organisation is: name, category, location and website. */
export function OrganisationFields({
  form,
  onChange,
  errors,
  autoFocus,
}: StakeholderFieldsProps) {
  return (
    <>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <TextField
          label="Organisation name"
          required
          autoFocus={autoFocus}
          value={form.name}
          onChange={(value) => onChange('name', value)}
          placeholder="Enter the organisation's registered name"
          error={errors.name}
        />
        <TextField
          label="Short name"
          optional
          value={form.shortName}
          onChange={(value) => onChange('shortName', value)}
          maxLength={5}
          transform={(value) => value.toUpperCase()}
          placeholder="e.g. GBA"
          // description="Up to 5 letters"
        />
      </div>

      <FormGrid>
        <SelectField
          label="Category"
          value={form.category}
          onChange={(value) => onChange('category', value as StakeholderCategory)}
          options={STAKEHOLDER_CATEGORIES}
          searchable
          // description="Donor, embassy and international body contacts require S203 screening."
          error={errors.category}
        />
        <TextField
          label="Location"
          required
          value={form.location}
          onChange={(value) => onChange('location', value)}
          placeholder="City, country"
          error={errors.location}
        />
        <TextField
          className="sm:col-span-2"
          label="Website"
          optional
          type="url"
          value={form.website}
          onChange={(value) => onChange('website', value)}
          placeholder="example.org"
          // description="The organisation's own site — never a personal or CLET mailbox."
          error={errors.website}
        />
      </FormGrid>
    </>
  );
}

/** How CLET manages the relationship: owner, health, stage and summary. */
export function RelationshipFields({ form, onChange, errors }: StakeholderFieldsProps) {
  return (
    <>
      <FormGrid>
        <TextField
          className="sm:col-span-2"
          label="Relationship owner"
          required
          value={form.owner}
          onChange={(value) => onChange('owner', value)}
          placeholder="The CLET officer accountable for this relationship"
          error={errors.owner}
        />
        <SelectField
          label="Relationship health"
          value={form.health ?? 'Healthy'}
          onChange={(value) => onChange('health', value as HealthLevel)}
          options={HEALTH_LEVELS}
          // description="The owner's current judgement; drives the portfolio health score."
        />
        <SelectField
          label="Pipeline stage"
          value={form.pipelineStage ?? 'Prospect'}
          onChange={(value) => onChange('pipelineStage', value as PipelineStage)}
          options={PIPELINE_STAGES}
        />
      </FormGrid>

      <TextareaField
        label="Relationship summary"
        optional
        value={form.description}
        onChange={(value) => onChange('description', value)}
        rows={5}
        placeholder="What is this relationship for, and what does CLET expect from it?"
        error={errors.description}
      />
    </>
  );
}

/** The stakeholder record's fields in one stack, for the edit modal. */
export function StakeholderFields(props: StakeholderFieldsProps) {
  return (
    <div className="space-y-5">
      <OrganisationFields {...props} />
      <RelationshipFields {...props} />
    </div>
  );
}
