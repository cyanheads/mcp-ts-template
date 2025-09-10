import pluginJs from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const combinedGlobals = { ...globals.browser, ...globals.node };
const trimmedGlobals = Object.fromEntries(
  Object.entries(combinedGlobals).map(([key, value]) => [key.trim(), value]),
);

export default [
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
  { languageOptions: { globals: trimmedGlobals } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
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
