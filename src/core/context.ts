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
  ModelPreferences,
  SamplingMessage,
} from '@modelcontextprotocol/sdk/types.js';
import type { ZodType, z } from 'zod';

import type { StorageService } from '@/storage/core/StorageService.js';
import {
  type ErrorContract,
  invalidRequest,
  JsonRpcErrorCode,
  McpError,
} from '@/types-global/errors.js';
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
  modelPreferences?: ModelPreferences;
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

  // --- Resource notifications ---
  /** Notify clients that the resource list has changed (resources added/removed). */
  readonly notifyResourceListChanged?: (() => void) | undefined;
  /** Send a resource-updated notification to subscribed clients. */
  readonly notifyResourceUpdated?: ((uri: string) => void) | undefined;

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
// Typed fail — drives the type-driven error contract
// ---------------------------------------------------------------------------

/**
 * Builds an `McpError` keyed by a contract reason. The reason → code mapping
 * comes from the definition's `errors[]` contract, so the resulting error
 * always carries a code consistent with what was declared.
 *
 * `R` is the union of valid reason strings extracted from the contract.
 * Tools/resources without a contract receive a context that does not include
 * `fail` at all — direct `throw new McpError(...)` is still available.
 *
 * The thrown error's `data.reason` is auto-populated, so observability and the
 * auto-classifier can branch on a stable identifier without parsing message text.
 */
export type TypedFail<R extends string> = (
  reason: R,
  message?: string,
  data?: Record<string, unknown>,
  options?: { cause?: unknown },
) => McpError;

/**
 * Extracts the union of `reason` literal strings from a const tuple of
 * `ErrorContract` entries. Returns `never` when the input is undefined, isn't
 * shaped like a contract, or is the wide `ErrorContract[]` type without literal
 * narrowing (the latter case represents the type-erased `AnyToolDefinition` —
 * collapsing it to `never` keeps factory call sites assignable).
 *
 * Used by `tool()` / `resource()` builders to derive the typed-fail signature
 * from the user's `errors: [...]` declaration. The `const` modifier on the
 * builder's type parameter preserves literal types without requiring `as const`
 * at the call site.
 */
export type ReasonOf<E> = E extends readonly { reason: infer R extends string }[]
  ? string extends R
    ? never
    : R
  : never;

/**
 * Handler context. When a definition declares `errors[]`, the handler receives
 * `Context & { fail: TypedFail<R> }` where `R` is the declared reason union.
 * When no contract is declared, the handler receives plain `Context` and must
 * throw `McpError` directly.
 *
 * The conditional `[R] extends [never]` distinguishes "no contract declared"
 * (R = never) from "contract declared with reasons" (R = literal union).
 */
export type HandlerContext<R extends string = never> = [R] extends [never]
  ? Context
  : Context & { fail: TypedFail<R> };

/**
 * @internal
 *
 * Builds a runtime `fail` function for a given contract. Looks up the entry
 * by `reason` and constructs an `McpError` with the declared code, the
 * caller's message (or the contract's `when` text as a fallback), and
 * `data.reason` auto-populated from the contract — *not* from caller-supplied
 * data, which is spread first and then overwritten so the contract reason
 * wins. This keeps `data.reason` a stable observability identifier.
 *
 * If the reason isn't in the contract — a JS caller or stale contract slipping
 * past the `TypedFail` type-system guard — `createFail` returns an
 * `McpError(InternalError)` with diagnostic data (`{ reason, declaredReasons }`)
 * rather than throwing, so the call site can `throw` it like any other error.
 */
export function createFail(errors: readonly ErrorContract[]): TypedFail<string> {
  const byReason = new Map<string, ErrorContract>();
  for (const entry of errors) byReason.set(entry.reason, entry);

  return (reason, message, data, options) => {
    const entry = byReason.get(reason);
    if (!entry) {
      // Reason isn't in the contract. The TypedFail type prevents this at
      // compile time, but a JS caller (or a stale contract) can still hit it.
      // Surface the bug clearly rather than silently picking a code.
      return new McpError(
        JsonRpcErrorCode.InternalError,
        `ctx.fail() called with unknown reason '${reason}' — not declared in errors[].`,
        { reason, declaredReasons: [...byReason.keys()] },
        options,
      );
    }
    // `reason` is spread last so caller-supplied `data.reason` (accidental or
    // adversarial) cannot override the contract reason — preserves the
    // observability invariant that `data.reason` always matches the contract.
    return new McpError(entry.code, message ?? entry.when, { ...data, reason }, options);
  };
}

