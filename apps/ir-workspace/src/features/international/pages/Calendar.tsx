import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { Badge, Button, Notice } from '@rfdtech/components';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { PageHeader, SectionCard, useNow } from '@partner-crm/ui';

import { engagementRoute } from '@/constants/routes';

import { engagementsByDay } from '../calendar';
import { EngagementStatusBadge } from '../components/Badges';
import { LoadNotice } from '../components/LoadNotice';
import { MonthGrid } from '../components/MonthGrid';
import { clashSummary, findClashes } from '../domain';
import { dayKey, formatRange } from '../format';
import { useIr } from '../state/useIr';

const monthLabel = new Intl.DateTimeFormat('en-GH', { month: 'long', year: 'numeric' });

export function Component() {
  const { engagements } = useIr();
  const now = useNow();
  const [offset, setOffset] = useState(0);
  const month = useMemo(() => {
    const today = new Date(now);
    return new Date(today.getFullYear(), today.getMonth() + offset, 1);
  }, [now, offset]);

  const clashes = useMemo(() => findClashes(engagements), [engagements]);
  const clashing = useMemo(() => {
    const ids = new Set<string>();
    for (const clash of clashes) {
      ids.add(clash.first.id);
      ids.add(clash.second.id);
    }
    return ids;
  }, [clashes]);
  const byDay = useMemo(() => engagementsByDay(engagements), [engagements]);

  const inMonth = engagements
    .filter((item) => {
      const start = new Date(item.startAt);
      const end = new Date(item.endAt || item.startAt);
      const monthStart = month.getTime();
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime();
      return start.getTime() < monthEnd && end.getTime() >= monthStart;
    })
    .sort((left, right) => left.startAt.localeCompare(right.startAt));

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Calendar"
        // description="Visits, courtesy calls and conferences by day. Overlaps with the same host or venue are highlighted — clashes are shown, not blocked."
        meta={<Badge variant="outline">System S083</Badge>}
      />
      <LoadNotice />

      {clashes.length > 0 ? (
        <Notice variant="warning" title={`${clashes.length} scheduling clash${clashes.length === 1 ? '' : 'es'}`} leftBorder>
          <ul className="list-disc space-y-1 pl-5">
            {clashes.map((clash) => (
              <li key={`${clash.first.id}-${clash.second.id}`}>{clashSummary(clash)}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <SectionCard
        title={monthLabel.format(month)}
        // description={`${inMonth.length} engagement${inMonth.length === 1 ? '' : 's'} this month`}
        actions={
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" aria-label="Previous month" onClick={() => setOffset((value) => value - 1)}>
              <ChevronLeft size={16} aria-hidden />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOffset(0)} disabled={offset === 0}>
              Today
            </Button>
            <Button size="sm" variant="outline" aria-label="Next month" onClick={() => setOffset((value) => value + 1)}>
              <ChevronRight size={16} aria-hidden />
            </Button>
          </div>
        }
      >
        <div className="hidden md:block">
          <MonthGrid month={month} byDay={byDay} clashing={clashing} todayKey={dayKey(new Date(now))} />
        </div>

        {/* List fallback for small screens. */}
        <div className="md:hidden">
          {inMonth.length === 0 ? (
            <p className="py-6 text-center text-sm text-foreground-muted">
              Nothing scheduled this month. Use the arrows to browse other months.
            </p>
          ) : (
            <ul className="space-y-2">
              {inMonth.map((engagement) => (
                <li key={engagement.id}>
                  <Link
                    to={engagementRoute(engagement.id)}
                    className={`block rounded-xl border p-3 ${clashing.has(engagement.id) ? 'border-error/40 bg-error/5' : 'border-border'}`}
                  >
                    <p className="font-semibold text-foreground">{engagement.title}</p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {formatRange(engagement.startAt, engagement.endAt, engagement.timeZone)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <EngagementStatusBadge status={engagement.status} />
                      {clashing.has(engagement.id) ? <Badge variant="error">Clash</Badge> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SectionCard>
    </section>
  );
}
