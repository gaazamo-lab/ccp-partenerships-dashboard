import { useMemo } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, ProgressBar } from '@rfdtech/components';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FilePlus2,
  Plane,
  Stamp,
} from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Panel } from '@/components/Panel';
import { StatusBadge } from '@/components/StatusBadge';
import { ROUTES, requestRoute } from '@/constants/routes';
import { useOperationalRole } from '@/features/access/role-context';
import { usePermittedRequests } from '@/features/access/usePermittedRequests';
import { formatTimestamp } from '@/features/requests/format';
import { useRequests } from '@/features/requests/requests-context';

export function Component() {
  const navigate = useNavigate();
  const requests = usePermittedRequests();
  const { loading } = useRequests();
  const { canCreate } = useOperationalRole();
  const summary = useMemo(
    () => ({
      active: requests.filter(
        (item) => !['Completed', 'Cancelled', 'Rejected'].includes(item.status),
      ).length,
      approvals: requests.filter((item) =>
        item.approvals.some((approval) => approval.status === 'Pending'),
      ).length,
      ready: requests.filter((item) => item.status === 'Approved').length,
      attention: requests.filter(
        (item) =>
          item.status === 'Returned' ||
          item.integrations.some((integration) => integration.status === 'Failed'),
      ).length,
      evidenceReady: requests.filter((item) =>
        item.evidence.every((evidence) => evidence.status !== 'Missing'),
      ).length,
      approvalsMoving: requests.filter((item) =>
        item.approvals.some((approval) => approval.status === 'Approved'),
      ).length,
      handoffsComplete: requests.filter(
        (item) =>
          item.integrations.length > 0 &&
          item.integrations.every((integration) => integration.status === 'Complete'),
      ).length,
      closureReady: requests.filter((item) => ['Completed', 'Closed'].includes(item.status)).length,
    }),
    [requests],
  );
  const metrics = [
    {
      label: 'Active requests',
      value: summary.active,
      detail: 'Across inbound and outbound',
      icon: Plane,
      to: ROUTES.REQUESTS,
    },
    {
      label: 'Awaiting decisions',
      value: summary.approvals,
      detail: 'Assigned approval routes',
      icon: Clock3,
      to: ROUTES.APPROVALS,
    },
    {
      label: 'Ready to issue',
      value: summary.ready,
      detail: 'Approval complete',
      icon: Stamp,
      to: ROUTES.REQUESTS,
    },
    {
      label: 'Needs attention',
      value: summary.attention,
      detail: 'Returned or failed handoff',
      icon: AlertTriangle,
      to: ROUTES.REQUESTS,
    },
  ];
  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Travel operations overview"
        // description="Track visa support and official travel from request through closure."
        meta={<Badge variant="outline">System S084</Badge>}
        actions={
          <Button disabled={!canCreate} onClick={() => navigate(ROUTES.NEW_REQUEST)}>
            <FilePlus2 size={17} />
            New request
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="rounded-xl border border-border-subtle bg-surface p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon size={20} />
              </span>
              <ArrowRight size={17} className="text-foreground-muted" />
            </div>
            {/* A loading register must not read as "no work outstanding". */}
            <p className="text-3xl font-semibold tabular-nums">
              {loading && requests.length === 0 ? '—' : value}
            </p>
            <p className="mt-1 text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs text-foreground-muted">{detail}</p>
          </button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_.85fr]">
        <Panel
          title="Priority queue"
          // description="Requests with the nearest operational action"
          actions={
            <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.REQUESTS)}>
              View all <ArrowRight size={16} />
            </Button>
          }
        >
          <div className="divide-y divide-border-subtle">
            {requests.slice(0, 4).map((request) => (
              <button
                key={request.id}
                onClick={() => navigate(requestRoute(request.id))}
                className="grid w-full gap-2 py-4 text-left transition hover:bg-surface-subtle sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{request.traveller}</span>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {request.reference} · {request.destination} · {request.nextAction}
                  </p>
                </div>
                <span className="text-xs font-medium text-foreground-muted">
                  Updated {formatTimestamp(request.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Workflow health" /* description="Readiness across open requests" */>
          <div className="space-y-5">
            {[
              [
                'Evidence complete',
                Math.round((summary.evidenceReady / Math.max(requests.length, 1)) * 100),
              ],
              [
                'Approval routes moving',
                Math.round((summary.approvalsMoving / Math.max(requests.length, 1)) * 100),
              ],
              [
                'External handoffs acknowledged',
                Math.round((summary.handoffsComplete / Math.max(requests.length, 1)) * 100),
              ],
              [
                'Records ready for closure',
                Math.round((summary.closureReady / Math.max(requests.length, 1)) * 100),
              ],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium">{label}</span>
                  <span className="font-semibold tabular-nums">{value}%</span>
                </div>
                <ProgressBar
                  value={Number(value)}
                  size="sm"
                  variant={Number(value) < 50 ? 'warning' : 'success'}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-primary/5 p-4">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-sm text-foreground-muted">
              Internal approval and external GIS clearance remain separate, as required by the SRS.
            </p>
          </div>
        </Panel>
      </div>
    </section>
  );
}
