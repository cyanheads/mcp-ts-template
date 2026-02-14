/**
 * @fileoverview Global test setup for Vitest.
 * Configures environment, pre-mocks heavy external modules,
 * and provides lifecycle hooks.
 * @module tests/setup
 */
import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Ensure test env so logger suppresses noisy warnings
if (typeof process !== 'undefined' && process.env && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Pre-mock modules that are imported before tests call vi.mock.
// Skip these mocks for integration tests (so we exercise the real stack).
//
// IMPORTANT: Vitest's module mocking can interfere with AsyncLocalStorage context propagation
// in some test scenarios. If you encounter "getStore is not a function" errors with
// AsyncLocalStorage, the issue is likely with test isolation settings in vitest.config.ts.
// Solution: Ensure poolOptions.forks.isolate = true (each test file gets clean module state).
// See: https://github.com/vitest-dev/vitest/issues/5858
const IS_INTEGRATION = process.env.INTEGRATION === '1';

if (!IS_INTEGRATION) {
  vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
    class McpServer {
      connect = vi.fn(async () => {});
      constructor(..._args: any[]) {}
    }
    class ResourceTemplate {
      constructor(..._args: any[]) {}
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
}

beforeAll(() => {
  // Global setup
});

afterEach(() => {
  // Clean up between tests
});

afterAll(() => {
  // Global cleanup
});
