import type { KolCategory, KolInput, KolRiskLevel } from '@partner-crm/types';

import { riskNotesRequired, type KolFieldErrors } from '@/features/kol/domain';
import {
  AVAILABILITY_OPTIONS,
  CATEGORY_OPTIONS,
  INFLUENCE_OPTIONS,
  RISK_OPTIONS,
  STATUS_OPTIONS,
} from '@/features/kol/kolForm';
import {
  FormGrid,
  SelectField,
  type SelectOption,
  TextField,
  TextareaField,
} from '@/features/shared';

import { TagInput } from './TagInput';

interface FieldsProps {
  value: KolInput;
  onChange: (patch: Partial<KolInput>) => void;
  errors: KolFieldErrors;
  disabled?: boolean;
}

export function IdentityFields({ value, onChange, errors, disabled }: FieldsProps) {
  return (
    <FormGrid>
      <TextField
        label="Honorific"
        optional
        value={value.honorific}
        onChange={(honorific) => onChange({ honorific })}
        placeholder="e.g. Justice, Prof., Dr., Hon."
        disabled={disabled}
      />
      <TextField
        label="Full name"
        required
        value={value.fullName}
        onChange={(fullName) => onChange({ fullName })}
        error={errors.fullName}
        placeholder="e.g. Abena Nkansah-Owusu"
        disabled={disabled}
      />
      <SelectField
        label="Category"
        required
        value={value.category}
        onChange={(category) => onChange({ category: category as KolCategory })}
        options={CATEGORY_OPTIONS}
        error={errors.category}
        disabled={disabled}
      />
      <SelectField
        label="Status"
        required
        value={value.status}
        onChange={(status) => onChange({ status: status as KolInput['status'] })}
        options={STATUS_OPTIONS}
        // description="Archived KOLs cannot be invited to new engagements."
        disabled={disabled}
      />
      <TextField
        label="Organisation"
        optional
        value={value.organisation}
        onChange={(organisation) => onChange({ organisation })}
        placeholder="e.g. University of Ghana School of Law"
        disabled={disabled}
      />
      <TextField
        label="Position"
        optional
        value={value.position}
        onChange={(position) => onChange({ position })}
        placeholder="e.g. Associate Professor"
        disabled={disabled}
      />
      <TextField
        label="Email"
        optional
        type="email"
        value={value.email}
        onChange={(email) => onChange({ email })}
        error={errors.email}
        placeholder="name@example.com"
        // description="Must be unique across KOL profiles."
        disabled={disabled}
      />
      <TextField
        label="Phone"
        optional
        type="tel"
        value={value.phone}
        onChange={(phone) => onChange({ phone })}
        placeholder="+233 24 000 0000"
        disabled={disabled}
      />
    </FormGrid>
  );
}

export function LinkFields({
  value,
  onChange,
  errors,
  disabled,
  stakeholderOptions,
}: FieldsProps & { stakeholderOptions: SelectOption[] }) {
  return (
    <FormGrid>
      <SelectField
        label="S081 stakeholder"
        optional
        value={value.stakeholderId ?? ''}
        onChange={(stakeholderId) => onChange({ stakeholderId: stakeholderId || null })}
        options={stakeholderOptions}
        placeholder="Not linked"
        searchable
        searchPlaceholder="Search stakeholders"
        clearable
        error={errors.stakeholderId}
        // description="The organisation record this KOL belongs to. Contact master data stays in S081."
        disabled={disabled}
      />
      <TextField
        label="S034 alumni reference"
        optional
        value={value.alumniRef ?? ''}
        onChange={(alumniRef) => onChange({ alumniRef: alumniRef || null })}
        placeholder="e.g. S034-ALM-2011-0457"
        // description="For notable alumni tracked in the Alumni CRM."
        disabled={disabled}
      />
    </FormGrid>
  );
}

export function ExpertiseFields({ value, onChange, disabled }: FieldsProps) {
  return (
    <FormGrid>
      <TagInput
        label="Expertise"
        optional
        value={value.expertise}
        onChange={(expertise) => onChange({ expertise })}
        placeholder="e.g. Constitutional law"
        // description="Press Enter or comma to add each tag."
        disabled={disabled}
      />
      <TagInput
        label="Influence areas"
        optional
        value={value.influenceAreas}
        onChange={(influenceAreas) => onChange({ influenceAreas })}
        placeholder="e.g. Judicial reform"
        // description="Policy areas and audiences where this voice carries weight."
        disabled={disabled}
      />
      <SelectField
        label="Influence level"
        value={value.influenceLevel}
        onChange={(influenceLevel) =>
          onChange({ influenceLevel: influenceLevel as KolInput['influenceLevel'] })
        }
        options={INFLUENCE_OPTIONS}
        disabled={disabled}
      />
      <SelectField
        label="Availability"
        value={value.availability}
        onChange={(availability) =>
          onChange({ availability: availability as KolInput['availability'] })
        }
        options={AVAILABILITY_OPTIONS}
        disabled={disabled}
      />
      <TextareaField
        label="Biography"
        optional
        className="sm:col-span-2"
        rows={3}
        value={value.bio}
        onChange={(bio) => onChange({ bio })}
        placeholder="Short professional biography used for introductions and event programmes."
        disabled={disabled}
      />
    </FormGrid>
  );
}

export function RelationshipFields({ value, onChange, errors, disabled }: FieldsProps) {
  const notesRequired = riskNotesRequired(value.riskLevel);
  return (
    <FormGrid>
      <TextField
        label="Relationship owner"
        required
        value={value.relationshipOwner}
        onChange={(relationshipOwner) => onChange({ relationshipOwner })}
        placeholder="e.g. Ama Mensah"
        error={errors.relationshipOwner}
        // description="The CLET officer accountable for this relationship."
        disabled={disabled}
      />
      <SelectField
        label="Risk level"
        value={value.riskLevel}
        onChange={(riskLevel) => onChange({ riskLevel: riskLevel as KolRiskLevel })}
        options={RISK_OPTIONS}
        // description="Reputational, conflict-of-interest or protocol risk."
        disabled={disabled}
      />
      <TextareaField
        label="Risk notes"
        required={notesRequired}
        optional={!notesRequired}
        className="sm:col-span-2"
        rows={3}
        value={value.riskNotes}
        onChange={(riskNotes) => onChange({ riskNotes })}
        error={errors.riskNotes}
        placeholder="Protocol requirements, conflicts of interest, topics to avoid."
        // description={
          // notesRequired
            // ? 'Required for medium and high risk: say what colleagues must do before engaging.'
            // : 'Becomes required if the risk level is medium or high.'
        // }
        disabled={disabled}
      />
    </FormGrid>
  );
}
