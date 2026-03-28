# Changelog

All notable changes to this project will be documented in this file.

---

## [0.2.6] - 2026-03-28

Handler initialization for empty servers, OTel API moved to peer deps, and comprehensive test coverage expansion.

### Fixed

- **Empty/task-only server handler initialization** — `ToolRegistry`, `ResourceRegistry`, and `PromptRegistry` now call the SDK's `setToolRequestHandlers()` / `setResourceRequestHandlers()` / `setPromptRequestHandlers()` up front before registering definitions. Previously, servers with zero standard tools (or only task tools) would not expose `tools/list`, `resources/list`, or `prompts/list` handlers, causing clients to get method-not-found errors.

### Changed

- **`@opentelemetry/api` moved to optional peer dependency** — Reduces mandatory install footprint for servers that don't use OpenTelemetry. The package is still required when `OTEL_ENABLED=true`.

### Tests

- **New unit tests** — `sessionAwareTaskStore.test.ts` (session ownership enforcement), `checkScopes.test.ts` (dynamic scope checking), `httpTransport.lifecycle.test.ts` (port retry and shutdown lifecycle), `protectedResourceMetadata.test.ts` (OAuth protected resource metadata), `sessionIdUtils.runtime.test.ts` (Web Crypto session ID fallback), `mockContext.test.ts` (mock context logger, state, progress helpers), `retry.test.ts` (retry helper with backoff, jitter, cancellation, abort signal), `instrumentation.lifecycle.test.ts` (OTel init/shutdown, cloud provider detection, timeout handling).
- **New test helper** — `default-server-mcp.ts` with shared MCP surface assertions for capabilities, discovery, protocol errors, and task operations.
- **Expanded integration tests** — HTTP auth (protected resource metadata, SSE rejection), HTTP sessions (DELETE without session ID), HTTP transport (MCP surface, protocol version rejection, origin rejection), stdio (MCP surface assertions).
- **Expanded unit tests** — Tool registration (task-only registry handler init), storage factory (Cloudflare R2/KV/D1 serverless providers, Supabase client injection, filesystem serverless rejection).

---

## [0.2.5] - 2026-03-28

Batch partial success telemetry and tools-first design guidance.

### Added

- **Batch partial success telemetry** — `measureToolExecution` auto-detects when a tool handler returns a result with a non-empty `failed` array (the batch response pattern from the design skill). Sets `mcp.tool.partial_success`, `mcp.tool.batch.succeeded_count`, and `mcp.tool.batch.failed_count` span attributes and structured log fields. No manual instrumentation needed.
- **`ATTR_MCP_TOOL_PARTIAL_SUCCESS`**, **`ATTR_MCP_TOOL_BATCH_SUCCEEDED`**, **`ATTR_MCP_TOOL_BATCH_FAILED`** — New OTel attribute constants exported from `/utils`.
- **Batch input design section** — `design-mcp-server` skill gains guidance on when to accept array input, partial success output schema patterns, and telemetry integration.
- **Error design section** — `design-mcp-server` and `add-tool` skills expanded with error classification by origin (client/upstream/not-found/auth/internal), error factory usage, and failure mode planning tables.

### Changed

- **Tools-first design philosophy** — Updated `design-mcp-server`, `add-resource`, and `CLAUDE.md` to clarify that tools are the primary interface. Resources are supplementary — many MCP clients (Claude Code, Cursor, most chat UIs) are tool-only. Design guidance now requires verifying that resource data is also reachable via the tool surface.
- **`add-resource` skill v1.1** — Added tool coverage checklist item and guidance note.
- **`add-tool` skill v1.1** — Expanded batch input/partial success patterns with full code examples, improved error classification section with factory usage.
- **`api-utils` skill** — Updated telemetry attributes documentation for new batch/partial success attributes.

### Tests

- **Partial success detection** — Four new test cases in `performance.test.ts`: detects non-empty `failed` array, skips empty `failed`, handles missing `succeeded`, ignores non-object results.
- **Attribute constants** — Four new tests in `attributes.test.ts` for `error_category`, `partial_success`, `batch.succeeded_count`, `batch.failed_count`.

---

## [0.2.4] - 2026-03-28

Server.json manifest linter, API efficiency patterns, and dependency security overrides.

### Added

- **Server.json manifest linter** — New `lintServerJson()` rule set validates `server.json` against the MCP server manifest spec (2025-12-11). Checks name format (reverse-DNS), description length, version (no ranges, semver), repository structure, packages (registryType, identifier, transport, arguments, env vars), remotes (transport constraints), and cross-validates version against `package.json`. Integrated into `validateDefinitions()` pipeline and `lint-mcp` CLI script.
- **`LintDefinitionType`** — New exported type (`'tool' | 'resource' | 'prompt' | 'server-json'`) for lint diagnostics. Exported from `/linter` and main entry point.
- **API efficiency guidance** — New section in `add-service` skill covering batch-over-N+1, field selection, and pagination awareness patterns. Added corresponding checklist item.
- **Live API probing step** — `design-mcp-server` skill now includes a step to hit real API endpoints during research to verify response shapes, batch endpoints, field selection, pagination, and error formats.
- **API efficiency planning table** — `design-mcp-server` skill gains a service design table for batch, field selection, request consolidation, and pagination decisions.

### Changed

- **`LintInput`** — Now accepts optional `serverJson` and `packageJson` fields for manifest and cross-validation.
- **`lint-mcp.ts` script** — Discovers and parses `server.json` + `package.json` at project root, passes them to `validateDefinitions()`. Skips lint only when no definitions and no server.json found.
- **Template `format()` example** — Updated `templates/AGENTS.md` and `templates/CLAUDE.md` with content-complete `format()` example and checklist item.
- **CLAUDE.md** — Added API efficiency note to service documentation section.
- **Dependency overrides** — Added `brace-expansion` 1.1.13, `handlebars` 4.7.9, `path-to-regexp` 8.4.0 to resolve security advisories in transitive dependencies.

---

## [0.2.3] - 2026-03-28

`format()` content-completeness guidance and minor dependency update.

### Changed

- **`format()` content-completeness** — Clarified across all documentation and scaffolding that `format()` populates MCP `content[]`, which is the only field most LLM clients (Claude Code, VS Code Copilot, Cursor, Windsurf) forward to the model. `structuredContent` (from `output`) is for programmatic/machine use and is not reliably shown to the LLM. Updated `ToolDefinition` JSDoc, `CLAUDE.md`, `templates/CLAUDE.md`, `skills/add-tool`, and `skills/design-mcp-server` with richer example formatters, explicit warnings against thin one-liners, and new checklist items.
- **`echo.tool.ts` template** — Added clarifying comment about `format()` content-completeness in the scaffolded echo tool.
- **`polish-docs-meta` reference** — Added `LOGS_DIR` env var to the environment variable reference table.
- **Dependencies** — `@modelcontextprotocol/ext-apps` ^1.3.1 → ^1.3.2.

---

## [0.2.2] - 2026-03-26

Error category telemetry, dependency updates, and minor cleanup.

### Added

- **Error category telemetry** — New `ErrorCategory` type (`'upstream'` | `'server'` | `'client'`) and `getErrorCategory()` classifier in error handler mappings. Tool error metrics now emit `mcp.tool.error_category` attribute, enabling dashboards to distinguish external API failures from internal bugs and bad input.
- **`ATTR_MCP_TOOL_ERROR_CATEGORY`** — New OTel attribute constant for the error category dimension.

### Changed

- **Dependencies** — `@modelcontextprotocol/sdk` ^1.27.1 → ^1.28.0, `@opentelemetry/*` packages bumped (api ^1.9.1, SDK ^0.214.0, resources/metrics/trace ^2.6.1, instrumentation-pino ^0.60.0), `@biomejs/biome` 2.4.8 → 2.4.9, `vitest` 4.1.1 → 4.1.2, `vite` 8.0.2 → 8.0.3, `openai` ^6.33.0, `repomix` ^1.13.1, `@supabase/supabase-js` ^2.100.1.
- **New runtime deps** — Added `picomatch` 2.3.2 and `yaml` 1.10.3 to dependencies.
- **Minor refactors** — Simplified optional chaining in `authUtils.ts` and `trace.ts`.

