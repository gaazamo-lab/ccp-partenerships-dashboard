import { useMemo, useState } from 'react';

import { Badge, Button, type TableColumn } from '@rfdtech/components';
import { CalendarPlus, CheckCircle2, Mic } from 'lucide-react';

import type { KolEngagement, KolProfile } from '@partner-crm/types';

import { EngagementDialogs } from '@/features/kol/components/KolDialogs';
import { EngagementStageBadge, EngagementTypeBadge } from '@/features/kol/components/KolBadges';
import { EngagementFormModal } from '@/features/kol/components/EngagementFormModal';
import { ENGAGEMENT_TYPE_LABELS, engagementCreationError } from '@/features/kol/domain';
import { type EngagementDialog, engagementMenuItems } from '@/features/kol/kolActions';
import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import {
  ActionMenu,
  DataTable,
  EmptyState,
  SectionCard,
  formatDate,
  titleCase,
} from '@/features/shared';

interface EngagementsTabProps {
  profile: KolProfile;
  engagements: KolEngagement[];
  canManage: boolean;
  actor: string;
}

export function EngagementsTab({ profile, engagements, canManage, actor }: EngagementsTabProps) {
  const [planOpen, setPlanOpen] = useState(false);
  const [dialog, setDialog] = useState<EngagementDialog>(null);
  const archived = engagementCreationError(profile);

  const columns = useMemo<TableColumn<KolEngagement>[]>(
    () => [
      {
        id: 'title',
        header: 'Engagement',
        accessorKey: 'title',
        sortable: true,
        minWidth: 280,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{row.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <EngagementTypeBadge type={row.type} />
              {row.externalRef ? (
                <span className="font-mono text-xs text-foreground-muted">{row.externalRef}</span>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        id: 'stage',
        header: 'Stage',
        accessorKey: 'stage',
        sortable: true,
        minWidth: 120,
        cell: ({ row }) => <EngagementStageBadge stage={row.stage} />,
      },
      {
        id: 'scheduledFor',
        header: 'Date',
        accessorFn: (row) => row.scheduledFor ?? '',
        sortable: true,
        minWidth: 120,
        cell: ({ row }) => formatDate(row.scheduledFor),
      },
      { id: 'owner', header: 'Owner', accessorKey: 'owner', sortable: true, minWidth: 130 },
      {
        id: 'score',
        header: 'Contribution',
        accessorFn: (row) => row.participation?.contributionScore ?? 0,
        sortable: true,
        minWidth: 120,
        cell: ({ row }) =>
          row.participation ? (
            <span className="text-sm font-semibold text-foreground">
              {row.participation.contributionScore} / 5
            </span>
          ) : (
            <span className="text-sm text-foreground-muted">—</span>
          ),
      },
      {
        id: 'actions',
        header: '',
        width: 64,
        align: 'right',
        cell: ({ row }) => (
          <ActionMenu
            label={`Actions for ${row.title}`}
            items={engagementMenuItems(row, canManage, setDialog)}
          />
        ),
      },
    ],
    [canManage],
  );

  const participated = engagements
    .filter((item) => item.participation)
    .sort((left, right) => (right.scheduledFor ?? '').localeCompare(left.scheduledFor ?? ''));

  const planButton = (
    <Button
      size="sm"
      disabled={!canManage || Boolean(archived)}
      title={!canManage ? MANAGE_DENIED_REASON : (archived ?? undefined)}
      onClick={() => setPlanOpen(true)}
    >
      <CalendarPlus size={15} aria-hidden /> Invite / plan engagement
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        title="Engagement history"
        // description="Op-eds, panels, keynotes, S087 webinars, S093 podcasts, consultations and campaigns."
        actions={planButton}
      >
        <DataTable
          paramPrefix="kol-engagements"
          columns={columns}
          data={engagements}
          rowKey={(row) => row.id}
          paginated={false}
          filters={[
            {
              key: 'stage',
              label: 'Stage',
              options: [...new Set(engagements.map((item) => item.stage))].map((value) => ({
                value,
                label: titleCase(value),
              })),
              value: (row) => row.stage,
            },
          ]}
          empty={{
            message: 'No engagements yet',
            hint: archived ?? 'Plan an invitation — a panel, op-ed, webinar or podcast.',
            icon: <CalendarPlus size={22} aria-hidden />,
            action: archived ? undefined : planButton,
          }}
        />
      </SectionCard>

      <SectionCard
        title="Event and podcast participation"
        // description="Attendance, outputs, feedback and contribution recorded after each engagement."
      >
        {participated.length === 0 ? (
          <EmptyState
            message="No participation recorded yet"
            hint="When an engagement is delivered, use “Record participation” from its actions menu."
            icon={<Mic size={22} aria-hidden />}
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {participated.map((item) => (
              <article key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <Badge variant={item.participation?.attended ? 'success' : 'warning'} size="sm">
                    {item.participation?.attended ? 'Attended' : 'Did not attend'}
                  </Badge>
                  <Badge variant="outline" size="sm">
                    {item.participation?.contributionScore} / 5
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">
                  {ENGAGEMENT_TYPE_LABELS[item.type]} · {formatDate(item.scheduledFor)} · recorded by{' '}
                  {item.participation?.recordedBy}
                </p>
                {item.participation?.outputs ? (
                  <p className="mt-2 flex gap-2 text-sm text-foreground">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                    {item.participation.outputs}
                  </p>
                ) : null}
                {item.participation?.feedback ? (
                  <p className="mt-1 text-sm text-foreground-muted">“{item.participation.feedback}”</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      {planOpen ? (
        <EngagementFormModal kolId={profile.id} defaultOwner={actor} open onOpenChange={setPlanOpen} />
      ) : null}
      <EngagementDialogs dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
