import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@rfdtech/components';

import { useAuth } from '@partner-crm/auth';
import type {
  Consultation,
  ConsultationInvitation,
  ConsultationResponse,
  ConsultationTheme,
  Segment,
} from '@partner-crm/types';

import { env } from '@/config/env';

import { consultationsRepository, listSegments } from '../data/repository';
import { EDITABLE_STATUSES, PUBLIC_STATUSES } from '../constants';
import { buildConsultation, createResponse, duplicateConsultation, identityErrors } from '../domain';
import { buildInvitation, invitationBlockers } from '../invitations';
import { LIFECYCLE_ACTIONS, applyStatusChange } from '../lifecycle';
import { initialConsultations, initialInvitations, initialResponses, initialSegments } from '../mockData';
import { ConsultationsContext, type ConsultationsContextValue } from './ConsultationsContext';

const isApi = env.dataMode === 'api';

function message(caught: unknown) {
  return caught instanceof Error && caught.message ? caught.message : 'Something went wrong. Try again.';
}

interface AdminState {
  consultations: Consultation[];
  segments: Segment[];
}

/** Staff list plus S081 segments. Segments are optional: a failure there leaves the picker empty. */
async function fetchAdminState(): Promise<AdminState | Error> {
  try {
    const [list, segmentList] = await Promise.all([
      consultationsRepository.listAdmin({ pageSize: 200 }),
      listSegments().catch(() => ({ success: false, data: [] as Segment[] })),
    ]);
    return { consultations: list.data, segments: segmentList.data };
  } catch (caught) {
    return new Error(message(caught));
  }
}

function upsert<T extends { id: string }>(items: T[], record: T, replaceId = record.id): T[] {
  const index = items.findIndex((item) => item.id === replaceId);
  if (index < 0) return [record, ...items];
  const next = [...items];
  next[index] = record;
  return next;
}

/**
 * S088 state. Mock mode keeps a seeded in-memory store and applies the domain
 * rules locally. API mode loads through the repository and applies each
 * mutation optimistically: the local change first, then the server call; on
 * success the server's record replaces the local one, on failure the state is
 * reloaded from the server and the server's message is toasted.
 */
