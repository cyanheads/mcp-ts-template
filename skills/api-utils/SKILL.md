---
name: api-utils
description: >
  API reference for all `@cyanheads/mcp-ts-core/utils/*` subpath exports. Use when looking up utility method signatures, options, peer dependencies, or usage patterns.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Overview

Compact method tables for every `utils/*` subpath. For exact type signatures, read `.d.ts` files from `node_modules/@cyanheads/mcp-ts-core/dist/`.

**Tier 3** = optional peer dependency. Install as needed (e.g., `bun add js-yaml`). All Tier 3 methods are **async** (lazy-load deps on first call).

---

## `@cyanheads/mcp-ts-core/utils/formatting`

| Export | API | Notes |
|:-------|:----|:------|
| `markdown()` | `() -> MarkdownBuilder` | Factory shorthand. Fluent builder — all methods return `this` |
| `MarkdownBuilder` | `.h1()` `.h2()` `.h3()` `.h4()` `.keyValue(key, val)` `.keyValuePlain(key, val)` `.list(items, ordered?)` `.codeBlock(content, lang?)` `.inlineCode(code)` `.paragraph(text)` `.blockquote(text)` `.hr()` `.link(text, url)` `.table(headers, rows)` `.section(title, [level], fn)` `.when(cond, fn)` `.text(str)` `.build() -> string` | Each method appends to internal buffer. `.when()` conditionally executes callback. `.section()` adds heading + calls callback. |
| `diffFormatter` | `.diff(old, new, opts?, ctx?)` `.diffLines(oldLines, newLines, opts?, ctx?)` `.diffWords(old, new, ctx?)` `.diffJson(old, new, ctx?)` `.summary(old, new, ctx?)` | **Async** — Tier 3 peer: `diff`. Formats: `'unified'` \| `'patch'` \| `'inline'`. Options: `context`, `format`, `includeHeaders`, `oldPath`/`newPath`, `showLineNumbers`. |
| `tableFormatter` | `.format(data, opts?, ctx?)` `.formatRaw(headers, rows, opts?, ctx?)` | Styles: `'markdown'` \| `'ascii'` \| `'grid'` \| `'compact'`. Options: `style`, `alignment`, `maxWidth`, `minWidth`, `truncate`, `headerStyle`, `padding`. |
| `treeFormatter` | `.format(node, opts?, ctx?)` `.formatMultiple(nodes, opts?, ctx?)` | Styles: `'unicode'` \| `'ascii'` \| `'compact'`. Options: `style`, `maxDepth`, `showMetadata`, `icons`, `indent`, `folderIcon`, `fileIcon`. `TreeNode: { name, children?, metadata? }`. Detects circular refs. |

---

## `@cyanheads/mcp-ts-core/utils/parsing`

All parsers are **async** (Tier 3 lazy deps). All strip `<think>...</think>` blocks from LLM output before parsing.

| Export | API | Peer Dep |
|:-------|:----|:---------|
| `yamlParser` | `.parse<T>(yamlString, ctx?) -> Promise<T>` | `js-yaml` |
| `xmlParser` | `.parse<T>(xmlString, ctx?) -> Promise<T>` | `fast-xml-parser` |
| `csvParser` | `.parse(csvString, opts?, ctx?) -> Promise<Papa.ParseResult>` | `papaparse` |
| `jsonParser` | `.parse<T>(jsonString, allowFlags?, ctx?) -> Promise<T>` — parses partial/streaming JSON. `Allow` flags: `STR`, `NUM`, `ARR`, `OBJ`, `NULL`, `BOOL`, `NAN`, `INF`, `SPECIAL`, `ALL` | `partial-json` |
| `pdfParser` | `.extractText(source, ctx?)` `.createDocument(ctx?)` `.loadDocument(source, ctx?)` `.addPage(doc, opts?)` `.drawText(page, text, opts)` `.embedImage(doc, imageBytes, format)` `.saveDocument(doc, ctx?)` | `pdf-lib`, `unpdf` |
| `dateParser` | `parseDateString(text, ctx, refDate?) -> Promise<Date \| null>` `parseDetailedDate(text, ctx, refDate?) -> Promise<chrono.ParsedResult[]>` | `chrono-node` |

---

## `@cyanheads/mcp-ts-core/utils/security`