---

## [0.2.1] - 2026-03-25

Docker build fix for optional peer dependencies.

### Fixed

- **`xmlParser` Docker build** — Replaced static `typeof import('fast-xml-parser')` type reference with a local `FxpModule` interface. TypeScript no longer requires the optional peer dep's type declarations at compile time, fixing Docker multi-platform builds where `fast-xml-parser` isn't installed in the build stage.

---

## [0.2.0] - 2026-03-24

Fuzz testing framework, retry utility, GitHub issue templates, and issue reporting skills.

### Added

- **Fuzz testing module** — `fuzzTool`, `fuzzResource`, `fuzzPrompt` from `@cyanheads/mcp-ts-core/testing/fuzz`. Schema-aware property-based testing via `fast-check`: generates valid inputs from Zod schemas and adversarial payloads (prototype pollution, injection strings, type confusion), then asserts handler invariants (no crashes, no stack trace leaks, no prototype pollution). Returns `FuzzReport` for custom assertions.
- **`zodToArbitrary`** — Converts Zod schemas to `fast-check` arbitraries for custom property-based tests.
- **`ADVERSARIAL_STRINGS`** — Curated set of injection, encoding, and parsing attack strings for targeted testing.
- **`./testing/fuzz` subpath export** — New package export for the fuzz testing module.
- **Retry utility** — `withRetry` from `@cyanheads/mcp-ts-core/utils`. Exponential backoff with jitter, transient error classification (`ServiceUnavailable`, `Timeout`, `RateLimited`), abort signal support, and exhaustion enrichment (attempt count in error message and data).
- **GitHub issue templates** — Structured YAML form templates for bug reports and feature requests in `.github/ISSUE_TEMPLATE/`. Includes version/runtime/transport dropdowns and redaction guidance. Scaffolded to consumer projects via `init`.
- **Issue reporting skills** — `report-issue-framework` (file bugs against `@cyanheads/mcp-ts-core`) and `report-issue-local` (file bugs against the consumer server). Both include triage guidance, `gh` CLI examples, redaction checklist, and title/label conventions.
- **Fuzz test suite** — Three test files (`tests/fuzz/`) covering definition fuzzing, error handler fuzzing, and tool handler pipeline fuzzing (~850 lines).
- **Service resilience documentation** — `add-service` skill gains a "Resilience" section with retry-wraps-full-pipeline pattern, backoff calibration, and parse failure classification. `design-mcp-server` skill gains a resilience planning table.

### Changed

- **Biome config** — `noExplicitAny: off` for `src/testing/**` (fuzz module requires `any` for Zod introspection).
- **Vitest config** — Added `tests/fuzz/**/*.test.ts` to include patterns.
- **`setup` skill** — Documents `.github/ISSUE_TEMPLATE/` in scaffolding output.
- **Template `CLAUDE.md`** — Added `report-issue-framework` and `report-issue-local` to skills table.
- **`.gitignore`** — Added `announcements/` and `agent-feedback/` directories.

### Fixed

- **`jsonParser.test.ts`** — Replaced fragile `rejects.toThrow(new McpError(...))` assertion with try/catch checking error code and message substring. Fixes intermittent test failures from McpError equality semantics.

---

## [0.1.29] - 2026-03-24

Linter fix, skill doc improvements, and dependency updates.

### Fixed

- **Linter annotation-coherence** — removed `idempotentHint` redundancy warning for `readOnlyHint: true` tools. Explicit `idempotentHint` is valid and correct, not redundant.

### Changed

- **`design-mcp-server` skill** — added tool audit step, convenience shortcuts pattern, expanded naming convention (`{domain}_{verb}_{noun}`), optional design doc sections.
- **`polish-docs-meta` skill** — added GitHub repo metadata sync step, description-as-canonical-source guidance, Dockerfile OCI label alignment.
- **`@modelcontextprotocol/ext-apps`** — ^1.2.2 → ^1.3.1
- **`fast-xml-parser`** — ^5.5.9 → latest (peer dep)

---

## [0.1.28] - 2026-03-23

TypeScript 6 migration and dependency updates.

### Changed

- **TypeScript 6** — upgraded from `^5.9.3` to `^6.0.2`; removed `baseUrl` from tsconfigs, switched path mappings to relative `./src/*` syntax.
- **Removed duplicate `typescript`** from `dependencies` (remains in `devDependencies`).
- **`@vitest/coverage-istanbul`** — 4.1.0 → 4.1.1 (dev)
- **`@vitest/ui`** — 4.1.0 → 4.1.1 (dev)
- **`fast-xml-parser`** — ^5.5.8 → ^5.5.9 (peer)

---

## [0.1.27] - 2026-03-23

Expanded OTel metrics instrumentation, eager metric initialization, and app lifecycle improvements.

### Added

- **Tool I/O byte histograms** — `mcp.tool.input_bytes` and `mcp.tool.output_bytes` histograms record payload sizes per tool invocation.
- **Tool parameter usage counter** — `mcp.tool.param.usage` tracks which parameters are supplied per tool call (top-level keys).
- **Resource output bytes histogram** — `mcp.resource.output_bytes` records payload size for successful resource reads.
- **HTTP client duration histogram** — `http.client.request.duration` (seconds) in `fetchWithTimeout`, with `http.request.method`, `server.address`, and `http.response.status_code` attributes.
- **Rate limit rejection counter** — `mcp.ratelimit.rejections` with `mcp.rate_limit.key` attribute fires on every rate-limited request.
- **Error classification counter** — `mcp.errors.classified` exposed via `initErrorMetrics()` for eager initialization.
- **Event loop utilization gauge** — `process.event_loop.utilization` (0–1 ratio) complements the existing p99 delay gauge.
- **Eager metric initialization** — `initSessionMetrics()`, `initErrorMetrics()`, `initRateLimitMetrics()`, `initHttpClientMetrics()`, `initHandlerMetrics()` called at startup so all metric series exist from the first export cycle.
- **Comprehensive metrics test suite** — 10 new test files covering OTel metric recording for tools, resources, tasks, sessions, auth, storage, graph, LLM, speech, error handler, HTTP client, and rate limiter subsystems.

### Changed

- **Lint warnings use logger** — `composeServices()` collects lint warnings and defers logging until after logger initialization. No more `console.warn` at startup.
- **Session gauge unconditional** — `mcp.sessions.active` observable gauge registered regardless of transport type (reports 0 for stdio/stateless).
- **Shutdown cleanup** — Extracted `flushTelemetryAndLogger()` helper, added `taskManager.cleanup()`, fatal error handlers now create proper request contexts.
- **`repomix`** — ^1.12.0 → ^1.13.0 (dev)
- **`vitest`** — ^4.1.0 → ^4.1.1 (dev)
- **`hono`** — ^4.12.8 → ^4.12.9
- **`diff`** — ^8.0.3 → ^8.0.4

---

## [0.1.26] - 2026-03-23

Resource notification support and dependency updates.

### Added

- **Resource notifications on Context** — `ctx.notifyResourceUpdated(uri)` and `ctx.notifyResourceListChanged()` let tool and resource handlers notify subscribed clients when dynamic resources change. Optional (like `elicit`/`sample`), presence-checked before use. Threaded through `ContextDeps`, handler factories, and both tool/resource registries.
- **`createMockContext` notification support** — `MockContextOptions` accepts `notifyResourceUpdated` and `notifyResourceListChanged` for testing handlers that fire resource notifications.
- **Resource notifications design doc** — `docs/resource-notifications.md` documents the gap, SDK surface, API design, and alternatives considered.

