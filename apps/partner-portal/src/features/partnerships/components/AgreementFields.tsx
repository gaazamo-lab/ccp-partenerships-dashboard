import { type ReactNode, useMemo } from 'react';

import type { PartnershipAgreement, UpdatePartnershipInput } from '@partner-crm/types';

import {
  AGREEMENT_TYPES,
  type AgreementErrors,
  isBlockedParty,
} from '@/features/partnerships/partnershipForm';
import {
  FormGrid,
  FormSection,
  MultiSelectField,
  SelectField,
  type SelectOption,
  TextField,
  TextareaField,
} from '@/features/shared';
import type { Stakeholder } from '@/features/stakeholders/types';

interface AgreementFieldsProps {
  form: UpdatePartnershipInput;
  onChange: <K extends keyof UpdatePartnershipInput>(
    field: K,
    value: UpdatePartnershipInput[K],
  ) => void;
  stakeholders: Stakeholder[];
  /** Populated only once the user has tried to submit. */
  errors: AgreementErrors;
  /** Raw textarea contents; one deliverable per line. */
  deliverablesText: string;
  onDeliverablesTextChange: (value: string) => void;
  /** Number of deliverables parsed out of the text, for the helper line. */
  deliverableCount?: number;
  /** The S003 reference only exists once there is something signed to point at. */
  includeSignedDocument?: boolean;
  /**
   * `sections` renders each group as its own card, for the full-page create
   * form; `fieldsets` keeps them as light headed groups inside a modal.
   */
  layout?: 'sections' | 'fieldsets';
}

function Group({
  layout,
  title,
  // description,
  children,
}: {
  layout: 'sections' | 'fieldsets';
  title: string;
  description?: string;
  children: ReactNode;
}) {
  if (layout === 'sections') {
    return <FormSection title={title} /* description={description} */>{children}</FormSection>;
  }
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Every field of an S082 agreement record, shared by the create page and the
 * edit modal. The two screens drifted apart before this existed — the edit
 * modal validated the S003 reference and the create page didn't.
 */
export function AgreementFields({
  form,
  onChange,
  stakeholders,
  errors,
  deliverablesText,
  onDeliverablesTextChange,
  // deliverableCount,
  includeSignedDocument = false,
  layout = 'fieldsets',
}: AgreementFieldsProps) {
  const partyOptions = useMemo<SelectOption[]>(
    () =>
      stakeholders.map((item) => ({
        value: item.id,
        // Say why an option can't be picked, rather than dropping it and
        // leaving the user to wonder where the organisation went.
        label: isBlockedParty(item) ? `${item.name} — ${item.status.toLowerCase()}` : item.name,
        disabled: isBlockedParty(item),
      })),
    [stakeholders],
  );

  return (
    <div className={layout === 'sections' ? 'flex flex-col gap-body' : 'space-y-8'}>
      <Group
        layout={layout}
        title="Parties"
        // description="The S081 organisations signing this agreement."
      >
        <FormGrid>
          <SelectField
            label="Primary partner"
            required
            value={form.stakeholderId}
            onChange={(value) => onChange('stakeholderId', value)}
            options={partyOptions}
            searchable
            placeholder="Select the primary partner"
            searchPlaceholder="Search S081 stakeholders"
            // description="Used for portfolio grouping."
            error={errors.stakeholderId}
          />
          <MultiSelectField
            label="Additional S081 parties"
            optional
            value={form.partyStakeholderIds}
            onChange={(value) => onChange('partyStakeholderIds', value)}
            options={partyOptions.filter((option) => option.value !== form.stakeholderId)}
            placeholder="Select any co-signing parties"
            searchPlaceholder="Search S081 stakeholders"
            emptyMessage="No other stakeholders available"
            // description="Leave empty for a bilateral agreement."
          />
        </FormGrid>
      </Group>

      <Group
        layout={layout}
        title="Agreement"
        // description="What the agreement is, who owns it at CLET, and when it runs."
      >
        <FormGrid>
          <TextField
            label="Agreement title"
            required
            value={form.title}
            onChange={(value) => onChange('title', value)}
            placeholder="e.g. MOU on judicial training exchange"
            error={errors.title}
          />
          <SelectField
            label="Agreement type"
            value={form.agreementType}
            onChange={(value) =>
              onChange('agreementType', value as PartnershipAgreement['agreementType'])
            }
            options={AGREEMENT_TYPES}
          />
          <TextField
            label="CCP owner"
            required
            value={form.owner}
            onChange={(value) => onChange('owner', value)}
            placeholder="The officer accountable for this agreement"
            error={errors.owner}
          />
          <TextField
            label="S136 legal reference"
            optional
            value={form.legalContractRef ?? ''}
            onChange={(value) => onChange('legalContractRef', value || null)}
            placeholder="S136-CTR-YYYY-NNNN"
            // description="Add it once the contract is registered in S136."
            error={errors.legalContractRef}
          />
          <TextField
            label="Effective date"
            optional
            type="date"
            value={form.effectiveDate ?? ''}
            onChange={(value) => onChange('effectiveDate', value || null)}
          />
          <TextField
            label="Expiry date"
            optional
            type="date"
            value={form.expiryDate ?? ''}
            onChange={(value) => onChange('expiryDate', value || null)}
            min={form.effectiveDate ?? undefined}
            error={errors.expiryDate}
          />
          {includeSignedDocument ? (
            <TextField
              className="sm:col-span-2"
              label="S003 signed-document reference"
              optional
              value={form.signedDocumentRef ?? ''}
              onChange={(value) => onChange('signedDocumentRef', value || null)}
              placeholder="S003-DOC-YYYY-NNNN"
              // description="Store only the authoritative record reference; the signed file remains in S003."
              error={errors.signedDocumentRef}
            />
          ) : null}
        </FormGrid>
      </Group>

      <Group
        layout={layout}
        title="Commitments"
        // description="The value each side expects, and the deliverables that prove it."
      >
        <TextareaField
          label="Value commitment"
          required
          rows={3}
          value={form.valueCommitment}
          onChange={(value) => onChange('valueCommitment', value)}
          placeholder="Describe the expected institutional or resource value."
          error={errors.valueCommitment}
        />
        <TextareaField
          label="Planned deliverables"
          required
          rows={4}
          value={deliverablesText}
          onChange={onDeliverablesTextChange}
          placeholder={'Annual programme plan\nJoint research report'}
          // description={
          // deliverableCount > 0
          // ? `One measurable deliverable per line — ${deliverableCount} recorded.`
          // : 'Enter one measurable deliverable per line.'
          // }
          error={errors.deliverables}
        />
      </Group>
    </div>
  );
}
