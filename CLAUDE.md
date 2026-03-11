# Agent Protocol

**Package:** `@cyanheads/mcp-ts-core`
**Version:** 0.1.0
**npm:** [@cyanheads/mcp-ts-core](https://www.npmjs.com/package/@cyanheads/mcp-ts-core)
**Docker:** [ghcr.io/cyanheads/mcp-ts-core](https://ghcr.io/cyanheads/mcp-ts-core)

> **Developer note:** Never assume. Read related files and docs before making changes. Read full file content for context. Never edit a file before reading it.

> **Extraction status:** This document describes the target API for `@cyanheads/mcp-ts-core`. See `core-extraction/` for implementation status and the Phase 3 checklist.

---

## Core Rules

**Logic throws, handlers catch.** Implement pure, stateless logic in tool/resource `handler` functions. No `try...catch` in handlers. Throw `new McpError(code, message, data)` on failure. The framework's handler factory creates `Context`, measures execution, formats responses, and catches errors.

**Full-stack observability.** OpenTelemetry is preconfigured. Use `ctx.log` for request-scoped logging — `requestId`, `traceId`, and `tenantId` are auto-correlated. No direct `console` calls; use the logger.

**Structured, traceable operations.** Handler functions receive a unified `Context` (`ctx`) that provides logging (`ctx.log`), tenant-scoped storage (`ctx.state`), optional protocol capabilities (`ctx.elicit`, `ctx.sample`), and cancellation (`ctx.signal`).

**Decoupled storage.** Use `ctx.state` for tenant-scoped key-value storage in handlers. Never access persistence backends directly. `ctx.state` delegates to `StorageService` with automatic tenant scoping, built-in validation, and opaque cursor pagination.

**Local/edge runtime parity.** All features work with local transports (`stdio`/`http`) and Worker bundle. Guard non-portable deps using `runtimeCaps` from `@cyanheads/mcp-ts-core/utils/runtime`. Prefer runtime-agnostic abstractions (Hono + `@hono/mcp`, Fetch APIs).

**Elicitation for missing input.** Use `ctx.elicit` when the client supports it.

---

## Exports Reference

| Subpath | Key Exports | Purpose |
|:--------|:------------|:--------|
| `@cyanheads/mcp-ts-core` | `createApp`, `tool`, `resource`, `prompt`, `Context` | Main entry point |
| `@cyanheads/mcp-ts-core/worker` | `createWorkerHandler`, `CloudflareBindings` | Cloudflare Workers entry |
| `@cyanheads/mcp-ts-core/tools` | `ToolDefinition`, `AnyToolDefinition`, `ToolAnnotations` | Tool definition types |
| `@cyanheads/mcp-ts-core/resources` | `ResourceDefinition`, `AnyResourceDefinition` | Resource definition types |
| `@cyanheads/mcp-ts-core/prompts` | `PromptDefinition` | Prompt definition type |
| `@cyanheads/mcp-ts-core/tasks` | `TaskToolDefinition`, `RequestTaskStore` | Task tool escape hatch |
| `@cyanheads/mcp-ts-core/context` | `Context`, `ContextLogger`, `ContextState`, `ContextProgress` | Context types |
| `@cyanheads/mcp-ts-core/errors` | `McpError`, `JsonRpcErrorCode` | Error types and codes |
| `@cyanheads/mcp-ts-core/config` | `AppConfig`, `parseConfig` | Zod-validated config |
| `@cyanheads/mcp-ts-core/auth` | `checkScopes` | Dynamic scope checking |
| `@cyanheads/mcp-ts-core/storage` | `StorageService` | Storage abstraction |
| `@cyanheads/mcp-ts-core/storage/types` | `IStorageProvider` | Provider interface |
| `@cyanheads/mcp-ts-core/utils/logger` | `logger` | Global Pino logger |
| `@cyanheads/mcp-ts-core/utils/requestContext` | `requestContextService`, `RequestContext` | Request tracing |
| `@cyanheads/mcp-ts-core/utils/errorHandler` | `ErrorHandler` | `tryCatch` for services |
| `@cyanheads/mcp-ts-core/utils/formatting` | `markdown`, `MarkdownBuilder`, `diffFormatter`, `tableFormatter`, `treeFormatter` | Response formatters |
| `@cyanheads/mcp-ts-core/utils/parsing` | `yamlParser`, `csvParser`, `xmlParser`, `jsonParser`, `pdfParser`, `dateParser` | Content parsers (Tier 3) |
| `@cyanheads/mcp-ts-core/utils/security` | `sanitization`, `rateLimiter`, `idGenerator` | Security utilities (Tier 3) |
| `@cyanheads/mcp-ts-core/utils/network` | `fetchWithTimeout` | HTTP client with timeout/abort |
| `@cyanheads/mcp-ts-core/utils/pagination` | `extractCursor`, `paginateArray` | Opaque cursor pagination |
| `@cyanheads/mcp-ts-core/utils/runtime` | `runtimeCaps` | Runtime feature detection |
| `@cyanheads/mcp-ts-core/utils/scheduling` | `scheduler` | Cron scheduling (Tier 3) |
| `@cyanheads/mcp-ts-core/utils/types` | `isErrorWithCode`, `isRecord` | Type guard utilities |
| `@cyanheads/mcp-ts-core/testing` | `createMockContext` | Test helpers |

**Tier 3 deps** (parsers, security, scheduling) are optional peer dependencies. Install as needed (e.g., `bun add js-yaml` for `yamlParser`). All parse/sanitize methods are **async** (lazy-load deps at first call).

### Import conventions

Two import styles, self-documenting:

- `@cyanheads/mcp-ts-core/*` — framework (from `node_modules`)
- `@/` — server's own `src/` (via path alias)

```ts
// Framework
import { tool } from '@cyanheads/mcp-ts-core';
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';
import { markdown } from '@cyanheads/mcp-ts-core/utils/formatting';

// Server's own code
import { getMyService } from '@/services/my-domain/my-service.js';
```

Build configs exported for consumer extension:

```jsonc
// tsconfig.json
{ "extends": "@cyanheads/mcp-ts-core/tsconfig.base.json" }

// biome.json
{ "extends": ["@cyanheads/mcp-ts-core/biome.json"] }
```

```ts
// vitest.config.ts
import coreConfig from '@cyanheads/mcp-ts-core/vitest.config';
```

---

## Entry Points

### Node.js — `createApp(options)`

```ts
#!/usr/bin/env node
import { createApp } from '@cyanheads/mcp-ts-core';
import { allToolDefinitions } from './mcp-server/tools/index.js';
import { allResourceDefinitions } from './mcp-server/resources/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/index.js';

await createApp({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
});
```

### With server-specific services

```ts
import { createApp } from '@cyanheads/mcp-ts-core';
import { initMyService } from './services/my-domain/my-service.js';

await createApp({
  name: 'my-mcp-server',
  version: '0.1.0',
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
  setup(core) {
    initMyService(core.config, core.storage);
  },
});
```

### Cloudflare Workers — `createWorkerHandler(options)`

```ts
import { createWorkerHandler } from '@cyanheads/mcp-ts-core/worker';

export default createWorkerHandler({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
  setup(core) {
    initMyService(core.config, core.storage);
  },
  extraEnvBindings: [['MY_API_KEY', 'MY_API_KEY']],
});
```

### Interfaces

```ts
interface CreateAppOptions {
  /** Server name — overrides package.json and MCP_SERVER_NAME env var */
  name?: string;
  /** Server version — overrides package.json and MCP_SERVER_VERSION env var */
  version?: string;
  tools?: AnyToolDefinition[];
  resources?: AnyResourceDefinition[];
  prompts?: PromptDefinition[];
  /** Runs after core services are constructed, before transport starts. */
  setup?: (core: CoreServices) => void | Promise<void>;
}

interface ServerHandle {
  shutdown(signal?: string): Promise<void>;
  readonly services: CoreServices;
}

interface CoreServices {
  config: AppConfig;
  logger: Logger;
  storage: StorageService;
  rateLimiter: RateLimiter;
  llmProvider?: ILlmProvider;
  speechService?: SpeechService;
  supabase?: SupabaseClient;
}
```

**What `createApp()` does internally:**

1. Suppress ANSI colors for stdio/non-TTY
2. Parse config with `name`/`version` overrides
3. Construct core services (config -> storage -> rate limiter; conditional: supabase, LLM, speech)
4. Initialize logger
5. `await setup?.(coreServices)` — server-specific init
6. Construct registries from definition arrays
7. Construct TaskManager, server factory, TransportManager
8. Init OpenTelemetry, high-res timer
9. Register error/signal handlers
10. Start transport
11. Return `ServerHandle`

`setup()` runs before transport starts — services are fully initialized before the first request.

---

## Server Structure

What a consumer repo looks like. Infrastructure lives in `node_modules/@cyanheads/mcp-ts-core`.

```
src/
  index.ts                              # createApp() entry point
  worker.ts                             # createWorkerHandler() entry point (if using Workers)
  config/
    server-config.ts                    # Server-specific env vars (own Zod schema)
  services/
    [domain]/
      [domain]-service.ts               # Domain service (init/accessor pattern)
      types.ts                          # Domain types
  mcp-server/
    tools/
      definitions/
        [tool-name].tool.ts             # Tool definitions
        index.ts                        # allToolDefinitions barrel
    resources/
      definitions/
        [resource-name].resource.ts     # Resource definitions
        index.ts                        # allResourceDefinitions barrel
    prompts/
      definitions/
        [prompt-name].prompt.ts         # Prompt definitions
        index.ts                        # allPromptDefinitions barrel
package.json
tsconfig.json                           # extends @cyanheads/mcp-ts-core/tsconfig.base.json
vitest.config.ts                        # extends core's base config
biome.json                              # extends core's Biome config
CLAUDE.md                               # Server-specific agent protocol
```

**File suffix conventions:**

| Suffix | Meaning |
|:-------|:--------|
| `.tool.ts` | Tool (standard or task — `task` flag determines behavior) |
| `.resource.ts` | Resource |
| `.app-tool.ts` | UI-enabled tool (MCP Apps) |
| `.app-resource.ts` | UI resource linked to an app tool |
| `.prompt.ts` | Prompt template |

---

## Adding a Tool

```ts
import { z } from 'zod';
import { tool } from '@cyanheads/mcp-ts-core';
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';
import { markdown } from '@cyanheads/mcp-ts-core/utils/formatting';

export const myTool = tool('my_tool', {
  description: 'Does something useful.',
  annotations: { readOnlyHint: true },
  input: z.object({
    query: z.string().describe('Search query'),
  }),
  output: z.object({
    result: z.string().describe('Search result'),
  }),
  auth: ['tool:my_tool:read'],

  async handler(input, ctx) {
    ctx.log.info('Processing query', { query: input.query });
    // Pure logic — throw McpError on failure, no try/catch
    return { result: `Found: ${input.query}` };
  },

  format: (result) => [{ type: 'text', text: result.result }],
});
```

**Steps:**

1. Create `src/mcp-server/tools/definitions/[your-tool-name].tool.ts` (kebab-case)
2. Use `tool('snake_case_name', { ... })` with Zod `input` schema — all fields need `.describe()`
3. Implement `handler(input, ctx)` — pure, throws `McpError`, no try/catch
4. Add `auth` scopes if needed (inline property, not a wrapper)
5. Add `format` function if needed (defaults to JSON stringify)
6. Register in `allToolDefinitions` in `index.ts`
7. Run `bun run devcheck`
8. Smoke-test with `bun run dev:stdio` or `dev:http`

**`tool()` builder signature:**

```ts
function tool<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
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

### Task tools

Add `task: true` for long-running async operations. The framework manages the full task lifecycle — no manual `taskHandlers` needed.

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

With `task: true`, the framework:

1. Creates a task and returns the task ID immediately
2. Runs `handler` in the background with `ctx.progress` available
3. Returns task status on client poll
4. Stores result on completion, error on failure
5. Signals `ctx.signal` on cancellation

**Escape hatch:** For custom task lifecycle (multi-stage, streaming partial results), use raw `TaskToolDefinition` from `@cyanheads/mcp-ts-core/tasks`.

---

## Adding a Resource

```ts
import { z } from 'zod';
import { resource } from '@cyanheads/mcp-ts-core';

export const myResource = resource('myscheme://{itemId}/data', {
  description: 'Retrieve item data by ID.',
  mimeType: 'application/json',
  params: z.object({
    itemId: z.string().describe('Item identifier'),
  }),
  auth: ['item:read'],

  async handler(params, ctx) {
    ctx.log.debug('Fetching item', { itemId: params.itemId });
    return { id: params.itemId, status: 'active' };
  },

  list: async () => ({
    resources: [
      { uri: 'myscheme://all', name: 'All Items', mimeType: 'application/json' },
    ],
  }),
});
```

**Handler receives `(params, ctx)`** — not `(uri, params, context)`. URI available on `ctx.uri` if needed.

**Pagination:** Resources returning large lists must use `extractCursor`/`paginateArray` from `@cyanheads/mcp-ts-core/utils/pagination`. Cursors are opaque; invalid cursors throw `JsonRpcErrorCode.InvalidParams` (-32602). Include `nextCursor` only when more results exist.

---

## Adding a Prompt

```ts
import { z } from 'zod';
import { prompt } from '@cyanheads/mcp-ts-core';

export const codeReview = prompt('code_review', {
  description: 'Review code for security and best practices.',
  args: z.object({
    code: z.string().describe('Code to review'),
    language: z.string().optional().describe('Programming language'),
  }),
  generate: (args) => [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `Review this ${args.language ?? ''} code:\n${args.code}`,
      },
    },
  ],
});
```

Prompts are pure message templates — no `Context`, no auth, no side effects.

---

## Adding a Service

Services use the init/accessor pattern — initialized in `setup()`, accessed at request time via lazy accessor.

```ts
// src/services/my-domain/my-service.ts
import type { AppConfig } from '@cyanheads/mcp-ts-core/config';
import type { StorageService } from '@cyanheads/mcp-ts-core/storage';
import type { Context } from '@cyanheads/mcp-ts-core';
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

