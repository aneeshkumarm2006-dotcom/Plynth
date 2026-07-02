import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  // Served from /seoteam/ in production (one Vercel project); from / in dev.
  base: mode === 'production' ? '/seoteam/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@plynth/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5176,
    // Proxy the serverless API to a local `vercel dev` (port 3000) when
    // developing the dashboard end-to-end.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
}));
