import { Link, useNavigate } from 'react-router';

import { Badge, Button, ProgressBar } from '@rfdtech/components';
import { BarChart3, ClipboardCheck, ClipboardList, MessageSquareMore, Plus } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import { EmptyState, type Kpi, KpiGrid, PageHeader, SectionCard, filterLink, formatCount, formatDate, useNow } from '@partner-crm/ui';

import { ROUTES, adminConsultationRoute } from '@/constants/routes';
import { StatusBadge } from '@/features/consultations/components/StatusBadge';
import { completionSignal, consultationProgress } from '@/features/consultations/domain';
import { deniedReason } from '@/features/consultations/permissions';
import { useConsultations } from '@/features/consultations/state/ConsultationsContext';

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { consultations, loading, error } = useConsultations();
  const now = useNow();
  const open = consultations.filter((item) => item.status === 'OPEN');
  const inReview = consultations.filter((item) => item.status === 'REVIEW');
  const signal = completionSignal(consultations);
  const denied = deniedReason(user?.role, 'manage');

  const attention = [
    ...inReview.map((item) => ({ item, reason: 'Awaiting AQAI/CDT review' })),
    ...open
      .filter((item) => new Date(item.closesAt).getTime() - now < 7 * 86_400_000)
      .map((item) => ({ item, reason: `Closes ${formatDate(item.closesAt)}` })),
    ...consultations
      .filter((item) => item.status === 'CLOSED' && !item.outcomeSummary)
      .map((item) => ({ item, reason: 'Closed — “what we heard” not yet published' })),
  ];

  const kpis: Kpi[] = [
    { id: 'open', label: 'Open consultations', value: open.length, description: 'Accepting responses', icon: <ClipboardList size={20} aria-hidden />, to: filterLink(ROUTES.ADMIN_CONSULTATIONS, 'consultations', { status: 'OPEN' }) },
    { id: 'responses', label: 'Total responses', value: formatCount(consultations.reduce((sum, item) => sum + item.responseCount, 0)), description: 'Across all consultations', icon: <MessageSquareMore size={20} aria-hidden /> },
    { id: 'review', label: 'Awaiting review', value: inReview.length, description: 'Submitted to AQAI/CDT', icon: <ClipboardCheck size={20} aria-hidden />, to: filterLink(ROUTES.ADMIN_CONSULTATIONS, 'consultations', { status: 'REVIEW' }) },
    {
      id: 'completion',
      label: 'Completion signal',
      value: signal ? `${signal.rate}%` : '—',
      description: signal ? `${formatCount(signal.responded)} of ${formatCount(signal.invited)} invitees responded` : 'No targeted consultation is open',
      icon: <BarChart3 size={20} aria-hidden />,
    },
  ];

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Consultation overview"
        // description="Monitor participation and manage the publication lifecycle."
        meta={<Badge variant="outline">System S088</Badge>}
        actions={
          <Button disabled={Boolean(denied)} title={denied} onClick={() => void navigate(ROUTES.ADMIN_CREATE)}>
            <Plus size={17} aria-hidden /> New consultation
          </Button>
        }
      />
      <KpiGrid kpis={kpis} loading={loading} />
      {error ? <p className="text-sm text-error">Consultations could not be loaded: {error}</p> : null}

      <div className="grid gap-body xl:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Active consultation performance">
          {open.length ? (
            <div className="space-y-3">
              {open.map((item) => {
                const progress = consultationProgress(item);
                return (
                  <Link key={item.id} to={adminConsultationRoute(item.id)} className="block rounded-lg border border-border p-4 hover:border-primary">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{item.title}</h3>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-1 text-sm text-foreground-muted">
                          {formatCount(item.responseCount)} responses{item.invitedCount ? ` from ${formatCount(item.invitedCount)} invited` : ' · open public'} · closes {formatDate(item.closesAt)}
                        </p>
                      </div>
                      {progress !== null ? <span className="text-lg font-semibold tabular-nums">{progress}%</span> : null}
                    </div>
                    {progress !== null ? <div className="mt-3"><ProgressBar value={progress} aria-label={`${item.title} response rate`} /></div> : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No consultations are open" hint="Approve and open a scheduled consultation to start collecting responses." />
          )}
        </SectionCard>

        <SectionCard title="Needs attention">
          {attention.length ? (
            <ul className="divide-y divide-border">
              {attention.map(({ item, reason }) => (
                <li key={`${item.id}-${reason}`} className="py-3">
                  <Link to={adminConsultationRoute(item.id)} className="font-medium hover:text-primary">{item.title}</Link>
                  <p className="text-sm text-foreground-muted">{reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="Nothing needs attention" hint="Reviews, closing dates and unpublished outcomes appear here." />
          )}
        </SectionCard>
      </div>
    </section>
  );
}
