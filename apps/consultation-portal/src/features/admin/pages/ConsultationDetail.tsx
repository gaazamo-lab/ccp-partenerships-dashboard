import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Badge, Button, Notice, Tabs, TabsContent, TabsList, TabsTrigger, useToast } from '@rfdtech/components';
import { Copy, Eye, MessageSquareText, Pencil, UsersRound } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import { ActionMenu, ExportMenu, type Kpi, KpiGrid, PageHeader, formatCount } from '@partner-crm/ui';

import { ROUTES, adminConsultationRoute, adminEditRoute, adminReportRoute, consultationRoute } from '@/constants/routes';
import { AnalyticsTab } from '@/features/admin/components/detail/AnalyticsTab';
import { LifecycleModal } from '@/features/admin/components/detail/LifecycleModal';
import { OutcomeTab } from '@/features/admin/components/detail/OutcomeTab';
import { ResponsesTab } from '@/features/admin/components/detail/ResponsesTab';
import { SummaryTab } from '@/features/admin/components/detail/SummaryTab';
import { ThemesTab } from '@/features/admin/components/detail/ThemesTab';
import { TriggersTab } from '@/features/admin/components/detail/TriggersTab';
import { codingProgress, openTextAnswers } from '@/features/consultations/analytics';
import { StatusBadge } from '@/features/consultations/components/StatusBadge';
import { EDITABLE_STATUSES } from '@/features/consultations/constants';
import { consultationProgress } from '@/features/consultations/domain';
import { consultationResponsesCsv, downloadCsv } from '@/features/consultations/export';
import { type LifecycleAction, actionsFor } from '@/features/consultations/lifecycle';
import { can, deniedReason } from '@/features/consultations/permissions';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

