import { describe, expect, it } from 'vitest';

import { createRenewalAlerts, effectiveRenewalAlertStatus, subtractDays } from './renewalAlerts';

describe('renewal alerts', () => {
  it('calculates dates safely across month and year boundaries', () => {
    expect(subtractDays('2027-01-15', 30)).toBe('2026-12-16');
    expect(subtractDays('2028-03-01', 1)).toBe('2028-02-29');
  });

  it('creates the 180, 90, and 30-day schedule with copied recipients', () => {
    const recipients = ['partnerships@clet.gov.gh'];
    const alerts = createRenewalAlerts('agreement-1', '2027-01-01', recipients, '2026-01-01');

    expect(alerts.map((item) => [item.milestoneDays, item.scheduledFor, item.status])).toEqual([
      [180, '2026-07-05', 'SCHEDULED'],
      [90, '2026-10-03', 'SCHEDULED'],
      [30, '2026-12-02', 'SCHEDULED'],
    ]);
    recipients.push('registrar@clet.gov.gh');
    expect(alerts[0]?.recipients).toEqual(['partnerships@clet.gov.gh']);
  });

  it('resolves due schedules without changing terminal delivery states', () => {
    const alert = createRenewalAlerts('agreement-1', '2027-01-01', [], '2026-01-01')[0]!;
    expect(effectiveRenewalAlertStatus(alert, '2026-07-05')).toBe('DUE');
    expect(effectiveRenewalAlertStatus({ ...alert, status: 'SENT' }, '2027-01-01')).toBe('SENT');
  });
});
