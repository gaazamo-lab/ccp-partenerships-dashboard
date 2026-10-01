import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import {
  Badge,
  type BadgeVariant,
  Button,
  Card,
  Notice,
  ProgressBar,
  type TableColumn,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@rfdtech/components';
import {
  ArrowRight,
  Bell,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  FileCheck2,
  Link2,
  MessageSquare,
  Pencil,
  Plus,
  RotateCcw,
  SearchX,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '@partner-crm/auth';
import type {
  PartnershipHistoryEntry,
  PartnershipObligation,
  PartnershipReview,
  PartnershipStatus,
  RenewalAlertStatus,
} from '@partner-crm/types';

import { ROUTES, stakeholderProfileRoute } from '@/constants/routes';
import { AgreementDossierPrint } from '@/features/partnerships/components/AgreementDossierPrint';
import { AgreementFormModal } from '@/features/partnerships/components/AgreementFormModal';
import { LifecycleTransitionModal } from '@/features/partnerships/components/LifecycleTransitionModal';
import { ObligationFormModal } from '@/features/partnerships/components/ObligationFormModal';
import { ObligationProgressModal } from '@/features/partnerships/components/ObligationProgressModal';
import {
  ObligationStatusBadge,
  PartnershipStatusBadge,
} from '@/features/partnerships/components/PartnershipStatusBadge';
import { RenewalAlertsModal } from '@/features/partnerships/components/RenewalAlertsModal';
import { RenewalFormModal } from '@/features/partnerships/components/RenewalFormModal';
import { ReviewFormModal } from '@/features/partnerships/components/ReviewFormModal';
import { TerminationFormModal } from '@/features/partnerships/components/TerminationFormModal';
import { ValueRealisationCard } from '@/features/partnerships/components/ValueRealisationCard';
import {
  type AgreementDossier,
  exportAgreementDossier,
} from '@/features/partnerships/dataPortability';
import {
  canMarkExpired,
  lifecycleActionLabel,
  nextLifecycleStatus,
  terminationBlockers,
  transitionBlockers,
} from '@/features/partnerships/lifecycle';
import {
  effectiveObligationStatus,
  obligationReminderSummary,
} from '@/features/partnerships/obligations';
import { canManagePartnership } from '@/features/partnerships/permissions';
import { effectiveRenewalAlertStatus } from '@/features/partnerships/renewalAlerts';
import { reviewSchedule } from '@/features/partnerships/reviewDue';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import {
  ActionMenu,
  type ActionMenuItem,
  DataTable,
  DetailGrid,
  DetailItem,
  EmptyState,
  ExportMenu,
  PageHeader,
  SectionCard,
  formatDate,
  formatDateTime,
  rate,
  titleCase,
} from '@/features/shared';
import { useCrm } from '@/features/stakeholders/state/CrmContext';

const renewalAlertVariants: Record<RenewalAlertStatus, BadgeVariant> = {
  SCHEDULED: 'primary',
  DUE: 'warning',
  SENT: 'success',
  ACKNOWLEDGED: 'outline',
  FAILED: 'error',
  CANCELLED: 'outline',
};

type PartnershipTab = 'overview' | 'obligations' | 'renewal' | 'reviews' | 'history';

/** What each renewal milestone is for, in the words the governance calendar uses. */
const MILESTONE_LABELS: Record<number, string> = {
  180: 'Strategic review',
  90: 'Negotiation window',
  30: 'Execution deadline',
};

function milestoneLabel(days: number): string {
  return MILESTONE_LABELS[days] ?? `${days}-day milestone`;
}

/**
 * `lifecycleActionLabel` is partial — a status with no phrase of its own still
 * needs a button that says where it leads, rather than a blank one.
 */
function advanceLabel(status: PartnershipStatus): string {
  return lifecycleActionLabel[status] ?? `Move to ${titleCase(status)}`;
}

/** A section heading inside a tab, where a full card would nest a card in a card. */
function TabHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-sm text-foreground-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Component() {
  const navigate = useNavigate();
  const { partnershipId } = useParams();
  const {
    agreements,
    obligations,
    obligationProgress,
    reviews,
    renewals,
    renewalAlerts,
    history,
    loading,
    loadAgreementDetail,
    dispatchRenewalAlert,
    acknowledgeRenewalAlert,
  } = usePartnerships();
  const { user } = useAuth();
  const { stakeholders } = useCrm();
  const { toast } = useToast();

  const [obligationOpen, setObligationOpen] = useState(false);
  const [editingObligation, setEditingObligation] = useState<PartnershipObligation | null>(null);
  const [progressObligation, setProgressObligation] = useState<PartnershipObligation | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState<PartnershipStatus | null>(null);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [renewalAlertsOpen, setRenewalAlertsOpen] = useState(false);
  const [terminationOpen, setTerminationOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<PartnershipReview | null>(null);
  const [printing, setPrinting] = useState(false);
  const [activeTab, setActiveTab] = useState<PartnershipTab>('overview');
  const stopPrinting = useCallback(() => setPrinting(false), []);

  const agreement = agreements.find((item) => item.id === partnershipId);

  // In api mode, pull this agreement's latest children and obligation progress notes.
  useEffect(() => {
    if (partnershipId) loadAgreementDetail(partnershipId);
  }, [partnershipId, loadAgreementDetail]);

  const stakeholderName = useMemo(() => {
    const byId = new Map(stakeholders.map((item) => [item.id, item.name]));
    return (id: string) => byId.get(id) ?? id;
  }, [stakeholders]);

  const historyColumns = useMemo<TableColumn<PartnershipHistoryEntry>[]>(
    () => [
      {
        id: 'action',
        header: 'Event',
        accessorFn: (row) => titleCase(row.action),
        sortable: true,
        width: 190,
        cell: ({ row }) => <Badge variant="outline">{titleCase(row.action)}</Badge>,
      },
      {
        id: 'summary',
        header: 'Summary',
        accessorKey: 'summary',
        minWidth: 320,
      },
      { id: 'actor', header: 'Actor', accessorKey: 'actor', sortable: true, width: 180 },
      {
        id: 'occurredAt',
        header: 'Occurred',
        accessorKey: 'occurredAt',
        sortable: true,
        width: 190,
        cell: ({ row }) => formatDateTime(row.occurredAt),
      },
    ],
    [],
  );

  if (!agreement && loading) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader
          title="Loading agreement…"
          backTo={{ to: ROUTES.PARTNERSHIPS, label: 'Back to partnerships' }}
        />
        <Card bordered>
          <p className="py-10 text-center text-sm text-foreground-muted" role="status">
            Loading the S082 record from the server…
          </p>
        </Card>
      </section>
    );
  }

  if (!agreement) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader
          title="Partnership not found"
          backTo={{ to: ROUTES.PARTNERSHIPS, label: 'Back to partnerships' }}
        />
        <Card bordered>
          <EmptyState
            message="This S082 record is no longer available"
            hint={`Nothing matches the reference ${partnershipId ?? ''}. It may have been removed, or the link may be out of date.`}
            icon={<SearchX size={22} aria-hidden />}
            action={
              <Button onClick={() => void navigate(ROUTES.PARTNERSHIPS)}>
                Browse all partnerships
              </Button>
            }
          />
        </Card>
      </section>
    );
  }

  const stakeholder = stakeholders.find((item) => item.id === agreement.stakeholderId);
  const agreementObligations = obligations.filter((item) => item.agreementId === agreement.id);
  const agreementReviews = reviews.filter((item) => item.agreementId === agreement.id);
  const agreementRenewals = renewals.filter((item) => item.agreementId === agreement.id);
  const agreementRenewalAlerts = renewalAlerts
    .filter((item) => item.agreementId === agreement.id && item.status !== 'CANCELLED')
    .sort((left, right) => right.milestoneDays - left.milestoneDays);
  const agreementHistory = history.filter((item) => item.agreementId === agreement.id);
  const agreementParties = agreement.partyStakeholderIds
    .map((id) => stakeholders.find((item) => item.id === id))
    .filter((item) => item !== undefined);
  const unavailablePartyBlockers = agreementParties
    .filter((item) => item.status === 'Screening pending' || item.status === 'Inactive')
    .map((item) => `${item.name} must clear screening or be reactivated.`);

  const completion = Math.round(
    rate(
      agreementObligations.filter((item) => effectiveObligationStatus(item) === 'COMPLETED').length,
      agreementObligations.length,
    ),
  );
  const featuredObligations = [...agreementObligations]
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
    .slice(0, 3);

  const nextStatus = nextLifecycleStatus[agreement.status];
  const canManageLifecycle = canManagePartnership(user?.role, 'manage_lifecycle');
  const canEdit = canManagePartnership(user?.role, 'edit');
  const canManageObligations = canManagePartnership(user?.role, 'manage_obligations');
  const canManageReviews = canManagePartnership(user?.role, 'manage_reviews');
  const actor = user?.name ?? 'Authenticated user';
  const exitBlockers = terminationBlockers(agreementObligations);
  const terminated = agreement.status === 'TERMINATED';
  const canRenew = ['RENEWAL_DUE', 'EXPIRED'].includes(agreement.status);
  const canExport = canManagePartnership(user?.role, 'export');
  const schedule = reviewSchedule(agreement, agreementReviews);

  const dossier: AgreementDossier = {
    agreement,
    obligations: agreementObligations,
    reviews: agreementReviews,
    renewals: agreementRenewals,
    renewalAlerts: agreementRenewalAlerts,
    history: agreementHistory,
  };
  const exportDisabledReason = 'Your role cannot export agreement records.';

  // One primary action, everything else behind the menu — the lifecycle step
  // the record is actually waiting on is what should carry the weight here.
  const secondaryActions: ActionMenuItem[] = [];
  if (canRenew && nextStatus) {
    secondaryActions.push({
      id: 'advance',
      label: advanceLabel(nextStatus),
      icon: <CheckCircle2 size={16} aria-hidden />,
      onSelect: () => setTransitionTarget(nextStatus),
      disabled: !canManageLifecycle,
      disabledReason: 'Your role cannot change the lifecycle status.',
    });
  }
  if (canMarkExpired(agreement)) {
    secondaryActions.push({
      id: 'expire',
      label: 'Mark expired',
      onSelect: () => setTransitionTarget('EXPIRED'),
      disabled: !canManageLifecycle,
      disabledReason: 'Your role cannot change the lifecycle status.',
    });
  }
  if (['ACTIVE', 'RENEWAL_DUE', 'EXPIRED'].includes(agreement.status)) {
    secondaryActions.push({
      id: 'terminate',
      label: 'Terminate agreement',
      icon: <ShieldAlert size={16} aria-hidden />,
      onSelect: () => setTerminationOpen(true),
      disabled: !canManageLifecycle,
      disabledReason: 'Your role cannot terminate this agreement.',
      destructive: true,
    });
  }

  const primaryAction = canRenew ? (
    <Button disabled={!canManageLifecycle} onClick={() => setRenewalOpen(true)}>
      <RotateCcw size={16} aria-hidden /> Complete renewal
    </Button>
  ) : nextStatus ? (
    <Button disabled={!canManageLifecycle} onClick={() => setTransitionTarget(nextStatus)}>
      <CheckCircle2 size={16} aria-hidden /> {advanceLabel(nextStatus)}
    </Button>
  ) : null;

  return (
    <section className="flex flex-col gap-body">
      <div className="space-y-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-foreground-muted"
        >
          <Link to={ROUTES.PARTNERSHIPS} className="hover:text-primary hover:underline">
            Agreements
          </Link>
          <ChevronRight size={15} aria-hidden />
          <span className="font-medium text-foreground">{agreement.title}</span>
        </nav>

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {agreement.title}
            </h1>
            <p className="mt-1 text-base text-foreground-muted">
              <span className="font-mono">{agreement.reference}</span> ·{' '}
              {stakeholder?.name ?? 'Unknown S081 stakeholder'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ExportMenu
              label="Dossier"
              disabled={!canExport}
              options={[
                {
                  id: 'dossier-xlsx',
                  label: 'Excel dossier',
                  description: canExport
                    ? 'Agreement, obligations, reviews, renewals and history as one workbook.'
                    : exportDisabledReason,
                  disabled: !canExport,
                  onSelect: () => {
                    exportAgreementDossier(dossier, stakeholderName);
                    toast({
                      title: 'Dossier exported',
                      description: `${agreement.reference} workbook downloaded.`,
                      variant: 'success',
                    });
                  },
                },
                {
                  id: 'dossier-print',
                  label: 'Print dossier',
                  description: canExport
                    ? 'A print-friendly record for signature packs or PDF.'
                    : exportDisabledReason,
                  disabled: !canExport,
                  onSelect: () => setPrinting(true),
                },
              ]}
            />
            <Button
              variant="outline"
              disabled={!canEdit || terminated}
              onClick={() => setEditOpen(true)}
            >
              <Pencil size={16} aria-hidden /> Edit record
            </Button>
            {primaryAction}
            <ActionMenu items={secondaryActions} />
          </div>
        </div>

        <dl className="grid overflow-hidden rounded-2xl border border-border bg-surface shadow-sm sm:grid-cols-2 xl:grid-cols-5">
          <div className="border-b border-border-subtle px-6 py-5 sm:border-r xl:border-b-0">
            <dt className="text-sm text-foreground-muted">Agreement status</dt>
            <dd className="mt-2">
              <PartnershipStatusBadge status={agreement.status} />
            </dd>
          </div>
          <div className="border-b border-border-subtle px-6 py-5 xl:border-b-0 xl:border-r">
            <dt className="text-sm text-foreground-muted">Agreement type</dt>
            <dd className="mt-2 font-semibold text-foreground">
              {titleCase(agreement.agreementType)}
            </dd>
          </div>
          <div className="border-b border-border-subtle px-6 py-5 sm:border-r xl:border-b-0">
            <dt className="text-sm text-foreground-muted">Agreement owner</dt>
            <dd className="mt-2 font-semibold text-foreground">{agreement.owner}</dd>
          </div>
          <div className="border-b border-border-subtle px-6 py-5 xl:border-b-0 xl:border-r">
            <dt className="text-sm text-foreground-muted">Effective from</dt>
            <dd className="mt-2 font-semibold text-foreground">
              {formatDate(agreement.effectiveDate)}
            </dd>
          </div>
          <div className="px-6 py-5">
            <dt className="text-sm text-foreground-muted">Expiry date</dt>
            <dd className="mt-2 font-semibold text-foreground">
              {formatDate(agreement.expiryDate)}
            </dd>
          </div>
        </dl>
      </div>

      {!canManageLifecycle ? (
        <Notice variant="warning" title="Lifecycle actions are restricted" leftBorder>
          Your role can view this agreement but cannot approve, activate, renew, expire, or
          terminate it.
        </Notice>
      ) : null}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as PartnershipTab)}
        variant="pill"
      >
        <TabsList className="rounded-xl bg-surface-subtle p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="obligations">Obligations ({agreementObligations.length})</TabsTrigger>
          <TabsTrigger value="renewal">Renewal ({agreementRenewalAlerts.length})</TabsTrigger>
          <TabsTrigger value="reviews">
            Value reviews ({agreementReviews.length}){schedule?.due ? ' · due' : ''}
          </TabsTrigger>
          <TabsTrigger value="history">History ({agreementHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-6">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(19rem,0.9fr)]">
            <div className="space-y-6">
              <SectionCard
                title="Agreement profile"
                className="rounded-2xl border border-border-subtle shadow-sm"
              >
                <div>
                  <p className="text-base leading-7 text-foreground">
                    {agreement.valueCommitment || 'No value commitment has been recorded yet.'}
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="flex min-h-20 items-center gap-4 rounded-xl border border-border px-5 py-4">
                      <FileCheck2
                        className="shrink-0 text-foreground-muted"
                        size={20}
                        aria-hidden
                      />
                      <div>
                        <p className="text-sm text-foreground-muted">Agreement type</p>
                        <p className="mt-1 font-semibold text-foreground">
                          {titleCase(agreement.agreementType)}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-h-20 items-center gap-4 rounded-xl border border-border px-5 py-4">
                      <CalendarDays
                        className="shrink-0 text-foreground-muted"
                        size={20}
                        aria-hidden
                      />
                      <div>
                        <p className="text-sm text-foreground-muted">Agreement period</p>
                        <p className="mt-1 font-semibold text-foreground">
                          {formatDate(agreement.effectiveDate)} – {formatDate(agreement.expiryDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-h-20 items-center gap-4 rounded-xl border border-border px-5 py-4">
                      <RotateCcw className="shrink-0 text-foreground-muted" size={20} aria-hidden />
                      <div>
                        <p className="text-sm text-foreground-muted">Renewals completed</p>
                        <p className="mt-1 font-semibold text-foreground">
                          {agreement.renewalCount}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-h-20 items-center gap-4 rounded-xl border border-border px-5 py-4">
                      <ClipboardList
                        className="shrink-0 text-foreground-muted"
                        size={20}
                        aria-hidden
                      />
                      <div>
                        <p className="text-sm text-foreground-muted">Obligation completion</p>
                        <p className="mt-1 font-semibold text-foreground">{completion}% complete</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-border-subtle pt-5">
                    <h3 className="font-semibold text-foreground">Planned deliverables</h3>
                    <ul className="mt-3 space-y-2 text-sm text-foreground">
                      {agreement.deliverables.map((deliverable) => (
                        <li key={deliverable} className="flex gap-2">
                          <CheckCircle2
                            size={16}
                            className="mt-0.5 shrink-0 text-success"
                            aria-hidden
                          />
                          <span>{deliverable}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {agreement.termination ? (
                    <div className="mt-6 rounded-xl border border-error/30 bg-error/5 px-4 py-3">
                      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-error">
                        <ShieldAlert size={14} aria-hidden /> Termination record
                      </p>
                      <div className="mt-2 space-y-2 text-sm text-foreground">
                        <p>{agreement.termination.reason}</p>
                        <p className="text-foreground-muted">
                          Effective {formatDate(agreement.termination.terminatedAt)} · Approved by{' '}
                          {agreement.termination.approvedBy}
                        </p>
                        <p className="font-mono text-xs text-foreground-muted">
                          {agreement.termination.documentationRef} ·{' '}
                          {agreement.termination.finalArchiveRef}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              <SectionCard
                title="Current obligations"
                description={`${agreementObligations.length} tracked obligation${agreementObligations.length === 1 ? '' : 's'}`}
                actions={
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('obligations')}>
                    View obligations <ArrowRight size={16} aria-hidden />
                  </Button>
                }
                className="rounded-2xl border border-border-subtle shadow-sm"
              >
                {featuredObligations.length === 0 ? (
                  <p className="text-sm text-foreground-muted">No obligations have been defined.</p>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {featuredObligations.map((obligation) => (
                      <div
                        key={obligation.id}
                        className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-light text-primary">
                          <ClipboardList size={18} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground">
                            {obligation.title}
                          </p>
                          <p className="mt-1 text-sm text-foreground-muted">
                            {obligation.owner} · Due {formatDate(obligation.dueDate)}
                          </p>
                        </div>
                        <ObligationStatusBadge status={effectiveObligationStatus(obligation)} />
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard
                title="Primary stakeholder"
                actions={<Badge variant="primary">S081</Badge>}
                className="rounded-2xl border border-border-subtle shadow-sm"
              >
                <p className="font-semibold text-foreground">
                  {stakeholder?.name ?? agreement.stakeholderId}
                </p>
                {stakeholder ? (
                  <p className="mt-2 text-sm text-foreground-muted">
                    {stakeholder.category} · {stakeholder.location}
                  </p>
                ) : null}
                <Button
                  variant="outline"
                  className="mt-5"
                  disabled={!stakeholder}
                  onClick={() =>
                    stakeholder && void navigate(stakeholderProfileRoute(stakeholder.id))
                  }
                >
                  <ExternalLink size={16} aria-hidden /> Open stakeholder
                </Button>
              </SectionCard>

              <SectionCard
                title="Authoritative records"
                className="rounded-2xl border border-border-subtle shadow-sm"
                // description="Where each part of this agreement really lives"
              >
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={!stakeholder}
                    onClick={() =>
                      stakeholder && void navigate(stakeholderProfileRoute(stakeholder.id))
                    }
                    className="flex w-full items-center gap-3 rounded-xl border border-border-subtle p-3 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Link2 size={18} className="shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-foreground-muted">S081 stakeholder</span>
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {stakeholder?.name ?? agreement.stakeholderId}
                      </span>
                    </span>
                    <ExternalLink size={15} aria-hidden />
                  </button>

                  <div className="flex items-center gap-3 rounded-xl border border-border-subtle p-3">
                    <ShieldCheck size={18} className="shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-foreground-muted">S136 legal record</span>
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {agreement.legalContractRef ?? 'Not linked'}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-border-subtle p-3">
                    <FileCheck2 size={18} className="shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-foreground-muted">
                        S003 signed document
                      </span>
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {agreement.signedDocumentRef ?? 'Pending signature'}
                      </span>
                    </span>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Agreement parties"
                className="rounded-2xl border border-border-subtle shadow-sm"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">CLET</Badge>
                  {agreementParties.map((party) => (
                    <Badge
                      key={party.id}
                      variant={party.id === agreement.stakeholderId ? 'primary' : 'outline'}
                    >
                      {party.name}
                      {party.id === agreement.stakeholderId ? ' · Primary' : ''}
                    </Badge>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="obligations" className="pt-6">
          <SectionCard
            title="Obligations and deliverables"
            // description="Named ownership, deadlines, completion status, and evidence references."
            actions={
              <Button
                size="sm"
                disabled={!canManageObligations || terminated}
                onClick={() => setObligationOpen(true)}
              >
                <Plus size={15} aria-hidden /> Add obligation
              </Button>
            }
          >
            {agreementObligations.length === 0 ? (
              <EmptyState
                message="No obligations defined yet"
                hint="Break the agreement into dated, owned commitments so progress can be tracked."
                icon={<ClipboardList size={22} aria-hidden />}
                action={
                  <Button
                    disabled={!canManageObligations || terminated}
                    onClick={() => setObligationOpen(true)}
                  >
                    <Plus size={15} aria-hidden /> Add obligation
                  </Button>
                }
              />
            ) : (
              <>
                <div className="mb-5">
                  <ProgressBar
                    value={completion}
                    label="Overall completion"
                    showValue
                    variant={completion === 100 ? 'success' : 'default'}
                  />
                </div>
                <div className="divide-y divide-border-subtle">
                  {agreementObligations.map((obligation) => {
                    const status = effectiveObligationStatus(obligation);
                    const notes = obligationProgress.filter(
                      (item) => item.obligationId === obligation.id,
                    );
                    return (
                      <article key={obligation.id} className="py-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{obligation.title}</p>
                              <ObligationStatusBadge status={status} />
                            </div>
                            <p className="mt-2 text-sm leading-6 text-foreground-muted">
                              {obligation.description}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canManageObligations || terminated}
                              onClick={() => setProgressObligation(obligation)}
                            >
                              <MessageSquare size={14} aria-hidden /> Add update
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canManageObligations || terminated}
                              onClick={() => setEditingObligation(obligation)}
                            >
                              <Pencil size={14} aria-hidden /> Edit
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4">
                          <DetailGrid columns={3}>
                            <DetailItem label="Owner" value={obligation.owner} />
                            <DetailItem label="Due" value={formatDate(obligation.dueDate)} />
                            <DetailItem
                              label="Reminder & escalation"
                              value={
                                <span className="flex items-center gap-1">
                                  <Bell size={13} aria-hidden />
                                  {obligationReminderSummary(obligation)}
                                </span>
                              }
                            />
                          </DetailGrid>
                        </div>

                        {obligation.evidenceReferences.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {obligation.evidenceReferences.map((reference) => (
                              <Badge key={reference} variant="outline">
                                {reference}
                              </Badge>
                            ))}
                          </div>
                        ) : null}

                        {notes.length ? (
                          <div className="mt-4 space-y-2 border-l-2 border-primary/30 pl-4">
                            {notes.map((note) => (
                              <div key={note.id}>
                                <p className="text-sm text-foreground">{note.note}</p>
                                <p className="mt-1 text-xs text-foreground-muted">
                                  {note.actor} · {formatDate(note.createdAt)}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="renewal" className="pt-6">
          <TabHeading
            title="Renewal alert schedule"
            // description="Calculated from the agreement expiry date and dispatched through S074."
            action={
              <Button
                variant="outline"
                disabled={!canManageLifecycle || terminated}
                onClick={() => setRenewalAlertsOpen(true)}
              >
                <Settings2 size={16} aria-hidden /> Configure recipients
              </Button>
            }
          />

          {agreementRenewalAlerts.length === 0 ? (
            <Notice variant="warning" title="Renewal alerts are not configured" leftBorder>
              Set an expiry date and configure recipients to create the 180, 90, and 30-day
              schedule.
            </Notice>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {agreementRenewalAlerts.map((alert) => {
                const status = effectiveRenewalAlertStatus(alert);
                return (
                  <Card key={alert.id} bordered>
                    <div className="flex items-start justify-between gap-3">
                      <Badge variant={renewalAlertVariants[status]}>{titleCase(status)}</Badge>
                      <span className="text-lg font-bold tabular-nums text-primary">
                        {alert.milestoneDays}d
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold text-foreground">
                      {milestoneLabel(alert.milestoneDays)}
                    </h3>
                    <p className="mt-2 text-sm text-foreground-muted">
                      Scheduled for {formatDate(alert.scheduledFor)}
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {alert.recipients.length} recipient{alert.recipients.length === 1 ? '' : 's'}
                    </p>
                    {alert.communicationRef ? (
                      <p className="mt-3 font-mono text-xs text-foreground-muted">
                        {alert.communicationRef}
                      </p>
                    ) : null}
                    {status === 'DUE' || status === 'FAILED' ? (
                      <Button
                        className="mt-4"
                        size="sm"
                        disabled={!canManageLifecycle}
                        onClick={() => dispatchRenewalAlert(alert.id, actor)}
                      >
                        <Send size={14} aria-hidden /> Dispatch via S074
                      </Button>
                    ) : null}
                    {status === 'SENT' ? (
                      <Button
                        className="mt-4"
                        size="sm"
                        variant="outline"
                        disabled={!canManageLifecycle}
                        onClick={() => acknowledgeRenewalAlert(alert.id, actor)}
                      >
                        <CheckCircle2 size={14} aria-hidden /> Acknowledge
                      </Button>
                    ) : null}
                    {status === 'ACKNOWLEDGED' && alert.acknowledgedBy ? (
                      <p className="mt-4 text-xs font-semibold text-foreground">
                        Acknowledged by {alert.acknowledgedBy}
                      </p>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}

          {agreementRenewals.length ? (
            <SectionCard
              className="mt-5"
              title="Renewal history"
              // description={`${agreementRenewals.length} completed renewal${agreementRenewals.length === 1 ? '' : 's'}`}
            >
              <div className="divide-y divide-border-subtle">
                {agreementRenewals.map((renewal) => (
                  <div key={renewal.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {formatDate(renewal.effectiveDate)} – {formatDate(renewal.expiryDate)}
                        </p>
                        <p className="mt-1 text-sm text-foreground-muted">
                          Previous expiry: {formatDate(renewal.previousExpiryDate)}
                        </p>
                      </div>
                      <Badge variant="success">Renewed</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground-muted">
                      {renewal.termsSummary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-foreground-muted">
                      <span>{renewal.legalContractRef}</span>
                      <span>{renewal.signedDocumentRef}</span>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-foreground">
                      Recorded by {renewal.renewedBy} on {formatDate(renewal.renewedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </TabsContent>

        <TabsContent value="reviews" className="pt-6">
          <TabHeading
            title="Value-realisation reviews"
            // description="Assess strategic value and support evidence-based renewal decisions."
            action={
              <Button
                disabled={!canManageReviews || terminated}
                onClick={() => setReviewOpen(true)}
              >
                <Plus size={15} aria-hidden /> Record review
              </Button>
            }
          />

          {schedule?.due ? (
            <Notice
              variant="warning"
              title={
                schedule.basis === 'FIRST_REVIEW'
                  ? 'First value-realisation review is due'
                  : 'Value-realisation review is due'
              }
              icon={<CalendarClock size={18} aria-hidden />}
              leftBorder
              className="mb-5"
            >
              {schedule.basis === 'FIRST_REVIEW'
                ? `No review has been recorded since activation; one was expected by ${formatDate(schedule.dueDate)}.`
                : `The last review scheduled the next one for ${formatDate(schedule.dueDate)}.`}{' '}
              {schedule.daysOverdue > 0
                ? `It is ${schedule.daysOverdue} day${schedule.daysOverdue === 1 ? '' : 's'} overdue.`
                : 'It is due today.'}{' '}
              {canManageReviews
                ? 'Record a review to reset the schedule.'
                : 'Ask a partnerships manager or the Registrar to record it.'}
            </Notice>
          ) : schedule ? (
            <p className="mb-5 text-sm text-foreground-muted">
              Next review due {formatDate(schedule.dueDate)}
              {schedule.basis === 'FIRST_REVIEW' ? ' (twelve months after activation)' : ''}.
            </p>
          ) : null}

          <div className="mb-5">
            <ValueRealisationCard agreement={agreement} reviews={agreementReviews} />
          </div>

          {agreementReviews.length === 0 ? (
            <Card bordered>
              <EmptyState
                message="No value-realisation reviews recorded"
                hint="A review captures what the partnership delivered, and feeds the renewal decision."
                icon={<ClipboardList size={22} aria-hidden />}
                action={
                  <Button
                    disabled={!canManageReviews || terminated}
                    onClick={() => setReviewOpen(true)}
                  >
                    <Plus size={15} aria-hidden /> Record review
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {agreementReviews.map((review) => (
                <Card key={review.id} bordered>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge variant={review.outcome === 'ON_TRACK' ? 'success' : 'warning'}>
                        {titleCase(review.outcome)}
                      </Badge>
                      <h3 className="mt-3 font-semibold text-foreground">
                        Annual value-realisation review
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-foreground-muted">
                        {formatDate(review.reviewDate)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canManageReviews || terminated}
                        onClick={() => setEditingReview(review)}
                      >
                        <Pencil size={14} aria-hidden /> Edit
                      </Button>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-foreground-muted">{review.summary}</p>

                  <div className="mt-4">
                    <DetailGrid columns={3}>
                      <DetailItem
                        label="Review period"
                        value={`${formatDate(review.periodStart)} – ${formatDate(review.periodEnd)}`}
                      />
                      <DetailItem label="Strategic score" value={`${review.strategicScore} / 5`} />
                      <DetailItem
                        label="Renewal recommendation"
                        value={titleCase(review.renewalRecommendation)}
                      />
                    </DetailGrid>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {[
                      { heading: 'Realised outputs', items: review.outputs },
                      { heading: 'Issues', items: review.issues },
                      { heading: 'Recommendations', items: review.recommendations },
                    ].map(({ heading, items }) => (
                      <div key={heading}>
                        <h4 className="text-xs font-bold uppercase tracking-wide text-foreground-muted">
                          {heading}
                        </h4>
                        <ul className="mt-2 space-y-1 text-sm text-foreground">
                          {items.length ? (
                            items.map((item) => (
                              <li key={item} className="flex gap-2">
                                <span aria-hidden>•</span>
                                <span>{item}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-foreground-muted">None recorded</li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-xs font-semibold text-foreground">
                    Reviewed by {review.reviewer} · Next review {formatDate(review.nextReviewDate)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="pt-6">
          <SectionCard
            title="Agreement history"
            // description="Frontend event history. The backend will make these records immutable through S204."
          >
            <DataTable
              paramPrefix="agreement-history"
              columns={historyColumns}
              data={agreementHistory}
              rowKey={(row) => row.id}
              searchPlaceholder="Search events, summaries, or actors"
              searchFields={(row) => [row.action, row.summary, row.actor]}
              filters={[
                {
                  key: 'actor',
                  label: 'Actor',
                  options: [...new Set(agreementHistory.map((row) => row.actor))].sort(),
                  value: (row) => row.actor,
                },
                {
                  key: 'action',
                  label: 'Event',
                  options: [...new Set(agreementHistory.map((row) => row.action))]
                    .sort()
                    .map((action) => ({ value: action, label: titleCase(action) })),
                  value: (row) => row.action,
                },
              ]}
              pageSize={15}
              empty={{
                message: 'No events recorded yet',
                hint: 'Lifecycle changes, renewals and reviews are logged here as they happen.',
              }}
            />
          </SectionCard>
        </TabsContent>
      </Tabs>

      {printing ? (
        <AgreementDossierPrint
          dossier={dossier}
          stakeholderName={stakeholderName}
          printedBy={actor}
          onDone={stopPrinting}
        />
      ) : null}
      {editOpen ? (
        <AgreementFormModal open onOpenChange={setEditOpen} agreement={agreement} />
      ) : null}
      {transitionTarget ? (
        <LifecycleTransitionModal
          agreement={agreement}
          targetStatus={transitionTarget}
          blockers={[
            ...transitionBlockers(agreement, agreementObligations, transitionTarget),
            ...unavailablePartyBlockers,
          ]}
          actor={actor}
          open
          onOpenChange={(open) => !open && setTransitionTarget(null)}
        />
      ) : null}
      {renewalOpen ? (
        <RenewalFormModal agreement={agreement} actor={actor} open onOpenChange={setRenewalOpen} />
      ) : null}
      {renewalAlertsOpen ? (
        <RenewalAlertsModal
          agreement={agreement}
          alerts={agreementRenewalAlerts}
          actor={actor}
          open
          onOpenChange={setRenewalAlertsOpen}
        />
      ) : null}
      {terminationOpen ? (
        <TerminationFormModal
          agreement={agreement}
          approvedBy={actor}
          blockers={exitBlockers}
          open
          onOpenChange={setTerminationOpen}
        />
      ) : null}
      {obligationOpen ? (
        <ObligationFormModal
          open
          onOpenChange={setObligationOpen}
          agreementId={agreement.id}
          actor={actor}
        />
      ) : null}
      {editingObligation ? (
        <ObligationFormModal
          open
          onOpenChange={(open) => !open && setEditingObligation(null)}
          agreementId={agreement.id}
          actor={actor}
          obligation={editingObligation}
        />
      ) : null}
      {progressObligation ? (
        <ObligationProgressModal
          open
          onOpenChange={(open) => !open && setProgressObligation(null)}
          actor={actor}
          obligation={progressObligation}
        />
      ) : null}
      {reviewOpen ? (
        <ReviewFormModal
          open
          onOpenChange={setReviewOpen}
          agreementId={agreement.id}
          actor={actor}
        />
      ) : null}
      {editingReview ? (
        <ReviewFormModal
          open
          onOpenChange={(open) => !open && setEditingReview(null)}
          agreementId={agreement.id}
          actor={actor}
          review={editingReview}
        />
      ) : null}
    </section>
  );
}