### Changed

- **`diff`** — 8.0.3 → 8.0.4
- **`hono`** — 4.12.8 → 4.12.9
- **`@supabase/supabase-js`** — ^2.99.3 → ^2.100.0
- **`typedoc`** — ^0.28.17 → ^0.28.18
- **`vite`** — 8.0.1 → 8.0.2

---

## [0.1.25] - 2026-03-21

Consumer identity resolution and OTEL service identity propagation.

### Fixed

- **Consumer package.json resolution** — `parseConfig()` now reads the consumer project's `package.json` from `process.cwd()` to resolve server name, version, and description. Previously fell through directly to the framework's own `package.json`, causing consumer servers to report the framework's identity. Resolution order: env var → consumer `package.json` → framework `package.json`.

### Changed

- **OTEL service identity** — `createApp({ name, version })` now propagates to `OTEL_SERVICE_NAME` and `OTEL_SERVICE_VERSION` (via `??=`), ensuring telemetry reflects the actual server identity rather than requiring separate env var configuration.

---

## [0.1.24] - 2026-03-21

Docker OTel default, Worker transport fix, and task store async correctness.

### Changed

- **Docker OTel default** — `OTEL_ENABLED` build arg now defaults to `true` in both the framework and template Dockerfiles. Docker images ship with OpenTelemetry instrumentation enabled out of the box.

### Fixed

- **Worker transport type** — `createWorkerHandler()` now sets `MCP_TRANSPORT_TYPE=http` in the Worker environment. Workers are always HTTP; without this, `context.ts` could not determine the correct transport for tenant isolation.
- **`SessionAwareTaskStore` async correctness** — `getTask()` and `getTaskResult()` are now properly `async` with explicit `await` on inner delegate calls. Previously returned bare promises without the `async` keyword, which could mask exceptions thrown by `assertOwnership()`.

---

## [0.1.23] - 2026-03-21

Config correctness, transport resilience, and example cleanup.

### Fixed

- **String boolean coercion** — Added `envBoolean` preprocessor for OpenTelemetry and Speech config booleans. `z.coerce.boolean()` treats `"false"` as `true` (non-empty string); the new preprocessor correctly parses `"true"`/`"1"` as `true` and everything else as `false`.
- **Missing `@hono/otel` handling** — HTTP transport now logs a warning instead of throwing `configurationError` when `@hono/otel` is not installed with OTel enabled. Prevents hard startup failures for optional instrumentation.

### Added

- **Docker OTel opt-in** — `OTEL_ENABLED=true` build arg conditionally installs OpenTelemetry peer dependencies in the production image. Base image stays lean by default.

### Changed

- **Example annotations** — Removed redundant `idempotentHint` from all example tool definitions (flagged by 0.1.22 linter as redundant when `readOnlyHint: true`).
- **`js-yaml` dev dependency** — Bumped from `^4.1.0` to `^4.1.1`.
- **`server.json` description** — Expanded to describe core capabilities.

---

## [0.1.22] - 2026-03-21

Linter hardening: new rules catch schema serializability failures, auth scope issues, annotation contradictions, and URI template mismatches before they become runtime errors.

### Added

- **Schema serializability rule** — `checkSchemaSerializable` validates that tool/resource/prompt Zod schemas can convert to JSON Schema via `toJSONSchema()`. Non-serializable types (`z.custom()`, `z.date()`, `z.transform()`, etc.) that would crash `tools/list` at runtime are now caught at startup.
- **Auth scope validation** — `lintAuthScopes` checks that `auth` arrays on tools and resources contain only non-empty strings. Catches typos like `auth: 'scope'` (not an array) or `auth: ['']` (empty scope).
- **Annotation coherence warnings** — Flags contradictory annotation combos: `destructiveHint` with `readOnlyHint: true` (meaningless) and `idempotentHint` with `readOnlyHint: true` (redundant).
- **Template-params alignment** — Resource linter cross-references URI template variables against `params` schema keys. Mismatches (e.g., `{itemId}` in template but `item_id` in schema) cause every resource read to fail silently — now caught at startup.
- **`_.dockerignore` template** — Scaffolded projects now include a comprehensive `.dockerignore`, matching the framework's own.
- **Linter tests** — ~130 lines of new test coverage for all new rules.

### Changed

- **Tool name format severity** — Upgraded from warning to error. The MCP spec uses MUST for the `[A-Za-z0-9._-]{1,128}` format; non-conforming names may break clients.
- **README template** — `polish-docs-meta` reference updated: scoped package names in `<h1>`, count line (tools · resources · prompts), framework badge linking to `@cyanheads/mcp-ts-core`.
- **Docs & skills** — Added JSON-Schema-serializable type guidance to `CLAUDE.md`, `add-tool`, `design-mcp-server`, `field-test` skills, and `AGENTS.md`/`CLAUDE.md` templates.

### Fixed

- **`lint-mcp` task tool detection** — `isToolLike()` now recognizes task tools (which have `taskHandlers` instead of `handler`).
- **`.dockerignore`** — Added `.git/` to version control exclusions.

---

## [0.1.21] - 2026-03-21

Template testing, dependency updates, and transport defaults.

### Added

- **Template test files** — Scaffolded projects now include starter tests for the echo tool, resource, and prompt (`templates/tests/`), demonstrating `createMockContext` usage and handler testing patterns.

### Changed

- **Template stdio scripts** — `dev:stdio` and `start:stdio` now explicitly set `MCP_TRANSPORT_TYPE=stdio`, matching the `dev:http`/`start:http` pattern. Prevents ambiguity when the default transport changes.
- **`js-yaml` peer dependency** — Upgraded from `^3.14.2` to `^4.1.0`. v4 drops unsafe `safeLoad`/`safeDump` aliases and uses safe parsing by default.

---

## [0.1.20] - 2026-03-21

Template scaffolding improvements: dynamic framework version pinning, slimmed gitignore, and new server.json template.

### Added

- **`server.json` template** — Scaffolded projects now include a pre-configured MCP server manifest with stdio and streamable-http transport entries, using `{{PACKAGE_NAME}}` placeholder.
- **Dynamic `{{FRAMEWORK_VERSION}}` placeholder** — `init` CLI reads the current framework version from its own `package.json` and injects it into templates. Scaffolded `package.json` now pins `@cyanheads/mcp-ts-core` to the exact version that generated the project, replacing the hardcoded `^0.1.0`.

### Changed

- **Template `_.gitignore` slimmed** — Removed Python, Java, Ruby, and other language-specific sections. Focused exclusively on TypeScript/Node.js patterns (OS files, IDE, build output, coverage, logs, env, MCP-specific). Added trailing newline.
- **Template `package.json` enhanced** — Added `README.md`, `LICENSE`, `CLAUDE.md`, `AGENTS.md`, `Dockerfile`, and `server.json` to `files` array. Added empty `repository` field for consumers to fill in.
- **Template `.env.example`** — Default HTTP port changed from 3000 to 3010.
- **Template `.vscode/settings.json`** — Removed unused `ruff.enable: false` setting.
- **`CLAUDE.md`** — Added `templates/` directory documentation explaining the scaffolding source and file naming conventions.

---

## [0.1.19] - 2026-03-21

Devcheck config externalization, template guidance, and field-test skill.

### Added

- **`devcheck.config.json`** — Devcheck now reads depcheck ignores, ignore patterns, and outdated allowlist from a project-local JSON config file instead of hardcoded values in `scripts/devcheck.ts`. Consumer template includes a starter config.
- **"What's Next?" section in templates** — `AGENTS.md` and `CLAUDE.md` templates now include a prioritized list of suggested next steps, helping agents guide users through the server development workflow.
- **`field-test` skill reference** — Added to skill tables in `CLAUDE.md`, `templates/AGENTS.md`, and `templates/CLAUDE.md`.
- **`MCP_SESSION_MODE` env var** — Documented in `templates/.env.example` (`stateful` | `stateless`).

