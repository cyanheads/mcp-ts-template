import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@/': new URL('./src/', import.meta.url).pathname },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
