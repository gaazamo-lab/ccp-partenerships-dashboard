import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@rfdtech/components';

import { useAuth } from '@partner-crm/auth';
import type { Microsite, MicrositeReview, MicrositeTemplate } from '@partner-crm/types';

import {
  hasStoredAccessCode,
  micrositesRepository as repository,
  setRepositoryActor,
} from '@/features/microsites/data/repository';
import { errorMessage } from '@/features/microsites/errors';

import { MicrositesContext, type MicrositesContextValue } from './MicrositesContext';

/** Sites whose review history the overview needs up front (who submitted, what was asked). */
const REVIEW_STATUSES = new Set<Microsite['status']>(['IN_REVIEW', 'CHANGES_REQUESTED']);

interface Snapshot {
  sites: Microsite[];
  templates: MicrositeTemplate[];
  reviews: Record<string, MicrositeReview[]>;
}

async function fetchSnapshot(): Promise<Snapshot> {
  const [sites, templates] = await Promise.all([repository.list(), repository.listTemplates()]);
  const pending = sites.data.filter((site) => REVIEW_STATUSES.has(site.status));
  const histories = await Promise.all(pending.map((site) => repository.listReviews(site.id)));
  const reviews: Record<string, MicrositeReview[]> = {};
  pending.forEach((site, index) => {
    reviews[site.id] = histories[index]?.data ?? [];
  });
  return { sites: sites.data, templates: templates.data, reviews };
}

export function MicrositesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const actor = user?.name ?? 'Signed-in user';

  const [sites, setSites] = useState<Microsite[]>([]);
  const [templates, setTemplates] = useState<MicrositeTemplate[]>([]);
  const [reviews, setReviews] = useState<Record<string, MicrositeReview[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((snapshot: Snapshot) => {
    setSites(snapshot.sites);
    setTemplates(snapshot.templates);
    setReviews((current) => ({ ...current, ...snapshot.reviews }));
    setError(null);
    setLoading(false);
  }, []);

  const failLoad = useCallback((reason: unknown) => {
    setError(errorMessage(reason, 'Microsites could not be loaded.'));
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSnapshot().then(
      (snapshot) => {
        if (!cancelled) apply(snapshot);
      },
      (reason: unknown) => {
        if (!cancelled) failLoad(reason);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [apply, failLoad]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      apply(await fetchSnapshot());
    } catch (reason) {
      failLoad(reason);
    }
  }, [apply, failLoad]);

  const loadReviews = useCallback(async (id: string) => {
    try {
      const history = await repository.listReviews(id);
      setReviews((current) => ({ ...current, [id]: history.data }));
    } catch (reason) {
      toast({
        title: 'Review history unavailable',
        description: errorMessage(reason),
        variant: 'error',
      });
    }
  }, [toast]);

  /**
   * Runs one command: on success the server's record replaces the local one
   * (and the review history is refreshed when it may have changed); on failure
   * the server's message is toasted and the error rethrown so a form can keep
   * its input and show field errors.
   */
  const command = useCallback(
    async (
      failureTitle: string,
      call: () => Promise<{ data: Microsite }>,
      refreshReviews = false,
    ): Promise<Microsite> => {
      try {
        setRepositoryActor(actor);
        const { data } = await call();
        setSites((current) => {
          const exists = current.some((site) => site.id === data.id);
          return exists ? current.map((site) => (site.id === data.id ? data : site)) : [data, ...current];
        });
        if (refreshReviews) void loadReviews(data.id);
        return data;
      } catch (reason) {
        toast({ title: failureTitle, description: errorMessage(reason), variant: 'error' });
        throw reason;
      }
    },
    [actor, loadReviews, toast],
  );

  const value = useMemo<MicrositesContextValue>(
    () => ({
      sites,
      templates,
      reviews,
      loading,
      error,
      actor,
      reload,
      loadReviews,
      hasStoredCode: hasStoredAccessCode,
      create: (input) => command('Microsite not created', () => repository.create(input)),
      update: (id, input) => command('Changes not saved', () => repository.update(id, input)),
      setAccess: (id, input) => command('Access not updated', () => repository.setAccess(id, input)),
      review: (id, input) => command('Review not recorded', () => repository.review(id, input), true),
      publish: (id) => command('Microsite not published', () => repository.publish(id)),
      unpublish: (id) => command('Microsite not unpublished', () => repository.unpublish(id)),
      archive: (id, input) => command('Microsite not archived', () => repository.archive(id, input)),
    }),
    [sites, templates, reviews, loading, error, actor, reload, loadReviews, command],
  );

  return <MicrositesContext.Provider value={value}>{children}</MicrositesContext.Provider>;
}