### Changed

- **Template Dockerfile** — Simplified production install step; removed manual cleanup of platform-specific `@oven`/`@rollup` binaries (no longer needed).

---

## [0.1.18] - 2026-03-21

Template and devcheck improvements.

### Changed

- **Devcheck output visibility** — `scripts/devcheck.ts` now shows stdout for all checks (dimmed), not just failures. Stderr is dimmed for passing checks, red for failures. Makes it easier to verify what ran.
- **Template `.gitignore` rewrite** — Expanded from a minimal Node.js gitignore to a comprehensive multi-language template covering OS files, IDE files, Node/Python/Java/Ruby, build artifacts, logs, coverage, environment files, and MCP-specific patterns.
- **Template `.vscode/` config** — Added `extensions.json` (recommends Biome + markdownlint) and `settings.json` (Biome as default formatter, markdownlint config, format-on-save) to scaffolded projects.

### Fixed

- **`docs/tree.md`** — Corrected `vitest.config.base.ts` → `vitest.config.base.js` filename.

---

## [0.1.17] - 2026-03-21

Three bug fixes affecting consumer projects scaffolded via `mcp-ts-core init` and HTTP transport mode.

### Fixed

- **Duplicate registration in HTTP mode** — Shared `ToolRegistry`, `ResourceRegistry`, and `PromptRegistry` instances now clear their `registeredNames` Set at the top of `registerAll()`, preventing duplicate-name errors when per-request `McpServer` instances are created (GHSA-345p-7cg4-v4c7 security pattern).
- **Stale `.tsbuildinfo` not cleaned** — `scripts/clean.ts` now dynamically globs for all `*.tsbuildinfo` files in the project root instead of hardcoding a single `.tsbuildinfo` filename. Prevents silent 0-file builds when tsc names buildinfo after the tsconfig (e.g., `tsconfig.build.tsbuildinfo`).
- **Missing `tsconfig.build.json` in scaffold** — Added `templates/_tsconfig.build.json` so `init` creates the file consumers need for `scripts/build.ts` (which defaults to `-p tsconfig.build.json`).

---

## [0.1.16] - 2026-03-21

Security patch and agent protocol cleanup.

### Security

- **CVE-2026-33228** — Pinned `flatted` to `3.4.2` via `overrides` to fix prototype pollution vulnerability in `flatted <= 3.4.1` (transitive dep via `@vitest/ui`).

### Changed

- **Project description** — Rebranded to "Agent-native TypeScript framework for building MCP servers." Updated `package.json` description, keywords, and README tagline.
- **CLAUDE.md** — Condensed agent protocol: removed inline code examples duplicated in skills, merged Checklist into Code Style section, shortened Context/Error/Auth sections with skill cross-references.

---

## [0.1.15] - 2026-03-21

MCP definition linter, Bun-free devcheck, and template portability.

### Added

- **MCP definition linter** — New `src/linter/` module validates tool, resource, and prompt definitions against MCP spec and framework conventions at startup. Checks name format/uniqueness, description presence, handler existence, Zod schema structure, `.describe()` on fields, URI template validity, and annotation types. Errors (MUST violations) block startup; warnings (SHOULD/quality) are logged.
- **`./linter` subpath export** — `validateDefinitions()` and lint types available via `@cyanheads/mcp-ts-core/linter` for standalone use.
- **`lint:mcp` script** — `scripts/lint-mcp.ts` discovers definitions from conventional paths and runs the linter as a standalone CLI or devcheck step.
- **Duplicate name detection for prompts and resources** — `PromptRegistry` and `ResourceRegistry` now throw at startup on duplicate names, matching existing `ToolRegistry` behavior.
- **Linter test suite** — 370-line test file covering all lint rules, edge cases, and report structure.

### Changed

- **`devcheck` is now runtime-agnostic** — Migrated from `Bun.spawn` to Node.js `child_process.spawn`. Auto-detects bun for package management commands, falls back to npm. Shebang changed from `bun` to `tsx`. Removed "slowest check" summary line.
- **Templates default to npm/tsx** — `AGENTS.md`, `CLAUDE.md`, and `package.json` templates use `tsx` for scripts and `npm run` for commands. Bun is documented as an optional upgrade. Removed "Bun requirement" note and `migrate-mcp-ts-template` skill reference. Added `rebuild` and `lint:mcp` commands.
- **Skills section wording** — Templates clarify that skills live at `skills/` and should be copied to agent directories, replacing the "sync" language.
- **`init` CLI** — Now copies `lint-mcp.ts` to scaffolded projects.
- **`setup` skill** — Updated to recommend npm as default with bun as alternative.

---

## [0.1.14] - 2026-03-21

Skill documentation overhaul and dependency updates.

### Changed

- **`maintenance` skill v1.1** — Simplified from three-tier to two-tier skill sync (package → project). Removed agent skill directory tier.
- **`migrate-mcp-ts-template` skill v2.1** — Added worker, encoding, and service import mappings. Expanded framework file candidates with review-before-cleanup guidance. Added `setup()` and `vitest.config` examples.
- **`polish-docs-meta` skill v1.1** — Added `server.json` and `bunfig.toml` verification steps. Rewrote README reference (tools-first structure, two-layer tool docs, badge guide). Rewrote `server.json` reference to use official MCP schema with two-package-entry pattern. Updated `package-meta` reference with `mcpName`, `packageManager`, and `engines.bun` fields.
- **`release` skill v1.2** — Reframed as a verification gate; git wrapup protocol now handles version bumps, changelog, and commits. Added template version check.
- Minor wording refinements across `add-test`, `api-context`, and `setup` skills.

### Dependencies

- Bumped `msw` to `^2.12.14`.

---

## [0.1.13] - 2026-03-20

Test suite reorganization into a structured directory layout.

### Changed

- **Test directory restructure** — Reorganized flat `tests/` into `tests/unit/`, `tests/integration/`, `tests/compliance/`, `tests/smoke/`, and `tests/helpers/`. Clear separation of test tiers with dedicated directories for each category.
- **Vitest config updates** — `vitest.config.ts` uses explicit `include` globs (`tests/unit/**`, `tests/compliance/**`, `tests/smoke/**`) instead of exclusion-based patterns. `vitest.integration.ts` includes both `*.test.ts` and `*.int.test.ts` patterns.
- **Test helper consolidation** — Merged `tests/fixtures/`, `tests/mocks/`, and `tests/integration/helpers/` into a single `tests/helpers/` directory with renamed files (`fixtures.ts`, `mock-handlers.ts`, `mock-server.ts`, `http-helpers.ts`, `server-process.ts`).
- All test import paths updated to match new directory depths.
- Regenerated `docs/tree.md` to reflect new structure.

---

## [0.1.12] - 2026-03-20

Required output schemas, OAuth hardening, and metric cardinality fix.

### Security

- **OAuth algorithm pinning** — `OauthStrategy` restricts JWT verification to `['RS256', 'ES256', 'PS256']`, preventing algorithm confusion attacks.

### Added

- **`ATTR_MCP_RESOURCE_NAME`** — New bounded resource identifier attribute for metric dimensions, replacing unbounded URI on metrics.

### Changed

- **`output` required on tool definitions** — `ToolDefinition.output` is now mandatory (was optional). Handler factory and task registration unconditionally validate output and include `structuredContent`.
- **Resource metric cardinality** — Resource metrics use bounded `mcp.resource.name` attribute instead of unbounded `mcp.resource.uri`. URI attribute reserved for span-level detail only.

---

## [0.1.11] - 2026-03-20

Security hardening, reliability improvements, public API surface refinement, and storage provider consistency.

### Security

