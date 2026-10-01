import type {
  ObligationStatus,
  PartnershipAgreement,
  PartnershipObligation,
} from '@partner-crm/types';

import { effectiveObligationStatus } from './obligations';
import { daysBetween, todayIso } from './reviewDue';

export const DUE_WITHIN_OPTIONS = [7, 30, 90] as const;
export type DueWithin = (typeof DUE_WITHIN_OPTIONS)[number];

export interface ObligationWorkspaceRow {
  obligation: PartnershipObligation;
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: ObligationStatus;
  /** Days until the due date; negative once it has passed. */
  daysToDue: number;
  evidenceCount: number;
  agreementId: string;
  agreementReference: string;
  agreementTitle: string;
  agreementTerminated: boolean;
}

const CLOSED: ObligationStatus[] = ['COMPLETED', 'WAIVED'];

export function isOpenObligation(status: ObligationStatus) {
  return !CLOSED.includes(status);
}

export function obligationWorkspaceRows(
  obligations: PartnershipObligation[],
  agreements: PartnershipAgreement[],
  today = todayIso(),
): ObligationWorkspaceRow[] {
  const byId = new Map(agreements.map((agreement) => [agreement.id, agreement]));
  return obligations
    .map((obligation) => {
      const agreement = byId.get(obligation.agreementId);
      return {
        obligation,
        id: obligation.id,
        title: obligation.title,
        owner: obligation.owner,
        dueDate: obligation.dueDate,
        status: effectiveObligationStatus(obligation, today),
        daysToDue: daysBetween(today, obligation.dueDate),
        evidenceCount: obligation.evidenceReferences.length,
        agreementId: obligation.agreementId,
        agreementReference: agreement?.reference ?? obligation.agreementId,
        agreementTitle: agreement?.title ?? 'Unknown agreement',
        agreementTerminated: agreement?.status === 'TERMINATED',
      };
    })
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
}

/**
 * Open obligations falling due within the window. Overdue items are included —
 * something already late is certainly due within the next week.
 */
export function isDueWithin(
  row: Pick<ObligationWorkspaceRow, 'status' | 'daysToDue'>,
  days: number,
) {
  return isOpenObligation(row.status) && row.daysToDue <= days;
}

export function parseDueWithin(value: string | null): DueWithin | null {
  const parsed = Number(value);
  return (DUE_WITHIN_OPTIONS as readonly number[]).includes(parsed) ? (parsed as DueWithin) : null;
}

export function obligationSummary(rows: ObligationWorkspaceRow[]) {
  return {
    overdue: rows.filter((row) => row.status === 'OVERDUE').length,
    dueIn7: rows.filter((row) => isDueWithin(row, 7)).length,
    dueIn30: rows.filter((row) => isDueWithin(row, 30)).length,
    open: rows.filter((row) => isOpenObligation(row.status)).length,
    missingEvidence: rows.filter((row) => row.status === 'COMPLETED' && row.evidenceCount === 0)
      .length,
  };
}
