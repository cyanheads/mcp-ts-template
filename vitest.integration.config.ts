import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/integration/setup.integration.ts'],
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 20000,
    // Disable parallel execution of test files to prevent race conditions with shared resources like the logger.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
    },
  },
});
