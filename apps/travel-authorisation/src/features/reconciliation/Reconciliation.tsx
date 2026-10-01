import { useNavigate } from 'react-router';

import { Badge, Button } from '@rfdtech/components';
import { Check, ExternalLink, RefreshCw } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Panel } from '@/components/Panel';
import { requestRoute } from '@/constants/routes';
import { usePermittedRequests } from '@/features/access/usePermittedRequests';
import { useRequests } from '@/features/requests/requests-context';

export function Component() {
  const navigate = useNavigate();
  const { updateIntegration, retryNotification } = useRequests();
  const requests = usePermittedRequests();
  const handoffs = requests.flatMap((request) =>
    request.integrations
      .filter((item) => item.status === 'Pending' || item.status === 'Failed')
      .map((item) => ({ request, item })),
  );
  const notifications = requests.flatMap((request) =>
    (request.notifications ?? [])
      .filter((item) => item.status !== 'Delivered')
      .map((item) => ({ request, item })),
  );
  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Reconciliation"
        // description="Resolve pending or failed service handoffs without hiding external processing state."
        meta={
          <Badge variant={handoffs.length + notifications.length ? 'warning' : 'success'}>
            {handoffs.length + notifications.length} open
          </Badge>
        }
      />
      <Panel
        title="Integration handoffs"
        // description="References and correlation identifiers remain visible for support"
      >
        <div className="divide-y divide-border-subtle">
          {handoffs.map(({ request, item }) => (
            <div
              key={`${request.id}-${item.system}`}
              className="grid gap-4 py-4 lg:grid-cols-[1fr_auto] lg:items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">
                    {item.system} · {item.label}
                  </p>
                  <Badge variant={item.status === 'Failed' ? 'error' : 'warning'}>
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-foreground-muted">
                  {request.reference} · {request.traveller}
                  {item.reference ? ` · ${item.reference}` : ''}
                </p>
                <p className="mt-1 text-xs text-foreground-muted">
                  {item.correlationId ?? 'Correlation ID will be assigned on update'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(requestRoute(request.id))}
                >
                  <ExternalLink size={15} />
                  Open
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    updateIntegration(
                      request.id,
                      item.system,
                      'Complete',
                      item.reference ?? `ACK-${Date.now().toString().slice(-6)}`,
                      'Reconciled by operator',
                    )
                  }
                >
                  <Check size={15} />
                  Mark reconciled
                </Button>
              </div>
            </div>
          ))}
        </div>
        {handoffs.length === 0 ? (
          <p className="py-10 text-center text-sm text-foreground-muted">
            All integration handoffs are reconciled.
          </p>
        ) : null}
      </Panel>
      <Panel
        title="Notification delivery"
        // description="Retry official messages through the S074 boundary"
      >
        <div className="divide-y divide-border-subtle">
          {notifications.map(({ request, item }) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-semibold">{item.subject}</p>
                <p className="text-sm text-foreground-muted">
                  {request.reference} · {item.recipient} · {item.correlationId}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => retryNotification(request.id, item.id)}
              >
                <RefreshCw size={15} />
                Retry delivery
              </Button>
            </div>
          ))}
        </div>
        {notifications.length === 0 ? (
          <p className="py-10 text-center text-sm text-foreground-muted">
            No notification failures or pending deliveries.
          </p>
        ) : null}
      </Panel>
    </section>
  );
}
