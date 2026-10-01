import { type FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button, Notice, useToast } from '@rfdtech/components';
import { Save } from 'lucide-react';

import type { KolInput } from '@partner-crm/types';

import { ROUTES, kolProfileRoute } from '@/constants/routes';
import {
  ExpertiseFields,
  IdentityFields,
  LinkFields,
  RelationshipFields,
} from '@/features/kol/components/KolProfileFields';
import { type KolFieldErrors, hasErrors, validateKolInput } from '@/features/kol/domain';
import { emptyKolInput } from '@/features/kol/kolForm';
import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import { useKol } from '@/features/kol/state/useKol';
import { useKolAccess } from '@/features/kol/state/useKolAccess';
import { FormActions, FormSection, PageHeader } from '@/features/shared';
import { useCrm } from '@/features/stakeholders/state/CrmContext';

export function Component() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profiles, createProfile } = useKol();
  const { stakeholders } = useCrm();
  const { canManage, actor } = useKolAccess();
  const [value, setValue] = useState<KolInput>(() => emptyKolInput(actor));
  const [errors, setErrors] = useState<KolFieldErrors>({});
  const [saving, setSaving] = useState(false);

  const stakeholderOptions = useMemo(
    () =>
      [...stakeholders]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((item) => ({ value: item.id, label: item.name })),
    [stakeholders],
  );

  const onChange = (patch: Partial<KolInput>) => {
    setValue((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as Array<keyof KolInput>) delete next[key];
      if ('riskLevel' in patch) delete next.riskNotes;
      return next;
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateKolInput(value, {
      profiles,
      stakeholderExists: (id) => stakeholders.some((item) => item.id === id),
    });
    setErrors(found);
    if (hasErrors(found)) {
      toast({
        title: 'Check the highlighted fields',
        description: 'The profile has not been saved yet.',
        variant: 'warning',
      });
      return;
    }
    setSaving(true);
    const saved = await createProfile(value);
    setSaving(false);
    if (!saved) return;
    toast({
      title: 'KOL added',
      description: `${saved.fullName} is now in the register.`,
      variant: 'success',
    });
    void navigate(kolProfileRoute(saved.id));
  };

  const disabled = saving || !canManage;
  const props = { value, onChange, errors, disabled };

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Add a KOL"
        // description="Create a thought-leader profile. Organisation and contact master data stay in S081; this record adds expertise, influence, availability and risk."
        backTo={{ to: ROUTES.KOLS, label: 'Back to KOL register' }}
        // meta={<Badge variant="outline">System S092</Badge>}
      />

      {!canManage ? (
        <Notice variant="warning" title="Read-only access" leftBorder>
          {MANAGE_DENIED_REASON}
        </Notice>
      ) : null}

      <form
        className="flex  flex-col gap-body"
        onSubmit={(event) => void submit(event)}
        noValidate
      >
        <FormSection
          title="Identity and role" /* description="Who they are and where they sit today." */
        >
          <IdentityFields {...props} />
        </FormSection>
        <FormSection
          title="CRM linkage"
          // description="Link to the S081 stakeholder organisation, or the S034 alumni record for notable alumni."
        >
          <LinkFields {...props} stakeholderOptions={stakeholderOptions} />
        </FormSection>
        <FormSection
          title="Expertise and influence" /* description="Tags drive outreach planning and search." */
        >
          <ExpertiseFields {...props} />
        </FormSection>
        <FormSection
          title="Relationship and risk"
          // description="Medium and high risk need notes telling colleagues what to do before engaging."
        >
          <RelationshipFields {...props} />
        </FormSection>

        <FormActions>
          <Button type="button" variant="ghost" onClick={() => void navigate(ROUTES.KOLS)}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={disabled}>
            <Save size={16} aria-hidden /> Save KOL profile
          </Button>
        </FormActions>
      </form>
    </section>
  );
}
