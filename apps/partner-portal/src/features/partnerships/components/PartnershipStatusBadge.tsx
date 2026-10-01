import { Badge, type BadgeVariant } from '@rfdtech/components';

import type { ObligationStatus, PartnershipStatus } from '@partner-crm/types';

const partnershipVariants: Record<PartnershipStatus, BadgeVariant> = {
  DRAFT: 'default',
  LEGAL_REVIEW: 'warning',
  SIGNATURE_PENDING: 'primary',
  ACTIVE: 'success',
  RENEWAL_DUE: 'warning',
  EXPIRED: 'error',
  TERMINATED: 'outline',
};

const obligationVariants: Record<ObligationStatus, BadgeVariant> = {
  NOT_STARTED: 'default',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  OVERDUE: 'error',
  WAIVED: 'outline',
};

function readable(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

export function PartnershipStatusBadge({ status }: { status: PartnershipStatus }) {
  return <Badge variant={partnershipVariants[status]}>{readable(status)}</Badge>;
}

export function ObligationStatusBadge({ status }: { status: ObligationStatus }) {
  return <Badge variant={obligationVariants[status]}>{readable(status)}</Badge>;
}