- **HMAC-signed pagination cursors** — Cursors now include a truncated HMAC-SHA256 signature using a per-process random key, preventing cursor forgery for key enumeration within tenant namespaces. Cursors are ephemeral — they don't survive process restarts.
- **Auth-gated server metadata** — `GET /mcp` returns minimal `{ status: 'ok' }` when auth is enabled, hiding server name, version, environment, and capability details from unauthenticated callers.
- **OTel scope redaction** — Auth middleware logs scope count instead of scope values in OTel span attributes, preventing authorization model exposure to tracing backends.
- **JWT issuer/audience validation** — `JwtStrategy` validates `iss` and `aud` claims when `MCP_JWT_EXPECTED_ISSUER` / `MCP_JWT_EXPECTED_AUDIENCE` are configured. Explicit `algorithms: ['HS256']` constraint on token verification.
- **Dev bypass guard** — `DEV_MCP_AUTH_BYPASS` rejected in production (`NODE_ENV=production`). Allowed in development and testing environments.
- **Session capacity limits** — `SessionStore` enforces a configurable maximum session count (default 10,000), preventing unbounded memory growth from session exhaustion.
- **Atomic identity binding** — Session identity fields (tenantId, clientId, subject) bound atomically as a snapshot, preventing chimeric identities from per-field races across requests.
- **Error data sanitization** — HTTP error handler captures `McpError.data` before `ErrorHandler` enrichment, preventing internal details (stack traces, cause chains) from leaking while preserving developer-intentional error context.

### Added

- **Public API barrel** — New `src/core/index.ts` selectively re-exports only the public API, keeping internal types (`ComposedApp`, `composeServices`, `TaskManager`) out of the consumer-facing surface. Package entry points updated from `dist/core/app.js` to `dist/core/index.js`.
- **`zod` as direct dependency** — Moved from `peerDependencies` to `dependencies`. Consumers no longer need to install `zod` separately.
- **Duplicate tool name detection** — `ToolRegistry` throws at startup if two tools share the same name.
- **Auto-task timeout enforcement** — Background task handlers aborted after the task entry TTL expires, preventing leaked resources from hung handlers.
- **`ErrorHandler.classifyOnly()`** — Classifies errors without logging, OTel side effects, or wrapping. Used by resource handler factory to avoid double-logging.
- **`SchedulerService.destroyAll()`** — Stops and removes all cron jobs during shutdown, preventing timers from keeping the event loop alive.
- **In-memory provider capacity limits** — Configurable `maxEntries` (default 10,000) with automatic TTL sweep when capacity is reached. New `size` getter for monitoring.
- **Walk-based JSON size estimator** — `estimateJsonSize()` fallback in performance module handles circular references and BigInt without throwing.

### Fixed

- **Fatal shutdown backstop** — Uncaught exceptions and unhandled rejections trigger a 10-second backstop timer guaranteeing process exit, preventing hung shutdowns.
- **Signal handler ordering** — `SIGTERM`/`SIGINT` handlers registered before transport start, so signals during HTTP bind still trigger graceful shutdown.
- **Non-SSE transport cleanup** — Per-request `McpServer`/transport instances closed via microtask after non-SSE responses, preventing resource leaks in stateless HTTP mode.
- **OTel shutdown race** — No-op catch on `sdk.shutdown()` promise prevents unhandled rejection when the timeout timer wins the race.
- **Task ownership cleanup** — `SessionAwareTaskStore` removes ownership entries when tasks reach terminal state (completed/failed).
- **Formatter error isolation** — Tool handler factory catches formatter errors separately from handler errors, providing clearer error messages.
- **Lazy dotenv loading** — Deferred to first `parseConfig()` call. Avoids wasted filesystem syscall in Workers and prevents stale `.env` from loading before test setup.
- **Config name/version overrides** — Persisted directly to `process.env` for process-lifetime visibility to OTEL/logger/transport, replacing the env-override parameter approach.

### Changed

- **TypeError no longer mapped to ValidationError** — Runtime TypeErrors (e.g., "Cannot read properties of undefined") are programming errors, not validation failures. They now fall through to message-pattern matching or `InternalError` fallback.
- **Validation error pattern** — Restored broad `invalid` keyword matching. The pattern relies on ordering (Unauthorized patterns are checked first) rather than a restrictive noun list, so messages like "Invalid email" correctly classify as ValidationError.
- **R2 provider: idempotent delete** — Removed pre-delete `head()` check. R2 `delete()` is idempotent; the extra round-trip added latency under eventual consistency.
- **R2 provider: consistent pagination** — Switched from R2 native cursor to limit+1 pagination with `startAfter`, matching D1/Supabase providers.
- **D1 provider: strict JSON parsing** — `getMany()` throws `McpError(SerializationError)` on parse failure instead of silently skipping corrupted values.
- **Resource handler error path** — Uses `classifyOnly()` instead of full `handleError()` to avoid double-logging when the SDK catches the re-thrown error.
- **Auto-task handler refactored** — Extracted `AutoTaskOptions` interface, configurable TTL from config, proper `finally` block for cleanup, error classification via `ErrorHandler`.

---

## [0.1.10] - 2026-03-20

Security hardening, concurrency-safe config overrides, cancellation support in context state and LLM provider, and filesystem list optimization.

### Security

- **HTTP error data leak prevention** — HTTP error handler now captures original `McpError.data` before `ErrorHandler.handleError()` enrichment, preventing internal details (stack traces, cause chains, operation context) from leaking in JSON-RPC error responses.
- **Removed raw token from `AuthContext`** — Dropped the `token` field from the context-facing auth shape. Raw JWT/OAuth bearer tokens no longer propagate through `ctx.auth`.

### Fixed

- **Concurrency-safe config overrides** — `composeServices()` no longer mutates `process.env` for `name`/`version` overrides. `parseConfig()` and `resetConfig()` accept an optional `envOverrides` parameter, avoiding races in Workers and parallel test suites.
- **Auth bridging from ALS** — `requestContextService.createRequestContext()` now bridges auth info from AsyncLocalStorage into the context, so `ctx.auth` is populated in tool/resource handlers without requiring a separate `withAuthInfo()` call.

### Added

- **Cancellation in `ContextState`** — All `ctx.state` methods (`get`, `set`, `delete`, `getMany`, `setMany`, `deleteMany`, `list`) now call `signal.throwIfAborted()` before I/O, respecting request cancellation.
- **`AbortSignal` on LLM provider** — `ILlmProvider.chatCompletion()` and `chatCompletionStream()` accept an optional `signal` parameter, plumbed through `OpenRouterProvider` to the OpenAI SDK.
- **`ListResult.values`** — `IStorageProvider.ListResult` gained an optional `values` map for pre-fetched data, allowing providers to avoid redundant I/O.

### Changed

- **Filesystem list optimization** — `FileSystemProvider.list()` retains parsed values during TTL validation and populates `ListResult.values`, eliminating a redundant `getMany()` round-trip in `ContextState.list()`.
- **Peer dependency version ranges** — All `peerDependencies` now specify proper semver ranges (were empty strings).
- **Removed stale `resolutions`** — Dropped `escape-string-regexp`, `@isaacs/brace-expansion`, `markdown-it`, `qs`, `minimatch`, `ajv`, `lodash`, `rollup` from `resolutions`.
- **Removed `inspector` script** — Dropped `mcp-inspector` script from `package.json`.
- Fixed "template's" → "framework's" in `storageBackedTaskStore` comments.

---

## [0.1.9] - 2026-03-20

Markdown linting, formatting fixes, and biome schema alignment.

### Added

- **`.markdownlint.jsonc`** — Markdownlint config suppressing false positives for changelog headings, inline HTML, first-line h1, and dense reference tables.

### Changed

