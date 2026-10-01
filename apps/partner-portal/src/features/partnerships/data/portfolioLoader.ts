import type { PartnershipsRepository } from '@partner-crm/api-client';
import type {
  ObligationProgressNote,
  PartnershipAgreement,
  PartnershipHistoryEntry,
  PartnershipObligation,
  PartnershipRenewal,
  PartnershipRenewalAlert,
  PartnershipReview,
} from '@partner-crm/types';

import { effectiveObligationStatus } from '../obligations';

export interface AgreementChildren {
  obligations: PartnershipObligation[];
  reviews: PartnershipReview[];
  renewals: PartnershipRenewal[];
  renewalAlerts: PartnershipRenewalAlert[];
  history: PartnershipHistoryEntry[];
}

export interface PartnershipsSnapshot extends AgreementChildren {
  agreements: PartnershipAgreement[];
  obligationProgress: ObligationProgressNote[];
}

const PAGE_SIZE = 100;
const MAX_PAGES = 200;
/** Agreements whose children load at once; each costs five requests. */
const CHILD_CONCURRENCY = 6;

/** Runs `task` over `items` with at most `limit` in flight, preserving order. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Every agreement, following the paginated list until the server says it is done. */
export async function listAllAgreements(repository: PartnershipsRepository) {
  const agreements: PartnershipAgreement[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await repository.list({ page, pageSize: PAGE_SIZE });
    agreements.push(...response.data);
    const meta = response.meta;
    if (
      !meta ||
      response.data.length === 0 ||
      agreements.length >= meta.count ||
      meta.next === null
    ) {
      break;
    }
  }
  return agreements;
}

export function withEffectiveStatus(obligation: PartnershipObligation): PartnershipObligation {
  return { ...obligation, status: effectiveObligationStatus(obligation) };
}

export async function loadAgreementChildren(
  repository: PartnershipsRepository,
  agreementId: string,
): Promise<AgreementChildren> {
  const [obligations, reviews, renewals, renewalAlerts, history] = await Promise.all([
    repository.listObligations(agreementId),
    repository.listReviews(agreementId),
    repository.listRenewals(agreementId),
    repository.listRenewalAlerts(agreementId),
    repository.listHistory(agreementId),
  ]);
  return {
    obligations: obligations.data.map(withEffectiveStatus),
    reviews: reviews.data,
    renewals: renewals.data,
    renewalAlerts: renewalAlerts.data,
    history: history.data,
  };
}

/** Agreements plus every agreement's obligations, reviews, renewals, alerts and history. */
export async function loadPortfolio(
  repository: PartnershipsRepository,
): Promise<PartnershipsSnapshot> {
  const agreements = await listAllAgreements(repository);
  const children = await mapWithConcurrency(agreements, CHILD_CONCURRENCY, (agreement) =>
    loadAgreementChildren(repository, agreement.id),
  );
  return {
    agreements,
    obligations: children.flatMap((item) => item.obligations),
    obligationProgress: [],
    reviews: children.flatMap((item) => item.reviews),
    renewals: children.flatMap((item) => item.renewals),
    renewalAlerts: children.flatMap((item) => item.renewalAlerts),
    history: children
      .flatMap((item) => item.history)
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
  };
}

/** Progress notes for a set of obligations, newest first. */
export async function loadObligationProgress(
  repository: PartnershipsRepository,
  obligationIds: string[],
) {
  const notes = await mapWithConcurrency(
    obligationIds,
    CHILD_CONCURRENCY,
    async (id) => (await repository.listObligationProgress(id)).data,
  );
  return notes.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

/** Swaps `agreementId`'s children in `items` for a fresh server copy. */
export function replaceForAgreement<T extends { agreementId: string }>(
  items: T[],
  agreementId: string,
  fresh: T[],
) {
  return [...fresh, ...items.filter((item) => item.agreementId !== agreementId)];
}

/** Replaces the record whose ID is `matchId` (the optimistic one) with `record`, or prepends it. */
export function replaceRecord<T extends { id: string }>(
  items: T[],
  record: T,
  matchId = record.id,
) {
  return items.some((item) => item.id === matchId)
    ? items.map((item) => (item.id === matchId ? record : item))
    : [record, ...items];
}

export function errorText(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : 'The server could not complete the request.';
}
