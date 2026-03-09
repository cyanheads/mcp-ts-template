# 02 — Public API

> `createApp()`, `createWorkerHandler()`, subpath exports, developer API.
>
> **Developer-facing API (builders, `Context`, inline auth, task tools):** See [12-developer-api.md](12-developer-api.md).

---

## App Factory

The primary API contract. The current `index.ts` is 168 lines of boilerplate (color suppression, DI composition, OTEL init, timer init, logger init, error handlers, signal handlers, transport startup). All identical across servers. `createApp()` absorbs it.

### `createApp(options): Promise<ServerHandle>`

```ts
import type { AnyToolDefinition } from '@cyanheads/mcp-ts-core/tools';
import type { AnyResourceDefinition } from '@cyanheads/mcp-ts-core/resources';
import type { PromptDefinition } from '@cyanheads/mcp-ts-core/prompts';

interface CoreServices {
  /** Zod-validated config from environment variables */
  config: AppConfig;
  /** Pino structured logger */
  logger: Logger;
  /** Tenant-scoped storage abstraction */
  storage: StorageService;
  /** Rate limiter instance */
  rateLimiter: RateLimiter;
  /** LLM provider — present only when OPENROUTER_API_KEY is configured */
  llmProvider?: ILlmProvider;
  /** Speech service (TTS/STT) — present only when speech providers are configured */
  speechService?: SpeechService;
  /** Supabase admin client — present only when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set */
  supabase?: SupabaseClient;
}

interface CreateAppOptions {
  /** Server name — overrides package.json and MCP_SERVER_NAME env var */
  name?: string;
  /** Server version — overrides package.json and MCP_SERVER_VERSION env var */
  version?: string;
  /** Tool definitions to register */
  tools?: AnyToolDefinition[];
  /** Resource definitions to register */
  resources?: AnyResourceDefinition[];
  /** Prompt definitions to register */
  prompts?: PromptDefinition[];
  /** Runs after core services are constructed. Use for server-specific initialization. */
  setup?: (core: CoreServices) => void | Promise<void>;
}

interface ServerHandle {
  /** Initiates graceful shutdown (flushes OTEL, closes logger, stops transport) */
  shutdown(signal?: string): Promise<void>;
  /** Read-only access to core services for integration testing, health checks, or embedding */
  readonly services: CoreServices;
}

/**
 * Constructs core services, initializes telemetry/logger, starts transport,
 * registers shutdown/signal handlers. This is the entire entry point for
 * a Node.js MCP server.
 */
export async function createApp(options: CreateAppOptions): Promise<ServerHandle>;
```

### What `createApp()` does internally

1. Suppress ANSI colors for stdio/non-TTY (currently lines 19-26 of `index.ts`)
2. Parse and validate config with `options.name`/`options.version` overrides
3. Construct core services directly — no DI container:
   - Config -> StorageProvider -> StorageService -> RateLimiter
   - Conditional: Supabase client (if configured), LLM provider, SpeechService
4. Initialize logger with config-derived level and transport type
5. `await options.setup?.({ config, logger, storage, rateLimiter, llmProvider?, speechService?, supabase? })` — server-specific init
6. Construct MCP registries from `options.tools`/`resources`/`prompts` (ToolRegistry, ResourceRegistry, PromptRegistry, RootsRegistry)
7. Construct TaskManager, server factory, TransportManager — passing dependencies directly
8. Initialize OpenTelemetry
9. Initialize high-res timer
10. Register `uncaughtException` / `unhandledRejection` handlers
11. Start transport via TransportManager
12. Register `SIGTERM` / `SIGINT` handlers with graceful shutdown
13. Return `ServerHandle` with `shutdown()` and `services`

**Key change from earlier plan:** Logger initialized at step 4 (before `setup()`), so `setup()` can log via `core.logger`. See [10-decisions.md](10-decisions.md) #23.

### Design notes