export class MyService {
  constructor(
    private readonly config: AppConfig,
    private readonly storage: StorageService,
  ) {}

  async doWork(input: string, ctx: Context): Promise<string> {
    ctx.log.debug('Working', { input });
    return `done: ${input}`;
  }
}

// --- Init/accessor pattern ---

let _service: MyService | undefined;

export function initMyService(config: AppConfig, storage: StorageService): void {
  _service = new MyService(config, storage);
}

export function getMyService(): MyService {
  if (!_service) {
    throw new McpError(JsonRpcErrorCode.InitializationFailed, 'MyService not initialized');
  }
  return _service;
}
```

**Usage in tool handlers:**

```ts
import { getMyService } from '@/services/my-domain/my-service.js';

handler: async (input, ctx) => {
  return getMyService().doWork(input.query, ctx);
},
```

Service methods receive `Context` for correlated logging (`ctx.log`) and tenant-scoped storage (`ctx.state`). Convention: `ctx.elicit` and `ctx.sample` should only be called from tool handlers, not from services.

---

## Context

The unified object every tool and resource handler receives. Replaces the split `appContext` + `sdkContext` pattern.

```ts
interface Context {
  // Identity & tracing
  readonly requestId: string;
  readonly timestamp: string;
  readonly tenantId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly auth?: AuthContext;

