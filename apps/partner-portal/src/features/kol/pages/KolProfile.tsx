import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Button, Card, Tabs, TabsContent, TabsList, TabsTrigger } from '@rfdtech/components';
import { CalendarPlus, ChevronRight, Pencil, SearchX } from 'lucide-react';

import { ROUTES } from '@/constants/routes';
import { EditKolModal } from '@/features/kol/components/EditKolModal';
import { EngagementFormModal } from '@/features/kol/components/EngagementFormModal';
import {
  InfluenceBadge,
  KolCategoryBadge,
  KolStatusBadge,
  RiskBadge,
} from '@/features/kol/components/KolBadges';
import { LoadNotice } from '@/features/kol/components/LoadNotice';
import { ContentTab } from '@/features/kol/components/profile/ContentTab';
import { EngagementsTab } from '@/features/kol/components/profile/EngagementsTab';
import { MediaTab } from '@/features/kol/components/profile/MediaTab';
import { OverviewTab } from '@/features/kol/components/profile/OverviewTab';
import { RiskTab } from '@/features/kol/components/profile/RiskTab';
import { engagementCreationError, kolImpact } from '@/features/kol/domain';
import { displayName } from '@/features/kol/kolForm';
import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import { useKol } from '@/features/kol/state/useKol';
import { useKolAccess } from '@/features/kol/state/useKolAccess';
import { EmptyState, PageHeader } from '@/features/shared';
import { useCrm } from '@/features/stakeholders/state/CrmContext';

const BACK = { to: ROUTES.KOLS, label: 'Back to KOL register' };
type KolProfileTab = 'overview' | 'engagements' | 'content' | 'media' | 'risk';

