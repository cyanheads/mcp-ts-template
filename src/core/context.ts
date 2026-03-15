/**
 * @fileoverview Unified Context interface for tool and resource handlers.
 * Replaces the split `appContext` (RequestContext) + `sdkContext` (RequestHandlerExtra)
 * pattern with a single object that provides logging, storage, protocol capabilities,
 * and cancellation.
 * @module src/core/context
 */

import type { RequestTaskStore } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  CreateMessageResult,
  ElicitResult,
  SamplingMessage,
} from '@modelcontextprotocol/sdk/types.js';
import type { ZodType, z } from 'zod';

import type { StorageService } from '@/storage/core/StorageService.js';
import { invalidRequest } from '@/types-global/errors.js';
import type { Logger } from '@/utils/internal/logger.js';
import type { AuthContext, RequestContext } from '@/utils/internal/requestContext.js';

// Re-export AuthContext so consumers can type against it from ./context
export type { AuthContext };

// ---------------------------------------------------------------------------
// Sub-interfaces
// ---------------------------------------------------------------------------

/**
 * Structured logger scoped to the current request.
 * Auto-includes requestId, traceId, tenantId in every log entry.
 */
export interface ContextLogger {
  debug(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, error?: Error, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  notice(msg: string, data?: Record<string, unknown>): void;
  warning(msg: string, data?: Record<string, unknown>): void;
}

/**
 * Tenant-scoped key-value storage.
 * Delegates to StorageService with the request's tenantId.
 */
export interface ContextState {
  /** Delete a key. */
  delete(key: string): Promise<void>;
  /** Delete multiple keys. Returns the number of keys deleted. */
  deleteMany(keys: string[]): Promise<number>;
  /** Get a value by key. Returns null if not found. */
  get<T = unknown>(key: string): Promise<T | null>;
  /** Get a value by key with runtime Zod validation. Returns null if not found. */
  get<T>(key: string, schema: ZodType<T>): Promise<T | null>;
  /** Get multiple values by key. Missing keys are omitted from the result. */
  getMany<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  /** List keys by prefix with pagination. */
  list(
    prefix?: string,
    opts?: { cursor?: string; limit?: number },
  ): Promise<{
    items: Array<{ key: string; value: unknown }>;
    cursor?: string;
  }>;
  /** Store a value. Accepts any serializable value. */
  set(key: string, value: unknown, opts?: { ttl?: number }): Promise<void>;
  /** Store multiple values. */
  setMany(entries: Map<string, unknown>, opts?: { ttl?: number }): Promise<void>;
}

/**
 * Progress reporting for background tasks.
 * Present only when the tool has `task: true`.
 */
export interface ContextProgress {
  /** Increment completed work by amount (default: 1). */
  increment(amount?: number): Promise<void>;
  /** Set the total expected units of work. */
  setTotal(total: number): Promise<void>;
  /** Set a custom status message. */
  update(message: string): Promise<void>;
}

/** Options for sampling requests. */
export interface SamplingOpts {
  includeContext?: 'none' | 'thisServer' | 'allServers';
  maxTokens?: number;
  modelPreferences?: Record<string, unknown>;
  stopSequences?: string[];
  temperature?: number;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

/**
 * The unified object every tool and resource handler receives.
 * Replaces the split `appContext` + `sdkContext` pattern.
 */
export interface Context {
  /** Auth data when request is authenticated. */
  readonly auth?: AuthContext | undefined;

  // --- Protocol capabilities (optional — not all clients support these) ---
  /** Ask the human user a question. Present when client supports elicitation. */
  readonly elicit?:
    | ((message: string, schema: z.ZodObject<z.ZodRawShape>) => Promise<ElicitResult>)
    | undefined;

  // --- Structured logging ---
  /** Logger scoped to this request. Auto-includes requestId, traceId, tenantId. */
  readonly log: ContextLogger;

  // --- Task progress (present when task: true) ---
  /** Progress reporting for background tasks. Undefined for non-task tools. */
  readonly progress?: ContextProgress | undefined;
  // --- Identity & tracing ---
  /** Unique request ID for log correlation. */
  readonly requestId: string;
  /** Request LLM completion from the client. Present when client supports sampling. */
  readonly sample?:
    | ((messages: SamplingMessage[], opts?: SamplingOpts) => Promise<CreateMessageResult>)
    | undefined;

  // --- Cancellation ---
  /** AbortSignal for request cancellation. */
  readonly signal: AbortSignal;
  /** OpenTelemetry span ID (auto-injected). */
  readonly spanId?: string | undefined;

  // --- Tenant-scoped storage ---
  /** Key-value state scoped to the current tenant. Throws if tenantId is missing. */
  readonly state: ContextState;
  /** Tenant ID — from JWT 'tid' claim (HTTP) or 'default' (stdio). */
  readonly tenantId?: string | undefined;
  /** ISO 8601 creation time. */
  readonly timestamp: string;
  /** OpenTelemetry trace ID (auto-injected). */
  readonly traceId?: string | undefined;

