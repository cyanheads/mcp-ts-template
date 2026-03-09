# mcp-ts-core: Package Extraction Plan

**Status:** Planning
**Author:** Casey
**Date:** 2026-03-09

---

## Problem

`mcp-ts-template` contains two distinct layers in a single repo:

| Layer | What it is | Changes | Divergence across servers |
|:------|:-----------|:--------|:--------------------------|
| **Infrastructure** | DI, transports, storage, utils, types, config, build tooling | Frequent, applies to all servers | Should be zero — same code everywhere |
| **Application** | Tools, resources, prompts, domain services | Per-server | Expected and permanent |

Every downstream MCP server is a fork that has drifted. Some trimmed unused utils, removed deps, restructured imports. There's no clean merge path. Propagating template improvements is manual, error-prone, and scales linearly with server count.

---

## Solution

Extract the infrastructure layer into a publishable scoped package (`@cyanheads/mcp-ts-core`) and eventually convert the template into a scaffolding CLI (`create-mcp-server`). Downstream servers become thin consumers of the core package — no more fork-and-diverge.

The current `mcp-ts-template` repo transforms in-place into `@cyanheads/mcp-ts-core`. The infrastructure layer IS the repo — the template definitions are a thin surface that moves to `examples/`. This preserves full git history, avoids "did I copy everything?" risk, and keeps CI running continuously through the transition. A new thin `mcp-ts-template` reference repo is created afterward as a consumer of core.

---

## Package Boundary

### `@cyanheads/mcp-ts-core` (the package)

Everything that is the same across all MCP servers:

```
src/
  config/                  # Zod-validated env config, parseConfig(), CoreConfigSchema
  container/               # DI container, tokens, token factory
  types-global/            # McpError, JsonRpcErrorCode, shared types
  utils/
    formatting/            # MarkdownBuilder, diff/table/tree formatters
    internal/              # logger, requestContext, ErrorHandler, performance, runtime, encoding
    network/               # fetchWithTimeout
    pagination/            # extractCursor, paginateArray
    parsing/               # csv, yaml, xml, json, pdf, frontmatter parsers
    scheduling/            # scheduler (node-cron wrapper)
    security/              # sanitization, rateLimiter, idGenerator
    telemetry/             # OpenTelemetry instrumentation
    types/                 # isErrorWithCode, isRecord type guards
  storage/
    core/                  # StorageService, StorageValidation, interfaces
    providers/             # in-memory, filesystem, supabase, cloudflare-*
  mcp-server/
    server.ts              # createMcpServerInstance
    tools/utils/           # ToolDefinition, toolHandlerFactory, measureToolExecution
    resources/utils/       # ResourceDefinition, resourceHandlerFactory
    prompts/utils/         # PromptDefinition, prompt registration
    tasks/                 # TaskManager, TaskToolDefinition, taskHandlerFactory
    transports/            # stdio, http (Hono), auth strategies, TransportManager
    roots/                 # RootsRegistry
  bootstrap.ts             # bootstrap() — main entry point for Node servers
  worker.ts                # createWorkerHandler() — factory for Cloudflare Workers
examples/                  # Template definitions (tools, resources, prompts) for CI and reference
```

Service interfaces (`ILlmProvider`, `ISpeechProvider`, `IGraphProvider`) are deferred — they start in downstream servers and get promoted to core only when shared by two or more servers.

