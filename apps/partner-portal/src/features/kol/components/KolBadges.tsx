import { Badge, type BadgeVariant } from '@rfdtech/components';

import type {
  KolAvailability,
  KolCategory,
  KolContentStage,
  KolEngagementStage,
  KolEngagementType,
  KolInfluenceLevel,
  KolMediaMention,
  KolMentionSentiment,
  KolRiskLevel,
  KolStatus,
} from '@partner-crm/types';

import { CATEGORY_LABELS, ENGAGEMENT_TYPE_LABELS } from '@/features/kol/domain';
import { titleCase } from '@/features/shared';

const statusVariants: Record<KolStatus, BadgeVariant> = {
  PROSPECT: 'primary',
  ACTIVE: 'success',
  DORMANT: 'warning',
  ARCHIVED: 'outline',
};

const influenceVariants: Record<KolInfluenceLevel, BadgeVariant> = {
  EMERGING: 'default',
  ESTABLISHED: 'outline',
  NATIONAL: 'primary',
  INTERNATIONAL: 'success',
};

const availabilityVariants: Record<KolAvailability, BadgeVariant> = {
  AVAILABLE: 'success',
  LIMITED: 'warning',
  UNAVAILABLE: 'default',
};

const riskVariants: Record<KolRiskLevel, BadgeVariant> = {
  NONE: 'outline',
  LOW: 'default',
  MEDIUM: 'warning',
  HIGH: 'error',
};

const riskLabels: Record<KolRiskLevel, string> = {
  NONE: 'No known risk',
  LOW: 'Low risk',
  MEDIUM: 'Medium risk',
  HIGH: 'High risk',
};

const engagementVariants: Record<KolEngagementStage, BadgeVariant> = {
  PLANNED: 'default',
  INVITED: 'warning',
  CONFIRMED: 'primary',
  COMPLETED: 'success',
  DECLINED: 'outline',
  CANCELLED: 'outline',
};

const contentVariants: Record<KolContentStage, BadgeVariant> = {
  COMMISSIONED: 'outline',
  DRAFT_SUBMITTED: 'default',
  IN_REVIEW: 'warning',
  CHANGES_REQUESTED: 'error',
  APPROVED: 'primary',
  PUBLISHED: 'success',
  WITHDRAWN: 'outline',
};

const sentimentVariants: Record<KolMentionSentiment, BadgeVariant> = {
  POSITIVE: 'success',
  NEUTRAL: 'default',
  NEGATIVE: 'error',
};

const sourceVariants: Record<KolMediaMention['source'], BadgeVariant> = {
  S085: 'primary',
  MANUAL: 'outline',
};

export function KolStatusBadge({ status }: { status: KolStatus }) {
  return <Badge variant={statusVariants[status]}>{titleCase(status)}</Badge>;
}

export function KolCategoryBadge({ category }: { category: KolCategory }) {
  return <Badge variant="outline">{CATEGORY_LABELS[category]}</Badge>;
}

export function InfluenceBadge({ level }: { level: KolInfluenceLevel }) {
  return <Badge variant={influenceVariants[level]}>{titleCase(level)}</Badge>;
}

export function AvailabilityBadge({ availability }: { availability: KolAvailability }) {
  return <Badge variant={availabilityVariants[availability]}>{titleCase(availability)}</Badge>;
}

export function RiskBadge({ level }: { level: KolRiskLevel }) {
  return <Badge variant={riskVariants[level]}>{riskLabels[level]}</Badge>;
}

export function EngagementStageBadge({ stage }: { stage: KolEngagementStage }) {
  return <Badge variant={engagementVariants[stage]}>{titleCase(stage)}</Badge>;
}

export function EngagementTypeBadge({ type }: { type: KolEngagementType }) {
  return (
    <Badge variant="outline" size="sm">
      {ENGAGEMENT_TYPE_LABELS[type]}
    </Badge>
  );
}

export function ContentStageBadge({ stage }: { stage: KolContentStage }) {
  return <Badge variant={contentVariants[stage]}>{titleCase(stage)}</Badge>;
}

export function SentimentBadge({ sentiment }: { sentiment: KolMentionSentiment }) {
  return <Badge variant={sentimentVariants[sentiment]}>{titleCase(sentiment)}</Badge>;
}

export function MentionSourceBadge({ source }: { source: KolMediaMention['source'] }) {
  return (
    <Badge variant={sourceVariants[source]} size="sm">
      {source === 'S085' ? 'S085 press monitoring' : 'Manual'}
    </Badge>
  );
}

/** Small tag badges, truncated to `max` with a "+N" overflow chip. */
export function TagList({ tags, max, empty = 'None' }: { tags: string[]; max?: number; empty?: string }) {
  if (tags.length === 0) return <span className="text-sm text-foreground-muted">{empty}</span>;
  const shown = max ? tags.slice(0, max) : tags;
  const hidden = tags.length - shown.length;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((tag) => (
        <Badge key={tag} variant="default" size="sm">
          {tag}
        </Badge>
      ))}
      {hidden > 0 ? (
        <Badge variant="outline" size="sm" title={tags.slice(shown.length).join(', ')}>
          +{hidden}
        </Badge>
      ) : null}
    </span>
  );
}
