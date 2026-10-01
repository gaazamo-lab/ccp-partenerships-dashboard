import type {
  Consultation,
  ConsultationStatus,
  ConsultationStatusInput,
} from '@partner-crm/types';

import { validateConsultationForm, toFormValues } from './domain';
import type { ConsultationPermission } from './permissions';

export type LifecycleActionId =
  | 'submit'
  | 'approve'
  | 'return'
  | 'open'
  | 'close'
  | 'extend'
  | 'reopen'
  | 'archive';

export interface LifecycleAction {
  id: LifecycleActionId;
  label: string;
  description: string;
  from: ConsultationStatus[];
  to: ConsultationStatus;
  permission: ConsultationPermission;
  commentRequired: boolean;
  /** Asks for a new close date (extend, reopen). */
  needsCloseDate: boolean;
  destructive?: boolean;
}

/**
 * The publication lifecycle. Managers draft, submit, open and close; AQAI/CDT
 * reviewers (role `Registrar`) approve or return. Approval moves a consultation
 * straight to SCHEDULED and records the approver; it opens on its start date or
 * when a manager opens it early.
 */
export const LIFECYCLE_ACTIONS: LifecycleAction[] = [
  {
    id: 'submit',
    label: 'Submit for review',
    description: 'Send the draft to AQAI/CDT reviewers for approval.',
    from: ['DRAFT'],
    to: 'REVIEW',
    permission: 'manage',
    commentRequired: false,
    needsCloseDate: false,
  },
  {
    id: 'approve',
    label: 'Approve and schedule',
    description: 'Approve the questions and audience. The consultation opens on its start date.',
    from: ['REVIEW'],
    to: 'SCHEDULED',
    permission: 'approve',
    commentRequired: false,
    needsCloseDate: false,
  },
  {
    id: 'return',
    label: 'Return to draft',
    description: 'Send the consultation back to its author with the changes needed.',
    from: ['REVIEW', 'SCHEDULED'],
    to: 'DRAFT',
    permission: 'approve',
    commentRequired: true,
    needsCloseDate: false,
  },
  {
    id: 'open',
    label: 'Open now',
    description: 'Start accepting responses immediately.',
    from: ['SCHEDULED'],
    to: 'OPEN',
    permission: 'manage',
    commentRequired: false,
    needsCloseDate: false,
  },
  {
    id: 'extend',
    label: 'Extend close date',
    description: 'Keep the consultation open for longer.',
    from: ['OPEN'],
    to: 'OPEN',
    permission: 'manage',
    commentRequired: true,
    needsCloseDate: true,
  },
  {
    id: 'close',
    label: 'Close consultation',
    description: 'Stop accepting responses now. You can then publish what you heard.',
    from: ['OPEN'],
    to: 'CLOSED',
    permission: 'manage',
    commentRequired: false,
    needsCloseDate: false,
    destructive: true,
  },
  {
    id: 'reopen',
    label: 'Reopen',
    description: 'Accept responses again until a new close date.',
    from: ['CLOSED'],
    to: 'OPEN',
    permission: 'manage',
    commentRequired: true,
    needsCloseDate: true,
  },
  {
    id: 'archive',
    label: 'Archive',
    description: 'Remove the consultation from the public site. Results stay available to staff.',
    from: ['CLOSED'],
    to: 'ARCHIVED',
    permission: 'manage',
    commentRequired: false,
    needsCloseDate: false,
    destructive: true,
  },
];

export function actionsFor(status: ConsultationStatus): LifecycleAction[] {
  return LIFECYCLE_ACTIONS.filter((action) => action.from.includes(status));
}

export function lifecycleAction(id: LifecycleActionId): LifecycleAction {
  const action = LIFECYCLE_ACTIONS.find((item) => item.id === id);
  if (!action) throw new Error(`Unknown lifecycle action ${id}.`);
  return action;
}

/** Reasons an action cannot run yet. An empty list means it may proceed. */
export function actionBlockers(
  consultation: Consultation,
  action: LifecycleAction,
  now = new Date(),
): string[] {
  const blockers: string[] = [];
  if (!action.from.includes(consultation.status)) {
    blockers.push(`This action is not available while the consultation is ${consultation.status.toLowerCase()}.`);
    return blockers;
  }
  if (action.id === 'submit' || action.id === 'approve') {
    const errors = validateConsultationForm(toFormValues(consultation));
    if (errors.questionsForm) blockers.push(errors.questionsForm);
    if (errors.closesAt) blockers.push(errors.closesAt);
    if (errors.audienceSegmentIds) blockers.push(errors.audienceSegmentIds);
    if (errors.title || errors.summary || errors.description || errors.category) {
      blockers.push('Complete the title, category, summary and introduction.');
    }
  }
  if ((action.id === 'approve' || action.id === 'open') && new Date(consultation.closesAt) <= now) {
    blockers.push('The close date has passed. Edit the dates before publishing.');
  }
  return blockers;
}

/** Validates the comment and close date the modal collected. */
export function transitionInputErrors(
  consultation: Consultation,
  action: LifecycleAction,
  comment: string,
  closesAt: string,
  now = new Date(),
): Partial<Record<'comment' | 'closesAt', string>> {
  const errors: Partial<Record<'comment' | 'closesAt', string>> = {};
  if (action.commentRequired && !comment.trim()) errors.comment = 'Add a comment explaining this decision.';
  if (action.needsCloseDate) {
    if (!closesAt) errors.closesAt = 'Choose the new close date.';
    else {
      const next = new Date(`${closesAt}T23:59:00`);
      if (next <= now) errors.closesAt = 'The new close date must be in the future.';
      else if (action.id === 'extend' && next <= new Date(consultation.closesAt)) {
        errors.closesAt = 'Choose a date after the current close date.';
      }
    }
  }
  return errors;
}

export function transitionInput(
  action: LifecycleAction,
  comment: string,
  closesAt: string,
): ConsultationStatusInput {
  return {
    status: action.to,
    comment: comment.trim() || undefined,
    closesAt: action.needsCloseDate && closesAt ? new Date(`${closesAt}T23:59:00`).toISOString() : undefined,
  };
}

/** The local (mock / optimistic) effect of a status change. */
export function applyStatusChange(
  consultation: Consultation,
  input: ConsultationStatusInput,
  actor: string,
  now = new Date(),
): Consultation {
  const next: Consultation = {
    ...consultation,
    status: input.status,
    closesAt: input.closesAt ?? consultation.closesAt,
    updatedAt: now.toISOString(),
  };
  if (consultation.status === 'REVIEW' && input.status === 'SCHEDULED') next.approvedBy = actor;
  if (input.status === 'DRAFT') next.approvedBy = null;
  if (input.status === 'CLOSED' && new Date(consultation.closesAt) > now) next.closesAt = now.toISOString();
  return next;
}
