// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig(
  {
    ignores: ['build/', 'dist/', '.svelte-kit/', 'node_modules/', 'dev-vault/'],
  },

  eslint.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  {
    files: ['**/*.{ts,svelte}'],

    extends: [...tseslint.configs.recommendedTypeChecked, ...svelte.configs['flat/recommended']],

    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte'],
      },
    },

    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  prettier,
);
