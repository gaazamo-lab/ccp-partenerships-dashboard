import { useEffect, useState } from 'react';

/**
 * A clock that ticks on an interval instead of being read during render.
 *
 * Anything that compares a timestamp against "now" — a deadline badge, an
 * overdue count — needs the current time, and reading `Date.now()` inside a
 * component body makes that render impure: the same props can produce
 * different output, and React is free to re-run it whenever it likes. Keeping
 * the impure read inside an effect makes the value a piece of state that
 * changes on a schedule, which is what it actually is.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
