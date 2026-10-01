import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@rfdtech/components';
import { CalendarPlus } from 'lucide-react';

import type { KolContentStage, KolEngagementType } from '@partner-crm/types';

import { ROUTES } from '@/constants/routes';
import { EngagementFormModal } from '@/features/kol/components/EngagementFormModal';
import { ContentDialogs, EngagementDialogs } from '@/features/kol/components/KolDialogs';
import { LoadNotice } from '@/features/kol/components/LoadNotice';
import {
  BoardColumn,
  ContentCard,
  EmptyColumn,
  EngagementCard,
} from '@/features/kol/components/PipelineBoard';
import { PIPELINE_STAGES } from '@/features/kol/domain';
import type { ContentDialog, EngagementDialog } from '@/features/kol/kolActions';
import { ENGAGEMENT_TYPE_OPTIONS } from '@/features/kol/kolForm';
import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import { useKol } from '@/features/kol/state/useKol';
import { useKolAccess } from '@/features/kol/state/useKolAccess';
import { PageHeader, SectionCard, SelectField, titleCase } from '@/features/shared';

/** Closed columns grow forever; show the latest few and point at the history. */
const CLOSED_COLUMN_LIMIT = 6;

const CONTENT_COLUMNS: KolContentStage[] = [
  'COMMISSIONED',
  'DRAFT_SUBMITTED',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'PUBLISHED',
];

export function Component() {
  const { profiles, engagements, content } = useKol();
  const { canManage, actor } = useKolAccess();
  const [params, setParams] = useSearchParams();
  const [planOpen, setPlanOpen] = useState(false);
  const [engagementDialog, setEngagementDialog] = useState<EngagementDialog>(null);
  const [contentDialog, setContentDialog] = useState<ContentDialog>(null);

  const typeFilter = (params.get('type') ?? '') as KolEngagementType | '';
  const ownerFilter = params.get('owner') ?? '';
  const setFilter = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const profileById = useMemo(() => new Map(profiles.map((item) => [item.id, item])), [profiles]);
  const owners = useMemo(
    () => [...new Set(engagements.map((item) => item.owner))].sort(),
    [engagements],
  );

  const visible = engagements.filter(
    (item) => (!typeFilter || item.type === typeFilter) && (!ownerFilter || item.owner === ownerFilter),
  );
  const byDate = (left: { scheduledFor: string | null }, right: { scheduledFor: string | null }) =>
    (left.scheduledFor ?? '9999').localeCompare(right.scheduledFor ?? '9999');
  // const closedCount = visible.filter((item) => item.stage === 'DECLINED' || item.stage === 'CANCELLED').length;

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Outreach planner"
        // description="Move invitations from plan to delivery, and track content collaborations from commission to publication."
        backTo={{ to: ROUTES.KOLS, label: 'Back to KOL register' }}
        // meta={<Badge variant="outline">System S092</Badge>}
        actions={
          <Button
            disabled={!canManage}
            title={canManage ? undefined : MANAGE_DENIED_REASON}
            onClick={() => setPlanOpen(true)}
          >
            <CalendarPlus size={16} aria-hidden /> Plan engagement
          </Button>
        }
      />

      <LoadNotice canManage={canManage} />

      <SectionCard
        title="Engagement pipeline"
        // description={`${visible.length - closedCount} engagements shown · ${closedCount} declined or cancelled (see each KOL’s history).`}
      >
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <SelectField
            label="Engagement type"
            value={typeFilter}
            onChange={(value) => setFilter('type', value)}
            options={ENGAGEMENT_TYPE_OPTIONS}
            placeholder="All types"
            clearable
          />
          <SelectField
            label="Owner"
            value={ownerFilter}
            onChange={(value) => setFilter('owner', value)}
            options={owners}
            placeholder="All owners"
            clearable
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PIPELINE_STAGES.map((stage) => {
            const all = visible.filter((item) => item.stage === stage);
            const cards =
              stage === 'COMPLETED'
                ? [...all].sort((left, right) => byDate(right, left)).slice(0, CLOSED_COLUMN_LIMIT)
                : [...all].sort(byDate);
            return (
              <BoardColumn
                key={stage}
                title={titleCase(stage)}
                count={all.length}
                footer={
                  all.length > cards.length
                    ? `Showing the latest ${cards.length}. Full history is on each KOL profile and the impact dashboard.`
                    : undefined
                }
              >
                {cards.length === 0 ? (
                  <EmptyColumn>
                    {typeFilter || ownerFilter
                      ? 'Nothing matches these filters.'
                      : stage === 'PLANNED'
                        ? 'Plan an engagement to start the pipeline.'
                        : `No ${titleCase(stage).toLowerCase()} engagements.`}
                  </EmptyColumn>
                ) : (
                  cards.map((item) => (
                    <EngagementCard
                      key={item.id}
                      engagement={item}
                      profile={profileById.get(item.kolId)}
                      canManage={canManage}
                      onAction={setEngagementDialog}
                    />
                  ))
                )}
              </BoardColumn>
            );
          })}
        </div>
      </SectionCard>

      <div id="content" className="scroll-mt-6">
        <SectionCard
          title="Content collaborations"
          // description="Draft (S003) → review → approval → publication on S076. Withdrawn pieces are hidden."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {CONTENT_COLUMNS.map((stage) => {
              const all = content.filter((item) => item.stage === stage);
              const cards =
                stage === 'PUBLISHED'
                  ? [...all]
                      .sort((left, right) => (right.publishedAt ?? '').localeCompare(left.publishedAt ?? ''))
                      .slice(0, CLOSED_COLUMN_LIMIT)
                  : all;
              return (
                <BoardColumn key={stage} title={titleCase(stage)} count={all.length}>
                  {cards.length === 0 ? (
                    <EmptyColumn>Nothing here. Commission content from a KOL profile.</EmptyColumn>
                  ) : (
                    cards.map((item) => (
                      <ContentCard
                        key={item.id}
                        content={item}
                        profile={profileById.get(item.kolId)}
                        canManage={canManage}
                        onAction={setContentDialog}
                      />
                    ))
                  )}
                </BoardColumn>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {planOpen ? <EngagementFormModal defaultOwner={actor} open onOpenChange={setPlanOpen} /> : null}
      <EngagementDialogs dialog={engagementDialog} onClose={() => setEngagementDialog(null)} />
      <ContentDialogs dialog={contentDialog} onClose={() => setContentDialog(null)} />
    </section>
  );
}
