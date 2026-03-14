---
name: api-context
description: >
  Canonical reference for the unified `Context` object passed to every tool and resource handler in `@cyanheads/mcp-ts-core`. Covers the full interface, all sub-APIs (`ctx.log`, `ctx.state`, `ctx.elicit`, `ctx.sample`, `ctx.progress`), and when to use each.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: reference
---

## Overview

Every tool and resource handler receives a single `Context` (`ctx`) argument. It provides request identity, structured logging, tenant-scoped storage, optional protocol capabilities (elicitation, sampling), cancellation, and task progress — all auto-correlated to the current request.

**Rule:** Use `ctx.log` and `ctx.state` inside handlers. Use the global `logger` and `StorageService` directly only in lifecycle/background code (`setup()`, services).

---

## `Context` Interface

```ts
import type { Context } from '@cyanheads/mcp-ts-core/context';

interface Context {
  // Identity & tracing
  readonly requestId: string;       // Unique per request, auto-generated
  readonly timestamp: string;       // ISO 8601 request start time
  readonly tenantId?: string;       // From JWT 'tid' claim; 'default' in stdio mode
  readonly traceId?: string;        // OTEL trace ID (present when OTEL enabled)
  readonly spanId?: string;         // OTEL span ID (present when OTEL enabled)
  readonly auth?: AuthContext;      // Parsed auth claims (clientId, scopes, sub)

  // Structured logging — auto-includes requestId, traceId, tenantId
  readonly log: ContextLogger;

  // Tenant-scoped key-value storage
  readonly state: ContextState;

  // Optional protocol capabilities (undefined when client doesn't support them)
  readonly elicit?: (message: string, schema: z.ZodObject<any>) => Promise<ElicitResult>;
  readonly sample?: (messages: SamplingMessage[], opts?: SamplingOpts) => Promise<CreateMessageResult>;

  // Cancellation
  readonly signal: AbortSignal;

  // Task progress — present only when tool is defined with task: true
  readonly progress?: ContextProgress;

  // Raw URI — present only for resource handlers
  readonly uri?: URL;
}
```

### Identity fields

| Field | Always present | Source |
|:------|:--------------|:-------|
| `requestId` | Yes | Auto-generated UUID per request |
| `timestamp` | Yes | ISO 8601, request start |
| `tenantId` | In stdio (as `'default'`); from JWT `tid` claim in HTTP | JWT / stdio default |
| `traceId` | When OTEL enabled | OTEL trace context |
| `spanId` | When OTEL enabled | OTEL trace context |
| `auth` | When auth enabled | Parsed JWT claims |

---

## `ctx.log`

Request-scoped structured logger. Every log line is automatically annotated with `requestId`, `traceId`, and `tenantId` — no manual spreading needed.

### Methods

| Method | Level |
|:-------|:------|
| `ctx.log.debug(msg, data?)` | Verbose debugging |
| `ctx.log.info(msg, data?)` | Normal operational events |
| `ctx.log.notice(msg, data?)` | Significant but non-error events |
| `ctx.log.warning(msg, data?)` | Recoverable issues, unexpected states |
| `ctx.log.error(msg, error?, data?)` | Errors (second arg is the Error object) |

### Usage

```ts
// Basic
ctx.log.info('Processing query', { query: input.query });

// With error object (second arg)
ctx.log.error('Failed to fetch upstream', error, { url, statusCode });

// Debug detail
ctx.log.debug('Cache miss', { key, ttl });
```

### `ctx.log` vs global `logger`

| Use | Where |
|:----|:------|
| `ctx.log` | Inside tool/resource handlers — auto-correlated to the request |
| `core.logger` / `logger` | In `setup()`, service constructors, background tasks — no request context available |

The global `logger` is imported from `@cyanheads/mcp-ts-core/utils`. In handlers, always prefer `ctx.log`.

---

## `ctx.state`

Tenant-scoped key-value storage. Delegates to `StorageService` with automatic `tenantId` scoping — data written under tenant A is invisible to tenant B.

### Interface

```ts
interface ContextState {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string, opts?: { cursor?: string; limit?: number }): Promise<{
    items: Array<{ key: string; value: string }>;
    cursor?: string;  // opaque base64url; omitted on last page
  }>;
}
```

### Usage

```ts
// Store (values are always strings — serialize JSON manually)
await ctx.state.set('item:123', JSON.stringify(data));
await ctx.state.set('session:xyz', token, { ttl: 3600 }); // TTL in seconds

// Retrieve
const raw = await ctx.state.get('item:123');
const data = raw ? JSON.parse(raw) : null;

// Delete
await ctx.state.delete('item:123');

// List with prefix + pagination
const page = await ctx.state.list('item:', { cursor, limit: 20 });
for (const { key, value } of page.items) { /* ... */ }
if (page.cursor) { /* more pages available */ }
```

### Behavior notes

