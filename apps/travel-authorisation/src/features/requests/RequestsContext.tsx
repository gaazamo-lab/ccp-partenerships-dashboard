import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useToast } from '@rfdtech/components';

import { ApiError, type TravelRepository } from '@partner-crm/api-client';
import type { ApiEnvelope } from '@partner-crm/types';

import { travelRepository } from './data/repository';
import { canSubmit } from './domain';
import { INITIAL_REQUESTS } from './mockData';
import { RequestsContext, type RequestsContextValue } from './requests-context';
import type { ApprovalStatus, NewTravelRequest, RequestStatus, TravelRequest } from './types';

const STORAGE_KEY = 's084.preview.requests';

/** `null` in mock mode; the provider then keeps the seeded in-memory register. */
const repository = travelRepository;

function errorText(cause: unknown): string {
  if (cause instanceof ApiError) return cause.message;
  return cause instanceof Error ? cause.message : 'The S084 API did not respond.';
}

/**
 * The server appends history, documents and notifications oldest-first; the
 * screens (and the optimistic local changes) keep them latest-first.
 */
function fromApi(request: TravelRequest): TravelRequest {
  return {
    ...request,
    history: [...request.history].reverse(),
    issuedDocuments: request.issuedDocuments ? [...request.issuedDocuments].reverse() : [],
    notifications: request.notifications ? [...request.notifications].reverse() : [],
  };
}

