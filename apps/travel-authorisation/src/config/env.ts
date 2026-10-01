import { z } from 'zod';

const envSchema = z.object({
  VITE_AUTH_MODE: z.enum(['api', 'mock']).default(import.meta.env.DEV ? 'mock' : 'api'),
  VITE_AUTH_API_URL: z.string().min(1).default('/api/v1/auth'),
  VITE_DATA_MODE: z.enum(['api', 'mock']).default(import.meta.env.DEV ? 'mock' : 'api'),
  VITE_API_URL: z.string().min(1).default('/api/v1'),
});

const values = envSchema.parse(import.meta.env);

if (
  import.meta.env.PROD &&
  (values.VITE_AUTH_MODE === 'mock' || values.VITE_DATA_MODE === 'mock')
) {
  throw new Error('Mock authentication and data are not allowed in production builds.');
}

export const env = {
  authMode: values.VITE_AUTH_MODE,
  authApiUrl: values.VITE_AUTH_API_URL,
  dataMode: values.VITE_DATA_MODE,
  apiUrl: values.VITE_API_URL,
} as const;