**Opinionated process runner.** `createApp()` owns signal handlers, unhandled error hooks, logger lifecycle, and transport startup. This is intentional — the primary product is a standalone MCP server process, not an embeddable library. For cases that need manual composition (embedding in a larger app, custom signal handling, testing infrastructure), the individual building blocks are exported as first-class public API: config, transport manager, registries, logger. Skipping `createApp()` and wiring these directly is a supported path, not a workaround.

**No DI container.** The dependency graph is static, linear, and small (~15 services). No tool, resource, or prompt definition resolves services from a container — they receive a unified `Context` object (see [12-developer-api.md](12-developer-api.md)) or access server-specific services through module-level lazy accessors. Direct construction in `createApp()` makes the wiring explicit, debuggable with a stack trace, and eliminates the token/registration/resolve indirection of a service locator. Server-specific services initialized in `setup()` follow the same lazy accessor pattern. See [10-decisions.md](10-decisions.md) #15.

**HTTP infrastructure ownership.** `createApp()` owns the health endpoint (`/healthz`) and CORS configuration (`MCP_ALLOWED_ORIGINS`). These are part of the HTTP transport layer — they ship with core and are not configurable by downstream servers beyond the existing env vars. The health endpoint is always unprotected; CORS applies to protected endpoints when auth is enabled.

**Shutdown subtleties.** The current `index.ts` shutdown handler has real nuance — double-shutdown guard, OTEL flush ordering, logger close as final step, error handling during shutdown itself. `createApp()` must preserve all of these, not just absorb line count.

**Type erasure for definition arrays.** `ToolDefinition` and `ResourceDefinition` are generic (`ToolDefinition<TInput, TOutput>`). A mixed array like `allToolDefinitions` (which includes both `ToolDefinition` and `TaskToolDefinition` variants with different schema types) can't be typed as `ToolDefinition[]` without defaults or widening. Core must export erased union types — `AnyToolDefinition` (union of `ToolDefinition<any, any> | TaskToolDefinition<any, any>`) and `AnyResourceDefinition` (`ResourceDefinition<any, any>`) — for use in collection contexts like `ServerDefinitions`. Individual tool files still use the fully-typed generic for their own definitions.

**Service initialization timing.** `setup()` runs after core services are constructed but before registries and transport start. Server-specific services initialized in `setup()` can depend on `CoreServices` (config, storage, etc.). Tool definitions access server-specific services at call time via module-level lazy accessors — not at definition time. This replaces the DI resolution timing constraint from the old container design.

### Generated `index.ts` (minimal server)

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

7 lines of meaningful code. The entire 168-line `index.ts` boilerplate disappears.

### With server-specific services

```ts
#!/usr/bin/env node
import { createApp } from '@cyanheads/mcp-ts-core';
import { allToolDefinitions } from './mcp-server/tools/index.js';
import { allResourceDefinitions } from './mcp-server/resources/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/index.js';
import { initPubMedService } from './services/pubmed/pubmed-service.js';

await createApp({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
  setup(core) {
    initPubMedService(core.config, core.storage);
  },
});
```

Tool logic accesses server-specific services via module-level lazy accessors:

```ts
// services/pubmed/pubmed-service.ts
let _service: PubMedService | undefined;

export function initPubMedService(config: AppConfig, storage: StorageService): void {
  _service = new PubMedService(config, storage);
}

export function getPubMedService(): PubMedService {
  if (!_service) {
    throw new McpError(JsonRpcErrorCode.InitializationFailed, 'PubMedService not initialized');
  }
  return _service;
}

// tools/search-pubmed.tool.ts
import { getPubMedService } from '../../services/pubmed/pubmed-service.js';

handler: async (input, ctx) => {
  return getPubMedService().search(input.query);
},
```

---

## Worker Factory

The current `worker.ts` is 357 lines — CloudflareBindings type, env injection, binding storage, singleton caching, init/error handling, request metadata extraction, scheduled handler. All identical across servers. `createWorkerHandler()` absorbs it.

### `createWorkerHandler(options): WorkerExport`

