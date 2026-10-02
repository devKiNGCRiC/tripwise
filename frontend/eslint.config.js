/**
 * eslint.config.js — code-quality rules (run with `npm run lint`).
 *
 * Uses ESLint's "flat config": a list of rule sets applied in order.
 * We lint only our TypeScript source; generated files are ignored.
 */
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  // Build output and MSW's generated service worker are not our code.
  globalIgnores(['dist', 'coverage', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    // Start from the recommended JS + TypeScript rule sets.
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      // Hooks must be called in the same order every render — breaking this causes real bugs.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Allow intentionally-unused names that start with "_" and rest-sibling omissions.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
]);
