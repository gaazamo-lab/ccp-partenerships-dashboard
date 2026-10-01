import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { MetricCard, type MetricTrend } from '@rfdtech/components';

export interface Kpi {
  /** Stable key; also the fallback when two KPIs share a label. */
  id: string;
  label: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: MetricTrend;
  trendValue?: string;
  /**
   * Where clicking the card goes — normally the list this number counts, with
   * the matching filter already applied. A KPI a user cannot act on is a KPI
   * they have to go and look up by hand, so set this wherever a list exists.
   */
  to?: string;
}

interface KpiGridProps {
  kpis: Kpi[];
  /** Cards per row at the widest breakpoint. Defaults to 4. */
  columns?: 3 | 4 | 5;
  loading?: boolean;
}

const GRID_CLASS: Record<3 | 4 | 5, string> = {
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
};

/**
 * The row of headline numbers at the top of a page. Every KPI in the portal
 * goes through here so they share one size, one variant and one click
 * behaviour.
 */
export function KpiGrid({ kpis, columns = 4, loading }: KpiGridProps) {
  const navigate = useNavigate();

  return (
    <div className={`grid gap-4 ${GRID_CLASS[columns]}`}>
      {kpis.map((kpi) => {
        const clickable = Boolean(kpi.to);
        return (
          <MetricCard
            key={kpi.id}
            variant="soft"
            label={kpi.label}
            value={kpi.value}
            description={kpi.description}
            icon={kpi.icon}
            trend={kpi.trend}
            trendValue={kpi.trendValue}
            loading={loading}
            className={clickable ? 'cursor-pointer transition-shadow hover:shadow-md' : undefined}
            role={clickable ? 'link' : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={clickable ? `${kpi.label}: ${kpi.value}. View details` : undefined}
            onClick={clickable ? () => void navigate(kpi.to as string) : undefined}
            onKeyDown={
              clickable
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void navigate(kpi.to as string);
                    }
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
