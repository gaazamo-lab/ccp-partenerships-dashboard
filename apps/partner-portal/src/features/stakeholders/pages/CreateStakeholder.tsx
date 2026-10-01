import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button, Notice, useToast } from '@rfdtech/components';
import { Building2, ExternalLink } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { ROUTES, stakeholderProfileRoute } from '@/constants/routes';
import { FormActions, FormSection, PageHeader, TextareaField } from '@/features/shared';
import {
  OrganisationFields,
  RelationshipFields,
} from '@/features/stakeholders/components/StakeholderFields';
import { canManageStakeholders, permissionHint } from '@/features/stakeholders/permissions';
import {
  EMPTY_STAKEHOLDER,
  type StakeholderErrors,
  validateStakeholder,
} from '@/features/stakeholders/stakeholderForm';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type { Stakeholder, StakeholderInput } from '@/features/stakeholders/types';

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addStakeholder } = useCrm();
  const { toast } = useToast();
  const [form, setForm] = useState<StakeholderInput>(EMPTY_STAKEHOLDER);
  const [duplicate, setDuplicate] = useState<Stakeholder | null>(null);
  const [overriding, setOverriding] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState<StakeholderErrors>({});
  const [saving, setSaving] = useState(false);
  const canCreate = canManageStakeholders(user?.role, 'create');

  const setField = <K extends keyof StakeholderInput>(field: K, value: StakeholderInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDuplicate(null);
    setOverriding(false);
    setFormError('');
    // Clear this field's error as soon as it's edited, rather than making the
    // user submit again to find out whether they've fixed it.
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const submit = (force: boolean) => {
    const found = validateStakeholder(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (force && !overrideReason.trim()) {
      setReasonError('Say why this is a different organisation from the match.');
      return;
    }

    setSaving(true);
    const result = addStakeholder(form, force ? { force: true, overrideReason } : undefined);
    setSaving(false);
    if (!result.ok) {
      if (result.duplicate) setDuplicate(result.duplicate);
      else setFormError(result.message ?? 'The stakeholder could not be created.');
      return;
    }
    toast({
      title: 'Stakeholder created',
      description: force
        ? `${form.name} was created despite a possible duplicate. Your reason has been recorded.`
        : `${form.name} is now available in the S081 register.`,
      variant: force ? 'warning' : 'success',
    });
    if (result.id) void navigate(stakeholderProfileRoute(result.id));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(overriding);
  };

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Add stakeholder"
        // description="Create the authoritative external organisation record and assign relationship ownership."
        backTo={{ to: ROUTES.STAKEHOLDERS, label: 'Back to stakeholders' }}
        // meta={<Badge variant="outline">System S081</Badge>}
      />

      <form onSubmit={handleSubmit} className="flex  flex-col gap-body" noValidate>
        {!canCreate ? (
          <Notice variant="warning" title="Read-only access" leftBorder>
            {permissionHint(user?.role, 'create')} Ask a CRM administrator or Partnerships Officer
            to add this organisation.
          </Notice>
        ) : null}

        {/* <Notice variant="info" title="Authoritative data boundary" leftBorder>
          Student, staff, and alumni records belong to S027, S140, and S034 and cannot be created
          here.
        </Notice> */}

        {formError ? (
          <Notice variant="error" title="Stakeholder not created" leftBorder>
            {formError}
          </Notice>
        ) : null}

        <FormSection
          title="Organisation"
          // description="Who this organisation is and where to find it."
        >
          <OrganisationFields form={form} onChange={setField} errors={errors} autoFocus />
        </FormSection>

        <FormSection
          title="Relationship"
          // description="Who owns the relationship at CLET, and how it is going."
        >
          <RelationshipFields form={form} onChange={setField} errors={errors} />
        </FormSection>

        {duplicate ? (
          <Notice variant="warning" title="Potential duplicate found" leftBorder>
            <p>
              <strong>{duplicate.name}</strong> ({duplicate.category}, owned by {duplicate.owner})
              already matches this organisation name or website.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void navigate(stakeholderProfileRoute(duplicate.id))}
              >
                <ExternalLink size={14} aria-hidden /> Open existing
              </Button>
              {!overriding ? (
                <Button type="button" size="sm" variant="outline" onClick={() => setOverriding(true)}>
                  Create anyway
                </Button>
              ) : null}
            </div>
          </Notice>
        ) : null}

        {duplicate && overriding ? (
          <FormSection
            title="Separate record"
            // description="Explain why this is a different organisation from the match."
          >
            <TextareaField
              label="Reason for creating a separate record"
              required
              rows={3}
              value={overrideReason}
              onChange={(value) => {
                setOverrideReason(value);
                setReasonError('');
              }}
              // description="Recorded with the new stakeholder for the S204 audit trail."
              error={reasonError}
            />
          </FormSection>
        ) : null}

        <FormActions>
          <Button type="button" variant="ghost" onClick={() => void navigate(ROUTES.STAKEHOLDERS)}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!canCreate || saving}
            title={permissionHint(user?.role, 'create')}
          >
            <Building2 size={16} aria-hidden />{' '}
            {overriding ? 'Create despite duplicate' : 'Create stakeholder'}
          </Button>
        </FormActions>
      </form>
    </section>
  );
}
