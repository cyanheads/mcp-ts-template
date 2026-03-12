# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.0-beta.10] - 2026-03-12

Implements the `init` CLI subcommand for scaffolding new consumer projects, adds `type` metadata to all skill frontmatter for classification, and adds a debug skill for tracing agent onboarding.

### Added

- **`src/cli/init.ts`**: CLI entry point implementing `mcp-ts-core init [name] [--dry-run]`. Copies templates, filters skills by `audience: external`, substitutes `{{PACKAGE_NAME}}` in `package.json`, and prints a summary with next steps.
- **`skills/walkthrough-init/SKILL.md`**: New internal debug skill for tracing the agent onboarding flow after `init` scaffolds a project — follows every instruction chain through CLAUDE.md, skills, and framework docs to find broken links and dead ends.

### Changed

- **`package.json`**: Added `templates/` to `files` array; changed `bin` entry from `dist/index.js` to `dist/cli/init.js`.
- **All SKILL.md files**: Added `metadata.type` field (`reference`, `workflow`, or `debug`) to frontmatter for skill classification.
- **`skills/migrate-mcp-ts-template/SKILL.md`**: Changed `audience` from `internal` to `external` — migration skill is needed by consumer projects upgrading from legacy template forks.
- **`core-extraction/13-init-cli.md`**: Updated checklist — marked `init.ts`, `bin` field, `files` array, audience filtering, `--dry-run`, and `[name]` argument as complete.

---

## [0.1.0-beta.9] - 2026-03-12

Documentation refactoring: condenses CLAUDE.md, extracts detailed API references from skill files into dedicated reference subdirectories, updates skill docs to reflect current API surfaces, and refreshes the project tree.

### Added

- **`skills/api-services/references/`**: Extracted LLM, Speech, and Graph service documentation into dedicated reference files (`llm.md`, `speech.md`, `graph.md`) — previously inline in `SKILL.md`.
- **`skills/api-utils/references/`**: Extracted Formatting, Parsing, and Security utility documentation into dedicated reference files (`formatting.md`, `parsing.md`, `security.md`) — previously inline in `SKILL.md`.

### Changed

- **`CLAUDE.md`**: Major condensation — compressed verbose paragraphs into terse bullet-point rules, merged header lines, reduced net ~545 lines while preserving all API surface documentation.
- **`docs/tree.md`**: Regenerated to reflect current project structure (examples/, new scripts, skill reference dirs, barrel files, removed conformance tests).
- **`skills/api-services/SKILL.md`** (v1.2): Replaced inline service docs with references table pointing to new reference files.
- **`skills/api-utils/SKILL.md`** (v2.0): Replaced inline formatting/parsing/security docs with references table; updated method signatures for `fetchWithTimeout`, `paginateArray`, `extractCursor`, `decodeCursor`, `schedulerService`, `ErrorHandler`, and `utils/types` guards.
- **`skills/api-errors/SKILL.md`**: Expanded error code table with standard JSON-RPC 2.0 codes (`ParseError`, `MethodNotFound`) and new implementation-defined codes (`SerializationError`, `UnknownError`); added `McpError` `options` parameter; expanded `ErrorHandler.tryCatch` options documentation.
- **`skills/api-testing/SKILL.md`**: Expanded `MockContextOptions` interface docs (`auth`, `requestId`, `signal`, `uri`); added mock progress state-tracking and mock logger inspection examples; replaced vitest config with standalone example using `tsconfigPaths()`.
- **`skills/migrate-mcp-ts-template/SKILL.md`** (v2.0): Comprehensive rewrite — categorized import mapping tables (core, definition types, internal utils, public utils), added files-to-remove checklist, added entry point rewrite example, expanded verification checklist.
- **`skills/api-auth/SKILL.md`**: Minor signature and description corrections.
- **`skills/api-context/SKILL.md`**: Minor corrections.
- **`skills/api-workers/SKILL.md`**: Minor corrections.
- **`skills/add-provider/SKILL.md`**: Minor corrections.
- **`skills/add-resource/SKILL.md`**: Minor corrections.

---

## [0.1.0-beta.8] - 2026-03-12

Extracts all template definitions from `src/` to `examples/`, completing the core/consumer separation. The core library now ships as a clean framework with no built-in tools, resources, or prompts. Template definitions live in `examples/` as a reference consumer server.

### Added

- **`examples/` directory**: Complete example consumer server demonstrating the `@cyanheads/mcp-ts-core` API.
  - `examples/index.ts` — Node.js entry point using `createApp()` with all template definitions.
  - `examples/worker.ts` — Cloudflare Workers entry point using `createWorkerHandler()`.
  - 7 tool definitions, 2 resource definitions, 1 prompt definition — all importing from `@cyanheads/mcp-ts-core` public subpath exports.
