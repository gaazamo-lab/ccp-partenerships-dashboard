import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  server: {
    port: 5179,
    // Same-origin API in development: the backend's session cookie is
    // HTTP-only and SameSite, so the browser must see one origin.
    proxy: { '/api': 'http://localhost:8000' },
  },
  build: { sourcemap: true },
});
