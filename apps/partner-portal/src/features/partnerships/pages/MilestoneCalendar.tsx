import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, Card, Notice } from '@rfdtech/components';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

import { ROUTES, partnershipRoute } from '@/constants/routes';
import {
  MILESTONE_KINDS,
  MILESTONE_KIND_LABELS,
  type MilestoneEvent,
  type MilestoneKind,
  buildMilestones,
  eventsInMonth,
  filterMilestones,
  groupByDate,
  monthGrid,
  monthKey,
  shiftMonth,
} from '@/features/partnerships/calendar';
import { todayIso } from '@/features/partnerships/reviewDue';
import { usePartnerships } from '@/features/partnerships/state/usePartnerships';
import { EmptyState, PageHeader, SectionCard, SelectField, formatDate } from '@/features/shared';

/** One colour per milestone kind, from the existing status tokens. */
const KIND_STYLES: Record<MilestoneKind, { dot: string; chip: string }> = {
  EXPIRY: { dot: 'bg-error', chip: 'bg-error/10 text-error' },
  RENEWAL_ALERT: { dot: 'bg-warning', chip: 'bg-warning/15 text-foreground' },
  OBLIGATION: { dot: 'bg-primary', chip: 'bg-primary/10 text-primary' },
  REVIEW: { dot: 'bg-success', chip: 'bg-success/10 text-success' },
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_CHIPS_PER_DAY = 3;

const monthFormatter = new Intl.DateTimeFormat('en-GH', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

function KindDot({ kind }: { kind: MilestoneKind }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 shrink-0 rounded-full ${KIND_STYLES[kind].dot}`}
    />
  );
}

export function Component() {
  const navigate = useNavigate();
  const { agreements, obligations, reviews, renewalAlerts, loading, error, reload } =
    usePartnerships();

  const today = todayIso();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [kinds, setKinds] = useState<MilestoneKind[]>(MILESTONE_KINDS);
  const [owner, setOwner] = useState('');

  const allEvents = useMemo(
    () => buildMilestones({ agreements, obligations, reviews, renewalAlerts }, today),
    [agreements, obligations, reviews, renewalAlerts, today],
  );
  const owners = useMemo(
    () => [...new Set(allEvents.map((event) => event.owner))].sort(),
    [allEvents],
  );
  const filtered = useMemo(
    () => filterMilestones(allEvents, { kinds, owner: owner || null }),
    [allEvents, kinds, owner],
  );
  const monthEvents = useMemo(
    () => eventsInMonth(filtered, cursor.year, cursor.month),
    [filtered, cursor],
  );
  const byDate = useMemo(() => groupByDate(monthEvents), [monthEvents]);
  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const shownMonth = monthKey(cursor.year, cursor.month);
  const nextUpcoming = filtered.find((event) => event.date.slice(0, 7) > shownMonth);

  const toggleKind = (kind: MilestoneKind) =>
    setKinds((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
    );
  const open = (event: MilestoneEvent) => void navigate(partnershipRoute(event.agreementId));
  const monthLabel = monthFormatter.format(new Date(Date.UTC(cursor.year, cursor.month, 1)));

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Milestone calendar"
        // description="Expiries, 180/90/30-day renewal alerts, obligation due dates and value reviews by month."
        meta={<Badge variant="outline">System S082</Badge>}
        backTo={{ to: ROUTES.PARTNERSHIPS, label: 'Back to partnerships' }}
      />

      {error ? (
        <Notice variant="error" title="Milestones could not be loaded" leftBorder>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" disabled={loading} onClick={reload}>
              <RefreshCw size={14} aria-hidden /> Try again
            </Button>
          </div>
        </Notice>
      ) : null}

      <Card bordered>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
              Show milestones
            </p>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Milestone kinds">
              {MILESTONE_KINDS.map((kind) => {
                const active = kinds.includes(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleKind(kind)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                      active
                        ? 'border-border bg-surface-subtle text-foreground'
                        : 'border-border-subtle text-foreground-muted line-through'
                    }`}
                  >
                    <KindDot kind={kind} />
                    {MILESTONE_KIND_LABELS[kind]}
                  </button>
                );
              })}
            </div>
          </div>
          <SelectField
            className="w-full sm:w-64"
            label="Owner"
            value={owner}
            onChange={setOwner}
            options={owners}
            placeholder="All owners"
            clearable
          />
        </div>
      </Card>

      <CalendarBody
        loading={loading}
        monthLabel={monthLabel}
        today={today}
        grid={grid}
        byDate={byDate}
        monthEvents={monthEvents}
        nextUpcoming={nextUpcoming}
        hasAnyEvents={allEvents.length > 0}
        onPrevious={() => setCursor((current) => shiftMonth(current.year, current.month, -1))}
        onNext={() => setCursor((current) => shiftMonth(current.year, current.month, 1))}
        onToday={() => {
          const now = new Date();
          setCursor({ year: now.getFullYear(), month: now.getMonth() });
        }}
        onJump={(date) =>
          setCursor({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) - 1 })
        }
        onOpen={open}
        onBrowse={() => void navigate(ROUTES.PARTNERSHIPS)}
      />
    </section>
  );
}

