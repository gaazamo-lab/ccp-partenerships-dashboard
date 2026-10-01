import { Button, Notice } from '@rfdtech/components';
import { NotebookPen, Pencil, ShieldAlert } from 'lucide-react';

import type { KolEngagement, KolMediaMention, KolProfile } from '@partner-crm/types';

import {
  AvailabilityBadge,
  EngagementStageBadge,
  KolStatusBadge,
  RiskBadge,
  SentimentBadge,
} from '@/features/kol/components/KolBadges';
import { riskNotesRequired } from '@/features/kol/domain';
import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import {
  DetailGrid,
  DetailItem,
  EmptyState,
  SectionCard,
  formatCount,
  formatDate,
} from '@/features/shared';

interface RiskTabProps {
  profile: KolProfile;
  engagements: KolEngagement[];
  mentions: KolMediaMention[];
  canManage: boolean;
  onEdit: () => void;
}

export function RiskTab({ profile, engagements, mentions, canManage, onEdit }: RiskTabProps) {
  const negative = mentions.filter((item) => item.sentiment === 'NEGATIVE');
  const closedWithout = engagements.filter(
    (item) => item.stage === 'DECLINED' || item.stage === 'CANCELLED',
  );
  const notes = engagements.filter((item) => item.notes.trim());
  const elevated = riskNotesRequired(profile.riskLevel);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard
        title="Risk assessment"
        // description="Reputational, protocol and conflict-of-interest considerations."
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={!canManage}
            title={canManage ? undefined : MANAGE_DENIED_REASON}
            onClick={onEdit}
          >
            <Pencil size={14} aria-hidden /> Update risk
          </Button>
        }
      >
        <div className="space-y-4">
          <DetailGrid columns={3}>
            <DetailItem label="Risk level" value={<RiskBadge level={profile.riskLevel} />} />
            <DetailItem label="Status" value={<KolStatusBadge status={profile.status} />} />
            <DetailItem
              label="Availability"
              value={<AvailabilityBadge availability={profile.availability} />}
            />
          </DetailGrid>
          {profile.riskNotes ? (
            <Notice
              variant={profile.riskLevel === 'HIGH' ? 'error' : elevated ? 'warning' : 'info'}
              title="Risk notes"
              leftBorder
            >
              {profile.riskNotes}
            </Notice>
          ) : (
            <p className="text-sm text-foreground-muted">
              No risk notes recorded. Add notes if colleagues need to know anything before engaging.
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Risk signals" /* description="Negative coverage and engagements that did not go ahead." */
      >
        {negative.length === 0 && closedWithout.length === 0 ? (
          <EmptyState
            message="No risk signals"
            hint="Negative mentions and declined or cancelled engagements will appear here."
            icon={<ShieldAlert size={22} aria-hidden />}
          />
        ) : (
          <ul className="space-y-3">
            {negative.map((item) => (
              <li key={item.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <SentimentBadge sentiment={item.sentiment} />
                  <span className="text-sm font-medium text-foreground">{item.headline}</span>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">
                  {item.outlet} · {formatDate(item.publishedAt)} · reach {formatCount(item.reach)}
                </p>
              </li>
            ))}
            {closedWithout.map((item) => (
              <li key={item.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <EngagementStageBadge stage={item.stage} />
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">
                  {formatDate(item.scheduledFor)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Engagement notes"
        // description="Briefings, clearances and stage-change notes across engagements."
        className="xl:col-span-2"
      >
        {notes.length === 0 ? (
          <EmptyState
            message="No notes yet"
            hint="Notes added when planning or moving an engagement are collected here."
            icon={<NotebookPen size={22} aria-hidden />}
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {notes.map((item) => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground-muted">
                  {item.notes}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