export function ConsultationsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const { toast } = useToast();
  const actor = user?.name ?? 'Consultation administrator';
  const userId = user?.id;

  const [consultations, setConsultations] = useState<Consultation[]>(() => (isApi ? [] : structuredClone(initialConsultations)));
  const [publicList, setPublicList] = useState<Consultation[]>([]);
  const [responses, setResponses] = useState<ConsultationResponse[]>(() => (isApi ? [] : structuredClone(initialResponses)));
  const [invitations, setInvitations] = useState<ConsultationInvitation[]>(() => (isApi ? [] : structuredClone(initialInvitations)));
  const [segments, setSegments] = useState<Segment[]>(() => (isApi ? [] : initialSegments));
  const [loading, setLoading] = useState(isApi);
  const [error, setError] = useState<string | null>(null);
  const [publicLoading, setPublicLoading] = useState(isApi);
  const [publicError, setPublicError] = useState<string | null>(null);

  const fail = useCallback(
    (title: string, caught: unknown) => {
      toast({ title, description: message(caught), variant: 'error' });
      return caught instanceof Error ? caught : new Error(message(caught));
    },
    [toast],
  );

  const replaceConsultation = useCallback((record: Consultation, replaceId = record.id) => {
    setConsultations((items) => upsert(items, record, replaceId));
    setPublicList((items) => (items.some((item) => item.id === replaceId) ? upsert(items, record, replaceId) : items));
  }, []);

  const applyAdminState = useCallback((result: AdminState | Error) => {
    if (result instanceof Error) setError(result.message);
    else {
      setConsultations(result.consultations);
      setSegments(result.segments);
      setError(null);
    }
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    if (!isApi) return;
    applyAdminState(await fetchAdminState());
  }, [applyAdminState]);

  useEffect(() => {
    if (!isApi || !userId) return;
    let cancelled = false;
    void fetchAdminState().then((result) => {
      if (!cancelled) applyAdminState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyAdminState, userId]);

  const loadPublic = useCallback(async () => {
    if (!isApi) return;
    try {
      const result = await consultationsRepository.listPublic({ pageSize: 100 });
      setPublicList(result.data);
      setPublicError(null);
    } catch (caught) {
      setPublicError(message(caught));
    } finally {
      setPublicLoading(false);
    }
  }, []);

  const loadPublicConsultation = useCallback(async (slug: string) => {
    if (!isApi) return;
    try {
      const result = await consultationsRepository.getPublic(slug);
      setPublicList((items) => upsert(items, result.data));
      setPublicError(null);
    } catch (caught) {
      setPublicError(message(caught));
    } finally {
      setPublicLoading(false);
    }
  }, []);

  const loadConsultationDetail = useCallback(
    async (id: string) => {
      if (!isApi) return;
      try {
        const [record, responseList, invitationList] = await Promise.all([
          consultationsRepository.getAdmin(id),
          consultationsRepository.listResponses(id),
          consultationsRepository.listInvitations(id),
        ]);
        replaceConsultation(record.data);
        setResponses((items) => [...items.filter((item) => item.consultationId !== id), ...responseList.data]);
        setInvitations((items) => [...items.filter((item) => item.consultationId !== id), ...invitationList.data]);
      } catch (caught) {
        fail('Could not load consultation results', caught);
      }
    },
    [fail, replaceConsultation],
  );

  const value = useMemo<ConsultationsContextValue>(() => {
    const find = (id: string) => {
      const record = consultations.find((item) => item.id === id);
      if (!record) throw new Error('This consultation no longer exists.');
      return record;
    };

    return {
      dataMode: isApi ? 'api' : 'mock',
      consultations,
      publicConsultations: isApi ? publicList : consultations.filter((item) => PUBLIC_STATUSES.includes(item.status)),
      responses,
      invitations,
      segments,
      loading,
      error,
      publicLoading: isApi ? publicLoading : false,
      publicError,
      reload,

      loadPublic,
      loadPublicConsultation,
      loadConsultationDetail,

      async submitResponse(slug, input) {
        if (isApi) {
          try {
            const result = await consultationsRepository.submit(slug, input);
            return result.data;
          } catch (caught) {
            throw fail('Your response was not submitted', caught);
          }
        }
        const consultation = consultations.find((item) => item.slug === slug && item.status === 'OPEN');
        if (!consultation) throw fail('Your response was not submitted', new Error('This consultation is not accepting responses.'));
        const identity = identityErrors(consultation, {
          consent: input.consentToIdentityLink,
          respondent: input.respondent ?? { name: '', email: '', stakeholderGroup: '' },
        });
        if (Object.keys(identity).length) {
          throw fail('Your response was not submitted', new Error(Object.values(identity)[0]));
        }
        const response = createResponse(consultation.id, input);
        setResponses((items) => [response, ...items]);
        replaceConsultation({ ...consultation, responseCount: consultation.responseCount + 1, updatedAt: response.submittedAt });
        return { id: response.id };
      },

      async createConsultation(input) {
        if (consultations.some((item) => item.slug === input.slug)) {
          throw fail('Could not create consultation', new Error('Another consultation already uses this URL slug.'));
        }
        const id = crypto.randomUUID();
        const local = buildConsultation(input, id);
        setConsultations((items) => [local, ...items]);
        if (!isApi) return local;
        try {
          const result = await consultationsRepository.create(input, id);
          replaceConsultation(result.data, id);
          return result.data;
        } catch (caught) {
          await reload();
          throw fail('Could not create consultation', caught);
        }
      },

      async updateConsultation(id, input) {
        const current = find(id);
        if (current.status === 'ARCHIVED') {
          throw fail('Could not save changes', new Error('Archived consultations are read-only.'));
        }
        if (!EDITABLE_STATUSES.includes(current.status) && JSON.stringify(current.questions) !== JSON.stringify(input.questions)) {
          throw fail('Could not save changes', new Error('Questions cannot change once a consultation has been approved.'));
        }
        if (consultations.some((item) => item.id !== id && item.slug === input.slug)) {
          throw fail('Could not save changes', new Error('Another consultation already uses this URL slug.'));
        }
        const local: Consultation = {
          ...current,
          ...input,
          invitedCount: input.audienceSource === 'PUBLIC' ? null : (current.invitedCount ?? 0),
          updatedAt: new Date().toISOString(),
        };
        replaceConsultation(local);
        if (!isApi) return local;
        try {
          const result = await consultationsRepository.update(id, input);
          replaceConsultation(result.data);
          return result.data;
        } catch (caught) {
          await reload();
          throw fail('Could not save changes', caught);
        }
      },

      async duplicateConsultation(id) {
        const source = find(id);
        if (isApi) {
          try {
            const result = await consultationsRepository.duplicate(id);
            setConsultations((items) => [result.data, ...items]);
            return result.data;
          } catch (caught) {
            throw fail('Could not duplicate consultation', caught);
          }
        }
        const copy = duplicateConsultation(source, crypto.randomUUID(), consultations.map((item) => item.slug));
        setConsultations((items) => [copy, ...items]);
        return copy;
      },

      async changeStatus(id, input) {
        const current = find(id);
        const allowed = LIFECYCLE_ACTIONS.some((action) => action.from.includes(current.status) && action.to === input.status);
        if (!allowed) {
          throw fail('Status not changed', new Error(`A ${current.status.toLowerCase()} consultation cannot move to ${input.status.toLowerCase()}.`));
        }
        const local = applyStatusChange(current, input, actor);
        replaceConsultation(local);
        if (!isApi) return local;
        try {
          const result = await consultationsRepository.updateStatus(id, input);
          replaceConsultation(result.data);
          return result.data;
        } catch (caught) {
          await reload();
          throw fail('Status not changed', caught);
        }
      },

      async publishOutcome(id, outcomeSummary) {
        const current = find(id);
        if (current.status !== 'CLOSED') {
          throw fail('Outcome not published', new Error('Publish the outcome once the consultation has closed.'));
        }
        if (!outcomeSummary.trim()) throw fail('Outcome not published', new Error('Write the summary before publishing.'));
        const local = { ...current, outcomeSummary: outcomeSummary.trim(), updatedAt: new Date().toISOString() };
        replaceConsultation(local);
        if (!isApi) return local;
        try {
          const result = await consultationsRepository.publishOutcome(id, { outcomeSummary: outcomeSummary.trim() });
          replaceConsultation(result.data);
          return result.data;
        } catch (caught) {
          await reload();
          throw fail('Outcome not published', caught);
        }
      },

      async sendInvitations(id, input) {
        const current = find(id);
        const blockers = invitationBlockers(current, input);
        if (blockers.length) throw fail('Nothing was sent', new Error(blockers[0]));
        const localId = crypto.randomUUID();
        const local = buildInvitation(current, input, segments, invitations, actor, new Date(), localId);
        setInvitations((items) => [local, ...items]);
        if (input.kind === 'INVITATION') replaceConsultation({ ...current, invitedCount: local.recipientCount });
        if (!isApi) return local;
        try {
          const repo = consultationsRepository;
          const result = await repo.sendInvitations(id, input);
          setInvitations((items) => upsert(items, result.data, localId));
          const record = await repo.getAdmin(id);
          replaceConsultation(record.data);
          return result.data;
        } catch (caught) {
          setInvitations((items) => items.filter((item) => item.id !== localId));
          await reload();
          throw fail('Nothing was sent', caught);
        }
      },

      async addTheme(id, input) {
        const current = find(id);
        const label = input.label.trim();
        if (!label) throw fail('Theme not added', new Error('Give the theme a label.'));
        if (current.themes.some((theme) => theme.label.toLowerCase() === label.toLowerCase())) {
          throw fail('Theme not added', new Error('The codebook already has a theme with this label.'));
        }
        const theme: ConsultationTheme = { id: `th-${crypto.randomUUID().slice(0, 8)}`, label, description: input.description.trim() };
        replaceConsultation({ ...current, themes: [...current.themes, theme] });
        if (!isApi) return theme;
        try {
          const result = await consultationsRepository.addTheme(id, { label, description: theme.description });
          setConsultations((items) =>
            items.map((item) => (item.id === id ? { ...item, themes: item.themes.map((entry) => (entry.id === theme.id ? result.data : entry)) } : item)),
          );
          return result.data;
        } catch (caught) {
          await reload();
          throw fail('Theme not added', caught);
        }
      },

      async tagResponse(responseId, input) {
        const current = responses.find((item) => item.id === responseId);
        if (!current) throw fail('Themes not saved', new Error('This response is no longer loaded.'));
        const local: ConsultationResponse = { ...current, themes: { ...current.themes, [input.questionId]: [...input.themeIds] } };
        setResponses((items) => upsert(items, local));
        if (!isApi) return local;
        try {
          const result = await consultationsRepository.tagResponse(responseId, input);
          setResponses((items) => upsert(items, result.data));
          return result.data;
        } catch (caught) {
          setResponses((items) => upsert(items, current));
          throw fail('Themes not saved', caught);
        }
      },
    };
  }, [actor, consultations, error, fail, invitations, loadConsultationDetail, loadPublic, loadPublicConsultation, loading, publicError, publicList, publicLoading, reload, replaceConsultation, responses, segments]);

  return <ConsultationsContext.Provider value={value}>{children}</ConsultationsContext.Provider>;
}
