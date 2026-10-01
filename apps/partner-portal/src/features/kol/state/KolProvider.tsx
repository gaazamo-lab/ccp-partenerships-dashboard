import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@rfdtech/components';

import type { KolRepository } from '@partner-crm/api-client';
import { useAuth } from '@partner-crm/auth';
import type { ApiEnvelope, KolContent, KolEngagement, KolMediaMention, KolProfile } from '@partner-crm/types';

import type { MemoryKolRepositoryDeps } from '@/features/kol/data/memoryRepository';
import { createKolRepository } from '@/features/kol/data/repository';
import { KolContext, type KolContextValue } from '@/features/kol/state/KolContext';
import { useCrm } from '@/features/stakeholders/state/CrmContext';

interface KolData {
  profiles: KolProfile[];
  engagements: KolEngagement[];
  content: KolContent[];
  mentions: KolMediaMention[];
}

const EMPTY: KolData = { profiles: [], engagements: [], content: [], mentions: [] };

/** Live values the mock repository reads on each command, kept current by the provider's effects. */
const kolRuntime = { stakeholderIds: new Set<string>(), actor: 'Current user' };

const runtimeDeps: MemoryKolRepositoryDeps = {
  stakeholderExists: (id) => kolRuntime.stakeholderIds.has(id),
  currentUser: () => kolRuntime.actor,
};

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Something went wrong. Try again.';
}

function upsert<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [item, ...items];
}

async function loadAll(repository: KolRepository): Promise<KolData> {
  const [profiles, engagements, content, mentions] = await Promise.all([
    repository.list(),
    repository.listEngagements(),
    repository.listContent(),
    repository.listMentions(),
  ]);
  return {
    profiles: profiles.data,
    engagements: engagements.data,
    content: content.data,
    mentions: mentions.data,
  };
}

/**
 * S092 state. Loads profiles, engagements, content and mentions through the
 * data-mode repository and exposes async actions that toast on failure.
 */
export function KolProvider({ children }: { children: ReactNode }) {
  const { stakeholders } = useCrm();
  const { user } = useAuth();
  const { toast } = useToast();

  // The in-memory repository checks S081 links and stamps the actor; it reads
  // both lazily from the runtime holder so it never has to be rebuilt (and
  // lose its store) when the stakeholder list or the user changes.
  useEffect(() => {
    kolRuntime.stakeholderIds = new Set(stakeholders.map((item) => item.id));
  }, [stakeholders]);
  useEffect(() => {
    kolRuntime.actor = user?.name ?? 'Current user';
  }, [user]);

  const [repository] = useState(() => createKolRepository(runtimeDeps));

  const [data, setData] = useState<KolData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load once someone is signed in, and again whenever the signed-in user
  // changes; before sign-in every API call would only return 401.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    loadAll(repository)
      .then((next) => {
        if (!active) return;
        setData(next);
        setError(null);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(messageOf(reason));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository, userId]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadAll(repository));
      setError(null);
    } catch (reason) {
      const message = messageOf(reason);
      setError(message);
      toast({ title: 'Could not load KOL records', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [repository, toast]);

  const run = useCallback(
    async <T,>(
      failureTitle: string,
      command: () => Promise<ApiEnvelope<T>>,
      apply: (saved: T) => void,
    ): Promise<T | null> => {
      try {
        const { data: saved } = await command();
        apply(saved);
        return saved;
      } catch (reason) {
        toast({ title: failureTitle, description: messageOf(reason), variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  const value = useMemo<KolContextValue>(
    () => ({
      ...data,
      loading,
      error,
      reload,
      createProfile: (input) =>
        run('Could not create the KOL profile', () => repository.create(input), (saved) =>
          setData((current) => ({ ...current, profiles: upsert(current.profiles, saved) })),
        ),
      updateProfile: (id, input) =>
        run('Could not save the KOL profile', () => repository.update(id, input), (saved) =>
          setData((current) => ({ ...current, profiles: upsert(current.profiles, saved) })),
        ),
      createEngagement: (kolId, input) =>
        run(
          'Could not plan the engagement',
          () => repository.createEngagement(kolId, input),
          (saved) =>
            setData((current) => ({ ...current, engagements: upsert(current.engagements, saved) })),
        ),
      moveEngagement: (id, input) =>
        run('Could not move the engagement', () => repository.moveEngagement(id, input), (saved) =>
          setData((current) => ({ ...current, engagements: upsert(current.engagements, saved) })),
        ),
      recordParticipation: (id, input) =>
        run(
          'Could not record participation',
          () => repository.recordParticipation(id, input),
          (saved) =>
            setData((current) => ({ ...current, engagements: upsert(current.engagements, saved) })),
        ),
      createContent: (kolId, input) =>
        run(
          'Could not commission the content',
          () => repository.createContent(kolId, input),
          (saved) => setData((current) => ({ ...current, content: upsert(current.content, saved) })),
        ),
      moveContent: (id, input) =>
        run('Could not move the content', () => repository.moveContent(id, input), (saved) =>
          setData((current) => ({ ...current, content: upsert(current.content, saved) })),
        ),
      addMention: (kolId, input) =>
        run('Could not log the mention', () => repository.addMention(kolId, input), (saved) =>
          setData((current) => ({ ...current, mentions: upsert(current.mentions, saved) })),
        ),
    }),
    [data, loading, error, reload, run, repository],
  );

  return <KolContext.Provider value={value}>{children}</KolContext.Provider>;
}
