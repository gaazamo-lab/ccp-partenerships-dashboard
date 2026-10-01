import { createHttpMicrositesRepository, type MicrositesRepository } from '@partner-crm/api-client';
import type { Microsite } from '@partner-crm/types';

import { apiClient } from '@/config/api';
import { env } from '@/config/env';

import { createMemoryMicrositesRepository, type MemoryMicrositesRepository } from './memoryRepository';

/** The signed-in user's name, used by the mock backend to record reviews. */
let mockActor = 'Mock user';

export function setRepositoryActor(name: string) {
  mockActor = name;
}

const memory: MemoryMicrositesRepository | null =
  env.dataMode === 'api' ? null : createMemoryMicrositesRepository({ actor: () => mockActor });

/** One repository for the whole app: HTTP in `api` mode, the seeded store otherwise. */
export const micrositesRepository: MicrositesRepository =
  memory ?? createHttpMicrositesRepository(apiClient);

/**
 * Whether a password is stored for the site. The contract never returns codes;
 * a site can only be switched to `PASSWORD` with a code, so in `api` mode a
 * `PASSWORD` site is taken to have one.
 */
export function hasStoredAccessCode(site: Pick<Microsite, 'id' | 'access'>): boolean {
  if (site.access !== 'PASSWORD') return false;
  return memory ? memory.hasAccessCode(site.id) : true;
}
