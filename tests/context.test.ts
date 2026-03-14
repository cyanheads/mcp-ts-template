/**
 * @fileoverview Tests for createContext — the internal factory that builds the
 * unified Context every tool/resource handler receives.
 * Covers: field assembly, tenant defaulting, ctx.log correlation, ctx.state
 * scoping, ctx.progress lifecycle, and optional capability wiring.
 * @module tests/context.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  notice: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  crit: vi.fn(),
  emerg: vi.fn(),
  child: vi.fn(),
};

vi.mock('@/config/index.js', () => ({
  config: {
    environment: 'testing',
    mcpServerVersion: '1.0.0-test',
    mcpAuthMode: 'none',
  },
}));

vi.mock('@/utils/internal/logger.js', () => ({
  logger: mockLogger,
  Logger: { getInstance: () => mockLogger },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import type { ContextDeps } from '@/context.js';
import { createContext } from '@/context.js';
import type { Logger } from '@/utils/internal/logger.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    requestId: 'req-001',
    timestamp: '2026-01-01T00:00:00.000Z',
    operation: 'test',
    ...overrides,
  };
}

/**
 * Minimal in-memory StorageService fake that satisfies the interface
 * used by createContextState.
 */
function createFakeStorage() {
  const store = new Map<string, Map<string, unknown>>();

  const tenantStore = (tenantId: string) => {
    if (!store.has(tenantId)) store.set(tenantId, new Map());
    return store.get(tenantId)!;
  };

  return {
    _store: store,
    get: vi.fn(async <T>(key: string, ctx: RequestContext): Promise<T | null> => {
      const ts = tenantStore(ctx.tenantId!);
      return (ts.get(key) as T) ?? null;
    }),
    set: vi.fn(async (key: string, value: unknown, ctx: RequestContext) => {
      tenantStore(ctx.tenantId!).set(key, value);
    }),
    delete: vi.fn(async (key: string, ctx: RequestContext) => {
      tenantStore(ctx.tenantId!).delete(key);
    }),
    list: vi.fn(
      async (prefix: string, ctx: RequestContext, _opts?: { cursor?: string; limit?: number }) => {
        const ts = tenantStore(ctx.tenantId!);
        const keys = [...ts.keys()].filter((k) => !prefix || k.startsWith(prefix));
        return { keys, nextCursor: undefined };
      },
    ),
    getMany: vi.fn(async <T>(keys: string[], ctx: RequestContext) => {
      const ts = tenantStore(ctx.tenantId!);
      const result = new Map<string, T>();
      for (const key of keys) {
        if (ts.has(key)) result.set(key, ts.get(key) as T);
      }
      return result;
    }),
  };
}

