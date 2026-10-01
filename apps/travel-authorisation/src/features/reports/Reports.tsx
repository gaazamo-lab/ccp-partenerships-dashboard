import { useMemo, useState } from 'react';

import { Badge, Button, ProgressBar } from '@rfdtech/components';
import { BarChart3, CheckCircle2, Clock3, Download, Plane } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Panel } from '@/components/Panel';
import { usePermittedRequests } from '@/features/access/usePermittedRequests';

export function Component() {
  const requests = usePermittedRequests();
  const [direction, setDirection] = useState('All');
  const [status, setStatus] = useState('All');
  const filtered = useMemo(
    () =>
      requests.filter(
        (item) =>
          (direction === 'All' || item.direction === direction) &&
          (status === 'All' || item.status === status),
      ),
    [requests, direction, status],
  );
  const inbound = filtered.filter((item) => item.direction === 'Inbound').length;
  const outbound = filtered.length - inbound;
  const completed = filtered.filter((item) =>
    ['Completed', 'Support issued', 'Travel authorised'].includes(item.status),
  ).length;
  const pending = filtered.filter((item) =>
    item.approvals.some((approval) => approval.status === 'Pending'),
  ).length;
  const statuses = Array.from(new Set(filtered.map((item) => item.status))).map((status) => ({
    status,
    count: filtered.filter((item) => item.status === status).length,
  }));
  const integrationSummary = ['S083', 'S140', 'S144', 'S031', 'GIS', 'S003', 'S074']
    .map((system) => {
      const items = filtered.flatMap((request) =>
        request.integrations.filter((item) => item.system === system),
      );
      return {
        system,
        complete: items.filter((item) => item.status === 'Complete').length,
        total: items.length,
        failed: items.filter((item) => item.status === 'Failed').length,
      };
    })
    .filter((item) => item.total > 0);
  const exportCsv = () => {
    const header = [
      'Request ID',
      'Direction',
      'Traveller',
      'Destination',
      'Status',
      'Owner',
      'Next action',
    ];
    const rows = filtered.map((item) => [
      item.id,
      item.direction,
      item.traveller,
      item.destination,
      item.status,
      item.owner,
      item.nextAction,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 's084-operational-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Operational reporting"
        // description="Permission-aware visibility into workload, approvals and external handoffs."
        meta={<Badge variant="outline">{filtered.length} permitted records</Badge>}
        actions={
          <Button variant="outline" onClick={exportCsv}>
            <Download size={17} />
            Export CSV
          </Button>
        }
      />
      <div className="flex flex-wrap gap-3 rounded-xl border border-border-subtle bg-surface p-4">
        <select
          className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 max-w-52"
          value={direction}
          onChange={(event) => setDirection(event.target.value)}
          aria-label="Filter report by direction"
        >
          <option>All</option>
          <option>Inbound</option>
          <option>Outbound</option>
        </select>
        <select
          className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 max-w-60"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter report by status"
        >
          <option>All</option>
          {Array.from(new Set(requests.map((item) => item.status))).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Plane, 'Inbound support', inbound],
          [BarChart3, 'Outbound travel', outbound],
          [Clock3, 'Pending approval', pending],
          [CheckCircle2, 'Issued or completed', completed],
        ].map(([Icon, label, value]) => {
          const Glyph = Icon as typeof Plane;
          return (
            <div
              key={String(label)}
              className="rounded-xl border border-border-subtle bg-surface p-5 shadow-sm"
            >
              <Glyph size={20} className="text-primary" />
              <p className="mt-4 text-3xl font-semibold">{String(value)}</p>
              <p className="mt-1 text-sm font-medium text-foreground-muted">{String(label)}</p>
            </div>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Requests by status" /* description="Current workspace distribution" */>
          <div className="space-y-4">
            {statuses.map(({ status, count }) => (
              <div key={status}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium">{status}</span>
                  <span className="font-semibold">{count}</span>
                </div>
                <ProgressBar value={(count / Math.max(filtered.length, 1)) * 100} size="sm" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Integration readiness"
          // description="S084 does not own these external outcomes"
        >
          <div className="space-y-3">
            {integrationSummary.map((item) => (
              <div
                key={item.system}
                className="flex items-center justify-between rounded-lg border border-border-subtle p-3"
              >
                <span className="text-sm font-medium">{item.system}</span>
                <Badge
                  variant={
                    item.failed ? 'error' : item.complete === item.total ? 'success' : 'warning'
                  }
                >
                  {item.failed
                    ? `${item.failed} failed`
                    : `${item.complete}/${item.total} complete`}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
