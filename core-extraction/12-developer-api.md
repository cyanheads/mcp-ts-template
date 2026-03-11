# 12 — Developer API

> Inspired by FastMCP's "framework owns the ceremony" philosophy. Defines the consumer-facing API surface for `@cyanheads/mcp-ts-core`.

---

## Design Principles

| Principle | Implementation |
|:----------|:---------------|
| Framework owns the ceremony | `createApp()` absorbs lifecycle; `tool()`, `resource()`, `prompt()` absorb definition boilerplate |
| One context, not two | Unified `Context` replaces separate `appContext` + `sdkContext` |
| Auth is data, not a wrapper | `auth: ['scope']` on the definition object, not `withToolAuth(scopes, fn)` HOF |
| Tasks are a flag, not a type | `task: true` on a tool definition, not a separate `TaskToolDefinition` |
| Type inference does the work | Zod schemas drive input/output types; builder generics preserve them |
| Escape hatches exist | Every convenience has a lower-level alternative for power users |

---

## Context

The single object every tool and resource handler receives. Replaces the split `appContext` (tracing) + `sdkContext` (protocol capabilities) pattern.

### Interface

```ts
interface Context {
  // --- Identity & tracing ---
  /** Unique request ID for log correlation */
  readonly requestId: string;
  /** ISO 8601 creation time */
  readonly timestamp: string;
  /** Tenant ID — from JWT 'tid' claim (HTTP) or 'default' (stdio) */
  readonly tenantId?: string;
  /** OpenTelemetry trace ID (auto-injected) */
  readonly traceId?: string;
  /** OpenTelemetry span ID (auto-injected) */
  readonly spanId?: string;
  /** Auth data when request is authenticated */
  readonly auth?: AuthContext;

  // --- Structured logging ---
  /** Logger scoped to this request. Auto-includes requestId, traceId, tenantId. */
  readonly log: ContextLogger;

  // --- Tenant-scoped storage ---
  /** Key-value state scoped to the current tenant. Throws if tenantId is missing. */
  readonly state: ContextState;

  // --- Protocol capabilities (optional — not all clients support these) ---
  /** Ask the human user a question. Present when client supports elicitation. */
  readonly elicit?: (message: string, schema: z.ZodObject<any>) => Promise<ElicitResult>;
  /** Request LLM completion from the client. Present when client supports sampling. */
  readonly sample?: (messages: SamplingMessage[], opts?: SamplingOpts) => Promise<SamplingResult>;

  // --- Cancellation ---
  /** AbortSignal for request cancellation */
  readonly signal: AbortSignal;

  // --- Task progress (present when task: true) ---
  /** Progress reporting for background tasks. Undefined for non-task tools. */
  readonly progress?: ContextProgress;

  // --- Raw URI (present for resource handlers) ---
  /** The parsed resource URI. Only set in resource handler context. */
  readonly uri?: URL;
}
```

### `ctx.log`

Auto-correlated to the current request. No imports, no spreading `appContext`.

```ts
// Before (current pattern)
import { logger } from '@cyanheads/mcp-ts-core/utils/logger';
logger.info('Processing query', { ...appContext, query: input.query });

// After
ctx.log.info('Processing query', { query: input.query });
```

Interface:

```ts
interface ContextLogger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  notice(msg: string, data?: Record<string, unknown>): void;
  warning(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, error?: Error, data?: Record<string, unknown>): void;
}
```

Internally, each method delegates to the global Pino logger with `requestId`, `traceId`, `tenantId` auto-spread. The global `logger` still exists for non-request contexts (startup, shutdown, background services).

### `ctx.state`

Tenant-scoped key-value storage. Delegates to `StorageService` with the request's `tenantId`.

```ts
// Before
if (!appContext.tenantId) throw new McpError(JsonRpcErrorCode.InvalidRequest, 'tenantId required');
await storage.set('bookmark:123', JSON.stringify(bookmark), { tenantId: appContext.tenantId });

// After
await ctx.state.set('bookmark:123', JSON.stringify(bookmark));
```

Interface:

```ts
interface ContextState {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string, opts?: { cursor?: string; limit?: number }): Promise<{
    items: Array<{ key: string; value: string }>;
    cursor?: string;
  }>;
}
```