- **CLAUDE.md**: Added "Utils API Quick Reference" and "Services API Quick Reference" sections with per-subpath method tables for all utility and service exports.
- **Example tests** (`tests/examples/`): 7 test files with 39 tests covering all example definitions — echo tool, async countdown task tool, code review sampling tool, Mad Libs elicitation tool, data explorer app tool, echo resource, and code review prompt.

### Changed

- **`src/index.ts`**: Stripped to minimal core entry point — calls `createApp()` with no definitions. Consumer servers provide their own.
- **`scripts/build.ts`**: Safer `--project` arg parsing (handles undefined index gracefully).
- **`scripts/test-report.ts`**: Removed conformance suite config (conformance tests were deleted in beta.6).
- **Integration tests** (`tests/integration/`): Replaced `template_echo_message` tool invocations with `client.ping()` — core server ships with no built-in tools; tests now verify transport functionality only.
- **`package.json`**: Removed `test:fuzz` from `test:all` script (fuzz tests deleted in this release).
- **`core-extraction/09-execution.md`**: Phase 4 checklist items marked complete — examples verified with subpath exports, build, tests, and devcheck.
- **`core-extraction/README.md`**: Phase 3 marked complete (JSDoc accuracy deferred to post-publish); Phase 4 marked complete with test counts.
- **`src/utils/scheduling/scheduler.ts`**: Fixed JSDoc example code.
- **`tests/mcp-server/prompts/prompt-registration.test.ts`**: Rewritten with inline test fixtures (new-style + legacy prompt definitions) instead of importing from deleted template definitions.
- **`tests/mcp-server/transports/auth/strategies/oauthStrategy.test.ts`**: Replaced bracket notation with dot notation for config property access.
- **`core-extraction/09-execution.md`**: Updated Phase 3 checklist — template definitions moved, CLAUDE.md API refs added.
- **`core-extraction/README.md`**: Updated Phase 3 status description.

### Removed

- **Template definitions from `src/`**: All tool, resource, and prompt definitions moved to `examples/`. Deleted `src/mcp-server/tools/definitions/`, `src/mcp-server/resources/definitions/`, `src/mcp-server/prompts/definitions/` (10 source files + 3 barrel indexes).
- **Template definition tests**: All unit tests, schema snapshot tests, fuzz tests, and JSON schema compatibility tests for the moved definitions (20 test files + 2 snapshot files).
- **`@traversable/*` devDependencies**: Removed `@traversable/registry`, `@traversable/zod-test`, `@traversable/zod-types` — no longer needed after removing Zod schema compatibility tests.

---

## [0.1.0-beta.7] - 2026-03-12

Migrates template resources and tools to new-style builders, expands `CoreServices` with optional providers, adds shareable Vitest base config and a build script with progress reporting.

### Added

- **`vitest.config.base.ts`**: Shareable Vitest base configuration for consumer servers. Exported via `@cyanheads/mcp-ts-core/vitest.config` subpath.
- **`scripts/build.ts`**: Build script wrapping `tsc` + `tsc-alias` with timing, file counts, and size reporting.
- **`CoreServices` expansion** (`src/app.ts`): `composeServices()` now constructs and exposes `rateLimiter`, optional `llmProvider` (OpenRouter), optional `speechService` (ElevenLabs/Whisper), and optional `supabase` client.

### Changed

- **`echo.resource.ts`**: Migrated from legacy `ResourceDefinition` with `withResourceAuth()` wrapper to new-style `resource()` builder with inline `auth`, `handler(params, ctx)`, and `format`.
- **`data-explorer-ui.app-resource.ts`**: Migrated from legacy `ResourceDefinition` to `resource()` builder with inline `auth` and `handler`.
- **`template-async-countdown`**: Rewritten from `TaskToolDefinition` (`.task-tool.ts`) to `tool()` builder with `task: true` (`.tool.ts`). Same behavior, simpler API.
- **`scripts/clean.ts`**: Added `.tsbuildinfo` to default clean targets.
- **`package.json`**: Build script changed to `bun run scripts/build.ts`. Added `vitest.config.base.ts` to `files` and `exports` map.
- **Tests**: All resource and tool tests updated to use `createMockContext()` instead of `requestContextService`. Field name references updated (`paramsSchema` -> `params`, `outputSchema` -> `output`, `logic` -> `handler`, `responseFormatter` -> `format`). Fuzz tests pass `progress: true` for task tools.

### Removed

