# Agent Protocol

**Package:** `@cyanheads/mcp-ts-core` · **Version:** 0.1.0-beta.22
**npm:** [@cyanheads/mcp-ts-core](https://www.npmjs.com/package/@cyanheads/mcp-ts-core) · **Docker:** [ghcr.io/cyanheads/mcp-ts-core](https://ghcr.io/cyanheads/mcp-ts-core)

> **Developer note:** Never assume. Read related files and docs before making changes. Read full file content for context. Never edit a file before reading it.

> **Extraction status:** Phases 1–4 complete (foundation, builders, skills, templates, examples, tests). Phase 5 (publish `@cyanheads/mcp-ts-core@0.1.0`) not started. See `core-extraction/` for details.

---

## Core Rules

- **Logic throws, framework catches.** Pure, stateless `handler` functions. No `try...catch`. Throw on failure — plain `Error` is fine; the framework catches, classifies, and formats. Use `McpError(code, message, data)` only when you need a specific JSON-RPC error code or structured data payload.
- **Full-stack observability.** OpenTelemetry preconfigured. Use `ctx.log` for request-scoped logging — `requestId`, `traceId`, `tenantId` auto-correlated. No `console` calls.
- **Unified Context.** Handlers receive `ctx` with logging (`ctx.log`), tenant-scoped storage (`ctx.state`), optional protocol capabilities (`ctx.elicit`, `ctx.sample`), and cancellation (`ctx.signal`).
- **Decoupled storage.** `ctx.state` for tenant-scoped KV. Never access persistence backends directly.
- **Runtime parity.** All features work with `stdio`/`http` and Worker bundle. Guard non-portable deps via `runtimeCaps`. Prefer runtime-agnostic abstractions (Hono + `@hono/mcp`, Fetch APIs).
- **Elicitation for missing input.** Use `ctx.elicit` when the client supports it.

---

## Exports Reference

| Subpath | Key Exports | Purpose |
|:--------|:------------|:--------|
| `@cyanheads/mcp-ts-core` | `createApp`, `tool`, `resource`, `prompt`, `Context`, `z` | Main entry point |
| `/worker` | `createWorkerHandler`, `CloudflareBindings` | Cloudflare Workers entry |
| `/tools` | `ToolDefinition`, `AnyToolDefinition`, `ToolAnnotations` | Tool definition types |
| `/resources` | `ResourceDefinition`, `AnyResourceDefinition` | Resource definition types |
| `/prompts` | `PromptDefinition` | Prompt definition type |
| `/tasks` | `TaskToolDefinition`, `isTaskToolDefinition` | Task tool escape hatch |
| `/errors` | `McpError`, `JsonRpcErrorCode` | Error types and codes |
| `/config` | `AppConfig`, `parseConfig`, `FRAMEWORK_NAME`, `FRAMEWORK_VERSION` | Zod-validated config, framework identity |
| `/auth` | `checkScopes` | Dynamic scope checking |
| `/storage` | `StorageService` | Storage abstraction |
| `/storage/types` | `IStorageProvider` | Provider interface |
| `/utils` | formatting, encoding, network, pagination, logging, runtime, telemetry, token counting, parsers†, security†, scheduling† | All utilities (†Tier 3: optional peer deps, async) |
| `/services` | `OpenRouterProvider`, `SpeechService`, `createSpeechProvider`, `ElevenLabsProvider`, `WhisperProvider`, `GraphService`, provider interfaces and types | LLM, Speech (TTS/STT), Graph services |
| `/testing` | `createMockContext` | Test helpers |

All subpaths prefixed with `@cyanheads/mcp-ts-core`. **Tier 3 deps** (parsers, security, scheduling) are optional peer dependencies — install as needed. All Tier 3 methods are **async** (lazy-load deps at first call).

### Import conventions

```ts
// Framework (from node_modules) — z is re-exported, no separate zod import needed
import { tool, z } from '@cyanheads/mcp-ts-core';
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

// Server's own code (via path alias)
import { getMyService } from '@/services/my-domain/my-service.js';
```

Build configs exported for consumer extension: `tsconfig.json` extends `@cyanheads/mcp-ts-core/tsconfig.base.json`, `biome.json` extends `@cyanheads/mcp-ts-core/biome.json`, `vitest.config.ts` spreads from `@cyanheads/mcp-ts-core/vitest.config`.

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
  name: 'my-mcp-server',           // overrides package.json / MCP_SERVER_NAME
  version: '0.1.0',                // overrides package.json / MCP_SERVER_VERSION
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
  setup(core) {                     // runs after core services init, before transport starts
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
  setup(core) { initMyService(core.config, core.storage); },
  extraEnvBindings: [['MY_API_KEY', 'MY_API_KEY']],       // string values → process.env
  extraObjectBindings: [['MY_CUSTOM_KV', 'MY_CUSTOM_KV']], // KV/R2/D1 → globalThis
  onScheduled: async (controller, env, ctx) => { /* cron */ },
});
```

Key design: per-request `McpServer` factory (security: SDK GHSA-345p-7cg4-v4c7), env bindings refreshed per-request. OTEL `NodeSDK` unavailable in Workers — no telemetry flush needed. Requires `compatibility_flags = ["nodejs_compat"]` and `compatibility_date >= "2025-09-01"` in `wrangler.toml` (unlocks `node:fs`, `node:http` server, `process.env`). Only `in-memory`, `cloudflare-r2`, `cloudflare-kv`, `cloudflare-d1` storage providers in Workers.

### Interfaces

`createApp()` returns `Promise<ServerHandle>`. `createWorkerHandler()` returns an `ExportedHandler`.

```ts
interface CreateAppOptions {
  name?: string;
  version?: string;
  tools?: AnyToolDefinition[];
  resources?: AnyResourceDefinition[];
  prompts?: PromptDefinition[];
  setup?: (core: CoreServices) => void | Promise<void>;
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

interface ServerHandle {
  shutdown(signal?: string): Promise<void>;
  readonly services: CoreServices;
}
```

---

## Server Structure

```
src/
  index.ts                              # createApp() entry point
  worker.ts                             # createWorkerHandler() (if using Workers)
  config/
    server-config.ts                    # Server-specific env vars (own Zod schema)
  services/
    [domain]/
      [domain]-service.ts               # Domain service (init/accessor pattern)
      types.ts                          # Domain types
  mcp-server/
    tools/definitions/
      [tool-name].tool.ts               # Tool definitions
      index.ts                          # allToolDefinitions barrel
    resources/definitions/
      [resource-name].resource.ts       # Resource definitions
      index.ts                          # allResourceDefinitions barrel
    prompts/definitions/
      [prompt-name].prompt.ts           # Prompt definitions
      index.ts                          # allPromptDefinitions barrel
```

**File suffixes:** `.tool.ts` (standard or task), `.resource.ts`, `.prompt.ts`, `.app-tool.ts` (UI-enabled), `.app-resource.ts` (UI resource linked to app tool).

---

## Adding a Tool

```ts
import { tool, z } from '@cyanheads/mcp-ts-core';

export const myTool = tool('my_tool', {
  description: 'Does something useful.',
  annotations: { readOnlyHint: true },
  input: z.object({ query: z.string().describe('Search query') }),
  output: z.object({ result: z.string().describe('Search result') }),
  auth: ['tool:my_tool:read'],

  async handler(input, ctx) {
    ctx.log.info('Processing query', { query: input.query });
    return { result: `Found: ${input.query}` };
  },

  format: (result) => [{ type: 'text', text: result.result }],
});
```

**Steps:** Create `src/mcp-server/tools/definitions/[name].tool.ts` (kebab-case) → use `tool('snake_case', {...})` with Zod `.describe()` on all fields → implement `handler(input, ctx)` (pure, throws on failure) → add `auth`/`format` if needed → register in `definitions/index.ts` → `bun run devcheck` → smoke-test with `dev:stdio`/`dev:http`.

**`format`**: Maps output to `ContentBlock[]`. Omit for JSON stringify default. Additional formatters: `markdown()` (builder), `diffFormatter` (async), `tableFormatter`, `treeFormatter` from `/utils`.

### Task tools

Add `task: true` for long-running async operations. The framework manages the full lifecycle.

```ts
const asyncCountdown = tool('async_countdown', {
  description: 'Count down with progress updates.',
  task: true,
  input: z.object({
    count: z.number().int().positive().describe('Count down from'),
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

With `task: true`: creates task → returns task ID immediately → runs handler in background with `ctx.progress` → returns status on poll → stores result/error → signals `ctx.signal` on cancellation. **Escape hatch:** `TaskToolDefinition` from `/tasks` for custom lifecycle.

---

## Adding a Resource

```ts
import { resource, z } from '@cyanheads/mcp-ts-core';

export const myResource = resource('myscheme://{itemId}/data', {
  description: 'Retrieve item data by ID.',
  mimeType: 'application/json',
  params: z.object({ itemId: z.string().describe('Item identifier') }),
  auth: ['item:read'],
  async handler(params, ctx) {
    return { id: params.itemId, status: 'active' };
  },
  list: async () => ({
    resources: [{ uri: 'myscheme://all', name: 'All Items', mimeType: 'application/json' }],
  }),
});
```

Handler receives `(params, ctx)` — URI on `ctx.uri` if needed. Large lists must use `extractCursor`/`paginateArray` from `/utils`. Opaque cursors; invalid → `InvalidParams` (-32602).

---

## Adding a Prompt

```ts
import { prompt, z } from '@cyanheads/mcp-ts-core';

export const codeReview = prompt('code_review', {
  description: 'Review code for security and best practices.',
  args: z.object({
    code: z.string().describe('Code to review'),
    language: z.string().optional().describe('Programming language'),
  }),
  generate: (args) => [
    { role: 'user', content: { type: 'text', text: `Review this ${args.language ?? ''} code:\n${args.code}` } },
  ],
});
```

Prompts are pure message templates — no `Context`, no auth, no side effects.

---

## Adding a Service

Init/accessor pattern — initialized in `setup()`, accessed at request time.

```ts
// src/services/my-domain/my-service.ts
import type { AppConfig } from '@cyanheads/mcp-ts-core/config';
import type { StorageService } from '@cyanheads/mcp-ts-core/storage';
import type { Context } from '@cyanheads/mcp-ts-core';

export class MyService {
  constructor(private readonly config: AppConfig, private readonly storage: StorageService) {}
  async doWork(input: string, ctx: Context): Promise<string> {
    ctx.log.debug('Working', { input });
    return `done: ${input}`;
  }
}

let _service: MyService | undefined;
export function initMyService(config: AppConfig, storage: StorageService): void {
  _service = new MyService(config, storage);
}
export function getMyService(): MyService {
  if (!_service) throw new Error('MyService not initialized — call initMyService() in setup()');
  return _service;
}
```

Usage: `getMyService().doWork(input.query, ctx)`. Service methods receive `Context` for correlated logging and tenant-scoped storage. Convention: `ctx.elicit`/`ctx.sample` only from tool handlers, not services.

---

## Context

```ts
interface Context {
  readonly requestId: string;
  readonly timestamp: string;
  readonly tenantId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly auth?: AuthContext;
  readonly log: ContextLogger;                // auto-correlated: requestId, traceId, tenantId
  readonly state: ContextState;               // tenant-scoped KV storage
  readonly elicit?: (message: string, schema: z.ZodObject<any>) => Promise<ElicitResult>;
  readonly sample?: (messages: SamplingMessage[], opts?: SamplingOpts) => Promise<CreateMessageResult>;
  readonly signal: AbortSignal;               // cancellation
  readonly progress?: ContextProgress;        // present when task: true
  readonly uri?: URL;                         // present for resource handlers
}
```

### `ctx.log`

Methods: `debug`, `info`, `notice`, `warning`, `error`. Use `ctx.log` in handlers; global `logger` for startup/shutdown/background.

### `ctx.state`

```ts
await ctx.state.set('item:123', JSON.stringify(data));          // void
await ctx.state.set('item:123', JSON.stringify(data), { ttl: 3600 }); // with TTL (seconds)
const value = await ctx.state.get('item:123');                   // string | null
await ctx.state.delete('item:123');
const page = await ctx.state.list('item:', { cursor, limit: 20 }); // { items, cursor? }
```

Throws `McpError(InvalidRequest)` if `tenantId` missing. Stdio defaults to `'default'`. Workers with `in-memory` lose data between cold starts — use `cloudflare-kv`/`cloudflare-r2`/`cloudflare-d1` for persistence.

**Tenant ID** comes from JWT `'tid'` claim (HTTP) or `'default'` (stdio). Validation: max 128 chars, alphanumeric/hyphens/underscores/dots, start/end alphanumeric, no `../`, no consecutive dots.

### `ctx.elicit` / `ctx.sample`

Check for presence before calling:

```ts
if (ctx.elicit) {
  const result = await ctx.elicit('What format?', z.object({
    format: z.enum(['json', 'csv']).describe('Output format'),
  }));
  if (result.action === 'accept') useFormat(result.data.format);
}
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

**Default: just throw.** The framework catches all errors from handlers, classifies them by type/message, and returns `isError: true` with an appropriate JSON-RPC error code. Plain `Error`, `ZodError`, and any other thrown value are handled automatically.

```ts
// Simple — framework classifies automatically
throw new Error('Thing not found');

// Zod .parse() failures are caught and mapped to ValidationError
const data = MySchema.parse(rawData);
```

**Opt-in precision:** Import `McpError` from `@cyanheads/mcp-ts-core/errors` only when you need a specific error code or structured data payload:

```ts
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

throw new McpError(JsonRpcErrorCode.InvalidParams, 'Missing required field: name', {
  field: 'name',
});
```

| Code | Value | When to Use |
|:-----|------:|:------------|
| `InvalidParams` | -32602 | Bad input, missing fields, schema validation |
| `InvalidRequest` | -32600 | Unsupported operation, missing client capability |
| `NotFound` | -32001 | Resource/entity doesn't exist |
| `Forbidden` | -32005 | Authenticated but insufficient scopes |
| `Unauthorized` | -32006 | No auth, invalid/expired token |
| `RateLimited` | -32003 | Rate limit exceeded |
| `ServiceUnavailable` | -32000 | External dependency down |
| `Timeout` | -32004 | Operation exceeded time limit |
| `ConfigurationError` | -32008 | Missing env var, invalid config |
| `ValidationError` | -32007 | Business rule violation (not schema) |
| `Conflict` | -32002 | Duplicate key, version mismatch |
| `InitializationFailed` | -32009 | Startup failure |
| `DatabaseError` | -32010 | Storage layer failure |
| `InternalError` | -32603 | Catch-all for programmer errors |

**Where handled:** Handlers throw (no try/catch) → handler factory catches, classifies (`ZodError` → `ValidationError`, message pattern matching for common cases, `McpError` preserved as-is), normalizes to `isError: true` → services use `ErrorHandler.tryCatch` for recovery.

---

## Auth

Inline `auth` on definitions (primary pattern):

```ts
const myTool = tool('my_tool', {
  auth: ['tool:my_tool:read'],
  async handler(input, ctx) { ... },
});
```

Handler factory checks `ctx.auth.scopes` before calling handler. Dynamic scopes via `/auth`:

```ts
import { checkScopes } from '@cyanheads/mcp-ts-core/auth';

checkScopes(ctx, [`team:${input.teamId}:write`]);
```

**Modes** (`MCP_AUTH_MODE`): `none` (default) | `jwt` (local secret via `MCP_AUTH_SECRET_KEY`) | `oauth` (JWKS via `OAUTH_ISSUER_URL`, `OAUTH_AUDIENCE`). Claims: `clientId` (cid/client_id), `scopes` (scp/scope), `sub`, `tenantId` (tid). Unprotected endpoints: `/healthz`, `GET /mcp`. CORS: `MCP_ALLOWED_ORIGINS` or `*`. Stdio: no HTTP auth.

---

## Configuration

### Core config

Managed by `@cyanheads/mcp-ts-core`. Validated via Zod. Precedence: `createApp()` overrides > env vars > `package.json`.

| Category | Key Variables |
|:---------|:-------------|
| Transport | `MCP_TRANSPORT_TYPE` (`stdio`\|`http`), `MCP_HTTP_PORT`, `MCP_HTTP_HOST`, `MCP_HTTP_ENDPOINT_PATH` |
| Auth | `MCP_AUTH_MODE`, `MCP_AUTH_SECRET_KEY`, `OAUTH_*` |
| Storage | `STORAGE_PROVIDER_TYPE` (`in-memory`\|`filesystem`\|`supabase`\|`cloudflare-r2`\|`cloudflare-kv`\|`cloudflare-d1`) |
| LLM | `OPENROUTER_API_KEY`, `OPENROUTER_APP_URL/NAME`, `LLM_DEFAULT_*` |
| Telemetry | `OTEL_ENABLED`, `OTEL_SERVICE_NAME/VERSION`, `OTEL_EXPORTER_OTLP_*` |

### Server config (separate schema)

Own Zod schema for domain-specific env vars. **Never merge with core's schema.** Lazy-parse — do not eagerly parse `process.env` at top-level (Workers inject env at request time via `injectEnvVars()`).

```ts
// src/config/server-config.ts
const ServerConfigSchema = z.object({
  myApiKey: z.string().describe('External API key'),
  maxResults: z.coerce.number().default(100),
});
type ServerConfig = z.infer<typeof ServerConfigSchema>;
let _config: ServerConfig | undefined;
export function getServerConfig(): ServerConfig {
  _config ??= ServerConfigSchema.parse({ myApiKey: process.env.MY_API_KEY, maxResults: process.env.MY_MAX_RESULTS });
  return _config;
}
```

---

## Testing

```ts
import { describe, expect, it, vi } from 'vitest';
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
import { myTool } from '@/mcp-server/tools/definitions/my-tool.tool.js';

describe('myTool', () => {
  it('returns expected output', async () => {
    const ctx = createMockContext();
    const result = await myTool.handler(myTool.input.parse({ query: 'hello' }), ctx);
    expect(result.result).toBe('Found: hello');
  });
  it('throws on invalid state', async () => {
    await expect(myTool.handler(myTool.input.parse({ query: 'BAD' }), createMockContext())).rejects.toThrow();
  });
});
```

**`createMockContext` options:** `createMockContext()` (minimal), `{ tenantId: 'test-tenant' }` (enables state), `{ sample: vi.fn() }`, `{ elicit: vi.fn() }`, `{ progress: true }` (task progress).

**Vitest config:** Extend core config, add `@/` alias: `resolve: { alias: { '@/': new URL('./src/', import.meta.url).pathname } }`.

**Isolation:** Construct deps in `beforeEach`. Re-init services per suite. Vitest runs files in separate workers.

---

## API Quick References

Detailed method signatures, options, and examples live in skill files. Read the relevant skill before starting a task it covers.

| Skill | Path | Covers |
|:------|:-----|:-------|
| `api-utils` | `skills/api-utils/SKILL.md` | formatting, parsing, security, network, pagination, runtime, scheduling, types, logger, requestContext, errorHandler, telemetry |
| `api-services` | `skills/api-services/SKILL.md` | LLM (OpenRouter), Speech (ElevenLabs TTS, Whisper STT), Graph (CRUD, traversal, pathfinding) |
| `api-context` | `skills/api-context/SKILL.md` | Context interface, createContext, ContextLogger/State/Progress |
| `api-errors` | `skills/api-errors/SKILL.md` | McpError, JsonRpcErrorCode, error handling patterns |
| `api-auth` | `skills/api-auth/SKILL.md` | Auth modes, scopes, JWT/OAuth strategies |
| `api-config` | `skills/api-config/SKILL.md` | AppConfig, parseConfig, env vars |
| `api-testing` | `skills/api-testing/SKILL.md` | createMockContext, test patterns, MockContextOptions |
| `api-workers` | `skills/api-workers/SKILL.md` | createWorkerHandler, CloudflareBindings, Worker runtime |
| `add-tool` | `skills/add-tool/SKILL.md` | Scaffold a new MCP tool definition |
| `add-resource` | `skills/add-resource/SKILL.md` | Scaffold a new MCP resource definition |
| `add-prompt` | `skills/add-prompt/SKILL.md` | Scaffold a new MCP prompt definition |
| `add-service` | `skills/add-service/SKILL.md` | Scaffold a new domain service |
| `add-provider` | `skills/add-provider/SKILL.md` | Add a new provider implementation |
| `add-export` | `skills/add-export/SKILL.md` | Add a new subpath export |
| `setup` | `skills/setup/SKILL.md` | Initialize a new consumer server from the template |
| `devcheck` | `skills/devcheck/SKILL.md` | Run lint, format, typecheck, security checks |
| `release` | `skills/release/SKILL.md` | Version bump, changelog, publish workflow |
| `maintenance` | `skills/maintenance/SKILL.md` | Dependency updates, housekeeping tasks |
| `migrate-mcp-ts-template` | `skills/migrate-mcp-ts-template/SKILL.md` | Migrate legacy template fork to package dependency |

---

## Code Style

- **Validation:** Zod schemas, all fields need `.describe()`
- **Logging:** `ctx.log` in handlers, global `logger` for lifecycle/background
- **Errors:** handlers throw (plain `Error` or `McpError` for precision), framework catches and classifies. `ErrorHandler.tryCatch` for services only.
- **Secrets:** server config only — no hardcoded credentials
- **Naming:** kebab-case files, snake_case tool/resource/prompt names, correct suffix
- **JSDoc:** `@fileoverview` + `@module` required on every file
- **No fabricated signal:** Don't invent synthetic scores or arbitrary "confidence percentages." Surface real signal.

---

## Git

**Safety:** NEVER `git stash`. NEVER destructive commands (`reset --hard`, `checkout -- .`, `restore .`, `clean -f`) unless user explicitly requests. Read-only is always safe.

**Commits:** Plain `-m` strings, no heredoc/command substitution. [Conventional Commits](https://www.conventionalcommits.org/): `feat|fix|refactor|chore|docs|test|build(scope): message`. Group related changes atomically.

---

## Commands

| Command | Purpose |
|:--------|:--------|
| `bun run build` | Build library output (`tsc && tsc-alias`) |
| `bun run devcheck` | **Use often.** Lint, format, typecheck, security |
| `bun run test` | Unit/integration tests |
| `bun run dev:stdio` | Development mode (stdio) |
| `bun run dev:http` | Development mode (HTTP) |
| `bun run start:stdio` | Production mode (stdio, after build) |
| `bun run start:http` | Production mode (HTTP, after build) |

---

## Publishing

After version bump and final commit:

```bash
bun publish --access public

docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/cyanheads/mcp-ts-core:<version> \
  -t ghcr.io/cyanheads/mcp-ts-core:latest \
  --push .

mcp-publisher publish
```

---

## Code Navigation

**LSP tools are deferred — load them first.** Run `ToolSearch("select:LSP")` at session start for any code nav/refactoring work.

**Grep/Glob** for file discovery, text patterns, regex. **LSP** for symbol identity, types, structure, references, call chains (`goToDefinition`, `findReferences`, `hover`, `documentSymbol`, `goToImplementation`, `incomingCalls`/`outgoingCalls`).

---

## Subagent Rules

**Default: do the work yourself.** Only spawn agents when: (1) work spans 3+ files with independent scopes, (2) you can write precise self-contained prompts, (3) parallelism adds genuine value.

When used: `model: "opus"` (preferred) or `"sonnet"` (never `haiku`). Always `run_in_background: true`. Non-overlapping file scope per agent. Agent output not visible to user — orchestrator reports findings. No git commands that modify state.

**Required agent preamble:** "CRITICAL: Do NOT run any git commands that modify state. No commits, stashes, resets, checkouts, or clean. Git is handled by the orchestrator. Read-only commands (status, diff, log, show) are acceptable."

---

## Checklist

- [ ] `tool()`/`resource()`/`prompt()` builders with correct fields (`handler`, `input`, `output`, `format`, `auth`, `args`)
- [ ] Zod schemas: all fields have `.describe()`
- [ ] JSDoc `@fileoverview` + `@module` on every new/modified file
- [ ] Auth via `auth: ['scope']` on definitions (not HOF wrapper)
- [ ] `ctx.log` for logging, `ctx.state` for storage
- [ ] `ctx.elicit`/`ctx.sample` checked for presence before use
- [ ] Naming: kebab-case files, snake_case names, correct suffixes
- [ ] Task tools use `task: true` flag
- [ ] Large resource lists: `extractCursor`/`paginateArray`
- [ ] Secrets only in server config
- [ ] Registered in `definitions/index.ts` barrel
- [ ] Tests added — `createMockContext()`, `.handler()` tested directly
- [ ] **`bun run devcheck` passes**
- [ ] Smoke-tested with `dev:stdio`/`dev:http`
