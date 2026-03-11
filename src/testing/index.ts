/**
 * @fileoverview Test utilities for MCP server development.
 * Provides `createMockContext()` for testing tool and resource handlers
 * against the unified Context interface.
 * @module src/testing/index
 */

import type {
  CreateMessageResult,
  ElicitResult,
  SamplingMessage,
} from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';

import type {
  Context,
  ContextLogger,
  ContextProgress,
  ContextState,
  SamplingOpts,
} from '@/context.js';
import type { AuthContext } from '@/utils/internal/requestContext.js';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface MockContextOptions {
  /** Auth context. */
  auth?: AuthContext;
  /** Mock elicitation handler. */
  elicit?: (message: string, schema: z.ZodObject<z.ZodRawShape>) => Promise<ElicitResult>;
  /** Enable task progress (creates a mock ContextProgress). */
  progress?: boolean;
  /** Request ID override. Defaults to 'test-request-id'. */
  requestId?: string;
  /** Mock sampling handler. */
  sample?: (messages: SamplingMessage[], opts?: SamplingOpts) => Promise<CreateMessageResult>;
  /** Custom AbortSignal. Defaults to a fresh AbortController's signal. */
  signal?: AbortSignal;
  /** Tenant ID. Enables ctx.state operations when provided. */
  tenantId?: string;
  /** Resource URI for resource handler testing. */
  uri?: URL;
}

// ---------------------------------------------------------------------------
// Mock implementations
// ---------------------------------------------------------------------------

function createMockLogger(): ContextLogger & {
  calls: Array<{ level: string; msg: string; data?: unknown }>;
} {
  const calls: Array<{ level: string; msg: string; data?: unknown }> = [];

  const logFn = (level: string) => (msg: string, data?: Record<string, unknown>) => {
    calls.push({ level, msg, data });
  };

  return {
    calls,
    debug: logFn('debug'),
    info: logFn('info'),
    notice: logFn('notice'),
    warning: logFn('warning'),
    error: (msg: string, _error?: Error, data?: Record<string, unknown>) => {
      calls.push({ level: 'error', msg, data });
    },
  };
}

function createMockState(tenantId?: string): ContextState {
  const store = new Map<string, string>();

  const requireTenant = () => {
    if (!tenantId) {
      throw new Error('tenantId required for state operations');
    }
  };

  return {
    async get(key) {
      requireTenant();
      return store.get(key) ?? null;
    },
    async set(key, value) {
      requireTenant();
      store.set(key, value);
    },
    async delete(key) {
      requireTenant();
      store.delete(key);
    },
    async list(prefix) {
      requireTenant();
      const items: Array<{ key: string; value: string }> = [];
      for (const [key, value] of store) {
        if (!prefix || key.startsWith(prefix)) {
          items.push({ key, value });
        }
      }
      return { items };
    },
  };
}

function createMockProgress(): ContextProgress & {
  _total: number;
  _completed: number;
  _messages: string[];
} {
  const state = { _total: 0, _completed: 0, _messages: [] as string[] };

  return {
    get _total() {
      return state._total;
    },
    get _completed() {
      return state._completed;
    },
    get _messages() {
      return state._messages;
    },
    async setTotal(n) {
      state._total = n;
      state._completed = 0;
    },
    async increment(amount = 1) {
      state._completed += amount;
    },
    async update(message) {
      state._messages.push(message);
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a mock Context for testing tool and resource handlers.
 *
 * @example
 * ```ts
 * // Minimal — works for most tests
 * const ctx = createMockContext();
 *
 * // With tenant (for tools that use ctx.state)
 * const ctx = createMockContext({ tenantId: 'test-tenant' });
 *
 * // With sampling capability
 * const ctx = createMockContext({
 *   sample: vi.fn().mockResolvedValue({
 *     role: 'assistant',
 *     content: { type: 'text', text: 'Response' },
 *     model: 'test',
 *   }),
 * });
 *
 * // With task progress
 * const ctx = createMockContext({ progress: true });
 * ```
 */
export function createMockContext(options: MockContextOptions = {}): Context {
  const log = createMockLogger();
  const state = createMockState(options.tenantId);
  const progress = options.progress ? createMockProgress() : undefined;

  const ctx: Context = {
    requestId: options.requestId ?? 'test-request-id',
    timestamp: new Date().toISOString(),
    log,
    state,
    signal: options.signal ?? new AbortController().signal,
    ...(options.tenantId !== undefined ? { tenantId: options.tenantId } : {}),
    ...(options.auth ? { auth: options.auth } : {}),
    ...(options.elicit ? { elicit: options.elicit } : {}),
    ...(options.sample ? { sample: options.sample } : {}),
    ...(progress ? { progress } : {}),
    ...(options.uri ? { uri: options.uri } : {}),
  };

  return ctx;
}
