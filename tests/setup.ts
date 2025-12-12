import 'reflect-metadata';
// This setup file is preloaded by Bun (see bunfig.toml).
// It provides a lightweight Vitest compatibility layer so tests can run under `bun test`.

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Detect if we're running under Bun's native test runner vs Vitest
const IS_BUN_TEST = typeof Bun !== 'undefined' && !process.env.VITEST;

// Ensure test env so logger suppresses noisy warnings
if (typeof process !== 'undefined' && process.env && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Patch Vitest API gaps when running under Bun's test runner
// - Alias vi.mock to vi.module
// - Provide minimal timer shims if missing
if (!(vi as any).mock && typeof (vi as any).module === 'function') {
  (vi as any).mock = (vi as any).module.bind(vi);
}

// Shim vi.mocked for Bun's test runner
if (typeof (vi as any).mocked !== 'function') {
  (vi as any).mocked = <T>(fn: T): T => fn;
}

// Shim vi.waitFor for Bun's test runner (not available in Vitest's vi object under Bun)
if (typeof (vi as any).waitFor !== 'function') {
  (vi as any).waitFor = async (
    callback: () => unknown | Promise<unknown>,
    options?: { timeout?: number; interval?: number },
  ) => {
    const timeout = options?.timeout ?? 1000;
    const interval = options?.interval ?? 50;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      try {
        const result = await callback();
        if (result !== undefined) return result;
        return;
      } catch {
        await new Promise((r) => setTimeout(r, interval));
      }
    }
    throw new Error(`vi.waitFor timed out after ${timeout}ms`);
  };
}

let originalNow: (() => number) | null = null;
let base = 0;
let offset = 0;
if (typeof (vi as any).useFakeTimers !== 'function') {
  (vi as any).useFakeTimers = () => {
    if (!originalNow) {
      originalNow = Date.now;
      base = originalNow();
      offset = 0;
      Date.now = () => base + offset;
    }
  };
}
if (typeof (vi as any).advanceTimersByTime !== 'function') {
  (vi as any).advanceTimersByTime = (ms: number) => {
    offset += ms;
  };
}
if (typeof (vi as any).setSystemTime !== 'function') {
  (vi as any).setSystemTime = (d: Date | number) => {
    base = typeof d === 'number' ? d : (d as Date).getTime();
    offset = 0;
  };
}
if (typeof (vi as any).useRealTimers !== 'function') {
  (vi as any).useRealTimers = () => {
    if (originalNow) {
      Date.now = originalNow;
      originalNow = null;
    }
  };
}

// Pre-mock modules that are imported before tests call vi.mock
// Skip these mocks for:
// - Integration tests (so we exercise the real stack)
// - Bun's test runner (mocking behavior differs and breaks AsyncLocalStorage)
//
// IMPORTANT: Vitest's module mocking can interfere with AsyncLocalStorage context propagation
// in some test scenarios. If you encounter "getStore is not a function" errors with
// AsyncLocalStorage, the issue is likely with test isolation settings in vitest.config.ts.
// Solution: Ensure poolOptions.forks.isolate = true (each test file gets clean module state).
// See: https://github.com/vitest-dev/vitest/issues/5858
const IS_INTEGRATION = process.env.INTEGRATION === '1';
const SKIP_GLOBAL_MOCKS = IS_INTEGRATION || IS_BUN_TEST;

if (!SKIP_GLOBAL_MOCKS) {
  try {
    (vi as any).mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
      class McpServer {
        connect = (vi as any).fn(async () => {});
        constructor(..._args: any[]) {}
      }
      class ResourceTemplate {
        constructor(..._args: any[]) {}
        match = (vi as any).fn(() => null);
        render = (vi as any).fn(() => '');
      }
      return { McpServer, ResourceTemplate };
    });
  } catch {}

  try {
    (vi as any).mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
      const StdioServerTransport: any = (vi as any).fn(
        function StdioServerTransport(this: any, ..._args: any[]) {},
      );
      return { StdioServerTransport };
    });
  } catch {}

  try {
    (vi as any).mock('chrono-node', () => ({
      parseDate: (vi as any).fn(() => null),
      parse: (vi as any).fn(() => []),
    }));
  } catch {}
}

// Ensure global vi exists for any indirect references
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).vi = (globalThis as any).vi ?? vi;

// Global test setup without MSW - tests use real APIs or isolated MSW servers
beforeAll(() => {
  // Any global setup can go here
});

afterEach(() => {
  // Clean up between tests
});

afterAll(() => {
  // Global cleanup
});