function nowLabel() {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function nextStatus(status: RequestStatus): RequestStatus | null {
  if (status === 'Submitted') return 'Screening';
  if (status === 'Screening') return 'Pending approvals';
  if (status === 'Support issued' || status === 'Travel authorised') return 'Completed';
  return null;
}

/** A local draft, before (or without) the server's own record replacing it. */
function buildDraft(input: NewTravelRequest, id: string, reference: string): TravelRequest {
  const now = new Date().toISOString().slice(0, 10);
  const evidence =
    input.category === 'Student outbound travel'
      ? [
          {
            label: 'Passport bio page',
            required: true,
            sensitive: true,
            status: 'Missing' as const,
          },
          { label: 'Travel itinerary', required: true, status: 'Missing' as const },
          {
            label: 'Proof of enrolment',
            required: true,
            sensitive: true,
            status: 'Missing' as const,
          },
          {
            label: 'Sponsor or funding confirmation',
            required: true,
            sensitive: true,
            status: 'Missing' as const,
          },
          {
            label: 'Parent or guardian consent',
            required: true,
            sensitive: true,
            status: 'Missing' as const,
          },
        ]
      : input.direction === 'Inbound'
        ? [
            {
              label: 'Passport bio page',
              required: true,
              sensitive: true,
              status: 'Missing' as const,
            },
            {
              label: 'Invitation or appointment letter',
              required: true,
              status: 'Missing' as const,
            },
            { label: 'Travel itinerary', required: true, status: 'Missing' as const },
          ]
        : [
            {
              label: 'Invitation or business case',
              required: true,
              status: 'Missing' as const,
            },
            { label: 'Travel itinerary', required: true, status: 'Missing' as const },
            {
              label: 'Funding confirmation',
              required: true,
              sensitive: true,
              status: 'Missing' as const,
            },
          ];
  const created: TravelRequest = {
    ...input,
    id,
    reference,
    owner: input.traveller,
    requester: input.traveller,
    status: 'Draft',
    nextAction: 'Complete evidence checklist',
    updatedAt: now,
    policyVersion: 'TRV-4.2',
    recordVersion: 1,
    evidence,
    approvals:
      input.category === 'Student outbound travel'
        ? [
            {
              id: 'student-affairs',
              label: 'Student Affairs review',
              assignee: 'Student Affairs queue',
              status: 'Pending',
            },
            {
              id: 'academic',
              label: 'Academic approval',
              assignee: 'Academic Affairs queue',
              status: 'Pending',
            },
            {
              id: 'senior',
              label: 'Senior authority',
              assignee: 'Senior authority queue',
              status: 'Pending',
            },
          ]
        : input.direction === 'Outbound'
          ? [
              {
                id: 'manager',
                label: 'Line manager',
                assignee: 'Pending hierarchy lookup',
                status: 'Pending',
              },
              {
                id: 'senior',
                label: 'Senior authority',
                assignee: 'Pending routing',
                status: 'Pending',
              },
              {
                id: 'rmf',
                label: 'RMF cost review',
                assignee: 'RMF queue',
                status: 'Pending',
              },
            ]
          : [
              {
                id: 'ir',
                label: 'IR completeness review',
                assignee: 'IR queue',
                status: 'Pending',
              },
              {
                id: 'senior',
                label: 'Senior authority',
                assignee: 'Pending routing',
                status: 'Pending',
              },
            ],
    integrations:
      input.direction === 'Inbound'
        ? [
            {
              system: 'S083',
              label: 'Delegation record',
              status: input.sourceReference ? 'Complete' : 'Not started',
              reference: input.sourceReference,
            },
            { system: 'GIS', label: 'Clearance liaison', status: 'Not started' },
            { system: 'S031', label: 'Accommodation', status: 'Not started' },
            { system: 'S003', label: 'Official records', status: 'Not started' },
            { system: 'S074', label: 'Official communications', status: 'Not started' },
          ]
        : [
            {
              system: 'S140',
              label: 'Staff and policy',
              status: input.sourceReference ? 'Complete' : 'Not started',
              reference: input.sourceReference,
            },
            { system: 'S144', label: 'Estimate and claim handoff', status: 'Not started' },
            { system: 'S003', label: 'Official records', status: 'Not started' },
            { system: 'S074', label: 'Official communications', status: 'Not started' },
          ],
    notifications: [],
    issuedDocuments: [],
    history: [{ title: 'Draft created', detail: `Created for ${input.traveller}`, at: 'Just now' }],
  };
  return created;
}

export function RequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequestsState] = useState<TravelRequest[]>(() => {
    if (repository) return [];
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return INITIAL_REQUESTS;
    try {
      return JSON.parse(stored) as TravelRequest[];
    } catch {
      return INITIAL_REQUESTS;
    }
  });
  const [loading, setLoading] = useState(repository !== null);
  const [error, setError] = useState<string | null>(null);

  const setRequests = (updater: (current: TravelRequest[]) => TravelRequest[]) => {
    setRequestsState((current) => {
      const next = updater(current);
      // The seeded register survives a refresh; server data is reloaded instead.
      if (!repository) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const { toast } = useToast();
  // Held in a ref so `mirror` stays stable and does not re-run the loader.
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const loadGeneration = useRef(0);

  /**
   * Starts a fetch of the register. State is written only in the promise
   * callbacks — never synchronously — so mounting the provider cannot cascade
   * a second render, and a newer fetch supersedes an older one still in flight.
   */
  const load = useCallback(() => {
    if (!repository) return;
    const generation = (loadGeneration.current += 1);
    repository
      .list()
      .then((response) => {
        if (generation !== loadGeneration.current) return;
        setRequestsState(response.data.map(fromApi));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (generation !== loadGeneration.current) return;
        // S084 can be unavailable while the other portals are fine; say so
        // rather than showing an empty workspace as if there were no work.
        setError(errorText(cause));
      })
      .finally(() => {
        if (generation === loadGeneration.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replaceRequest = useCallback((serverRecord: TravelRequest) => {
    const updated = fromApi(serverRecord);
    setRequestsState((current) => {
      const known = current.some((item) => item.id === updated.id);
      return known
        ? current.map((item) => (item.id === updated.id ? updated : item))
        : [updated, ...current];
    });
  }, []);

  /**
   * Mirrors an optimistic local change to the API. On success the server's
   * record replaces the local one, so server-side effects — the allocated
   * reference, the recomputed next action, the history entry — appear. On
   * failure the register reloads, reverting the optimistic change, and the
   * server's own message is shown.
   */
  const mirror = useCallback(
    (call: (repo: TravelRepository) => Promise<ApiEnvelope<TravelRequest>>, failure: string) => {
      if (!repository) return;
      call(repository)
        .then((response) => replaceRequest(response.data))
        .catch((cause: unknown) => {
          toastRef.current({
            title: failure,
            description: `${errorText(cause)} Your change has been reverted.`,
            variant: 'error',
          });
          load();
        });
    },
    [load, replaceRequest],
  );

  const value = useMemo<RequestsContextValue>(
    () => ({
      requests,
      loading,
      error,
      reload: load,
      createRequest(input) {
        const id = `S084-2026-${String(43 + requests.length).padStart(4, '0')}`;
        setRequests((current) => [buildDraft(input, id, id), ...current]);
        return id;
      },
      setEvidence(requestId, evidenceIndex, status, detail) {
        setRequests((current) =>
          current.map((request) => {
            if (request.id !== requestId) return request;
            const evidence = request.evidence.map((item, index) =>
              index === evidenceIndex
                ? {
                    ...item,
                    required: item.required ?? true,
                    sensitive: item.sensitive ?? index === 0,
                    status,
                    reference:
                      status === 'Received' ? detail || `S003-EVD-${Date.now()}` : undefined,
                    exceptionReason: status === 'Exception' ? detail : undefined,
                    reviewedBy: status !== 'Missing' ? 'Current reviewer' : undefined,
                  }
                : item,
            );
            return {
              ...request,
              evidence,
              updatedAt: new Date().toISOString().slice(0, 10),
              history: [
                {
                  title: `Evidence marked ${status.toLowerCase()}`,
                  detail: request.evidence[evidenceIndex]?.label ?? 'Evidence item',
                  at: nowLabel(),
                },
                ...request.history,
              ],
            };
          }),
        );
      },
      advanceRequest(requestId) {
        const request = requests.find((item) => item.id === requestId);
        if (!request) return { ok: false, message: 'Request not found.' };
        if (['Draft', 'Returned'].includes(request.status)) {
          if (!canSubmit(request))
            return { ok: false, message: 'Complete all required evidence before submission.' };
          setRequests((current) =>
            current.map((item) =>
              item.id === requestId
                ? {
                    ...item,
                    status: 'Submitted',
                    submittedAt: new Date().toISOString(),
                    nextAction: 'Start completeness screening',
                    updatedAt: new Date().toISOString().slice(0, 10),
                    history: [
                      {
                        title: 'Request submitted',
                        detail: `Record version ${item.recordVersion ?? 1} submitted for screening`,
                        at: nowLabel(),
                      },
                      ...item.history,
                    ],
                  }
                : item,
            ),
          );
          return { ok: true };
        }
        const next = nextStatus(request.status);
        if (!next)
          return {
            ok: false,
            message: 'Use the appropriate decision or issuance action for this state.',
          };
        setRequests((current) =>
          current.map((item) =>
            item.id === requestId
              ? {
                  ...item,
                  status: next,
                  nextAction:
                    next === 'Screening'
                      ? 'Complete screening'
                      : next === 'Pending approvals'
                        ? 'Await assigned decisions'
                        : next === 'Completed'
                          ? 'Record closure details'
                          : item.nextAction,
                  updatedAt: new Date().toISOString().slice(0, 10),
                  history: [
                    {
                      title: `Status changed to ${next}`,
                      detail: 'Workflow transition recorded',
                      at: nowLabel(),
                    },
                    ...item.history,
                  ],
                }
              : item,
          ),
        );
        return { ok: true };
      },
      decideApproval(requestId, approvalId, decision, comment) {
        setRequests((current) =>
          current.map((request) => {
            if (request.id !== requestId) return request;
            const approvals = request.approvals.map((approval) =>
              approval.id === approvalId
                ? {
                    ...approval,
                    status: decision,
                    comment,
                    decidedAt: nowLabel(),
                    recordVersion: request.recordVersion ?? 1,
                  }
                : approval,
            );
            const complete = approvals.every((approval) => approval.status !== 'Pending');
            const status: RequestStatus =
              decision === 'Returned'
                ? 'Returned'
                : decision === 'Rejected'
                  ? 'Rejected'
                  : complete
                    ? 'Approved'
                    : request.status;
            return {
              ...request,
              approvals,
              status,
              nextAction:
                decision === 'Returned'
                  ? 'Address reviewer comments and resubmit'
                  : decision === 'Rejected'
                    ? 'No further action'
                    : complete
                      ? request.direction === 'Inbound'
                        ? 'Generate support letter'
                        : 'Issue travel authorisation'
                      : request.nextAction,
              updatedAt: new Date().toISOString().slice(0, 10),
              history: [
                {
                  title: `${approvals.find((item) => item.id === approvalId)?.label ?? 'Approval'} ${decision.toLowerCase()}`,
                  detail: comment || 'Decision recorded',
                  at: nowLabel(),
                },
                ...request.history,
              ],
            };
          }),
        );
      },
      saveEstimate(requestId, input) {
        setRequests((current) =>
          current.map((request) =>
            request.id === requestId
              ? {
                  ...request,
                  estimate: { ...input, perDiem: input.eligibleDays * input.dailyRate },
                  updatedAt: new Date().toISOString().slice(0, 10),
                  history: [
                    {
                      title: 'Cost estimate updated',
                      detail: `${input.currency} rates from ${input.rateVersion} applied`,
                      at: nowLabel(),
                    },
                    ...request.history,
                  ],
                }
              : request,
          ),
        );
      },
      issueDocument(requestId, signatory, templateVersion) {
        setRequests((current) =>
          current.map((request) => {
            if (request.id !== requestId || request.status !== 'Approved') return request;
            const type =
              request.direction === 'Inbound'
                ? ('Support letter' as const)
                : ('Travel authorisation' as const);
            const reference = `S003-${request.direction === 'Inbound' ? 'LTR' : 'AUT'}-${Date.now().toString().slice(-6)}`;
            return {
              ...request,
              status: request.direction === 'Inbound' ? 'Support issued' : 'Travel authorised',
              nextAction:
                request.direction === 'Inbound'
                  ? 'Track GIS and accommodation outcomes'
                  : 'Complete travel and link claim',
              issuedDocuments: [
                {
                  id: reference,
                  type,
                  reference,
                  templateVersion,
                  signatory,
                  issuedAt: nowLabel(),
                  status: 'Current',
                },
                ...(request.issuedDocuments ?? []),
              ],
              integrations: request.integrations.map((item) =>
                item.system === 'S003'
                  ? { ...item, status: 'Complete', reference, updatedAt: nowLabel() }
                  : item,
              ),
              notifications: [
                {
                  id: `NTF-${Date.now()}`,
                  subject: `${type} issued`,
                  recipient: request.traveller,
                  status: 'Delivered',
                  correlationId: `S074-${Date.now()}`,
                  sentAt: nowLabel(),
                },
                ...(request.notifications ?? []),
              ],
              history: [
                {
                  title: `${type} issued`,
                  detail: `${reference} signed by ${signatory}`,
                  at: nowLabel(),
                },
                ...request.history,
              ],
            };
          }),
        );
      },
      amendRequest(requestId, input) {
        setRequests((current) =>
          current.map((request) => {
            if (request.id !== requestId) return request;
            const hadApproval = [
              'Approved',
              'Support issued',
              'Travel authorised',
              'Completed',
            ].includes(request.status);
            return {
              ...request,
              destination: input.destination,
              startDate: input.startDate,
              endDate: input.endDate,
              recordVersion: (request.recordVersion ?? 1) + 1,
              lastChangeReason: input.reason,
              status: hadApproval ? 'Pending approvals' : request.status,
              nextAction: hadApproval ? 'Renew invalidated approvals' : request.nextAction,
              approvals: hadApproval
                ? request.approvals.map((approval) => ({
                    ...approval,
                    status: 'Pending' as ApprovalStatus,
                    decidedAt: undefined,
                    comment: undefined,
                  }))
                : request.approvals,
              issuedDocuments: request.issuedDocuments?.map((document) => ({
                ...document,
                status: 'Superseded' as const,
              })),
              history: [
                { title: 'Material change recorded', detail: input.reason, at: nowLabel() },
                ...request.history,
              ],
            };
          }),
        );
      },
      cancelRequest(requestId, reason) {
        setRequests((current) =>
          current.map((request) =>
            request.id === requestId
              ? {
                  ...request,
                  status: 'Cancelled',
                  cancellationReason: reason,
                  nextAction: 'Reconcile linked bookings and notifications',
                  issuedDocuments: request.issuedDocuments?.map((document) => ({
                    ...document,
                    status: 'Superseded' as const,
                  })),
                  notifications: [
                    {
                      id: `NTF-${Date.now()}`,
                      subject: 'Travel request cancelled',
                      recipient: request.traveller,
                      status: 'Pending',
                      correlationId: `S074-${Date.now()}`,
                      sentAt: nowLabel(),
                    },
                    ...(request.notifications ?? []),
                  ],
                  history: [
                    { title: 'Request cancelled', detail: reason, at: nowLabel() },
                    ...request.history,
                  ],
                }
              : request,
          ),
        );
      },
      updateIntegration(requestId, system, status, reference, note) {
        setRequests((current) =>
          current.map((request) => {
            if (request.id !== requestId) return request;
            const exists = request.integrations.some((item) => item.system === system);
            const integrations = exists
              ? request.integrations.map((item) =>
                  item.system === system
                    ? {
                        ...item,
                        status,
                        reference: reference || item.reference,
                        note,
                        correlationId: item.correlationId ?? `COR-${Date.now()}`,
                        updatedAt: nowLabel(),
                      }
                    : item,
                )
              : [
                  ...request.integrations,
                  {
                    system,
                    label: `${system} handoff`,
                    status,
                    reference,
                    note,
                    correlationId: `COR-${Date.now()}`,
                    updatedAt: nowLabel(),
                  },
                ];
            return {
              ...request,
              integrations,
              history: [
                {
                  title: `${system} status updated`,
                  detail: `${status}${note ? ` — ${note}` : ''}`,
                  at: nowLabel(),
                },
                ...request.history,
              ],
            };
          }),
        );
      },
      closeRequest(requestId, closure) {
        setRequests((current) =>
          current.map((request) =>
            request.id === requestId
              ? {
                  ...request,
                  status: 'Closed',
                  nextAction: 'No further action',
                  closure: { ...closure, closedAt: nowLabel() },
                  history: [
                    { title: 'Request closed', detail: closure.outcome, at: nowLabel() },
                    ...request.history,
                  ],
                }
              : request,
          ),
        );
      },
      retryNotification(requestId, notificationId) {
        setRequests((current) =>
          current.map((request) =>
            request.id === requestId
              ? {
                  ...request,
                  notifications: request.notifications?.map((item) =>
                    item.id === notificationId
                      ? { ...item, status: 'Delivered', sentAt: nowLabel() }
                      : item,
                  ),
                  history: [
                    { title: 'Notification delivered', detail: notificationId, at: nowLabel() },
                    ...request.history,
                  ],
                }
              : request,
          ),
        );
      },
    }),
    [requests, loading, error, load],
  );

  /**
   * API mode. Each method applies the same optimistic local change as the mock
   * path — so the screen responds at once — and mirrors the call to S084, which
   * is the authority on every gate and state transition.
   */
  const apiValue = useMemo<RequestsContextValue>(
    () => ({
      ...value,
      loading,
      error,
      reload: load,
      createRequest(input) {
        const id = crypto.randomUUID();
        // Show the draft at once so the detail route the caller navigates to
        // resolves; the server's record (real reference, ids) replaces it.
        setRequestsState((current) => [buildDraft(input, id, 'Pending reference'), ...current]);
        mirror((repo) => repo.create(input, id), 'Travel request was not created');
        return id;
      },
      setEvidence(requestId, evidenceIndex, status, detail) {
        value.setEvidence(requestId, evidenceIndex, status, detail);
        mirror(
          (repo) => repo.setEvidence(requestId, evidenceIndex, { status, detail }),
          'Evidence decision was not saved',
        );
      },
      advanceRequest(requestId) {
        const request = requests.find((item) => item.id === requestId);
        if (!request) return { ok: false, message: 'Request not found.' };
        // Answer the caller now from the same rule the server enforces; the
        // server remains the authority and will revert anything it refuses.
        if (['Draft', 'Returned'].includes(request.status) && !canSubmit(request)) {
          return { ok: false, message: 'Complete all required evidence before submission.' };
        }
        mirror((repo) => repo.advance(requestId), 'Request was not moved forward');
        return { ok: true };
      },
      decideApproval(requestId, approvalId, decision, comment) {
        mirror(
          (repo) => repo.decideApproval(requestId, approvalId, { decision, comment }),
          'Approval decision was not recorded',
        );
      },
      saveEstimate(requestId, input) {
        mirror((repo) => repo.saveEstimate(requestId, input), 'Estimate was not saved');
      },
      issueDocument(requestId, signatory, templateVersion) {
        mirror(
          (repo) => repo.issueDocument(requestId, { signatory, templateVersion }),
          'Document was not issued',
        );
      },
      amendRequest(requestId, input) {
        mirror((repo) => repo.amend(requestId, input), 'Amendment was not saved');
      },
      cancelRequest(requestId, reason) {
        mirror((repo) => repo.cancel(requestId, { reason }), 'Request was not cancelled');
      },
      updateIntegration(requestId, system, status, reference, note) {
        mirror(
          (repo) => repo.updateIntegration(requestId, { system, status, reference, note }),
          'Handoff was not updated',
        );
      },
      closeRequest(requestId, closure) {
        mirror((repo) => repo.close(requestId, closure), 'Request was not closed');
      },
      retryNotification(requestId, notificationId) {
        // S074 delivery is retried by the backend's outbox relay, not from here.
        // Reload so the workspace picks up the relay's own result.
        value.retryNotification(requestId, notificationId);
        load();
      },
    }),
    [value, loading, error, load, mirror, requests],
  );

  return (
    <RequestsContext.Provider value={repository ? apiValue : value}>
      {children}
    </RequestsContext.Provider>
  );
}
