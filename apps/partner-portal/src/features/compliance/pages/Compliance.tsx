import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, Notice, type TableColumn } from '@rfdtech/components';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  MailCheck,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { stakeholderProfileRoute } from '@/constants/routes';
import { ScreeningDecisionModal } from '@/features/compliance/components/ScreeningDecisionModal';
import {
  DataTable,
  type DataTableFilter,
  type Kpi,
  KpiGrid,
  PageHeader,
  SectionCard,
  formatDateTime,
} from '@/features/shared';
import { ConsentBadge, ScreeningBadge } from '@/features/stakeholders/components/StatusBadges';
import { CONSENT_STATUSES, OPEN_SCREENING } from '@/features/stakeholders/constants';
import { permissionHint } from '@/features/stakeholders/permissions';
import { useCrm } from '@/features/stakeholders/state/CrmContext';
import type { Stakeholder, StakeholderContact } from '@/features/stakeholders/types';

/** A contact with the organisation it belongs to. */
interface ContactRow {
  contact: StakeholderContact;
  stakeholder: Stakeholder;
}

export function Component() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { stakeholders, loading, error, reload } = useCrm();
  const [deciding, setDeciding] = useState<ContactRow | null>(null);
  const screenHint = permissionHint(user?.role, 'screen');

  const rows = useMemo<ContactRow[]>(
    () =>
      stakeholders.flatMap((stakeholder) =>
        stakeholder.contacts.map((contact) => ({ contact, stakeholder })),
      ),
    [stakeholders],
  );

  const queue = useMemo(
    () =>
      rows.filter(
        ({ contact }) => contact.active && OPEN_SCREENING.includes(contact.screening),
      ),
    [rows],
  );

  const decisions = useMemo(
    () =>
      rows
        .filter(({ contact }) => contact.screeningRecord)
        .sort((left, right) =>
          (right.contact.screeningRecord?.reviewedAt ?? '').localeCompare(
            left.contact.screeningRecord?.reviewedAt ?? '',
          ),
        ),
    [rows],
  );

  const counts = useMemo(() => {
    const active = rows.filter(({ contact }) => contact.active);
    const by = (screening: StakeholderContact['screening']) =>
      active.filter(({ contact }) => contact.screening === screening).length;
    return {
      pending: by('Pending'),
      review: by('Review required'),
      rejected: by('Rejected'),
      cleared: by('Cleared'),
      total: active.length,
      consent: CONSENT_STATUSES.map((status) => ({
        status,
        count: active.filter(({ contact }) => contact.consent === status).length,
      })),
    };
  }, [rows]);

  const kpis = useMemo<Kpi[]>(
    () => [
      {
        id: 'pending',
        label: 'Pending screening',
        value: counts.pending,
        description: 'Awaiting an S203 result',
        icon: <Clock3 size={20} aria-hidden />,
      },
      {
        id: 'review',
        label: 'Requires review',
        value: counts.review,
        description: counts.review > 0 ? 'Blocked until decided' : 'Nothing blocked',
        icon: <ShieldAlert size={20} aria-hidden />,
      },
      {
        id: 'rejected',
        label: 'Rejected',
        value: counts.rejected,
        description: counts.rejected > 0 ? 'Deactivate to unblock the organisation' : 'None active',
        icon: <Ban size={20} aria-hidden />,
      },
      {
        id: 'cleared',
        label: 'Cleared contacts',
        value: counts.cleared,
        description: `of ${counts.total} active contacts`,
        icon: <ShieldCheck size={20} aria-hidden />,
      },
    ],
    [counts],
  );

  const queueColumns = useMemo<TableColumn<ContactRow>[]>(
    () => [
      {
        id: 'contact',
        header: 'Contact',
        accessorFn: (row) => row.contact.name,
        sortable: true,
        minWidth: 280,
        cell: ({ row }) => {
          const blocked = row.contact.screening === 'Review required';
          return (
            <div className="flex items-center gap-3">
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-full ${
                  blocked ? 'bg-error/10 text-error' : 'bg-warning/15 text-warning-strong'
                }`}
              >
                {blocked ? (
                  <AlertTriangle size={19} aria-hidden />
                ) : (
                  <Clock3 size={19} aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{row.contact.name}</p>
                <p className="truncate text-sm text-foreground-muted">
                  {row.contact.role} · {row.stakeholder.name}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'organisation',
        header: 'Organisation',
        accessorFn: (row) => row.stakeholder.name,
        sortable: true,
        minWidth: 180,
      },
      {
        id: 'category',
        header: 'Category',
        accessorFn: (row) => row.stakeholder.category,
        sortable: true,
        minWidth: 150,
      },
      {
        id: 'screening',
        header: 'Screening',
        accessorFn: (row) => row.contact.screening,
        sortable: true,
        width: 170,
        cell: ({ row }) => <ScreeningBadge status={row.contact.screening} />,
      },
      {
        id: 'action',
        header: '',
        width: 170,
        align: 'right',
        cell: ({ row }) => (
          <Button
            variant={row.contact.screening === 'Review required' ? 'primary' : 'outline'}
            size="sm"
            disabled={Boolean(screenHint)}
            title={screenHint}
            onClick={(event) => {
              event.stopPropagation();
              setDeciding(row);
            }}
          >
            Record decision
          </Button>
        ),
      },
    ],
    [screenHint],
  );

  const decisionColumns = useMemo<TableColumn<ContactRow>[]>(
    () => [
      {
        id: 'contact',
        header: 'Contact',
        accessorFn: (row) => row.contact.name,
        sortable: true,
        minWidth: 200,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{row.contact.name}</p>
            <p className="truncate text-xs text-foreground-muted">{row.stakeholder.name}</p>
          </div>
        ),
      },
      {
        id: 'outcome',
        header: 'Outcome',
        accessorFn: (row) => row.contact.screeningRecord?.outcome ?? '',
        sortable: true,
        width: 160,
        cell: ({ row }) =>
          row.contact.screeningRecord ? (
            <ScreeningBadge status={row.contact.screeningRecord.outcome} />
          ) : null,
      },
      {
        id: 'caseRef',
        header: 'S203 case',
        accessorFn: (row) => row.contact.screeningRecord?.caseRef ?? '—',
        minWidth: 150,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.contact.screeningRecord?.caseRef ?? '—'}</span>
        ),
      },
      {
        id: 'reviewer',
        header: 'Reviewer',
        accessorFn: (row) => row.contact.screeningRecord?.reviewer ?? '',
        sortable: true,
        minWidth: 150,
      },
      {
        id: 'reviewedAt',
        header: 'Decided',
        accessorFn: (row) => row.contact.screeningRecord?.reviewedAt ?? '',
        sortable: true,
        minWidth: 170,
        cell: ({ row }) => formatDateTime(row.contact.screeningRecord?.reviewedAt),
      },
    ],
    [],
  );

  const filters = useMemo<DataTableFilter<ContactRow>[]>(
    () => [
      {
        key: 'screening',
        label: 'Screening status',
        options: OPEN_SCREENING,
        value: (row) => row.contact.screening,
      },
      {
        key: 'category',
        label: 'Category',
        options: [...new Set(queue.map((row) => row.stakeholder.category))].sort(),
        value: (row) => row.stakeholder.category,
      },
    ],
    [queue],
  );

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Compliance"
        // description="Screening and consent controls for regulated stakeholder relationships."
        meta={<Badge variant="outline">S203 connected</Badge>}
      />

      {error ? (
        <Notice variant="error" title="Compliance data could not be loaded" leftBorder>
          <p>{error}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={reload}>
            <RefreshCw size={14} aria-hidden /> Try again
          </Button>
        </Notice>
      ) : null}

      {counts.review + counts.rejected > 0 ? (
        <Notice variant="warning" title="Engagement controls are active" leftBorder>
          {counts.review + counts.rejected} contact
          {counts.review + counts.rejected === 1 ? '' : 's'} in regulated categories{' '}
          {counts.review + counts.rejected === 1 ? 'keeps' : 'keep'} their organisation blocked
          until S203 screening is cleared, or the contact is deactivated.
        </Notice>
      ) : null}

      <KpiGrid kpis={kpis} />

      <SectionCard
        title="Screening queue"
        // description="Active contacts awaiting a Sanctions / PEP / Watchlist Screening (S203) decision"
      >
        <DataTable
          paramPrefix="screening"
          columns={queueColumns}
          data={queue}
          rowKey={(row) => row.contact.id}
          loading={loading}
          searchPlaceholder="Search contact, role, or organisation"
          searchFields={(row) => [row.contact.name, row.contact.role, row.stakeholder.name]}
          filters={filters}
          pageSize={10}
          onRowClick={(row) => void navigate(stakeholderProfileRoute(row.stakeholder.id))}
          empty={{
            message: 'Screening queue is clear',
            hint: 'No regulated contacts are awaiting an S203 decision.',
            icon: <CheckCircle2 size={22} aria-hidden />,
          }}
        />
      </SectionCard>

      <SectionCard
        title="Screening decisions"
        // description="Every recorded S203 outcome, with reviewer and time — also logged to S204"
      >
        <DataTable
          paramPrefix="decisions"
          columns={decisionColumns}
          data={decisions}
          rowKey={(row) => row.contact.id}
          loading={loading}
          pageSize={10}
          onRowClick={(row) => void navigate(stakeholderProfileRoute(row.stakeholder.id))}
          empty={{
            message: 'No decisions recorded yet',
            hint: 'Decisions recorded from the queue above appear here with their reviewer.',
            icon: <ShieldCheck size={22} aria-hidden />,
          }}
        />
      </SectionCard>

      <SectionCard
        title="S188 consent position"
        // description="Active contacts by consent status. Withdrawn contacts are excluded from every segment."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {counts.consent.map(({ status, count }) => (
            <div key={status} className="rounded-xl bg-surface-subtle p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-2xl font-bold tabular-nums text-foreground">{count}</p>
                <ConsentBadge consent={status} />
              </div>
              <p className="mt-1 text-sm text-foreground-muted">
                {status === 'Consented'
                  ? 'Eligible for outreach'
                  : status === 'Withdrawn'
                    ? 'Excluded from segments'
                    : 'Outreach needs fresh consent'}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm text-foreground-muted">
          <MailCheck size={16} aria-hidden /> Consent is recorded or withdrawn from each contact
          on the stakeholder profile, with the date and channel it was received.
        </p>
      </SectionCard>

      {deciding ? (
        <ScreeningDecisionModal
          open
          onOpenChange={(open) => {
            if (!open) setDeciding(null);
          }}
          contact={deciding.contact}
          stakeholder={deciding.stakeholder}
        />
      ) : null}
    </section>
  );
}
