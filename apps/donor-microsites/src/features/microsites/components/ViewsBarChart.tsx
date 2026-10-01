import { Link } from 'react-router';

import { formatCount } from '@partner-crm/ui';

import { siteRoute } from '@/constants/routes';

export interface ViewsBar {
  id: string;
  label: string;
  value: number;
  /** Secondary figure shown in the tooltip, e.g. unique visitors. */
  hint?: string;
}

/**
 * One measure, one hue: horizontal bars sorted by value on a shared zero
 * baseline, each labelled directly with its figure. A single series needs no
 * legend — the card title names it.
 */
export function ViewsBarChart({ bars, unit = 'views' }: { bars: ViewsBar[]; unit?: string }) {
  const sorted = [...bars].sort((left, right) => right.value - left.value);
  const max = Math.max(...sorted.map((bar) => bar.value), 0);

  return (
    <ul className="space-y-3" aria-label={`${unit} per microsite`}>
      {sorted.map((bar) => {
        const width = max > 0 ? (bar.value / max) * 100 : 0;
        const tooltip = `${bar.label}: ${formatCount(bar.value)} ${unit}${bar.hint ? ` · ${bar.hint}` : ''}`;
        return (
          <li key={bar.id} title={tooltip}>
            <Link
              to={siteRoute(bar.id)}
              className="group grid grid-cols-1 gap-1.5 rounded-md py-1 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center sm:gap-4"
            >
              <span className="truncate text-sm font-medium text-foreground group-hover:underline">{bar.label}</span>
              <span className="flex items-center gap-3">
                <span aria-hidden className="h-3 flex-1 rounded-full bg-surface-subtle">
                  <span
                    className="block h-full rounded-full bg-primary transition-opacity group-hover:opacity-80"
                    style={{ width: `${Math.max(width, bar.value > 0 ? 1 : 0)}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                  {formatCount(bar.value)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