```ts
import type { CloudflareBindings } from '@cyanheads/mcp-ts-core/worker';

interface WorkerOptions {
  tools?: AnyToolDefinition[];
  resources?: AnyResourceDefinition[];
  prompts?: PromptDefinition[];
  setup?: (core: CoreServices) => void | Promise<void>;
  /** Extra string CF bindings to inject into process.env (beyond the core set) */
  extraEnvBindings?: Array<[string, string]>;
  /** Extra object CF bindings (KV, R2, D1, etc.) to store on globalThis */
  extraObjectBindings?: Array<[string, string]>;
  /** Handler for scheduled/cron events. Called after app init and binding refresh. */
  onScheduled?: (controller: ScheduledController, env: CloudflareBindings, ctx: ExecutionContext) => Promise<void>;
}

/**
 * Returns a standard Cloudflare Workers export object ({ fetch, scheduled }).
 * Handles env injection, binding storage, singleton init caching, per-request
 * server creation (GHSA-345p-7cg4-v4c7), error responses, and telemetry flush
 * via ctx.waitUntil().
 */
export function createWorkerHandler(options: WorkerOptions): {
  fetch: (request: Request, env: CloudflareBindings, ctx: ExecutionContext) => Promise<Response>;
  scheduled: (controller: ScheduledController, env: CloudflareBindings, ctx: ExecutionContext) => Promise<void>;
};
```

### Generated `worker.ts`

```ts
import { createWorkerHandler } from '@cyanheads/mcp-ts-core/worker';
import { allToolDefinitions } from './mcp-server/tools/index.js';
import { allResourceDefinitions } from './mcp-server/resources/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/index.js';

export default createWorkerHandler({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
});
```

### `CloudflareBindings` extensibility

Core defines `CloudflareBindings` with known keys (storage, auth, LLM, telemetry, speech) — **without** an index signature. This forces servers to declare additional bindings explicitly via TypeScript intersection, catching typos at compile time. The current `worker.ts` has `[key: string]: unknown` on `CloudflareBindings` — this must be removed during extraction so the type actually enforces the binding contract.

```ts
import type { CloudflareBindings as CoreBindings } from '@cyanheads/mcp-ts-core/worker';

interface MyBindings extends CoreBindings {
  MY_CUSTOM_KV: KVNamespace;
  MY_API_KEY: string;
}

export default createWorkerHandler({
  definitions: { ... },
  // String bindings -> injected into process.env (for config parsing)
  extraEnvBindings: [['MY_API_KEY', 'MY_API_KEY']],
  // Object bindings -> stored on globalThis (for KV, R2, D1, etc.)
  extraObjectBindings: [['MY_CUSTOM_KV', 'MY_CUSTOM_KV']],
});
```

`extraEnvBindings` maps `[bindingKey, processEnvKey]` — the string value from `env[bindingKey]` is written to `process.env[processEnvKey]`. `extraObjectBindings` maps `[bindingKey, globalKey]` — the object reference from `env[bindingKey]` is assigned to `(globalThis as any)[globalKey]`. Core already uses `storeBindings()` for its own object bindings (`KV_NAMESPACE`, `R2_BUCKET`, `DB`, `AI`); this extends the same pattern to server-specific bindings.

**Binding types:**

| Binding type | Examples | Injection method | Access pattern |
|:-------------|:---------|:-----------------|:---------------|
| String values | API keys, env flags, URLs | `process.env` via `injectEnvVars()` | `process.env.MY_API_KEY` |
| Object bindings | KV namespaces, R2 buckets, D1 databases, AI | `globalThis` via `storeBindings()` | `(globalThis as any).MY_CUSTOM_KV` |

### Telemetry flush via `waitUntil()`

Cloudflare Workers freeze the isolate the moment the Response is returned. If OpenTelemetry's batch exporter or Pino's async transport hasn't flushed, spans and logs are silently dropped. The current `worker.ts` passes `ExecutionContext` to Hono but never calls `ctx.waitUntil()` for telemetry.