- **`template-async-countdown.task-tool.ts`**: Replaced by `template-async-countdown.tool.ts` using `task: true` flag.
- **Legacy `withResourceAuth()` usage**: Both template resources now use inline `auth` on the `resource()` builder.

---

## [0.1.0-beta.6] - 2026-03-11

Restructures the package for npm consumption: explicit subpath exports, `tsc` + `tsc-alias` build, heavy deps moved to optional peers, `createApp()` owns the full server lifecycle, and `createWorkerHandler()` replaces the default Worker export.

### Added

- **Explicit subpath exports**: 25+ entries in `package.json` `exports` map replacing the wildcard `"./*"` pattern. Every public API surface (`./tools`, `./resources`, `./prompts`, `./tasks`, `./context`, `./errors`, `./config`, `./auth`, `./storage`, `./storage/types`, `./utils/*`, `./testing`, `./worker`) has dedicated `types` + `import` conditions.
- **Utility barrel files**: New `src/utils/formatting/index.ts`, `src/utils/parsing/index.ts`, `src/utils/security/index.ts`, `src/utils/types/index.ts` — barrel exports for subpath resolution.
- **`tsconfig.base.json`**: Shareable TypeScript config for consumer repos (`extends "@cyanheads/mcp-ts-core/tsconfig.base.json"`).
- **`tsconfig.build.json`**: Build-specific config (src-only, excludes tests/examples).
- **`scripts/verify-exports.ts`**: Post-build script that verifies all subpath exports resolve to existing files in `dist/`.
- **`composeServices()`** (`src/app.ts`): Extracted shared service composition used by both `createApp()` and `createWorkerHandler()`. Handles name/version overrides, `resetConfig()`, core service construction, registry wiring, and server factory.
- **`ServerHandle` interface**: Returned by `createApp()` — provides `shutdown()` for graceful teardown and `services` for read-only access to core services.
- **`WorkerHandlerOptions`**: `createWorkerHandler()` accepts `extraEnvBindings`, `extraObjectBindings`, and `onScheduled` for server-specific extensibility.
- **`resetConfig()` export** (`src/config/index.ts`): Invalidates the cached config parse so name/version overrides take effect.
- **`prepublishOnly` script**: Runs build before `bun publish`.

### Changed

- **Build system**: Switched from `bun build` to `tsc -p tsconfig.build.json && tsc-alias` for proper `.d.ts` generation and path alias resolution.
- **Main entry point**: `package.json` `main`/`types` now point to `dist/app.js`/`dist/app.d.ts` (was `dist/index.js`).
- **`createApp()` lifecycle** (`src/app.ts`): Now handles the complete server lifecycle — OTEL init, high-res timer, logger initialization, transport startup, signal/error handler registration, and graceful shutdown. Returns `ServerHandle` instead of `AppHandle`.
- **`src/index.ts`**: Simplified from ~160 lines to ~17 lines. Now just imports built-in definitions and calls `createApp()`. All startup/shutdown logic moved into `createApp()`.
- **`createWorkerHandler()` factory** (`src/worker.ts`): Replaces the default export object. Returns `{ fetch, scheduled }` with closure over singleton app promise. Supports `extraEnvBindings`/`extraObjectBindings`/`onScheduled` options. Uses `composeServices()` instead of `createApp()`.
- **Config proxy immutability** (`src/config/index.ts`): `set()` and `defineProperty()` traps now return `false` — config is read-only after parse. Replaced manual `hasFileSystemAccess` check with `runtimeCaps.isNode`.
- **Auth fail-closed** (`src/mcp-server/transports/auth/lib/authUtils.ts`): `withRequiredScopes()` now explicitly checks `MCP_AUTH_MODE`. When auth is disabled (`none`), skips scope check. When auth is enabled but no auth context exists, throws `Unauthorized` instead of defaulting to allowed. Error data no longer leaks `grantedScopes`, `clientId`, or `subject` to the client.
- **Dependencies restructured**: Most dependencies (OTEL, Supabase, OpenAI, parsers, sanitization, scheduling) moved to optional `peerDependencies`. Core deps reduced to `hono`, `pino`, `dotenv`, `jose`, `@hono/mcp`, `@hono/node-server`, `@modelcontextprotocol/sdk`, `@modelcontextprotocol/ext-apps`, `@opentelemetry/api`. `zod` moved to required peer dependency.
- **`package.json` `files`**: Now includes `dist/`, `skills/`, `CLAUDE.md`, `tsconfig.base.json`, `biome.json`.
- **`tsconfig.json`**: Removed `bun-types` from `types`, updated `exclude` to include `examples`.
- **`vitest.config.ts`**: Removed conformance test exclusion.
- **Test modernization**: All auth, transport, logger, and worker tests refactored to use `vi.mock`/`vi.hoisted` for config mocking instead of `Object.defineProperty` on the live config proxy. Transport manager tests construct `TransportManager` per test with appropriate config.

