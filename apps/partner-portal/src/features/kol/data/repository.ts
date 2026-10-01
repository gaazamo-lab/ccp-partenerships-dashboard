import { type KolRepository, createHttpKolRepository } from '@partner-crm/api-client';

import { apiClient } from '@/config/api';
import { env } from '@/config/env';

import { type MemoryKolRepositoryDeps, createMemoryKolRepository } from './memoryRepository';

/**
 * The S092 repository for the current data mode: the `/api/v1` backend in
 * `api` mode, a seeded in-memory store enforcing the same rules in `mock` mode.
 */
export function createKolRepository(deps: MemoryKolRepositoryDeps): KolRepository {
  return env.dataMode === 'api' ? createHttpKolRepository(apiClient) : createMemoryKolRepository(deps);
}