`createWorkerHandler` must use `ctx.waitUntil()` to defer isolate freeze until telemetry is drained:

```ts
// Inside the generated fetch handler
const response = await app.fetch(request, env, ctx);
ctx.waitUntil(flushTelemetry()); // OTEL flush + log drain
return response;
```

Where `flushTelemetry()` calls the OTEL SDK's `forceFlush()` (if OTEL is enabled) and any async logger transport drain. This is internal to `createWorkerHandler` — consumers don't need to think about it.

---

## Subpath Exports

The `exports` field in `@cyanheads/mcp-ts-core/package.json` defines the public API. Grouped by domain, not by internal file structure.

```jsonc
{
  "exports": {
    // Main entry — createApp, tool, resource, prompt, Context type
    ".":                 { "types": "./dist/app.d.ts",               "import": "./dist/app.js" },

    // Worker entry point
    "./worker":          { "types": "./dist/worker.d.ts",          "import": "./dist/worker.js" },

    // MCP primitives (builders + definition types)
    "./tools":           { "types": "./dist/mcp-server/tools/utils/toolDefinition.d.ts",           "import": "./dist/mcp-server/tools/utils/toolDefinition.js" },
    "./resources":       { "types": "./dist/mcp-server/resources/utils/resourceDefinition.d.ts",   "import": "./dist/mcp-server/resources/utils/resourceDefinition.js" },
    "./prompts":         { "types": "./dist/mcp-server/prompts/utils/promptDefinition.d.ts",       "import": "./dist/mcp-server/prompts/utils/promptDefinition.js" },
    "./tasks":           { "types": "./dist/mcp-server/tasks/utils/taskToolDefinition.d.ts",       "import": "./dist/mcp-server/tasks/utils/taskToolDefinition.js" },

    // Context type (for consumers typing against context directly)
    "./context":         { "types": "./dist/context.d.ts",         "import": "./dist/context.js" },

    // Core infrastructure
    "./errors":          { "types": "./dist/types-global/errors.d.ts",          "import": "./dist/types-global/errors.js" },
    "./config":          { "types": "./dist/config/index.d.ts",                 "import": "./dist/config/index.js" },

    // Auth (checkScopes for dynamic auth — inline auth is the primary pattern)
    "./auth":            { "types": "./dist/mcp-server/transports/auth/lib/auth.d.ts", "import": "./dist/mcp-server/transports/auth/lib/auth.js" },

    // Storage
    "./storage":         { "types": "./dist/storage/core/StorageService.d.ts",       "import": "./dist/storage/core/StorageService.js" },
    "./storage/types":   { "types": "./dist/storage/core/IStorageProvider.d.ts",     "import": "./dist/storage/core/IStorageProvider.js" },

    // Utils (grouped, not one-per-file)
    "./utils/logger":          { "types": "./dist/utils/internal/logger.d.ts",                         "import": "./dist/utils/internal/logger.js" },
    "./utils/requestContext":  { "types": "./dist/utils/internal/requestContext.d.ts",                  "import": "./dist/utils/internal/requestContext.js" },
    "./utils/errorHandler":    { "types": "./dist/utils/internal/error-handler/errorHandler.d.ts",      "import": "./dist/utils/internal/error-handler/errorHandler.js" },
    "./utils/formatting":      { "types": "./dist/utils/formatting/markdownBuilder.d.ts",               "import": "./dist/utils/formatting/markdownBuilder.js" },
    "./utils/parsing":         { "types": "./dist/utils/parsing/index.d.ts",                            "import": "./dist/utils/parsing/index.js" },
    "./utils/security":        { "types": "./dist/utils/security/index.d.ts",                           "import": "./dist/utils/security/index.js" },
    "./utils/network":         { "types": "./dist/utils/network/fetchWithTimeout.d.ts",                 "import": "./dist/utils/network/fetchWithTimeout.js" },
    "./utils/pagination":      { "types": "./dist/utils/pagination/pagination.d.ts",                    "import": "./dist/utils/pagination/pagination.js" },
    "./utils/runtime":         { "types": "./dist/utils/internal/runtime.d.ts",                         "import": "./dist/utils/internal/runtime.js" },
    "./utils/scheduling":      { "types": "./dist/utils/scheduling/scheduler.d.ts",                     "import": "./dist/utils/scheduling/scheduler.js" },
    "./utils/types":           { "types": "./dist/utils/types/index.d.ts",                              "import": "./dist/utils/types/index.js" },

    // Test utilities
    "./testing":               { "types": "./dist/testing/index.d.ts", "import": "./dist/testing/index.js" },

    // Build configs (not compiled — shipped as-is from package root)
    "./tsconfig.base.json":    "./tsconfig.base.json",
    "./vitest.config":         "./vitest.config.js",
    "./biome.json":            "./biome.json",

    // Package metadata (required for toolchain compatibility with strict exports)
    "./package.json":          "./package.json"
  }
}
```