### Fixed

- **`src/utils/internal/encoding.ts`**: Cast `bytes.buffer` to `ArrayBuffer` for TypeScript strict mode compatibility.
- **`src/utils/internal/runtime.ts`**: Type-safe `performance.now` check avoids accessing `globalThis.performance` directly (Workers type mismatch).

### Removed

- **Conformance test suite**: Deleted 20 test files, 4 helpers, and `vitest.conformance.ts`. Conformance tests will be rewritten against the stable `composeServices()` API post-extraction.
- **`test:conformance` script**: Removed from `package.json`.
- **`bun build` scripts**: Removed `build` (bun build) and `build:worker` scripts, replaced with `tsc` build.

---

## [0.1.0-beta.5] - 2026-03-11

Comprehensive documentation pass: enhanced JSDoc across all service and utility modules, added 8 new API reference skill files, and updated CLAUDE.md with the Agent Skills section.

### Added

- **API reference skills**: 8 new skill files in `skills/` covering auth (`api-auth`), config (`api-config`), context (`api-context`), errors (`api-errors`), services (`api-services`), testing (`api-testing`), utils (`api-utils`), and workers (`api-workers`). Each provides detailed API documentation and usage examples for its domain.
- **Agent Skills section in CLAUDE.md**: Added skills reference table linking all 13 skills with paths and descriptions.

### Changed

- **JSDoc: services** (`src/services/`): Enhanced documentation across graph (`GraphService`, `IGraphProvider`, types), LLM (`ILlmProvider`, `openrouter.provider`, types), and speech (`ISpeechProvider`, `SpeechService`, `elevenlabs.provider`, `whisper.provider`, types) with expanded `@remarks`, `@param`, `@returns`, `@throws`, and `@example` tags.
- **JSDoc: formatting utilities** (`src/utils/formatting/`): Enhanced `diffFormatter`, `markdownBuilder`, `tableFormatter`, and `treeFormatter` with detailed method documentation, usage examples, and clearer type descriptions.
- **JSDoc: internal utilities** (`src/utils/internal/`): Enhanced `encoding`, `errorHandler` (handler, helpers, mappings, types), `health`, `logger`, `performance`, `requestContext`, and `runtime` modules.
- **JSDoc: parsing utilities** (`src/utils/parsing/`): Enhanced `csvParser`, `dateParser`, `frontmatterParser`, `jsonParser`, `pdfParser`, `thinkBlock`, `xmlParser`, and `yamlParser`.
- **JSDoc: remaining utilities**: Enhanced `tokenCounter` (metrics), `fetchWithTimeout` (network), `pagination` (pagination), `scheduler` (scheduling), `idGenerator`/`rateLimiter`/`sanitization` (security), `instrumentation`/`metrics`/`semconv`/`trace` (telemetry), and `guards` (types).
- **Core extraction docs**: Updated `05-agent-dx.md`, `09-execution.md`, and `10-decisions.md` with current status.

---

## [0.1.0-beta.4] - 2026-03-11

Renames package identity to `@cyanheads/mcp-ts-core`. Wires new-style `resource()` and `prompt()` builders into their registries, adds `task: true` auto-task support for new-style tools, implements `checkScopes()` for dynamic auth, and defaults `tenantId` to `'default'` in stdio mode so `ctx.state` works without auth.

### Added

- **`createApp()` options**: `CreateAppOptions` and `CoreServices` interfaces exported from `src/app.ts`. Accepts `tools`, `resources`, `prompts`, `setup`, `name`, and `version` — consumers can override definition arrays and hook into server lifecycle.
- **Auto-task tool registration**: New-style tools with `task: true` are automatically registered via the experimental Tasks API. The framework manages the full lifecycle — create task, background handler execution, progress reporting, cancellation polling, and result/error storage.
- **`checkScopes()` public API** (`src/mcp-server/transports/auth/lib/checkScopes.ts`): Dynamic scope checking for new-style handlers. Wraps `withRequiredScopes` with `Context`-based interface for runtime-dependent scopes (e.g., `team:${input.teamId}:write`).
- **`newResourceHandlerFactory.ts`**: Handler factory for new-style resource definitions — creates `Context` with `ctx.uri`, checks inline auth, validates params via Zod, formats response, catches errors.

### Changed

- **Package identity**: Renamed from `mcp-ts-template` to `@cyanheads/mcp-ts-core` across `package.json`, `server.json`, `wrangler.toml`, `typedoc.json`, test report, and config test. Repository URLs unchanged (Phase 6).
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
