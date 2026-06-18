/**
 * Root ESLint config for all three apps (broker / lender / admin).
 *
 * Non-type-aware (no parserOptions.project) so it stays fast and doesn't need a
 * per-app tsconfig wired in. Type-checking is already enforced by `pnpm type-check`;
 * ESLint here catches lint-level issues. Rules are deliberately lenient — the
 * codebase was never linted before, so the noisier stylistic checks are warnings.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, es2022: true, node: true },
  ignorePatterns: ['dist', 'node_modules', '**/*.config.ts', '**/*.config.js'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    'no-empty': 'warn',
    'no-useless-escape': 'warn',
    'prefer-const': 'warn',
  },
};