function makeDeps(overrides: Partial<ContextDeps> = {}): ContextDeps {
  return {
    appContext: makeRequestContext(),
    logger: mockLogger as unknown as Logger,
    storage: createFakeStorage() as any,
    signal: new AbortController().signal,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Identity & tracing fields
  // -----------------------------------------------------------------------

  describe('Identity and tracing fields', () => {
    it('should carry requestId and timestamp from RequestContext', () => {
      const ctx = createContext(makeDeps());

      expect(ctx.requestId).toBe('req-001');
      expect(ctx.timestamp).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should carry traceId and spanId from RequestContext', () => {
      const ctx = createContext(
        makeDeps({
          appContext: makeRequestContext({
            traceId: 'trace-abc',
            spanId: 'span-def',
          }),
        }),
      );

      expect(ctx.traceId).toBe('trace-abc');
      expect(ctx.spanId).toBe('span-def');
    });

    it('should leave traceId/spanId undefined when not present on RequestContext', () => {
      const ctx = createContext(makeDeps());

      expect(ctx.traceId).toBeUndefined();
      expect(ctx.spanId).toBeUndefined();
    });

    it('should carry auth from RequestContext', () => {
      const auth = { clientId: 'client-1', scopes: ['read'], sub: 'user-1', token: 'tok' };
      const ctx = createContext(
        makeDeps({
          appContext: makeRequestContext({ auth }),
        }),
      );

      expect(ctx.auth).toEqual(auth);
    });
  });

  // -----------------------------------------------------------------------
  // Tenant defaulting
  // -----------------------------------------------------------------------

  describe('Tenant defaulting', () => {
    it('should preserve explicit tenantId from RequestContext', () => {
      const ctx = createContext(
        makeDeps({
          appContext: makeRequestContext({ tenantId: 'tenant-42' }),
        }),
      );

      expect(ctx.tenantId).toBe('tenant-42');
    });

    it('should default tenantId to "default" when not set (stdio mode)', () => {
      // Omit tenantId entirely to simulate stdio mode
      const appContext = makeRequestContext();
      delete (appContext as any).tenantId;
      const ctx = createContext(makeDeps({ appContext }));

      expect(ctx.tenantId).toBe('default');
    });
  });

  // -----------------------------------------------------------------------
  // ctx.log — correlation
  // -----------------------------------------------------------------------

  describe('ctx.log correlation', () => {
    it('should produce a logger with all 5 level methods', () => {
      const ctx = createContext(makeDeps());

      expect(typeof ctx.log.debug).toBe('function');
      expect(typeof ctx.log.info).toBe('function');
      expect(typeof ctx.log.notice).toBe('function');
      expect(typeof ctx.log.warning).toBe('function');
      expect(typeof ctx.log.error).toBe('function');
    });

    it('should pass RequestContext fields with every log call', () => {
      const appContext = makeRequestContext({
        tenantId: 'tenant-x',
        traceId: 'trace-123',
      });
      const ctx = createContext(makeDeps({ appContext }));

      ctx.log.info('test message', { extra: 'data' });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      const [msg, passedContext] = mockLogger.info.mock.calls[0]!;
      expect(msg).toBe('test message');
      // The enriched context should spread RequestContext + extra data
      expect(passedContext).toMatchObject({
        requestId: 'req-001',
        tenantId: 'tenant-x',
        traceId: 'trace-123',
        extra: 'data',
      });
    });

    it('should pass RequestContext without extra data when data is omitted', () => {
      const ctx = createContext(makeDeps());

      ctx.log.debug('bare message');

      const [, passedContext] = mockLogger.debug.mock.calls[0]!;
      expect(passedContext.requestId).toBe('req-001');
    });

    it('should pass error object to logger.error when provided', () => {
      const ctx = createContext(makeDeps());
      const err = new Error('boom');

      ctx.log.error('something failed', err, { detail: 'info' });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      const [msg, errorArg, contextArg] = mockLogger.error.mock.calls[0]!;
      expect(msg).toBe('something failed');
      expect(errorArg).toBe(err);
      expect(contextArg).toMatchObject({ requestId: 'req-001', detail: 'info' });
    });

    it('ctx.log should use the defaulted tenantId, not the original undefined', () => {
      const appContext = makeRequestContext();
      delete (appContext as any).tenantId;
      const ctx = createContext(makeDeps({ appContext }));

      ctx.log.info('check tenant');

      const [, passedContext] = mockLogger.info.mock.calls[0]!;
      expect(passedContext.tenantId).toBe('default');
    });
  });

  // -----------------------------------------------------------------------
  // ctx.state — tenant-scoped storage
  // -----------------------------------------------------------------------

  describe('ctx.state', () => {
    it('should delegate set/get/delete to StorageService with tenant context', async () => {
      const storage = createFakeStorage();
      const ctx = createContext(
        makeDeps({
          appContext: makeRequestContext({ tenantId: 'tenant-a' }),
          storage: storage as any,
        }),
      );

      await ctx.state.set('key1', 'value1');
      const val = await ctx.state.get('key1');

      expect(val).toBe('value1');
      expect(storage.set).toHaveBeenCalledWith(
        'key1',
        'value1',
        expect.objectContaining({ tenantId: 'tenant-a' }),
        undefined,
      );
    });

    it('should isolate state between tenants', async () => {
      const storage = createFakeStorage();

      const ctxA = createContext(
        makeDeps({
          appContext: makeRequestContext({ tenantId: 'tenant-a', requestId: 'r1' }),
          storage: storage as any,
        }),
      );
      const ctxB = createContext(
        makeDeps({
          appContext: makeRequestContext({ tenantId: 'tenant-b', requestId: 'r2' }),
          storage: storage as any,
        }),
      );

      await ctxA.state.set('shared-key', 'a-value');
      await ctxB.state.set('shared-key', 'b-value');

      expect(await ctxA.state.get('shared-key')).toBe('a-value');
      expect(await ctxB.state.get('shared-key')).toBe('b-value');
    });

    it('should work with defaulted tenantId ("default") in stdio mode', async () => {
      const storage = createFakeStorage();
      const appContext = makeRequestContext();
      delete (appContext as any).tenantId;
      const ctx = createContext(
        makeDeps({
          appContext,
          storage: storage as any,
        }),
      );

      // Should not throw — tenantId defaults to 'default'
      await ctx.state.set('key', 'val');
      const result = await ctx.state.get('key');
      expect(result).toBe('val');
    });
  });

  // -----------------------------------------------------------------------
  // ctx.signal
  // -----------------------------------------------------------------------

  describe('ctx.signal', () => {
    it('should carry the provided AbortSignal', () => {
      const controller = new AbortController();
      const ctx = createContext(makeDeps({ signal: controller.signal }));

      expect(ctx.signal).toBe(controller.signal);
      expect(ctx.signal.aborted).toBe(false);

      controller.abort();
      expect(ctx.signal.aborted).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Optional capabilities
  // -----------------------------------------------------------------------

  describe('Optional capabilities', () => {
    it('should include elicit when provided', () => {
      const elicit = vi.fn();
      const ctx = createContext(makeDeps({ elicit: elicit as any }));

      expect(ctx.elicit).toBe(elicit);
    });

    it('should leave elicit undefined when not provided', () => {
      const ctx = createContext(makeDeps());

      expect(ctx.elicit).toBeUndefined();
    });

    it('should include sample when provided', () => {
      const sample = vi.fn();
      const ctx = createContext(makeDeps({ sample: sample as any }));

      expect(ctx.sample).toBe(sample);
    });

    it('should include uri when provided', () => {
      const uri = new URL('myscheme://item/123');
      const ctx = createContext(makeDeps({ uri }));

      expect(ctx.uri).toBe(uri);
    });
  });

  // -----------------------------------------------------------------------
  // ctx.progress
  // -----------------------------------------------------------------------

  describe('ctx.progress', () => {
    it('should be undefined when no taskCtx is provided', () => {
      const ctx = createContext(makeDeps());

      expect(ctx.progress).toBeUndefined();
    });

    it('should create ContextProgress when taskCtx is provided', async () => {
      const mockStore = {
        updateTaskStatus: vi.fn(),
      };

      const ctx = createContext(
        makeDeps({
          taskCtx: { store: mockStore as any, taskId: 'task-001' },
        }),
      );

      expect(ctx.progress).toBeDefined();

      await ctx.progress!.setTotal(10);
      await ctx.progress!.increment();
      await ctx.progress!.update('halfway there');

      expect(mockStore.updateTaskStatus).toHaveBeenCalledWith(
        'task-001',
        'working',
        '10% complete',
      );
      expect(mockStore.updateTaskStatus).toHaveBeenCalledWith(
        'task-001',
        'working',
        'halfway there',
      );
    });

    it('should track percentage correctly through increment', async () => {
      const mockStore = { updateTaskStatus: vi.fn() };

      const ctx = createContext(
        makeDeps({
          taskCtx: { store: mockStore as any, taskId: 'task-002' },
        }),
      );

      await ctx.progress!.setTotal(4);
      await ctx.progress!.increment(); // 25%
      await ctx.progress!.increment(); // 50%
      await ctx.progress!.increment(2); // 100%

      const calls = mockStore.updateTaskStatus.mock.calls;
      expect(calls[0]).toEqual(['task-002', 'working', '25% complete']);
      expect(calls[1]).toEqual(['task-002', 'working', '50% complete']);
      expect(calls[2]).toEqual(['task-002', 'working', '100% complete']);
    });
  });
});
