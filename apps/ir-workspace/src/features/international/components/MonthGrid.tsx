import { Link } from 'react-router';

import type { IrEngagement } from '@partner-crm/types';

import { engagementRoute } from '@/constants/routes';

import { monthDays } from '../calendar';
import { dayKey } from '../format';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface MonthGridProps {
  month: Date;
  byDay: Map<string, IrEngagement[]>;
  clashing: Set<string>;
  todayKey: string;
}

export function MonthGrid({ month, byDay, clashing, todayKey }: MonthGridProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-surface-subtle">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthDays(month).map((day) => {
          const key = dayKey(day);
          const inMonth = day.getMonth() === month.getMonth();
          const items = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`min-h-28 border-b border-r border-border p-1.5 ${inMonth ? '' : 'bg-surface-subtle/60'}`}
            >
              <p
                className={`mb-1 text-xs font-medium ${
                  key === todayKey
                    ? 'inline-grid size-6 place-items-center rounded-full bg-primary text-white'
                    : inMonth
                      ? 'text-foreground'
                      : 'text-foreground-muted'
                }`}
              >
                {day.getDate()}
              </p>
              <ul className="space-y-1">
                {items.map((engagement) => {
                  const clash = clashing.has(engagement.id);
                  const cancelled = engagement.status === 'CANCELLED';
                  return (
                    <li key={engagement.id}>
                      <Link
                        to={engagementRoute(engagement.id)}
                        title={`${engagement.reference} · ${engagement.title}${clash ? ' · CLASH' : ''}`}
                        className={`block truncate rounded-md border px-1.5 py-0.5 text-xs font-medium ${
                          clash
                            ? 'border-error/40 bg-error/10 text-error'
                            : cancelled
                              ? 'border-border text-foreground-muted line-through'
                              : 'border-primary/30 bg-primary/10 text-primary'
                        }`}
                      >
                        {clash ? '⚠ ' : ''}
                        {engagement.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
