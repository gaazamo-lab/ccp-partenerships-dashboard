import type {
  PartnershipAgreement,
  PartnershipObligation,
  PartnershipRenewalAlert,
  PartnershipReview,
} from '@partner-crm/types';

import { effectiveObligationStatus } from './obligations';
import { effectiveRenewalAlertStatus } from './renewalAlerts';
import { reviewSchedules, todayIso } from './reviewDue';

export type MilestoneKind = 'EXPIRY' | 'RENEWAL_ALERT' | 'OBLIGATION' | 'REVIEW';

export const MILESTONE_KINDS: MilestoneKind[] = ['EXPIRY', 'RENEWAL_ALERT', 'OBLIGATION', 'REVIEW'];

export const MILESTONE_KIND_LABELS: Record<MilestoneKind, string> = {
  EXPIRY: 'Agreement expiry',
  RENEWAL_ALERT: 'Renewal alert',
  OBLIGATION: 'Obligation due',
  REVIEW: 'Value review due',
};

export interface MilestoneEvent {
  id: string;
  kind: MilestoneKind;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  agreementId: string;
  agreementReference: string;
  agreementTitle: string;
  /** Who is accountable — the obligation owner for obligations, else the agreement owner. */
  owner: string;
  label: string;
  detail: string;
}

export interface MilestoneSources {
  agreements: PartnershipAgreement[];
  obligations: PartnershipObligation[];
  reviews: PartnershipReview[];
  renewalAlerts: PartnershipRenewalAlert[];
}

const kindOrder: Record<MilestoneKind, number> = {
  EXPIRY: 0,
  RENEWAL_ALERT: 1,
  OBLIGATION: 2,
  REVIEW: 3,
};

export function compareMilestones(left: MilestoneEvent, right: MilestoneEvent) {
  return (
    left.date.localeCompare(right.date) ||
    kindOrder[left.kind] - kindOrder[right.kind] ||
    left.agreementReference.localeCompare(right.agreementReference) ||
    left.id.localeCompare(right.id)
  );
}

/**
 * Every dated milestone in the portfolio: expiries, the 180/90/30-day renewal
 * alerts, obligation due dates and next value-review dates. Terminated
 * agreements contribute nothing — their calendar is closed.
 */
export function buildMilestones(
  { agreements, obligations, reviews, renewalAlerts }: MilestoneSources,
  today = todayIso(),
): MilestoneEvent[] {
  const open = agreements.filter((agreement) => agreement.status !== 'TERMINATED');
  const byId = new Map(open.map((agreement) => [agreement.id, agreement]));
  const events: MilestoneEvent[] = [];
  const base = (agreement: PartnershipAgreement) => ({
    agreementId: agreement.id,
    agreementReference: agreement.reference,
    agreementTitle: agreement.title,
  });

  open.forEach((agreement) => {
    if (!agreement.expiryDate) return;
    events.push({
      id: `expiry-${agreement.id}`,
      kind: 'EXPIRY',
      date: agreement.expiryDate.slice(0, 10),
      ...base(agreement),
      owner: agreement.owner,
      label: `${agreement.reference} expires`,
      detail: agreement.title,
    });
  });

  renewalAlerts.forEach((alert) => {
    const agreement = byId.get(alert.agreementId);
    if (!agreement || alert.status === 'CANCELLED') return;
    const status = effectiveRenewalAlertStatus(alert, today);
    events.push({
      id: `alert-${alert.id}`,
      kind: 'RENEWAL_ALERT',
      date: alert.scheduledFor.slice(0, 10),
      ...base(agreement),
      owner: agreement.owner,
      label: `${alert.milestoneDays}-day renewal alert`,
      detail: `${agreement.reference} · ${status.toLowerCase().replaceAll('_', ' ')}`,
    });
  });

  obligations.forEach((obligation) => {
    const agreement = byId.get(obligation.agreementId);
    if (!agreement) return;
    const status = effectiveObligationStatus(obligation, today);
    events.push({
      id: `obligation-${obligation.id}`,
      kind: 'OBLIGATION',
      date: obligation.dueDate.slice(0, 10),
      ...base(agreement),
      owner: obligation.owner,
      label: obligation.title,
      detail: `${agreement.reference} · ${status.toLowerCase().replaceAll('_', ' ')}`,
    });
  });

  reviewSchedules(open, reviews, today).forEach((schedule) => {
    const agreement = byId.get(schedule.agreementId);
    if (!agreement) return;
    events.push({
      id: `review-${agreement.id}`,
      kind: 'REVIEW',
      date: schedule.dueDate,
      ...base(agreement),
      owner: agreement.owner,
      label: schedule.basis === 'FIRST_REVIEW' ? 'First value review due' : 'Value review due',
      detail: agreement.reference,
    });
  });

  return events.sort(compareMilestones);
}

export interface MilestoneFilter {
  kinds?: MilestoneKind[];
  owner?: string | null;
}

export function filterMilestones(events: MilestoneEvent[], { kinds, owner }: MilestoneFilter) {
  return events.filter(
    (event) => (!kinds || kinds.includes(event.kind)) && (!owner || event.owner === owner),
  );
}

/** `2026-09` for September 2026 (month is 0-based, as in `Date`). */
export function monthKey(year: number, month: number) {
  const normalised = new Date(Date.UTC(year, month, 1));
  return normalised.toISOString().slice(0, 7);
}

export function shiftMonth(year: number, month: number, delta: number) {
  const next = new Date(Date.UTC(year, month + delta, 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
}

export function eventsInMonth(events: MilestoneEvent[], year: number, month: number) {
  const key = monthKey(year, month);
  return events.filter((event) => event.date.startsWith(key));
}

export function groupByDate(events: MilestoneEvent[]) {
  const groups = new Map<string, MilestoneEvent[]>();
  [...events].sort(compareMilestones).forEach((event) => {
    const list = groups.get(event.date);
    if (list) list.push(event);
    else groups.set(event.date, [event]);
  });
  return groups;
}

export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
}

/** Monday-first weeks covering the whole month, padded with adjacent-month days. */
export function monthGrid(year: number, month: number): CalendarDay[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - offset));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const grid: CalendarDay[][] = [];
  for (let week = 0; week < weeks; week += 1) {
    const row: CalendarDay[] = [];
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + week * 7 + weekday);
      row.push({
        date: date.toISOString().slice(0, 10),
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === first.getUTCMonth(),
      });
    }
    grid.push(row);
  }
  return grid;
}