  // Structured logging — auto-includes requestId, traceId, tenantId
  readonly log: ContextLogger;

  // Tenant-scoped key-value storage
  readonly state: ContextState;

  // Optional protocol capabilities (undefined when client doesn't support them)
  readonly elicit?: (message: string, schema: z.ZodObject<any>) => Promise<ElicitResult>;
  readonly sample?: (messages: SamplingMessage[], opts?: SamplingOpts) => Promise<SamplingResult>;

  // Cancellation
  readonly signal: AbortSignal;

  // Task progress (present when task: true)
  readonly progress?: ContextProgress;

  // Raw URI (present for resource handlers)
  readonly uri?: URL;
}
```

### `ctx.log`

Auto-correlated to the current request. No imports, no manual spreading.

```ts
ctx.log.info('Processing query', { query: input.query });
ctx.log.error('Failed to fetch', error, { url });
```

Methods: `debug`, `info`, `notice`, `warning`, `error`.

The global `logger` (from `@cyanheads/mcp-ts-core/utils/logger`) still exists for non-request contexts — startup, shutdown, background services. Use `ctx.log` inside handlers; use `core.logger` in `setup()`.

### `ctx.state`

Tenant-scoped key-value storage. Delegates to `StorageService` with the request's `tenantId`.

```ts
await ctx.state.set('item:123', JSON.stringify(data));
const value = await ctx.state.get('item:123');
await ctx.state.delete('item:123');
const page = await ctx.state.list('item:', { cursor, limit: 20 });
```

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

Throws `McpError(InvalidRequest)` if `tenantId` is missing. Stdio mode defaults `tenantId` to `'default'` so `ctx.state` works without auth.

**Workers persistence:** With `in-memory` provider in Workers, data is lost between cold starts. Use `cloudflare-kv`, `cloudflare-r2`, or `cloudflare-d1` for persistent storage.

### `ctx.elicit` / `ctx.sample`

Optional protocol capabilities. Check for presence before calling — no type guards needed.

```ts
// Elicitation — ask the human user for input
if (ctx.elicit) {
  const result = await ctx.elicit('What format?', z.object({
    format: z.enum(['json', 'csv']).describe('Output format'),
  }));
  if (result.action === 'accept') useFormat(result.data.format);
}