/**
 * Attaches a typed `fail` helper to `ctx` when the definition declares an
 * error contract; otherwise returns `ctx` unchanged. Used by the tool and
 * resource handler factories so all call sites stay identical.
 *
 * @internal
 */
export function attachTypedFail(
  ctx: Context,
  errors: readonly ErrorContract[] | undefined,
): Context {
  if (!errors || errors.length === 0) return ctx;
  return Object.assign(ctx, { fail: createFail(errors) });
}

// ---------------------------------------------------------------------------
// Context construction (internal — not part of the public consumer API)
// ---------------------------------------------------------------------------

/** @internal */
export interface ContextDeps {
  appContext: RequestContext;
  elicit?: Context['elicit'];
  logger: Logger;
  notifyResourceListChanged?: Context['notifyResourceListChanged'];
  notifyResourceUpdated?: Context['notifyResourceUpdated'];
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

  // Default tenantId to 'default' only for stdio (single-client, no auth).
  // HTTP without auth leaves tenantId unset — ctx.state will fail-closed
  // via requireContext() to prevent unauthenticated callers sharing state.
  const isStdio = process.env.MCP_TRANSPORT_TYPE?.toLowerCase() !== 'http';
  const effectiveContext = appContext.tenantId
    ? appContext
    : isStdio
      ? { ...appContext, tenantId: 'default' }
      : appContext;

  const log = createContextLogger(pinoLogger, effectiveContext);
  const state = createContextState(storage, effectiveContext, signal);
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
    notifyResourceListChanged: deps.notifyResourceListChanged,
    notifyResourceUpdated: deps.notifyResourceUpdated,
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

function createContextState(
  storage: StorageService,
  appContext: RequestContext,
  signal: AbortSignal,
): ContextState {
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
      signal.throwIfAborted();
      const result = await storage.get<unknown>(key, requireContext());
      if (result === null || result === undefined) return null;
      return schema ? schema.parse(result) : result;
    },
    async set(key, value, opts) {
      signal.throwIfAborted();
      await storage.set(
        key,
        value,
        requireContext(),
        opts?.ttl !== undefined ? { ttl: opts.ttl } : undefined,
      );
    },
    async delete(key) {
      signal.throwIfAborted();
      await storage.delete(key, requireContext());
    },
    deleteMany(keys) {
      signal.throwIfAborted();
      return storage.deleteMany(keys, requireContext());
    },
    getMany(keys) {
      signal.throwIfAborted();
      return storage.getMany(keys, requireContext());
    },
    async setMany(entries, opts) {
      signal.throwIfAborted();
      await storage.setMany(
        entries,
        requireContext(),
        opts?.ttl !== undefined ? { ttl: opts.ttl } : undefined,
      );
    },
    async list(prefix, opts) {
      signal.throwIfAborted();
      const ctx = requireContext();
      const listOpts: { cursor?: string; limit?: number } = {};
      if (opts?.cursor) listOpts.cursor = opts.cursor;
      if (opts?.limit !== undefined) listOpts.limit = opts.limit;
      const result = await storage.list(prefix ?? '', ctx, listOpts);

      const keys = result.keys;
      const items: Array<{ key: string; value: unknown }> = [];

      if (keys.length > 0) {
        // Use pre-fetched values when the provider supplies them, otherwise fetch.
        let values: Map<string, unknown>;
        if (result.values) {
          values = result.values;
        } else {
          signal.throwIfAborted();
          values = await storage.getMany<unknown>(keys, ctx);
        }
        for (const key of keys) {
          const value = values.get(key);
          if (value !== undefined) {
            items.push({ key, value });
          }
        }
      }

      const out: { items: Array<{ key: string; value: unknown }>; cursor?: string } = { items };
      if (result.nextCursor) out.cursor = result.nextCursor;
      return out;
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
