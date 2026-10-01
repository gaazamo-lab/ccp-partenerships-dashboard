import { createApiClient } from '@partner-crm/api-client';

import { env } from './env';

/** Same-origin client for this app's backend endpoints. */
export const apiClient = createApiClient({ baseUrl: env.apiUrl });
