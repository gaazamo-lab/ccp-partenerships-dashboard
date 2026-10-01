import { type ReactNode, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Badge, Button, Notice, ProgressBar } from '@rfdtech/components';
import {
  CalendarDays,
  Check,
  CircleDollarSign,
  FileCheck2,
  FileText,
  MapPin,
  Plane,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Panel } from '@/components/Panel';
import { StatusBadge } from '@/components/StatusBadge';
import { ROUTES } from '@/constants/routes';
import { useOperationalRole } from '@/features/access/role-context';
import { usePermittedRequests } from '@/features/access/usePermittedRequests';

import { estimateTotal, evidenceReady, nextWorkflowAction } from './domain';
import { formatTimestamp } from './format';
import { useRequests } from './requests-context';
import type { IntegrationStatus } from './types';

type ModalName =
  'estimate' | 'issue' | 'amend' | 'cancel' | 'close' | 'evidence' | 'integration' | null;

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-foreground-muted hover:bg-surface-subtle"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

const integrationVariant = (status: IntegrationStatus) =>
  status === 'Complete'
    ? ('success' as const)
    : status === 'Failed'
      ? ('error' as const)
      : status === 'Pending'
        ? ('warning' as const)
        : ('outline' as const);

export function Component() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { canOperate } = useOperationalRole();
  const {
    setEvidence,
    advanceRequest,
    saveEstimate,
    issueDocument,
    amendRequest,
    cancelRequest,
    updateIntegration,
    closeRequest,
    retryNotification,
  } = useRequests();
  const requests = usePermittedRequests();
  const request = requests.find((item) => item.id === requestId);
  const [modal, setModal] = useState<ModalName>(null);
  const [message, setMessage] = useState('');
  const [selectedEvidence, setSelectedEvidence] = useState(0);
  const [selectedSystem, setSelectedSystem] = useState('');
  const [detail, setDetail] = useState('');

  const estimate = useMemo(
    () =>
      request?.estimate ?? {
        currency: 'GHS',
        eligibleDays: 1,
        dailyRate: 0,
        perDiem: 0,
        transport: 0,
        accommodation: 0,
        other: 0,
        rateVersion: 'TRV-4.2',
      },
    [request],
  );
  const [estimateForm, setEstimateForm] = useState(() => ({
    currency: estimate.currency,
    eligibleDays: estimate.eligibleDays ?? 1,
    dailyRate:
      estimate.dailyRate ?? Math.round(estimate.perDiem / Math.max(estimate.eligibleDays ?? 1, 1)),
    transport: estimate.transport,
    accommodation: estimate.accommodation,
    other: estimate.other ?? 0,
    rateVersion: estimate.rateVersion ?? 'TRV-4.2',
  }));

  if (!request)
    return (
      <section className="flex flex-col gap-body">
        <PageHeader
          title="Request not found"
          backTo={{ to: ROUTES.REQUESTS, label: 'Back to requests' }}
        />
        <Notice variant="error" title="No matching record">
          This request does not exist in the current workspace.
        </Notice>
      </section>
    );

  const approved = request.approvals.filter((item) => item.status === 'Approved').length;
  const total = estimateTotal(request);
  const primaryAction = () => {
    setMessage('');
    if (
      [
        'Draft',
        'Returned',
        'Submitted',
        'Screening',
        'Support issued',
        'Travel authorised',
      ].includes(request.status)
    ) {
      const result = advanceRequest(request.id);
      if (!result.ok) setMessage(result.message ?? 'The action could not be completed.');
    } else if (request.status === 'Pending approvals') navigate(ROUTES.APPROVALS);
    else if (request.status === 'Approved') {
      if (request.direction === 'Outbound' && !request.estimate) {
        setMessage('Prepare the approved cost estimate before issuing travel authorisation.');
        return;
      }
      setModal('issue');
    } else if (request.status === 'Completed') setModal('close');
  };

  return (
    <section className="flex flex-col gap-body">
      <PageHeader
        title={request.traveller}
        // description={`${request.category} · ${request.reference}`}
        backTo={{ to: ROUTES.REQUESTS, label: 'Back to requests' }}
        meta={
          <>
            <StatusBadge status={request.status} />
            <Badge variant="outline">{request.direction}</Badge>
            <Badge variant="outline">Version {request.recordVersion ?? 1}</Badge>
            <Badge variant="outline">Policy {request.policyVersion}</Badge>
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              disabled={!canOperate || ['Cancelled', 'Closed', 'Rejected'].includes(request.status)}
              onClick={() => setModal('amend')}
            >
              Record change
            </Button>
            <Button
              variant="outline"
              disabled={!canOperate || ['Cancelled', 'Closed'].includes(request.status)}
              onClick={() => setModal('cancel')}
            >
              Cancel
            </Button>
            {!['Cancelled', 'Closed', 'Rejected'].includes(request.status) ? (
              <Button
                disabled={!canOperate && request.status !== 'Pending approvals'}
                onClick={primaryAction}
              >
                {nextWorkflowAction(request)}
              </Button>
            ) : null}
          </>
        }
      />
      {message ? (
        <Notice variant="error" title="Action required">
          {message}
        </Notice>
      ) : null}
      {request.direction === 'Inbound' ? (
        <Notice variant="warning" title="Institutional support only">
          Approval and support documents do not constitute a visa issuance decision. GIS clearance
          is tracked separately.
        </Notice>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel
            title="Request summary"
            // description="Authoritative request data and applied policy"
          >
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [UserRound, 'Traveller', request.traveller],
                [MapPin, 'Destination', request.destination],
                [CalendarDays, 'Travel dates', `${request.startDate} — ${request.endDate}`],
                [Plane, 'Purpose', request.purpose],
              ].map(([Icon, label, value]) => {
                const Glyph = Icon as typeof UserRound;
                return (
                  <div key={String(label)}>
                    <Glyph size={18} className="mb-2 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                      {String(label)}
                    </p>
                    <p className="mt-1 text-sm font-medium">{String(value)}</p>
                  </div>
                );
              })}
            </div>
            {request.sourceReference ? (
              <div className="mt-5 rounded-lg bg-surface-subtle px-4 py-3 text-sm">
                <span className="text-foreground-muted">Linked source: </span>
                <span className="font-semibold">{request.sourceReference}</span>
              </div>
            ) : null}
            {request.lastChangeReason ? (
              <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
                <span className="font-semibold">Latest amendment: </span>
                {request.lastChangeReason}
              </div>
            ) : null}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title="Evidence workspace"
              // description={
              // evidenceReady(request)
              // ? 'Required evidence is ready'
              // : 'Submission is blocked until required evidence is supplied or excepted'
              // }
              actions={
                <Badge variant={evidenceReady(request) ? 'success' : 'warning'}>
                  {request.evidence.filter((item) => item.status !== 'Missing').length}/
                  {request.evidence.length}
                </Badge>
              }
            >
              <div className="space-y-3">
                {request.evidence.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="rounded-lg border border-border-subtle p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex items-start gap-2 text-sm font-medium">
                        <FileText size={17} className="mt-0.5 shrink-0 text-foreground-muted" />
                        <span>
                          {item.label}
                          <span className="mt-1 block text-xs font-normal text-foreground-muted">
                            {(item.sensitive ?? index === 0)
                              ? 'Restricted evidence'
                              : 'Standard evidence'}
                            {item.reference ? ` · ${item.reference}` : ''}
                            {item.exceptionReason ? ` · Exception: ${item.exceptionReason}` : ''}
                          </span>
                        </span>
                      </span>
                      <Badge
                        variant={
                          item.status === 'Received'
                            ? 'success'
                            : item.status === 'Exception'
                              ? 'warning'
                              : 'error'
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canOperate}
                        onClick={() => {
                          setSelectedEvidence(index);
                          setDetail('');
                          setModal('evidence');
                        }}
                      >
                        Update
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!canOperate}
                        onClick={() => setEvidence(request.id, index, 'Missing')}
                      >
                        Mark missing
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Approval route"
              // description="Decisions are retained against their record version"
              actions={
                <Badge variant="outline">
                  {approved}/{request.approvals.length}
                </Badge>
              }
            >
              <div className="space-y-4">
                {request.approvals.map((step, index) => (
                  <div key={step.id} className="flex gap-3">
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-full ${step.status === 'Approved' ? 'bg-success/10 text-success' : step.status === 'Rejected' ? 'bg-error/10 text-error' : 'bg-surface-subtle text-foreground-muted'}`}
                    >
                      {step.status === 'Approved' ? <Check size={16} /> : index + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{step.label}</p>
                        <Badge
                          variant={
                            step.status === 'Approved'
                              ? 'success'
                              : step.status === 'Rejected'
                                ? 'error'
                                : step.status === 'Returned'
                                  ? 'warning'
                                  : 'outline'
                          }
                        >
                          {step.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground-muted">
                        {step.assignee}
                        {step.decidedAt ? ` · ${formatTimestamp(step.decidedAt)}` : ''}
                        {step.recordVersion ? ` · v${step.recordVersion}` : ''}
                      </p>
                      {step.comment ? <p className="mt-1 text-xs">{step.comment}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel
            title="Cost estimate"
            // description="Pre-travel estimate only; settlement remains in S144"
            actions={
              <>
                <Badge variant="outline">{request.estimate?.currency ?? 'Not prepared'}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canOperate}
                  onClick={() => setModal('estimate')}
                >
                  Edit estimate
                </Button>
              </>
            }
          >
            {request.estimate ? (
              <div className="grid gap-4 sm:grid-cols-5">
                {[
                  ['Per diem', request.estimate.perDiem],
                  ['Transport', request.estimate.transport],
                  ['Accommodation', request.estimate.accommodation],
                  ['Other', request.estimate.other ?? 0],
                  ['Estimated total', total],
                ].map(([label, value], index) => (
                  <div
                    key={String(label)}
                    className={index === 4 ? 'rounded-lg bg-primary/5 p-3' : 'p-3'}
                  >
                    <p className="text-xs text-foreground-muted">{label}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {request.estimate?.currency} {Number(value).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-5 text-center text-sm text-foreground-muted">
                No estimate has been prepared.
              </p>
            )}
          </Panel>

          <Panel
            title="Issued documents" /* description="Official versions and superseded records" */
          >
            <div className="space-y-3">
              {request.issuedDocuments?.length ? (
                request.issuedDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle p-4"
                  >
                    <div className="flex items-center gap-3">
                      <FileCheck2 size={20} className="text-primary" />
                      <div>
                        <p className="text-sm font-semibold">
                          {document.type} · {document.reference}
                        </p>
                        <p className="text-xs text-foreground-muted">
                          Template {document.templateVersion} · {document.signatory} ·{' '}
                          {formatTimestamp(document.issuedAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={document.status === 'Current' ? 'success' : 'warning'}>
                      {document.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="py-5 text-center text-sm text-foreground-muted">
                  No official document has been issued.
                </p>
              )}
            </div>
          </Panel>

          <Panel
            title="External coordination"
            // description="Acknowledgement and business outcome are tracked independently"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {request.integrations.map((item) => (
                <button
                  type="button"
                  key={`${item.system}-${item.label}`}
                  disabled={!canOperate}
                  onClick={() => {
                    setSelectedSystem(item.system);
                    setDetail(item.note ?? '');
                    setModal('integration');
                  }}
                  className="rounded-lg border border-border-subtle p-4 text-left hover:border-primary/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.system}</span>
                    <Badge variant={integrationVariant(item.status)}>{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground-muted">{item.label}</p>
                  {item.reference ? (
                    <p className="mt-1 text-xs font-medium">{item.reference}</p>
                  ) : null}
                  {item.correlationId ? (
                    <p className="mt-1 text-xs text-foreground-muted">
                      Correlation {item.correlationId}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Official notifications" /* description="Delivery references from S074" */>
            <div className="space-y-3">
              {request.notifications?.length ? (
                request.notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{notification.subject}</p>
                      <p className="text-xs text-foreground-muted">
                        To {notification.recipient} · {notification.correlationId} ·{' '}
                        {formatTimestamp(notification.sentAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          notification.status === 'Delivered'
                            ? 'success'
                            : notification.status === 'Failed'
                              ? 'error'
                              : 'warning'
                        }
                      >
                        {notification.status}
                      </Badge>
                      {notification.status !== 'Delivered' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryNotification(request.id, notification.id)}
                        >
                          <RefreshCw size={14} />
                          Retry
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-5 text-center text-sm text-foreground-muted">
                  No official messages recorded.
                </p>
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Current action">
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck size={20} />
              </span>
              <div>
                <p className="font-semibold">{request.nextAction}</p>
                <p className="mt-1 text-sm text-foreground-muted">Owner: {request.owner}</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs font-medium">
                <span>Approval progress</span>
                <span>{Math.round((approved / request.approvals.length) * 100)}%</span>
              </div>
              <ProgressBar value={(approved / request.approvals.length) * 100} size="sm" />
            </div>
          </Panel>
          {request.closure ? (
            <Panel title="Closure record">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-foreground-muted">Outcome</dt>
                  <dd className="font-medium">{request.closure.outcome}</dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">Actual dates</dt>
                  <dd>
                    {request.closure.actualStartDate || 'Not known'} —{' '}
                    {request.closure.actualEndDate || 'Not known'}
                  </dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">Claim reference</dt>
                  <dd>{request.closure.claimReference || 'None'}</dd>
                </div>
                <div>
                  <dt className="text-foreground-muted">Closed</dt>
                  <dd>{request.closure.closedAt}</dd>
                </div>
              </dl>
            </Panel>
          ) : null}
          <Panel title="Activity history" /* description="Latest first" */>
            <div className="space-y-5">
              {request.history.map((item, index) => (
                <div key={`${item.title}-${item.at}-${index}`} className="relative pl-6">
                  <span className="absolute left-0 top-1 size-2.5 rounded-full bg-primary" />
                  {index < request.history.length - 1 ? (
                    <span className="absolute left-[4px] top-4 h-[calc(100%+8px)] w-px bg-border-subtle" />
                  ) : null}
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-foreground-muted">{item.detail}</p>
                  <p className="mt-1 text-xs font-medium text-foreground-muted">
                    {formatTimestamp(item.at)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
          <Button variant="outline" className="w-full" onClick={() => navigate(ROUTES.REPORTS)}>
            <CircleDollarSign size={17} />
            View reporting
          </Button>
        </aside>
      </div>

      {modal === 'evidence' ? (
        <Modal
          title={`Update ${request.evidence[selectedEvidence]?.label ?? 'evidence'}`}
          onClose={() => setModal(null)}
        >
          <label className="text-sm font-medium">
            Document reference or exception reason
            <input
              className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder="S003 reference or approved exception reason"
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={!detail.trim()}
              onClick={() => {
                setEvidence(request.id, selectedEvidence, 'Exception', detail);
                setModal(null);
              }}
            >
              Record exception
            </Button>
            <Button
              disabled={!detail.trim()}
              onClick={() => {
                setEvidence(request.id, selectedEvidence, 'Received', detail);
                setModal(null);
              }}
            >
              Mark received
            </Button>
          </div>
        </Modal>
      ) : null}

      {modal === 'estimate' ? (
        <Modal title="Prepare cost estimate" onClose={() => setModal(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ['currency', 'Currency', 'text'],
                ['eligibleDays', 'Eligible days', 'number'],
                ['dailyRate', 'Daily rate', 'number'],
                ['transport', 'Transport', 'number'],
                ['accommodation', 'Accommodation', 'number'],
                ['other', 'Other costs', 'number'],
                ['rateVersion', 'Rate version', 'text'],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key} className="text-sm font-medium">
                {label}
                <input
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                  type={type}
                  min={type === 'number' ? 0 : undefined}
                  value={estimateForm[key]}
                  onChange={(event) =>
                    setEstimateForm((current) => ({
                      ...current,
                      [key]: type === 'number' ? Number(event.target.value) : event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              onClick={() => {
                saveEstimate(request.id, estimateForm);
                setModal(null);
              }}
            >
              Save estimate
            </Button>
          </div>
        </Modal>
      ) : null}

      {modal === 'issue' ? (
        <Modal
          title={
            request.direction === 'Inbound' ? 'Issue support letter' : 'Issue travel authorisation'
          }
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              issueDocument(
                request.id,
                String(data.get('signatory')),
                String(data.get('template')),
              );
              setModal(null);
            }}
            className="space-y-4"
          >
            <label className="block text-sm font-medium">
              Approved template
              <select
                name="template"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
              >
                <option>S084 standard v3.1</option>
                <option>S084 executive v2.0</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Authorised signatory
              <input
                name="signatory"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                required
                defaultValue="Director, International Relations"
              />
            </label>
            <Notice variant="warning" title="Issuance gate">
              Issuing records the template, signatory, official reference and notification.
            </Notice>
            <div className="flex justify-end">
              <Button type="submit">Issue official document</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'amend' ? (
        <Modal title="Record material change" onClose={() => setModal(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              amendRequest(request.id, {
                destination: String(data.get('destination')),
                startDate: String(data.get('startDate')),
                endDate: String(data.get('endDate')),
                reason: String(data.get('reason')),
              });
              setModal(null);
            }}
            className="space-y-4"
          >
            <label className="block text-sm font-medium">
              Destination
              <input
                name="destination"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                required
                defaultValue={request.destination}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Start date
                <input
                  name="startDate"
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                  type="date"
                  required
                  defaultValue={request.startDate}
                />
              </label>
              <label className="text-sm font-medium">
                End date
                <input
                  name="endDate"
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                  type="date"
                  required
                  defaultValue={request.endDate}
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Reason
              <textarea
                name="reason"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2 min-h-24"
                required
              />
            </label>
            <Notice variant="warning" title="Material change">
              Existing approvals will be invalidated and issued documents marked superseded.
            </Notice>
            <div className="flex justify-end">
              <Button type="submit">Save and route for reapproval</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'cancel' ? (
        <Modal title="Cancel request" onClose={() => setModal(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              cancelRequest(request.id, String(new FormData(event.currentTarget).get('reason')));
              setModal(null);
            }}
          >
            <label className="block text-sm font-medium">
              Cancellation reason
              <textarea
                name="reason"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2 min-h-28"
                required
              />
            </label>
            <p className="mt-3 text-sm text-foreground-muted">
              Linked documents will be superseded and affected services marked for reconciliation.
            </p>
            <div className="mt-5 flex justify-end">
              <Button type="submit" variant="outline">
                Confirm cancellation
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'integration' ? (
        <Modal title={`Update ${selectedSystem}`} onClose={() => setModal(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              updateIntegration(
                request.id,
                selectedSystem,
                String(data.get('status')) as IntegrationStatus,
                String(data.get('reference')),
                String(data.get('note')),
              );
              setModal(null);
            }}
            className="space-y-4"
          >
            <label className="block text-sm font-medium">
              Status
              <select
                name="status"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                defaultValue={
                  request.integrations.find((item) => item.system === selectedSystem)?.status
                }
              >
                <option>Not started</option>
                <option>Pending</option>
                <option>Complete</option>
                <option>Failed</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              External reference
              <input
                name="reference"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                defaultValue={
                  request.integrations.find((item) => item.system === selectedSystem)?.reference
                }
              />
            </label>
            <label className="block text-sm font-medium">
              Liaison or reconciliation note
              <textarea
                name="note"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2 min-h-24"
                defaultValue={detail}
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit">Save status</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'close' ? (
        <Modal title="Close request" onClose={() => setModal(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              closeRequest(request.id, {
                outcome: String(data.get('outcome')),
                actualStartDate: String(data.get('actualStartDate')),
                actualEndDate: String(data.get('actualEndDate')),
                claimReference: String(data.get('claimReference')),
                unresolvedActions: String(data.get('unresolvedActions')),
              });
              setModal(null);
            }}
            className="space-y-4"
          >
            <label className="block text-sm font-medium">
              Final outcome
              <input
                name="outcome"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                required
                placeholder="Travel completed / Support concluded"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Actual start
                <input
                  name="actualStartDate"
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                  type="date"
                />
              </label>
              <label className="text-sm font-medium">
                Actual end
                <input
                  name="actualEndDate"
                  className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
                  type="date"
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              S144 claim reference
              <input
                name="claimReference"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2"
              />
            </label>
            <label className="block text-sm font-medium">
              Unresolved actions
              <textarea
                name="unresolvedActions"
                className="w-full rounded-[0.65rem] border border-border px-3.2 py-2.8 text-sm text-foreground placeholder:text-text-muted hover:border-[#b8c3cc] hover:bg-white focus:border-[#2f8fbd] focus:bg-white focus:shadow-[0_0_0_3px_rgba(7,108,163,0.12)] focus:outline-none transition-colors duration-150 mt-2 min-h-20"
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit">Close record</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
