import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useToast } from '@rfdtech/components';

import type { PartnershipsRepository } from '@partner-crm/api-client';
import { useAuth } from '@partner-crm/auth';
import type {
  ImportPartnershipInput,
  ObligationProgressNote,
  PartnershipAgreement,
  PartnershipHistoryEntry,
  PartnershipObligation,
  PartnershipRenewal,
  PartnershipRenewalAlert,
  PartnershipReview,
} from '@partner-crm/types';

import {
  errorText,
  loadAgreementChildren,
  loadObligationProgress,
  loadPortfolio,
  replaceForAgreement,
  replaceRecord,
  withEffectiveStatus,
} from '@/features/partnerships/data/portfolioLoader';
import { partnershipsRepository } from '@/features/partnerships/data/repository';
import { partitionPartnershipImports } from '@/features/partnerships/migration';
import { effectiveObligationStatus } from '@/features/partnerships/obligations';
import {
  createRenewalAlerts,
  effectiveRenewalAlertStatus,
} from '@/features/partnerships/renewalAlerts';
import {
  PartnershipsContext,
  type PartnershipsContextValue,
} from '@/features/partnerships/state/PartnershipsContext';

function nextReference(agreements: PartnershipAgreement[]) {
  return `CLET/MOU/${new Date().getFullYear()}/${String(agreements.length + 1).padStart(3, '0')}`;
}

