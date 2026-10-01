import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Badge, Button, Notice } from '@rfdtech/components';
import { Check, Clock3, ExternalLink, RotateCcw, X } from 'lucide-react';

import { useAuth } from '@partner-crm/auth';

import { PageHeader } from '@/components/PageHeader';
import { Panel } from '@/components/Panel';
import { StatusBadge } from '@/components/StatusBadge';
import { requestRoute } from '@/constants/routes';
import { useOperationalRole } from '@/features/access/role-context';
import { usePermittedRequests } from '@/features/access/usePermittedRequests';
import { useRequests } from '@/features/requests/requests-context';

export function Component() {
  const { decideApproval } = useRequests();
  const requests = usePermittedRequests();
  const { user } = useAuth();
  const { canApprove, role } = useOperationalRole();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Record<string, string>>({});
  const pending = requests.flatMap((request) =>
    request.approvals
      .filter((approval) => approval.status === 'Pending')
      .map((approval) => ({ request, approval })),
  );
  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title="Approvals inbox"
        // description="Assigned decisions with request context and separation-of-duties controls."
        meta={<Badge variant="warning">{pending.length} pending</Badge>}
      />
      {!canApprove ? (
        <Notice variant="warning" title="Read-only role">
          {role} can inspect decision history but cannot record an approval decision.
        </Notice>
      ) : null}
      <Panel
        title="Decision queue"
        // description="Decisions are recorded against the current request version"
      >
        <div className="divide-y divide-border-subtle">
          {pending.map(({ request, approval }) => (
            <div
              key={`${request.id}-${approval.id}`}
              className="grid gap-4 py-5 lg:grid-cols-[1fr_auto] lg:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{approval.label}</p>
                  <StatusBadge status={request.status} />
                </div>
                <p className="mt-1 text-sm text-foreground-muted">
                  {request.traveller} · {request.destination} · {request.reference}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
                  <Clock3 size={14} />
                  Assigned to {approval.assignee}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(requestRoute(request.id))}
                >
                  <ExternalLink size={15} />
                  Review
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canApprove || !comments[`${request.id}-${approval.id}`]?.trim()}
                  onClick={() =>
                    decideApproval(
                      request.id,
                      approval.id,
                      'Returned',
                      comments[`${request.id}-${approval.id}`] ?? '',
                    )
                  }
                >
                  <RotateCcw size={15} />
                  Return
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canApprove || !comments[`${request.id}-${approval.id}`]?.trim()}
                  onClick={() =>
                    decideApproval(
                      request.id,
                      approval.id,
                      'Rejected',
                      comments[`${request.id}-${approval.id}`] ?? '',
                    )
                  }
                >
                  <X size={15} />
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !canApprove ||
                    approval.assignee === user?.name ||
                    request.requester === user?.name
                  }
                  onClick={() =>
                    decideApproval(
                      request.id,
                      approval.id,
                      'Approved',
                      comments[`${request.id}-${approval.id}`] || 'Approved',
                    )
                  }
                >
                  <Check size={15} />
                  Approve
                </Button>
              </div>
              <div className="lg:col-span-2">
                <label
                  className="text-xs font-semibold text-foreground-muted"
                  htmlFor={`comment-${request.id}-${approval.id}`}
                >
                  Decision comment{' '}
                  {comments[`${request.id}-${approval.id}`]?.trim()
                    ? ''
                    : '(required to return or reject)'}
                </label>
                <input
                  id={`comment-${request.id}-${approval.id}`}
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                  value={comments[`${request.id}-${approval.id}`] ?? ''}
                  onChange={(event) =>
                    setComments((current) => ({
                      ...current,
                      [`${request.id}-${approval.id}`]: event.target.value,
                    }))
                  }
                  placeholder="Add the reason or approval note"
                />
                {approval.assignee === user?.name || request.requester === user?.name ? (
                  <p className="mt-2 text-xs font-medium text-error">Self-approval is blocked.</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {pending.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-semibold">Approval queue is clear</p>
            <p className="mt-1 text-sm text-foreground-muted">
              New assigned decisions will appear here.
            </p>
          </div>
        ) : null}
      </Panel>
    </section>
  );
}
