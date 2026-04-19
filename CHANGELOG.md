# Changelog

All notable changes to this project will be documented in this file.

---

## [0.4.1] - 2026-04-19

Closes the OTel observability gap for MCP prompts. Tools and resources already had full instrumentation (span, counter, duration histogram, error counter, byte histograms); prompts only had a structured duration log. Prompts can now do meaningful work (conditional logic, async data fetches, multi-message assembly), so they get the same instrumentation depth. All three handler types are now symmetric.

### Added

- **Prompt OTel span** — `prompt_generation:{name}` with attributes `code.function.name`, `code.namespace=mcp-prompts`, `mcp.prompt.input_bytes`, `mcp.prompt.output_bytes`, `mcp.prompt.message_count`, `mcp.prompt.duration_ms`, `mcp.prompt.success`, and `mcp.prompt.error_code` (on failure).
- **Prompt OTel metrics** (#24) — six new instruments, eagerly initialized at startup via `initHandlerMetrics()`:
  - `mcp.prompt.generations` (Counter, `{generations}`)
  - `mcp.prompt.duration` (Histogram, `ms`)
  - `mcp.prompt.errors` (Counter, `{errors}`) — includes `mcp.prompt.error_category` dimension (`upstream`/`server`/`client`, matching tool instrumentation)
  - `mcp.prompt.input_bytes` (Histogram, `bytes`)
  - `mcp.prompt.output_bytes` (Histogram, `bytes`)
  - `mcp.prompt.message_count` (Histogram, `{messages}`)
- **`ATTR_MCP_PROMPT_*` constants** in `src/utils/telemetry/attributes.ts` — `NAME`, `INPUT_BYTES`, `OUTPUT_BYTES`, `MESSAGE_COUNT`, `DURATION_MS`, `SUCCESS`, `ERROR_CODE`, `ERROR_CATEGORY`.
- **Active-requests gauge includes prompts** — `mcp.requests.active` now covers tool, resource, and prompt handler executions. Gauge description updated accordingly.

### Changed

- **`measurePromptGeneration` signature** — accepts an optional third argument (`inputPayload: unknown`) for input-byte measurement. Backward-compatible (parameter is optional). `PromptRegistry.registerPrompt` now passes the validated args payload.
- **`performance.ts` fileoverview** — removed stale "Prompts get structured logs only" language; reflects new three-way symmetry.

### Tests

- **10 new test cases** in `tests/unit/utils/internal/performance.test.ts` mirroring the tool/resource suites: success metrics + returned messages, OTel counter + histogram on success, input/output/message-count histograms, OTel error counter + `logger.error` on failure, `McpError` code capture, generic (non-`McpError`) errors, active-requests gauge inc/dec, code namespace + function name span attributes, zero message count when generate returns a non-array.
- Full suite: 2239 passed / 10 skipped (pre-existing skips), 0 regressions.

---

## [0.4.0] - 2026-04-19

Modernizes the testing surface: new public helpers under `/testing`, custom Vitest matchers, Vitest 4 `projects` config, and consolidated test infrastructure. No behavior changes to the framework runtime.

### Added

- **`createMockLogger()`** (`@cyanheads/mcp-ts-core/testing`) — returns a `ContextLogger` whose calls are recorded on an inspectable `calls` array. Complements `createMockContext()` for unit-testing code that accepts a `ContextLogger` standalone.
- **`createInMemoryStorage(options?)`** (`@cyanheads/mcp-ts-core/testing`) — returns a real `StorageService` backed by `InMemoryProvider`. Uses the production code path, so tenant isolation, TTL, key validation, and list pagination all match live behavior — no hand-rolled fake required when unit-testing services that depend on storage.
- **`MockContextLogger` type export** — the shape returned by `createMockLogger()`.
- **Vitest 4 `projects` config** — `vitest.config.ts` now splits `unit`, `compliance`, `smoke`, and `fuzz` into filterable projects. Run individually with `bun run test:unit|test:smoke|test:fuzz|test:compliance` or all at once with `bun run test`.
- **Custom Vitest matchers** — `toBeMcpError(code?)` and `toHaveJsonRpcCode(code)` for MCP-aware assertions. Registered globally in `tests/setup.ts`.
- **Shared test helpers** — `tests/helpers/context-helpers.ts` centralizes `createMockLogger`, `createFakeStorage`, `makeRequestContext`, and `makeContextDeps` (previously duplicated across multiple test files).
- **`templates/vitest.config.ts`** — scaffolded consumer servers now ship the `projects` pattern with a `unit` project active and commented examples for `smoke`, `fuzz`, and `integration` projects.

### Changed

- **`tests/setup.ts`** — now registers the custom matchers before tests run. Same pre-mock behavior otherwise (MCP SDK stdio/mcp modules + chrono-node).
- **`tests/unit/context.test.ts` / `tests/unit/testing/mockContextFidelity.test.ts`** — refactored to use the shared helpers; ~100 lines of duplicated fake-storage scaffolding removed.

### Fixed

- **`tests/unit/mcp-server/transports/auth/lib/checkScopes.test.ts`** — latent `vi.mock` hoisting bug (bare `const mockConfig` declared above the mock factory) was masked by the old import chain. `@/testing` now transitively imports `@/config` via `StorageService → logger → config`, which surfaced the reference error. Migrated to the `vi.hoisted` pattern.

### Removed

- **`tests/helpers/mock-server.ts`, `tests/helpers/mock-handlers.ts`** — dead MSW infrastructure; no test imported them.
- **`msw` devDependency** — unused after removing the helpers.

### Tests

- Suite grew from 2213 → 2230 tests (+17 net). 136 files pass, 1 skipped. Runtime ~8–10s.
- New coverage: `tests/unit/helpers/matchers.test.ts` (11 tests) and `tests/unit/testing/exports.test.ts` (6 tests).
- `bun run devcheck --test` fully green: typecheck, biome, depcheck, security, outdated, and all tests.

---

## [0.3.8] - 2026-04-19

Fixes a visible-in-content error formatting bug that surfaces on every non-`McpError` throw from a tool handler.

### Fixed

- **Tool error content no longer has doubled `Error:` prefix** (#34) — previously, `ErrorHandler.handleError` wrapped non-`McpError` messages as `"Error in {operation}: {message}"` and stored that string as the `McpError.message`. The tool handler factory then prepended `"Error: "` when building the content block, producing `"Error: Error in tool:my_tool: something went wrong"`. `ErrorHandler.handleError` now stores the original error message on the `McpError` unchanged; the operation context is still preserved in the log line (`logger.error(\`Error in ${operation}: ...\`)`) and the `operation` field of `logContext`, where it belongs. Tool content now reads `"Error: something went wrong"`.
- **Resource error `McpError.message` no longer embeds URI-like operation token** — `resourceHandlerFactory` previously wrapped classified errors as `"Error in resource:{name}: {message}"`. The `resource:{name}:` segment read as a URI scheme and added three colons in a row when the resource name contained any separator. Resource errors now surface the original classified message; the SDK still logs with full context when it catches the thrown `McpError`.

### Changed

- **`McpError.message` contract for framework-wrapped errors** — when `ErrorHandler.handleError` wraps a non-`McpError` throw, the resulting `McpError.message` is now the original error's message verbatim (previously prefixed with `"Error in {operation}: "`). Log output is unchanged — the operation-prefixed form still appears in the `logger.error` first argument and `logContext.operation`. Server code that pattern-matched on the old prefix in `McpError.message` (e.g., `err.message.includes('Error in')`) should switch to reading `logContext.operation` or the `operation` from the error data.

### Tests

- Updated three assertions that encoded the old wrapped-message format: `errorHandler.test.ts` (`handleError` wraps generic Error), `prompt-registration.test.ts` (failing prompt generation), and `dateParser.test.ts` (`parseDateStringDetailed` wraps unexpected errors). All 2213 tests pass.

---

## [0.3.7] - 2026-04-19

Fixes a crash introduced on Node 25+ when passing the handler `Context` object as log bindings to `fetchWithTimeout` / `withRetry` (or any logger call).

### Fixed

- **Logger: pino-redact crash on Node 25 when context includes `AbortSignal`** (#32) — `@pinojs/redact`'s wildcard traversal (`*.*.field`) invokes `AbortSignal.aborted` with a non-branded receiver, which Node 25 now rejects with `TypeError: The AbortSignal.aborted getter can only be used on instances of AbortSignal`. Every tool/resource call whose log payload contained `ctx.signal` (or any non-plain-prototype object) crashed before fetch completion. Fix: a new `sanitizeLogBindings` step wired into pino's `formatters.log` strips functions and non-plain-prototype instances (`AbortSignal`, `Map`, `Set`, storage handles, etc.), converts `Date`/`URL` to strings, preserves primitives/plain objects/arrays/`Error` instances, and caps recursion depth at 4. Runs before redact traversal, so sensitive-field redaction continues to work unchanged.
- **Logger: `err` field no longer pre-serialized before pino sees it** — the manual `pino.stdSerializers.err(error)` call in `Logger.log` produced an object with `pinoErrProto` that the sanitizer would reject. The raw `Error` is now passed through, letting pino's default `err` serializer run *after* `formatters.log`.

### Changed

- **`fetchWithTimeout` / `withRetry` JSDoc** — clarified that the `context` / `options.context` parameter represents log bindings, and noted that passing the handler `Context` directly is safe (the logger sanitizes non-serializable fields). The ergonomic example pattern is unchanged.

### Tests

- **9 new sanitizer unit tests** — primitive/plain-object passthrough; `AbortSignal` stripping with a `Proxy` trip-wire asserting `aborted` is never accessed; function/method-handle stripping; `Date`/`URL` conversion; recursive non-plain-object stripping; `Map`/`Set` drop; `Error` instance preservation; circular reference survival; depth-cap truncation.
- **`fast-check` fuzz (200 runs)** — mixed-shape bindings (primitives, plain objects, `AbortSignal`, `Map`, `Set`, `Promise`, `Date`, `URL`, `Error`, functions) asserting no throws and JSON-serializable output.
- **5 new logger integration tests** — end-to-end verification with real pino: framework `Context`-like object through `logger.info`; `fetchWithTimeout` with ctx-like bindings; `withRetry` with ctx-like bindings; sensitive-field redaction still applies after sanitization; `Error` with `.cause` chain serializes correctly through pino's `err` serializer after `formatters.log` runs.

---

## [0.3.6] - 2026-04-19

Security patches for two transitive/direct advisories, dependency sweep to latest, and skill guidance on tool description structure.

### Security

- **Patched critical protobufjs advisory** (GHSA-xq3m-2v4x-88gg, CVSS 9.4) — added `protobufjs: 7.5.5` to `resolutions` to override the vulnerable 7.5.4 pulled transitively by `@grpc/proto-loader` through the OTel gRPC exporters.
- **Patched moderate hono advisory** (GHSA-458j-xx4x-4375, hono/jsx SSR HTML injection) — bumped `hono` 4.12.12 → 4.12.14 in both direct dependencies and resolutions.

### Added

- **`design-mcp-server` skill — single-paragraph tool description guidance** — new bullet recommends packing operational guidance into one cohesive paragraph rather than bullet lists or blank-line-separated sections, since descriptions render inline in most clients and operation-by-operation bullets duplicate info that lives in the `operation` enum's `.describe()` (#33).
- **`add-tool` skill — template comment** — mirrors the single-paragraph guidance as a comment above `description:` in the scaffold so authors see it at scaffold time.

### Changed

- **OpenTelemetry peer dependency ranges aligned with dev deps** — `^0.215.0` for `instrumentation-http`, `exporter-metrics-otlp-http`, `exporter-trace-otlp-http`, `sdk-node`; `^0.61.0` for `instrumentation-pino`; `^2.7.0` for `resources`, `sdk-metrics`, `sdk-trace-node`. Consumers pinned to 0.214/2.6 ranges will need to update.
- **Other peer dependency minimums refreshed** — `@supabase/supabase-js` ^2.99.3 → ^2.103.3, `openai` ^6.32.0 → ^6.34.0, `sanitize-html` ^2.17.2 → ^2.17.3, `unpdf` ^1.4.0 → ^1.6.0, `validator` ^13.15.26 → ^13.15.35, `js-yaml` ^4.1.0 → ^4.1.1.
- **Dropped `@types/diff` devDependency** — `diff` 9.0.0 ships its own TypeScript types; the `@types/diff` stub is deprecated.

### Dependencies

- `@biomejs/biome` 2.4.11 → 2.4.12
- `@cloudflare/workers-types` ^4.20260413.1 → ^4.20260418.1
- `@hono/node-server` ^1.19.13 → ^1.19.14
- `@modelcontextprotocol/ext-apps` ^1.5.0 → ^1.6.0
- `@opentelemetry/exporter-metrics-otlp-http` ^0.214.0 → ^0.215.0
- `@opentelemetry/exporter-trace-otlp-http` ^0.214.0 → ^0.215.0
- `@opentelemetry/instrumentation-http` ^0.214.0 → ^0.215.0
- `@opentelemetry/instrumentation-pino` ^0.60.0 → ^0.61.0
- `@opentelemetry/resources` ^2.6.1 → ^2.7.0
- `@opentelemetry/sdk-metrics` ^2.6.1 → ^2.7.0
- `@opentelemetry/sdk-node` ^0.214.0 → ^0.215.0
- `@opentelemetry/sdk-trace-node` ^2.6.1 → ^2.7.0
- `@supabase/supabase-js` ^2.103.0 → ^2.103.3
- `diff` 8.0.4 → 9.0.0 (resolution + peer)
- `dotenv` ^17.4.1 → ^17.4.2
- `fast-check` ^4.6.0 → ^4.7.0
- `hono` 4.12.12 → 4.12.14 (direct + resolution)
- `msw` ^2.13.2 → ^2.13.4
- `sanitize-html` ^2.17.2 → ^2.17.3
- `typescript` ^6.0.2 → ^6.0.3
- `unpdf` ^1.5.0 → ^1.6.0

---

## [0.3.5] - 2026-04-13

Skill doc improvements, template updates for `add-app-tool`, and dependency updates.

### Changed

- **`add-test` skill updated test location guidance** — when a repo has existing tests, match that layout; when no tests exist, default to a root `tests/` directory mirroring `src/` structure.
- **`design-mcp-server` skill refined description guidance** — consolidated multiline string concatenation into single-line descriptions, added "don't leak implementation details" principle, tightened description length advice.
- **Consumer templates add `add-app-tool` skill** — CLAUDE.md and AGENTS.md templates now list the `add-app-tool` skill in the workflow steps and skill table.
- **Consumer template version bumped to 0.1.1.**
- **README updated** — runtime description now reads "Bun/Node/Cloudflare Workers", development commands updated (`rebuild`, `test:all`), removed `dev:stdio`/`dev:http` from the quick-reference block.

### Dependencies

- `@biomejs/biome` 2.4.10 → 2.4.11
- `@cloudflare/workers-types` ^4.20260409.1 → ^4.20260413.1
- `@hono/node-server` 1.19.13 → 1.19.14
- `@supabase/supabase-js` ^2.102.1 → ^2.103.0
- `@types/bun` ^1.3.11 → ^1.3.12
- `@types/node` ^25.5.2 → ^25.6.0
- `@vitest/coverage-istanbul` 4.1.3 → 4.1.4
- `@vitest/ui` 4.1.3 → 4.1.4
- `bun-types` ^1.3.11 → ^1.3.12
- `dotenv` 17.4.1 → 17.4.2
- `typedoc` ^0.28.18 → ^0.28.19
- `unpdf` ^1.4.0 → ^1.5.0
- `vitest` ^4.1.3 → ^4.1.4

---

## [0.3.4] - 2026-04-08

MCP Apps resource metadata/read-time formatting fixes, skill/template guidance refresh, and minor dependency updates.

### Fixed

- **`appResource()` now mirrors definition `_meta.ui` into `resources/read` content items** — MCP Apps hosts now receive CSP and permissions metadata on the returned content item even when callers rely on the default app resource formatter. Content-item `_meta.ui` still overrides app-level defaults when both are present.
- **Non-JSON resource strings preserve raw text in the default formatter** — `resource()` string results for non-JSON MIME types (including `text/html;profile=mcp-app`) are no longer JSON-quoted. JSON MIME types still stringify string payloads so JSON responses remain valid.
- **MCP Apps examples and tests use the correct CSP field names** — corrected lingering `resource_domains` examples to `resourceDomains` and aligned permissions examples with the current `@modelcontextprotocol/ext-apps` shape.
- **Echo app template applies host theming/style context** — scaffolded app HTML now listens for `onhostcontextchanged`, applies host theme/fonts/style variables, and hydrates the initial host context after connect.

### Changed

- **Skill docs aligned with the current scaffold layout and Bun-first workflow** — add-tool/resource/prompt/service/test, setup, devcheck, maintenance, field-test, and related skills now reflect direct registration in `src/index.ts` by default, `bun run` commands, richer field-test coverage, and sparse-upstream-data guidance.
- **README API overview clarified `appResource()` behavior** — documentation now calls out that the builder applies the MCP Apps MIME type and mirrors `_meta.ui` into read content items.

### Tests

- Added coverage for `appResource()` read-content `_meta.ui` mirroring and override behavior.
- Added regression tests for raw string passthrough on non-JSON resource MIME types and JSON encoding for JSON string payloads.
- Updated MCP Apps integration and smoke tests to assert raw HTML output, read-time CSP metadata, and host-context plumbing.

### Dependencies

- `@cloudflare/workers-types` ^4.20260408.1 → ^4.20260409.1
- `vite` 8.0.7 → 8.0.8

---

## [0.3.3] - 2026-04-08

Static-URI resource registration fix, MCP Apps template cleanup, and dependency/security updates.

### Fixed

- **Static-URI resources register through the SDK exact-resource path** — `ResourceRegistry` now registers resources without URI template variables via `server.resource(name, uriString, ...)` instead of always wrapping them in `ResourceTemplate`. This prevents static resources from being double-listed by clients that merge `resources/list` and `resources/templates/list`, and restores automatic discoverability for static `ui://` resources without a manual `list()` callback. Closes #30.
- **MCP Apps static UI template no longer teaches the workaround** — Removed the redundant `list()` callback from the scaffolded `echo-app-ui` resource and aligned the integration/smoke tests with the corrected static-resource behavior.

### Tests

- Added regression coverage to ensure static URIs use the SDK string overload while templated URIs still register via `ResourceTemplate`.
- Updated MCP Apps integration and smoke tests to assert that static `ui://` resources do not require a manual `list()` callback.

### Dependencies

- `@hono/node-server` 1.19.12 → 1.19.13
- `hono` 4.12.11 → 4.12.12
- `@cloudflare/workers-types` ^4.20260405.1 → ^4.20260408.1
- `@supabase/supabase-js` ^2.101.1 → ^2.102.1
- `@vitest/coverage-istanbul` 4.1.2 → 4.1.3
- `@vitest/ui` 4.1.2 → 4.1.3
- `msw` ^2.13.0 → ^2.13.2
- `openai` ^6.33.0 → ^6.34.0
- `vite` 8.0.5 → 8.0.7
- `vitest` ^4.1.2 → ^4.1.3

---

## [0.3.2] - 2026-04-06

Richer HTTP status response and `mcpServerHomepage` config field.

### Added

- **`mcpServerHomepage` config field** — Opt-in server homepage URL via `MCP_SERVER_HOMEPAGE` env var. Surfaced in the `GET /mcp` status response under `server.homepage`. No automatic fallback from `pkg.homepage` — must be explicitly set.
- **`protocolVersions` in status response** — `GET /mcp` now includes the list of supported MCP protocol versions.
- **`extensions` in status response** — `GET /mcp` now reports which SEP-2133 extensions are active (currently advertises `io.modelcontextprotocol/ui` when present).
- **Framework homepage in status response** — `GET /mcp` `framework` section now includes `homepage` linking to the GitHub repo.

### Changed

- **`DefinitionCounts` → `ServerMeta`** — Internal refactor: `DefinitionCounts` wrapped into a `ServerMeta` interface that carries both definition counts and extensions. Threaded through `composeServices()` → `TransportManager` → `createHttpApp`/`startHttpTransport`. No public API change — `DefinitionCounts` type still exported.

### Dependencies

- `dotenv` 17.4.0 → 17.4.1
- `hono` 4.12.10 → 4.12.11

---

## [0.3.1] - 2026-04-06

Promoted `@opentelemetry/api` to a direct dependency and added a structural test to prevent eager imports of optional peer deps.

### Fixed

- **`@opentelemetry/api` promoted to direct dependency** — Moved from optional `peerDependencies` to `dependencies`. The package is eagerly imported in `errorHandler.js` and other source files, causing `ERR_MODULE_NOT_FOUND` crashes for consumers who don't install it (e.g., `bunx` invocations). Removed the corresponding `peerDependenciesMeta` entry. Closes #21.

### Tests

- **Optional peer dep import guard** — New structural test (`tests/unit/packaging/optional-peer-deps.test.ts`) scans all source files and fails if any optional peer dependency is eagerly imported (value import). Only `import type` and dynamic `import()` are allowed for optional deps. Relies on `verbatimModuleSyntax: true` to distinguish type-only from value imports.

---

## [0.3.0] - 2026-04-06

MCP Apps integration — `appTool()` and `appResource()` builders, `_meta` passthrough, linter rules for app tool/resource pairing, template examples, and comprehensive test coverage.

### Added

- **MCP Apps builders** — `appTool()` and `appResource()` convenience builders (`src/mcp-server/apps/appBuilders.ts`). `appTool()` auto-populates `_meta.ui.resourceUri` and the backwards-compat `ui/resourceUri` key. `appResource()` defaults `mimeType` to `text/html;profile=mcp-app` and `annotations.audience` to `['user']`. Both re-exported from the main entry point.
- **`APP_RESOURCE_MIME_TYPE` constant** — Exported from main entry point, matches `@modelcontextprotocol/ext-apps/server` without requiring the peer dep.
- **`_meta` passthrough** — `ResourceDefinition` and `TaskToolDefinition` interfaces now accept `_meta`. Tool and resource registration passes `_meta` through to the SDK.
- **Linter: `_meta.ui` validation** — New rules `meta-ui-type`, `meta-ui-resource-uri-required`, and `meta-ui-resource-uri-scheme` validate tool `_meta.ui` fields at startup.
- **Linter: app tool ↔ resource pairing** — `lintAppToolResourcePairing()` cross-checks that every tool declaring `_meta.ui.resourceUri` has a matching registered resource. Warns on mismatch. Supports RFC 6570 URI template matching.
- **Template: echo app** — `templates/src/mcp-server/tools/definitions/echo-app.app-tool.ts` and `templates/src/mcp-server/resources/definitions/echo-app-ui.app-resource.ts` demonstrate the full MCP Apps pattern for scaffolded servers.
- **`add-app-tool` skill** — Step-by-step guide for scaffolding MCP App tool + UI resource pairs.

### Fixed

- **`appTool()` clobbered `extraMeta.ui` fields** — The builder overwrote caller-supplied `_meta.ui` sub-fields (e.g. `visibility`) with only `{ resourceUri }`. Now merges `extraMeta.ui` fields with the auto-populated `resourceUri` (which still wins over any `extraMeta.ui.resourceUri`).
- **Linter false positive on `{+path}` URI templates** — `lintAppToolResourcePairing()` replaced all RFC 6570 expressions with `[^/]+`, causing `{+var}` (reserved expansion) and `{/var}` (path segments) to fail matching URIs containing `/`. Now uses `.+` for slash-expanding operators.
- **Template echo app missing CSP allowlist** — The scaffolded echo app resource imports `@modelcontextprotocol/ext-apps` from `unpkg.com` but did not declare `_meta.ui.csp.resourceDomains`. Hosts enforcing deny-by-default CSP would block the import. Added `resourceDomains: ['https://unpkg.com']` to the template and skill doc.
- **CSP field name casing** — Corrected `resource_domains` (snake_case) to `resourceDomains` (camelCase) in JSDoc examples and tests to match the `McpUiResourceCsp` interface from `@modelcontextprotocol/ext-apps`.

### Tests

- `appBuilders.test.ts` — 414 lines covering `appTool()` and `appResource()` field passthrough, `_meta` population, defaults, and edge cases.
- `tool-rules.test.ts` — 285 lines covering `lintToolDefinition` `_meta.ui` validation and `lintAppToolResourcePairing` cross-check.
- `validate.test.ts` — +195 lines for `_meta.ui` rules and app tool ↔ resource pairing in the integration linter.
- `resource-registration.test.ts` — +39 lines for `_meta` passthrough to `server.resource`.
- `tool-registration.test.ts` — +62 lines for `_meta` passthrough to `server.registerTool` and `registerToolTask`.
- `mcp-apps.int.test.ts` — 258-line end-to-end integration test covering builder output → linter validation → handler execution → format output.
- `template-echo-app.app-tool.test.ts` — 115-line smoke test for the echo app tool pattern.
- `echo-app-ui.app-resource.test.ts` — 95-line smoke test for the echo app UI resource pattern.

### Dependencies

- `dotenv` 17.4.0 → 17.4.1
- `hono` 4.12.10 → 4.12.11
- `@cloudflare/workers-types` ^4.20260403.1 → ^4.20260405.1
- `msw` ^2.12.14 → ^2.13.0
- `vite` 8.0.3 → 8.0.5
- `biome.json` schema 2.4.9 → 2.4.10

---

## [0.2.12] - 2026-04-03

OTel deprecation fix, form-client safety guidance, and dependency updates.

### Fixed

- **OTel `metricReader` deprecation** — `NodeSDK` constructor now uses the plural `metricReaders` array option, silencing the deprecation warning introduced in `@opentelemetry/sdk-node@^0.214.0`. Closes #21.

### Added

- **Form-client safety guidance** — Documented the pattern where form-based MCP clients (MCP Inspector, web UIs) send optional object fields with empty-string inner values instead of `undefined`. Added handler guard patterns, test examples, and checklist items to the agent protocol (`CLAUDE.md`), `add-tool` skill, `api-testing` skill, and consumer template. Closes #22.

### Tests

- Aligned log level assertions in `roots-registration` and `server` tests with the startup log downgrade from 0.2.11 (info → debug).
- Updated OTel lifecycle test to expect `metricReaders` array.

### Dependencies

- `dotenv` 17.3.1 → 17.4.0
- `hono` 4.12.9 → 4.12.10
- `@cloudflare/workers-types` ^4.20260401.1 → ^4.20260403.1
- `@modelcontextprotocol/ext-apps` ^1.3.2 → ^1.5.0
- `@types/node` ^25.5.0 → ^25.5.2
- `validator` ^13.15.26 → ^13.15.35
- Added `lodash` 4.18.1 (pinned override)

---

## [0.2.11] - 2026-04-01

SEP-2133 extensions support, resource size metadata, HTTP protocol error handling, and startup log noise reduction.

### Added

- **SEP-2133 extensions** — `createApp()` and `createWorkerHandler()` accept an `extensions` option (`Record<string, object>`) to advertise SEP-2133 extensions in server capabilities.
- **Resource `size` field** — `ResourceDefinition` now accepts an optional `size` (bytes) passed through to the SDK's resource metadata.

### Fixed

- **HTTP protocol error handling** — `httpErrorHandler` now detects `HTTPException` from `@hono/mcp` and honors its pre-built response instead of wrapping it in a generic JSON-RPC error. Active OTel span is annotated with the error detail.

### Changed

- **Startup log consolidation** — Replaced multiple info/notice registration logs with a single summary line listing registered tool/resource/prompt names. Individual registration messages downgraded from info/notice to debug across tool, resource, prompt, and roots registries.
- **Rate limit flush log level** — Suppressed-message flush downgraded from warning to debug.

### Dependencies

- `@biomejs/biome` 2.4.9 → 2.4.10
- `@cloudflare/workers-types` ^4.20260329.1 → ^4.20260401.1
- `@modelcontextprotocol/sdk` ^1.28.0 → ^1.29.0
- `@supabase/supabase-js` ^2.100.1 → ^2.101.1

---

## [0.2.10] - 2026-03-30

Task ownership, devcheck resilience, and internal cleanup.

### Fixed

- **Task session ownership persistence** — `SessionAwareTaskStore` no longer deletes ownership tracking when a task reaches a terminal state (`completed`/`failed`). Previously, completed tasks became visible to other sessions, violating session isolation. Ownership now persists through the full task lifecycle.
- **Task list visibility for sessionless callers** — Sessionless `listTasks` calls now correctly return only unowned tasks, consistent with `StorageBackedTaskStore` behavior. Previously returned all tasks regardless of ownership.

### Changed

- **Devcheck audit resilience** — Security audit check now detects connection/registry failures and emits a warning instead of silently passing when the output doesn't resemble a valid audit response.
- **Internal object construction** — Replaced spread-with-conditionals patterns in `ctx.state.list()` and `SessionAwareTaskStore.listTasks()` with explicit object construction for clarity.

### Tests

- Updated `SessionAwareTaskStore` tests to assert ownership retention through terminal states and correct sessionless visibility filtering.
- **`core/app`** — Composition root lifecycle: service composition, name/version overrides, Supabase storage init, signal handler registration, graceful shutdown, OTel init failure resilience, lint warning logging, process gauge callbacks, fatal handler backstops.
- **`cli/init`** — Scaffold command: `--help` output, unknown subcommand rejection, invalid project name validation, named project scaffolding with templates/scripts/skills, current-directory init with skip-existing behavior.
- **`tool-registration.lifecycle`** — Task and auto-task registration: resource notification binding, `_meta` forwarding, duplicate name rejection across regular/task tools, missing services guard, experimental task API registration, auth scope enforcement, default/custom formatters, completed/failed result storage, cancellation detection, TTL timeout, task-store polling failure handling.
- **`heartbeat`** — Monitor start/stop, disabled no-op, failure counting with metric emission, recovery logging and counter reset, dead connection declaration after threshold, early-stop guard.
- **`jwtStrategy.mocked`** — Non-Error verification failure normalization via mocked `jose`.
- **`http-authz.e2e`** — End-to-end scoped tool authorization against a fixture server: scoped callers invoke both public and protected tools, missing scope returns MCP authz error.
- **`prompt-registration`** — Duplicate prompt name rejection, generation failure wrapping as `McpError`.
- **`authMiddleware.metrics`** — Active span identity attribute recording with tenant/subject fallbacks.
- **`authUtils`** — Parent request context passthrough for scope checking.
- **`jwtStrategy`** — Issuer and audience verification when configured, wrong audience rejection.
- **`oauthStrategy`** — Error and non-Error JWKS init failure wrapping, `aud` claim fallback for resource validation, non-Error verification failure normalization.

### Infrastructure

- **`tests/fixtures/auth-scoped-server.js`** — Minimal HTTP fixture server with one public and one scoped tool for authz e2e tests.
- **`tests/helpers/server-process.ts`** — `resolveEntrypoint()`, `assertServerEntrypoint()`, and `startServerFromEntrypoint()` for custom fixture server spawning.

---

## [0.2.9] - 2026-03-29

Cache negative lazy-import results for optional peer deps to prevent metric spam.

### Fixed

- **Lazy-import metric spam** — Optional peer dependency loaders (`chrono-node`, `diff`, `papaparse`, `partial-json`, `pdf-lib`, `unpdf`, `js-yaml`, `openai`) now cache negative import results via the new `lazyImport()` utility. Previously, every call to a function backed by a missing peer dep would re-attempt the dynamic `import()`, throw a `ConfigurationError` through `ErrorHandler.tryCatch`, and increment the `mcp.errors.classified` counter — producing unbounded metric spam for a static configuration issue. Now: first failure logs a warning once and caches the state; subsequent calls throw immediately without retry or counter increment. Closes #20.
- **OpenRouter client init outside tryCatch** — Moved `ensureClient()` call in `chatCompletion()` outside the `ErrorHandler.tryCatch` boundary so a missing `openai` peer dep does not inflate the classified error counter on every LLM call.

### Added

- **`lazyImport()` utility** (`src/utils/internal/lazyImport.ts`) — Generic lazy-loader factory for optional peer dependencies that caches both success and failure. Logs a warning on first failure, throws `ConfigurationError` on all subsequent calls without re-importing or touching error metrics.

### Tests

- Unit tests for `lazyImport()` covering success caching, failure caching, single-warning behavior, and instance isolation.

### Changed

- `@cloudflare/workers-types` updated to `^4.20260329.1`.

---

## [0.2.8] - 2026-03-28

Heartbeat disabled by default — opt-in only.

### Fixed

- **Heartbeat default changed to disabled** — `MCP_HEARTBEAT_INTERVAL_MS` now defaults to `0` (off). The 30s default caused stdio servers to self-terminate when run without a client (dev mode, manual testing, simple harnesses). Set `MCP_HEARTBEAT_INTERVAL_MS=30000` to enable.

---

## [0.2.7] - 2026-03-28

Stdio heartbeat monitor for dead connection detection, session duration telemetry.

### Added

- **Stdio heartbeat monitor** — `HeartbeatMonitor` periodically pings the connected client via the MCP `ping` method to detect dead connections (orphaned child processes, crashed hosts). Configurable via `MCP_HEARTBEAT_INTERVAL_MS` (default 30s, disabled by default since 0.2.8) and `MCP_HEARTBEAT_MISS_THRESHOLD` (default 3). Uses recursive `setTimeout` to prevent ping overlap. Triggers graceful shutdown on threshold breach.
- **Session duration histogram** — New `mcp.session.duration` metric (seconds) records session lifetime on termination and stale cleanup. Emitted alongside existing session event counters.
- **`ATTR_MCP_CONNECTION_TRANSPORT`** — New OTel attribute constant for heartbeat and connection metrics.
- **`mcp.heartbeat.failures`** — New OTel counter tracking individual heartbeat ping failures, attributed by transport type.

### Changed

- **Session termination** — `SessionStore.terminate()` and stale cleanup now record duration via the new histogram. Stale cleanup hoists `getSessionMetrics()` outside the loop to avoid repeated lazy-init checks.

### Tests

- Updated prompt and resource registration test mocks to match new SDK handler initialization methods (`setPromptRequestHandlers`, `setResourceRequestHandlers`, `sendResourceListChanged`, `server.sendResourceUpdated`).

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
