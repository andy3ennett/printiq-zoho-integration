// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**'],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        // If you prefer vitest globals instead of jest, swap to globals.vitest
        ...globals.jest,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
