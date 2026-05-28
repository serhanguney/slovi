import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import tailwindcss from 'eslint-plugin-tailwindcss';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': 'warn',

      // Arrow functions only — no function declarations or expressions
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',

      // No for loops — use array methods
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForStatement',
          message:
            'Use array iteration methods (map, filter, reduce, forEach) instead of for loops.',
        },
        {
          selector: 'ForInStatement',
          message: 'Use Object.keys() or Object.entries() with array methods instead of for...in.',
        },
        {
          selector: 'ForOfStatement',
          message: 'Use array iteration methods or forEach instead of for...of.',
        },
      ],

      // Prefer const — catches the "let + assign later" pattern where let is never reassigned
      'prefer-const': 'error',

      // No parameter/property mutation
      'no-param-reassign': ['error', { props: true }],

      // TypeScript: type over interface, no any, no non-null assertion
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { tailwindcss },
    settings: {
      tailwindcss: {
        // also lint classes inside cn(), clsx(), twMerge()
        callees: ['cn', 'clsx', 'twMerge'],
      },
    },
    rules: {
      // disallows arbitrary values: text-[#1A1A1A], h-[52px], gap-[10px], etc.
      'tailwindcss/no-arbitrary-value': 'warn',
      // catches logically contradicting classes on the same element
      'tailwindcss/no-contradicting-classname': 'error',
    },
  },
]);
