# 02 — Public API

> `bootstrap()`, `createWorkerHandler()`, subpath exports.

---

## Bootstrap API

The primary API contract. The current `index.ts` is 168 lines of boilerplate (color suppression, DI composition, OTEL init, timer init, logger init, error handlers, signal handlers, transport startup). All identical across servers. `bootstrap()` absorbs it.

### `bootstrap(options): Promise<ServerHandle>`

```ts
import type { AnyToolDefinition } from '@cyanheads/mcp-ts-core/tools';
import type { AnyResourceDefinition } from '@cyanheads/mcp-ts-core/resources';
import type { PromptDefinition } from '@cyanheads/mcp-ts-core/prompts';
import type { Container } from '@cyanheads/mcp-ts-core/container';

interface ServerDefinitions {
  tools: AnyToolDefinition[];
  resources: AnyResourceDefinition[];
  prompts: PromptDefinition[];
}

interface BootstrapOptions {
  /** Server name — overrides package.json and MCP_SERVER_NAME env var */
  name?: string;
  /** Server version — overrides package.json and MCP_SERVER_VERSION env var */
  version?: string;
  /** Tool, resource, and prompt definitions to register */
  definitions: ServerDefinitions;
  /** Register additional services after core services are composed */
  services?: (container: Container) => void | Promise<void>;
}

interface ServerHandle {
  /** Initiates graceful shutdown (flushes OTEL, closes logger, stops transport) */
  shutdown(signal?: string): Promise<void>;
  /** Read-only access to the DI container for integration testing, health checks, or embedding */
  readonly container: Container;
}

/**
 * Composes DI container, initializes telemetry/logger, starts transport,
 * registers shutdown/signal handlers. This is the entire entry point for
 * a Node.js MCP server.
 */
export async function bootstrap(options: BootstrapOptions): Promise<ServerHandle>;
```

### What `bootstrap()` does internally

1. Suppress ANSI colors for stdio/non-TTY (currently lines 19-26 of `index.ts`)
2. `registerCoreServices()` — config, logger, storage, rate limiter, LLM, speech
3. Apply `options.name`/`options.version` overrides to config (before anything reads them)
4. `registerMcpServices(options.definitions)` — multi-register definitions, build registries, wire TaskManager, TransportManager, server factory
5. `await options.services?.(container)` — server-specific DI overrides (supports async init)
6. Initialize OpenTelemetry
7. Initialize high-res timer
8. Initialize logger with config-derived level and transport type
9. Register `uncaughtException` / `unhandledRejection` handlers
10. Resolve TransportManager, call `start()`
11. Register `SIGTERM` / `SIGINT` handlers with graceful shutdown
12. Return `ServerHandle` with `shutdown()` for programmatic teardown (tests, embedding)

### Design notes

**Opinionated process runner.** `bootstrap()` owns signal handlers, unhandled error hooks, logger lifecycle, and transport startup. This is intentional — the primary product is a standalone MCP server process, not an embeddable library. For cases that need manual composition (embedding in a larger app, custom signal handling, testing infrastructure), the individual building blocks are exported as first-class public API: container, transport manager, registries, config, logger. Skipping `bootstrap()` and wiring these directly is a supported path, not a workaround.

**Shutdown subtleties.** The current `index.ts` shutdown handler has real nuance — double-shutdown guard, OTEL flush ordering, logger close as final step, error handling during shutdown itself. `bootstrap()` must preserve all of these, not just absorb line count.

**Type erasure for definition arrays.** `ToolDefinition` and `ResourceDefinition` are generic (`ToolDefinition<TInput, TOutput>`). A mixed array like `allToolDefinitions` (which includes both `ToolDefinition` and `TaskToolDefinition` variants with different schema types) can't be typed as `ToolDefinition[]` without defaults or widening. Core must export erased union types — `AnyToolDefinition` (union of `ToolDefinition<any, any> | TaskToolDefinition<any, any>`) and `AnyResourceDefinition` (`ResourceDefinition<any, any>`) — for use in collection contexts like `ServerDefinitions`. Individual tool files still use the fully-typed generic for their own definitions.