Throws `McpError(InvalidRequest, 'tenantId required for state operations')` if `tenantId` is not present on the context. For stdio servers (single-tenant), `createApp()` defaults `tenantId` to `'default'` so `ctx.state` works without auth.

**Workers persistence warning:** `ctx.state` delegates to whatever `StorageService` provider is configured. With `in-memory` provider in Cloudflare Workers, data is lost between cold starts — the isolate has no durable state. For persistent storage in Workers, configure `cloudflare-kv`, `cloudflare-r2`, or `cloudflare-d1` as the storage provider. The convenience of `ctx.state` can mask this distinction — choose a durable provider before deploying stateful tools to Workers.

### `ctx.elicit` / `ctx.sample`

Optional protocol capabilities. Present only when the client advertises support. Check before calling.

```ts
// Elicitation — ask the human user for input
if (ctx.elicit) {
  const result = await ctx.elicit('What format do you prefer?', z.object({
    format: z.enum(['json', 'csv', 'markdown']).describe('Output format'),
  }));
  if (result.action === 'accept') useFormat(result.data.format);
}

// Sampling — request LLM completion from the client
if (ctx.sample) {
  const result = await ctx.sample([
    { role: 'user', content: { type: 'text', text: `Summarize: ${data}` } },
  ], { maxTokens: 500 });
  return result.content;
}
```

No type guards needed. The fields are `undefined` when not available — standard optional chaining.

### `ctx.progress`

Task progress reporting. Present only when the tool has `task: true`.

```ts
interface ContextProgress {
  /** Set the total expected units of work */
  setTotal(total: number): Promise<void>;
  /** Increment completed work by amount (default: 1) */
  increment(amount?: number): Promise<void>;
  /** Set a custom status message */
  update(message: string): Promise<void>;
}
```

### Construction (internal)

The handler factory constructs `Context` from the existing `RequestContext` + SDK `RequestHandlerExtra`:

```ts
function createContext(
  appContext: RequestContext,
  sdkContext: SdkContext,
  services: CoreServices,
  taskCtx?: { store: RequestTaskStore; taskId: string },
): Context {
  return {
    requestId: appContext.requestId,
    timestamp: appContext.timestamp,
    tenantId: appContext.tenantId,
    traceId: appContext.traceId,
    spanId: appContext.spanId,
    auth: appContext.auth,
    log: createContextLogger(services.logger, appContext),
    state: createContextState(services.storage, appContext.tenantId),
    elicit: hasElicitInput(sdkContext)
      ? (msg, schema) => sdkContext.elicitInput({ message: msg, schema })
      : undefined,
    sample: hasSamplingCapability(sdkContext)
      ? (msgs, opts) => sdkContext.createMessage({ messages: msgs, ...opts })
      : undefined,
    signal: sdkContext.signal,
    progress: taskCtx
      ? createContextProgress(taskCtx.store, taskCtx.taskId)
      : undefined,
  };
}
```

`RequestContext` and the global `logger` still exist internally. `Context` is the consumer-facing facade.

---

## Builders

Thin factory functions that produce `ToolDefinition`, `ResourceDefinition`, and `PromptDefinition` objects. Zero runtime logic — they restructure arguments for ergonomics and type inference.

### `tool(name, options)`

```ts
import { tool } from '@cyanheads/mcp-ts-core';

const addBookmark = tool('add_bookmark', {
  description: 'Save a URL as a bookmark with title and optional tags.',
  input: z.object({
    url: z.string().url().describe('URL to bookmark'),
    title: z.string().describe('Human-readable title'),
    tags: z.array(z.string()).optional().describe('Categorization tags'),
  }),
  output: z.object({
    id: z.string().describe('Created bookmark ID'),
    url: z.string().describe('Bookmarked URL'),
    title: z.string().describe('Bookmark title'),
    tags: z.array(z.string()).describe('Applied tags'),
    createdAt: z.string().describe('ISO 8601 creation timestamp'),
  }),
  auth: ['bookmark:write'],
  annotations: { readOnlyHint: false },
  async handler(input, ctx) {
    ctx.log.info('Adding bookmark', { url: input.url });
    const bookmark = await getBookmarksService().create(input, ctx);
    return bookmark;
  },
  format: (result) => [{ type: 'text', text: `Saved: **${result.title}** (${result.id})` }],
});
```