| Export | API | Notes |
|:-------|:----|:------|
| `sanitization` | `.sanitizeHtml(html, opts?, ctx?)` `.sanitizeString(str, opts?, ctx?)` `.sanitizeUrl(url, opts?, ctx?)` `.sanitizeNumber(val, opts?, ctx?)` `.sanitizePath(filePath, opts?)` `.sanitizeJson(json, ctx?)` `.redactSensitiveFields(data, fields?, ctx?)` `.getSensitivePinoFields()` | **Async** methods (except `sanitizePath`, `sanitizeJson`, `redactSensitiveFields`, `getSensitivePinoFields`). Tier 3 peers: `sanitize-html`, `validator`. `sanitizePath` is Node-only (sync). |
| `rateLimiter` | `new RateLimiter(config, logger)` `.configure(opts)` `.check(identifier, ctx?)` `.getRemainingRequests(id)` `.reset(id?)` `.destroy()` | In-process, sliding window. `RateLimitConfig: { maxRequests, windowMs, cleanupInterval?, maxTrackedKeys?, skipInDevelopment?, errorMessage?, keyGenerator? }`. Throws `McpError(RateLimited)`. LRU eviction. OTEL span annotations. |
| `idGenerator` | `new IdGenerator(prefixes?)` `.generate(entityType, opts?)` `.generateBatch(entityType, count, opts?)` `.validate(id)` `.getEntityType(id)` `.normalize(id)` — also standalone `generateUUID() -> string` | Crypto-random via Web Crypto API. `IdGenerationOptions: { charset?, length?, separator? }`. Default: `A-Z0-9`, length 6, separator `_`. |

---

## `@cyanheads/mcp-ts-core/utils/network`

| Export | API | Notes |
|:-------|:----|:------|
| `fetchWithTimeout` | `(url, timeoutMs, opts?, ctx?) -> Promise<Response>` | Wraps `fetch` with `AbortController` timeout. Options extend `RequestInit` (minus `signal`) + `rejectPrivateIPs?: boolean` + `signal?: AbortSignal` (external cancellation). SSRF protection: blocks RFC 1918, loopback, link-local, CGNAT, cloud metadata. DNS validation on Node; hostname-only on Workers. Manual redirect following (max 5) with per-hop SSRF check. |

---

## `@cyanheads/mcp-ts-core/utils/pagination`

| Export | API | Notes |
|:-------|:----|:------|
| `extractCursor` | `(cursor?: string, defaultLimit?) -> PaginationState` | Decodes opaque base64url cursor to `{ offset, limit }`. Returns `{ offset: 0, limit: defaultLimit }` when cursor is undefined. Throws `McpError(InvalidParams)` on invalid cursor. |
| `paginateArray` | `<T>(items, cursor?, limit?, ctx?) -> PaginatedResult<T>` | Slices array by cursor position. Returns `{ items, nextCursor?, totalCount }`. `nextCursor` omitted on last page. |
| `encodeCursor` | `(state: PaginationState) -> string` | Encodes `{ offset, limit }` to opaque base64url string. |

---

## `@cyanheads/mcp-ts-core/utils/runtime`

| Export | API | Notes |
|:-------|:----|:------|
| `runtimeCaps` | `RuntimeCapabilities` object | Snapshot at import time. Fields: `isNode`, `isBun`, `isWorkerLike`, `isBrowserLike`, `hasProcess`, `hasBuffer`, `hasTextEncoder`, `hasPerformanceNow`. All booleans, never throw. |

---

## `@cyanheads/mcp-ts-core/utils/scheduling`

| Export | API | Notes |
|:-------|:----|:------|
| `scheduler` | `.schedule(id, cronExpr, description, taskFn, ctx?) -> Promise<Job>` `.stop(id, ctx?)` `.stopAll(ctx?)` `.listJobs()` `.getJob(id)` `.isRunning(id)` | **Async** — Tier 3 peer: `node-cron`. **Node-only** (throws `ConfigurationError` in Workers). Skips overlapping executions. Each tick gets fresh `RequestContext`. `Job: { id, schedule, description, isRunning, task }`. |

---

## `@cyanheads/mcp-ts-core/utils/types`

| Export | API | Notes |
|:-------|:----|:------|
| `isErrorWithCode` | `(err) -> err is { code: string \| number; message: string }` | Type guard for errors with a `code` property |
| `isRecord` | `(val) -> val is Record<string, unknown>` | Type guard for plain objects (non-null, non-array) |
| `isObject` | `(val) -> val is object` | Type guard for non-null, non-array objects |
| `hasProperty` | `(obj, key) -> obj is obj & Record<key, unknown>` | Type guard for property existence |

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
| `ErrorHandler` | `.tryCatch<T>(fn, opts) -> Promise<T>` `.tryCatchSync<T>(fn, opts) -> T` | Service-level error recovery. Options: `operation`, `context`, `errorCode`, `input`. Wraps exceptions into `McpError`. Use in services, NOT in tool handlers (those throw raw `McpError`). |

---

## `@cyanheads/mcp-ts-core/utils/telemetry`

| Export | Subpath | API | Notes |
|:-------|:--------|:----|:------|
| `initInstrumentation` | `telemetry/instrumentation` | `(config) -> void` | Initializes OpenTelemetry SDK with OTLP exporter. Call once at startup. |
| `metrics` | `telemetry/metrics` | `.recordToolExecution(name, duration, success)` `.recordResourceAccess(uri, duration)` `.getMetrics()` | In-process metrics collection with OTEL integration. |
| `trace` | `telemetry/trace` | `.startSpan(name, opts?)` `.runInSpan(name, fn)` `.runInContext(fn)` | Tracing helpers wrapping OTEL `@opentelemetry/api`. |
| `SEMCONV_*` | `telemetry/semconv` | 38 semantic convention constants | Attribute keys following OpenTelemetry semantic conventions. |
