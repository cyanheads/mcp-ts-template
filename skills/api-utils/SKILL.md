---
name: api-utils
description: >
  API reference for all `@cyanheads/mcp-ts-core/utils/*` subpath exports. Use when looking up utility method signatures, options, peer dependencies, or usage patterns.
metadata:
  author: cyanheads
  version: "2.0"
  audience: external
  type: reference
---

## Overview

Utility subpath exports from `@cyanheads/mcp-ts-core/utils/*`. Complex utilities with rich APIs have dedicated reference files; simpler utilities are documented inline below.

**Tier 3** = optional peer dependency. Install as needed (e.g., `bun add js-yaml`). All Tier 3 methods are **async** (lazy-load deps on first call).

## References

| Reference | Path | Subpath | Covers |
|:----------|:-----|:--------|:-------|
| Formatting | `references/formatting.md` | `utils/formatting` | `markdown()`, `MarkdownBuilder`, `diffFormatter`, `tableFormatter`, `treeFormatter` — builder patterns, option types, style variants, usage examples |
| Parsing | `references/parsing.md` | `utils/parsing` | `yamlParser`, `xmlParser`, `csvParser`, `jsonParser`, `pdfParser`, `dateParser`, `frontmatterParser` — method signatures, option types, peer deps, `Allow` flags, PDF workflows |
| Security | `references/security.md` | `utils/security` | `sanitization`, `RateLimiter`, `IdGenerator` — config types, method details, sensitive fields, usage examples |

---

## `@cyanheads/mcp-ts-core/utils/network`

| Export | API | Notes |
|:-------|:----|:------|
| `fetchWithTimeout` | `(url, timeoutMs, context: RequestContext, options?: FetchWithTimeoutOptions) -> Promise<Response>` | Wraps `fetch` with `AbortController` timeout. `FetchWithTimeoutOptions` extends `RequestInit` (minus `signal`) and adds `rejectPrivateIPs?: boolean` and `signal?: AbortSignal` (external cancellation). SSRF protection: blocks RFC 1918, loopback, link-local, CGNAT, cloud metadata. DNS validation on Node; hostname-only on Workers. Manual redirect following (max 5) with per-hop SSRF check. |

---

## `@cyanheads/mcp-ts-core/utils/pagination`

| Export | API | Notes |
|:-------|:----|:------|
| `extractCursor` | `(params?) -> string \| undefined` | Extracts opaque cursor string from MCP request params. Checks `params.cursor` then `params._meta.cursor`. Returns `undefined` when no cursor is present. Does not decode. |
| `paginateArray` | `<T>(items, cursorStr, defaultPageSize, maxPageSize, context: RequestContext) -> PaginatedResult<T>` | Decodes cursor, slices array, returns `{ items, nextCursor?, totalCount }`. `nextCursor` omitted on last page. Throws `McpError(InvalidParams)` on invalid cursor. |
| `encodeCursor` | `(state: PaginationState) -> string` | Encodes `{ offset, limit, ...extra }` to opaque base64url string. |
| `decodeCursor` | `(cursor, context: RequestContext) -> PaginationState` | Decodes opaque base64url cursor. Throws `McpError(InvalidParams)` if malformed. |

---

## `@cyanheads/mcp-ts-core/utils/runtime`

| Export | API | Notes |
|:-------|:----|:------|
| `runtimeCaps` | `RuntimeCapabilities` object | Snapshot at import time. Fields: `isNode`, `isBun`, `isWorkerLike`, `isBrowserLike`, `hasProcess`, `hasBuffer`, `hasTextEncoder`, `hasPerformanceNow`. All booleans, never throw. |

---

## `@cyanheads/mcp-ts-core/utils/scheduling`

| Export | API | Notes |
|:-------|:----|:------|
| `schedulerService` | `.schedule(id, schedule, taskFunction, description) -> Promise<Job>` `.start(id) -> void` `.stop(id) -> void` `.remove(id) -> void` `.listJobs() -> Job[]` | **Async** `schedule()` — Tier 3 peer: `node-cron`. **Node-only** (throws `ConfigurationError` in Workers). Jobs start in stopped state; call `start(id)` to activate. Skips overlapping executions. Each tick gets fresh `RequestContext`. `Job: { id, schedule, description, isRunning, task }`. `taskFunction: (context: RequestContext) => void | Promise<void>`. |

---

## `@cyanheads/mcp-ts-core/utils/types`

The `utils/types` subpath exports only two guards. The full set of guards lives in the internal module and is not part of the public API.

| Export | Signature | Notes |
|:-------|:----------|:------|
| `isErrorWithCode` | `(error: unknown) -> error is Error & { code: unknown }` | Type guard — `true` when value is an `Error` instance with a `code` property |
| `isRecord` | `(value: unknown) -> value is Record<string, unknown>` | Type guard for plain objects (non-null, non-array) |

---

## `@cyanheads/mcp-ts-core/utils/logger`

| Export | API | Notes |
|:-------|:----|:------|
| `logger` | Pino instance. `.debug()` `.info()` `.notice()` `.warning()` `.error()` `.fatal()` | Global structured logger. Use `ctx.log` in handlers instead. `logger` is for lifecycle/background contexts (startup, shutdown, `setup()`). Auto-redacts sensitive fields. |

---

## `@cyanheads/mcp-ts-core/utils/requestContext`

| Export | API | Notes |
|:-------|:----|:------|
| `requestContextService` | `.createRequestContext(opts?) -> RequestContext` `.createFromHeaders(headers, fallback?) -> RequestContext` | Creates tracing context with `requestId`, `timestamp`, `traceId`, `spanId`, `tenantId`, `auth`. Internal — most consumers use `ctx` from handlers. |
| `RequestContext` | Type: `{ requestId, timestamp, operation?, traceId?, spanId?, tenantId?, auth? }` | Request tracing metadata. |

---

## `@cyanheads/mcp-ts-core/utils/errorHandler`

| Export | API | Notes |
|:-------|:----|:------|
| `ErrorHandler` | `.tryCatch<T>(fn, opts) -> Promise<T>` `.handleError(error, opts) -> Error` `.determineErrorCode(error) -> JsonRpcErrorCode` `.mapError(error, mappings, defaultFactory?) -> T \| Error` `.formatError(error) -> Record<string, unknown>` | Service-level error handling. `tryCatch` wraps async or sync `fn`, logs via `handleError`, and always rethrows. No `.tryCatchSync()`. Use in services, NOT in tool handlers (those throw raw `McpError`). Options: `operation`, `context`, `errorCode`, `input`, `rethrow`, `includeStack`, `critical`, `errorMapper`. |

---

## `@cyanheads/mcp-ts-core/utils/telemetry`

| Export | Subpath | API | Notes |
|:-------|:--------|:----|:------|
| `initInstrumentation` | `telemetry/instrumentation` | `(config) -> void` | Initializes OpenTelemetry SDK with OTLP exporter. Call once at startup. |
| `metrics` | `telemetry/metrics` | `.recordToolExecution(name, duration, success)` `.recordResourceAccess(uri, duration)` `.getMetrics()` | In-process metrics collection with OTEL integration. |
| `trace` | `telemetry/trace` | `.startSpan(name, opts?)` `.runInSpan(name, fn)` `.runInContext(fn)` | Tracing helpers wrapping OTEL `@opentelemetry/api`. |
| `SEMCONV_*` | `telemetry/semconv` | 38 semantic convention constants | Attribute keys following OpenTelemetry semantic conventions. |
