import type { ObligationStatus, PartnershipObligation } from '@partner-crm/types';

export function effectiveObligationStatus(
  obligation: Pick<PartnershipObligation, 'dueDate' | 'status'>,
  today = new Date().toISOString().slice(0, 10),
): ObligationStatus {
  if (['COMPLETED', 'WAIVED'].includes(obligation.status)) return obligation.status;
  return obligation.dueDate < today ? 'OVERDUE' : obligation.status;
}

export function obligationReminderSummary(obligation: PartnershipObligation) {
  const status = effectiveObligationStatus(obligation);
  if (status === 'COMPLETED' || status === 'WAIVED') return 'Notifications closed';
  if (status === 'OVERDUE') {
    return obligation.escalationOwner
      ? `Escalation due to ${obligation.escalationOwner}`
      : 'Overdue — escalation owner not set';
  }
  if (obligation.reminderLeadDays === null) return 'Reminders off';
  const millisecondsPerDay = 86_400_000;
  const due = new Date(`${obligation.dueDate}T00:00:00Z`).getTime();
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`).getTime();
  const daysUntilDue = Math.ceil((due - today) / millisecondsPerDay);
  return daysUntilDue <= obligation.reminderLeadDays
    ? 'Reminder due through S074'
    : `Reminder scheduled ${obligation.reminderLeadDays} days before due date`;
}
