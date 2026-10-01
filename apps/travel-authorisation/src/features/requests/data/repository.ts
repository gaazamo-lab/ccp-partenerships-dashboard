import { type TravelRepository, createHttpTravelRepository } from '@partner-crm/api-client';

import { apiClient } from '@/config/api';
import { env } from '@/config/env';

/**
 * `null` in mock mode: the provider then keeps the seeded in-memory register,
 * so the workspace is still demonstrable without the S084 backend running.
 */
export const travelRepository: TravelRepository | null =
  env.dataMode === 'api' ? createHttpTravelRepository(apiClient) : null;

/** True when this app is talking to the S084 API rather than the seeded data. */
export const TRAVEL_API_MODE = travelRepository !== null;
