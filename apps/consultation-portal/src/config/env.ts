/**
 * Runtime configuration, validated once at start-up.
 *
 * Mirrors the zod schema in `apps/partner-portal/src/config/env.ts`. `zod` is not
 * a dependency of this app yet (adding one needs a `pnpm install`), so the same
 * rules are checked by hand: enums fall back to their defaults only when unset,
 * and an invalid value fails loudly instead of silently switching mode.
 */
type Mode = 'api' | 'mock';

function readMode(name: string, value: string | undefined, fallback: Mode): Mode {
  if (value === undefined || value === '') return fallback;
  if (value === 'api' || value === 'mock') return value;
  throw new Error(`${name} must be "api" or "mock" (received "${value}").`);
}

function readUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

const source = import.meta.env;

const values = {
  VITE_AUTH_MODE: readMode('VITE_AUTH_MODE', source.VITE_AUTH_MODE, 'api'),
  VITE_AUTH_API_URL: readUrl(source.VITE_AUTH_API_URL, '/api/v1/auth'),
  VITE_DATA_MODE: readMode('VITE_DATA_MODE', source.VITE_DATA_MODE, 'api'),
  VITE_API_URL: readUrl(source.VITE_API_URL, '/api/v1'),
};

if (import.meta.env.PROD && (values.VITE_AUTH_MODE === 'mock' || values.VITE_DATA_MODE === 'mock')) {
  throw new Error('Mock authentication and data are not allowed in production builds.');
}

export const env = {
  authMode: values.VITE_AUTH_MODE,
  authApiUrl: values.VITE_AUTH_API_URL,
  /** `api` reads and writes through the backend; `mock` keeps a seeded in-memory store. */
  dataMode: values.VITE_DATA_MODE,
  apiUrl: values.VITE_API_URL,
} as const;