**DI resolution timing.** Tool definitions must defer container resolution to call time (inside `logic`), not registration time. `options.services` runs after `registerMcpServices`, so tokens registered there won't be available during definition registration — only during request handling.

### Generated `index.ts` (minimal server)

```ts
#!/usr/bin/env node
import { bootstrap } from '@cyanheads/mcp-ts-core/bootstrap';
import { allToolDefinitions } from './mcp-server/tools/definitions/index.js';
import { allResourceDefinitions } from './mcp-server/resources/definitions/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/definitions/index.js';

await bootstrap({
  definitions: {
    tools: allToolDefinitions,
    resources: allResourceDefinitions,
    prompts: allPromptDefinitions,
  },
});
```

7 lines of meaningful code. The entire 168-line `index.ts` boilerplate disappears.

### With server-specific services

```ts
#!/usr/bin/env node
import { bootstrap } from '@cyanheads/mcp-ts-core/bootstrap';
import { allToolDefinitions } from './mcp-server/tools/definitions/index.js';
import { allResourceDefinitions } from './mcp-server/resources/definitions/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/definitions/index.js';
import { PubMedServiceToken } from './container/tokens.js';
import { PubMedService } from './services/pubmed/pubmed-service.js';

await bootstrap({
  definitions: {
    tools: allToolDefinitions,
    resources: allResourceDefinitions,
    prompts: allPromptDefinitions,
  },
  services(c) {
    c.registerSingleton(PubMedServiceToken, () => new PubMedService());
  },
});
```

---

## Worker Factory

The current `worker.ts` is 357 lines — CloudflareBindings type, env injection, binding storage, singleton caching, init/error handling, request metadata extraction, scheduled handler. All identical across servers. `createWorkerHandler()` absorbs it.

### `createWorkerHandler(options): WorkerExport`

```ts
import type { CloudflareBindings } from '@cyanheads/mcp-ts-core/worker';

interface WorkerOptions {
  definitions: ServerDefinitions;
  services?: (container: Container) => void;
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
 * server creation (GHSA-345p-7cg4-v4c7), and error responses.
 */
export function createWorkerHandler(options: WorkerOptions): {
  fetch: (request: Request, env: CloudflareBindings, ctx: ExecutionContext) => Promise<Response>;
  scheduled: (controller: ScheduledController, env: CloudflareBindings, ctx: ExecutionContext) => Promise<void>;
};
```

### Generated `worker.ts`

```ts
import { createWorkerHandler } from '@cyanheads/mcp-ts-core/worker';
import { allToolDefinitions } from './mcp-server/tools/definitions/index.js';
import { allResourceDefinitions } from './mcp-server/resources/definitions/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/definitions/index.js';

export default createWorkerHandler({
  definitions: {
    tools: allToolDefinitions,
    resources: allResourceDefinitions,
    prompts: allPromptDefinitions,
  },
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
  // String bindings → injected into process.env (for config parsing)
  extraEnvBindings: [['MY_API_KEY', 'MY_API_KEY']],
  // Object bindings → stored on globalThis (for KV, R2, D1, etc.)
  extraObjectBindings: [['MY_CUSTOM_KV', 'MY_CUSTOM_KV']],
});
```

`extraEnvBindings` maps `[bindingKey, processEnvKey]` — the string value from `env[bindingKey]` is written to `process.env[processEnvKey]`. `extraObjectBindings` maps `[bindingKey, globalKey]` — the object reference from `env[bindingKey]` is assigned to `(globalThis as any)[globalKey]`. Core already uses `storeBindings()` for its own object bindings (`KV_NAMESPACE`, `R2_BUCKET`, `DB`, `AI`); this extends the same pattern to server-specific bindings.

**Binding types:**

| Binding type | Examples | Injection method | Access pattern |
|:-------------|:---------|:-----------------|:---------------|
| String values | API keys, env flags, URLs | `process.env` via `injectEnvVars()` | `process.env.MY_API_KEY` |
| Object bindings | KV namespaces, R2 buckets, D1 databases, AI | `globalThis` via `storeBindings()` | `(globalThis as any).MY_CUSTOM_KV` |