export function Component() {
  const { consultationId = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const role = user?.role;
  const { consultations, responses, loading, loadConsultationDetail, duplicateConsultation } = useConsultations();
  const [action, setAction] = useState<LifecycleAction | null>(null);
  const consultation = consultations.find((item) => item.id === consultationId);

  useEffect(() => {
    void loadConsultationDetail(consultationId);
  }, [consultationId, loadConsultationDetail]);

  if (!consultation) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader title={loading ? 'Loading consultation' : 'Consultation not found'} backTo={{ to: ROUTES.ADMIN_CONSULTATIONS, label: 'Consultations' }} />
        {loading ? null : (
          <Notice variant="error" leftBorder>
            The requested consultation does not exist. Return to the list to choose another.
          </Notice>
        )}
      </section>
    );
  }

  const own = responses.filter((item) => item.consultationId === consultation.id);
  const progress = consultationProgress(consultation);
  const manageDenied = deniedReason(role, 'manage');
  const exportDenied = deniedReason(role, 'export');
  const editable = EDITABLE_STATUSES.includes(consultation.status);
  const primary = actionsFor(consultation.status).find((item) => can(role, item.permission) && !item.destructive && item.id !== 'return');

  const kpis: Kpi[] = [
    { id: 'responses', label: 'Responses', value: formatCount(consultation.responseCount), description: `${formatCount(own.length)} loaded for analysis`, icon: <MessageSquareText size={20} aria-hidden /> },
    { id: 'rate', label: 'Response rate', value: progress === null ? 'Open public' : `${progress}%`, description: consultation.invitedCount ? `${formatCount(consultation.invitedCount)} consent-verified invitees` : 'No invitation list', icon: <UsersRound size={20} aria-hidden /> },
    { id: 'linked', label: 'Identity links', value: formatCount(own.filter((item) => item.consentToIdentityLink).length), description: 'Explicitly consented only', icon: <UsersRound size={20} aria-hidden /> },
    { id: 'coded', label: 'Answers coded', value: `${codingProgress(openTextAnswers(consultation, own))}%`, description: `${consultation.themes.length} themes in codebook`, icon: <MessageSquareText size={20} aria-hidden /> },
  ];

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateConsultation(consultation.id);
      toast({ title: 'Consultation duplicated', description: 'A new draft with the same questions was created.', variant: 'success' });
      void navigate(adminConsultationRoute(copy.id));
    } catch {
      // Toasted by the provider.
    }
  };

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title={consultation.title}
        // description={consultation.summary}
        backTo={{ to: ROUTES.ADMIN_CONSULTATIONS, label: 'Consultations' }}
        meta={
          <>
            <StatusBadge status={consultation.status} />
            <Badge variant="outline">{consultation.category}</Badge>
            <Badge variant="outline">System S088</Badge>
          </>
        }
        actions={
          <>
            <ExportMenu
              disabled={Boolean(exportDenied)}
              options={[
                {
                  id: 'csv',
                  label: 'Responses (CSV)',
                  description: 'Answers, language, themes and consent flag. No names or emails.',
                  onSelect: () => {
                    downloadCsv(`${consultation.slug}-responses.csv`, consultationResponsesCsv(consultation, own));
                    toast({ title: 'CSV exported', description: 'Identity fields are excluded from the export.', variant: 'success' });
                  },
                },
                {
                  id: 'pdf',
                  label: 'Summary report (print / PDF)',
                  description: 'Printable results summary; use “Save as PDF” in the print dialog.',
                  onSelect: () => void navigate(adminReportRoute(consultation.id)),
                },
              ]}
            />
            <ActionMenu
              items={[
                { id: 'preview', label: 'Preview public page', icon: <Eye size={15} aria-hidden />, onSelect: () => window.open(consultationRoute(consultation.slug), '_blank', 'noopener,noreferrer') },
                { id: 'edit', label: 'Edit questions and settings', icon: <Pencil size={15} aria-hidden />, onSelect: () => void navigate(adminEditRoute(consultation.id)), disabled: Boolean(manageDenied) || !editable, disabledReason: manageDenied ?? 'Only drafts and consultations in review can be edited.' },
                { id: 'duplicate', label: 'Duplicate as new draft', icon: <Copy size={15} aria-hidden />, onSelect: () => void handleDuplicate(), disabled: Boolean(manageDenied), disabledReason: manageDenied },
              ]}
            />
            {primary ? <Button onClick={() => setAction(primary)}>{primary.label}</Button> : null}
          </>
        }
      />

      <KpiGrid kpis={kpis} />

      <Tabs defaultValue="summary" variant="line">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="responses">Responses ({own.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="themes">Themes ({consultation.themes.length})</TabsTrigger>
          <TabsTrigger value="triggers">Triggers ({consultation.triggers.length})</TabsTrigger>
          <TabsTrigger value="outcome">Outcome</TabsTrigger>
        </TabsList>
        <TabsContent value="summary" className="pt-6">
          <SummaryTab consultation={consultation} role={role} onAction={setAction} />
        </TabsContent>
        <TabsContent value="responses" className="pt-6">
          <ResponsesTab consultation={consultation} responses={own} canViewIdentity={can(role, 'view_identity')} />
        </TabsContent>
        <TabsContent value="analytics" className="pt-6">
          <AnalyticsTab consultation={consultation} responses={own} />
        </TabsContent>
        <TabsContent value="themes" className="pt-6">
          <ThemesTab consultation={consultation} responses={own} denied={manageDenied} />
        </TabsContent>
        <TabsContent value="triggers" className="pt-6">
          <TriggersTab consultation={consultation} denied={manageDenied} />
        </TabsContent>
        <TabsContent value="outcome" className="pt-6">
          <OutcomeTab key={consultation.outcomeSummary ?? 'none'} consultation={consultation} denied={manageDenied} />
        </TabsContent>
      </Tabs>

      {action ? <LifecycleModal consultation={consultation} action={action} onClose={() => setAction(null)} /> : null}
    </section>
  );
}
