# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.11] - 2026-03-20

Security hardening, reliability improvements, public API surface refinement, and storage provider consistency.

### Security

- **HMAC-signed pagination cursors** — Cursors now include a truncated HMAC-SHA256 signature using a per-process random key, preventing cursor forgery for key enumeration within tenant namespaces. Cursors are ephemeral — they don't survive process restarts.
- **Auth-gated server metadata** — `GET /mcp` returns minimal `{ status: 'ok' }` when auth is enabled, hiding server name, version, environment, and capability details from unauthenticated callers.
- **OTel scope redaction** — Auth middleware logs scope count instead of scope values in OTel span attributes, preventing authorization model exposure to tracing backends.
- **JWT issuer/audience validation** — `JwtStrategy` validates `iss` and `aud` claims when `MCP_JWT_EXPECTED_ISSUER` / `MCP_JWT_EXPECTED_AUDIENCE` are configured. Explicit `algorithms: ['HS256']` constraint on token verification.
- **OAuth algorithm pinning** — `OauthStrategy` restricts JWT verification to `['RS256', 'ES256', 'PS256']`, preventing algorithm confusion attacks.
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
- **`ATTR_MCP_RESOURCE_NAME`** — New bounded resource identifier attribute for metric dimensions, replacing unbounded URI on metrics.

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

- **`output` required on tool definitions** — `ToolDefinition.output` is now mandatory (was optional). Handler factory and task registration unconditionally validate output and include `structuredContent`.
- **Resource metric cardinality** — Resource metrics use bounded `mcp.resource.name` attribute instead of unbounded `mcp.resource.uri`. URI attribute reserved for span-level detail only.
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
