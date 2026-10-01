import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Notice, useToast } from '@rfdtech/components';

import { useAuth } from '@partner-crm/auth';
import { PageHeader } from '@partner-crm/ui';

import { ROUTES, adminConsultationRoute } from '@/constants/routes';
import { ConsultationForm } from '@/features/admin/components/ConsultationForm';
import { blankQuestion } from '@/features/consultations/builder';
import { defaultFormValues } from '@/features/consultations/domain';
import { deniedReason } from '@/features/consultations/permissions';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

export function Component() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { consultations, createConsultation, segments } = useConsultations();
  const [initialValues] = useState(() => ({ ...defaultFormValues(), questions: [blankQuestion()] }));
  const denied = deniedReason(user?.role, 'manage');

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Create consultation"
        // description="Build the public form and define how responses will be collected."
        backTo={{ to: ROUTES.ADMIN_CONSULTATIONS, label: 'Consultations' }}
        meta={<Badge variant="outline">System S088</Badge>}
      />
      {denied ? (
        <Notice variant="warning" title="Read-only access" leftBorder>{denied}</Notice>
      ) : (
        <ConsultationForm
          initialValues={initialValues}
          submitLabel="Create draft"
          savingLabel="Creating draft"
          cancelTo={ROUTES.ADMIN_CONSULTATIONS}
          takenSlugs={consultations.map((item) => item.slug)}
          segments={segments}
          onSubmit={async (input) => {
            const created = await createConsultation(input);
            toast({ title: 'Draft consultation created', description: 'Submit it for review when the questions are ready.', variant: 'success' });
            void navigate(adminConsultationRoute(created.id));
          }}
        />
      )}
    </section>
  );
}
