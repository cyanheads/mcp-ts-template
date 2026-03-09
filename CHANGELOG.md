# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.0-beta.1] - 2026-03-09

First pre-release on the `@cyanheads/mcp-ts-core` extraction path. Removes the DI container and introduces direct construction via `createApp()`.

### Added

- **`src/app.ts` composition root**: `createApp()` factory constructs all services in dependency order and returns an `AppHandle` with `createServer` (bound factory) and `transportManager`. Replaces the DI container.
- **`McpServerDeps` interface**: Explicit dependency struct for `createMcpServerInstance()` — config, toolRegistry, resourceRegistry, promptRegistry, rootsRegistry.
- **`docs/conformance-test-plan.md`**: MCP conformance test plan targeting spec 2025-06-18.

### Changed

- **`src/index.ts`**: `createApp()` replaces `composeContainer()`. Config accessed via direct import.
- **`src/worker.ts`**: `createApp()` for Cloudflare Worker entry point. Server factory passed to `createHttpApp()` directly.
- **`src/mcp-server/server.ts`**: Accepts `McpServerDeps` parameter instead of resolving registries from the container.
- **`src/mcp-server/transports/manager.ts`**: `TransportManager` accepts `TaskManager` as 4th constructor parameter instead of resolving it at shutdown.
- **Test suite**: All tests updated to construct dependencies directly instead of mocking the DI container. `server.test.ts` rewritten. `taskManager.test.ts` and `storageBackedTaskStore.test.ts` use `StorageService(new InMemoryProvider())`. `manager.test.ts` passes `mockTaskManager`. `server-harness.ts` uses `createApp()`.

### Removed

- **`src/container/`**: Entire DI container (6 files — `core/container.ts`, `core/tokens.ts`, `registrations/core.ts`, `registrations/mcp.ts`, `index.ts`, `README.md`).
- **`tests/container/`**: All container tests (5 files).
- **`changelog/archive.md`**: Legacy changelog archive (pre-3.0.0 history).
