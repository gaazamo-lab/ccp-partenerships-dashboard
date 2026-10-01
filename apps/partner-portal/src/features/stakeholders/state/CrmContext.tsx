/* eslint-disable react-refresh/only-export-components -- provider and hook share one domain boundary */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useToast } from '@rfdtech/components';

import { ApiError, createHttpStakeholdersRepository } from '@partner-crm/api-client';
import { useAuth } from '@partner-crm/auth';
import type { ApiEnvelope } from '@partner-crm/types';

import { apiClient } from '@/config/api';
import { env } from '@/config/env';
import {
  EMPTY_CRITERIA,
  resolveSegmentMembers,
  segmentCounts,
} from '@/features/segments/resolution';
import { detectIndividualRecord } from '@/features/stakeholders/boundary';
import { CRM_SOURCE } from '@/features/stakeholders/constants';
import {
  segments as seedSegments,
  stakeholders as seedStakeholders,
} from '@/features/stakeholders/data/mockCrmData';
import {
  type StakeholderImportRow,
  contactDuplicateMessage,
  findDuplicateContact,
  findDuplicateStakeholder,
  planStakeholderImport,
} from '@/features/stakeholders/duplicates';
import { NOT_YET_ENGAGED, latestEngagementDate, todayIso } from '@/features/stakeholders/engagements';
import {
  applyScreeningDecision,
  deriveRelationshipStatus,
  engagementBlockReason,
} from '@/features/stakeholders/screening';
import { stakeholderToInput } from '@/features/stakeholders/stakeholderForm';
import type {
  ConsentInput,
  ContactInput,
  EngagementInput,
  PipelineStage,
  RelationshipStatus,
  ScreeningDecisionInput,
  Segment,
  SegmentInput,
  Stakeholder,
  StakeholderContact,
  StakeholderImportResult,
  StakeholderInput,
} from '@/features/stakeholders/types';

export interface MutationResult {
  ok: boolean;
  id?: string;
  duplicate?: Stakeholder;
  message?: string;
}

export interface CreateStakeholderOptions {
  /** Create despite a duplicate match; requires `overrideReason`. */
  force?: boolean;
  overrideReason?: string;
}

interface CrmContextValue {
  stakeholders: Stakeholder[];
  segments: Segment[];
  /** True while the register is loading from the API (always false in mock mode). */
  loading: boolean;
  /** The last load failure, if the register could not be read. */
  error: string | null;
  reload: () => void;
  addStakeholder: (input: StakeholderInput, options?: CreateStakeholderOptions) => MutationResult;
  updateStakeholder: (id: string, input: StakeholderInput) => MutationResult;
  setRelationshipStatus: (stakeholderId: string, status: RelationshipStatus) => MutationResult;
  setPipelineStage: (stakeholderId: string, stage: PipelineStage) => MutationResult;
  importStakeholders: (
    rows: StakeholderImportRow[],
    firstRowNumber?: number,
  ) => StakeholderImportResult;
  addContact: (stakeholderId: string, input: ContactInput) => MutationResult;
  updateContact: (contactId: string, input: ContactInput) => MutationResult;
  setContactActive: (contactId: string, active: boolean) => MutationResult;
  recordScreening: (
    contactId: string,
    input: ScreeningDecisionInput,
    reviewer: string,
  ) => MutationResult;
  recordConsent: (contactId: string, input: ConsentInput) => MutationResult;
  addEngagement: (stakeholderId: string, input: EngagementInput) => MutationResult;
  addSegment: (input: SegmentInput) => MutationResult;
  updateSegment: (id: string, input: SegmentInput) => MutationResult;
  deleteSegment: (id: string) => MutationResult;
}

const CrmContext = createContext<CrmContextValue | null>(null);

/** `null` in mock mode: the provider then keeps the seeded in-memory register. */
const repository =
  env.dataMode === 'api' ? createHttpStakeholdersRepository(apiClient) : null;

