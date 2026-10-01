import { Badge, type BadgeVariant } from '@rfdtech/components';

import type {
  ConsentStatus,
  HealthLevel,
  PipelineStage,
  RelationshipStatus,
  ScreeningStatus,
} from '@/features/stakeholders/types';

const relationshipVariants: Record<RelationshipStatus, BadgeVariant> = {
  Active: 'success',
  Inactive: 'default',
  'MOU linked': 'primary',
  'Screening pending': 'warning',
};

const healthVariants: Record<HealthLevel, BadgeVariant> = {
  'At risk': 'error',
  Healthy: 'success',
  Strong: 'primary',
};

const screeningVariants: Record<ScreeningStatus, BadgeVariant> = {
  Cleared: 'success',
  'Not required': 'outline',
  Pending: 'warning',
  'Review required': 'error',
  Rejected: 'error',
};

const pipelineVariants: Record<PipelineStage, BadgeVariant> = {
  Prospect: 'outline',
  Engaged: 'default',
  Negotiation: 'warning',
  MOU: 'primary',
  Dormant: 'default',
};

const consentVariants: Record<ConsentStatus, BadgeVariant> = {
  Consented: 'success',
  Withdrawn: 'error',
  Expired: 'warning',
  'Not recorded': 'warning',
};

export function RelationshipBadge({ status }: { status: RelationshipStatus }) {
  return <Badge variant={relationshipVariants[status]}>{status}</Badge>;
}

export function HealthBadge({ health }: { health: HealthLevel }) {
  return <Badge variant={healthVariants[health]}>{health}</Badge>;
}

export function ScreeningBadge({ status }: { status: ScreeningStatus }) {
  return <Badge variant={screeningVariants[status]}>{status}</Badge>;
}

export function PipelineBadge({ stage }: { stage: PipelineStage }) {
  return <Badge variant={pipelineVariants[stage]}>{stage}</Badge>;
}

export function ConsentBadge({ consent }: { consent: ConsentStatus }) {
  return <Badge variant={consentVariants[consent]}>{consent}</Badge>;
}
