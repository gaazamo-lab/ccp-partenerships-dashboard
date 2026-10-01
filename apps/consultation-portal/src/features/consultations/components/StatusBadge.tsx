import { Badge, type BadgeVariant } from '@rfdtech/components';

import type { ConsultationStatus } from '@partner-crm/types';

import { STATUS_LABELS } from '../constants';

const variants: Record<ConsultationStatus, BadgeVariant> = {
  DRAFT: 'default',
  REVIEW: 'warning',
  SCHEDULED: 'primary',
  OPEN: 'success',
  CLOSED: 'outline',
  ARCHIVED: 'outline',
};

export function StatusBadge({ status }: { status: ConsultationStatus }) {
  return <Badge variant={variants[status]}>{STATUS_LABELS[status]}</Badge>;
}
