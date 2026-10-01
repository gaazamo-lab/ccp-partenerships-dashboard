import { type InternationalRepository, createHttpInternationalRepository } from '@partner-crm/api-client';

import { apiClient } from '@/config/api';
import { env } from '@/config/env';

import { createMemoryInternationalRepository } from './memoryRepository';

/**
 * The current user's name, which the in-memory repository uses where the
 * backend would read the actor from the session cookie (approval history,
 * four-eyes check). The HTTP repository ignores it.
 */
let currentActor = 'Unknown user';

export function setRepositoryActor(name: string | null | undefined) {
  currentActor = name?.trim() || 'Unknown user';
}

export const internationalRepository: InternationalRepository =
  env.dataMode === 'api'
    ? createHttpInternationalRepository(apiClient)
    : createMemoryInternationalRepository({ actor: () => currentActor });
