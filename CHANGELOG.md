# Changelog

All notable changes to this project will be documented in this file.

## [1.9.1] - 2025-08-23

### Added

- **Hybrid Session Mode ("auto")**: Enhanced the `auto` session mode (`src/mcp-server/transports/core/autoTransportManager.ts`) that intelligently handles both stateful and stateless requests. It routes requests with a session ID or an `initialize` call to a stateful manager, while all other requests are handled by an ephemeral, stateless manager.
- **Standardized Transport Request**: Created a unified `McpTransportRequest` interface (`src/mcp-server/transports/core/transportRequest.ts`) to standardize the request object passed between the transport layer (Hono) and the transport managers.
- **Web-to-Node Header Conversion**: Added a `convertWebHeadersToNodeHeaders` utility (`src/mcp-server/transports/core/headerUtils.ts`) to correctly translate Web-standard `Headers` objects into Node.js `IncomingHttpHeaders`.

### Changed

- **Transport Manager Abstraction**: Refactored all transport managers (`StatefulTransportManager`, `StatelessTransportManager`, and the new `AutoTransportManager`) to conform to a common `TransportManager` interface (`src/mcp-server/transports/core/transportTypes.ts`), simplifying the HTTP transport layer.
- **HTTP Middleware (`mcpTransportMiddleware.ts`)**: The core middleware was streamlined to be responsible only for adapting the Hono request to the `McpTransportRequest` format and delegating to the active transport manager. All session-handling logic has been moved into the managers themselves.
- **Stateful Session Management**: Enhanced `StatefulTransportManager` with explicit session states (`ACTIVE`, `CLOSING`) and improved locking to prevent race conditions, ensuring requests are not processed for sessions that are being terminated.
- **OAuth Scope Parsing**: Improved the `OauthStrategy` (`oauthStrategy.ts`) to robustly parse scopes from both the `scp` (array) and `scope` (space-delimited string) claims, aligning it with the `JwtStrategy` implementation.
- **Hono Error Handling**: The global `httpErrorHandler` now correctly retrieves the `requestId` from the Hono context (`c.get("requestId")`) instead of attempting to re-parse the request body, making error responses more reliable.

### Fixed

- **Logging in Hono Bridge**: Replaced `console.warn` with the centralized `pino` logger in `honoNodeBridge.ts` to ensure all warnings are captured in structured logs.

<!-- Archived versions -->

For versions prior to 1.8.0, see:

- [v1.7.9 changelog](changelogs/CHANGELOG-v1.0.6-1.7.9.md)
<!-- /Archived versions -->

## [1.9.0] - 2025-08-23

### BREAKING CHANGE

This version introduces a major architectural refactoring focused on simplifying development, enhancing traceability, and standardizing core functionalities. A comprehensive migration guide is available at [docs/migrations/v1.9.0.md](./docs/migrations/v1.9.0.md).

### Added

- **AsyncLocalStorage for Request Context**: Replaced manual "prop drilling" of `RequestContext` with Node.js's `AsyncLocalStorage` (`src/utils/internal/asyncContext.ts`). The context is now implicitly available throughout the entire asynchronous call stack of an operation, dramatically simplifying function signatures in the logic layer.
- **Centralized Tool & Resource Handlers**: Introduced `createToolHandler` (`src/mcp-server/tools/utils/tool-utils.ts`) and `createResourceHandler` (`src/mcp-server/resources/utils/resource-utils.ts`) utilities. These factories centralize `try...catch` logic, performance measurement, and response formatting, significantly reducing boilerplate in individual `registration.ts` files.
- **Pino Logger**: Migrated the logging system from Winston to Pino for improved performance and structured, context-aware logging. The new logger (`src/utils/internal/logger.ts`) automatically enriches logs with the active `RequestContext` from `AsyncLocalStorage`.
- **Standardized Logging Helpers**: Added new helper functions (`logOperationStart`, `logOperationSuccess`, `logOperationError`) in `src/utils/internal/logging-helpers.ts` to ensure consistent and structured log messages across the application.
- **TypeScript Path Aliases**: Implemented path aliases (e.g., `@/utils`) in `tsconfig.json` to simplify import statements and improve code readability.
- **Developer Scripts**: Added new scripts for developer convenience:
  - `devdocs.ts`: A script to generate comprehensive development documentation by combining a file tree and `repomix` output.
  - `lint.ts`: An enhanced linting script using `execa` and `chalk` for better feedback.

### Changed

- **Error Codes**: Replaced the custom `BaseErrorCode` enum with `JsonRpcErrorCode` (`src/types-global/errors.ts`) to align with the JSON-RPC 2.0 specification, improving interoperability.
- **Tool & Resource Registration**: All `registration.ts` files have been refactored to use the new centralized handlers, making them significantly leaner and more focused on metadata definition.
- **Logic Functions**: All `logic.ts` files have been simplified by removing the `context` parameter. Logic functions now retrieve the context directly via `getRequestContext()`.
- **Server Initialization**: The server startup process in `src/mcp-server/server.ts` now uses centralized `registerAllTools` and `registerAllResources` functions from new barrel files (`src/mcp-server/tools/index.ts`, `src/mcp-server/resources/index.ts`) for cleaner and more scalable registration.
- **Dependencies**:
  - Added `pino`, `pino-pretty`, `pino-roll`, `ts-node`, `tsc-alias`, `chalk`, and `execa`.
  - Removed `winston`, `winston-transport`, and `@opentelemetry/instrumentation-winston`.
  - Updated numerous core dependencies, including `@modelcontextprotocol/sdk` to `^1.17.4`.