Also ships:
- Base `tsconfig.json` (downstream extends it)
- Base `vitest.config.ts`
- Shared ESLint config
- `CLAUDE.md` — consumer-facing agent reference with exports catalog (see Agent Discovery)
- `skills/` — [Agent Skills](https://agentskills.io/specification) definitions (`SKILL.md` format) for scaffolding, validation, and migration (see Agent Skills)

### Per-server (what stays in each MCP server repo)

```
src/
  mcp-server/
    tools/definitions/     # The actual tools
    resources/definitions/  # The actual resources
    prompts/definitions/    # The actual prompts
  services/                # Domain-specific integrations (providers, not interfaces)
  config/                  # Server-specific env vars (own Zod schema, not merged with core)
  index.ts                 # Entry point: imports core bootstrap, passes definitions
  worker.ts                # Worker entry point: imports core factory, passes definitions
package.json
CLAUDE.md                  # Extends core protocol with server-specific instructions
README.md
```

---

## Bootstrap API

This is the primary API contract. The current `index.ts` is 168 lines of boilerplate (color suppression, DI composition, OTEL init, timer init, logger init, error handlers, signal handlers, transport startup). All of it is identical across servers. `bootstrap()` absorbs it.

### `bootstrap(options): Promise<ServerHandle>`

```ts
import type { ToolDefinition } from '@cyanheads/mcp-ts-core/tools';
import type { ResourceDefinition } from '@cyanheads/mcp-ts-core/resources';
import type { PromptDefinition } from '@cyanheads/mcp-ts-core/prompts';
import type { Container } from '@cyanheads/mcp-ts-core/container';

interface ServerDefinitions {
  tools: ToolDefinition[];
  resources: ResourceDefinition[];
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
  services?: (container: Container) => void;
}

interface ServerHandle {
  /** Initiates graceful shutdown (flushes OTEL, closes logger, stops transport) */
  shutdown(signal?: string): Promise<void>;
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
5. `options.services?.(container)` — server-specific DI overrides
6. Initialize OpenTelemetry
7. Initialize high-res timer
8. Initialize logger with config-derived level and transport type
9. Register `uncaughtException` / `unhandledRejection` handlers
10. Resolve TransportManager, call `start()`
11. Register `SIGTERM` / `SIGINT` handlers with graceful shutdown
12. Return `ServerHandle` with `shutdown()` for programmatic teardown (tests, embedding)

**Shutdown subtleties:** The current `index.ts` shutdown handler has real nuance — double-shutdown guard, OTEL flush ordering, logger close as final step, error handling during shutdown itself. `bootstrap()` must preserve all of these, not just absorb line count.

**DI resolution timing:** Tool definitions must defer container resolution to call time (inside `logic`), not registration time. `options.services` runs after `registerMcpServices`, so tokens registered there won't be available during definition registration — only during request handling. This is already the pattern but should be explicit in the contract.

### Generated `index.ts` (what a server looks like)

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
  /** Extra CF binding keys to inject into process.env (beyond the core set) */
  extraBindings?: Array<[string, string]>;
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

Core defines `CloudflareBindings` with known keys (storage, auth, LLM, telemetry, speech) — **without** an index signature. This forces servers to declare additional bindings explicitly via TypeScript intersection, catching typos at compile time:

```ts
import type { CloudflareBindings as CoreBindings } from '@cyanheads/mcp-ts-core/worker';

interface MyBindings extends CoreBindings {
  MY_CUSTOM_KV: KVNamespace;
  MY_API_KEY: string;
}

export default createWorkerHandler({
  definitions: { ... },
  extraBindings: [
    ['MY_API_KEY', 'MY_API_KEY'],
  ],
});
```

The current `worker.ts` has `[key: string]: unknown` on `CloudflareBindings` — this must be removed during extraction so the type actually enforces the binding contract. The `extraBindings` array is typed as `Array<[string, string]>` (not `keyof CloudflareBindings`) since it maps server-specific keys that core doesn't know about.

---

## Config Extension

Core owns the config schema for transport, auth, storage, telemetry, LLM, speech. Servers do **not** merge into core's schema. They define their own config for domain-specific env vars.

### Why not merge

- Core config is validated by core — no surprises, no version coupling on schema shape
- Server config is validated by the server — full control over parsing, defaults, validation
- No complex `z.merge()` or `defineConfig()` helper needed
- Clean separation: core config for infrastructure, server config for domain

### Pattern

```ts
// src/config/server-config.ts (in the server repo)
import { z } from 'zod';

const ServerConfigSchema = z.object({
  pubmedApiKey: z.string().describe('NCBI E-utilities API key'),
  maxResultsPerQuery: z.coerce.number().default(100),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

export const serverConfig = ServerConfigSchema.parse({
  pubmedApiKey: process.env.PUBMED_API_KEY,
  maxResultsPerQuery: process.env.PUBMED_MAX_RESULTS,
});
```

Tool logic imports from the server's config, not from core:

```ts
import { serverConfig } from '../../config/server-config.js';

// Core config is still available via DI for infrastructure concerns
import { container } from '@cyanheads/mcp-ts-core/container';
import { AppConfig } from '@cyanheads/mcp-ts-core/tokens';
const coreConfig = container.resolve(AppConfig);
```

---

## Container Split

The current `composeContainer()` calls two functions. After extraction, core owns both — but `registerMcpServices` takes definitions as input instead of importing them.

### Current (monolith)

```
composeContainer()
  -> registerCoreServices()     // config, logger, storage, rate limiter, LLM, speech
  -> registerMcpServices()      // imports allToolDefinitions, allResourceDefinitions directly
```

### After extraction

```
bootstrap(options)
  -> registerCoreServices()                    // unchanged — all from core
  -> registerMcpServices(options.definitions)   // definitions injected, not imported
  -> options.services?.(container)              // server-specific DI extensions
```

### `registerMcpServices` changes

```ts
// Before (imports definitions directly)
import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';
import { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';

export const registerMcpServices = () => {
  for (const tool of allToolDefinitions) {
    container.registerMulti(ToolDefinitions, tool);
  }
  // ...
};

// After (definitions passed in)
export const registerMcpServices = (definitions: ServerDefinitions) => {
  for (const tool of definitions.tools) {
    container.registerMulti(ToolDefinitions, tool);
  }
  for (const resource of definitions.resources) {
    container.registerMulti(ResourceDefinitions, resource);
  }
  // Prompts also go through DI now (see Pre-extraction Cleanup)
  for (const prompt of definitions.prompts) {
    container.registerMulti(PromptDefinitions, prompt);
  }
  // Registries, TaskManager, TransportManager, server factory — unchanged
};
```

---

## Subpath Exports

The `exports` field in `@cyanheads/mcp-ts-core/package.json` defines the public API. Grouped by domain, not by internal file structure.

```jsonc
{
  "exports": {
    // Entry points
    "./bootstrap":       "./dist/bootstrap.js",
    "./worker":          "./dist/worker.js",

    // MCP primitives
    "./tools":           "./dist/mcp-server/tools/utils/toolDefinition.js",
    "./resources":       "./dist/mcp-server/resources/utils/resourceDefinition.js",
    "./prompts":         "./dist/mcp-server/prompts/utils/promptDefinition.js",
    "./tasks":           "./dist/mcp-server/tasks/utils/taskToolDefinition.js",

    // Core infrastructure
    "./errors":          "./dist/types-global/errors.js",
    "./config":          "./dist/config/index.js",
    "./container":       "./dist/container/core/container.js",
    "./tokens":          "./dist/container/core/tokens.js",

    // Auth
    "./auth":            "./dist/mcp-server/transports/auth/lib/withAuth.js",

    // Storage
    "./storage":         "./dist/storage/core/StorageService.js",
    "./storage/types":   "./dist/storage/core/IStorageProvider.js",

    // Utils (grouped, not one-per-file)
    "./utils/logger":          "./dist/utils/internal/logger.js",
    "./utils/requestContext":  "./dist/utils/internal/requestContext.js",
    "./utils/errorHandler":    "./dist/utils/internal/error-handler/errorHandler.js",
    "./utils/formatting":      "./dist/utils/formatting/markdownBuilder.js",
    "./utils/parsing":         "./dist/utils/parsing/index.js",
    "./utils/security":        "./dist/utils/security/index.js",
    "./utils/network":         "./dist/utils/network/fetchWithTimeout.js",
    "./utils/pagination":      "./dist/utils/pagination/pagination.js",
    "./utils/runtime":         "./dist/utils/internal/runtime.js",
    "./utils/scheduling":      "./dist/utils/scheduling/scheduler.js",
    "./utils/types":           "./dist/utils/types/index.js",

    // Test utilities
    "./testing":               "./dist/testing/index.js"
  }
}
```

Each export should include both `import` and `types` conditions for TypeScript consumers. The internal file structure can change without breaking downstream — only the subpath names are the contract.

**Notes:**
- `./utils/parsing` and `./utils/security` point to barrel `index.js` files. These are legitimate aggregation points — they collect lazy-import wrappers into a single entry point. Each individual parser/utility uses dynamic `import()` internally, so importing the barrel doesn't pull in unused Tier 3 deps.
- Service interfaces (`ILlmProvider`, `ISpeechProvider`, `IGraphProvider`) are excluded from initial exports. They'll be promoted to core only when two or more servers share the same interface (see Open Questions).

### Build configs

Shared build configs are exported as root-level files in the published package (not subpath exports). Servers reference them directly:

```jsonc
// tsconfig.json
{ "extends": "@cyanheads/mcp-ts-core/tsconfig.base.json" }
```

```ts
// vitest.config.ts
import coreConfig from '@cyanheads/mcp-ts-core/vitest.config.js';
```

```jsonc
// .eslintrc or eslint.config.js
{ "extends": "@cyanheads/mcp-ts-core/eslint.config.js" }
```

These files are listed in the package's `files` array alongside `dist/`.

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

---

## `create-mcp-server` CLI (deferred milestone)

> **Not required for initial extraction.** Steps 1-5 of the execution sequence deliver all architectural value. The CLI is a DX improvement that can ship independently once core is stable. Servers can be scaffolded manually or cloned from the reference template repo in the interim.

The template repo transforms into a scaffolding tool:

```bash
bunx create-mcp-server my-server
# or
npx create-mcp-server my-server
```

**What it generates:**

1. `package.json` with `@cyanheads/mcp-ts-core` dependency, build scripts, bin entry
2. `tsconfig.json` extending core's base config
3. `src/index.ts` — the bootstrap call (see Bootstrap API above)
4. `src/worker.ts` — the worker factory call (see Worker Factory above)
5. `src/mcp-server/tools/definitions/` — one example tool + `index.ts` barrel
6. `src/mcp-server/resources/definitions/` — one example resource + `index.ts` barrel
7. `src/mcp-server/prompts/definitions/` — one example prompt + `index.ts` barrel
8. `CLAUDE.md` — agent protocol extending core's reference
9. `vitest.config.ts`, `.eslintrc`, `wrangler.toml` (from core's shared configs)
10. Runs `bun install`

**Interactive prompts (optional):**
- Server name, description
- Which transports to enable (stdio, http, both)
- Auth mode (none, jwt, oauth)

The template repo (`mcp-ts-template`) continues as the source for CLI templates and as a reference/example server that itself depends on `@cyanheads/mcp-ts-core`. See Repo Strategy for how these relate.

---

## Migration Path for Existing Servers

For each downstream server already forked from the template:

### Automated via Claude

1. Add `@cyanheads/mcp-ts-core` as a dependency
2. Delete all infrastructure files that now come from the package (everything in the "core" list above)
3. Rewrite imports: `@/` paths to `@cyanheads/mcp-ts-core/` subpaths (mechanical find-and-replace, ~10 patterns)
4. Replace `index.ts` with the bootstrap call
5. Replace `worker.ts` with the worker factory call
6. Move any server-specific DI registrations into the `services` callback
7. Keep all `definitions/` files, domain `services/`, and server-specific config
8. Run `devcheck`, fix any breakage
9. Update `CLAUDE.md` to reference core's protocol instead of duplicating

### What makes this tractable

- The infra/app boundary is already clean — `definitions/` files only import from `utils/` and `types-global/`, never from each other's internals
- DI tokens are centralized — downstream just registers its own definitions via the `definitions` option
- Servers that trimmed unused utils don't need migration for those utils — they simply don't import them from the package
- The `ToolDefinition` / `ResourceDefinition` / `PromptDefinition` contracts are stable
- Import rewriting is mechanical: ~10 `@/` prefix patterns map to `@cyanheads/mcp-ts-core/` subpaths

---

## Repo Strategy

The current `mcp-ts-template` repo transforms in-place into `@cyanheads/mcp-ts-core`. The infrastructure layer IS the repo — template definitions are a thin surface on top. The extraction is a subtraction (remove app layer), not a copy (duplicate infra to a new repo).

**Why transform in-place, not create a new repo:**

| Concern | New repo (document's original plan) | Transform in-place |
|:--------|:-------------------------------------|:-------------------|
| Git history | Lost for all infrastructure code | Fully preserved |
| Risk of missed files | Real — "did I copy everything?" | Zero — you're removing, not copying |
| CI continuity | New repo needs full CI setup | Existing CI continues working |
| Transition period | Two repos exist in parallel | Single repo, clean rename |

**Repos after extraction:**

| Repo | Package | Purpose |
|:-----|:--------|:--------|
| `cyanheads/mcp-ts-core` (renamed from `mcp-ts-template`) | `@cyanheads/mcp-ts-core` | Infrastructure package (DI, transports, storage, utils) |
| `cyanheads/mcp-ts-template` (new, thin) | — (GitHub template, not published to npm) | Reference server demonstrating core consumption. Source for `create-mcp-server`. |
| `cyanheads/pubmed-mcp-server` etc. | per-server | Downstream servers. Depend on core. |

**The rename:** GitHub supports repo renames with automatic redirects. `cyanheads/mcp-ts-template` → `cyanheads/mcp-ts-core`. The old npm package `mcp-ts-template` gets a final major version with a deprecation notice pointing to `@cyanheads/mcp-ts-core`.

**Template definitions don't disappear.** They move to `examples/` within core. They serve as integration tests — a thin server consuming core through its public exports, validated in CI. The separate `mcp-ts-template` reference repo is created after core is stable, as a clean starting point for new servers.

**Why separate repos for core and template:**
- Different release cadences — core is versioned infrastructure, template is a starting point
- No workspace linking complexity — `bun add @cyanheads/mcp-ts-core` is the entire integration story
- The reference template's CI runs against the published core package, catching breaks on the real dependency path

---

## Dependency Strategy

Servers shouldn't pay for deps they never use. The package has three tiers:

### How utilities work at each level

**At runtime (ESM):** Lazy by design. If a server never imports `@cyanheads/mcp-ts-core/utils/parsing`, that module never executes — its deps never resolve. Subpath exports enforce this. A server using only `@cyanheads/mcp-ts-core/utils/formatting` never touches parsing code.

**At bundle time (Workers):** `build:worker` runs esbuild, which tree-shakes unused exports. Dead code eliminated from the output.

**At install time — this is where it matters.** `bun install` pulls every package in `dependencies` regardless of whether the server imports the code that uses it. The tiered strategy prevents this.

### Tier 1: Core dependencies (always installed)

In the critical path of `bootstrap()`. Every server needs these.

| Package | Used By | Notes |
|:--------|:--------|:------|
| `@modelcontextprotocol/sdk` | MCP protocol, server creation | |
| `@modelcontextprotocol/ext-apps` | MCP Apps extension | Experimental — re-evaluate if still pre-stable at 1.0 |
| `hono` | HTTP transport framework | |
| `@hono/node-server` | Hono Node.js adapter | |
| `@hono/mcp` | Streamable HTTP transport | |
| `pino` | Logger | |
| `dotenv` | Config env loading | Node-only; Workers get env from bindings |
| `jose` | JWT/JWKS auth verification | |
| `@opentelemetry/api` | Trace context extraction (requestContext, errorHandler, performance) | Lightweight API surface only, not the SDK |

**Notes:**
- `pino-pretty` is a dev/debug dependency, not Tier 1. In production (especially Workers), pretty-printing is wasteful. Make it an optional peer or keep it as a `devDependency` only.
- `dotenv` is unused in Workers (env comes from CF bindings). Acceptable in Tier 1 since every Node server needs it, but the Worker entry point should not import it.

### Tier 2: Required peer dependency

| Package | Rationale |
|:--------|:----------|
| `zod` | Servers use Zod directly for tool/resource schemas. Must share the same Zod instance for `.parse()` compatibility. |

### Tier 3: Optional peer dependencies (install what you use)

These are `peerDependencies` with `"optional": true` in `peerDependenciesMeta`. Core's utility code uses lazy dynamic `import()` — if the dep isn't installed, the import throws a clear error message telling the server author what to install.

**Telemetry** (enable with `OTEL_ENABLED=true` — already dynamically imported):

| Package | Used By |
|:--------|:--------|
| `@opentelemetry/sdk-node` | OTEL SDK initialization |
| `@opentelemetry/sdk-trace-node` | Trace exporter |
| `@opentelemetry/sdk-metrics` | Metrics exporter |
| `@opentelemetry/resources` | Resource attributes |
| `@opentelemetry/exporter-trace-otlp-http` | OTLP trace export |
| `@opentelemetry/exporter-metrics-otlp-http` | OTLP metrics export |
| `@opentelemetry/auto-instrumentations-node` | Auto-instrumentation |
| `@opentelemetry/instrumentation-pino` | Pino log correlation |
| `@opentelemetry/semantic-conventions` | Standard attributes |
| `@hono/otel` | HTTP instrumentation middleware |

**Parsing** (import from `@cyanheads/mcp-ts-core/utils/parsing`):

| Package | Used By |
|:--------|:--------|
| `js-yaml` | `yamlParser` |
| `fast-xml-parser` | `xmlParser` |
| `papaparse` | `csvParser` |
| `partial-json` | `jsonParser` (streaming/partial parse) |
| `unpdf`, `pdf-lib` | `pdfParser` |
| `chrono-node` | `dateParser` |

**Formatting:**

| Package | Used By |
|:--------|:--------|
| `diff` | `diffFormatter` |

**Security:**

| Package | Used By |
|:--------|:--------|
| `sanitize-html` | `sanitization` utility |
| `validator` | `sanitization` utility |

**Scheduling:**

| Package | Used By |
|:--------|:--------|
| `node-cron` | `scheduler` (already lazy via dynamic import) |

**Storage:**

| Package | Used By |
|:--------|:--------|
| `@supabase/supabase-js` | Supabase storage provider |

**Services:**

| Package | Used By |
|:--------|:--------|
| `openai` | OpenRouter LLM provider, Whisper STT provider |

### What a minimal server installs

```json
{
  "dependencies": {
    "@cyanheads/mcp-ts-core": "^1.0.0",
    "zod": "^4.0.0"
  }
}
```

That's it. No OTEL, no parsers, no Supabase, no OpenAI. Add deps as you add features:

```json
{
  "dependencies": {
    "@cyanheads/mcp-ts-core": "^1.0.0",
    "zod": "^4.0.0",
    "js-yaml": "^4.1.0",
    "sanitize-html": "^2.17.0",
    "validator": "^13.15.0"
  }
}
```

### Lazy import pattern (applied to all Tier 3 deps)

```ts
// Example: yamlParser.ts — only runs if someone imports this module
let yaml: typeof import('js-yaml') | undefined;

export async function parseYaml(input: string) {
  yaml ??= await import('js-yaml').catch(() => {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'Install "js-yaml" to use YAML parsing: bun add js-yaml',
    );
  });
  return yaml.load(input) as unknown;
}
```

The `node-cron` scheduler already uses this pattern. The OTEL instrumentation already uses dynamic imports. The remaining Tier 3 deps (parsing, formatting, security, storage, services) currently use static imports and need conversion before extraction.

---

## Testing

### After extraction

- **Core** has its own test suite, testing infrastructure in isolation (container, storage, transports, utils, config parsing)
- **Servers** test their definitions only — tool logic, response formatters, prompt generation
- Server tests import test utilities from core if needed (e.g., mock `sdkContext` factory)

### Server-side vitest config

```ts
// vitest.config.ts (in the server repo)
import { defineConfig } from 'vitest/config';
import coreConfig from '@cyanheads/mcp-ts-core/vitest-config'; // base config

export default defineConfig({
  ...coreConfig,
  resolve: {
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  },
});
```

The `@/` alias in server-side config points to the server's `src/`, not core's internals. Servers test their own code; core's tests live in core.

### Test helpers from core

Core should export a minimal set of test utilities:

```ts
import { createMockSdkContext, createMockAppContext } from '@cyanheads/mcp-ts-core/testing';
```

These replace the boilerplate mock setup currently duplicated in every server's test files.

---

## Agent Discovery

The primary consumer of this framework is an LLM coding agent. Discovery — knowing what's available, where to find it, and how to use it — is a first-class design concern, not an afterthought.

### The problem

In the current monolith, the agent reads `CLAUDE.md` and has the full codebase locally — Grep, Glob, LSP all work. After extraction, infrastructure lives in `node_modules/`. The agent can still read those files, but it needs to know what exists and where to look.

### Three layers of discovery

**Layer 1: Core's `CLAUDE.md` as agent reference.** Ships in the published package at the root. This is the primary orientation mechanism. The agent reads it once and understands the full surface area of the framework. Structured for consumption, not contribution — it documents how to *use* core, not how to *develop* it. Internal development instructions stay in a separate `CONTRIBUTING.md` that doesn't ship in the package.

**Layer 2: Exports catalog.** A compact, scannable reference of every subpath export — what it provides, key symbols, one-line purpose. Included as a section in core's `CLAUDE.md`. This is what the agent checks when it needs to know "where do I import X from?"

```markdown
## Exports Reference

| Subpath | Key Exports | Purpose |
|:--------|:------------|:--------|
| `@cyanheads/mcp-ts-core/bootstrap` | `bootstrap`, `BootstrapOptions`, `ServerHandle` | Node.js server entry point |
| `@cyanheads/mcp-ts-core/worker` | `createWorkerHandler`, `CloudflareBindings` | Cloudflare Workers entry point |
| `@cyanheads/mcp-ts-core/tools` | `ToolDefinition`, `ToolAnnotations` | Tool definition type and factory |
| `@cyanheads/mcp-ts-core/resources` | `ResourceDefinition` | Resource definition type and factory |
| `@cyanheads/mcp-ts-core/prompts` | `PromptDefinition` | Prompt definition type |
| `@cyanheads/mcp-ts-core/tasks` | `TaskToolDefinition`, `RequestTaskStore` | Async task tool definitions |
| `@cyanheads/mcp-ts-core/errors` | `McpError`, `JsonRpcErrorCode` | Error types and codes |
| `@cyanheads/mcp-ts-core/container` | `Container`, `token` | DI container and token factory |
| `@cyanheads/mcp-ts-core/tokens` | `AppConfig`, `StorageService`, `LlmProvider`, ... | Core DI tokens |
| `@cyanheads/mcp-ts-core/auth` | `withToolAuth`, `withResourceAuth` | Auth wrappers for tool/resource logic |
| `@cyanheads/mcp-ts-core/storage` | `StorageService` | Tenant-scoped storage abstraction |
| `@cyanheads/mcp-ts-core/utils/logger` | `logger` | Pino structured logger |
| `@cyanheads/mcp-ts-core/utils/requestContext` | `requestContextService`, `RequestContext` | Request tracing context |
| `@cyanheads/mcp-ts-core/utils/errorHandler` | `ErrorHandler` | `tryCatch` for service-level recovery |
| `@cyanheads/mcp-ts-core/utils/formatting` | `markdown`, `MarkdownBuilder` | Markdown response builder |
| `@cyanheads/mcp-ts-core/utils/parsing` | `yamlParser`, `csvParser`, `xmlParser`, ... | Content parsers (lazy, Tier 3 deps) |
| `@cyanheads/mcp-ts-core/utils/security` | `sanitization`, `rateLimiter`, `idGenerator` | Security utilities (lazy, Tier 3 deps) |
| `@cyanheads/mcp-ts-core/utils/network` | `fetchWithTimeout` | HTTP client with timeout/abort |
| `@cyanheads/mcp-ts-core/utils/pagination` | `extractCursor`, `paginateArray` | Opaque cursor pagination |
| `@cyanheads/mcp-ts-core/utils/runtime` | `runtimeCaps` | Runtime feature detection (Node vs Workers) |
| `@cyanheads/mcp-ts-core/utils/scheduling` | `scheduler` | Cron scheduling (lazy, Tier 3 dep) |
| `@cyanheads/mcp-ts-core/utils/types` | `isErrorWithCode`, `isRecord` | Type guard utilities |
| `@cyanheads/mcp-ts-core/testing` | `createMockSdkContext`, `createMockAppContext` | Test helpers |
```

Initially hand-maintained. Can be auto-generated from TypeScript source (JSDoc + export names from each subpath entry point) once exports stabilize.

**Layer 3: Type signatures on demand.** When the agent needs exact API details — "what fields does `BootstrapOptions` have?" — it reads the `.d.ts` file from `node_modules`. The exports catalog tells it which subpath to look at; the `.d.ts` has the full contract:

```
node_modules/@cyanheads/mcp-ts-core/dist/bootstrap.d.ts
```

No special tooling — standard file reading that already works.

### Agent workflow on a downstream server

1. Read the server's `CLAUDE.md` → sees pointer to core's reference
2. Read `node_modules/@cyanheads/mcp-ts-core/CLAUDE.md` → gets the exports catalog, patterns, contracts
3. For exact signatures, read specific `.d.ts` files from `node_modules/@cyanheads/mcp-ts-core/dist/`
4. For common tasks, invoke skills (`/add-tool`, `/add-resource`, `/setup`, etc.) — see Agent Skills
5. For server-specific code, use standard Grep/Glob/LSP on the server's `src/`

---

## CLAUDE.md Management

Two distinct documents serve different audiences.

### Core's `CLAUDE.md` (ships in the package)

Consumer-facing reference. Structured for an LLM agent working on a downstream server. Contains:

- **Exports Reference** — the catalog table above (Layer 2)
- **Patterns** — how to define tools/resources/prompts, context objects, error handling, auth wrappers
- **Contracts** — `ToolDefinition`, `ResourceDefinition`, `PromptDefinition` shapes; `bootstrap()` / `createWorkerHandler()` options
- **Error codes** — `JsonRpcErrorCode` table with when-to-use guidance
- **DI** — container API, core tokens, how to register server-specific services
- **Common imports** — the 10 most-used import lines, copy-paste ready

Does **not** contain: internal development instructions, contribution guide, CI setup, release process. Those live in `CONTRIBUTING.md` in the repo (not shipped in the package).

### Core's `CONTRIBUTING.md` (repo only, not shipped)

Internal development guide for working on core itself. Contains: directory structure internals, how to add new subpath exports, test infrastructure, release process, pre-extraction cleanup notes.

### Server's `CLAUDE.md`

```markdown
# Agent Protocol — [Server Name]

## Core Framework

This server is built on `@cyanheads/mcp-ts-core`. For infrastructure
documentation (exports reference, tool/resource/prompt contracts, DI,
transports, storage, utils, auth, error handling):

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

Read that file for the exports catalog and common patterns.
Only read it once per session — the content is stable between updates.

## Server-Specific

[Domain instructions, tool patterns, service integrations, server config]
```

The server's `CLAUDE.md` focuses on what's unique — its domain, its tools, its services. Infrastructure docs live in one place and update with `bun update @cyanheads/mcp-ts-core`.

---

## Agent Skills

[Agent Skills](https://agentskills.io/specification) is an open standard (developed by Anthropic, adopted by 25+ tools including Claude Code, GitHub Copilot, OpenAI Codex, Gemini CLI, Cursor) for packaging modular, reusable agent capabilities. Each skill is a directory with a `SKILL.md` file — YAML frontmatter for discovery + markdown body for instructions.

Skills complement Discovery (knowing what exists) and CLAUDE.md (knowing the patterns) with executable recipes for common tasks. Core ships skill definitions that downstream servers inherit.

### Why skills over CLAUDE.md for workflows

| Concern | CLAUDE.md | Skills |
|:--------|:----------|:-------|
| Loading | Always in context | Progressive disclosure — only name + description loaded at startup (~50 tokens/skill), full instructions loaded on activation |
| Scope | General patterns and contracts | Specific task workflows |
| Invocation | Passive (agent reads once) | On-demand (`/skill-name`) or auto-triggered by description match |
| Portability | Agent-specific | Open standard — same skill works across Claude Code, Copilot, Codex, etc. |

### Canonical location

Skills live at `.agents/skills/` — the cross-platform standard location recognized by all compatible agents. Agent-specific directories (`.claude/skills/`, `.codex/skills/`, etc.) are populated by the `/setup` skill as part of first-time project setup.

```
.agents/
  skills/
    setup/
      SKILL.md
    add-tool/
      SKILL.md
      assets/
        tool-template.ts     # skeleton code
    add-resource/
      SKILL.md
      assets/
        resource-template.ts
    ...
```

### What ships with core

| Skill | Description (agent-facing trigger) | What it does |
|:------|:-----------------------------------|:-------------|
| `setup` | First-time project setup for an MCP server using `@cyanheads/mcp-ts-core` | Detects installed agents, copies/symlinks skills to agent-specific directories (`.claude/skills/`, `.codex/skills/`, etc.). Sets up `.agents/skills/` with core skills. Creates initial `CLAUDE.md` from template. Validates project structure. |
| `add-tool` | Scaffold a new MCP tool definition | Creates `.tool.ts` with metadata, Zod schemas with `.describe()`, typed logic, auth wrapper, response formatter. Registers in `definitions/index.ts`. |
| `add-task-tool` | Scaffold an async MCP task tool for long-running operations | Same as `add-tool` but with `.task-tool.ts` suffix, `TaskToolDefinition` type, `taskHandlers` (create/get/getResult), background work pattern. |
| `add-resource` | Scaffold a new MCP resource definition | Creates `.resource.ts` with URI template, params/output schemas, logic, optional `list()` with pagination. Registers in `definitions/index.ts`. |
| `add-prompt` | Scaffold a new MCP prompt template | Creates `.prompt.ts` with arguments schema and `generate` function. Registers in `definitions/index.ts`. |
| `add-service` | Scaffold a new service integration with DI | Creates `services/[name]/` with `core/` (interface), `providers/` (implementation), `types.ts`. Adds DI token, registers in container. |
| `devcheck` | Lint, format, typecheck, and audit the project | Runs `bun run devcheck`. Interprets output, fixes issues, re-runs until clean. |
| `migrate-imports` | Migrate a template fork to use `@cyanheads/mcp-ts-core` | Rewrites `@/` imports to `@cyanheads/mcp-ts-core/` subpaths using the mapping table. Validates no internal paths remain. |

### SKILL.md format

Each skill follows the [Agent Skills specification](https://agentskills.io/specification). The `name` field must match the parent directory name.

```markdown
---
name: add-tool
description: >
  Scaffold a new MCP tool definition. Use when the user asks to add a tool,
  create a new tool, or implement a new capability.
metadata:
  author: cyanheads
  version: "1.0"
---

## Context

[What the agent needs to know — imports, file conventions, key types.
Reference core's CLAUDE.md for contracts rather than duplicating them.]

## Steps

1. [Concrete, ordered instructions]
2. [Each step is actionable — no ambiguity]
3. [Include the specific files to create/modify]

## Template

[The skeleton code to generate, with placeholders marked as `{{TOOL_NAME}}` etc.]

## Checklist

Every skill MUST include a checklist. This is the acceptance criteria — the
skill is not complete until every item passes.

- [ ] File created with correct suffix (`.tool.ts` / `.task-tool.ts` / etc.)
- [ ] All Zod schema fields have `.describe()` annotations
- [ ] Auth wrapper applied with `withToolAuth`
- [ ] Registered in `definitions/index.ts` barrel
- [ ] `bun run devcheck` passes
- [ ] Smoke-tested with `bun run dev:stdio` or `dev:http`
```

**The Checklist section is mandatory.** Every skill must end with a markdown checklist of specific, verifiable goals. The checklist serves as both acceptance criteria for the agent and a progress tracker for the user. The agent must not consider a skill complete until every checkbox could be checked.

### The `/setup` skill

The setup skill is special — it's the entry point for a new project and handles environment adaptation. When invoked:

1. **Detect environment.** Check which agents are available (Claude Code → `.claude/`, Codex → `.codex/`, Copilot → `.github/`, etc.)
2. **Install skills.** Copy core skills from `node_modules/@cyanheads/mcp-ts-core/skills/` to `.agents/skills/` (canonical) and symlink into each detected agent's skill directory
3. **Generate CLAUDE.md.** Create the server's `CLAUDE.md` from a template, with the core framework pointer and server-specific sections
4. **Validate structure.** Check that `src/mcp-server/tools/definitions/`, `src/mcp-server/resources/definitions/`, and `src/mcp-server/prompts/definitions/` exist with their barrel files
5. **Run devcheck.** Verify the project builds and passes all checks

**Setup checklist:**

- [ ] `.agents/skills/` populated with core skills
- [ ] Agent-specific skill directories created and symlinked (`.claude/skills/`, etc.)
- [ ] `CLAUDE.md` created with core framework pointer
- [ ] Project structure validated (definitions directories, barrel files)
- [ ] `bun run devcheck` passes

### Distribution

Core ships skills in a `skills/` directory within the published package:

```
node_modules/@cyanheads/mcp-ts-core/skills/
  setup/SKILL.md
  add-tool/SKILL.md
  add-tool/assets/tool-template.ts
  add-resource/SKILL.md
  add-resource/assets/resource-template.ts
  ...
```

The `/setup` skill handles copying these to `.agents/skills/` and symlinking into agent-specific directories. After setup:

```
.agents/skills/                    # canonical, cross-platform
  setup/SKILL.md
  add-tool/SKILL.md
  add-tool/assets/tool-template.ts
  ...
.claude/skills/                    # symlinks (if Claude Code detected)
  setup -> ../../.agents/skills/setup
  add-tool -> ../../.agents/skills/add-tool
  ...
```

Servers can override any skill by replacing the directory in `.agents/skills/` with a local version. The symlinks in agent-specific directories follow automatically.

### Server-specific skills

Servers add their own skills alongside core's in `.agents/skills/`:

```
.agents/
  skills/
    add-tool/SKILL.md          # from core
    add-resource/SKILL.md      # from core
    devcheck/SKILL.md          # from core
    query-pubmed/SKILL.md      # server-specific
    update-citations/SKILL.md  # server-specific
```

Server-specific skills follow the same `SKILL.md` format with mandatory checklist. They can reference both core's `CLAUDE.md` and the server's `CLAUDE.md` for context.

### Progressive disclosure

The Agent Skills spec uses three-tier loading to keep context efficient:

| Tier | What loads | When | Token cost |
|:-----|:-----------|:-----|:-----------|
| Discovery | `name` + `description` from frontmatter only | Agent startup | ~50 tokens/skill |
| Activation | Full `SKILL.md` body | Agent decides skill is relevant, or user invokes `/skill-name` | ~500–5,000 tokens |
| Execution | Files from `scripts/`, `references/`, `assets/` | Skill instructions reference them | ~2,000+ tokens/resource |

With 10 skills installed, that's ~500 tokens at startup. The agent knows what it can do without carrying the full instructions in context. This is why skills scale better than cramming workflows into CLAUDE.md.

---

## Pre-extraction Cleanup

Issues to fix in the current codebase before extracting:

### DI / wiring

> **Already resolved:** `PromptDefinitions` multi-token exists ([tokens.ts:60-61](src/container/core/tokens.ts#L60-L61)). `PromptRegistry` already takes definitions via constructor injection ([prompt-registration.ts:19](src/mcp-server/prompts/prompt-registration.ts#L19)). Prompts are multi-registered and resolved via DI in [mcp.ts:49-52,67](src/container/registrations/mcp.ts#L49-L52).

| Issue | Location | Fix |
|:------|:---------|:----|
| `registerMcpServices()` imports definition barrels directly | [mcp.ts:23,25,30](src/container/registrations/mcp.ts#L23-L30) | Accept `ServerDefinitions` parameter instead of static imports. |
| `worker.ts` has hardcoded binding keys | [worker.ts:86-106](src/worker.ts#L86-L106) | Extract `CoreBindingMappings` as a const; `createWorkerHandler` merges with `extraBindings`. |
| `worker.ts` `CloudflareBindings` has index signature | [worker.ts:62](src/worker.ts#L62) | Remove `[key: string]: unknown` so servers must explicitly declare extra bindings via `extends`. |

### Lazy dependency conversion (Tier 3 deps)

All Tier 3 deps that currently use static `import` need conversion to lazy dynamic `import()` with cached module reference and actionable error on missing dep. Already lazy: `node-cron` (scheduler), OTEL SDK packages (instrumentation.ts).

| File | Static dep to make lazy |
|:-----|:------------------------|
| [yamlParser.ts](src/utils/parsing/yamlParser.ts) | `js-yaml` |
| [xmlParser.ts](src/utils/parsing/xmlParser.ts) | `fast-xml-parser` |
| [csvParser.ts](src/utils/parsing/csvParser.ts) | `papaparse` |
| [jsonParser.ts](src/utils/parsing/jsonParser.ts) | `partial-json` |
| [pdfParser.ts](src/utils/parsing/pdfParser.ts) | `unpdf`, `pdf-lib` |
| [dateParser.ts](src/utils/parsing/dateParser.ts) | `chrono-node` |
| [diffFormatter.ts](src/utils/formatting/diffFormatter.ts) | `diff` |
| [sanitization.ts](src/utils/security/sanitization.ts) | `sanitize-html`, `validator` |
| [httpTransport.ts](src/mcp-server/transports/http/httpTransport.ts) | `@hono/otel` — make conditional on OTEL enabled |
| [openrouter.provider.ts](src/services/llm/providers/openrouter.provider.ts) | `openai` |
| [core.ts](src/container/registrations/core.ts) | `@supabase/supabase-js` (runtime import, not just type) |

### Coupling to fix

| Issue | Detail | Resolution |
|:------|:-------|:-----------|
| `logger.ts` imports `sanitization.ts` | [logger.ts:13](src/utils/internal/logger.ts#L13) pulls `sanitize-html` + `validator` into the bootstrap critical path. But the logger only calls `sanitization.getSensitivePinoFields()` ([logger.ts:82,173](src/utils/internal/logger.ts#L82)) — a static `string[]` for Pino's `redact.paths`. | Inline the field list as a `const` array in `logger.ts`. Remove the import. This fully eliminates the coupling. |
| `openrouter.provider.ts` imports `sanitization.ts` | [openrouter.provider.ts:17](src/services/llm/providers/openrouter.provider.ts#L17). Since the LLM provider is already Tier 3 (depends on `openai`), this doesn't change tiering. | Convert to lazy import alongside the `openai` dep, or inline the specific sanitization calls used. |
| `pdf-lib` in `dependencies` | Used by `pdfParser.ts` (PDF creation/modification alongside `unpdf` for extraction). | Both become Tier 3 optional peers — only needed if the server imports `pdfParser`. |

---

## Versioning Strategy

- `@cyanheads/mcp-ts-core` follows semver strictly
- Breaking changes to `ToolDefinition`, `ResourceDefinition`, DI container API, bootstrap options, or subpath export names = major bump
- New utils, formatters, storage providers, optional features = minor bump
- Bug fixes = patch

Pin downstream servers to `^major` so they get minor/patch updates automatically but opt into breaking changes explicitly.

---

## Open Questions

### Resolved

1. **Service interfaces in core?** Deferred. Start with zero service interfaces in core. Promote to core only when two or more servers share the same interface — promoting is a minor bump, demoting is breaking. (Updated from original "yes" — see item 7 below.)

2. **All storage providers in core?** Yes. The runtime serverless whitelist already gates what loads. Splitting into separate packages adds coordination overhead with no real benefit since heavy deps are optional.

3. **Config extension pattern?** Separate schemas, not merged. Core validates infrastructure config. Servers validate their own domain config with their own Zod schema. No `defineConfig()` helper needed. (See Config Extension section.)

4. **CLAUDE.md management?** Core ships a `CLAUDE.md` in the package. Server's `CLAUDE.md` references it and adds server-specific instructions. Claude reads from `node_modules/`. (See CLAUDE.md Management section.)

5. **Core's `package.json` identity.** The config module derives `mcpServerName`/`mcpServerVersion` from `package.json` via import assertion ([config/index.ts:16](src/config/index.ts#L16)). After extraction, core's `package.json` says `@cyanheads/mcp-ts-core`. Resolution: `bootstrap()` accepts optional `name`/`version` which override config before DI registration. Precedence: `bootstrap({ name })` > `MCP_SERVER_NAME` env var > core's `package.json`. The config module's `parseConfig` gains an `overrides` parameter for this. (See Bootstrap API section.)

6. **Scheduled worker handlers.** Callback pattern via `onScheduled` in `WorkerOptions`. Signature includes `ExecutionContext` so servers can use `ctx.waitUntil()` for background work. (See Worker Factory section.)

### Open

1. **Exports catalog format.** Should the exports reference in core's `CLAUDE.md` be hand-maintained markdown or auto-generated from TypeScript source? Hand-maintained is simpler to start; generated (via a build step that extracts JSDoc + export names from each subpath entry point) can't drift. Start with markdown, graduate to generation once exports stabilize.

2. **`examples/` in the published package.** Should the example definitions ship in the npm tarball or be excluded via `files`? They're useful as runnable reference, but add package size. Leaning toward exclude — the reference template repo is the user-facing example; `examples/` exists for core's own CI.

3. **`ServerHandle` surface area.** `bootstrap()` currently returns only `shutdown()`. Downstream servers may need `container` access for integration testing, health checks, or programmatic embedding. Consider exposing `container: Container` (read-only) on `ServerHandle`.

4. **`services` callback async support.** The current signature `(container: Container) => void` blocks server-specific services that need async init (DB connections, API client warm-up, remote config). Should be `(container: Container) => void | Promise<void>`.

5. **`extraBindings` typing.** `Array<[string, string]>` loses type information. A generic `createWorkerHandler<B extends CoreBindings>` could enforce the mapping at compile time. Possibly overengineered for 0.1 — note as a refinement for 1.0.

### Resolved (post-review)

6. **`@/` alias in server code.** After extraction, `@/` resolves to the server's `src/` only. Core imports use `@cyanheads/mcp-ts-core/*` subpaths. Two import styles in one file is fine and self-documenting — immediately clear which code is "mine" vs. "framework." No edge cases: server code never legitimately reaches into core internals.

7. **Service interfaces in core.** Defer. Start with zero service interfaces (`ILlmProvider`, `ISpeechProvider`, `IGraphProvider`) in core. Pull them in only when two or more servers share the same interface. Promoting is a minor bump; demoting is a breaking change.

8. **Template repo identity after extraction.** The `mcp-ts-template` npm package gets a final major version pointing users to the new `@cyanheads/mcp-ts-core` architecture. The GitHub repo transforms into core. A new thin `mcp-ts-template` reference repo is created as a consumer of core (see Repo Strategy).

---

## Execution Sequence

1. **Pre-extraction cleanup (DI/wiring).** Fix the 2 remaining DI issues (parameterize `registerMcpServices`, extract worker binding mappings) and the `CloudflareBindings` index signature. Inline the logger's `sanitization.getSensitivePinoFields()` call. Run devcheck, commit. Small, non-breaking changes that align the code with the extraction boundary.

2. **Lazy dependency conversion.** Convert all Tier 3 static imports to lazy dynamic `import()` (see the conversion table). Run devcheck + full test suite, commit. These changes are backwards-compatible — the project still works as a standalone server.

3. **Transform the repo.** This is the core of the extraction:
   - Rename package to `@cyanheads/mcp-ts-core` in `package.json`
   - Move template definitions (`tools/definitions/`, `resources/definitions/`, `prompts/definitions/`) to `examples/`
   - Implement `bootstrap()` and `createWorkerHandler()` as the public entry points
   - Convert current `index.ts` and `worker.ts` into example entry points under `examples/`
   - Add `exports` field with all subpath exports
   - Configure `peerDependencies` / `peerDependenciesMeta` for tiered deps
   - Write the consumer-facing `CLAUDE.md` with exports catalog (see Agent Discovery)
   - Write agent skill definitions as `SKILL.md` directories in `skills/` per the [Agent Skills spec](https://agentskills.io/specification) (see Agent Skills)
   - Build and verify the package compiles, examples work against the exports

4. **Validate with examples.** The `examples/` directory acts as an integration test — a thin server consuming core through its public exports, not internal paths. If the examples can't cleanly use the package API, the boundary is wrong. Run devcheck + full test suite against the examples.

5. **Publish `@cyanheads/mcp-ts-core@0.1.0`.** Publish to npm for external iteration.

6. **Create thin `mcp-ts-template` reference repo.** A new repo that depends on `@cyanheads/mcp-ts-core` and demonstrates the scaffold pattern. This is what `create-mcp-server` will eventually generate from. The current `mcp-ts-template` npm package gets a final major bump pointing users to the new architecture.

7. **Migrate downstream servers one at a time.** Start with the least-diverged server as proof of concept. Use the mechanical migration pattern (see Migration Path). Run devcheck on each.

8. **Cut 1.0.** Once 2-3 servers are running on core without issues, promote to stable.

9. **(Deferred) Build `create-mcp-server`.** Implement the scaffolding CLI using the reference template as the source for generated files. Not required for initial extraction — servers can be scaffolded from the reference template repo. Ship when core is stable.
