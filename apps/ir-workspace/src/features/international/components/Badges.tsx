import { Badge, type BadgeVariant } from '@rfdtech/components';

import type {
  IrCorrespondenceStatus,
  IrEngagementStatus,
  IrGiftFlagStatus,
  IrHandoffStatus,
  IrLanguage,
  IrTaskStatus,
} from '@partner-crm/types';

import type { DeadlineState } from '../domain';
import {
  CORRESPONDENCE_STATUS_LABEL,
  DEADLINE_LABEL,
  ENGAGEMENT_STATUS_LABEL,
  FLAG_STATUS_LABEL,
  HANDOFF_STATUS_LABEL,
} from '../labels';

const engagementVariants: Record<IrEngagementStatus, BadgeVariant> = {
  DRAFT: 'default',
  SUBMITTED: 'primary',
  UNDER_REVIEW: 'warning',
  APPROVED: 'success',
  SCHEDULED: 'primary',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  CLOSED: 'outline',
  RETURNED: 'error',
  CANCELLED: 'outline',
};

const correspondenceVariants: Record<IrCorrespondenceStatus, BadgeVariant> = {
  RECEIVED: 'primary',
  DRAFT: 'default',
  IN_REVIEW: 'warning',
  RETURNED: 'error',
  APPROVED: 'success',
  DISPATCHED: 'primary',
  AWAITING_RESPONSE: 'warning',
  RESPONDED: 'success',
  CLOSED: 'outline',
};

const taskVariants: Record<IrTaskStatus, BadgeVariant> = {
  OPEN: 'warning',
  DONE: 'success',
  EXCEPTION: 'outline',
};

const handoffVariants: Record<IrHandoffStatus, BadgeVariant> = {
  REQUESTED: 'default',
  ACKNOWLEDGED: 'primary',
  COMPLETED: 'success',
  FAILED: 'error',
};

const flagVariants: Record<IrGiftFlagStatus, BadgeVariant> = {
  NOT_REQUIRED: 'outline',
  PENDING: 'warning',
  ACKNOWLEDGED: 'success',
  FAILED: 'error',
};

const deadlineVariants: Record<DeadlineState, BadgeVariant> = {
  OVERDUE: 'error',
  DUE_SOON: 'warning',
  ON_TRACK: 'default',
  NONE: 'outline',
};

export function EngagementStatusBadge({ status }: { status: IrEngagementStatus }) {
  return <Badge variant={engagementVariants[status]}>{ENGAGEMENT_STATUS_LABEL[status]}</Badge>;
}

export function CorrespondenceStatusBadge({ status }: { status: IrCorrespondenceStatus }) {
  return <Badge variant={correspondenceVariants[status]}>{CORRESPONDENCE_STATUS_LABEL[status]}</Badge>;
}

export function TaskStatusBadge({ status }: { status: IrTaskStatus }) {
  const label = status === 'OPEN' ? 'Open' : status === 'DONE' ? 'Done' : 'Exception';
  return <Badge variant={taskVariants[status]}>{label}</Badge>;
}

export function HandoffStatusBadge({ status }: { status: IrHandoffStatus }) {
  return <Badge variant={handoffVariants[status]}>{HANDOFF_STATUS_LABEL[status]}</Badge>;
}

export function FlagStatusBadge({ status }: { status: IrGiftFlagStatus }) {
  return <Badge variant={flagVariants[status]}>S011 · {FLAG_STATUS_LABEL[status]}</Badge>;
}

export function DeadlineBadge({ state }: { state: DeadlineState }) {
  if (state === 'NONE' || state === 'ON_TRACK') return null;
  return <Badge variant={deadlineVariants[state]}>{DEADLINE_LABEL[state]}</Badge>;
}

export function LanguageBadge({ language }: { language: IrLanguage }) {
  return (
    <Badge variant="outline" size="sm">
      {language}
    </Badge>
  );
}

export function MandatoryBadge({ mandatory }: { mandatory: boolean }) {
  return mandatory ? (
    <Badge variant="primary" size="sm">
      Mandatory
    </Badge>
  ) : (
    <Badge variant="outline" size="sm">
      Optional
    </Badge>
  );
}
