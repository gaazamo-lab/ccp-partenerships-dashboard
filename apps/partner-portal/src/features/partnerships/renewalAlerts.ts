import type {
  PartnershipRenewalAlert,
  RenewalAlertMilestone,
  RenewalAlertStatus,
} from '@partner-crm/types';

export const renewalMilestones: RenewalAlertMilestone[] = [180, 90, 30];

export function subtractDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export function effectiveRenewalAlertStatus(
  alert: PartnershipRenewalAlert,
  today = new Date().toISOString().slice(0, 10),
): RenewalAlertStatus {
  return alert.status === 'SCHEDULED' && alert.scheduledFor <= today ? 'DUE' : alert.status;
}

export function createRenewalAlerts(
  agreementId: string,
  expiryDate: string,
  recipients: string[],
  today = new Date().toISOString().slice(0, 10),
): PartnershipRenewalAlert[] {
  return renewalMilestones.map((milestoneDays) => {
    const scheduledFor = subtractDays(expiryDate, milestoneDays);
    const status: RenewalAlertStatus = scheduledFor <= today ? 'DUE' : 'SCHEDULED';
    return {
      id: `renewal-alert-${crypto.randomUUID()}`,
      agreementId,
      milestoneDays,
      scheduledFor,
      recipients: [...recipients],
      status,
      communicationRef: null,
      sentAt: null,
      acknowledgedAt: null,
      acknowledgedBy: null,
    };
  });
}
