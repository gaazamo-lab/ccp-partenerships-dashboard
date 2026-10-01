import { useNavigate } from 'react-router';

import { Button } from '@rfdtech/components';
import { ExternalLink, GraduationCap, Link2, Pencil } from 'lucide-react';

import type { KolProfile } from '@partner-crm/types';

import { stakeholderProfileRoute } from '@/constants/routes';
import {
  AvailabilityBadge,
  InfluenceBadge,
  KolStatusBadge,
  TagList,
} from '@/features/kol/components/KolBadges';
import { CATEGORY_LABELS, type KolImpact } from '@/features/kol/domain';
import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import { DetailGrid, DetailItem, SectionCard, formatCount, formatDate } from '@/features/shared';

interface OverviewTabProps {
  profile: KolProfile;
  stakeholderName: string | null;
  impact: KolImpact;
  canManage: boolean;
  onEdit: () => void;
}

export function OverviewTab({
  profile,
  stakeholderName,
  impact,
  canManage,
  onEdit,
}: OverviewTabProps) {
  const navigate = useNavigate();

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
      <SectionCard
        title="Profile"
        className="rounded-2xl border border-border-subtle shadow-sm"
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={!canManage}
            title={canManage ? undefined : MANAGE_DENIED_REASON}
            onClick={onEdit}
          >
            <Pencil size={14} aria-hidden /> Edit
          </Button>
        }
      >
        <div className="space-y-4">
          <DetailGrid columns={2}>
            <DetailItem label="Category" value={CATEGORY_LABELS[profile.category]} />
            <DetailItem label="Status" value={<KolStatusBadge status={profile.status} />} />
            <DetailItem label="Organisation" value={profile.organisation || 'Not recorded'} />
            <DetailItem label="Position" value={profile.position || 'Not recorded'} />
            <DetailItem
              label="Influence level"
              value={<InfluenceBadge level={profile.influenceLevel} />}
            />
            <DetailItem
              label="Availability"
              value={<AvailabilityBadge availability={profile.availability} />}
            />
            <DetailItem label="Relationship owner" value={profile.relationshipOwner} />
            <DetailItem
              label="Contact"
              value={profile.email || 'No email'}
              hint={profile.phone || undefined}
            />
          </DetailGrid>

          <div className="rounded-lg border border-border px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
              Biography
            </p>
            <p className="mt-1 text-sm leading-6 text-foreground">
              {profile.bio || 'No biography yet. Add one for event programmes and introductions.'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
                Expertise
              </p>
              <TagList tags={profile.expertise} empty="No expertise tags yet" />
            </div>
            <div className="rounded-lg border border-border px-3 py-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
                Influence areas
              </p>
              <TagList tags={profile.influenceAreas} empty="No influence areas yet" />
            </div>
          </div>

          <p className="text-xs text-foreground-muted">
            Created {formatDate(profile.createdAt)} · Last updated {formatDate(profile.updatedAt)}
          </p>
        </div>
      </SectionCard>

      <div className="flex flex-col gap-6">
        <SectionCard
          title="Authoritative links" /* description="Where this person’s master data lives" */
          className="rounded-2xl border border-border-subtle shadow-sm"
        >
          <div className="space-y-3">
            <button
              type="button"
              disabled={!profile.stakeholderId}
              onClick={() =>
                profile.stakeholderId &&
                void navigate(stakeholderProfileRoute(profile.stakeholderId))
              }
              className="flex w-full items-center gap-3 rounded-xl border border-border-subtle p-3 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Link2 size={18} className="shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-foreground-muted">S081 stakeholder</span>
                <span className="block truncate text-sm font-semibold text-foreground">
                  {profile.stakeholderId
                    ? (stakeholderName ?? profile.stakeholderId)
                    : 'Not linked'}
                </span>
              </span>
              {profile.stakeholderId ? <ExternalLink size={15} aria-hidden /> : null}
            </button>
            <div className="flex items-center gap-3 rounded-xl border border-border-subtle p-3">
              <GraduationCap size={18} className="shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-foreground-muted">S034 alumni record</span>
                <span className="block truncate font-mono text-sm font-semibold text-foreground">
                  {profile.alumniRef ?? 'Not an alumnus on record'}
                </span>
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Impact at a glance" /* description="Score out of 100" */
          className="rounded-2xl border border-border-subtle shadow-sm"
        >
          <DetailGrid columns={2}>
            <DetailItem label="Impact score" value={impact.score} />
            <DetailItem
              label="Media reach"
              value={formatCount(impact.reach)}
              hint={`${impact.mentionCount} mentions`}
            />
            <DetailItem label="Engagements completed" value={impact.completed} />
            <DetailItem label="Content published" value={impact.published} />
            <DetailItem
              label="Mean contribution"
              value={impact.meanScore === null ? 'Not scored' : `${impact.meanScore} / 5`}
            />
            <DetailItem label="Negative mentions" value={impact.negativeMentions} />
          </DetailGrid>
        </SectionCard>
      </div>
    </div>
  );
}
