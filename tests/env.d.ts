// Ambient typings for the tests project.
//
// The source under test (e.g. packages/supabase/src/client.ts) reads
// `import.meta.env`, a Vite feature. Vite types ship as `vite/client`, but
// under pnpm `vite` is not hoisted to the repo-root node_modules, so it can't
// be resolved from this root tsconfig. The runtime is fine — vitest provides
// `import.meta.env` — this only feeds the type-checker. We mirror the minimal
// shape vite/client declares so the test program type-checks cleanly.
interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
