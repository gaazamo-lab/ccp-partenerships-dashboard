import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@rfdtech/components';

import { useAuth } from '@partner-crm/auth';
import type {
  ApiEnvelope,
  IrCorrespondence,
  IrEngagement,
  IrGift,
  IrLetterTemplate,
} from '@partner-crm/types';

import { internationalRepository as repository, setRepositoryActor } from '../data/repository';
import { IrContext, type IrContextValue } from './IrContext';

function upsert<T extends { id: string }>(items: T[], next: T): T[] {
  return items.some((item) => item.id === next.id)
    ? items.map((item) => (item.id === next.id ? next : item))
    : [next, ...items];
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'The request could not be completed.';
}

interface Snapshot {
  engagements: IrEngagement[];
  correspondence: IrCorrespondence[];
  templates: IrLetterTemplate[];
  gifts: IrGift[];
}

const EMPTY: Snapshot = { engagements: [], correspondence: [], templates: [], gifts: [] };

async function loadAll(): Promise<Snapshot> {
  const [engagements, correspondence, templates, gifts] = await Promise.all([
    repository.listEngagements(),
    repository.listCorrespondence(),
    repository.listTemplates(),
    repository.listGifts(),
  ]);
  return {
    engagements: engagements.data,
    correspondence: correspondence.data,
    templates: templates.data,
    gifts: gifts.data,
  };
}

/**
 * S083 state. Loads through the repository once a user is signed in, exposes
 * loading and error state, and wraps every command so a rejection becomes a
 * toast carrying the rule that was broken.
 */
export function IrProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const userId = user?.id;
  const actor = user?.name ?? 'Unknown user';

  useEffect(() => {
    if (!userId) return;
    let active = true;
    loadAll()
      .then((snapshot) => {
        if (!active) return;
        setData(snapshot);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (active) setError(messageOf(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  const run = useCallback(
    async <T,>(
      command: () => Promise<ApiEnvelope<T>>,
      apply: (record: T) => void,
      title: string,
    ): Promise<T | null> => {
      setRepositoryActor(actor);
      try {
        const envelope = await command();
        apply(envelope.data);
        return envelope.data;
      } catch (reason) {
        toast({ title, description: messageOf(reason), variant: 'error' });
        return null;
      }
    },
    [actor, toast],
  );

  const value = useMemo<IrContextValue>(() => {
    const engagementCommand = (command: () => Promise<ApiEnvelope<IrEngagement>>, title: string) =>
      run(
        command,
        (record) => setData((current) => ({ ...current, engagements: upsert(current.engagements, record) })),
        title,
      );
    const correspondenceCommand = (
      command: () => Promise<ApiEnvelope<IrCorrespondence>>,
      title: string,
    ) =>
      run(
        command,
        (record) =>
          setData((current) => ({ ...current, correspondence: upsert(current.correspondence, record) })),
        title,
      );
    const giftCommand = (command: () => Promise<ApiEnvelope<IrGift>>, title: string) =>
      run(
        command,
        (record) => setData((current) => ({ ...current, gifts: upsert(current.gifts, record) })),
        title,
      );
    // A new template version also retires the previous one, so re-read the list.
    const templateCommand = (command: () => Promise<ApiEnvelope<IrLetterTemplate>>, title: string) =>
      run(
        command,
        (record) => {
          setData((current) => ({ ...current, templates: upsert(current.templates, record) }));
          void repository
            .listTemplates()
            .then((envelope) => setData((current) => ({ ...current, templates: envelope.data })))
            .catch(() => undefined);
        },
        title,
      );

    return {
      ...data,
      loading,
      error,
      reload,
      actor,
      role: user?.role,

      createEngagement: (input) =>
        engagementCommand(() => repository.createEngagement(input), 'Engagement not saved'),
      updateEngagement: (id, input) =>
        engagementCommand(() => repository.updateEngagement(id, input), 'Engagement not updated'),
      transitionEngagement: (id, input) =>
        engagementCommand(() => repository.transitionEngagement(id, input), 'Status not changed'),
      addDelegate: (id, input) =>
        engagementCommand(() => repository.addDelegate(id, input), 'Delegate not added'),
      removeDelegate: (id, memberId) =>
        engagementCommand(() => repository.removeDelegate(id, memberId), 'Delegate not removed'),
      addProtocolTask: (id, input) =>
        engagementCommand(() => repository.addProtocolTask(id, input), 'Task not added'),
      updateProtocolTask: (id, taskId, input) =>
        engagementCommand(() => repository.updateProtocolTask(id, taskId, input), 'Task not updated'),
      addFollowUp: (id, input) =>
        engagementCommand(() => repository.addFollowUp(id, input), 'Follow-up not added'),
      updateFollowUp: (id, followUpId, input) =>
        engagementCommand(
          () => repository.updateFollowUp(id, followUpId, input),
          'Follow-up not updated',
        ),
      requestSupport: (id, input) =>
        engagementCommand(() => repository.requestSupport(id, input), 'Support not requested'),
      updateSupport: (id, requestId, input) =>
        engagementCommand(() => repository.updateSupport(id, requestId, input), 'Handoff not updated'),

      createCorrespondence: (input) =>
        correspondenceCommand(() => repository.createCorrespondence(input), 'Correspondence not saved'),
      updateCorrespondence: (id, input) =>
        correspondenceCommand(
          () => repository.updateCorrespondence(id, input),
          'Correspondence not updated',
        ),
      transitionCorrespondence: (id, input) =>
        correspondenceCommand(
          () => repository.transitionCorrespondence(id, input),
          'Status not changed',
        ),

      createTemplate: (input) =>
        templateCommand(() => repository.createTemplate(input), 'Template not saved'),
      updateTemplate: (id, input) =>
        templateCommand(() => repository.updateTemplate(id, input), 'Template version not saved'),

      createGift: (input) => giftCommand(() => repository.createGift(input), 'Gift not recorded'),
      retryGiftFlag: (id) => giftCommand(() => repository.retryGiftFlag(id), 'S011 flag not retried'),
    };
  }, [data, loading, error, reload, actor, user?.role, run]);

  return <IrContext.Provider value={value}>{children}</IrContext.Provider>;
}
