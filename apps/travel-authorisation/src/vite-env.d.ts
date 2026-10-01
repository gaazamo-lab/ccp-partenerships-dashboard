/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_MODE?: 'api' | 'mock';
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_DATA_MODE?: 'api' | 'mock';
  readonly VITE_API_URL?: string;
}
