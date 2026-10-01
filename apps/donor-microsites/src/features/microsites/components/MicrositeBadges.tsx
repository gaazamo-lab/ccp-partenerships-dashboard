import { Badge } from '@rfdtech/components';

import type { MicrositeAccess, MicrositeReview, MicrositeStatus } from '@partner-crm/types';

import {
  ACCESS_LABELS,
  ACCESS_VARIANTS,
  DECISION_LABELS,
  DECISION_VARIANTS,
  STATUS_LABELS,
  STATUS_VARIANTS,
} from '@/features/microsites/labels';

export function MicrositeStatusBadge({ status }: { status: MicrositeStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function MicrositeAccessBadge({ access }: { access: MicrositeAccess }) {
  return <Badge variant={ACCESS_VARIANTS[access]}>{ACCESS_LABELS[access]}</Badge>;
}

export function ReviewDecisionBadge({ decision }: { decision: MicrositeReview['decision'] }) {
  return <Badge variant={DECISION_VARIANTS[decision]}>{DECISION_LABELS[decision]}</Badge>;
}
