import { type ApiClient, ApiError } from '@partner-crm/api-client';

import type { AuthClient, AuthUser, LoginCredentials } from './types';

interface SessionResponse {
  user: AuthUser;
}

export function createAuthClient(apiClient: ApiClient): AuthClient {
  return {
    async getSession() {
      try {
        const response = await apiClient.request<SessionResponse>('/session');
        return response.user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    async login(credentials: LoginCredentials) {
      const response = await apiClient.request<SessionResponse>('/login', {
        method: 'POST',
        body: credentials,
      });
      return response.user;
    },
    async logout() {
      await apiClient.request<void>('/logout', { method: 'POST' });
    },
  };
}