- Throws `McpError(InvalidRequest)` if `tenantId` is missing (won't happen in stdio mode — defaults to `'default'`).
- Keys are tenant-prefixed internally; handlers never need to namespace manually.
- **Workers persistence:** The `in-memory` provider loses data on cold starts. Use `cloudflare-kv`, `cloudflare-r2`, or `cloudflare-d1` for durable storage in Workers.

---

## `ctx.elicit` / `ctx.sample`

Both are optional — they are `undefined` when the connected client does not support the capability. Always check for presence before calling. No type guards are required; a simple truthiness check is sufficient.

### `ctx.elicit` — ask the user for structured input

Presents a form to the human user via the MCP elicitation protocol. The user fills in a Zod-validated schema and returns an action (`accept`, `decline`, or `cancel`).

```ts
if (ctx.elicit) {
  const result = await ctx.elicit(
    'Which output format do you want?',
    z.object({
      format: z.enum(['json', 'csv', 'markdown']).describe('Output format'),
      includeHeaders: z.boolean().default(true).describe('Include column headers'),
    }),
  );

  if (result.action === 'accept') {
    // result.data is typed as { format: 'json' | 'csv' | 'markdown', includeHeaders: boolean }
    await produceOutput(result.data.format, result.data.includeHeaders);
  } else {
    // 'decline' or 'cancel' — user opted out
    throw new McpError(JsonRpcErrorCode.InvalidRequest, 'User declined input');
  }
}
```

`ElicitResult`:

```ts
type ElicitResult =
  | { action: 'accept'; data: z.infer<typeof schema> }
  | { action: 'decline' | 'cancel' };
```

**Convention:** Only call `ctx.elicit` from tool handlers, not from services.

### `ctx.sample` — request an LLM completion from the client

Requests the client's LLM to generate a completion (MCP sampling protocol). Useful for AI-assisted tool behavior without managing a separate LLM provider.

```ts
if (ctx.sample) {
  const result = await ctx.sample(
    [
      { role: 'user', content: { type: 'text', text: `Summarize: ${data}` } },
    ],
    { maxTokens: 500 },
  );
  return { summary: result.content.text };
}
```

`SamplingOpts`:

```ts
interface SamplingOpts {
  includeContext?: 'none' | 'thisServer' | 'allServers';
  maxTokens?: number;
  modelPreferences?: Record<string, unknown>;
  stopSequences?: string[];
  temperature?: number;
}
```

**Convention:** Only call `ctx.sample` from tool handlers, not from services.

---

## `ctx.signal`

Standard `AbortSignal`. Present on every context. Set when the client cancels the request or when a task tool is cancelled.

```ts
// Check before expensive operations
if (ctx.signal.aborted) return earlyResult;

// Pass through to fetch / other async APIs
const response = await fetch(url, { signal: ctx.signal });

// Loop with cancellation check
for (const item of items) {
  if (ctx.signal.aborted) break;
  await processItem(item);
}
```

In task tools (`task: true`), the framework signals `ctx.signal` when the client sends a cancellation request.

---

## `ctx.progress`

Present only when the tool definition includes `task: true`. Undefined for standard (non-task) tools and all resource handlers.

### Methods

| Method | Purpose |
|:-------|:--------|
| `ctx.progress.setTotal(n)` | Set the total number of steps (enables percentage calculation on client) |
| `ctx.progress.increment(amount?)` | Advance progress by `amount` (default: 1) |
| `ctx.progress.update(message)` | Send a descriptive status message without advancing the counter |

### Usage

```ts
const asyncCountdown = tool('async_countdown', {
  description: 'Count down from a number with progress updates.',
  task: true,
  input: z.object({
    count: z.number().int().positive().describe('Number to count down from'),
    delayMs: z.number().default(1000).describe('Delay between counts in ms'),
  }),

  async handler(input, ctx) {
    await ctx.progress!.setTotal(input.count);

    for (let i = input.count; i > 0; i--) {
      if (ctx.signal.aborted) break;

      await ctx.progress!.update(`Counting: ${i}`);
      await new Promise(resolve => setTimeout(resolve, input.delayMs));
      await ctx.progress!.increment();
    }

    return { finalCount: 0, message: 'Countdown complete' };
  },
});
```

**Note:** Use the non-null assertion (`ctx.progress!`) when accessing inside a `task: true` handler — the type is `ContextProgress | undefined` even though it's guaranteed present at runtime. TypeScript cannot narrow based on the `task` flag.

---

## `ctx.uri`

Present only for resource handlers. The raw `URL` object for the matched resource URI.

```ts
export const myResource = resource('myscheme://{itemId}/data', {
  async handler(params, ctx) {
    ctx.log.debug('Resource accessed', { uri: ctx.uri?.toString() });
    // params.itemId is extracted from the URI pattern — prefer params over ctx.uri
    return fetchItem(params.itemId);
  },
});
```

Prefer `params` (the extracted URI template variables) over parsing `ctx.uri` manually. `ctx.uri` is available when the raw URL string is needed.

---

## Quick Reference

| Property | Type | Present when |
|:---------|:-----|:-------------|
| `ctx.requestId` | `string` | Always |
| `ctx.timestamp` | `string` | Always |
| `ctx.tenantId` | `string \| undefined` | Always in stdio (`'default'`); HTTP with auth |
| `ctx.traceId` | `string \| undefined` | OTEL enabled |
| `ctx.spanId` | `string \| undefined` | OTEL enabled |
| `ctx.auth` | `AuthContext \| undefined` | Auth enabled |
| `ctx.log` | `ContextLogger` | Always |
| `ctx.state` | `ContextState` | Always (throws if `tenantId` missing) |
| `ctx.signal` | `AbortSignal` | Always |
| `ctx.elicit` | `function \| undefined` | Client supports elicitation |
| `ctx.sample` | `function \| undefined` | Client supports sampling |
| `ctx.progress` | `ContextProgress \| undefined` | Tool defined with `task: true` |
| `ctx.uri` | `URL \| undefined` | Resource handlers only |
