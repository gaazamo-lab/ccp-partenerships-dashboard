import { createApiClient } from '@partner-crm/api-client';
import { createAuthClient, createMockAuthClient } from '@partner-crm/auth';

import { env } from './env';

const authApi = createApiClient({ baseUrl: env.authApiUrl });
export const authClient =
  env.authMode === 'mock' ? createMockAuthClient() : createAuthClient(authApi);
