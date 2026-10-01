import {
  type ConsultationsRepository,
  createHttpConsultationsRepository,
  createHttpStakeholdersRepository,
} from '@partner-crm/api-client';
import type { ApiEnvelope, Segment } from '@partner-crm/types';

import { apiClient } from '@/config/api';

/**
 * API-mode transport. Mock mode never touches these: the provider keeps its
 * seeded in-memory state and applies the same domain rules locally.
 */
export const consultationsRepository: ConsultationsRepository = createHttpConsultationsRepository(apiClient);

const stakeholders = createHttpStakeholdersRepository(apiClient);

/** S081 segments used as consultation audiences (GET /segments). */
export function listSegments(): Promise<ApiEnvelope<Segment[]>> {
  return stakeholders.listSegments();
}
