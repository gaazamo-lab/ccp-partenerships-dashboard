import { z } from 'zod';

const envSchema = z.object({
  VITE_AUTH_MODE: z.enum(['api', 'mock']).default('api'),
  VITE_AUTH_API_URL: z.string().min(1).default('/api/auth'),
});

const values = envSchema.parse(import.meta.env);

if (import.meta.env.PROD && values.VITE_AUTH_MODE === 'mock') {
  throw new Error('Mock authentication is not allowed in production builds.');
}

export const env = {
  authMode: values.VITE_AUTH_MODE,
  authApiUrl: values.VITE_AUTH_API_URL,
} as const;
