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
