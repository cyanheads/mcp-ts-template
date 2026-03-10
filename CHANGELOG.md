# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.0-beta.1] - 2026-03-09

First pre-release on the `@cyanheads/mcp-ts-core` extraction path. Removes the DI container, introduces direct construction via `createApp()`, converts all third-party imports to lazy dynamic loading, and adds comprehensive conformance and integration test suites.

### Added

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
- **Test suite**: All tests updated to handle async APIs (`await`, `rejects.toThrow()`, `fc.asyncProperty()`). Mock strategies overhauled for lazy initialization patterns. Conformance harness updated with `RecordingTransport` support and async `createApp()`.
- **Dev dependencies**: Added `@vitest/ui` 4.0.18. Bumped `@cloudflare/workers-types` to 4.20260310.1, `@types/node` to 25.4.0.

### Removed

- **`src/container/`**: Entire DI container (6 files — `core/container.ts`, `core/tokens.ts`, `registrations/core.ts`, `registrations/mcp.ts`, `index.ts`, `README.md`).
- **`tests/container/`**: All container tests (5 files).
- **`changelog/archive.md`**: Legacy changelog archive (pre-3.0.0 history).
