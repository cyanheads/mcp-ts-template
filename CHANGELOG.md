# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.0-beta.4] - 2026-03-11

Wires new-style `resource()` and `prompt()` builders into their registries, adds `task: true` auto-task support for new-style tools, implements `checkScopes()` for dynamic auth, and defaults `tenantId` to `'default'` in stdio mode so `ctx.state` works without auth.

### Added

- **`createApp()` options**: `CreateAppOptions` and `CoreServices` interfaces exported from `src/app.ts`. Accepts `tools`, `resources`, `prompts`, `setup`, `name`, and `version` — consumers can override definition arrays and hook into server lifecycle.
- **Auto-task tool registration**: New-style tools with `task: true` are automatically registered via the experimental Tasks API. The framework manages the full lifecycle — create task, background handler execution, progress reporting, cancellation polling, and result/error storage.
- **`checkScopes()` public API** (`src/mcp-server/transports/auth/lib/checkScopes.ts`): Dynamic scope checking for new-style handlers. Wraps `withRequiredScopes` with `Context`-based interface for runtime-dependent scopes (e.g., `team:${input.teamId}:write`).
- **`newResourceHandlerFactory.ts`**: Handler factory for new-style resource definitions — creates `Context` with `ctx.uri`, checks inline auth, validates params via Zod, formats response, catches errors.

### Changed

- **`ResourceRegistry`**: Now accepts optional `ResourceHandlerFactoryServices` (logger + storage). Detects new-style definitions via `isNewResourceDefinition()` type guard and routes to `registerNewResource()` which uses `ResourceTemplate` and `createNewResourceHandler()`.
- **`PromptRegistry`**: Detects new-style definitions via `isNewPromptDefinition()` type guard and routes to `registerNewPrompt()` which reads `args` instead of `argumentsSchema`.
- **`ToolRegistry`**: New-style tools with `task: true` routed to `registerAutoTaskTool()` instead of `registerNewTool()`.
- **`createContext()`**: Defaults `tenantId` to `'default'` when not set, so `ctx.state` works in stdio mode without JWT auth.
- **`createApp()`**: Passes `{ logger, storage }` to both `ToolRegistry` and `ResourceRegistry` constructors. Runs `setup()` callback after core services, before registry construction.
- **Task conformance test**: Updated `createTaskHarness()` to pass `{ logger, storage }` services to `ToolRegistry` and `ResourceRegistry`.
- **Auth factory test**: Fixed JWT strategy tests to provide `mcpAuthSecretKey` config value, preventing runtime errors.

### Updated

- **`core-extraction/` docs**: Updated Phase 3 checklists in `05-agent-dx.md`, `09-execution.md`, `12-developer-api.md`, `13-init-cli.md`, and `README.md` to reflect completed registry wiring, auto-task support, `checkScopes`, stdio tenantId default, templates, and skills.

---

## [0.1.0-beta.3] - 2026-03-11

Adds the `templates/` directory for the `init` CLI, simplifies the init design to a one-time bootstrap (no idempotency), and reclassifies the `migrate-imports` skill as internal.

### Added