export function Component() {
  const navigate = useNavigate();
  const { kolId } = useParams();
  const { profiles, engagements, content, mentions, loading } = useKol();
  const { stakeholders } = useCrm();
  const { canManage, actor } = useKolAccess();
  const [editOpen, setEditOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<KolProfileTab>('overview');

  const profile = profiles.find((item) => item.id === kolId);

  const scoped = useMemo(
    () => ({
      engagements: engagements
        .filter((item) => item.kolId === kolId)
        .sort((left, right) => (right.scheduledFor ?? '').localeCompare(left.scheduledFor ?? '')),
      content: content.filter((item) => item.kolId === kolId),
      mentions: mentions
        .filter((item) => item.kolId === kolId)
        .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)),
    }),
    [engagements, content, mentions, kolId],
  );

  if (!profile) {
    return (
      <section className="flex flex-col gap-body">
        <PageHeader title={loading ? 'Loading KOL…' : 'KOL not found'} backTo={BACK} />
        <LoadNotice canManage />
        {loading ? null : (
          <Card bordered>
            <EmptyState
              message="This S092 profile is not available"
              hint={`Nothing matches the reference ${kolId ?? ''}. It may have been removed, or the link may be out of date.`}
              icon={<SearchX size={22} aria-hidden />}
              action={
                <Button onClick={() => void navigate(ROUTES.KOLS)}>Browse the register</Button>
              }
            />
          </Card>
        )}
      </section>
    );
  }

  const stakeholderName =
    stakeholders.find((item) => item.id === profile.stakeholderId)?.name ?? null;
  const impact = kolImpact(profile.id, scoped);
  const archived = engagementCreationError(profile);
  const subtitle = [profile.position, profile.organisation].filter(Boolean).join(', ');

  return (
    <section className="flex flex-col gap-body">
      <div className="space-y-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-foreground-muted"
        >
          <Link to={ROUTES.KOLS} className="hover:text-primary hover:underline">
            Key opinion leaders
          </Link>
          <ChevronRight size={15} aria-hidden />
          <span className="font-medium text-foreground">{displayName(profile)}</span>
        </nav>

        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {displayName(profile)}
            </h1>
            <p className="mt-1 text-base text-foreground-muted">
              {subtitle || 'No organisation recorded'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={!canManage}
              title={canManage ? undefined : MANAGE_DENIED_REASON}
              onClick={() => setEditOpen(true)}
            >
              <Pencil size={16} aria-hidden /> Edit profile
            </Button>
            <Button
              disabled={!canManage || Boolean(archived)}
              title={!canManage ? MANAGE_DENIED_REASON : (archived ?? undefined)}
              onClick={() => setPlanOpen(true)}
            >
              <CalendarPlus size={16} aria-hidden /> Invite / plan engagement
            </Button>
          </div>
        </div>

        <dl className="grid overflow-hidden rounded-2xl border border-border bg-surface shadow-sm sm:grid-cols-2 xl:grid-cols-5">
          <div className="border-b border-border-subtle px-6 py-5 sm:border-r xl:border-b-0">
            <dt className="text-sm text-foreground-muted">Status</dt>
            <dd className="mt-2">
              <KolStatusBadge status={profile.status} />
            </dd>
          </div>
          <div className="border-b border-border-subtle px-6 py-5 xl:border-b-0 xl:border-r">
            <dt className="text-sm text-foreground-muted">Category</dt>
            <dd className="mt-2">
              <KolCategoryBadge category={profile.category} />
            </dd>
          </div>
          <div className="border-b border-border-subtle px-6 py-5 sm:border-r xl:border-b-0">
            <dt className="text-sm text-foreground-muted">Influence</dt>
            <dd className="mt-2">
              <InfluenceBadge level={profile.influenceLevel} />
            </dd>
          </div>
          <div className="border-b border-border-subtle px-6 py-5 xl:border-b-0 xl:border-r">
            <dt className="text-sm text-foreground-muted">Relationship owner</dt>
            <dd className="mt-2 font-semibold text-foreground">
              {profile.relationshipOwner || 'Not assigned'}
            </dd>
          </div>
          <div className="px-6 py-5">
            <dt className="text-sm text-foreground-muted">Risk level</dt>
            <dd className="mt-2">
              <RiskBadge level={profile.riskLevel} />
            </dd>
          </div>
        </dl>
      </div>

      <LoadNotice canManage={canManage} />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as KolProfileTab)}
        variant="pill"
      >
        <TabsList className="rounded-xl bg-surface-subtle p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagements">Engagements ({scoped.engagements.length})</TabsTrigger>
          <TabsTrigger value="content">Content ({scoped.content.length})</TabsTrigger>
          <TabsTrigger value="media">Media reach ({scoped.mentions.length})</TabsTrigger>
          <TabsTrigger value="risk">Risk &amp; notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-6">
          <OverviewTab
            profile={profile}
            stakeholderName={stakeholderName}
            impact={impact}
            canManage={canManage}
            onEdit={() => setEditOpen(true)}
          />
        </TabsContent>
        <TabsContent value="engagements" className="pt-6">
          <EngagementsTab
            profile={profile}
            engagements={scoped.engagements}
            canManage={canManage}
            actor={actor}
          />
        </TabsContent>
        <TabsContent value="content" className="pt-6">
          <ContentTab kolId={profile.id} content={scoped.content} canManage={canManage} />
        </TabsContent>
        <TabsContent value="media" className="pt-6">
          <MediaTab
            kolId={profile.id}
            mentions={scoped.mentions}
            content={scoped.content}
            canManage={canManage}
          />
        </TabsContent>
        <TabsContent value="risk" className="pt-6">
          <RiskTab
            profile={profile}
            engagements={scoped.engagements}
            mentions={scoped.mentions}
            canManage={canManage}
            onEdit={() => setEditOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {editOpen ? (
        <EditKolModal key={profile.updatedAt} profile={profile} open onOpenChange={setEditOpen} />
      ) : null}
      {planOpen ? (
        <EngagementFormModal
          kolId={profile.id}
          defaultOwner={actor}
          open
          onOpenChange={setPlanOpen}
        />
      ) : null}
    </section>
  );
}
