# 01 — Architecture

> Package boundary, repo strategy, versioning.

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
  app.ts                   # createApp() — main entry point for Node servers
  worker.ts                # createWorkerHandler() — factory for Cloudflare Workers
examples/                  # Template definitions (tools, resources, prompts) for CI and reference
```

Service interfaces (`ILlmProvider`, `ISpeechProvider`, `IGraphProvider`) are deferred — they start in downstream servers and get promoted to core only when shared by two or more servers.

Also ships:
- Base `tsconfig.json` (downstream extends it)
- Base `vitest.config.ts`
- Shared ESLint config
- `CLAUDE.md` — consumer-facing agent reference with exports catalog (see [05-agent-dx.md](05-agent-dx.md))
- `skills/` — Agent Skills definitions (see [05-agent-dx.md](05-agent-dx.md))

### Per-server (what stays in each MCP server repo)

```
src/
  mcp-server/
    tools/definitions/     # The actual tools
    resources/definitions/  # The actual resources
    prompts/definitions/    # The actual prompts
  services/                # Domain-specific integrations (providers, not interfaces)
  config/                  # Server-specific env vars (own Zod schema, not merged with core)
  index.ts                 # Entry point: imports core createApp, passes definitions
  worker.ts                # Worker entry point: imports core factory, passes definitions
package.json
CLAUDE.md                  # Extends core protocol with server-specific instructions
README.md
```

---

## Repo Strategy

The current `mcp-ts-template` repo transforms in-place into `@cyanheads/mcp-ts-core`. The extraction is a subtraction (remove app layer), not a copy (duplicate infra to a new repo).

**Why transform in-place, not create a new repo:**

| Concern | New repo | Transform in-place |
|:--------|:---------|:-------------------|
| Git history | Lost for all infrastructure code | Fully preserved |
| Risk of missed files | Real — "did I copy everything?" | Zero — you're removing, not copying |
| CI continuity | New repo needs full CI setup | Existing CI continues working |
| Transition period | Two repos exist in parallel | Single repo, clean rename |

**Repos after extraction:**

| Repo | Package | Purpose |
|:-----|:--------|:--------|
| `cyanheads/mcp-ts-core` (renamed from `mcp-ts-template`) | `@cyanheads/mcp-ts-core` | Infrastructure package |
| `cyanheads/mcp-ts-template` (new, thin) | — (GitHub template, not published to npm) | Reference server, source for `create-mcp-server` |
| `cyanheads/pubmed-mcp-server` etc. | per-server | Downstream servers, depend on core |

> **⚠️ USER ACTION REQUIRED — The rename, repo creation, and npm deprecation below are public-facing operations. An agent must never perform these autonomously. Prepare artifacts (code, configs, changelogs), then stop and ask the user to execute.**

**The rename:** GitHub supports repo renames with automatic redirects. `cyanheads/mcp-ts-template` → `cyanheads/mcp-ts-core`. The old npm package `mcp-ts-template` gets a final major version with a deprecation notice pointing to `@cyanheads/mcp-ts-core`.

**Template definitions don't disappear.** They move to `examples/` within core. They serve as integration tests — a thin server consuming core through its public exports, validated in CI. The separate `mcp-ts-template` reference repo is created after core is stable.

**Why separate repos for core and template:**
- Different release cadences — core is versioned infrastructure, template is a starting point
- No workspace linking complexity — `bun add @cyanheads/mcp-ts-core` is the entire integration story
- The reference template's CI runs against the published core package, catching breaks on the real dependency path

---

## Versioning Strategy

- `@cyanheads/mcp-ts-core` follows semver strictly
- Breaking changes to `ToolDefinition`, `ResourceDefinition`, `createApp` options, or subpath export names = major bump
- New utils, formatters, storage providers, optional features = minor bump
- Bug fixes = patch

Pin downstream servers to `^major` so they get minor/patch updates automatically but opt into breaking changes explicitly.
