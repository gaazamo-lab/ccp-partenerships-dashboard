import type { ReactNode } from 'react';

interface DetailItemProps {
  label: string;
  value: ReactNode;
  /** Extra context shown under the value, e.g. "renews in 12 days". */
  hint?: ReactNode;
}

/** Key/value pair used in detail panels and summaries. */
export function DetailItem({ label, value, hint }: DetailItemProps) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
      {hint ? <p className="mt-0.5 text-xs text-foreground-muted">{hint}</p> : null}
    </div>
  );
}

interface DetailGridProps {
  children: ReactNode;
  /** Columns at the widest breakpoint. Defaults to 3. */
  columns?: 2 | 3 | 4;
}

const GRID_CLASS: Record<2 | 3 | 4, string> = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

export function DetailGrid({ children, columns = 3 }: DetailGridProps) {
  return <div className={`grid gap-3 ${GRID_CLASS[columns]}`}>{children}</div>;
}
