import { createApiClient } from '@partner-crm/api-client';

import { env } from './env';

/** Same-origin client for the Partner CRM backend (`/api/v1`). */
export const apiClient = createApiClient({ baseUrl: env.apiUrl });
