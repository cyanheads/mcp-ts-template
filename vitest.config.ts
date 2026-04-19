/**
 * @fileoverview Root Vitest config. Uses Vitest 4 `projects` so unit, smoke,
 * compliance, fuzz, and integration suites live in a single config and can be
 * run individually by filter (`--project unit`) or all at once.
 * @module vitest.config
 */
import { defineConfig } from 'vitest/config';

const sharedUnit = {
  globals: true,
  environment: 'node' as const,
  setupFiles: ['./tests/setup.ts'],
  pool: 'forks' as const,
  maxWorkers: 4,
  isolate: true,
};

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // Inline zod to fix Vite SSR transform issues with Zod 4.
  ssr: {
    noExternal: ['zod'],
  },
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          ...sharedUnit,
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          exclude: ['node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          ...sharedUnit,
          name: 'compliance',
          include: ['tests/compliance/**/*.test.ts'],
          exclude: ['node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          ...sharedUnit,
          name: 'smoke',
          include: ['tests/smoke/**/*.test.ts'],
          exclude: ['node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          ...sharedUnit,
          name: 'fuzz',
          include: ['tests/fuzz/**/*.test.ts'],
          exclude: ['node_modules/**'],
          testTimeout: 15_000,
        },
      },
    ],
  },
});