---

## Subpath Exports

The `exports` field in `@cyanheads/mcp-ts-core/package.json` defines the public API. Grouped by domain, not by internal file structure.

```jsonc
{
  "exports": {
    // Entry points
    "./bootstrap":       { "types": "./dist/bootstrap.d.ts",       "import": "./dist/bootstrap.js" },
    "./worker":          { "types": "./dist/worker.d.ts",          "import": "./dist/worker.js" },

    // MCP primitives
    "./tools":           { "types": "./dist/mcp-server/tools/utils/toolDefinition.d.ts",           "import": "./dist/mcp-server/tools/utils/toolDefinition.js" },
    "./resources":       { "types": "./dist/mcp-server/resources/utils/resourceDefinition.d.ts",   "import": "./dist/mcp-server/resources/utils/resourceDefinition.js" },
    "./prompts":         { "types": "./dist/mcp-server/prompts/utils/promptDefinition.d.ts",       "import": "./dist/mcp-server/prompts/utils/promptDefinition.js" },
    "./tasks":           { "types": "./dist/mcp-server/tasks/utils/taskToolDefinition.d.ts",       "import": "./dist/mcp-server/tasks/utils/taskToolDefinition.js" },

    // Core infrastructure
    "./errors":          { "types": "./dist/types-global/errors.d.ts",          "import": "./dist/types-global/errors.js" },
    "./config":          { "types": "./dist/config/index.d.ts",                 "import": "./dist/config/index.js" },
    "./container":       { "types": "./dist/container/core/container.d.ts",     "import": "./dist/container/core/container.js" },
    "./tokens":          { "types": "./dist/container/core/tokens.d.ts",        "import": "./dist/container/core/tokens.js" },

    // Auth
    "./auth":            { "types": "./dist/mcp-server/transports/auth/lib/withAuth.d.ts", "import": "./dist/mcp-server/transports/auth/lib/withAuth.js" },

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
    "./eslint.config":         "./eslint.config.js"
  }
}
```

Every compiled export has both `types` and `import` conditions. The `types` condition must come first — TypeScript requires it before `import` for correct resolution. Build config exports are plain strings (no `.d.ts`). Internal file structure can change without breaking downstream — only subpath names are the contract. See [03a-build.md](03a-build.md) for the build pipeline that produces `dist/`.

**Notes:**
- `./utils/parsing` and `./utils/security` point to barrel `index.js` files. These are legitimate aggregation points — they collect lazy-import wrappers into a single entry point. Each individual parser/utility uses dynamic `import()` internally, so importing the barrel doesn't pull in unused Tier 3 deps.
- Service interfaces excluded from initial exports — promoted when shared by 2+ servers
- Once `exports` is present in `package.json`, only listed paths are resolvable — unlisted files are unreachable even if physically present in the package. Build config exports point to root-level files, not `dist/`. They're shipped as-is and must be listed in the `files` array alongside `dist/`.

### Import changes for downstream servers

```ts
// Before (template fork — @/ path alias into internal files)
import type { ToolDefinition } from '@/mcp-server/tools/utils/toolDefinition.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { logger } from '@/utils/internal/logger.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { markdown } from '@/utils/formatting/markdownBuilder.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';

// After (core package — stable subpath exports)
import type { ToolDefinition } from '@cyanheads/mcp-ts-core/tools';
import { withToolAuth } from '@cyanheads/mcp-ts-core/auth';
import { logger } from '@cyanheads/mcp-ts-core/utils/logger';
import { JsonRpcErrorCode, McpError } from '@cyanheads/mcp-ts-core/errors';
import { markdown } from '@cyanheads/mcp-ts-core/utils/formatting';
import type { RequestContext } from '@cyanheads/mcp-ts-core/utils/requestContext';
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
// eslint.config.js
{ "extends": "@cyanheads/mcp-ts-core/eslint.config" }
```