**Signature:**

```ts
function tool<I extends z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny>(
  name: string,
  options: {
    description: string;
    title?: string;
    input: I;
    output?: O;
    auth?: string[];
    annotations?: ToolAnnotations;
    task?: boolean;
    handler: (input: z.infer<I>, ctx: Context) => Promise<z.infer<O>> | z.infer<O>;
    format?: (result: z.infer<O>) => ContentBlock[];
  },
): ToolDefinition<I, O>;
```

**Field mapping from current pattern:**

| Current (verbose) | New (builder) | Notes |
|:-------------------|:--------------|:------|
| `name: TOOL_NAME` | First argument | Name extracted from definition body |
| `description: TOOL_DESCRIPTION` | `description` | Same |
| `inputSchema: InputSchema` | `input` | Shorter name |
| `outputSchema: OutputSchema` | `output` | Optional |
| `logic: withToolAuth(scopes, fn)` | `handler` + `auth` | Auth separated from handler |
| `responseFormatter` | `format` | Shorter name |
| `annotations: TOOL_ANNOTATIONS` | `annotations` | Same |

**Handler signature change:**

```ts
// Before: three parameters, manual imports for logging/storage
logic: async (input: Input, appContext: RequestContext, sdkContext: SdkContext) => { ... }

// After: two parameters, everything on ctx
handler: async (input, ctx) => { ... }
```

### `resource(uriTemplate, options)`

URI template as first argument (like a route path).

```ts
import { resource } from '@cyanheads/mcp-ts-core';

const customerProfile = resource('customer://{customerId}/profile', {
  description: 'Customer profile data.',
  params: z.object({ customerId: z.string().describe('Customer ID') }),
  auth: ['customer:read'],
  mimeType: 'application/json',
  async handler(params, ctx) {
    return { id: params.customerId, status: 'active' };
  },
  list: async () => ({
    resources: [
      { uri: 'customer://all', name: 'All Customers', mimeType: 'application/json' },
    ],
  }),
});
```

**Signature:**

```ts
function resource<P extends z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny>(
  uriTemplate: string,
  options: {
    name?: string;            // Defaults to slugified URI template
    description: string;
    title?: string;
    params?: P;
    output?: O;
    mimeType?: string;
    auth?: string[];
    annotations?: ResourceAnnotations;
    handler: (params: z.infer<P>, ctx: Context) => Promise<z.infer<O>> | z.infer<O>;
    list?: (extra: ListExtra) => Promise<ListResourcesResult> | ListResourcesResult;
    format?: (result: z.infer<O>) => ContentBlock[];
    examples?: ResourceExample[];
  },
): ResourceDefinition<P, O>;
```

**Handler signature change:**

```ts
// Before: three parameters, raw URL object
logic: async (uri: URL, params, context: RequestContext) => { ... }

// After: two parameters, URI available on ctx.uri if needed
handler: async (params, ctx) => { ... }
```

### `prompt(name, options)`

Prompts are already simple. The builder just shortens field names.

```ts
import { prompt } from '@cyanheads/mcp-ts-core';

const codeReview = prompt('code_review', {
  description: 'Review code for security flaws and best practices.',
  args: z.object({
    code: z.string().describe('Code to review'),
    language: z.string().optional().describe('Programming language'),
  }),
  generate: (args) => [
    { role: 'user', content: { type: 'text', text: `Review this ${args.language ?? ''} code:\n${args.code}` } },
  ],
});
```

**Signature:**

```ts
function prompt<A extends z.ZodTypeAny = z.ZodTypeAny>(
  name: string,
  options: {
    description: string;
    args?: A;
    generate: (args: z.infer<A>) => PromptMessage[] | Promise<PromptMessage[]>;
  },
): PromptDefinition<A>;
```

Prompts do not receive `Context` — they are pure message templates per the MCP spec.

---

## `createApp()` (updated)

Flattened options. `definitions: { tools, resources, prompts }` becomes top-level `tools`, `resources`, `prompts`.

