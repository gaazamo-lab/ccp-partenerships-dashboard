import { useCallback, useEffect, useState } from 'react';

import type { PublicMicrosite } from '@partner-crm/types';

import { micrositesRepository as repository } from '@/features/microsites/data/repository';
import { errorMessage, isLockedError, isNotFoundError } from '@/features/microsites/errors';

/* The public pages talk to the repository only through these hooks. */

type ListState =
  | { status: 'loading' }
  | { status: 'ready'; sites: PublicMicrosite[] }
  | { status: 'error'; message: string };

export function usePublicMicrosites(): ListState {
  const [state, setState] = useState<ListState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    repository.listPublic().then(
      (response) => {
        if (!cancelled) setState({ status: 'ready', sites: response.data });
      },
      (reason: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: errorMessage(reason, 'Microsites could not be loaded.') });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export type PublicSiteState =
  | { status: 'loading' }
  | { status: 'ready'; site: PublicMicrosite }
  | { status: 'locked' }
  | { status: 'not-found' }
  | { status: 'error'; message: string };

type Keyed = PublicSiteState & { slug: string };

/**
 * Loads one published microsite by slug and records a single view once it is
 * shown — after the first successful load, or after an unlock.
 */
export function usePublicMicrosite(slug: string) {
  const [state, setState] = useState<Keyed>({ slug, status: 'loading' });

  const recordView = useCallback((viewed: string) => {
    // Analytics must never break the page.
    repository.recordView(viewed).catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    repository.getPublic(slug).then(
      (response) => {
        if (cancelled) return;
        setState({ slug, status: 'ready', site: response.data });
        recordView(slug);
      },
      (reason: unknown) => {
        if (cancelled) return;
        if (isLockedError(reason)) setState({ slug, status: 'locked' });
        else if (isNotFoundError(reason)) setState({ slug, status: 'not-found' });
        else setState({ slug, status: 'error', message: errorMessage(reason, 'This microsite could not be loaded.') });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, recordView]);

  /** Resolves on success; rejects with the server's error for the form to show. */
  const unlock = useCallback(
    async (accessCode: string) => {
      const response = await repository.unlock(slug, { accessCode });
      setState({ slug, status: 'ready', site: response.data });
      recordView(slug);
    },
    [slug, recordView],
  );

  // A new slug is loading until its own result arrives.
  const current: PublicSiteState = state.slug === slug ? state : { status: 'loading' };
  return { state: current, unlock };
}
