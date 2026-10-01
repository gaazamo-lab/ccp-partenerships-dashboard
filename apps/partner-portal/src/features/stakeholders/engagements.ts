import type { Engagement, EngagementType } from '@/features/stakeholders/types';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Epoch milliseconds for a stored engagement date, or `NaN`. Accepts ISO dates
 * (`2026-09-12`, what the API and the log form produce) and the `12 Sep 2026`
 * display form older records carry. Date-only ISO strings are read as local
 * dates so a timeline never shifts a day across time zones.
 */
export function parseEngagementDate(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  const display = /^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{4})$/.exec(trimmed);
  if (display) {
    const month = MONTHS.indexOf(display[2]!.toLowerCase());
    if (month < 0) return Number.NaN;
    return new Date(Number(display[3]), month, Number(display[1])).getTime();
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) return new Date(trimmed).getTime();
  return Number.NaN;
}

/** `YYYY-MM-DD` for a local date. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Same format as the shared kit's `formatDate`, which this module cannot import in node tests. */
const displayFormatter = new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium' });

/**
 * Display form of an engagement date, whether it arrived as ISO (API) or as
 * `12 Sep 2026` (older mock records). Anything unparseable — e.g. "Not yet
 * engaged" — is shown as is rather than as "Not set".
 */
export function displayDate(value: string | null | undefined): string {
  const time = parseEngagementDate(value);
  if (Number.isNaN(time)) return value ?? '';
  return displayFormatter.format(new Date(time));
}

/** Newest first; undated entries sink to the bottom in their original order. */
export function sortEngagements(engagements: Engagement[]): Engagement[] {
  return engagements
    .map((engagement, index) => ({ engagement, index, time: parseEngagementDate(engagement.date) }))
    .sort((left, right) => {
      const leftTime = Number.isNaN(left.time) ? -Infinity : left.time;
      const rightTime = Number.isNaN(right.time) ? -Infinity : right.time;
      return rightTime - leftTime || left.index - right.index;
    })
    .map(({ engagement }) => engagement);
}

export interface EngagementFilter {
  type?: EngagementType | '';
  source?: string;
}

export function filterEngagements(engagements: Engagement[], filter: EngagementFilter) {
  return engagements.filter(
    (engagement) =>
      (!filter.type || engagement.type === filter.type) &&
      (!filter.source || engagement.source === filter.source),
  );
}

export const NOT_YET_ENGAGED = 'Not yet engaged';

/** ISO date of the most recent engagement, for the `lastEngagement` field. */
export function latestEngagementDate(engagements: Engagement[]): string {
  const [latest] = sortEngagements(engagements);
  const time = parseEngagementDate(latest?.date);
  return Number.isNaN(time) ? NOT_YET_ENGAGED : toIsoDate(new Date(time));
}

export interface MonthlyVolume {
  /** `YYYY-MM` */
  month: string;
  label: string;
  count: number;
}

const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' });

/**
 * Engagement counts per calendar month between `from` and `to` (inclusive ISO
 * dates; either may be empty to leave that side open). Months with no activity
 * inside the range are included as zero so the series has no gaps.
 */
export function engagementVolumeByMonth(
  engagements: Engagement[],
  from?: string,
  to?: string,
): MonthlyVolume[] {
  const fromTime = from ? parseEngagementDate(from) : Number.NaN;
  const toTime = to ? parseEngagementDate(to) : Number.NaN;
  const counts = new Map<string, number>();
  const dated: number[] = [];

  for (const engagement of engagements) {
    const time = parseEngagementDate(engagement.date);
    if (Number.isNaN(time)) continue;
    if (!Number.isNaN(fromTime) && time < fromTime) continue;
    if (!Number.isNaN(toTime) && time > toTime) continue;
    dated.push(time);
    const date = new Date(time);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const start = !Number.isNaN(fromTime) ? fromTime : Math.min(...dated);
  const end = !Number.isNaN(toTime) ? toTime : Math.max(...dated);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];

  const series: MonthlyVolume[] = [];
  const cursor = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), 1);
  const last = new Date(new Date(end).getFullYear(), new Date(end).getMonth(), 1);
  // Cap the series so an accidental 1900-2100 range cannot render thousands of bars.
  while (cursor <= last && series.length < 120) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    series.push({ month: key, label: monthFormatter.format(cursor), count: counts.get(key) ?? 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return series;
}
