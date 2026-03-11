/**
 * @fileoverview Unified Context interface for tool and resource handlers.
 * Replaces the split `appContext` (RequestContext) + `sdkContext` (RequestHandlerExtra)
 * pattern with a single object that provides logging, storage, protocol capabilities,
 * and cancellation.
 * @module src/context
 */

import type { RequestTaskStore } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  CreateMessageResult,
  ElicitResult,
  SamplingMessage,
} from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';

import type { StorageService } from '@/storage/core/StorageService.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
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
  delete(key: string): Promise<void>;
  get(key: string): Promise<string | null>;
  list(
    prefix?: string,
    opts?: { cursor?: string; limit?: number },
  ): Promise<{
    items: Array<{ key: string; value: string }>;
    cursor?: string;
  }>;
  set(key: string, value: string, opts?: { ttl?: number }): Promise<void>;
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

  const log = createContextLogger(pinoLogger, appContext);
  const state = createContextState(storage, appContext);
  const progress = deps.taskCtx
    ? createContextProgress(deps.taskCtx.store, deps.taskCtx.taskId)
    : undefined;

  return {
    requestId: appContext.requestId,
    timestamp: appContext.timestamp,
    log,
    state,
    signal,
    tenantId: appContext.tenantId,
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
      throw new McpError(
        JsonRpcErrorCode.InvalidRequest,
        'tenantId required for state operations. HTTP requests must include a JWT with a "tid" claim. Stdio mode should default tenantId to "default" via createApp().',
      );
    }
    return appContext;
  };

  return {
    async get(key) {
      const result = await storage.get<string>(key, requireContext());
      return result ?? null;
    },
    async set(key, value, opts) {
      await storage.set(key, value, requireContext(), opts?.ttl ? { ttl: opts.ttl } : undefined);
    },
    async delete(key) {
      await storage.delete(key, requireContext());
    },
    async list(prefix, opts) {
      const ctx = requireContext();
      const result = await storage.list(prefix ?? '', ctx, {
        ...(opts?.cursor ? { cursor: opts.cursor } : {}),
        ...(opts?.limit !== undefined ? { limit: opts.limit } : {}),
      });

      // StorageService.list() returns keys only. Fetch values via getMany.
      const keys = result.keys;
      const items: Array<{ key: string; value: string }> = [];

      if (keys.length > 0) {
        const values = await storage.getMany<unknown>(keys, ctx);
        for (const key of keys) {
          const value = values.get(key);
          if (value !== undefined) {
            items.push({
              key,
              value: typeof value === 'string' ? value : JSON.stringify(value),
            });
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