```ts
await createApp({
  name: 'bookmarks-mcp-server',
  version: '0.1.0',
  tools: [addBookmark, searchBookmarks, deleteBookmark],
  resources: [bookmarkCollection],
  prompts: [summarizeBookmarks],
  setup(core) {
    initBookmarksService(core.config, core.storage);
  },
});
```

**Updated interface:**

```ts
interface CreateAppOptions {
  name?: string;
  version?: string;
  tools?: AnyToolDefinition[];
  resources?: AnyResourceDefinition[];
  prompts?: PromptDefinition[];
  setup?: (core: CoreServices) => void | Promise<void>;
}
```

All arrays default to `[]`. A server with only tools skips `resources` and `prompts` entirely.

`CoreServices` and `ServerHandle` are unchanged from [02-public-api.md](02-public-api.md).

---

## Task Tools

`task: true` replaces the separate `TaskToolDefinition` type, `.task-tool.ts` file suffix convention, and manual `taskHandlers` implementation.

### Before (current pattern — ~80 lines)

```ts
// Separate TaskToolDefinition type, manual createTask/getTask/getTaskResult handlers
export const asyncCountdown: TaskToolDefinition<typeof InputSchema, typeof OutputSchema> = {
  name: 'async_countdown',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  execution: { taskSupport: 'required' },
  taskHandlers: {
    createTask: async (args, extra) => {
      const task = await extra.taskStore.createTask({ ttl: 120000, pollInterval: 1000 });
      startBackgroundWork(task.taskId, args, extra.taskStore);
      return { task };
    },
    getTask: async (_args, extra) => await extra.taskStore.getTask(extra.taskId),
    getTaskResult: async (_args, extra) => await extra.taskStore.getTaskResult(extra.taskId),
  },
};
```

### After

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

The developer writes a normal handler. The framework handles task lifecycle automatically:

1. **Client calls tool** — framework creates a task, returns task ID immediately
2. **Handler runs in background** — `ctx.progress` is available for status updates
3. **Client polls** — framework returns task status from the task store
4. **Handler completes** — framework stores result, marks task `completed`
5. **Handler throws** — framework stores error, marks task `failed`
6. **Client cancels** — framework signals `ctx.signal`, marks task `cancelled`

### Escape hatch

For edge cases needing custom task lifecycle (multi-stage, streaming partial results, custom cancellation), the raw `TaskToolDefinition` with manual `taskHandlers` remains available as a power-user API from `@cyanheads/mcp-ts-core/tasks`.

---

## Auth

Inline `auth` property replaces the `withToolAuth` / `withResourceAuth` HOF wrappers.

### Before

```ts
import { withToolAuth } from '@cyanheads/mcp-ts-core/auth';

logic: withToolAuth(['tool:bookmark:write'], async (input, appContext, sdkContext) => {
  // ...
}),
```

### After

```ts
const addBookmark = tool('add_bookmark', {
  auth: ['bookmark:write'],
  async handler(input, ctx) {
    // ...
  },
});
```

**How it works internally:**

The handler factory reads `auth` from the definition. Before calling `handler`:
1. If `auth` is defined and auth is enabled (`MCP_AUTH_MODE !== 'none'`): check `ctx.auth.scopes` against required scopes. Throw `McpError(Forbidden)` if insufficient.
2. If `auth` is defined but auth is disabled: allow (defaults permitted when auth is off — same as current behavior).
3. If `auth` is not defined: no scope checking.

For advanced auth patterns (dynamic scope computation, custom claim inspection), import from `@cyanheads/mcp-ts-core/auth`:

```ts
import { checkScopes } from '@cyanheads/mcp-ts-core/auth';

handler: async (input, ctx) => {
  // Dynamic: scope depends on input
  checkScopes(ctx, [`team:${input.teamId}:write`]);
  // ...
},
```

---

## Testing

### `createMockContext()`

Replaces separate `createMockAppContext()` and `createMockSdkContext()`.

```ts
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';

// Minimal — works for most tests
const ctx = createMockContext();

// With tenant (for tools that use ctx.state)
const ctx = createMockContext({ tenantId: 'test-tenant' });

// With sampling capability
const ctx = createMockContext({
  sample: vi.fn().mockResolvedValue({
    role: 'assistant',
    content: { type: 'text', text: 'LLM response' },
    model: 'test-model',
  }),
});

// With elicitation
const ctx = createMockContext({
  elicit: vi.fn().mockResolvedValue({ action: 'accept', data: { format: 'json' } }),
});

// With task progress
const ctx = createMockContext({ progress: true });
```

