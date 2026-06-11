import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@plynth/shared/utils': fileURLToPath(
        new URL('./packages/shared/src/utils/index.ts', import.meta.url)
      ),
      '@plynth/shared/mock': fileURLToPath(
        new URL('./packages/shared/src/mock.ts', import.meta.url)
      ),
      '@plynth/supabase/services': fileURLToPath(
        new URL('./packages/supabase/src/services/index.ts', import.meta.url)
      ),
      '@plynth/supabase/client': fileURLToPath(
        new URL('./packages/supabase/src/client.ts', import.meta.url)
      ),
      '@lender/src': fileURLToPath(new URL('./apps/lender/src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
