import { useState } from 'react';

import { Badge } from '@rfdtech/components';

import { formatCount } from '../lib/format';

export interface PortfolioSlice {
  label: string;
  count: number;
  health: number;
  /** Optional secondary count shown beside the organisation count, e.g. recorded activity. */
  activities?: number;
  /** Fixed per category, not reassigned when other bands filter in or out. */
  color: string;
}

interface PortfolioDonutChartProps {
  data: PortfolioSlice[];
}

const RADIUS = 78;
const STROKE = 22;
const HOVER_STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SEGMENT_GAP = 3;

/**
 * Part-to-whole by category, paired with a legend that carries the exact
 * counts and health — the ring gives the at-a-glance shape, the legend gives
 * the numbers, so nobody has to read precise values off an arc.
 */
export function PortfolioDonutChart({ data }: PortfolioDonutChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = data.reduce((sum, slice) => sum + slice.count, 0);

  const segments = data.reduce<{
    cumulative: number;
    items: Array<PortfolioSlice & { dash: number; offset: number }>;
  }>(
    (acc, slice) => {
      const share = total > 0 ? slice.count / total : 0;
      const segmentLength = share * CIRCUMFERENCE;
      const dash = Math.max(segmentLength - SEGMENT_GAP, 0);
      return {
        cumulative: acc.cumulative + segmentLength,
        items: [...acc.items, { ...slice, dash, offset: -acc.cumulative }],
      };
    },
    { cumulative: 0, items: [] },
  ).items;

  return (
    <div className="flex flex-col items-center gap-6 pt-2 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
        <svg viewBox="0 0 200 200" width={180} height={180} role="presentation" aria-hidden="true">
          {segments.map((segment) => (
            <circle
              key={segment.label}
              cx={100}
              cy={100}
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth={hovered === segment.label ? HOVER_STROKE : STROKE}
              strokeDasharray={`${segment.dash} ${CIRCUMFERENCE - segment.dash}`}
              strokeDashoffset={segment.offset}
              strokeLinecap="butt"
              transform="rotate(-90 100 100)"
              style={{
                opacity: hovered && hovered !== segment.label ? 0.45 : 1,
                transition: 'opacity 150ms ease, stroke-width 150ms ease',
              }}
              onMouseEnter={() => setHovered(segment.label)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-foreground">{formatCount(total)}</span>
          <span className="text-xs text-foreground-muted">organisations</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1 sm:min-w-48">
        {data.map((slice) => (
          <li key={slice.label}>
            <button
              type="button"
              onMouseEnter={() => setHovered(slice.label)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(slice.label)}
              onBlur={() => setHovered(null)}
              className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                hovered === slice.label ? 'bg-surface-subtle' : 'hover:bg-surface-subtle'
              }`}
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {slice.label}
                </span>
                <span className="block text-xs text-foreground-muted">
                  {formatCount(slice.count)} organisation{slice.count === 1 ? '' : 's'}
                  {typeof slice.activities === 'number'
                    ? ` · ${formatCount(slice.activities)} activit${slice.activities === 1 ? 'y' : 'ies'}`
                    : ''}
                </span>
              </span>
              <Badge variant={slice.health < 80 ? 'warning' : 'success'}>{slice.health}%</Badge>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