### Test pattern

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
import { McpError } from '@cyanheads/mcp-ts-core/errors';
import { addBookmark } from '@/mcp-server/tools/add-bookmark.tool.js';

describe('addBookmark', () => {
  it('creates a bookmark', async () => {
    const ctx = createMockContext({ tenantId: 'test-tenant' });
    const input = addBookmark.input.parse({
      url: 'https://example.com',
      title: 'Example',
      tags: ['test'],
    });

    const result = await addBookmark.handler(input, ctx);

    expect(result.url).toBe('https://example.com');
    expect(result.title).toBe('Example');
  });

  it('formats response', () => {
    const result = { id: 'abc', url: 'https://example.com', title: 'Ex', tags: [], createdAt: '' };
    const blocks = addBookmark.format!(result);
    expect(blocks[0].type).toBe('text');
  });
});
```

**What changed:**
- `createMockContext()` instead of `createMockAppContext()` + `createMockSdkContext()`
- `addBookmark.handler(input, ctx)` instead of `addBookmark.logic(input, appContext, sdkContext)`
- `addBookmark.input.parse()` instead of `addBookmark.inputSchema.parse()`

---

## Definition Types (updated)

The builder functions produce these types. Consumers can also construct them directly.

### `ToolDefinition`

```ts
interface ToolDefinition<
  I extends z.ZodTypeAny = z.ZodTypeAny,
  O extends z.ZodTypeAny = z.ZodTypeAny,
> {
  name: string;
  description: string;
  title?: string;
  input: I;
  output?: O;
  auth?: string[];
  annotations?: ToolAnnotations;
  task?: boolean;
  handler: (input: z.infer<I>, ctx: Context) => Promise<z.infer<O>> | z.infer<O>;
  format?: (result: z.infer<O>) => ContentBlock[];
}
```

### `ResourceDefinition`

```ts
interface ResourceDefinition<
  P extends z.ZodTypeAny = z.ZodTypeAny,
  O extends z.ZodTypeAny = z.ZodTypeAny,