export function PartnershipsProvider({
  children,
  repository = partnershipsRepository,
}: {
  children: ReactNode;
  /** Injectable for tests; production and local development use the HTTP repository. */
  repository?: PartnershipsRepository;
}) {
  const { toast } = useToast();
  const userId = useAuth().user?.id ?? null;
  // Held in a ref so the loaders and mutation mirror keep stable identities.
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const [agreements, setAgreements] = useState<PartnershipAgreement[]>([]);
  const [obligations, setObligations] = useState<PartnershipObligation[]>([]);
  const [obligationProgress, setObligationProgress] = useState<ObligationProgressNote[]>([]);
  const [reviews, setReviews] = useState<PartnershipReview[]>([]);
  const [history, setHistory] = useState<PartnershipHistoryEntry[]>([]);
  const [renewals, setRenewals] = useState<PartnershipRenewal[]>([]);
  const [renewalAlerts, setRenewalAlerts] = useState<PartnershipRenewalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  /** Client-generated UUIDs keep optimistic records stable when the server responds. */
  const newId = useCallback((_prefix: string) => crypto.randomUUID(), []);

  /**
   * Starts a whole-portfolio fetch. State is only written in the promise
   * callbacks, and a newer fetch supersedes an older one still in flight.
   */
  const fetchPortfolio = useCallback(() => {
    if (!repository) return;
    const generation = ++loadGeneration.current;
    const current = () => generation === loadGeneration.current;
    loadPortfolio(repository).then(
      (snapshot) => {
        if (!current()) return;
        setError(null);
        setAgreements(snapshot.agreements);
        setObligations(snapshot.obligations);
        setReviews(snapshot.reviews);
        setRenewals(snapshot.renewals);
        setRenewalAlerts(snapshot.renewalAlerts);
        setHistory(snapshot.history);
        setObligationProgress((items) => {
          const known = new Set(snapshot.obligations.map((item) => item.id));
          return items.filter((item) => known.has(item.obligationId));
        });
        setLoading(false);
      },
      (loadError: unknown) => {
        if (!current()) return;
        setError(errorText(loadError));
        setLoading(false);
      },
    );
  }, [repository]);

  /** User-triggered reload (retry button, failed mutation): shows the loading state first. */
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Wait for a signed-in user: an anonymous request to the API would only 401.
  useEffect(() => {
    if (!userId) return;
    fetchPortfolio();
  }, [fetchPortfolio, userId]);

  /** Swaps one agreement's children for the server's copy (history, alerts, renewals…). */
  const refreshChildren = useCallback(
    async (agreementId: string, includeProgress = false) => {
      if (!repository) return;
      const fresh = await loadAgreementChildren(repository, agreementId);
      setObligations((items) => replaceForAgreement(items, agreementId, fresh.obligations));
      setReviews((items) => replaceForAgreement(items, agreementId, fresh.reviews));
      setRenewals((items) => replaceForAgreement(items, agreementId, fresh.renewals));
      setRenewalAlerts((items) => replaceForAgreement(items, agreementId, fresh.renewalAlerts));
      setHistory((items) => replaceForAgreement(items, agreementId, fresh.history));
      if (includeProgress) {
        const ids = fresh.obligations.map((item) => item.id);
        const notes = await loadObligationProgress(repository, ids);
        const idSet = new Set(ids);
        setObligationProgress((items) => [
          ...notes,
          ...items.filter((item) => !idSet.has(item.obligationId)),
        ]);
      }
    },
    [repository],
  );

  /**
   * Mirrors an optimistic local change to the backend. On success `apply`
   * swaps in the server's record and the agreement's children are refreshed so
   * server-side effects (history, alert schedules) show; on failure the
   * portfolio reloads — reverting the optimistic change — and the server's
   * message is toasted.
   */
  const mirror = useCallback(
    <T,>(
      request: (repo: PartnershipsRepository) => Promise<T>,
      options: { failure: string; agreementId?: string; apply?: (result: T) => void },
    ) => {
      if (!repository) return;
      request(repository)
        .then((result) => {
          options.apply?.(result);
          if (options.agreementId) {
            refreshChildren(options.agreementId).catch(() => {
              // The mutation itself succeeded; a stale side list is corrected on next load.
            });
          }
        })
        .catch((mutationError: unknown) => {
          toastRef.current({
            title: options.failure,
            description: `${errorText(mutationError)} Your change has been reverted.`,
            variant: 'error',
          });
          load();
        });
    },
    [load, refreshChildren, repository],
  );

  const reload = load;

  const loadAgreementDetail = useCallback(
    (agreementId: string) => {
      // Best effort: the portfolio load already holds this agreement, and a
      // just-created draft may not exist on the server yet. Load failures are
      // reported by `error`, so a failed refresh stays quiet.
      refreshChildren(agreementId, true).catch(() => undefined);
    },
    [refreshChildren],
  );

  const addHistory = useCallback(
    (
      agreementId: string,
      action: PartnershipHistoryEntry['action'],
      summary: string,
      actor = 'Current user',
    ) => {
      setHistory((items) => [
        {
          id: `history-${crypto.randomUUID()}`,
          agreementId,
          action,
          summary,
          actor,
          occurredAt: new Date().toISOString(),
        },
        ...items,
      ]);
    },
    [],
  );

  const replaceAgreement = useCallback((agreement: PartnershipAgreement) => {
    setAgreements((items) => replaceRecord(items, agreement));
  }, []);

  const value = useMemo<PartnershipsContextValue>(
    () => ({
      agreements,
      obligations,
      obligationProgress,
      reviews,
      renewals,
      renewalAlerts,
      history,
      dataMode: 'api',
      loading,
      error,
      reload,
      loadAgreementDetail,
      createAgreement(input) {
        const now = new Date().toISOString();
        const agreement: PartnershipAgreement = {
          id: newId('mou'),
          ...input,
          reference: nextReference(agreements),
          status: 'DRAFT',
          signedDocumentRef: null,
          renewalCount: 0,
          termination: null,
          createdAt: now,
          updatedAt: now,
        };
        setAgreements((items) => [agreement, ...items]);
        addHistory(agreement.id, 'CREATED', 'Partnership draft created.');
        mirror((repo) => repo.create(input, agreement.id), {
          failure: 'Partnership draft was not saved',
          agreementId: agreement.id,
          apply: (response) => replaceAgreement(response.data),
        });
        return agreement;
      },
      importAgreements(inputs: ImportPartnershipInput[], actor) {
        const partition = partitionPartnershipImports(inputs, agreements);
        const accepted: PartnershipAgreement[] = [];
        partition.accepted.forEach((input) => {
          const now = new Date().toISOString();
          accepted.push({
            id: newId('mou'),
            ...input,
            partyStakeholderIds: [...input.partyStakeholderIds],
            deliverables: [...input.deliverables],
            renewalCount: 0,
            termination: null,
            createdAt: now,
            updatedAt: now,
          });
        });
        if (accepted.length) {
          setAgreements((items) => [...accepted, ...items]);
          accepted.forEach((agreement) =>
            addHistory(
              agreement.id,
              'CREATED',
              `Legacy agreement imported from migration file (${agreement.reference}).`,
              actor,
            ),
          );
          // The server assigns the imported IDs, so reload rather than patch.
          mirror((repo) => repo.importMany(partition.accepted), {
            failure: 'Import was not saved',
            apply: (response) => {
              if (response.data.errors.length || response.data.skipped) {
                toastRef.current({
                  title: 'The server skipped some rows',
                  description: `${response.data.imported} imported, ${response.data.skipped} skipped. ${response.data.errors.slice(0, 3).join(' ')}`,
                  variant: 'warning',
                });
              }
              load();
            },
          });
        }
        return {
          imported: accepted.length,
          skipped: inputs.length - accepted.length,
          errors: partition.errors,
        };
      },
      updateAgreement(id, input) {
        const current = agreements.find((item) => item.id === id);
        const currentAlerts = renewalAlerts.filter(
          (item) => item.agreementId === id && item.status !== 'CANCELLED',
        );
        setAgreements((items) =>
          items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...input,
                  partyStakeholderIds: [...input.partyStakeholderIds],
                  deliverables: [...input.deliverables],
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
        if (current?.expiryDate !== input.expiryDate && currentAlerts.length) {
          setRenewalAlerts((items) => {
            const cancelled = items.map((item) =>
              item.agreementId === id && item.status !== 'CANCELLED'
                ? { ...item, status: 'CANCELLED' as const }
                : item,
            );
            return input.expiryDate
              ? [
                  ...createRenewalAlerts(id, input.expiryDate, currentAlerts[0]?.recipients ?? []),
                  ...cancelled,
                ]
              : cancelled;
          });
        }
        addHistory(id, 'UPDATED', 'Agreement details, parties, or deliverables updated.');
        mirror((repo) => repo.update(id, input), {
          failure: 'Agreement changes were not saved',
          agreementId: id,
          apply: (response) => replaceAgreement(response.data),
        });
      },
      transitionAgreement(id, input, actor) {
        setAgreements((items) =>
          items.map((item) =>
            item.id === id
              ? { ...item, status: input.status, updatedAt: new Date().toISOString() }
              : item,
          ),
        );
        addHistory(
          id,
          input.status === 'EXPIRED' ? 'EXPIRED' : 'STATUS_CHANGED',
          `Lifecycle status changed to ${input.status}. ${input.note}`,
          actor,
        );
        mirror((repo) => repo.transition(id, input), {
          failure: 'Lifecycle change was not saved',
          agreementId: id,
          apply: (response) => replaceAgreement(response.data),
        });
      },
      renewAgreement(id, input, actor) {
        const previous = agreements.find((item) => item.id === id);
        const recipients =
          renewalAlerts.find((item) => item.agreementId === id && item.status !== 'CANCELLED')
            ?.recipients ?? [];
        if (previous) {
          setRenewals((items) => [
            {
              id: `renewal-${crypto.randomUUID()}`,
              agreementId: id,
              previousEffectiveDate: previous.effectiveDate,
              previousExpiryDate: previous.expiryDate,
              previousLegalContractRef: previous.legalContractRef,
              previousSignedDocumentRef: previous.signedDocumentRef,
              effectiveDate: input.effectiveDate,
              expiryDate: input.expiryDate,
              legalContractRef: input.legalContractRef,
              signedDocumentRef: input.signedDocumentRef,
              termsSummary: input.termsSummary,
              renewedBy: actor,
              renewedAt: new Date().toISOString(),
            },
            ...items,
          ]);
        }
        setAgreements((items) =>
          items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'ACTIVE',
                  effectiveDate: input.effectiveDate,
                  expiryDate: input.expiryDate,
                  legalContractRef: input.legalContractRef,
                  signedDocumentRef: input.signedDocumentRef,
                  valueCommitment: input.termsSummary,
                  renewalCount: item.renewalCount + 1,
                  termination: null,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
        setRenewalAlerts((items) => [
          ...createRenewalAlerts(id, input.expiryDate, recipients),
          ...items.map((item) =>
            item.agreementId === id && !['ACKNOWLEDGED', 'CANCELLED'].includes(item.status)
              ? { ...item, status: 'CANCELLED' as const }
              : item,
          ),
        ]);
        addHistory(
          id,
          'RENEWED',
          `Renewal completed for ${input.effectiveDate} to ${input.expiryDate}.`,
          actor,
        );
        mirror((repo) => repo.renew(id, input), {
          failure: 'Renewal was not saved',
          agreementId: id,
          apply: (response) => replaceAgreement(response.data),
        });
      },
      terminateAgreement(id, input, actor) {
        setAgreements((items) =>
          items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'TERMINATED',
                  termination: { ...input, approvedBy: actor },
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
        setRenewalAlerts((items) =>
          items.map((item) =>
            item.agreementId === id && !['ACKNOWLEDGED', 'CANCELLED'].includes(item.status)
              ? { ...item, status: 'CANCELLED' }
              : item,
          ),
        );
        addHistory(id, 'TERMINATED', `Agreement terminated: ${input.reason}`, actor);
        mirror((repo) => repo.terminate(id, input), {
          failure: 'Termination was not saved',
          agreementId: id,
          apply: (response) => replaceAgreement(response.data),
        });
      },
      createObligation(input, actor) {
        const now = new Date().toISOString();
        const obligation: PartnershipObligation = {
          id: newId('obl'),
          ...input,
          status: 'NOT_STARTED',
          evidenceReferences: [],
          updatedAt: now,
        };
        obligation.status = effectiveObligationStatus(obligation);
        setObligations((items) => [obligation, ...items]);
        addHistory(
          obligation.agreementId,
          'OBLIGATION_UPDATED',
          `Obligation “${obligation.title}” created.`,
          actor,
        );
        mirror((repo) => repo.createObligation(input, obligation.id), {
          failure: 'Obligation was not saved',
          agreementId: input.agreementId,
          apply: (response) =>
            setObligations((items) =>
              replaceRecord(items, withEffectiveStatus(response.data), obligation.id),
            ),
        });
        return obligation;
      },
      updateObligation(id, input, actor) {
        const current = obligations.find((item) => item.id === id);
        if (!current) return;
        const updated: PartnershipObligation = {
          ...current,
          ...input,
          evidenceReferences: [...input.evidenceReferences],
          updatedAt: new Date().toISOString(),
        };
        updated.status = effectiveObligationStatus(updated);
        setObligations((items) => items.map((item) => (item.id === id ? updated : item)));
        addHistory(
          current.agreementId,
          'OBLIGATION_UPDATED',
          `Obligation “${updated.title}” updated to ${updated.status}.`,
          actor,
        );
        mirror((repo) => repo.updateObligation(id, input), {
          failure: 'Obligation changes were not saved',
          agreementId: current.agreementId,
          apply: (response) =>
            setObligations((items) => replaceRecord(items, withEffectiveStatus(response.data))),
        });
      },
      addObligationProgress(input, actor) {
        const current = obligations.find((item) => item.id === input.obligationId);
        if (!current) return;
        const createdAt = new Date().toISOString();
        const noteId = `progress-${crypto.randomUUID()}`;
        setObligationProgress((items) => [
          {
            id: noteId,
            obligationId: input.obligationId,
            note: input.note,
            status: input.status,
            actor,
            createdAt,
          },
          ...items,
        ]);
        setObligations((items) =>
          items.map((item) =>
            item.id === input.obligationId
              ? {
                  ...item,
                  status: effectiveObligationStatus({ ...item, status: input.status }),
                  updatedAt: createdAt,
                }
              : item,
          ),
        );
        addHistory(
          current.agreementId,
          'OBLIGATION_UPDATED',
          `Progress recorded for “${current.title}”: ${input.note}`,
          actor,
        );
        mirror((repo) => repo.addObligationProgress(input), {
          failure: 'Progress update was not saved',
          agreementId: current.agreementId,
          apply: (response) =>
            setObligationProgress((items) => replaceRecord(items, response.data, noteId)),
        });
      },
      configureRenewalAlerts(input, actor) {
        const agreement = agreements.find((item) => item.id === input.agreementId);
        if (!agreement?.expiryDate) return;
        const expiryDate = agreement.expiryDate;
        setRenewalAlerts((items) => [
          ...createRenewalAlerts(input.agreementId, expiryDate, input.recipients),
          ...items.map((item) =>
            item.agreementId === input.agreementId &&
            !['ACKNOWLEDGED', 'CANCELLED'].includes(item.status)
              ? { ...item, status: 'CANCELLED' as const }
              : item,
          ),
        ]);
        addHistory(
          input.agreementId,
          'RENEWAL_ALERT_UPDATED',
          `Renewal alerts configured for ${input.recipients.length} recipient${input.recipients.length === 1 ? '' : 's'}.`,
          actor,
        );
        // The refreshed alert list replaces the optimistic schedule.
        mirror((repo) => repo.configureRenewalAlerts(input), {
          failure: 'Renewal alert settings were not saved',
          agreementId: input.agreementId,
        });
      },
      dispatchRenewalAlert(id, actor) {
        const alert = renewalAlerts.find((item) => item.id === id);
        if (!alert || !['DUE', 'FAILED'].includes(effectiveRenewalAlertStatus(alert))) return;
        const sentAt = new Date().toISOString();
        setRenewalAlerts((items) =>
          items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'SENT',
                  communicationRef: null,
                  sentAt,
                }
              : item,
          ),
        );
        addHistory(
          alert.agreementId,
          'RENEWAL_ALERT_UPDATED',
          `${alert.milestoneDays}-day renewal alert dispatched through S074.`,
          actor,
        );
        mirror((repo) => repo.dispatchRenewalAlert(id), {
          failure: 'Renewal alert was not dispatched',
          agreementId: alert.agreementId,
          apply: (response) => setRenewalAlerts((items) => replaceRecord(items, response.data)),
        });
      },
      acknowledgeRenewalAlert(id, actor) {
        const alert = renewalAlerts.find((item) => item.id === id);
        if (!alert || alert.status !== 'SENT') return;
        setRenewalAlerts((items) =>
          items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'ACKNOWLEDGED',
                  acknowledgedAt: new Date().toISOString(),
                  acknowledgedBy: actor,
                }
              : item,
          ),
        );
        addHistory(
          alert.agreementId,
          'RENEWAL_ALERT_UPDATED',
          `${alert.milestoneDays}-day renewal alert acknowledged.`,
          actor,
        );
        mirror((repo) => repo.acknowledgeRenewalAlert(id), {
          failure: 'Acknowledgement was not saved',
          agreementId: alert.agreementId,
          apply: (response) => setRenewalAlerts((items) => replaceRecord(items, response.data)),
        });
      },
      createReview(input, actor) {
        const review: PartnershipReview = {
          id: newId('review'),
          ...input,
          outputs: [...input.outputs],
          issues: [...input.issues],
          recommendations: [...input.recommendations],
        };
        setReviews((items) => [review, ...items]);
        addHistory(
          input.agreementId,
          'REVIEW_UPDATED',
          `Value-realisation review recorded with ${input.renewalRecommendation.replaceAll('_', ' ').toLowerCase()} recommendation.`,
          actor,
        );
        mirror((repo) => repo.createReview(input, review.id), {
          failure: 'Review was not saved',
          agreementId: input.agreementId,
          apply: (response) =>
            setReviews((items) => replaceRecord(items, response.data, review.id)),
        });
        return review;
      },
      updateReview(id, input, actor) {
        const current = reviews.find((item) => item.id === id);
        if (!current) return;
        setReviews((items) =>
          items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...input,
                  outputs: [...input.outputs],
                  issues: [...input.issues],
                  recommendations: [...input.recommendations],
                }
              : item,
          ),
        );
        addHistory(
          current.agreementId,
          'REVIEW_UPDATED',
          `Value-realisation review dated ${input.reviewDate} updated.`,
          actor,
        );
        mirror((repo) => repo.updateReview(id, input), {
          failure: 'Review changes were not saved',
          agreementId: current.agreementId,
          apply: (response) => setReviews((items) => replaceRecord(items, response.data)),
        });
      },
    }),
    [
      addHistory,
      agreements,
      error,
      history,
      load,
      loadAgreementDetail,
      loading,
      mirror,
      newId,
      obligationProgress,
      obligations,
      reload,
      renewalAlerts,
      renewals,
      replaceAgreement,
      reviews,
    ],
  );

  return <PartnershipsContext.Provider value={value}>{children}</PartnershipsContext.Provider>;
}