  // --- Raw URI (present for resource handlers) ---
  /** The parsed resource URI. Only set in resource handler context. */
  readonly uri?: URL | undefined;
}

// ---------------------------------------------------------------------------
// Context construction (internal — not part of the public consumer API)
// ---------------------------------------------------------------------------

/** @internal */
export interface ContextDeps {
  appContext: RequestContext;
  elicit?: Context['elicit'];
  logger: Logger;
  sample?: Context['sample'];
  signal: AbortSignal;
  storage: StorageService;
  taskCtx?: { store: RequestTaskStore; taskId: string } | undefined;
  uri?: URL | undefined;
}

/**
 * Constructs a Context from internal dependencies.
 * Called by handler factories — not exposed to consumers.
 * @internal
 */
export function createContext(deps: ContextDeps): Context {
  const { appContext, logger: pinoLogger, storage, signal } = deps;

  // Default tenantId to 'default' when not set (stdio mode, no auth).
  // This allows ctx.state to work without requiring JWT auth.
  const effectiveContext = appContext.tenantId
    ? appContext
    : { ...appContext, tenantId: 'default' };

  const log = createContextLogger(pinoLogger, effectiveContext);
  const state = createContextState(storage, effectiveContext);
  const progress = deps.taskCtx
    ? createContextProgress(deps.taskCtx.store, deps.taskCtx.taskId)
    : undefined;

  return {
    requestId: effectiveContext.requestId,
    timestamp: effectiveContext.timestamp,
    log,
    state,
    signal,
    tenantId: effectiveContext.tenantId,
    traceId: appContext.traceId as string | undefined,
    spanId: appContext.spanId as string | undefined,
    auth: appContext.auth,
    elicit: deps.elicit,
    sample: deps.sample,
    progress,
    uri: deps.uri,
  };
}

// ---------------------------------------------------------------------------
// ContextLogger implementation
// ---------------------------------------------------------------------------

function createContextLogger(appLogger: Logger, appContext: RequestContext): ContextLogger {
  // Build a RequestContext enriched with extra data for each log call.
  // Our Logger accepts (msg, RequestContext?) — the extra data fields are
  // spread into the context's index signature.
  const enriched = (data?: Record<string, unknown>): RequestContext =>
    data ? { ...appContext, ...data } : appContext;

  return {
    debug(msg, data) {
      appLogger.debug(msg, enriched(data));
    },
    info(msg, data) {
      appLogger.info(msg, enriched(data));
    },
    notice(msg, data) {
      appLogger.notice(msg, enriched(data));
    },
    warning(msg, data) {
      appLogger.warning(msg, enriched(data));
    },
    error(msg, error, data) {
      if (error) {
        appLogger.error(msg, error, enriched(data));
      } else {
        appLogger.error(msg, enriched(data));
      }
    },
  };
}

// ---------------------------------------------------------------------------
// ContextState implementation
// ---------------------------------------------------------------------------

function createContextState(storage: StorageService, appContext: RequestContext): ContextState {
  const requireContext = (): RequestContext => {
    if (!appContext.tenantId) {
      throw invalidRequest(
        'tenantId required for state operations. HTTP requests must include a JWT with a "tid" claim. Stdio mode should default tenantId to "default" via createApp().',
      );
    }
    return appContext;
  };

  return {
    async get(key: string, schema?: ZodType) {
      const result = await storage.get<unknown>(key, requireContext());
      if (result === null || result === undefined) return null;
      return schema ? schema.parse(result) : result;
    },
    async set(key, value, opts) {
      await storage.set(key, value, requireContext(), opts?.ttl ? { ttl: opts.ttl } : undefined);
    },
    async delete(key) {
      await storage.delete(key, requireContext());
    },
    deleteMany(keys) {
      return storage.deleteMany(keys, requireContext());
    },
    getMany(keys) {
      return storage.getMany(keys, requireContext());
    },
    async setMany(entries, opts) {
      await storage.setMany(entries, requireContext(), opts?.ttl ? { ttl: opts.ttl } : undefined);
    },
    async list(prefix, opts) {
      const ctx = requireContext();
      const result = await storage.list(prefix ?? '', ctx, {
        ...(opts?.cursor ? { cursor: opts.cursor } : {}),
        ...(opts?.limit !== undefined ? { limit: opts.limit } : {}),
      });

      // StorageService.list() returns keys only. Fetch values via getMany.
      const keys = result.keys;
      const items: Array<{ key: string; value: unknown }> = [];

      if (keys.length > 0) {
        const values = await storage.getMany<unknown>(keys, ctx);
        for (const key of keys) {
          const value = values.get(key);
          if (value !== undefined) {
            items.push({ key, value });
          }
        }
      }

      return {
        items,
        ...(result.nextCursor ? { cursor: result.nextCursor } : {}),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// ContextProgress implementation
// ---------------------------------------------------------------------------

function createContextProgress(store: RequestTaskStore, taskId: string): ContextProgress {
  let total = 0;
  let completed = 0;

  return {
    setTotal(n) {
      total = n;
      completed = 0;
      return Promise.resolve();
    },
    async increment(amount = 1) {
      completed = Math.min(completed + amount, total || completed + amount);
      const percentage = total > 0 ? Math.round((completed / total) * 100) : undefined;
      await store.updateTaskStatus(
        taskId,
        'working',
        percentage !== undefined ? `${percentage}% complete` : undefined,
      );
    },
    async update(message) {
      await store.updateTaskStatus(taskId, 'working', message);
    },
  };
}
