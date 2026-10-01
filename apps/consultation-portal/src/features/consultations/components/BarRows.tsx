import { formatCount } from '@partner-crm/ui';

export interface BarRow {
  label: string;
  count: number;
  /** 0–100; drives the bar length. */
  share: number;
}

interface BarRowsProps {
  rows: BarRow[];
  /** Unit for the hover text, e.g. "respondents". */
  unit?: string;
  emptyText?: string;
}

/**
 * Single-series horizontal bars: one hue, labels and values in text ink, a
 * hover title on each row and the exact numbers printed beside every bar so
 * the chart doubles as its own table.
 */
export function BarRows({ rows, unit = 'responses', emptyText = 'No answers yet.' }: BarRowsProps) {
  if (!rows.length || rows.every((row) => row.count === 0)) {
    return <p className="text-sm text-foreground-muted">{emptyText}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.label} title={`${row.label}: ${formatCount(row.count)} ${unit} (${row.share}%)`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-foreground">{row.label}</span>
            <span className="shrink-0 tabular-nums text-foreground-muted">
              <span className="font-medium text-foreground">{formatCount(row.count)}</span> · {row.share}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-subtle" aria-hidden>
            <div
              className="h-2 rounded-full bg-primary transition-[width] print:bg-foreground"
              style={{ width: `${Math.min(100, Math.max(row.count ? 2 : 0, row.share))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
