import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Badge, Notice, useToast } from '@rfdtech/components';

import { useAuth } from '@partner-crm/auth';
import type { Consultation } from '@partner-crm/types';
import { PageHeader } from '@partner-crm/ui';

import { ROUTES, adminConsultationRoute } from '@/constants/routes';
import { ConsultationForm } from '@/features/admin/components/ConsultationForm';
import { StatusBadge } from '@/features/consultations/components/StatusBadge';
import { EDITABLE_STATUSES } from '@/features/consultations/constants';
import { toFormValues } from '@/features/consultations/domain';
import { deniedReason } from '@/features/consultations/permissions';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

export function Component() {
  const { consultationId = '' } = useParams();
  const { consultations, loading, loadConsultationDetail } = useConsultations();
  const consultation = consultations.find((item) => item.id === consultationId);

  useEffect(() => {
    void loadConsultationDetail(consultationId);
  }, [consultationId, loadConsultationDetail]);

  if (!consultation) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader title={loading ? 'Loading consultation' : 'Consultation not found'} backTo={{ to: ROUTES.ADMIN_CONSULTATIONS, label: 'Consultations' }} />
        {loading ? null : <Notice variant="error" leftBorder>The requested consultation does not exist.</Notice>}
      </section>
    );
  }
  // Keyed so the form's initial values reset when the record changes underneath it.
  return <EditForm key={`${consultation.id}-${consultation.updatedAt}`} consultation={consultation} />;
}

function EditForm({ consultation }: { consultation: Consultation }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { consultations, segments, updateConsultation } = useConsultations();
  const [initialValues] = useState(() => toFormValues(consultation));
  const denied = deniedReason(user?.role, 'manage');
  const editable = EDITABLE_STATUSES.includes(consultation.status);
  const detail = adminConsultationRoute(consultation.id);

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title={`Edit ${consultation.title}`}
        // description="Change the questions, languages, audience and dates while the consultation is in draft or review."
        backTo={{ to: detail, label: 'Consultation' }}
        meta={<><StatusBadge status={consultation.status} /><Badge variant="outline">System S088</Badge></>}
      />
      {denied ? <Notice variant="warning" title="Read-only access" leftBorder>{denied}</Notice> : null}
      {!editable ? (
        <Notice variant="warning" title="This consultation can no longer be edited" leftBorder>
          Questions are locked once a consultation is approved. Return it to draft first, or{' '}
          <Link className="font-medium text-primary hover:underline" to={detail}>go back to the consultation</Link> and duplicate it.
        </Notice>
      ) : null}
      {editable && !denied ? (
        <>
          {consultation.status === 'REVIEW' ? (
            <Notice variant="info" leftBorder>
              This consultation is with reviewers. Saving changes keeps it in review; let the reviewer know what changed.
            </Notice>
          ) : null}
          <ConsultationForm
            initialValues={initialValues}
            submitLabel="Save changes"
            savingLabel="Saving"
            cancelTo={detail}
            takenSlugs={consultations.filter((item) => item.id !== consultation.id).map((item) => item.slug)}
            segments={segments}
            onSubmit={async (input) => {
              await updateConsultation(consultation.id, input);
              toast({ title: 'Consultation saved', description: 'Your changes have been recorded.', variant: 'success' });
              void navigate(detail);
            }}
          />
        </>
      ) : null}
    </section>
  );
}