// Sampling — request LLM completion from the client
if (ctx.sample) {
  const result = await ctx.sample([
    { role: 'user', content: { type: 'text', text: `Summarize: ${data}` } },
  ], { maxTokens: 500 });
}
```

### `ctx.progress`

Present when `task: true`. Methods: `setTotal(n)`, `increment(amount?)`, `update(message)`.

---

## Error Handling

```ts
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

throw new McpError(JsonRpcErrorCode.InvalidParams, 'Missing required field: name', {
  requestId: ctx.requestId,
  field: 'name',
});
```

### Error Codes

| Code | Value | When to Use |
|:-----|------:|:------------|
| `InvalidParams` | -32602 | Bad input, missing required fields, schema validation failure |
| `InvalidRequest` | -32600 | Unsupported operation, missing client capability |
| `NotFound` | -32001 | Resource, entity, or record doesn't exist |
| `Forbidden` | -32005 | Authenticated but insufficient scopes/permissions |
| `Unauthorized` | -32006 | No auth, invalid token, expired credentials |
| `RateLimited` | -32003 | Rate limit exceeded |
| `ServiceUnavailable` | -32000 | External dependency down, upstream failure |
| `Timeout` | -32004 | Operation exceeded time limit |
| `ConfigurationError` | -32008 | Missing env var, invalid config |
| `ValidationError` | -32007 | Business rule violation (not schema — use `InvalidParams` for that) |
| `Conflict` | -32002 | Duplicate key, version mismatch, concurrent modification |
| `InitializationFailed` | -32009 | Server/component startup failure |
| `DatabaseError` | -32010 | Storage/persistence layer failure |
| `InternalError` | -32603 | Unexpected failure, catch-all for programmer errors |

### Where Errors Are Handled

| Layer | Pattern |
|:------|:--------|
| Tool/resource handlers | Throw `McpError` — no try/catch |
| Handler factory | Catches all errors, normalizes to `McpError`, sets `isError: true` |
| Services/setup code | `ErrorHandler.tryCatch` for graceful recovery |

---

## Auth

### Inline auth (primary pattern)

```ts
const myTool = tool('my_tool', {
  auth: ['tool:my_tool:read'],
  async handler(input, ctx) { ... },
});
```

The handler factory checks `ctx.auth.scopes` against required scopes before calling `handler`. If auth is disabled (`MCP_AUTH_MODE=none`), defaults are allowed.

### Dynamic auth

```ts
import { checkScopes } from '@cyanheads/mcp-ts-core/auth';

