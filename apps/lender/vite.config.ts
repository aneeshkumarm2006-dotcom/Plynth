import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => ({
  // Served from /lender/ in production (one Vercel project, three apps); served
  // from / in dev so deep-links work and the router basename ('/') stays aligned.
  base: mode === 'production' ? '/lender/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@plynth/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@plynth/supabase': path.resolve(__dirname, '../../packages/supabase/src'),
    },
  },
  server: {
    port: 5174,
  },
}));