function EventChip({
  event,
  onOpen,
}: {
  event: MilestoneEvent;
  onOpen: (event: MilestoneEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      title={`${MILESTONE_KIND_LABELS[event.kind]}: ${event.label} — ${event.agreementTitle} (${event.owner})`}
      className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium hover:opacity-80 ${KIND_STYLES[event.kind].chip}`}
    >
      {event.label}
    </button>
  );
}

function CalendarBody({
  loading,
  monthLabel,
  today,
  grid,
  byDate,
  monthEvents,
  nextUpcoming,
  hasAnyEvents,
  onPrevious,
  onNext,
  onToday,
  onJump,
  onOpen,
  onBrowse,
}: {
  loading: boolean;
  monthLabel: string;
  today: string;
  grid: ReturnType<typeof monthGrid>;
  byDate: Map<string, MilestoneEvent[]>;
  monthEvents: MilestoneEvent[];
  nextUpcoming: MilestoneEvent | undefined;
  hasAnyEvents: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onJump: (date: string) => void;
  onOpen: (event: MilestoneEvent) => void;
  onBrowse: () => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
      <SectionCard
        title={monthLabel}
        // description={
        // loading
        // ? 'Loading milestones…'
        // : `${monthEvents.length} milestone${monthEvents.length === 1 ? '' : 's'} this month`
        // }
        actions={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" aria-label="Previous month" onClick={onPrevious}>
              <ChevronLeft size={16} aria-hidden />
            </Button>
            <Button variant="outline" size="sm" onClick={onToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" aria-label="Next month" onClick={onNext}>
              <ChevronRight size={16} aria-hidden />
            </Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <div className="min-w-[42rem]">
            <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              {WEEKDAYS.map((day) => (
                <div key={day} className="pb-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
              {grid.flat().map((day) => {
                const events = byDate.get(day.date) ?? [];
                const isToday = day.date === today;
                return (
                  <div
                    key={day.date}
                    className={`min-h-24 p-1.5 ${day.inMonth ? 'bg-surface' : 'bg-surface-subtle'}`}
                  >
                    <p
                      className={`mb-1 text-xs font-semibold ${
                        isToday
                          ? 'inline-flex size-6 items-center justify-center rounded-full bg-primary text-white'
                          : day.inMonth
                            ? 'text-foreground'
                            : 'text-foreground-muted'
                      }`}
                    >
                      {day.day}
                    </p>
                    <div className="space-y-1">
                      {events.slice(0, MAX_CHIPS_PER_DAY).map((event) => (
                        <EventChip key={event.id} event={event} onOpen={onOpen} />
                      ))}
                      {events.length > MAX_CHIPS_PER_DAY ? (
                        <p className="px-1 text-[11px] text-foreground-muted">
                          +{events.length - MAX_CHIPS_PER_DAY} more
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Legend">
          {MILESTONE_KINDS.map((kind) => (
            <span key={kind} className="flex items-center gap-2 text-xs text-foreground-muted">
              <KindDot kind={kind} />
              {MILESTONE_KIND_LABELS[kind]}
            </span>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Agenda" /* description="This month’s milestones in date order." */>
        {monthEvents.length === 0 ? (
          <EmptyState
            message={loading ? 'Loading milestones…' : 'Nothing scheduled this month'}
            hint={
              !hasAnyEvents
                ? 'Milestones appear once agreements have expiry dates, obligations and reviews.'
                : nextUpcoming
                  ? `The next matching milestone is on ${formatDate(nextUpcoming.date)}.`
                  : 'Try another month, or widen the kind and owner filters.'
            }
            icon={<CalendarDays size={22} aria-hidden />}
            action={
              !hasAnyEvents ? (
                <Button onClick={onBrowse}>Browse agreements</Button>
              ) : nextUpcoming ? (
                <Button variant="outline" onClick={() => onJump(nextUpcoming.date)}>
                  Jump to {formatDate(nextUpcoming.date)}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ol className="space-y-4">
            {[...byDate.entries()].map(([date, events]) => (
              <li key={date}>
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${
                    date < today ? 'text-foreground-muted' : 'text-foreground'
                  }`}
                >
                  {formatDate(date)}
                  {date === today ? ' · Today' : ''}
                </p>
                <ul className="mt-2 space-y-2">
                  {events.map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(event)}
                        className="flex w-full items-start gap-3 rounded-xl border border-border-subtle p-3 text-left transition-colors hover:border-primary/40"
                      >
                        <span className="mt-1.5">
                          <KindDot kind={event.kind} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {event.label}
                          </span>
                          <span className="block truncate text-xs text-foreground-muted">
                            {MILESTONE_KIND_LABELS[event.kind]} · {event.detail}
                          </span>
                          <span className="block truncate text-xs text-foreground-muted">
                            {event.agreementTitle} · {event.owner}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}
