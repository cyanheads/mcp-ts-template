/**
 * @fileoverview Global test setup for Vitest.
 * Configures environment, pre-mocks heavy external modules,
 * and provides lifecycle hooks.
 * @module tests/setup
 */
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

// Ensure test env so logger suppresses noisy warnings
if (typeof process !== 'undefined' && process.env && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Pre-mock heavy external modules imported before individual tests call vi.mock.
// This setup file is only referenced by vitest.config.ts (unit tests).
// Integration tests use vitest.integration.ts which has no setupFiles, so these
// mocks never apply there.
//
// NOTE: vi.mock calls must be at the top level — Vitest hoists them regardless
// of nesting, and nested calls produce warnings (future errors).
//
// If you encounter "getStore is not a function" errors with AsyncLocalStorage,
// ensure poolOptions.forks.isolate = true in vitest.config.ts.
// See: https://github.com/vitest-dev/vitest/issues/5858

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  class McpServer {
    connect = vi.fn(async () => {});
  }
  class ResourceTemplate {
    match = vi.fn(() => null);
    render = vi.fn(() => '');
  }
  return { McpServer, ResourceTemplate };
});

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  const StdioServerTransport: any = vi.fn(function StdioServerTransport(
    this: any,
    ..._args: any[]
  ) {});
  return { StdioServerTransport };
});

vi.mock('chrono-node', () => ({
  parseDate: vi.fn(() => null),
  parse: vi.fn(() => []),
}));

beforeAll(() => {
  // Global setup
});

afterEach(() => {
  // Clean up between tests
});

afterAll(() => {
  // Global cleanup
});