function cloneSeeds(): Stakeholder[] {
  return seedStakeholders.map((stakeholder) => ({
    ...stakeholder,
    contacts: stakeholder.contacts.map((contact) => ({ ...contact })),
    engagements: stakeholder.engagements.map((engagement) => ({ ...engagement })),
  }));
}

/** API ids must be UUIDs; mock ids keep a readable prefix. */
function newId(prefix: string): string {
  const id = crypto.randomUUID();
  return repository ? id : `${prefix}-${id}`;
}

function makeShortName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function toStakeholder(id: string, input: StakeholderInput): Stakeholder {
  return {
    id,
    ...input,
    shortName: input.shortName.trim() || makeShortName(input.name),
    status: 'Active',
    health: input.health ?? 'Healthy',
    pipelineStage: input.pipelineStage ?? 'Prospect',
    lastEngagement: NOT_YET_ENGAGED,
    contacts: [],
    engagements: [],
  };
}

function toSegment(id: string, input: SegmentInput, stakeholders: Stakeholder[]): Segment {
  const criteria = input.criteria ?? { ...EMPTY_CRITERIA, categories: input.categories };
  const counts = segmentCounts(resolveSegmentMembers(criteria, stakeholders));
  return {
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    usedBy: input.usedBy,
    categories: criteria.categories,
    criteria,
    members: counts.members,
    consented: counts.consented,
    updated: todayIso(),
  };
}

type RegisterRead =
  | { ok: true; stakeholders: Stakeholder[]; segments: Segment[] }
  | { ok: false; message: string };