handler: async (input, ctx) => {
  checkScopes(ctx, [`team:${input.teamId}:write`]);
  // ...
},
```

### Auth modes

`MCP_AUTH_MODE` = `none` | `jwt` | `oauth`

- **JWT:** local secret (`MCP_AUTH_SECRET_KEY`), dev bypasses if missing
- **OAuth:** JWKS verification (`OAUTH_ISSUER_URL`, `OAUTH_AUDIENCE`, opt `OAUTH_JWKS_URI`)
- **Claims:** `clientId` (cid/client_id), `scopes` (scp/scope), `sub`, `tenantId` (tid)

**Endpoints:**

- Unprotected: `/healthz`, `GET /mcp`
- Protected (when auth enabled): `POST /mcp`, `OPTIONS /mcp`
- CORS: `MCP_ALLOWED_ORIGINS` or `*`

**Stdio mode:** No HTTP auth. Host handles authorization.

---

## Configuration

### Core config

Managed by `@cyanheads/mcp-ts-core`. Validated via Zod from environment variables. `name`/`version` overrides in `createApp()` take precedence over env vars, which take precedence over `package.json`.

| Category | Key Variables |
|:---------|:-------------|
| Transport | `MCP_TRANSPORT_TYPE` (`stdio`\|`http`), `MCP_HTTP_PORT`, `MCP_HTTP_HOST`, `MCP_HTTP_ENDPOINT_PATH` |
| Auth | `MCP_AUTH_MODE` (`none`\|`jwt`\|`oauth`), `MCP_AUTH_SECRET_KEY`, `OAUTH_*` |
| Storage | `STORAGE_PROVIDER_TYPE` (`in-memory`\|`filesystem`\|`supabase`\|`cloudflare-r2`\|`cloudflare-kv`\|`cloudflare-d1`) |
| LLM | `OPENROUTER_API_KEY`, `OPENROUTER_APP_URL/NAME`, `LLM_DEFAULT_*` |
| Telemetry | `OTEL_ENABLED`, `OTEL_SERVICE_NAME/VERSION`, `OTEL_EXPORTER_OTLP_*` |

### Server config (separate schema)

Servers define their own Zod schema for domain-specific env vars. **Never merge with core's schema.**

```ts
// src/config/server-config.ts
import { z } from 'zod';

