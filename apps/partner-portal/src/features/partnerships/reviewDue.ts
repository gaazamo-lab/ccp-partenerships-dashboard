import type {
  PartnershipAgreement,
  PartnershipReview,
  PartnershipStatus,
} from '@partner-crm/types';

/** Agreements in force are the only ones that owe a value-realisation review. */
export const REVIEWABLE_STATUSES: PartnershipStatus[] = ['ACTIVE', 'RENEWAL_DUE'];

/** Months after activation by which the first review is expected. */
export const FIRST_REVIEW_MONTHS = 12;

export type ReviewDueBasis = 'NEXT_REVIEW_DATE' | 'FIRST_REVIEW';

export interface ReviewSchedule {
  agreementId: string;
  /** The date the next review is owed. */
  dueDate: string;
  /** Whether the date comes from the latest review or from the activation anniversary. */
  basis: ReviewDueBasis;
  /** True when `dueDate` is on or before today. */
  due: boolean;
  /** Days past the due date (0 when due today, negative when still upcoming). */
  daysOverdue: number;
  latestReviewId: string | null;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Calendar-safe month arithmetic on ISO dates; clamps to the end of shorter months. */
export function addMonths(date: string, months: number) {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (both ISO dates); negative when `to` is earlier. */
export function daysBetween(from: string, to: string) {
  const start = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const end = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** The most recent review by review date (ties broken by the later next-review date). */
export function latestReview(reviews: PartnershipReview[]) {
  return reviews.reduce<PartnershipReview | null>((latest, review) => {
    if (!latest) return review;
    if (review.reviewDate > latest.reviewDate) return review;
    if (review.reviewDate === latest.reviewDate && review.nextReviewDate > latest.nextReviewDate) {
      return review;
    }
    return latest;
  }, null);
}

/**
 * When the agreement's next value-realisation review is owed.
 *
 * The latest review's `nextReviewDate` wins. An agreement that has never been
 * reviewed owes its first review twelve months after activation (the effective
 * date). Agreements not in force, or never activated, have no schedule.
 */
export function reviewSchedule(
  agreement: PartnershipAgreement,
  reviews: PartnershipReview[],
  today = todayIso(),
): ReviewSchedule | null {
  if (!REVIEWABLE_STATUSES.includes(agreement.status)) return null;
  const latest = latestReview(reviews.filter((item) => item.agreementId === agreement.id));
  let dueDate: string;
  let basis: ReviewDueBasis;
  if (latest) {
    dueDate = latest.nextReviewDate;
    basis = 'NEXT_REVIEW_DATE';
  } else if (agreement.effectiveDate) {
    dueDate = addMonths(agreement.effectiveDate, FIRST_REVIEW_MONTHS);
    basis = 'FIRST_REVIEW';
  } else {
    return null;
  }
  const daysOverdue = daysBetween(dueDate, today);
  return {
    agreementId: agreement.id,
    dueDate,
    basis,
    due: dueDate <= today,
    daysOverdue,
    latestReviewId: latest?.id ?? null,
  };
}

/** Review schedules for every agreement that has one, keyed by agreement ID. */
export function reviewSchedules(
  agreements: PartnershipAgreement[],
  reviews: PartnershipReview[],
  today = todayIso(),
) {
  const byAgreement = new Map<string, PartnershipReview[]>();
  reviews.forEach((review) => {
    const list = byAgreement.get(review.agreementId);
    if (list) list.push(review);
    else byAgreement.set(review.agreementId, [review]);
  });
  const schedules = new Map<string, ReviewSchedule>();
  agreements.forEach((agreement) => {
    const schedule = reviewSchedule(agreement, byAgreement.get(agreement.id) ?? [], today);
    if (schedule) schedules.set(agreement.id, schedule);
  });
  return schedules;
}

/** Agreements whose review is due or overdue, most overdue first. */
export function agreementsWithReviewDue(
  agreements: PartnershipAgreement[],
  reviews: PartnershipReview[],
  today = todayIso(),
) {
  const schedules = reviewSchedules(agreements, reviews, today);
  return agreements
    .filter((agreement) => schedules.get(agreement.id)?.due)
    .sort(
      (left, right) =>
        (schedules.get(right.id)?.daysOverdue ?? 0) - (schedules.get(left.id)?.daysOverdue ?? 0),
    );
}