### Removed

- **`ManagedMcpServer`**: Removed the `ManagedMcpServer` wrapper class (`src/mcp-server/core/managedMcpServer.ts`) as its introspection capabilities are less critical with the new centralized architecture. The server now uses the standard `McpServer` from the SDK directly.

## [1.8.1] - 2025-08-01

### Added

- **Observability**: Integrated a comprehensive **OpenTelemetry (OTel)** instrumentation layer (`src/utils/telemetry/instrumentation.ts`) to provide deep insights into application performance and behavior. This includes:
  - **Automatic Instrumentation**: Leverages `@opentelemetry/auto-instrumentations-node` to automatically trace core Node.js modules (HTTP, DNS) and supported libraries.
  - **Trace and Metric Exporters**: Configured OTLP exporters for traces and metrics, allowing data to be sent to observability platforms. Includes a file-based trace logger for development environments without an OTLP endpoint.
  - **Custom Instrumentation**:
    - The `measureToolExecution` utility is now fully integrated with OTel, creating detailed spans for each tool call with relevant attributes (duration, success, error codes).
    - The `ErrorHandler` now automatically records exceptions on the active span, linking errors directly to their originating traces.
    - `RequestContext` is now trace-aware, automatically injecting `traceId` and `spanId` for seamless log correlation.
- **Dependencies**: Added `@opentelemetry/*` packages and `reflect-metadata` to support the new observability features.

### Changed

- **Transport Layer Refactoring**: Significantly refactored the stateful and stateless transport managers (`statefulTransportManager.ts`, `statelessTransportManager.ts`) for enhanced stability, correctness, and resource management.
  - **Stateful Manager**: Improved session lifecycle management with added concurrency controls (`activeRequests` counter) to prevent race conditions where a session could be garbage-collected during an active request.
  - **Stateless Manager**: Fixed a critical bug where resources were cleaned up prematurely before the response stream was fully consumed by the client. Cleanup is now deferred until the stream is closed, ensuring complete responses.
  - **Header Handling**: Introduced a `headerUtils.ts` module to correctly convert Node.js `OutgoingHttpHeaders` to Web-standard `Headers` objects, properly handling multi-value headers like `Set-Cookie`.
- **Error Handling**:
  - The `fetchWithTimeout` utility now correctly throws a structured `McpError` on non-2xx HTTP responses, ensuring consistent error propagation.
- **Rate Limiter**: Enhanced the `RateLimiter` to integrate with OpenTelemetry, adding attributes to spans for rate limit checks, keys, and outcomes.

### Fixed

- **`imageTest` Tool**: Removed flawed error handling logic from `imageTest/logic.ts` that was duplicating the robust error handling already provided by the `fetchWithTimeout` utility.
- **Testing**:
  - Deleted the obsolete `logic.test.ts` for the `imageTest` tool, as its functionality is now covered by the more comprehensive `fetchWithTimeout.test.ts`.
  - Updated `fetchWithTimeout.test.ts` to correctly test for thrown `McpError` on HTTP error status codes, aligning with the new, stricter error handling.

### Removed

- **`tests/mcp-server/tools/imageTest/logic.test.ts`**: This test file was removed but will be replaced with more comprehensive tests in the future.

## [1.8.0] - 2025-07-31

### BREAKING CHANGE

- **Architectural Standard v2.2**: This version introduces a mandatory and significant architectural refactoring to enforce a strict separation of concerns, enhance performance monitoring, and improve overall robustness.
  - **"Logic Throws, Handler Catches" Pattern**: Reinforced the "Logic Throws, Handler Catches" pattern across all tools and resources, ensuring consistent error handling and response formatting.
  - **`ManagedMcpServer`**: Introduced a new `ManagedMcpServer` class that wraps the core `McpServer` from the SDK. This wrapper provides enhanced introspection capabilities, such as retrieving metadata for all registered tools, which is used for status endpoints and diagnostics.
  - **`echoTool` as Canonical Example**: The `echoTool` has been completely overhauled to serve as the authoritative, production-grade example of the new architectural standard. It demonstrates best practices for schema definition, logic implementation, handler registration, and documentation.

### Added

- **Performance Monitoring**: Added a new `measureToolExecution` utility (`src/utils/internal/performance.ts`) that wraps tool logic calls to measure execution time and log detailed performance metrics (duration, success status, payload size) for every tool invocation.

### Changed

- **Tool & Resource Refactoring**: All existing tools (`catFactFetcher`, `imageTest`) and resources (`echoResource`) have been refactored to comply with the new v2.2 architectural standard. This includes separating logic and registration, adopting the "Logic Throws, Handler Catches" pattern, and integrating with the new performance monitoring utility.
- **Dependencies**: Upgraded `@modelcontextprotocol/sdk` to `^1.17.1`.
- **Documentation**:
  - Overhauled `.clinerules/clinerules.md` and `CLAUDE.md` to mandate the new architectural standard, providing detailed explanations and code examples for the "Logic Throws, Handler Catches" pattern, `ManagedMcpServer`, and the new tool development workflow.
  - Updated `docs/tree.md` to reflect the new file structure and additions.
- **Error Handling**: Refined the global `ErrorHandler` and `McpError` class to better support the new architectural pattern, including improved stack tracing and context propagation.
- **HTTP Transport**: The HTTP transport layer (`httpTransport.ts`) has been updated to use the new `ManagedMcpServer`, enabling it to expose richer server metadata and tool information at its status endpoint.
- **Testing**: Updated all relevant tests for tools and the server to align with the new architecture, ensuring that error handling, performance metrics, and registration logic are correctly validated.
