import type { IrEngagement } from '@partner-crm/types';

import { dayKey } from './format';

/** The 6×7 grid of days covering `month`, starting on Monday. */
export function monthDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from(
    { length: 42 },
    (_, index) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + index),
  );
}

/** Engagements keyed by every local day they span. */
export function engagementsByDay(engagements: IrEngagement[]): Map<string, IrEngagement[]> {
  const map = new Map<string, IrEngagement[]>();
  for (const engagement of engagements) {
    const start = new Date(engagement.startAt);
    if (Number.isNaN(start.getTime())) continue;
    const endRaw = new Date(engagement.endAt);
    const end = Number.isNaN(endRaw.getTime()) ? start : endRaw;
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    for (let guard = 0; cursor <= end && guard < 62; guard += 1) {
      const key = dayKey(cursor);
      map.set(key, [...(map.get(key) ?? []), engagement]);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return map;
}

