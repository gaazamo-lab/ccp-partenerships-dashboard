import { createApiClient } from '@partner-crm/api-client';

import { env } from './env';

/** Same-origin client for the consultation backend (`/api/v1`, cookie session). */
export const apiClient = createApiClient({ baseUrl: env.apiUrl });
