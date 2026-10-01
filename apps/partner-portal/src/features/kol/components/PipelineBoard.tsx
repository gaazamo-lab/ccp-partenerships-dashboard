import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Badge, Button } from '@rfdtech/components';
import { CalendarDays, UserRound } from 'lucide-react';

import type { KolContent, KolEngagement, KolProfile } from '@partner-crm/types';

import { kolProfileRoute } from '@/constants/routes';
import { ContentStageBadge, EngagementTypeBadge } from '@/features/kol/components/KolBadges';
import { CONTENT_TYPE_LABELS, contentActionLabel } from '@/features/kol/domain';
import { displayName } from '@/features/kol/kolForm';
import {
  type ContentDialog,
  type EngagementDialog,
  contentMenuItems,
  engagementActionLabel,
  engagementMenuItems,
  primaryContentAction,
  primaryEngagementAction,
} from '@/features/kol/kolActions';
import { MANAGE_DENIED_REASON } from '@/features/kol/permissions';
import { ActionMenu, formatDate } from '@/features/shared';

/** One kanban column: a heading with a count, and its cards. */
export function BoardColumn({
  title,
  count,
  children,
  footer,
}: {
  title: ReactNode;
  count: number;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border bg-surface-subtle p-3">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="outline" size="sm">
          {count}
        </Badge>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
      {footer ? <div className="mt-3 px-1 text-xs text-foreground-muted">{footer}</div> : null}
    </div>
  );
}

export function EmptyColumn({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-foreground-muted">
      {children}
    </p>
  );
}

function KolLink({ profile, fallback }: { profile: KolProfile | undefined; fallback: string }) {
  return profile ? (
    <Link to={kolProfileRoute(profile.id)} className="text-sm font-semibold text-foreground hover:text-primary hover:underline">
      {displayName(profile)}
    </Link>
  ) : (
    <span className="text-sm font-semibold text-foreground-muted">{fallback}</span>
  );
}

export function EngagementCard({
  engagement,
  profile,
  canManage,
  onAction,
}: {
  engagement: KolEngagement;
  profile: KolProfile | undefined;
  canManage: boolean;
  onAction: (dialog: NonNullable<EngagementDialog>) => void;
}) {
  const primary = primaryEngagementAction(engagement);
  return (
    <article className="rounded-lg border border-border bg-surface p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <KolLink profile={profile} fallback="Unknown KOL" />
          <p className="text-sm text-foreground">{engagement.title}</p>
        </div>
        <ActionMenu
          label={`Actions for ${engagement.title}`}
          items={engagementMenuItems(engagement, canManage, onAction)}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <EngagementTypeBadge type={engagement.type} />
        {engagement.participation ? (
          <Badge variant="success" size="sm">
            Scored {engagement.participation.contributionScore}/5
          </Badge>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground-muted">
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={12} aria-hidden /> {formatDate(engagement.scheduledFor)}
        </span>
        <span className="inline-flex items-center gap-1">
          <UserRound size={12} aria-hidden /> {engagement.owner}
        </span>
      </div>
      {primary ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          disabled={!canManage}
          title={canManage ? undefined : MANAGE_DENIED_REASON}
          onClick={() => onAction({ engagement, action: primary })}
        >
          {engagementActionLabel(primary, engagement)}
        </Button>
      ) : null}
    </article>
  );
}

export function ContentCard({
  content,
  profile,
  canManage,
  onAction,
}: {
  content: KolContent;
  profile: KolProfile | undefined;
  canManage: boolean;
  onAction: (dialog: NonNullable<ContentDialog>) => void;
}) {
  const primary = primaryContentAction(content);
  return (
    <article className="rounded-lg border border-border bg-surface p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <KolLink profile={profile} fallback="Unknown KOL" />
          <p className="text-sm text-foreground">{content.title}</p>
        </div>
        <ActionMenu
          label={`Actions for ${content.title}`}
          items={contentMenuItems(content, canManage, onAction)}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline" size="sm">
          {CONTENT_TYPE_LABELS[content.contentType]}
        </Badge>
        {content.stage === 'CHANGES_REQUESTED' ? <ContentStageBadge stage={content.stage} /> : null}
      </div>
      <p className="mt-2 text-xs text-foreground-muted">
        {content.publishedAt
          ? `Published ${formatDate(content.publishedAt)}`
          : `Due ${formatDate(content.dueDate)}`}
      </p>
      {primary ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          disabled={!canManage}
          title={canManage ? undefined : MANAGE_DENIED_REASON}
          onClick={() => onAction({ content, target: primary })}
        >
          {contentActionLabel(content.stage, primary)}
        </Button>
      ) : null}
    </article>
  );
}