- Fixed markdown formatting across 14 skill files, templates, and docs for markdownlint compliance: added blank lines around fenced code blocks, escaped pipe characters in tables, labeled unlabeled code blocks with `text` language tag.
- Updated `scripts/tree.ts` to emit labeled code blocks (` ```text ` instead of bare ` ``` `).
- Regenerated `docs/tree.md` with current structure (adds `Dockerfile` template and `.markdownlint.jsonc`).
- Bumped `biome.json` schema URL to 2.4.8 (aligns with devDep already at 2.4.8).

---

## [0.1.8] - 2026-03-20

Output validation for tools, HTTP transport hardening, new skills, and template improvements.

### Added

- **`add-test` skill** — Scaffolds colocated test files for tools, resources, and services with `createMockContext` patterns.
- **`polish-docs-meta` skill** — Finalizes docs, README, metadata, and agent protocol for ship-ready servers. Includes reference guides for README conventions, agent protocol updates, package.json metadata, and server.json manifests.
- **`design-mcp-server` v2.0** — Major rewrite of tool design guidance: consolidation via operation/mode enums, description and parameter writing principles, output design for LLM chaining, error messages as recovery guidance.
- **`release` skill v1.1** — Expanded with README review step, template version sync, skill version bumping, annotated git tags, and structured checklist.

### Fixed

- **Tool output validation** — Standard and task tool handlers now validate output against the `output` schema (via `.parse()`) before formatting. Previously, unvalidated handler output was passed directly to `format` and `structuredContent`.
- **HTTP graceful shutdown** — Added 5-second drain timeout with `server.closeAllConnections()` fallback for pre-existing connections (e.g., SSE streams) that `server.close()` alone doesn't terminate.

### Changed

- **`composeServices()` ordering** — Now runs before env override application in `createApp()`, with overrides re-applied for process lifetime after composition. Fixes edge case where OTEL/logger could see stale identity.
- **`SamplingOpts.modelPreferences`** — Typed as SDK `ModelPreferences` instead of `Record<string, unknown>`.
- **Session identity binding** — Per-field gating ensures `tenantId`, `clientId`, and `subject` get bound independently across separate requests, instead of all-or-nothing on first authenticated request.
- **HTTP transport** — Extracted `extractSessionIdentity()` helper to deduplicate identity extraction across DELETE and POST handlers.
- **`rateLimiter.dispose()`** — Called during graceful shutdown to clean up interval timers.
- **Storage validation** — Removed redundant path traversal check (already covered by the regex pattern) and redundant `isFinite` check on list limit (already a `number` type).
- **`polish` skill renamed to `polish-docs-meta`** — More descriptive name. Updated all references in CLAUDE.md, templates, and changelog. Refined reference doc wording.
- **VSCode workspace config** — Added Biome as default formatter, markdownlint for markdown files, TypeScript SDK path, format-on-save. Added extension recommendations for Biome and markdownlint.
- **Templates** — Expanded `.env.example` with HTTP endpoint path, Cloudflare storage options, and OTEL vars. Added common gitignore patterns. Added `bin` field to `package.json`. Added `format` function to echo tool. Fixed template version from 0.1.2 to 0.1.0. Added `add-test` and `polish-docs-meta` skills to agent protocol.
- Updated dependencies: `@biomejs/biome` 2.4.7→2.4.8, `@supabase/supabase-js` ^2.99.2→^2.99.3, `@types/bun` ^1.3.10→^1.3.11, `bun-types` ^1.3.10→^1.3.11, `msw` ^2.12.12→^2.12.13, `openai` ^6.31.0→^6.32.0, `sanitize-html` ^2.17.1→^2.17.2, `vite` 8.0.0→8.0.1, `jose` ^6.2.1→^6.2.2.

---

## [0.1.7] - 2026-03-17

Telemetry refactor: slimmed OTel instrumentation, replaced bloated semconv module with focused MCP attribute keys, removed per-call memory profiling.

### Changed

- **`semconv.ts` → `attributes.ts`** — Replaced the 377-line `semconv.ts` (which re-exported standard OTel constants) with a focused `attributes.ts` containing only MCP-specific and actively-used attribute keys. Standard OTel conventions (HTTP, cloud, service, network, etc.) should now be imported directly from `@opentelemetry/semantic-conventions`.
- **`ATTR_CODE_FUNCTION` → `ATTR_CODE_FUNCTION_NAME`** — Renamed to align with upstream OTel semantic conventions deprecation of `code.function` in favor of `code.function.name`.
- **Targeted HTTP instrumentation** — Replaced `@opentelemetry/auto-instrumentations-node` (heavy, pulls many transitive deps) with `@opentelemetry/instrumentation-http` for a lighter footprint. Pino instrumentation remains unchanged.
- **Prompt measurement simplified** — `measurePromptGeneration` now emits a structured log only (no OTel span or metric instruments). Prompts are pure synchronous template functions; full spans were unnecessary overhead.
- **Removed per-call memory profiling** — `measureToolExecution` no longer captures RSS/heap before/after/delta on every tool call. Reduces per-call overhead; use external process monitoring for memory tracking.
- **Trimmed metrics API** — Removed `createObservableCounter` and `createObservableUpDownCounter` from public exports. Use `getMeter()` directly for these instrument types.
- **`TextEncoder` caching** — `toBytes()` in performance module now reuses a singleton `TextEncoder` instead of allocating one per call.
- **OTel shutdown timer leak fix** — `shutdownOpenTelemetry` now clears the timeout timer on successful shutdown.
- Updated `msw` dev dependency from 2.12.11 to 2.12.12.
- Updated `skills/api-utils/SKILL.md` to reflect new telemetry module names and trimmed metrics API.

### Removed

- `src/utils/telemetry/semconv.ts` — Replaced by `attributes.ts`.
- `tests/utils/telemetry/semconv.test.ts` — Replaced by `attributes.test.ts`.
- Memory tracking span attributes (`ATTR_MCP_TOOL_MEMORY_RSS_*`, `ATTR_MCP_TOOL_MEMORY_HEAP_USED_*`).
- Unused standard OTel attribute re-exports (`ATTR_SERVICE_*`, `ATTR_HTTP_*`, `ATTR_CLOUD_*`, `ATTR_URL_*`, `ATTR_NETWORK_*`, `ATTR_ERROR_TYPE`, `ATTR_EXCEPTION_*`, `ATTR_USER_AGENT_ORIGINAL`, etc.).
- Unused MCP attributes (`ATTR_MCP_REQUEST_ID`, `ATTR_MCP_OPERATION_NAME`, `ATTR_MCP_SESSION_ID`, `ATTR_MCP_TASK_ID`, `ATTR_MCP_PROMPT_*`).

---

## [0.1.6] - 2026-03-16

Task lifecycle improvements, error metadata for programmatic clients, resource output validation, and tenant isolation hardening.

### Added

- **Error metadata on tool responses** — Error responses now include `_meta.error` with the JSON-RPC error code and, for explicitly thrown `McpError` instances, the `data` payload. Programmatic clients can distinguish error types (auth, validation, not-found, etc.) without parsing the text message.
- **Resource output validation** — Resource handler factory validates handler output against the `output` schema when defined, matching tool handler behavior.

### Fixed

- **Task manager lifecycle** — `TaskManager` is now created inside `composeServices()` and its `taskStore`/`taskMessageQueue` are passed directly to the `McpServer` constructor. Previously, the task manager was created after service composition in `createApp()`, which meant the SDK server had no task support wired in.
- **Config override timing** — `name`/`version` overrides from `createApp()` options are now applied before OTEL initialization, so the telemetry service name reflects the actual server identity.
- **Context TTL edge case** — `ctx.state.set()` and `ctx.state.setMany()` now use `opts?.ttl !== undefined` instead of a truthy check, allowing `ttl: 0` to be passed through correctly.
- **HTTP tenant isolation** — HTTP transport without auth now leaves `tenantId` unset instead of defaulting to `'default'`. `ctx.state` operations fail-closed via `requireContext()`, preventing unauthenticated callers from sharing a single tenant namespace. Stdio continues to default to `'default'`.