> {
  name: string;
  description: string;
  title?: string;
  uriTemplate: string;
  params?: P;
  output?: O;
  mimeType?: string;
  auth?: string[];
  annotations?: ResourceAnnotations;
  handler: (params: z.infer<P>, ctx: Context) => Promise<z.infer<O>> | z.infer<O>;
  list?: (extra: ListExtra) => Promise<ListResourcesResult> | ListResourcesResult;
  format?: (result: z.infer<O>) => ContentBlock[];
  examples?: ResourceExample[];
}
```

### `PromptDefinition`

```ts
interface PromptDefinition<A extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  args?: A;
  generate: (args: z.infer<A>) => PromptMessage[] | Promise<PromptMessage[]>;
}
```

### Type-erased unions

For mixed arrays passed to `createApp()`:

```ts
type AnyToolDefinition = ToolDefinition<any, any>;
type AnyResourceDefinition = ResourceDefinition<any, any>;
```

---

## Updated Exports

Changes to the subpath exports from [02-public-api.md](02-public-api.md):

| Export | What's added | Notes |
|:-------|:-------------|:------|
| `.` (main) | Re-exports `tool`, `resource`, `prompt`, `Context` type | Convenience — one import for quick start |
| `./tools` | `tool()` builder, `ToolDefinition`, `AnyToolDefinition`, `Context` | |
| `./resources` | `resource()` builder, `ResourceDefinition`, `AnyResourceDefinition`, `Context` | |
| `./prompts` | `prompt()` builder, `PromptDefinition` | No Context (prompts are pure) |
| `./tasks` | `TaskToolDefinition` (power-user escape hatch) | Raw task handlers for edge cases |
| `./auth` | `checkScopes()` for dynamic auth | `withToolAuth`/`withResourceAuth` removed |
| `./testing` | `createMockContext()` | Replaces `createMockAppContext` + `createMockSdkContext` |
| `./context` | `Context`, `ContextLogger`, `ContextState`, `ContextProgress` types | For consumers typing against context directly |

**Removed exports:**
- `withToolAuth` / `withResourceAuth` — replaced by inline `auth` property + `checkScopes()` for dynamic cases

---

## Migration from Current Pattern

This table maps old patterns to new. Relevant for updating [CLAUDE.md](../CLAUDE.md) and [07-migration.md](07-migration.md).

| Old pattern | New pattern |
|:------------|:------------|
| `ToolDefinition` with `logic`, `inputSchema`, `outputSchema`, `responseFormatter` | `tool()` builder with `handler`, `input`, `output`, `format` |
| `TaskToolDefinition` with `taskHandlers` | `tool()` with `task: true` |
| `withToolAuth(scopes, logicFn)` | `auth: ['scope']` on definition |
| `(input, appContext, sdkContext) => result` | `(input, ctx) => result` |
| `logger.info(msg, { ...appContext, ...data })` | `ctx.log.info(msg, data)` |
| `storage.set(key, val, { tenantId: ctx.tenantId })` | `ctx.state.set(key, val)` |
| `hasElicitInput(sdkContext) ? sdkContext.elicitInput(...) : ...` | `ctx.elicit ? ctx.elicit(...) : ...` |
| `hasSamplingCapability(sdkContext) ? sdkContext.createMessage(...) : ...` | `ctx.sample ? ctx.sample(...) : ...` |
| `createMockAppContext()` + `createMockSdkContext()` | `createMockContext()` |
| `definitions: { tools, resources, prompts }` | `tools: [...], resources: [...], prompts: [...]` |
| `.tool.ts` / `.task-tool.ts` / `.app-tool.ts` suffixes | `.tool.ts` for all (task is a flag, not a file type) |
| `ResourceDefinition.logic(uri, params, context)` | `handler(params, ctx)` (URI on `ctx.uri`) |
| `argumentsSchema` | `args` |

---

## File Suffix Conventions (updated)

| Suffix | Meaning |
|:-------|:--------|
| `.tool.ts` | Tool (standard or task — determined by `task` flag) |
| `.resource.ts` | Resource |
| `.app-tool.ts` | UI-enabled tool (MCP Apps) |
| `.app-resource.ts` | UI resource linked to an app tool |
| `.prompt.ts` | Prompt template |

`.task-tool.ts` suffix is retired. Task tools use `.tool.ts` with `task: true`.

---

## Checklist

- [x] `Context` interface defined in `src/context.ts`
- [x] `createContext()` factory constructs `Context` from `RequestContext` + `SdkContext` + services
- [x] `ContextLogger` delegates to Logger (Pino wrapper) with auto-correlated request metadata
- [x] `ContextState` delegates to `StorageService` with tenant scoping
- [x] `ContextProgress` wraps `TaskStore` status updates
- [x] `tool()` builder exported from `./tools` and `.`
- [ ] `resource()` builder exported from `./resources` and `.`
- [ ] `prompt()` builder exported from `./prompts` and `.`
- [x] `ToolDefinition` uses new field names (`handler`, `input`, `output`, `format`, `auth`, `task`)
- [ ] `ResourceDefinition` uses new field names, handler receives `(params, ctx)` not `(uri, params, context)`
- [ ] `PromptDefinition` uses `args` instead of `argumentsSchema`
- [ ] `task: true` tools auto-managed by framework (create task, run background, store result)
- [x] `TaskToolDefinition` with manual `taskHandlers` preserved as escape hatch in `./tasks`
- [x] Inline `auth` property checked by handler factory before calling `handler`
- [ ] `checkScopes(ctx, scopes)` exported from `./auth` for dynamic auth
- [ ] `withToolAuth` / `withResourceAuth` removed
- [x] `createMockContext()` exported from `./testing`
- [ ] `createApp()` accepts flattened `tools`, `resources`, `prompts` (not nested `definitions`)
- [ ] Stdio mode defaults `tenantId` to `'default'` so `ctx.state` works without auth
- [x] All existing template tools (`echo`, `cat_fact`, `countdown`, etc.) updated to new API
- [ ] `bun run devcheck` passes (final gate)
- [ ] All tests updated and passing (final gate)
