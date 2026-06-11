import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  // Served from /broker/ in production (one Vercel project, two apps).
  base: '/broker/',
  plugins: [react()],
  resolve: {
    alias: {
      '@plynth/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@plynth/supabase': path.resolve(__dirname, '../../packages/supabase/src'),
    },
  },
  server: {
    port: 5173,
  },
});