### Changed

- Reverted `js-yaml` optional peer dependency from `^4.0.0` back to `^3.14.2`.
- Updated dev dependencies: `@cloudflare/workers-types`, `@supabase/supabase-js`, `msw`, `openai`.
- Improved HTTP transport port-detection test with proper `try/finally` cleanup.

---

## [0.1.5] - 2026-03-14

Security hardening, task tool auth fixes, and transport correctness improvements.

### Fixed

- **Task tool auth context** — Auth info is now captured from the request's AsyncLocalStorage before the background handler fires. Previously, ALS was gone in the detached context, causing auth scopes and tenant identity to be lost. Scope checks now run in `createTask` (inside ALS) instead of the background handler.
- **`withAuthInfo` operation inheritance** — `requestContextService.withAuthInfo()` now inherits the `operation` name from the parent context instead of hardcoding `'withAuthInfo'`, preserving operation traceability for task handlers.
- **`structuredContent` conditional** — Tool responses only include `structuredContent` when the tool definition has an `output` schema. Prevents sending untyped data as structured content.
- **HTTP session header for `auto` mode** — Session header now uses the resolved `isStateful` flag instead of comparing `config.mcpSessionMode === 'stateful'`, fixing stateful session headers when mode is `'auto'`.
- **Config cache reset after `composeServices()`** — `resetConfig()` is now called after restoring env vars, preventing stale cached config from leaking into subsequent calls in the same process.

### Security

- **Scope enumeration prevention** — Auth error responses no longer include scope names, required scopes, or missing scopes in client-facing error data. Full details remain in server-side logs. Applies to both `withRequiredScopes` and `checkScopes`.

### Changed

- Bumped `js-yaml` optional peer dependency from `^3.14.2` to `^4.0.0`.
- Setup skill: added "update dependencies to latest" as first post-install step.

---

## [0.1.4] - 2026-03-14

Rebranding and version bump: repository URLs, Docker labels, and package metadata updated from `mcp-ts-template` to `mcp-ts-core`.

### Changed

- Dockerfile labels and log paths renamed from `mcp-ts-template` to `mcp-ts-core`.
- `package.json` repository, bugs, and homepage URLs updated to `mcp-ts-core`.
- `server.json` repository URL updated to `mcp-ts-core`.
- `smithery.yaml` bunx command updated to `@cyanheads/mcp-ts-core`.
- `docs/tree.md` regenerated to reflect current directory structure (removed obsolete planning docs and schemas).
- Version bumped to 0.1.4 across `package.json`, `server.json`, and `README.md`.

---

## [0.1.3] - 2026-03-14

Housekeeping release: regex fix for skill audience extraction, version alignment across manifests, and removal of obsolete planning docs and schemas.

### Fixed

- `extractAudience` regex in `init` CLI now handles sibling keys before `audience:` under `metadata:` in skill frontmatter.

### Removed

- `core-extraction/` planning docs (14 files) — extraction complete, no longer needed.
- `docs/mcp-apps.md`, `docs/mcp-elicitation-summary.md`, `docs/publishing-mcp-server-registry.md` — superseded by CLAUDE.md and skill files.
- `schemas/cloudflare-d1-schema.sql` — D1 schema now managed by the framework internally.

### Changed

- `server.json` version aligned to 0.1.3 (was 0.1.1).

---

## [0.1.2] - 2026-03-14

Reliability fixes for core lifecycle, transport, storage, and telemetry. New `design-mcp-server` skill for planning tool surfaces before scaffolding.

### Added

- `design-mcp-server` skill (`skills/design-mcp-server/SKILL.md`) — structured workflow for mapping a domain into tools, resources, and services before implementation.
- "First Session" onboarding section in consumer templates (`CLAUDE.md`, `AGENTS.md`) guiding new projects through framework docs, setup, and design.

### Fixed

- `composeServices()` now saves and restores `process.env.MCP_SERVER_NAME` / `MCP_SERVER_VERSION` so successive calls in the same process aren't contaminated by earlier overrides.
- OpenTelemetry initialization sets `isOtelInitialized` only after `sdk.start()` succeeds, and resets the flag and promise on failure — prevents a failed init from blocking retries.
- Storage factory throws `configurationError` for unsupported providers in serverless environments instead of silently falling back to `in-memory`.
- HTTP transport resolves `mcpSessionMode: 'auto'` to stateful (per MCP spec conformance) instead of treating it as stateless.

### Changed

- Setup skill simplified: skill sync is now a single `cp -R skills/* .claude/skills/` command instead of a multi-step comparison workflow.
- Consumer templates updated: expanded commands table distinguishing `npm` (portable) from `bun` (bun-only) scripts, added description naming convention, added `design-mcp-server` to skills table.

---

## [0.1.1] - 2026-03-14

Scaffold and build portability improvements. Consumer projects now extend core shared configs instead of inlining them, and the build script runs on plain Node.js.

### Changed

- Made `scripts/build.ts` Node-portable by replacing Bun-specific `spawn` and `Bun.file` with `node:child_process/execFile` and `readFileSync`.
- Renamed `./biome.json` subpath export to `./biome` for consistency with `extends` syntax.
- Template `tsconfig.json` now extends `@cyanheads/mcp-ts-core/tsconfig.base.json` instead of inlining compiler options.
- Template `biome.json` now extends `@cyanheads/mcp-ts-core/biome` instead of inlining rules.
- Template `vitest.config.ts` now extends core vitest config via `mergeConfig`.
- Template `package.json` overhauled: proper metadata fields, `tsx scripts/build.ts` build command, `--watch` for dev scripts, updated dependency versions, added `pino-pretty`.
- Template `CLAUDE.md` updated commands table to distinguish `npm` (portable) from `bun` (bun-only) scripts, added description naming convention, added Bun requirement note.
- `init` CLI now copies build scripts (`build.ts`, `clean.ts`, `devcheck.ts`, `tree.ts`) into scaffolded projects.
- `init` CLI refactored template copying with shared `copyIfAbsent` helper and consistent `packageName` derivation.
- Added `scripts/` directory to npm package `files` array so consumers receive build scripts.

### Removed

- Deleted `scripts/test-report.ts` (624-line HTML test report generator).
- Deleted `scripts/verify-exports.ts` (export path verifier).
- Removed `prepublishOnly` and `prepare` scripts from package.json.
- Removed `test:report`, `test:report:open`, `coverage:update`, and `coverage:commit` scripts from package.json.

---

## [0.1.0] - 2026-03-14

First stable pre-release of `@cyanheads/mcp-ts-core` — a framework for building MCP servers in TypeScript. Extracted from the `mcp-ts-template` template into a standalone npm package with explicit subpath exports, builder-pattern definition APIs, unified handler context, and full-stack observability.

### Highlights

- **Package identity**: `@cyanheads/mcp-ts-core` on npm, `ghcr.io/cyanheads/mcp-ts-core` on Docker.
- **Builder API**: `tool()`, `resource()`, `prompt()` builders with Zod-validated `input`/`output`/`args`, inline `auth`, and `handler(input, ctx)` signatures. Replaces the legacy `logic`/`inputSchema`/`outputSchema`/`responseFormatter`/`withToolAuth` pattern.
- **Unified `Context`**: Single handler argument providing `ctx.log`, `ctx.state`, `ctx.elicit`, `ctx.sample`, `ctx.signal`, `ctx.progress`, and `ctx.uri`.
- **`createApp()` lifecycle**: Owns OTEL init, logger, transport startup, signal handling, and graceful shutdown. Returns `ServerHandle` with `shutdown()` and `services`.
- **Cloudflare Workers**: `createWorkerHandler()` with per-request `McpServer` factory, env binding injection, and `onScheduled` support.
- **Comprehensive observability**: Every tool/resource/prompt call automatically instrumented with OTel spans, duration histograms, call/error counters, and structured completion logs. Process-level gauges (RSS, heap, uptime, event loop delay). Subsystem instrumentation for storage, auth, sessions, tasks, LLM, speech, graph, and error classification. 60+ semantic convention constants.