/** One read of the register and its segments; never rejects. */
async function readRegister(): Promise<RegisterRead> {
  if (!repository) return { ok: false, message: 'The S081 API is not configured.' };
  try {
    const [stakeholderResponse, segmentResponse] = await Promise.all([
      repository.list(),
      repository.listSegments(),
    ]);
    return { ok: true, stakeholders: stakeholderResponse.data, segments: segmentResponse.data };
  } catch (caught) {
    return { ok: false, message: errorMessage(caught) };
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'The server did not accept the change.';
}

function isDuplicateConflict(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  const body = error.body as { code?: unknown } | undefined;
  return body?.code === 'DUPLICATE_STAKEHOLDER';
}

function contactInputOf(contact: StakeholderContact): ContactInput {
  return {
    name: contact.name,
    role: contact.role,
    email: contact.email,
    phone: contact.phone,
    consent: contact.consent,
    consentDate: contact.consentDate,
    consentChannel: contact.consentChannel,
    regulated: contact.screening !== 'Not required',
  };
}

export function CrmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(() =>
    repository ? [] : cloneSeeds(),
  );
  const [segments, setSegments] = useState<Segment[]>(() =>
    repository ? [] : seedSegments.map((segment) => ({ ...segment })),
  );
  const [loading, setLoading] = useState(repository !== null);
  const [error, setError] = useState<string | null>(null);

  /** Applies a settled register read. Only ever called from a promise callback. */
  const commitRegister = useCallback((result: RegisterRead) => {
    if (result.ok) {
      setStakeholders(result.stakeholders);
      setSegments(result.segments);
      setError(null);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, []);

  const fetchRegister = useCallback(
    () => readRegister().then(commitRegister),
    [commitRegister],
  );

  const userId = user?.id;
  useEffect(() => {
    // The provider sits above the router, so wait for a session before asking
    // the API for anything — an anonymous request would only 401.
    if (!repository || !userId) return;
    let current = true;
    void readRegister().then((result) => {
      if (current) commitRegister(result);
    });
    return () => {
      current = false;
    };
  }, [commitRegister, userId]);

  const reload = useCallback(() => {
    if (!repository) return;
    setLoading(true);
    void fetchRegister();
  }, [fetchRegister]);

  /**
   * Api mode: send the change the UI has already applied. On success the
   * server's record replaces the optimistic one; on failure the register is
   * re-read (reverting the change) and the server's message is shown.
   */
  const mirror = useCallback(
    <T,>(
      call: (repo: NonNullable<typeof repository>) => Promise<ApiEnvelope<T> | void>,
      failureTitle: string,
      onSuccess?: (data: T) => void,
    ) => {
      if (!repository) return;
      call(repository)
        .then((response) => {
          if (response && onSuccess) onSuccess(response.data);
        })
        .catch((caught: unknown) => {
          toast({
            title: failureTitle,
            description: isDuplicateConflict(caught)
              ? `${errorMessage(caught)} The record already exists on the server; the register has been refreshed.`
              : errorMessage(caught),
            variant: 'error',
          });
          void fetchRegister();
        });
    },
    [fetchRegister, toast],
  );

  const value = useMemo<CrmContextValue>(() => {
    const replaceStakeholder = (server: Stakeholder, localId = server.id) =>
      setStakeholders((items) => items.map((item) => (item.id === localId ? server : item)));

    const findByContact = (contactId: string) =>
      stakeholders.find((item) => item.contacts.some((contact) => contact.id === contactId));

    /** Applies a contact change and re-derives the organisation's screening status. */
    const patchContact = (
      contactId: string,
      change: (contact: StakeholderContact) => StakeholderContact,
    ) =>
      setStakeholders((items) =>
        items.map((item) => {
          if (!item.contacts.some((contact) => contact.id === contactId)) return item;
          const next = {
            ...item,
            contacts: item.contacts.map((contact) =>
              contact.id === contactId ? change(contact) : contact,
            ),
          };
          return { ...next, status: deriveRelationshipStatus(next) };
        }),
      );

    return {
      stakeholders,
      segments,
      loading,
      error,
      reload,

      addStakeholder(input, options = {}) {
        const boundary = detectIndividualRecord(input);
        if (boundary) return { ok: false, message: boundary.message };
        const match = findDuplicateStakeholder(stakeholders, input);
        if (match && !options.force) return { ok: false, duplicate: match.stakeholder };
        if (options.force && !options.overrideReason?.trim()) {
          return { ok: false, message: 'Give a reason for creating a possible duplicate.' };
        }
        const id = newId('stk');
        setStakeholders((items) => [toStakeholder(id, input), ...items]);
        mirror(
          (repo) =>
            repo.create(input, {
              id,
              ...(options.force
                ? { force: true, overrideReason: options.overrideReason?.trim() }
                : {}),
            }),
          'Stakeholder not saved',
          (server) => replaceStakeholder(server, id),
        );
        return { ok: true, id };
      },

      updateStakeholder(id, input) {
        const boundary = detectIndividualRecord(input);
        if (boundary) return { ok: false, message: boundary.message };
        const match = findDuplicateStakeholder(stakeholders, input, id);
        if (match) return { ok: false, duplicate: match.stakeholder };
        setStakeholders((items) =>
          items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...input,
                  health: input.health ?? item.health,
                  pipelineStage: input.pipelineStage ?? item.pipelineStage,
                  shortName: input.shortName.trim() || makeShortName(input.name),
                }
              : item,
          ),
        );
        mirror((repo) => repo.update(id, input), 'Stakeholder not updated', (server) =>
          replaceStakeholder(server),
        );
        return { ok: true, id };
      },

      setRelationshipStatus(stakeholderId, status) {
        const stakeholder = stakeholders.find((item) => item.id === stakeholderId);
        if (!stakeholder) return { ok: false, message: 'Stakeholder not found.' };
        // Reactivating an organisation that still has a contact held by S203
        // lands it back in "Screening pending", not Active.
        const next =
          status === 'Inactive' ? status : deriveRelationshipStatus({ ...stakeholder, status });
        setStakeholders((items) =>
          items.map((item) => (item.id === stakeholderId ? { ...item, status: next } : item)),
        );
        // The server derives "Screening pending" itself and rejects it as an input.
        const requested = next === 'Screening pending' ? 'Active' : next;
        mirror((repo) => repo.setStatus(stakeholderId, requested), 'Status not changed', (server) =>
          replaceStakeholder(server),
        );
        return { ok: true, id: stakeholderId };
      },

      setPipelineStage(stakeholderId, stage) {
        const stakeholder = stakeholders.find((item) => item.id === stakeholderId);
        if (!stakeholder) return { ok: false, message: 'Stakeholder not found.' };
        setStakeholders((items) =>
          items.map((item) =>
            item.id === stakeholderId ? { ...item, pipelineStage: stage } : item,
          ),
        );
        mirror(
          (repo) =>
            repo.update(stakeholderId, { ...stakeholderToInput(stakeholder), pipelineStage: stage }),
          'Pipeline stage not saved',
          (server) => replaceStakeholder(server),
        );
        return { ok: true, id: stakeholderId };
      },

      importStakeholders(rows, firstRowNumber) {
        const plan = planStakeholderImport(stakeholders, rows, firstRowNumber);
        if (plan.accepted.length === 0) return plan.result;
        setStakeholders((items) => [
          ...plan.accepted.map((row) => toStakeholder(newId('stk'), row)),
          ...items,
        ]);
        mirror(
          (repo) => repo.importMany(plan.accepted),
          'Import not saved',
          (server) => {
            // The import endpoint returns a summary, not records: re-read so
            // the register carries the server's IDs.
            void fetchRegister();
            if (server.skipped.length > 0) {
              toast({
                title: `The server skipped ${server.skipped.length} more row${server.skipped.length === 1 ? '' : 's'}`,
                description: server.skipped
                  .slice(0, 3)
                  .map((row) => `${row.name}: ${row.reason}`)
                  .join(' '),
                variant: 'warning',
              });
            }
          },
        );
        return plan.result;
      },

      addContact(stakeholderId, input) {
        const duplicate = findDuplicateContact(stakeholders, stakeholderId, input);
        if (duplicate) return { ok: false, message: contactDuplicateMessage(duplicate) };
        const id = newId('con');
        const { regulated, consentDate, consentChannel, ...fields } = input;
        setStakeholders((items) =>
          items.map((item) => {
            if (item.id !== stakeholderId) return item;
            const next: Stakeholder = {
              ...item,
              contacts: [
                ...item.contacts,
                {
                  ...fields,
                  id,
                  consentDate: consentDate ?? null,
                  consentChannel: consentChannel ?? null,
                  screening: regulated ? 'Pending' : 'Not required',
                  screeningRecord: null,
                  active: true,
                },
              ],
            };
            return { ...next, status: deriveRelationshipStatus(next) };
          }),
        );
        mirror((repo) => repo.addContact(stakeholderId, input, id), 'Contact not saved', (server) =>
          replaceStakeholder(server),
        );
        return { ok: true, id };
      },

      updateContact(contactId, input) {
        const owner = findByContact(contactId);
        if (!owner) return { ok: false, message: 'Contact not found.' };
        const duplicate = findDuplicateContact(stakeholders, owner.id, input, contactId);
        if (duplicate) return { ok: false, message: contactDuplicateMessage(duplicate) };
        const { regulated, consentDate, consentChannel, ...fields } = input;
        patchContact(contactId, (contact) => ({
          ...contact,
          ...fields,
          consentDate: consentDate ?? contact.consentDate,
          consentChannel: consentChannel ?? contact.consentChannel,
          // Marking a contact regulated starts screening. Unmarking never
          // clears a screening already requested — only S203 can do that.
          screening:
            regulated && contact.screening === 'Not required' ? 'Pending' : contact.screening,
        }));
        mirror((repo) => repo.updateContact(contactId, input), 'Contact not updated', (server) =>
          replaceStakeholder(server),
        );
        return { ok: true, id: contactId };
      },

      setContactActive(contactId, active) {
        const owner = findByContact(contactId);
        const current = owner?.contacts.find((contact) => contact.id === contactId);
        if (!owner || !current) return { ok: false, message: 'Contact not found.' };
        patchContact(contactId, (contact) => ({ ...contact, active }));
        mirror(
          (repo) =>
            active
              ? // The contract has no reactivate endpoint; the update carries the flag.
                repo.updateContact(contactId, { ...contactInputOf(current), active } as ContactInput)
              : repo.deactivateContact(contactId),
          active ? 'Contact not reactivated' : 'Contact not deactivated',
          (server) => replaceStakeholder(server),
        );
        return { ok: true, id: contactId };
      },

      recordScreening(contactId, input, reviewer) {
        if (!findByContact(contactId)) return { ok: false, message: 'Contact not found.' };
        const reviewedAt = new Date().toISOString();
        patchContact(contactId, (contact) =>
          applyScreeningDecision(contact, input, reviewer, reviewedAt),
        );
        mirror((repo) => repo.recordScreening(contactId, input), 'Screening decision not saved', (server) =>
          replaceStakeholder(server),
        );
        return { ok: true, id: contactId };
      },

      recordConsent(contactId, input) {
        if (!findByContact(contactId)) return { ok: false, message: 'Contact not found.' };
        patchContact(contactId, (contact) => ({ ...contact, ...input }));
        mirror((repo) => repo.recordConsent(contactId, input), 'Consent not saved', (server) =>
          replaceStakeholder(server),
        );
        return { ok: true, id: contactId };
      },

      addEngagement(stakeholderId, input) {
        const stakeholder = stakeholders.find((item) => item.id === stakeholderId);
        if (!stakeholder) return { ok: false, message: 'Stakeholder not found.' };
        const blocked = engagementBlockReason(stakeholder);
        if (blocked) return { ok: false, message: blocked };
        if (stakeholder.status === 'Inactive') {
          return { ok: false, message: 'Reactivate this stakeholder before logging new engagement.' };
        }
        const id = newId('eng');
        const date = input.date || todayIso();
        setStakeholders((items) =>
          items.map((item) => {
            if (item.id !== stakeholderId) return item;
            const engagements = [
              { ...input, id, date, source: CRM_SOURCE },
              ...item.engagements,
            ];
            return { ...item, engagements, lastEngagement: latestEngagementDate(engagements) };
          }),
        );
        mirror(
          (repo) => repo.addEngagement(stakeholderId, { ...input, date }, id),
          'Engagement not saved',
          (server) => replaceStakeholder(server),
        );
        return { ok: true, id };
      },

      addSegment(input) {
        const id = newId('seg');
        setSegments((items) => [toSegment(id, input, stakeholders), ...items]);
        mirror((repo) => repo.createSegment(input, id), 'Segment not saved', (server) =>
          setSegments((items) => items.map((item) => (item.id === id ? server : item))),
        );
        return { ok: true, id };
      },

      updateSegment(id, input) {
        if (!segments.some((item) => item.id === id)) {
          return { ok: false, message: 'Segment not found.' };
        }
        setSegments((items) =>
          items.map((item) => (item.id === id ? toSegment(id, input, stakeholders) : item)),
        );
        mirror((repo) => repo.updateSegment(id, input), 'Segment not updated', (server) =>
          setSegments((items) => items.map((item) => (item.id === id ? server : item))),
        );
        return { ok: true, id };
      },

      deleteSegment(id) {
        setSegments((items) => items.filter((item) => item.id !== id));
        mirror((repo) => repo.deleteSegment(id), 'Segment not deleted');
        return { ok: true, id };
      },
    };
  }, [stakeholders, segments, loading, error, reload, mirror, fetchRegister, toast]);

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const context = useContext(CrmContext);
  if (!context) throw new Error('useCrm must be used within CrmProvider.');
  return context;
}

/** Whether the provider reads and writes through the S081 API. */
export const CRM_API_MODE = repository !== null;
