import { Button, exportToCsv } from '@rfdtech/components';
import { BarChart3, Clock, Download, Eye, Users } from 'lucide-react';

import type { Microsite } from '@partner-crm/types';
import { EmptyState, KpiGrid, SectionCard, formatCount, formatDateTime } from '@partner-crm/ui';

import { formatDuration } from '@/features/microsites/domain';

export function AnalyticsTab({ site, canExport }: { site: Microsite; canExport: boolean }) {
  const { analytics } = site;
  const neverLive = site.publishedAt === null && analytics.views === 0;

  return (
    <div className="flex flex-col gap-6">
      <KpiGrid
        kpis={[
          { id: 'views', label: 'Views', value: formatCount(analytics.views), icon: <Eye size={18} aria-hidden /> },
          { id: 'visitors', label: 'Unique visitors', value: formatCount(analytics.uniqueVisitors), icon: <Users size={18} aria-hidden /> },
          { id: 'time', label: 'Average time on site', value: formatDuration(analytics.averageSeconds), icon: <Clock size={18} aria-hidden /> },
          { id: 'downloads', label: 'Downloads', value: formatCount(analytics.downloads), icon: <Download size={18} aria-hidden /> },
        ]}
      />
      <SectionCard
        title="Engagement"
        // description="Collected by the public viewer and forwarded to the S225 reporting warehouse."
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={!canExport}
            onClick={() =>
              exportToCsv(
                [site],
                [
                  { header: 'Microsite', accessor: (row: Microsite) => row.title },
                  { header: 'Slug', accessor: (row: Microsite) => row.slug },
                  { header: 'Views', accessor: (row: Microsite) => row.analytics.views },
                  { header: 'Unique visitors', accessor: (row: Microsite) => row.analytics.uniqueVisitors },
                  { header: 'Average time (s)', accessor: (row: Microsite) => row.analytics.averageSeconds },
                  { header: 'Downloads', accessor: (row: Microsite) => row.analytics.downloads },
                  { header: 'Last viewed', accessor: (row: Microsite) => row.analytics.lastViewedAt ?? '' },
                ],
                `s091-${site.slug}-analytics.csv`,
              )
            }
          >
            <Download size={15} aria-hidden /> Export CSV
          </Button>
        }
      >
        {neverLive ? (
          <EmptyState
            message="No visits yet"
            hint="Analytics start once the microsite is published and shared with its audience."
            icon={<BarChart3 size={22} aria-hidden />}
          />
        ) : (
          <p className="text-sm text-foreground-muted">
            Last viewed {formatDateTime(analytics.lastViewedAt)}. Each page load counts one view; unique visitors are
            counted once per browser session.
          </p>
        )}
      </SectionCard>
    </div>
  );
}