Every compiled export has both `types` and `import` conditions. The `types` condition must come first — TypeScript requires it before `import` for correct resolution. Build config exports are plain strings (no `.d.ts`). `vitest.config.js` is authored as plain JS (not compiled from `.ts`) so consumers can import it from `node_modules` without extra TypeScript loader config. Internal file structure can change without breaking downstream — only subpath names are the contract. See [03a-build.md](03a-build.md) for the build pipeline that produces `dist/`.

**Changes from the original plan:**
- Main entry (`.`) exports `createApp` + builder functions (`tool`, `resource`, `prompt`) + `Context` type for convenience
- `./container` and `./tokens` removed — no DI container in the public API (see [10-decisions.md](10-decisions.md) #15)
- `./context` added — `Context`, `ContextLogger`, `ContextState`, `ContextProgress` types (see [12-developer-api.md](12-developer-api.md))
- `./auth` exports `checkScopes()` for dynamic auth — `withToolAuth`/`withResourceAuth` removed (inline `auth` property is the primary pattern)
- `./eslint.config` replaced with `./biome.json` (see [10-decisions.md](10-decisions.md) #24)

**Notes:**
- `./tools`, `./resources`, `./prompts` export both builder functions and definition types
- `./tasks` exports the raw `TaskToolDefinition` type for power-user escape hatch (most users use `task: true` on a regular tool)
- `./utils/parsing` and `./utils/security` point to barrel `index.js` files — legitimate aggregation points with lazy-import wrappers
- Service interfaces excluded from initial exports — promoted when shared by 2+ servers
- `./package.json` is explicitly exported — some bundlers and tools resolve `<pkg>/package.json` as a subpath import, which fails under strict `exports` without it
- Once `exports` is present in `package.json`, only listed paths are resolvable — unlisted files are unreachable

### Import changes for downstream servers

```ts
// Before (template fork — @/ path alias into internal files)
import type { ToolDefinition } from '@/mcp-server/tools/utils/toolDefinition.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { logger } from '@/utils/internal/logger.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { markdown } from '@/utils/formatting/markdownBuilder.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';

// After (core package — builder + stable subpath exports)
import { tool } from '@cyanheads/mcp-ts-core';                          // or '@cyanheads/mcp-ts-core/tools'
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';
import { markdown } from '@cyanheads/mcp-ts-core/utils/formatting';
// No logger import needed — use ctx.log
// No withToolAuth import needed — use auth: ['scope'] on definition
// No RequestContext import needed — use Context from the handler
```

### Build config usage in servers

```jsonc
// tsconfig.json
{ "extends": "@cyanheads/mcp-ts-core/tsconfig.base.json" }
```

```ts
// vitest.config.ts
import coreConfig from '@cyanheads/mcp-ts-core/vitest.config';
```

```jsonc
// biome.json — extends core's Biome config
{ "extends": ["@cyanheads/mcp-ts-core/biome.json"] }
```