const ServerConfigSchema = z.object({
  myApiKey: z.string().describe('External API key'),
  maxResults: z.coerce.number().default(100),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

let _config: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  _config ??= ServerConfigSchema.parse({
    myApiKey: process.env.MY_API_KEY,
    maxResults: process.env.MY_MAX_RESULTS,
  });
  return _config;
}
```

**Warning:** Do not eagerly parse `process.env` at module top-level. In Workers, env bindings are injected at request time via `injectEnvVars()` — after all static imports. Lazy parsing is mandatory for Worker compatibility.

---

## Testing

```ts
import { describe, expect, it, vi } from 'vitest';
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
import { McpError } from '@cyanheads/mcp-ts-core/errors';
import { myTool } from '@/mcp-server/tools/definitions/my-tool.tool.js';

describe('myTool', () => {
  it('returns expected output', async () => {
    const ctx = createMockContext();
    const input = myTool.input.parse({ query: 'hello' });
    const result = await myTool.handler(input, ctx);
    expect(result.result).toBe('Found: hello');
  });

  it('throws McpError on invalid state', async () => {
    const ctx = createMockContext();
    const input = myTool.input.parse({ query: 'TRIGGER_ERROR' });
    await expect(myTool.handler(input, ctx)).rejects.toThrow(McpError);
  });

  it('formats response correctly', () => {
    const result = { result: 'test' };
    const blocks = myTool.format!(result);
    expect(blocks[0].type).toBe('text');
  });
});
```

### `createMockContext` options

```ts
createMockContext()                                          // minimal
createMockContext({ tenantId: 'test-tenant' })               // enables ctx.state
createMockContext({ sample: vi.fn().mockResolvedValue(...) }) // with sampling
createMockContext({ elicit: vi.fn().mockResolvedValue(...) }) // with elicitation
createMockContext({ progress: true })                        // with task progress
```

### Vitest config

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import coreConfig from '@cyanheads/mcp-ts-core/vitest.config';

export default defineConfig({
  ...coreConfig,
  resolve: {
    alias: { '@/': new URL('./src/', import.meta.url).pathname },
  },
});
```

### Test isolation

Construct dependencies in `beforeEach`. Re-init services with `initMyService()` per test suite. Vitest runs files in separate workers — parallel test files are safe.

---

## Response Formatters

The `format` function on a tool/resource definition maps output to `ContentBlock[]`. If omitted, the handler factory JSON-stringifies the output.

```ts
// Simple text
format: (result) => [{ type: 'text', text: result.message }],

// MarkdownBuilder
import { markdown } from '@cyanheads/mcp-ts-core/utils/formatting';
format: (result) => {
  const md = markdown()
    .text(`# ${result.title}\n`)
    .text(result.body);
  md.when(!!result.footer, () => { md.text(`\n---\n${result.footer}`); });
  return [{ type: 'text', text: md.build() }];
},

// Image
format: (result) => [{ type: 'image', data: result.data, mimeType: result.mimeType }],
```

Additional formatters: `diffFormatter` (**async** methods), `tableFormatter`, `treeFormatter` from `@cyanheads/mcp-ts-core/utils/formatting`.

---

## Agent Skills

Detailed guides, templates, and API references live in `skills/`. Read the relevant skill file before starting a task it covers.

| Skill | Path | Purpose |
|:------|:-----|:--------|
| `add-tool` | `skills/add-tool/SKILL.md` | Scaffold a new MCP tool definition |
| `add-resource` | `skills/add-resource/SKILL.md` | Scaffold a new MCP resource definition |
| `add-prompt` | `skills/add-prompt/SKILL.md` | Scaffold a new MCP prompt definition |
| `add-service` | `skills/add-service/SKILL.md` | Scaffold a new domain service (init/accessor pattern) |
| `add-provider` | `skills/add-provider/SKILL.md` | Add a new provider implementation |
| `add-export` | `skills/add-export/SKILL.md` | Add a new subpath export to the package |
| `setup` | `skills/setup/SKILL.md` | Initialize a new consumer server from the template |
| `devcheck` | `skills/devcheck/SKILL.md` | Run lint, format, typecheck, security checks |
| `release` | `skills/release/SKILL.md` | Version bump, changelog, publish workflow |
| `maintenance` | `skills/maintenance/SKILL.md` | Dependency updates, housekeeping tasks |
| `migrate-imports` | `skills/migrate-imports/SKILL.md` | Migrate import paths after package rename |
| `api-utils` | `skills/api-utils/SKILL.md` | API reference: formatting, parsing, security, network, pagination, runtime, scheduling, types, logger, requestContext, errorHandler, telemetry |
| `api-services` | `skills/api-services/SKILL.md` | API reference: LLM (OpenRouter), Speech (ElevenLabs TTS, Whisper STT), Graph (CRUD, traversal, pathfinding) |

---

## Cloudflare Workers

### `createWorkerHandler(options)`

```ts
import { createWorkerHandler } from '@cyanheads/mcp-ts-core/worker';

