import pluginJs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Merge browser + node globals and normalize keys
const combinedGlobals = { ...globals.browser, ...globals.node };
const trimmedGlobals = Object.fromEntries(
  Object.entries(combinedGlobals).map(([key, value]) => [key.trim(), value]),
);

export default [
  // Ignore common build/test artifacts
  {
    ignores: [
      'coverage/',
      'tests/',
      'dist/',
      'build/',
      'node_modules/',
      '**/.wrangler/',
    ],
  },

  // JavaScript files: apply JS recommended rules and globals
  {
    files: ['**/*.{js,cjs,mjs}'],
    ...pluginJs.configs.recommended,
    languageOptions: {
      ...(pluginJs.configs.recommended.languageOptions ?? {}),
      globals: trimmedGlobals,
    },
  },

  // TypeScript files: enable type-aware linting with proper parserOptions
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
        sourceType: 'module',
      },
      globals: trimmedGlobals,
    },
  },
  // Apply TypeScript recommended type-checked configs only to TS files
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    files: ['**/*.{ts,tsx}'],
    ...cfg,
  })),

  // Repo-specific TypeScript rule tweaks
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