- **`templates/` directory**: Complete set of project scaffold templates for the `init` CLI — `CLAUDE.md`, `package.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `.env.example`, `src/index.ts`, and barrel `index.ts` files for tools/resources/prompts definitions.
- **Standalone config templates**: `tsconfig.json`, `biome.json`, and `vitest.config.ts` templates are self-contained — no `extends` from core, so they work before `bun install`.

### Changed

- **`core-extraction/13-init-cli.md`**: Simplified init CLI from idempotent re-runnable command to one-time bootstrap. Removed `--force` flag, added `[name]` argument for package name substitution. Config templates are now standalone. Skill updates after `bun update` delegated to the `maintenance` skill.
- **`skills/migrate-imports/SKILL.md`**: Reclassified from `audience: external` to `audience: internal` — this skill is only needed for legacy template forks, not new projects created via `init`.
- **`skills/release/SKILL.md`**: Minor formatting cleanup.
- **`skills/setup/SKILL.md`**: Minor formatting cleanup.
- **`tsconfig.json`**: Added `templates` to `exclude` array to prevent TypeScript from checking template files.

---

## [0.1.0-beta.2] - 2026-03-11

Adds the `skills/` directory with 12 agent skill definitions following the [Agent Skills specification](https://agentskills.io/specification), and updates the agent DX plan to separate the `init` CLI from the `/setup` skill.

### Added

- **`skills/` directory**: 12 skill definitions (README + 11 SKILL.md files) covering the full development workflow. Each skill declares `metadata.audience` (`external` or `internal`) and `metadata.version` for update tracking.
  - **External skills** (copied to consumer projects by `init`): `setup`, `add-tool`, `add-resource`, `add-prompt`, `add-service`, `devcheck`, `migrate-imports`, `maintenance`
  - **Internal skills** (core package development only): `add-export`, `add-provider`, `release`
- **`skills/README.md`**: Documents the three-tier skill distribution model (package → project → agent) and versioning strategy.
- **`maintenance` skill**: New skill for syncing skills and dependencies after package updates — covers Tier 1→2 and Tier 2→3 sync workflows.

### Changed

- **`core-extraction/05-agent-dx.md`**: Separated `init` CLI (executable code that copies files) from `/setup` skill (pure text for agent orientation). Updated skill distribution to three-tier model. Clarified `metadata.version` comparison for skill updates. Updated skill count from 11 to 12. Added `init` CLI checklist items.

---

## [0.1.0-beta.1] - 2026-03-10

First pre-release on the `@cyanheads/mcp-ts-core` extraction path. Removes the DI container, introduces direct construction via `createApp()`, converts all third-party imports to lazy dynamic loading, adds the new-style definition API (`tool()`, `resource()`, `prompt()` builders with unified `Context`), and adds comprehensive conformance and integration test suites.

### Added

- **New-style definition builders**: `tool()`, `resource()`, `prompt()` builder functions producing `NewToolDefinition`, `NewResourceDefinition`, and `NewPromptDefinition`. Simplified field names (`handler`/`input`/`output`/`format`/`auth`/`task`) replace the legacy `logic`/`inputSchema`/`outputSchema`/`responseFormatter`/`withToolAuth` pattern.
- **Unified `Context` interface** (`src/context.ts`): Single object for all handler dependencies — `ctx.log` (request-scoped logging), `ctx.state` (tenant-scoped storage), `ctx.elicit` (user prompting), `ctx.sample` (LLM completion), `ctx.signal` (cancellation), `ctx.progress` (task reporting). Replaces the split `appContext` + `sdkContext` pattern.
- **`createContext()` factory** (`src/context.ts`): Internal constructor that wires `ContextLogger`, `ContextState`, and `ContextProgress` implementations from `RequestContext`, `StorageService`, and `RequestTaskStore`.
- **New-style handler factory** (`src/mcp-server/tools/utils/newToolHandlerFactory.ts`): `createNewToolHandler()` builds SDK-compatible tool callbacks from `NewToolDefinition` — creates `Context`, checks inline `auth` scopes, validates input, measures execution, formats response, catches errors.
- **`createMockContext()` test utility** (`src/testing/index.ts`): Mock `Context` for testing handlers directly — stubbed `log`, in-memory `state`, optional `elicit`/`sample`/`progress` mocks. Configurable via `MockContextOptions`.
- **`src/app.ts` composition root**: `createApp()` factory constructs all services in dependency order and returns an `AppHandle` with `createServer` (bound factory) and `transportManager`. Replaces the DI container.
- **`McpServerDeps` interface**: Explicit dependency struct for `createMcpServerInstance()` — config, toolRegistry, resourceRegistry, promptRegistry, rootsRegistry.
- **`src/utils/parsing/thinkBlock.ts`**: Shared `thinkBlockRegex` constant extracted from four parsers that previously duplicated the pattern.
- **Conformance test suite**: 122 tests across 14 test files plus 2 helpers (`RecordingTransport`, low-level raw transport helpers). Covers cancellation, completions, elicitation, sampling, roots, logging, pagination, progress, tasks, subscriptions, list-changed notifications, protocol ordering, version negotiation, and JSON-RPC edge cases.
- **Integration test suite**: 4 test files plus 2 helpers for black-box transport validation. Spawns the built server as a subprocess and exercises stdio, HTTP, JWT auth, and stateful session management over real transport channels.
- **`vitest.integration.ts`**: Separate Vitest config for integration tests (sequential execution, 30s timeouts).
- **`scripts/test-report.ts`**: CLI script that runs all test suites, collects JSON output, and generates a self-contained HTML dashboard report with `--open` and `--suite` filtering.
- **New package.json scripts**: `test:integration`, `test:report`, `test:report:open`, `test:ui` (Vitest UI for conformance).
- **`docs/conformance-test-plan.md`**: MCP conformance test plan targeting spec 2025-06-18, updated with full implementation status and SDK limitation notes.

### Changed

- **Template tools migrated to new-style API**: All 6 template tools (`template_echo_message`, `template_cat_fact`, `template_madlibs_elicitation`, `template_code_review_sampling`, `template_image_test`, `template_data_explorer`) rewritten using the `tool()` builder with `handler(input, ctx)` instead of legacy `logic(input, appCtx, sdkCtx)`.
- **`ToolRegistry` supports new-style definitions**: Constructor now accepts optional `HandlerFactoryServices` (logger + storage). `registerAll()` auto-detects new-style (`handler` + `input`), legacy (`logic` + `inputSchema`), and task (`taskHandlers`) definitions, routing each to the appropriate registration path.
- **`src/app.ts`**: Passes `{ logger, storage }` to `ToolRegistry` constructor for new-style handler factory.
- **`CLAUDE.md`**: Complete rewrite targeting the `@cyanheads/mcp-ts-core` public API — new exports reference, builder signatures, `Context` documentation, service patterns, error codes, auth, Workers, and testing guide.
- **`README.md`**: Updated for `@cyanheads/mcp-ts-core` package identity — new hero example, builder API docs, Context reference, subpath exports, server structure, and configuration table.
- **Test suite updated for new-style definitions**: All tool tests use `createMockContext()` and call `handler(input, ctx)` directly. Fuzz tests detect both old (`inputSchema`/`logic`) and new (`input`/`handler`) shapes. Schema snapshot and compatibility tests handle both `inputSchema` and `input` fields.
- **Lazy dependency loading (Phase 2)**: All 11 third-party dependencies converted from top-level static imports to lazy dynamic `import()` with cached singleton patterns and clear `McpError(ConfigurationError)` messages when a dep is missing. Affected modules: `yamlParser`, `xmlParser`, `csvParser`, `jsonParser`, `pdfParser`, `dateParser`, `diffFormatter`, `sanitization`, `httpTransport` (`@hono/otel`), `openrouter.provider` (`openai`), `app.ts` (`@supabase/supabase-js`).
- **Async API surface**: All parser `parse()` methods, `diffFormatter` methods, and `sanitization` methods are now `async` (return `Promise`) as a consequence of lazy loading.
- **`createApp()` is now async**: Returns `Promise<AppHandle>`. Entry points (`src/index.ts`, `src/worker.ts`) updated with `await`.
- **`createHttpApp()` is now async**: `@hono/otel` middleware loaded conditionally inside the OTel-enabled guard.
- **`src/config/index.ts`**: `mcpHttpPort` minimum changed from 1 to 0 (allows ephemeral port assignment for testing).
- **`src/index.ts`**: `createApp()` call uses `await`.
- **`src/worker.ts`**: `createApp()` and `createHttpApp()` calls use `await`.
- **`src/mcp-server/server.ts`**: Accepts `McpServerDeps` parameter instead of resolving registries from the container.
- **`src/mcp-server/transports/manager.ts`**: `TransportManager` accepts `TaskManager` as 4th constructor parameter instead of resolving it at shutdown.
- **`pdfParser.ts`**: `PDFDocument`, `StandardFonts`, `degrees`, `rgb` changed from value re-exports to type-only re-exports. `embedFont()` parameter relaxed from `keyof typeof StandardFonts` to `string`.
- **`jsonParser.ts`**: `Allow` enum from `partial-json` replaced with local `as const` object to avoid importing the library at module evaluation time.
- **`openrouter.provider.ts`**: OpenAI client construction deferred to first use via `ensureClient()` with cached promise. `sanitization` changed from lazy to direct import (local module).
- **`xmlParser.ts`**: Class no longer holds a `private parser` in constructor; uses module-level lazy singleton instead.
- **`vitest.config.ts`**: Integration tests excluded from default `bun run test` run.
- **Dev dependencies**: Added `@vitest/ui` 4.0.18. Bumped `@cloudflare/workers-types` to 4.20260310.1, `@types/node` to 25.4.0.
- **`core-extraction/`**: Updated execution plan, developer API spec, and README to reflect Phase 3 progress.

### Removed

- **`src/container/`**: Entire DI container (6 files — `core/container.ts`, `core/tokens.ts`, `registrations/core.ts`, `registrations/mcp.ts`, `index.ts`, `README.md`).
- **`tests/container/`**: All container tests (5 files).
- **`changelog/archive.md`**: Legacy changelog archive (pre-3.0.0 history).