export default createWorkerHandler({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
  setup(core) { initMyService(core.config, core.storage); },
  extraEnvBindings: [['MY_API_KEY', 'MY_API_KEY']],
  extraObjectBindings: [['MY_CUSTOM_KV', 'MY_CUSTOM_KV']],
  onScheduled: async (controller, env, ctx) => { /* cron handler */ },
});
```

**Key design points:**

- Per-request `McpServer` — factory pattern (security: SDK GHSA-345p-7cg4-v4c7)
- Env bindings refreshed per-request (CF may rotate binding references)
- `ctx.waitUntil()` used for telemetry flush (OTEL + log drain)
- Singleton app promise with retry-on-failure

### Binding types

| Type | Examples | Injection | Access |
|:-----|:---------|:----------|:-------|
| String values | API keys, URLs | `process.env` via `injectEnvVars()` | `process.env.MY_API_KEY` |
| Object bindings | KV, R2, D1, AI | `globalThis` via `storeBindings()` | `(globalThis as any).MY_CUSTOM_KV` |

`extraEnvBindings` maps `[bindingKey, processEnvKey]`. `extraObjectBindings` maps `[bindingKey, globalKey]`.

### `CloudflareBindings` extensibility

Core defines `CloudflareBindings` without an index signature. Servers declare extras via intersection:

```ts
import type { CloudflareBindings as CoreBindings } from '@cyanheads/mcp-ts-core/worker';

interface MyBindings extends CoreBindings {
  MY_CUSTOM_KV: KVNamespace;
}
```

### Runtime compatibility

| Guard | Purpose |
|:------|:--------|
| `runtimeCaps` (`@cyanheads/mcp-ts-core/utils/runtime`) | Feature detection: `isNode`, `isWorkerLike`, `hasBuffer` |
| Serverless whitelist | Only `in-memory`, `cloudflare-r2`, `cloudflare-kv`, `cloudflare-d1` in Workers |

**Config:** `wrangler.toml` requires `compatibility_flags = ["nodejs_compat"]` and `compatibility_date >= "2025-09-01"`.

---

## Multi-Tenancy

`ctx.state` is tenant-scoped. The `tenantId` comes from:

- **HTTP with auth:** JWT `'tid'` claim, auto-propagated
- **Stdio:** Defaults to `'default'` (single-tenant)

**Tenant ID validation:** max 128 chars, alphanumeric/hyphens/underscores/dots only, start/end alphanumeric, no path traversal (`../`), no consecutive dots.

---

## Code Style

- **Validation:** Zod schemas, all fields need `.describe()`
- **Logging:** `ctx.log` in handlers, global `logger` for lifecycle/background
- **Errors:** handlers throw `McpError`, framework catches. `ErrorHandler.tryCatch` for services only.
- **Secrets:** server config only — no hardcoded credentials
- **Naming:** kebab-case files, snake_case tool/resource/prompt names, correct suffix
- **JSDoc:** `@fileoverview` + `@module` required on every file
- **No fabricated signal:** Don't invent synthetic scores, composite metrics, or calculated "confidence percentages" from arbitrary weights. Surface real signal: actual API scores, direct measurements, factual orderings with interpretable criteria.

---

## Git Safety

**NEVER use `git stash`.** Not in the orchestrator, not in subagents, not for "quick checks", not for any reason. `git stash` silently moves uncommitted work out of the working tree and risks data loss. Use `git show`, `git diff`, worktrees, or read-only commands instead.

**NEVER use destructive git commands** (`git reset --hard`, `git checkout -- .`, `git restore .`, `git clean -f`) unless the user explicitly requests them.

**Read-only git is always safe.** `git status`, `git diff`, `git log`, `git show`, `git blame`.

---

## Git Commits

Use plain strings for commit messages. Never use heredoc syntax (`cat <<'EOF'`) or command substitution (`$(...)`) in commit messages.

**Correct:**

```bash
git commit -m "feat(auth): add JWT validation middleware

