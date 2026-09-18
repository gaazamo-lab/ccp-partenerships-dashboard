import type { AuthClient, AuthUser, LoginCredentials } from './types';

const MOCK_SESSION_KEY = 'partner-crm.mock-session';

function displayName(email: string): string {
  const localPart = email.split('@')[0] ?? 'Partner User';
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

export function createMockAuthClient(): AuthClient {
  return {
    async getSession() {
      const stored = sessionStorage.getItem(MOCK_SESSION_KEY);
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    },
    async login({ email, password }: LoginCredentials) {
      if (!email.includes('@') || password.length < 8) {
        throw new Error('Enter a valid email and a password of at least eight characters.');
      }

      const user: AuthUser = {
        id: 'local-preview-user',
        email,
        name: displayName(email),
        role: 'CRM Administrator',
      };
      sessionStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
      return user;
    },
    async logout() {
      sessionStorage.removeItem(MOCK_SESSION_KEY);
    },
  };
}
