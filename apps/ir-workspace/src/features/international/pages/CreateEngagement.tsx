import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, Notice, useToast } from '@rfdtech/components';

import { PageHeader, SectionCard } from '@partner-crm/ui';

import { ROUTES, engagementRoute } from '@/constants/routes';

import { EngagementFields } from '../components/EngagementFields';
import {
  type EngagementFormErrors,
  emptyEngagementValues,
  validateEngagementValues,
  valuesToInput,
} from '../engagementForm';
import { DENIED_REASON, canIr } from '../permissions';
import { useIr } from '../state/useIr';

export function Component() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createEngagement, actor, role } = useIr();
  const [values, setValues] = useState(() => emptyEngagementValues(actor));
  const [errors, setErrors] = useState<EngagementFormErrors>({});
  const [saving, setSaving] = useState(false);
  const allowed = canIr(role, 'engagement.edit');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateEngagementValues(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    const created = await createEngagement(valuesToInput(values));
    setSaving(false);
    if (!created) return;
    toast({
      title: 'Engagement registered',
      description: `${created.reference} saved as a draft. Add the delegation and checklist, then submit.`,
      variant: 'success',
    });
    void navigate(engagementRoute(created.id), { replace: true });
  };

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="New engagement"
        // description="Register a visit, courtesy call, delegation, conference or bilateral meeting. It is saved as a draft."
        backTo={{ to: ROUTES.ENGAGEMENTS, label: 'Back to engagements' }}
        meta={<Badge variant="outline">System S083</Badge>}
      />

      {!allowed ? (
        <Notice variant="warning" title="Read-only access" leftBorder>
          {DENIED_REASON['engagement.edit']}
        </Notice>
      ) : null}

      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-body">
        <SectionCard
          title="Engagement details"
          // description="A reference (CLET/IR/year/sequence) is assigned when you save. Only the title and owner are needed for a draft."
        >
          <EngagementFields values={values} errors={errors} onChange={setValues} />
        </SectionCard>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => void navigate(ROUTES.ENGAGEMENTS)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!allowed || saving} loading={saving}>
            Save draft
          </Button>
        </div>
      </form>
    </section>
  );
}