- Implemented token verification with exp claim validation
- Added support for RS256 and HS256 algorithms
- Includes comprehensive error handling"
```

**Wrong:**

```bash
# Do not use cat/heredoc/command substitution
git commit -m "$(cat <<'EOF'
feat(auth): add JWT validation
EOF
)"
```

**Format:** [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use |
|:-------|:----|
| `feat(scope):` | New feature |
| `fix(scope):` | Bug fix |
| `refactor(scope):` | Code refactoring |
| `chore(scope):` | Maintenance (deps, config) |
| `docs(scope):` | Documentation |
| `test(scope):` | Test additions/updates |
| `build(scope):` | Build system or dependency changes |

Group related changes into atomic commits.

---

## Commands

| Command | Purpose |
|:--------|:--------|
| `bun run build` | Build library output (`tsc && tsc-alias`) |
| `bun run devcheck` | **Use often.** Lint, format, typecheck, security |
| `bun run test` | Unit/integration tests |
| `bun run dev:stdio` | Development mode (stdio) |
| `bun run dev:http` | Development mode (HTTP) |
| `bun run build:worker` | Cloudflare Worker bundle |
| `bun run start:stdio` | Production mode (stdio, after build) |
| `bun run start:http` | Production mode (HTTP, after build) |

---

## Publishing

After a version bump and final commit:

```bash
bun publish --access public

docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/cyanheads/mcp-ts-core:<version> \
  -t ghcr.io/cyanheads/mcp-ts-core:latest \
  --push .

mcp-publisher publish
```

Remind the user to run these after completing a release flow.

---

## Code Navigation

**LSP tools are deferred — you must load them before use.** Run `ToolSearch` with query `"select:LSP"` at the start of any task involving code navigation, refactoring, or understanding type relationships. Do this **before** reaching for Grep/Glob.

**Workflow: discover with Grep/Glob, understand with LSP.**

| Task | LSP Action |
|:-----|:-----------|
| Find where a symbol is defined | `goToDefinition` |
| Find all usages of a symbol | `findReferences` |
| Understand a symbol's type | `hover` |
| Map a file's exports/structure | `documentSymbol` |
| Find implementations of an interface | `goToImplementation` |
| Trace call chains | `incomingCalls` / `outgoingCalls` |

**When to use which:**

- **Grep/Glob:** File discovery, text patterns, non-code files, regex searches.
- **LSP:** Symbol identity, type information, code structure, refactoring scope, tracing callers/callees.

---

## Subagent Rules

**Default: do the work yourself.** Only spawn agents when ALL of these are true:

1. Work spans 3+ files with clearly independent, non-overlapping scopes
2. You can write a precise, self-contained prompt for each agent
3. Parallelism provides genuine value

If any condition isn't met, do it yourself.

**When agents are used:**

- **Model selection.** Always use `model: "opus"` (preferred) or `model: "sonnet"`. Never `haiku`.
- **Always run in background.** Use `run_in_background: true`. Batch all Agent calls into a single response.
- **Scope containment.** Each agent gets non-overlapping file scope. Two agents editing the same file will race.
- **Summarize results.** Agent output is not visible to the user. The orchestrator must report findings.
- **No git commands** that modify state. Read-only (`status`, `diff`, `log`) only.

**Required preamble for every agent prompt:**

> CRITICAL: Do NOT run any git commands that modify state. No commits, stashes, resets, checkouts, or clean. Git is handled by the orchestrator. Read-only commands (status, diff, log, show) are acceptable.

---

## Checklist

- [ ] `tool()` / `resource()` / `prompt()` builders with correct field names (`handler`, `input`, `output`, `format`, `auth`, `args`)
- [ ] Zod schemas: all fields have `.describe()`
- [ ] JSDoc `@fileoverview` + `@module` on every new/modified file
- [ ] Auth declared via `auth: ['scope']` on definitions (not HOF wrapper)
- [ ] `ctx.log` for logging, `ctx.state` for storage
- [ ] `ctx.elicit` / `ctx.sample` checked for presence before use
- [ ] Naming: kebab-case files, snake_case names, `.tool.ts` / `.resource.ts` / `.prompt.ts` suffixes
- [ ] Task tools use `task: true` flag (not separate `TaskToolDefinition`)
- [ ] Resources with large lists: pagination via `extractCursor` / `paginateArray`
- [ ] Secrets only in server config — no hardcoded credentials
- [ ] Registered in `definitions/index.ts` barrel
- [ ] Tests added/updated — `createMockContext()`, `.handler()` tested directly
- [ ] **`bun run devcheck` passes**
- [ ] Smoke-tested with `dev:stdio` / `dev:http`
- [ ] Worker bundle validated (`build:worker`)