### Added

- **Definition builders**: `tool()`, `resource()`, `prompt()` with Zod schemas, inline `auth` scopes, `format` functions, `title` field, and `task: true` for async task tools.
- **Unified `Context` interface**: `ctx.log` (auto-correlated logging), `ctx.state` (tenant-scoped KV with generics, Zod validation, batch ops, TTL), `ctx.elicit` (user prompting), `ctx.sample` (LLM completion), `ctx.signal` (cancellation), `ctx.progress` (task progress).
- **`createApp(options)`**: Composition root accepting `tools`, `resources`, `prompts`, `setup()`, `name`, `version`. Full server lifecycle management.
- **`createWorkerHandler(options)`**: Cloudflare Workers entry point with `extraEnvBindings`, `extraObjectBindings`, `onScheduled`.
- **Subpath exports**: 25+ explicit entries — `./tools`, `./resources`, `./prompts`, `./tasks`, `./errors`, `./config`, `./auth`, `./storage`, `./storage/types`, `./utils`, `./services`, `./testing`, `./worker`.
- **`z` re-export**: `import { tool, z } from '@cyanheads/mcp-ts-core'` — no separate `zod` import needed.
- **Error factories**: `notFound()`, `validationError()`, `unauthorized()`, `forbidden()`, `conflict()`, `rateLimited()`, `timeout()`, `serviceUnavailable()`, `configurationError()`, `invalidParams()`, `invalidRequest()` — all accept `(message, data?, options?)` with `{ cause }` for error chaining.
- **Auto-error classification**: Framework catches all handler errors and classifies by type/message pattern matching — `ZodError` to `ValidationError`, HTTP status codes, common message patterns, `McpError` preserved as-is.
- **`checkScopes(ctx, scopes)`**: Dynamic scope checking for runtime-dependent auth requirements.
- **`createMockContext(options?)`**: Test utility with stubbed `log`, in-memory `state`, optional `elicit`/`sample`/`progress` mocks.
- **Auto-task tools**: `task: true` on tool definitions — framework manages task creation, background execution, progress reporting, cancellation, and result storage.
- **`GET /mcp` discovery**: Server capabilities, framework identity, auth mode, and definition counts.
- **`init` CLI**: `mcp-ts-core init [name]` scaffolds a new consumer project with templates, echo definitions, and agent protocol files.
- **Shareable configs**: `tsconfig.base.json`, `biome.json`, `vitest.config.base.ts` for consumer extension.
- **Agent skills**: 12+ skill files (`skills/`) covering `setup`, `add-tool`, `add-resource`, `add-prompt`, `add-service`, `add-provider`, `add-export`, `devcheck`, `release`, `maintenance`, `migrate-mcp-ts-template`, and API references.
- **`examples/` directory**: Complete reference consumer server with 7 tools, 2 resources, 1 prompt, and 39 tests.
- **OTel instrumentation**: Process gauges, startup/shutdown spans, resource/prompt measurement, active request gauge, storage/auth/session/task/LLM/speech/graph instrumentation, error classification metric.
- **Semantic conventions**: `src/utils/telemetry/semconv.ts` with 60+ constants for all custom OTel attributes.
- **Services**: `CoreServices` exposes `config`, `logger`, `storage`, `rateLimiter`, optional `llmProvider`, `speechService`, `supabase`.
- **`GraphService.healthCheck()`**: Liveness check delegated to the underlying graph provider.
- **Utility barrels**: Unified `./utils` and `./services` exports covering formatting, parsing, security, network, pagination, scheduling, telemetry, encoding, runtime, token counting, and type guards.

### Changed (from legacy template)

- **DI container removed**: Replaced by `createApp()` direct construction. Explicit dependency struct (`McpServerDeps`) instead of token-based resolution.
- **Definition types consolidated**: Merged `New*Definition` types into canonical `ToolDefinition`, `ResourceDefinition`, `PromptDefinition`. Single code path per primitive in registration.
- **Error handling simplified**: "Logic throws, framework catches." Handlers throw plain `Error` or use error factories. No `try/catch` needed in handlers. Framework classifies, normalizes, and returns `isError: true`.
- **Auth moved inline**: `auth: ['scope']` on definitions replaces `withToolAuth()`/`withResourceAuth()` HOF wrappers.
- **`ctx.state` accepts any serializable value**: No manual `JSON.stringify`/`JSON.parse`. Supports generic types, Zod validation, batch operations (`getMany`, `setMany`, `deleteMany`), and TTL.
- **Tenant ID defaults to `'default'`**: `ctx.state` works in stdio mode without JWT auth.
- **Build system**: `tsc` + `tsc-alias` replaces `bun build` for proper `.d.ts` generation.
- **Dependencies restructured**: Heavy deps (OTEL, Supabase, OpenAI, parsers, sanitization, scheduling) moved to optional peer dependencies with lazy dynamic `import()`. Core deps minimized.
- **Auth fail-closed**: When auth is enabled but no auth context exists, throws `Unauthorized` instead of defaulting to allowed.
- **Config immutable**: Config proxy `set()`/`defineProperty()` traps return `false` after parse.
- **Async API surface**: Parser `parse()` methods, `diffFormatter`, and `sanitization` methods are async due to lazy loading.
- **Zod modernized**: `z.url()`, `z.email()`, `z.iso.datetime()` replace string refinements.
- **`devcheck` audit**: Classifies vulnerabilities as direct vs transitive, warns instead of failing for upstream-only issues.
- **HTTP error mappings expanded**: `InvalidParams` 400, `Timeout` 504, `ServiceUnavailable` 503. Error responses include `McpError.data`.
- **Prompt registration**: Callbacks wrapped in error handling via `ErrorHandler.handleError`.
- **OpenRouter provider**: SDK-level retries (`maxRetries: 2`) with exponential backoff on 429/5xx, replacing manual retry logic.
- **`ElicitResult` type**: Updated to match actual MCP SDK shape — flat `Record<string, string | number | boolean | string[]>` content, not a discriminated union with typed `data`.
- **Speech API parameters**: TTS uses `voice: { voiceId }` / `format`, STT uses `audio` / `format`. `WhisperProvider` uses direct HTTP instead of OpenAI SDK.
- **`AuthContext` narrowed**: Removed `[key: string]: unknown` index signature — explicit fields only.
- **Agent skill documentation**: Expanded with full env var reference tables (all defaults), provider registration guides per domain, auto-classification pattern reference, vitest `mergeConfig` setup, and corrected pagination/elicitation examples.

### Removed

- **DI container** (`src/container/`): 6 source files + 5 test files.
- **Legacy definition types**: `New*` prefixed types, `isNew*Definition` type guards, `newToolHandlerFactory`, `newResourceHandlerFactory`, `newPromptDefinition` — all consolidated into canonical modules.
- **`withAuth` HOF**: `withToolAuth()`, `withResourceAuth()` — replaced by inline `auth` on definitions.
- **Template definitions from `src/`**: Moved to `examples/`. Core library ships with no built-in tools/resources/prompts.
- **Legacy READMEs**: `src/mcp-server/README.md`, `src/services/README.md`, `src/storage/README.md` — superseded by CLAUDE.md and skill files.
- **Conformance test suite**: 20 test files + 4 helpers — to be rewritten against stable API post-publish.
- **`./context` subpath export**: `Context` available from main entry point.
- **11 granular `./utils/*` subpath exports**: Replaced by single `./utils` barrel.
- **`changelog/archive.md`**: Pre-3.0.0 history.
- **`@traversable/*` devDependencies**: No longer needed after removing Zod schema compatibility tests.
- **`vite-tsconfig-paths`**: Replaced by native Vitest `resolve.tsconfigPaths`.
