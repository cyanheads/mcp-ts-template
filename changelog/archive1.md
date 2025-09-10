## [1.9.5] - 2025-08-31

### Added

- **Storage Service**: Implemented a new, flexible storage abstraction layer (`StorageService`) to decouple the application from a specific storage backend. This includes:
  - An `IStorageProvider` interface defining a common contract for storage operations.
  - Three concrete providers: `InMemoryProvider`, `FileSystemProvider`, and `SupabaseProvider`.
  - A `storageFactory` to dynamically create the configured provider at startup.
- **Request IDs**: Introduced a new `generateRequestContextId` function to create shorter, more readable alphanumeric IDs (e.g., `ABC12-FG345`) for improved log traceability.

### Changed

- **Configuration**: Overhauled the configuration system (`src/config/index.ts`) to use a single, comprehensive Zod schema for validation, type inference, and default values. This replaces scattered environment variable parsing with a centralized, robust, and type-safe mechanism.
- **Dockerfile**: Optimized the `Dockerfile` for production by implementing a multi-stage build. The final image is smaller, more secure (runs as a non-root user), and contains only production dependencies.
- **Core Application**: The new `StorageService` is now initialized during the application's startup sequence in `src/index.ts`.
- **Security**: Refactored the `JwtStrategy` and `RateLimiter` to receive configuration via their constructors (dependency injection) instead of importing the global config directly, improving testability and decoupling.

### Removed

- **Supabase Client**: Deleted the old, standalone Supabase client (`src/services/supabase/supabaseClient.ts`) as its functionality is now encapsulated within the new `SupabaseProvider` in the storage layer.

## [1.9.4] - 2025-08-31

### Changed

- **Server Core**: Refactored the server instantiation logic by removing the `ManagedMcpServer` wrapper. The server now uses the `McpServer` class directly from the SDK, simplifying the architecture. This change enhances maintainability and reduces complexity - the cost/benefit of the wrapper was not justifiable.
- **Documentation**: Streamlined the documentation by removing outdated and redundant markdown files from the `docs/` and `src/` directories. The `docs/tree.md` has been updated to reflect these changes.

### Removed

- **`ManagedMcpServer`**: Deleted the `src/mcp-server/core/managedMcpServer.ts` file as part of the server core refactoring.
- **Documentation Files**: Removed `docs/api-references/duckDB.md`, `docs/api-references/jsdoc-standard-tags.md`, `docs/api-references/typedoc-reference.md`, `docs/best-practices.md`, and `src/README.md`.

## [1.9.3] - 2025-08-30

### BREAKING CHANGE

- **DuckDB Removal**: The entire DuckDB integration has been removed from the project to streamline focus and reduce complexity. A proper storage layer will be implemented in the future. All related files, dependencies, and configurations have been deleted for now.
- **Version Deprecation**: Versions `1.9.0` through `1.9.2` are considered deprecated due to the significant architectural changes and dependency updates in this release. They integrated Pino but I reverted to Winston for stability.

### Added

- **Developer Script**: Introduced a new `devdocs.ts` script to automate the generation of comprehensive development documentation by running `repomix` and `tree`, and copying the output to the clipboard.

### Changed

- **Logging**: Reverted the logging utility from Pino back to a previous, more stable Winston-based implementation to resolve performance and compatibility issues. Enhanced the logger with rate-limiting capabilities to prevent log flooding.
- **Dependencies**: Upgraded all dependencies to their latest stable versions, including major updates to `@modelcontextprotocol/sdk`, `hono`, `typescript`, and `eslint`.
- **Error Handling**: Refactored the entire error code system from the custom `BaseErrorCode` enum to the industry-standard `JsonRpcErrorCode`. This improves interoperability and aligns the project with MCP & JSON-RPC 2.0 specifications.
- **Context Propagation**: Improved `requestContextService` to more robustly handle context propagation, ensuring better traceability across operations.

### Removed

- **DuckDB Service**: Deleted all files related to the DuckDB service, including:
  - `src/services/duck-db/`
  - `src/storage/duckdbExample.ts`
  - All related test files in `tests/services/duck-db/`.

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

## [1.7.9] - 2025-07-31

### Changed

- **Dependencies**:
  - Updated `axios` to `^1.11.0` and moved it to `dependencies`.
- **ESLint**:
  - Updated `eslint.config.js` to ignore `coverage/`, `dist/`, `logs/`, `data/`, and `node_modules/`.
- **Server Core**:
  - Refactored `src/mcp-server/server.ts` for improved readability and maintainability.
- **Authentication**:
  - Refactored `src/mcp-server/transports/auth/strategies/jwtStrategy.ts` and `src/mcp-server/transports/auth/strategies/oauthStrategy.ts` to re-throw `McpError` instances directly.
- **HTTP Transport**:
  - Refactored `src/mcp-server/transports/http/httpTransport.ts` to extract the client IP address into a separate function.
- **Testing**:
  - Removed redundant tests from `tests/mcp-server/transports/auth/strategies/jwtStrategy.test.ts` and `tests/mcp-server/transports/auth/strategies/oauthStrategy.test.ts`.

## [1.7.8] - 2025-07-31

### Changed

- **Dependencies**:
  - Updated `openai` to `^5.11.0`.
  - Moved several development-related dependencies from `dependencies` to `devDependencies` for a cleaner production build.
- **Developer Experience**:
  - Added new `dev` scripts to `package.json` for running the server in watch mode using `tsx`.
  - Introduced `typecheck`, `audit`, and `prepublishOnly` scripts to improve code quality and security workflows.
- **Server Core**:
  - Refactored `src/index.ts` and `src/mcp-server/server.ts` for more robust and streamlined server initialization and shutdown logic. Error handling during startup and shutdown has been improved to provide clearer, more actionable logs.
  - The `requestContextService` is now configured once at startup in `server.ts` to ensure consistency.
- **Error Handling**:
  - Improved the `ErrorHandler` in `src/utils/internal/errorHandler.ts` to more reliably map native error types to `McpError` codes.
- **Code Quality & Robustness**:
  - Added stricter validation for the API response in `catFactFetcher/logic.ts` to prevent crashes from unexpected data formats.
  - Enhanced the `idGenerator` in `src/utils/security/idGenerator.ts` to prevent potential out-of-bounds errors during character selection.
  - Improved null-safety checks in `jsonParser.ts` and `duckdbExample.ts`.
- **Configuration**:
  - Modernized `tsconfig.json` with stricter checks (`noUncheckedIndexedAccess`, `noUnusedLocals`, etc.) and aligned it with `NodeNext` module resolution for better ESM support.
- **Testing**:
  - Updated tests in `tests/mcp-server/server.test.ts` to align with the refactored initialization and shutdown logic.

### Fixed

- **HTTP Transport**: Correctly identify the client's IP address when behind a proxy by checking the `x-real-ip` header as a fallback in `httpTransport.ts`.
- **Build**: Corrected a type export in `src/mcp-server/transports/auth/index.ts` to resolve a `SyntaxError` when running in development mode with `tsx`.

## [1.7.7] - 2025-07-29

### Changed

- **Architectural Refactor**:
  - **`httpTransport.ts`**: Completely refactored to use Hono. The logic for routing, middleware, and response handling is now managed by Hono's declarative API.
  - **`mcpTransportMiddleware.ts`**: Introduced a new dedicated Hono middleware that encapsulates all logic for processing MCP requests. It handles session detection, delegates to the appropriate transport manager (stateful or stateless), and prepares the response for Hono.
  - **`honoNodeBridge.ts`**: Added a new compatibility bridge to connect the MCP SDK's Node.js-centric `StreamableHTTPServerTransport` with Hono's Web Standards-based streaming response body.
- **Dependencies**: Added `hono` and `@hono/node-server` as core dependencies.
- **Testing**:
  - Updated tests for `jwtStrategy`, `oauthStrategy`, and `authUtils` to be more robust and align with the new architecture.
  - Improved test mocks in `tests/mocks/handlers.ts` for better coverage of real-world scenarios.

### Removed

- **Legacy Test Files**: Deleted obsolete and redundant test files for the old transport implementation, including `baseTransportManager.test.ts`, `statefulTransportManager.test.ts`, `statelessTransportManager.test.ts`, `httpErrorHandler.test.ts`, and `httpTransport.test.ts`. The new architecture is tested more effectively through integration tests.

## [1.7.6] - 2025-07-28

- **Oops**: Moving too fast and messed up versioning. This is a placeholder for uniformity in the changelog.

## [1.7.5] - 2025-07-28

### Changed

- **Transport Layer Refactoring**: Overhauled the MCP transport architecture to introduce a clear separation between stateful and stateless session management. This provides greater flexibility and robustness in handling client connections.
  - **Replaced `McpTransportManager`** with a new, more modular structure:
    - `baseTransportManager.ts`: An abstract base class for common transport logic.
    - `statefulTransportManager.ts`: Manages persistent, multi-request sessions, each with its own dedicated `McpServer` instance.
    - `statelessTransportManager.ts`: Handles ephemeral, single-request operations by creating a temporary server instance that is immediately cleaned up.
- **HTTP Transport Enhancement**: Updated the HTTP transport (`httpTransport.ts`) to be session-aware. It now dynamically handles requests based on the server's configured `MCP_SESSION_MODE` and the presence of the `mcp-session-id` header, seamlessly supporting stateful, stateless, and auto-detection modes.
- **Configuration**: Added a new `MCP_SESSION_MODE` environment variable (`auto`, `stateful`, `stateless`) to allow explicit control over the server's session handling behavior.

### Added

- **New Tests**: Added comprehensive integration tests for the new transport managers (`statefulTransportManager.test.ts`, `statelessTransportManager.test.ts`, `baseTransportManager.test.ts`) to validate session lifecycle, request handling, and resource cleanup in both modes.

### Removed

- **Deleted `mcpTransportManager.ts`** and its corresponding test file, as its functionality has been superseded by the new stateful and stateless managers.
- **Deleted `src/mcp-server/README.md`** to consolidate documentation into the main project README and `.clinerules`.

## [1.7.4] - 2025-07-27

### Changed

- **Testing Architecture Overhaul**: Completed a comprehensive shift from unit testing to an **integration-first testing approach** that prioritizes real component interactions over mocked units. This fundamental change ensures tests more accurately reflect production behavior and catch real-world integration issues that pure unit tests with heavy mocking would miss.

- **Transport Layer Refactoring**: Overhauled the `McpTransportManager` for more robust session management, handling the entire session lifecycle including creation, tracking, and garbage collection of stale sessions to prevent memory leaks. The `initializeSession` method has been replaced with a unified `initializeAndHandle` method to streamline new session creation.

- **HTTP Transport Test Fixes**: Resolved critical test failures in the HTTP transport layer that were preventing reliable CI/CD:
  - **Fixed Infinite Loop Timeout**: Resolved timeout issues caused by uncleaned `setInterval` in `McpTransportManager` that triggered Vitest's 10,000 timer abort protection
  - **Proper Mock Sequencing**: Implemented sophisticated mocking strategy using `vi.spyOn(http, 'createServer')` to accurately simulate port retry logic and `isPortInUse` behavior
  - **Error Code Handling**: Added correct error codes (`EACCES`) for non-EADDRINUSE error scenarios to test proper error propagation paths
  - **Integration Testing Compliance**: Maintained the project's integration-first philosophy while creating new comprehensive HTTP transport tests (`tests/mcp-server/transports/http/httpTransport.test.ts`)

- **Enhanced Test Coverage**: Significantly improved test coverage from **77.36%** to **83.2%** with the addition of comprehensive integration tests:
  - HTTP transport layer with complete server startup, port conflict handling, and session management validation
  - HTTP error handler with structured error response testing
  - Stdio transport with MCP protocol compliance validation
  - Authentication system tests covering JWT and OAuth 2.1 strategies with real JWKS endpoint integration
  - Database services with DuckDB connection management, query execution, and transaction handling
  - Scheduling service with cron job management and lifecycle operations

- **Testing Infrastructure Improvements**: Enhanced testing reliability and real-world accuracy:
  - **Real API Integration**: Migrated from MSW mock server to real API endpoints (httpbin.org, cataas.com) for `fetchWithTimeout` and `imageTest` tools
  - **Selective Mocking**: Implemented dedicated MSW server instances only where needed (OAuth, OpenRouter) while allowing real API calls by default
  - **Test Isolation**: Removed global MSW configuration to prevent cross-test interference and enable more realistic testing scenarios

- **Configuration Updates**: Updated default LLM model from `google/gemini-2.5-flash-preview-05-20` to `google/gemini-2.5-flash` for improved stability and performance.

### Added

- **Comprehensive Test Suite**: Added extensive integration and unit tests across core systems:
  - `tests/mcp-server/transports/http/httpTransport.test.ts`: Complete HTTP transport integration tests validating server startup, port retry logic, session management, and MCP protocol flows
  - `tests/mcp-server/transports/auth/lib/authUtils.test.ts`: Authorization utility functions and scope validation tests
  - `tests/mcp-server/transports/auth/strategies/jwtStrategy.test.ts`: JWT authentication strategy tests including token validation and dev mode bypass
  - `tests/mcp-server/transports/auth/strategies/oauthStrategy.test.ts`: OAuth 2.1 authentication strategy tests with JWKS endpoint integration
  - `tests/services/duck-db/duckDBConnectionManager.test.ts`: DuckDB connection management, initialization, and extension loading tests
  - `tests/services/duck-db/duckDBQueryExecutor.test.ts`: DuckDB query execution, transactions, and error handling tests
  - `tests/services/duck-db/duckDBService.test.ts`: Main DuckDB service orchestration tests
  - `tests/utils/scheduling/scheduler.test.ts`: SchedulerService singleton tests covering job management and cron validation

- **Development Dependencies**: Added `supertest` and `@types/supertest` to support integration testing of the Hono HTTP server.

- **Documentation Updates**: Updated `.clinerules` with new integration-first testing mandates and `docs/tree.md` to reflect the expanded test directory structure.

## [1.7.3] - 2025-07-27

### BREAKING CHANGE

- **Transport Layer Architecture**: The entire MCP transport layer has been refactored for improved modularity, testability, and separation of concerns. The previous monolithic `httpTransport.ts` and `stdioTransport.ts` have been replaced by a new architecture under `src/mcp-server/transports/`.
  - **Core Logic**: Introduced a `McpTransportManager` (`src/mcp-server/transports/core/mcpTransportManager.ts`) to abstract away the MCP-SDK implementation details and session management from the HTTP server logic.
  - **Modular Transports**: HTTP and Stdio logic are now cleanly separated into `src/mcp-server/transports/http/` and `src/mcp-server/transports/stdio/` respectively.
  - **Hono Integration**: The Hono app creation (`createHttpApp`) is now a separate, testable function, and the transport manager is injected as a dependency.

- **Authentication System Overhaul**: The authentication system has been completely redesigned to use a strategy pattern, making it more extensible and robust.
  - **Auth Strategy Pattern**: Introduced a new `AuthStrategy` interface (`src/mcp-server/transports/auth/strategies/authStrategy.ts`) with concrete implementations for JWT (`jwtStrategy.ts`) and OAuth (`oauthStrategy.ts`).
  - **Auth Factory**: A new `authFactory.ts` dynamically selects the appropriate authentication strategy based on the server configuration (`MCP_AUTH_MODE`).
  - **Unified Middleware**: A single, unified `authMiddleware.ts` now handles token extraction and delegates verification to the selected strategy.
  - **Configuration**: The `MCP_AUTH_MODE` now supports a value of `'none'` to completely disable authentication.

### Added

- **New Tests**: Added comprehensive unit tests for the new transport and authentication architecture.
  - `tests/mcp-server/transports/http/http.test.ts`: Tests the Hono routing and integration with the transport manager.
  - `tests/mcp-server/transports/auth/auth.test.ts`: Tests the auth factory, strategies, and middleware.
  - `tests/mcp-server/transports/core/mcpTransportManager.test.ts`: Tests the core session management logic.
  - `tests/mcp-server/server.test.ts`: Tests the main server initialization and transport selection logic.
- **Logger Test Utility**: Added a `resetForTesting` method to the `Logger` class to ensure a clean state between test runs.

### Changed

- **Dependencies**: Updated `package.json` version to `1.7.3`.
- **Configuration**: The `MCP_AUTH_MODE` enum in `src/config/index.ts` now includes `'none'` as a valid option, defaulting to it.
- **Testing**: Updated existing tests for `echoTool`, `catFactFetcher`, and others to align with the latest testing patterns and Vitest configurations.
- **Focus**: MCP Client and Agent frameworks moved to new [atlas-mcp-agent](https://github.com/cyanheads/atlas-mcp-agent). This template now focuses exclusively on providing a robust, production-ready foundation for building MCP servers.

### Removed

- **Legacy Transport Files**: Deleted `src/mcp-server/transports/httpTransport.ts`, `src/mcp-server/transports/stdioTransport.ts`, and `src/mcp-server/transports/httpErrorHandler.ts`.
- **Legacy Auth Files**: Deleted all files from `src/mcp-server/transports/auth/core/` and `src/mcp-server/transports/auth/strategies/jwt/`, `src/mcp-server/transports/auth/strategies/oauth/`.

### Moved

- **Agent Framework**: Removed the entire `src/agent/` directory. The agent framework is now maintained in a separate project to decouple it from the server template.
- **MCP Client**: Removed the `src/mcp-client/` directory. The client implementation is also being moved to a separate project.

## [1.7.2] - 2025-07-27

### Added

- **Testing Framework**: Integrated Vitest for unit testing. Added `vitest.config.ts`, `tsconfig.vitest.json`, and new test scripts (`test`, `test:watch`, `test:coverage`) to `package.json`.
- **Unit Tests**: Added initial unit tests for `echoTool` and `catFactFetcher` logic to validate both success and failure paths.
- **Dependencies**: Added `@vitest/coverage-v8`, `vitest`, `@anatine/zod-mock`, `@faker-js/faker`, and `vite-tsconfig-paths` to support the new testing setup.

### Changed

- **Configuration**:
  - Updated `.clinerules` with a new "Testing Mandates" section outlining the testing strategy.
  - Updated `.gitignore` to no longer ignore the `.vscode/` directory.
  - Updated `tsconfig.json` to enable `resolveJsonModule`.
- **Dependencies**: Upgraded numerous dependencies to their latest versions, including `@modelcontextprotocol/sdk` to `^1.17.0`, `hono` to `^4.8.9`, and `typescript-eslint` to `^8.38.0`.
- **Documentation**: Updated `docs/tree.md` to reflect the new test files and configurations.

## [1.7.1] - 2025-07-17

### Changed

- **Error Handling**: Overhauled the error handling mechanism across all tools (`echoTool`, `catFactFetcher`, `imageTest`) and resources (`echoResource`) to align with the latest `McpError` standards. Handlers now consistently return a structured error object (`isError: true`, `structuredContent: { code, message, details }`) on failure, providing more detailed and actionable error information to the client.
- **Dependencies**: Upgraded core dependencies, including `@modelcontextprotocol/sdk` to `^1.16.0`, `@supabase/supabase-js` to `^2.52.0`, and `openai` to `^5.10.1`.
- **Documentation**: Updated `.clinerules` and `docs/best-practices.md` to reflect the new error handling patterns and dependency versions.

## [1.7.0] - 2025-07-15

### Changed

- **Tooling Refactor**: Aligned all tools (`echoTool`, `catFactFetcher`, `imageTest`) with the `@modelcontextprotocol/sdk` v1.15.1 specification. This includes:
  - Migrating from the legacy `server.tool()` method to the new `server.registerTool()` method.
  - Implementing structured output schemas (`outputSchema`) for predictable and type-safe tool responses.
  - Adding tool annotations (`readOnlyHint`, `openWorldHint`) to provide clients with better metadata about tool behavior.
- **Dependencies**: Upgraded core dependencies, including `@modelcontextprotocol/sdk` to `^1.15.1`, and updated various other packages to their latest versions.
- **Error Handling**: Refined error handling in tool registrations to be more concise and align with the new SDK patterns.

## [1.6.4] - 2025-07-15

### Added

- **Security**: Implemented a new IP-based rate-limiting feature for the HTTP transport to protect against resource abuse. This is configurable via `MCP_RATE_LIMIT_WINDOW_MS`, `MCP_RATE_LIMIT_MAX_REQUESTS` environment variables.

### Changed

### Changed

- **Type Safety**: Significantly improved type safety across the codebase by replacing `any` with `unknown` or more specific types, particularly in the agent core, MCP client/server components, and utility functions. This enhances robustness and reduces potential runtime errors.
- **Error Handling**: Refined error handling logic in several modules (`fetch-openapi-spec.ts`, `tree.ts`, `config/index.ts`) to provide more specific and useful error messages.
- **Dependencies**: Updated `package.json` and `package-lock.json` with new ESLint-related dependencies and bumped the project version to `1.6.3`.
- **DuckDB Service**: The DuckDB service (`duckDBService.ts`, `duckDBQueryExecutor.ts`) now exclusively supports array-style parameters for SQL queries, removing support for named-object parameters to simplify the implementation and align with the underlying driver's capabilities.
- **Scheduler**: Refactored the `SchedulerService` to use `cron.createTask` for more reliable task instantiation.
- **Code Quality**: Various other minor code quality improvements and refactorings throughout the project.

## [1.6.2] - 2025-07-05

### Changed

- **Dependencies**: Updated `dotenv` to `^16.6.1`.

## [1.6.1] - 2025-07-05

### Changed

- **Dependencies**: Updated several key dependencies to their latest versions, including `@modelcontextprotocol/sdk`, `hono`, `zod`, and `openai`, to incorporate the latest features and security patches.
- **Configuration**: Refactored the configuration loader (`src/config/index.ts`) to be more resilient. It now gracefully handles invalid or inaccessible custom log directories by falling back to the default `logs/` directory, preventing application startup failures.
- **Logging**: Improved the `Logger` utility (`src/utils/internal/logger.ts`) to correctly handle cases where a log directory cannot be created. File-based logging is now disabled in such scenarios, but console logging remains active, ensuring the application can still run.
- **Documentation**:
  - Updated `docs/best-practices.md` to align with the latest architectural standards and provide clearer guidance on tool development workflows.
  - Regenerated `docs/tree.md` to reflect the current project structure.
- **Housekeeping**:
  - Updated `.gitignore` to include the `data/` directory.
  - Updated `repomix.config.json` to ignore the `docs/api-references/` directory during analysis.

## [1.6.0] - 2025-06-24

### BREAKING CHANGE

- **MCP Client Architecture**: The MCP client has been significantly refactored to support multi-agent and swarm scenarios.
  - Introduced `McpClientManager` (`src/mcp-client/core/clientManager.ts`), a class that provides an isolated connection pool. Each instance manages its own set of client connections, preventing cross-agent interference.
  - The global, singleton-based connection functions (`connectMcpClient`, `disconnectMcpClient`) have been removed in favor of instance methods on `McpClientManager`.
  - The global client cache (`src/mcp-client/core/clientCache.ts`) has been removed. Caching is now handled internally by each `McpClientManager` instance.
  - A new factory function, `createMcpClientManager`, is now the primary entry point for creating a client connection manager.

### Added

- **Core Agent Framework**: Introduced the `src/agent/` module, a complete framework for building and running autonomous AI agents. This new module includes:
  - **Core Agent Logic (`src/agent/agent-core/`)**: Features a central `Agent` class that manages the entire agent lifecycle.
  - **JSON-Based Control Protocol**: The agent operates on a structured, JSON-based command-and-control protocol. The agent's system prompt (`src/agent/agent-core/agent.ts`) instructs the LLM to respond with a strict JSON object containing a `command` (`mcp_tool_call`, `display_message_to_user`, `terminate_loop`) and `arguments`. The main run loop parses these commands and dispatches actions accordingly for a predictable and robust execution flow.
  - **Command-Line Interface (`src/agent/cli/`)**: Provides a robust entrypoint for launching and managing the agent, including service bootstrapping (`boot.ts`) and argument parsing (`main.ts`).
  - **NPM Script**: Includes a convenient `start:agent` script in `package.json` for easy execution.
- **Interaction Logging**: Implemented detailed interaction logging for the `OpenRouterProvider`. All raw requests to and responses from the OpenRouter API (including streaming responses and errors) are now logged to a dedicated `logs/interactions.log` file for enhanced traceability and debugging.

### Changed

- **Dependencies**: Updated `@modelcontextprotocol/sdk` to `^1.13.1` and `openai` to `^5.7.0`.
- **Agent Model**: Switched the default LLM for the agent from `google/gemini-2.5-flash-lite-preview-06-17` to the more powerful `google/gemini-2.5-flash` and adjusted the temperature for more creative responses.
- **MCP Client Manager**:
  - The `findServerForTool` method in `McpClientManager` has been replaced with a more efficient, synchronous `getServerForTool` method that uses a cached tool map.
  - Corrected the asynchronous logic in `McpClientManager` to ensure the internal list of connected clients is populated reliably before any subsequent operations attempt to use it.
- **Refactoring**: Refactored `agent.ts` to correctly handle the asynchronous nature of MCP client connections and tool fetching.
- **Documentation**:
  - Updated `src/mcp-client/README.md` to reflect the new `McpClientManager`-based architecture and its benefits for agent swarm scenarios.
  - Regenerated `docs/tree.md` to include the new `src/agent/` directory and other structural changes.
- **`.gitignore`**: Removed `examples/` and related directories from the ignore list to allow example code to be version-controlled.

### Fixed

- **Agent Tool Discovery**: Fixed a critical race condition in the agent's startup sequence that prevented it from discovering available tools from connected MCP servers. The agent now correctly waits for all server connections to be fully established before fetching the tool list, ensuring the LLM is always aware of its full capabilities.
- **MCP Client Manager**: Corrected the asynchronous logic in `McpClientManager` to ensure the internal list of connected clients is populated reliably before any subsequent operations attempt to use it.

## [1.5.7] - 2025-06-23

### Added

- **Scheduler Service**: Introduced a new `SchedulerService` in `src/utils/scheduling` for managing cron-like scheduled jobs. This service wraps the `node-cron` library to provide a simple, platform-agnostic way to define, schedule, and manage recurring tasks within the application.

### Changed

- **Documentation**: Updated `CLAUDE.md` with a more detailed project overview, architectural patterns, and development guidelines.
- **Dependencies**: Added `node-cron` and `@types/node-cron` to support the new scheduler service.

## [1.5.6] - 2025-06-23

### Changed

- **Formatting**: Fixed formatting issues in documentation files.

## [1.5.5] - 2025-06-20

### Changed

- **Authentication Middleware**:
  - In `jwtMiddleware.ts` and `oauthMiddleware.ts`, added checks to ensure the middleware only runs if the corresponding `MCP_AUTH_MODE` is enabled. This prevents unnecessary processing when a different authentication strategy is active.
- **HTTP Transport**:
  - Improved type safety in `httpTransport.ts` by explicitly typing the `c` (Context) and `next` (Next) parameters in Hono middleware functions.
  - Corrected the type for the `info` parameter in the `serve` callback to `{ address: string; port: number }`.
- **Documentation**:
  - Updated `docs/tree.md` to reflect the latest project structure.
  - Updated version to `1.5.5` in `package.json` and `README.md`.

## [1.5.4] - 2025-06-20

### Changed

- **Architectural Refactor**:
  - **Authentication Module**: Overhauled the authentication and authorization system for improved modularity, clarity, and security.
    - Relocated all authentication-related files from `src/mcp-server/transports/authentication/` to a new, structured directory at `src/mcp-server/transports/auth/`.
    - Organized the new module into `core/` for shared logic (`authContext.ts`, `authTypes.ts`, `authUtils.ts`) and `strategies/` for specific implementations (`jwt/`, `oauth/`).
    - Introduced a new centralized `httpErrorHandler.ts` to standardize error responses from the HTTP transport layer, ensuring consistent and secure error reporting.
    - Added a barrel file (`src/mcp-server/transports/auth/index.ts`) to simplify imports of auth components across the application.
- **Dependencies**:
  - Updated `package.json` and `package-lock.json` to reflect the refactoring.
- **Documentation**:
  - Created a new `src/README.md` to provide a detailed technical overview of the source code, its architecture, and development patterns.
  - Updated `src/mcp-server/README.md`, `src/mcp-client/client-config/README.md`, and `scripts/README.md` to include cross-references, creating a more cohesive and navigable documentation experience.
  - Updated `.clinerules` to reflect the new auth structure.
  - Regenerated `docs/tree.md` to show the new file organization.
- **Code Quality**:
  - Modified `src/mcp-server/transports/httpTransport.ts` to use the new `httpErrorHandler`.

## [1.5.3] - 2025-06-17

### Changed

- **Dependencies**:
  - Updated `zod` from `^3.25.65` to `^3.25.67`.
- **Tooling**:
  - **`imageTest`**: Refactored the `fetchImageTestLogic` in `src/mcp-server/tools/imageTest/logic.ts` to use the more resilient `fetchWithTimeout` utility, improving error handling for network requests.
- **Documentation**:
  - **`.clinerules`**: Enhanced the developer guide with more detailed code examples for the "Logic Throws, Handlers Catch" pattern. Added new sections covering the resource development workflow, integration of external services via singletons, and expanded security mandates for authentication and authorization.

## [1.5.2] - 2025-06-16

### Changed

- **Architectural Refactor**:
  - **`OpenRouterProvider`**: Overhauled `src/services/llm-providers/openRouterProvider.ts` to strictly implement the "Logic Throws, Handlers Catch" pattern. Core API interactions are now in private `_logic` functions that throw structured `McpError`s, while the main class acts as a handler, managing state, rate limiting, and `try...catch` blocks.
  - **MCP Client**: Refactored `src/mcp-client/core/clientManager.ts` and `src/mcp-client/transports/transportFactory.ts` for improved clarity, error handling, and maintainability. The transport factory now uses a `switch` statement for better code flow.
- **Dependencies**:
  - Updated several dependencies to their latest versions, including `@duckdb/node-api`, `@types/jsonwebtoken`, `@types/node`, `openai`, and `zod`.
- **Documentation**:
  - **`src/mcp-server/README.md`**: Added a new section on "Integrating External Services," providing guidance on encapsulating external API logic into service provider classes.
  - **`docs/tree.md`**: Regenerated to reflect the latest project structure.

## [1.5.1] - 2025-06-15

### Added

- **Architectural Documentation**: Added `docs/best-practices.md` to formally document the "Logic Throws, Handlers Catch" pattern, contextual logging requirements, and standardized module structure.
- **Developer Tooling**: Added `depcheck` and a corresponding `npm run depcheck` script to identify and report unused dependencies.

### Changed

- **Architectural Refactor**:
  - **"Logic Throws, Handlers Catch" Pattern**: Refactored all tools (`echoTool`, `catFactFetcher`, `imageTest`) and resources (`echoResource`) to strictly separate core business logic from transport-level handling.
    - **`logic.ts` files** now contain only the core functionality and `throw McpError` on failure.
    - **`registration.ts` files** now act as handlers, wrapping logic calls in `try...catch` blocks and formatting the final `CallToolResult` for both success and error cases.
  - **Error Handling**: Centralized error processing in registration handlers using `ErrorHandler.handleError` to ensure consistent logging and response formatting.
  - **Request Context**: Enforced rigorous use of `RequestContext` throughout the application, ensuring all operations are traceable via `requestId` and `parentRequestId`.
- **Packaging & Execution**:
  - Modified `package.json`, `mcp.json`, and `Dockerfile` to make the project executable via `npx mcp-ts-template`, improving usability as a standalone server.
- **Dependencies**:
  - Updated `@modelcontextprotocol/sdk` to `^1.12.3` and `zod` to `^3.25.64`.
  - Removed several unused dependencies identified by `depcheck`, including `bcryptjs`, `chalk`, `cli-table3`, `pg`, and `winston-daily-rotate-file`.
- **Documentation**:
  - **`.clinerules`**: Overhauled the developer guide to reflect the new mandatory architectural patterns, replacing the previous cheatsheet format with a formal standards document.
  - **`README.md`**: Updated installation and usage instructions to prioritize `npx` execution. Added a new section for adding the server to an MCP client configuration.
  - **`docs/tree.md`**: Regenerated to reflect the latest project structure.

## [1.5.0] - 2025-06-12

### Added

- **Authentication**: Implemented a robust **OAuth 2.1 authentication** system for the HTTP transport (`oauthMiddleware.ts`), configurable via `MCP_AUTH_MODE=oauth`. This includes:
  - JWT validation against a remote JWKS.
  - Issuer and audience claim verification.
  - An `authContext` using `AsyncLocalStorage` to securely pass `AuthInfo` to downstream handlers.
  - A `withRequiredScopes` utility (`authUtils.ts`) for enforcing scope-based access control within tools and resources.
- **Session Management**: Added session timeout and garbage collection for the HTTP transport to automatically clean up stale connections.

### Changed

- **Dependencies**:
  - Updated numerous dependencies, including `hono`, `@supabase/supabase-js`, `@types/node`, `openai`, and `zod`.
  - Added `jose` for robust JWT and JWS handling in the new OAuth middleware.
- **Authentication**:
  - Refactored the existing JWT middleware (`authMiddleware.ts`) to use the new `authContext`, ensuring a consistent authentication pattern across both `jwt` and `oauth` modes.
- **Configuration**:
  - Added new environment variables to `src/config/index.ts` to support OAuth 2.1: `MCP_AUTH_MODE`, `OAUTH_ISSUER_URL`, `OAUTH_JWKS_URI`, and `OAUTH_AUDIENCE`.
- **Documentation**:
  - Updated `src/mcp-server/README.md` to document the new authentication modes and the `withRequiredScopes` utility.
  - Updated `.gitignore` to exclude `.wrangler` and `worker-configuration.d.ts`.
  - Updated `docs/tree.md` to reflect new authentication-related files.

## [1.4.9] - 2025-06-05

### Changed

- **Client Configuration**: Removed the fallback to `mcp-config.json.example` in the client configuration loader, enforcing a stricter requirement for an explicit `mcp-config.json` file.
- **Documentation**:
  - Updated `.clinerules` (developer cheatsheet) with a detailed example of using the MCP client and a concrete example of tool registration.
  - Updated `README.md` to reflect the Hono migration and the stricter client configuration.
  - Updated `src/mcp-client/client-config/README.md` to clarify the removal of the configuration fallback.
  - Updated `src/mcp-server/README.md` to include the `imageTest` tool in the list of examples.

## [1.4.8] - 2025-06-05

### BREAKING CHANGE

- **HTTP Server Migration**: The HTTP transport layer in `src/mcp-server/transports/httpTransport.ts` has been migrated from **Express.js to Hono**. This is a significant architectural change that improves performance and leverages a more modern, lightweight framework. While the external API remains the same, internal middleware and request handling logic have been completely rewritten.

### Added

- **Supabase Client**: Added a dedicated Supabase client service in `src/services/supabase/supabaseClient.ts` for robust interaction with Supabase services.

### Changed

- **Configuration**: Overhauled `.env.example` to provide a more structured and comprehensive template for all server, transport, authentication, and service configurations.
- **Dependencies**:
  - Replaced `express` with `hono` and `@hono/node-server`.
  - Added `bcryptjs` and `pg` for future authentication and database integration.
  - Updated `package.json` and `package-lock.json` to reflect these changes.
- **Authentication**: Refactored `src/mcp-server/transports/authentication/authMiddleware.ts` to be compatible with Hono's middleware context.
- **Documentation**: Updated `docs/tree.md` to reflect the new files and updated `src/mcp-server/README.md` to mention Hono.

## [1.4.7] - 2025-06-05

### Added

- **Configuration**: Added `.env.example` to provide a template for required environment variables.

### Changed

- **Build & Deployment**:
  - Significantly expanded `.dockerignore` to provide a more comprehensive and structured list of files and directories to exclude from Docker builds, improving build efficiency and security.
- **Dependencies**:
  - Updated various dependencies in `package.json` and `package-lock.json`.
- **Code Quality**:
  - Minor code cleanup in `src/mcp-server/transports/httpTransport.ts` and `src/utils/internal/logger.ts`.
- **Documentation**:
  - Updated version to `1.4.7` in `README.md` and `package.json`.
  - Updated `docs/tree.md` with the latest file structure.

## [1.4.6] - 2025-06-04

### Changed

- **HTTP Transport Security (`src/mcp-server/transports/httpTransport.ts`)**:
  - Implemented rate limiting middleware for the MCP HTTP endpoint to protect against abuse.
  - Enhanced `isOriginAllowed` logic for more secure handling of `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials` headers, particularly for `null` origins.
- **Utilities**:
  - `idGenerator.ts`: Improved the `generateRandomString` method by implementing rejection sampling. This ensures a more uniform distribution of characters from the charset, enhancing the cryptographic quality of generated IDs.
  - `sanitization.ts`: Strengthened the `sanitizeUrl` method to disallow `data:` and `vbscript:` pseudo-protocols in addition to the already blocked `javascript:`, further reducing XSS risks.
- **Build & Versioning**:
  - Updated project version to `1.4.6` in `package.json`, `package-lock.json`, and `README.md`.

## [1.4.5] - 2025-06-04

### Changed

- **Project Configuration**:
  - Updated `package.json`: Added `$schema` property for JSON Schema Store validation.
- **Client Transports**:
  - `stdioClientTransport.ts`: Refactored environment variable handling to only use explicitly defined environment variables from the server's configuration, removing the inheritance of the parent process's environment for improved security and predictability.
- **Server Tools**:
  - `catFactFetcher/logic.ts`:
    - Added comments highlighting best practices for configurable API URLs and timeouts.
    - Modified error logging for non-OK API responses to include the full `errorText` in `responseBodyBrief` instead of a truncated snippet.
  - `imageTest/registration.ts`:
    - Improved `RequestContext` handling during tool invocation to ensure better context linking and traceability.
    - Wrapped tool registration logic in `ErrorHandler.tryCatch` for consistent error management during server initialization.
- **Server Authentication**:
  - `authMiddleware.ts`: Implemented stricter validation for JWT `scope` or `scp` claims. The middleware now returns a 401 Unauthorized error if these claims are missing, malformed, or result in an empty scope array, enhancing security by ensuring tokens have necessary permissions.
- **Utilities**:
  - `logger.ts`:
    - Streamlined initialization by removing redundant log directory creation logic, now handled by the central configuration module (`src/config/index.ts`).
    - Ensured the `initialized` flag is set only after the logger setup is fully complete.
  - `idGenerator.ts`:
    - Removed logging from `idGenerator.ts` to prevent circular dependencies with `requestContextService`.
    - Updated JSDoc comments to reflect this change and its rationale.
  - `sanitization.ts`:
    - Updated JSDoc for `sanitizeInputForLogging` to detail the limitations of the `JSON.parse(JSON.stringify(input))` fallback method (used when `structuredClone` is unavailable), covering its impact on types like `Date`, `Map`, `Set`, `undefined` values, functions, `BigInt`, and circular references.
- **Documentation**:
  - Updated version badge in `README.md` to `1.4.5`.
  - Updated generation timestamp in `docs/tree.md`.

## [1.4.4] - 2025-06-04

### Changed

- **Development Workflow & CI**:
  - Updated GitHub Actions workflow (`.github/workflows/publish.yml`) to use Node.js `20.x` (up from `18.x`) and enabled npm caching for faster builds.
- **Project Configuration**:
  - Restructured `.gitignore` for better organization and more comprehensive coverage of common IDE, OS, language, and build artifacts.
  - Updated `package.json`:
    - Bumped project version to `1.4.4`.
    - Updated Node.js engine requirement to `>=20.0.0` (from `>=16.0.0`).
    - Added `types` field to specify the main type definition file.
    - Added `funding` information.
  - Updated `package-lock.json` to reflect dependency updates and version bump.
- **Dependencies**:
  - Updated `openai` from `^5.0.2` to `^5.1.0`.
  - Updated `zod` from `^3.25.49` to `^3.25.51`.
- **Documentation**:
  - Updated `.clinerules` (developer cheatsheet) to emphasize the importance of detailed descriptions for tool parameters (in Zod schemas) for LLM usability.
  - Updated `docs/tree.md` with a new generation timestamp and corrected a minor path display for `echoToolLogic.ts` to `echoTool/logic.ts`.

## [1.4.3] - 2025-06-04

### Changed

- **Refactoring**:
  - Standardized tool file naming convention:
    - Logic files renamed from `*Logic.ts` to `logic.ts` (e.g., `echoToolLogic.ts` -> `echoTool/logic.ts`, `catFactFetcherLogic.ts` -> `catFactFetcher/logic.ts`).
    - Registration files renamed from `*Registration.ts` to `registration.ts` (e.g., `catFactFetcherRegistration.ts` -> `catFactFetcher/registration.ts`).
  - Updated import paths in `src/mcp-server/server.ts`, `src/mcp-server/tools/catFactFetcher/index.ts`, and `src/mcp-server/tools/echoTool/registration.ts` to reflect the new file names.
- **Documentation**:
  - Updated `.clinerules` (developer cheatsheet) with:
    - Enhanced explanations for HTTP security middleware order and graceful shutdown.
    - More detailed descriptions of MCP SDK usage, including high-level vs. low-level abstractions, modular capability structure, and dynamic capabilities.
    - Expanded examples and clarifications for core utilities (Logging, Error Handling, Request Context).
    - Clarified resource `updates` and `blob` encoding.
    - Added details on tool annotations and trust model.
  - Updated `docs/tree.md` to reflect the refactored tool file structure.
  - Updated the project structure tree within `CLAUDE.md` to align with `docs/tree.md`.
- **Build**:
  - Updated project version to `1.4.3` in `package.json` and `README.md`.

## [1.4.2] - 2025-06-03

### Changed

- **LLM Providers**: Simplified LLM provider integration by removing the `llmFactory.ts` and associated barrel files (`src/services/index.ts`, `src/services/llm-providers/index.ts`, `src/services/llm-providers/openRouter/index.ts`). The `OpenRouterProvider` (`src/services/llm-providers/openRouterProvider.ts`) now handles its own client initialization directly.
- **Dependencies**: No direct dependency changes in this version, but file structure simplification impacts imports.
- **Documentation**:
  - Updated `README.md` version badge to `1.4.2`.
  - Updated `docs/tree.md` to reflect the simplified LLM provider file structure.
- **Build**:
  - Updated project version to `1.4.2` in `package.json` and `package-lock.json`.

## [1.4.1] - 2025-05-31

### Added

- **Tool**: Added `get_random_cat_fact` tool (`src/mcp-server/tools/catFactFetcher/`) that fetches a random cat fact from an external API. This demonstrates making external API calls within a tool.
- **Utility**: Added `fetchWithTimeout` utility (`src/utils/network/fetchWithTimeout.ts`) for making HTTP requests with a specified timeout.

### Changed

- **Dependencies**:
  - Updated `@types/node` from `^22.15.28` to `^22.15.29`.
  - Updated `ignore` from `^7.0.4` to `^7.0.5`.
- **Server**:
  - Registered the new `get_random_cat_fact` tool in `src/mcp-server/server.ts`.
- **Utilities**:
  - Exported network utilities (including `fetchWithTimeout`) from `src/utils/index.ts`.
- **DuckDB Service**:
  - Minor refactoring in `src/services/duck-db/duckDBConnectionManager.ts` and `src/services/duck-db/duckDBQueryExecutor.ts` for clarity and consistency.
  - Minor logging improvements in `src/storage/duckdbExample.ts`.
- **Logging**:
  - Minor adjustment to BigInt serialization in `src/utils/internal/logger.ts`.
- **Documentation**:
  - Updated `README.md` version badge to `1.4.1`.
  - Updated `docs/tree.md` to reflect new files and directories (`catFactFetcher` tool, `utils/network`).
- **Build**:
  - Updated project version to `1.4.1` in `package.json` and `package-lock.json`.

## [1.4.0] - 2025-05-30

### Added

- **Data Service**: Integrated DuckDB for in-process analytical data management.
  - Added `DuckDBService` (`src/services/duck-db/duckDBService.ts`) with connection management (`duckDBConnectionManager.ts`) and query execution (`duckDBQueryExecutor.ts`).
  - Included supporting types in `src/services/duck-db/types.ts`.
  - Added an example script `src/storage/duckdbExample.ts` demonstrating DuckDB usage.
  - Created `duckdata/` directory in project root for DuckDB database files (added to `.gitignore`).
- **Documentation**:
  - Added `docs/api-references/duckDB.md` providing comprehensive documentation on DuckDB.
- **Dependencies**:
  - Added `@duckdb/node-api` (`^1.3.0-alpha.21`) for DuckDB integration.

### Changed

- **Project Configuration**:
  - Updated `package.json` version to `1.4.0`.
  - Added `db:generate` script to `package.json` for running the DuckDB example.
  - Updated `package-lock.json` to include new DuckDB dependencies.
  - Added `duckdata/` to `.gitignore`.
- **Error Handling**:
  - Added new `BaseErrorCode` values: `SERVICE_NOT_INITIALIZED`, `DATABASE_ERROR`, `EXTENSION_ERROR`, `SHUTDOWN_ERROR` in `src/types-global/errors.ts`.
- **Logging**:
  - Improved logger initialization in `src/utils/internal/logger.ts` to set `initialized` flag earlier and handle BigInt serialization in metadata.
- **Scripts**:
  - Minor refactoring in `scripts/tree.ts` for clarity in generating tree content.
- **Documentation**:
  - Updated `README.md` to reflect the new DuckDB integration, version bump, and project structure changes.
  - Updated `docs/tree.md` with new files and directories related to DuckDB.

## [1.3.3] - 2025-05-29

### Changed

- **Dependencies**:
  - Updated `@modelcontextprotocol/sdk` from `^1.11.5` to `^1.12.0`.
  - Updated `@google/genai` from `^1.0.1` to `^1.2.0`.
  - Updated `@types/node` from `^22.15.21` to `^22.15.24`.
  - Updated `openai` from `^4.102.0` to `^4.103.0`.
  - Updated `validator` from `13.15.0` to `13.15.15`.
  - Updated `yargs` from `^17.7.2` to `^18.0.0`.
  - Updated `zod` from `^3.25.20` to `^3.25.36`.
  - Updated `typedoc` (devDependency) from `^0.28.4` to `^0.28.5`.
  - Note: `ajv` (transitive dependency of `@modelcontextprotocol/sdk`) changed from `^8.17.1` to `^6.12.6`.
- **LLM Providers**:
  - Removed Google Gemini provider integration from `src/services/llm-providers/llmFactory.ts` and related configurations (`src/config/index.ts`). The factory now exclusively supports OpenRouter.
- **Build & Tooling**:
  - Corrected `bin` path in `package.json` for `mcp-ts-template` from `./dist/index.js` to `dist/index.js`.
  - Added `.ncurc.json` to the project root for `npm-check-updates` configuration.
- **Documentation**:
  - Updated `docs/tree.md` to reflect the addition of the `imageTest` tool directory and the new `.ncurc.json` file.
  - Updated project version in `package.json` to `1.3.3`. (Note: `package-lock.json` was already at `1.3.2` and updated, `README.md` badge was already `1.3.3`).

### Fixed

- Ensured version consistency across `package.json` (now `1.3.3`) and `package-lock.json` (updated to reflect `1.3.3` changes).

## [1.3.2] - 2025-05-25

### Added

- **Tool**: Introduced `imageTest` tool (`src/mcp-server/tools/imageTest/`) that fetches a random cat image from an external API (`https://cataas.com/cat`) and returns it as a base64 encoded image. This serves as an example of how to send image data via MCP tool calls.

### Changed

- **Server Lifecycle**:
  - Refactored server startup and shutdown logic in `src/index.ts`, `src/mcp-server/server.ts`, and `src/mcp-server/transports/httpTransport.ts` for more robust handling of both STDIO and HTTP transports.
  - The HTTP server instance (`http.Server`) is now correctly propagated and managed, ensuring more graceful shutdowns.
- **Scripts**:
  - Updated `scripts/tree.ts` to use the `ignore` library for parsing and handling `.gitignore` patterns, replacing custom logic for improved accuracy and reliability.
- **Documentation**:
  - Refreshed `docs/tree.md` to reflect the addition of the new `imageTest` tool directory.

## [1.3.1] - 2025-05-22

### Added

- **LLM Provider Configuration**:
  - Documented new environment variables for OpenRouter LLM provider in `.clinerules` and `README.md`.
- **Documentation**:
  - Added `CLAUDE.md` to the project root.

### Changed

- **Documentation**:
  - Updated client configuration path in `README.md` and `.clinerules` from `src/mcp-client/mcp-config.json` to `src/mcp-client/client-config/mcp-config.json`.
  - Corrected typo "Focuss" to "Focuses" in `.clinerules`.
  - Updated import path for error types from `.js` to `.ts` in `.clinerules`.
  - Refreshed `docs/tree.md` to reflect the latest directory structure and file additions.

## [1.3.0] - 2025-05-22

### Added

- **MCP Client**:
  - Introduced client connection caching (`src/mcp-client/core/clientCache.ts`) to reuse active connections.
- **Dependencies**:
  - Added `chalk` (`^5.4.1`) for improved terminal output styling.
  - Added `cli-table3` (`^0.6.5`) for formatting tabular data in CLI outputs.

### Changed

- **MCP Client Refactor**:
  - Major restructuring of the `src/mcp-client/` module for improved modularity, maintainability, and extensibility.
  - Moved configuration loading to `src/mcp-client/client-config/configLoader.ts`.
  - Centralized core client logic in `src/mcp-client/core/` including:
    - `clientManager.ts`: Manages client instances and their lifecycle.
    - `clientConnectionLogic.ts`: Handles connection and initialization.
  - Reorganized transport handling into `src/mcp-client/transports/` with:
    - `transportFactory.ts`: Creates Stdio or HTTP transport instances.
    - `stdioClientTransport.ts`: Specific implementation for Stdio.
    - `httpClientTransport.ts`: Specific implementation for HTTP.
- **Services**:
  - Updated `OpenRouterProvider` to use `llmFactory` for client instantiation.
  - Updated `llmFactory.ts` to use the new `@google/genai` import.
- **Configuration**:
  - Minor improvements to logging and error handling in `src/config/index.ts`.
- **Scripts**:
  - Refined ignore logic in `scripts/tree.ts`.
- **Logging**:
  - Minor refinements in `src/utils/internal/logger.ts`.
- **Documentation**:
  - Updated `README.md` to reflect the MCP client refactor, new file paths, and version bump.
  - Updated `docs/tree.md` to accurately represent the new `src/mcp-client/` directory structure.
- **Build**:
  - Updated project version to `1.3.0` in `package.json` and `package-lock.json`.

### Fixed

- Minor formatting issues in `src/mcp-server/transports/httpTransport.ts`.

## [1.2.7] - 2025-05-22

### Added

- **Services**:
  - Introduced an LLM Provider Factory (`src/services/llm-providers/llmFactory.ts`) to centralize the creation and configuration of LLM clients.
- **Configuration**:
  - Added `GEMINI_API_KEY` to `src/config/index.ts` for configuring the Google Gemini provider through the LLM Factory.

### Changed

- **Dependencies**:
  - Upgraded Google Gemini SDK from `@google/generative-ai` (`^0.24.1`) to `@google/genai` (`^1.0.1`) in `package.json` and `package-lock.json`.
- **Services**:
  - Refactored `OpenRouterProvider` (`src/services/llm-providers/openRouter/openRouterProvider.ts`) to utilize the new `llmFactory.ts` for client initialization.
  - Updated default LLM model in configuration (`src/config/index.ts`) to `google/gemini-2.5-flash`.
- **Documentation**:
  - Updated `README.md` to reflect the new LLM Provider Factory, removal of the standalone Gemini service, and configuration changes.
  - Updated `docs/tree.md` to show `llmFactory.ts` and the removal of the old `geminiAPI` directory.
- **Build**:
  - Updated `package.json` and `package-lock.json` to version `1.2.7`.

### Removed

- **Services**:
  - Deleted the standalone Gemini API service implementation (`src/services/llm-providers/geminiAPI/geminiService.ts` and `src/services/llm-providers/geminiAPI/index.ts`). Gemini API (google/genai) integration may be added later.

## [1.2.6] - 2025-05-22

### Added

- **Services**:
  - Integrated Google Gemini API provider (`@google/generative-ai`) under `src/services/llm-providers/geminiAPI/`.
- **Dependencies**:
  - Added `@google/generative-ai` (v0.24.1) to `package.json` and `package-lock.json`.

### Changed

- **Services**:
  - Refactored LLM provider organization:
    - Moved OpenRouter provider logic from `src/services/llm-providers/openRouterProvider.ts` to a dedicated directory `src/services/llm-providers/openRouter/openRouterProvider.ts`.
    - Updated barrel files (`src/services/index.ts`, `src/services/llm-providers/index.ts`) to export services from their new locations.
- **Documentation**:
  - Updated `README.md` to reflect the new LLM provider structure and added Gemini API to the features list.
  - Updated `docs/tree.md` with the new directory structure for LLM providers.
- **Build**:
  - Updated `package.json` and `package-lock.json` to reflect new dependencies and potentially version bump (though version will be 1.2.6).

## [1.2.5] - 2025-05-22

### Changed

- **Configuration**:
  - Implemented robust project root detection (`findProjectRoot`) in `src/config/index.ts` for more reliable path resolution.
  - Introduced `LOGS_DIR` environment variable, allowing customization of the logs directory path. Added `ensureDirectory` utility to validate and create this directory securely within the project root.
- **HTTP Transport**:
  - Error responses for "Session not found" (404) and "Internal Server Error" (500) in `src/mcp-server/transports/httpTransport.ts` now return JSON-RPC compliant error objects.
  - Clarified the server startup log message for HTTP transport to note that HTTPS is expected via a reverse proxy in production.
- **Logging**:
  - Refactored `src/utils/internal/logger.ts` to use the validated `config.logsPath` from `src/config/index.ts`, streamlining directory safety checks and creation.
  - Improved console logging setup by refactoring it into a private `_configureConsoleTransport` method, enhancing organization.
  - Updated log messages related to console logging status for clarity.
  - Truncated error stack traces in MCP notifications to a maximum of 1024 characters.
- **Build & Dependencies**:
  - Updated `package.json` and `package-lock.json` to version `1.2.5`.
  - Updated dependencies: `@modelcontextprotocol/sdk` to `^1.11.5`, `@types/node` to `^22.15.21`, `@types/validator` to `13.15.1`, `openai` to `^4.102.0`, and `zod` to `^3.25.20`.
  - Added `exports` and `engines` fields to `package.json`. Updated author field.
- **Documentation**:
  - Updated version badge in `README.md` to `1.2.5`.
  - Updated generation timestamp in `docs/tree.md`.

## [1.2.4] - 2025-05-18

### Changed

- **Build**: Bumped version to `1.2.4` in `package.json`, `package-lock.json`, and `README.md`.
- **Services**: Refactored the OpenRouter provider for organization by moving its logic from `src/services/openRouterProvider.ts` to a new `src/services/llm-providers/` directory. Added `src/services/index.ts` to manage service exports.
- **Documentation**: Updated `docs/tree.md` to reflect the new directory structure in `src/services/`.

## [1.2.3] - 2025-05-17

### Changed

- **Build**: Bumped version to `1.2.3` in `package.json` and `README.md`.
- **Code Quality & Documentation**:
  - Reordered utility exports in `src/utils/index.ts`, `src/utils/parsing/index.ts`, and `src/utils/security/index.ts` for improved consistency.
  - Corrected JSDoc `@module` paths across numerous files in `src/` to accurately reflect their location within the project structure (e.g., `utils/internal/logger` to `src/utils/internal/logger`), enhancing documentation generation and accuracy.
  - Applied automated code formatting (e.g., Prettier) across various files, including scripts (`scripts/`), source code (`src/`), and documentation (`docs/`, `tsconfig.typedoc.json`). This includes consistent trailing commas, improved readability of conditional logic, and standardized array formatting.
  - Removed a redundant type export from `src/services/openRouterProvider.ts`.

## [1.2.2] - 2025-05-17

### Fixed

- **Build Process & Documentation**:
  - Resolved `tsc` build errors related to `rootDir` conflicts by adjusting `tsconfig.json` to include only `src/**/*` for the main build.
  - Fixed TypeDoc warnings for script files (`scripts/*.ts`) not being under `rootDir` by:
    - Creating `tsconfig.typedoc.json` with `rootDir: "."` and including both `src` and `scripts`.
    - Updating the `docs:generate` script in `package.json` to use `tsconfig.typedoc.json`.
  - Corrected TSDoc comments in script files (`scripts/clean.ts`, `scripts/fetch-openapi-spec.ts`, `scripts/make-executable.ts`, `scripts/tree.ts`) by removing non-standard `@description` block tags, resolving TypeDoc warnings.

### Changed

- **Configuration & Deployment**:
  - **Dockerfile**: Set default `MCP_TRANSPORT_TYPE` to `http` and exposed port `3010` for containerized deployments.
  - **Smithery**: Updated `smithery.yaml` to allow Smithery package users to configure `MCP_TRANSPORT_TYPE`, `MCP_HTTP_PORT`, and `MCP_LOG_LEVEL`.
  - **Local Development**: Adjusted `mcp.json` to default to HTTP transport on port `3010` for local server execution via MCP CLI.

### Changed

- **Dependencies**:
  - Updated `@modelcontextprotocol/sdk` from `^1.11.2` to `^1.11.4`.
  - Updated `@types/express` from `^5.0.1` to `^5.0.2`.
  - Updated `openai` from `^4.98.0` to `^4.100.0`.
- **Code Quality & Documentation**:
  - Refactored JSDoc comments across the codebase to be more concise and focused, removing unnecessary verbosity and improving overall readability. We now rely on the TypeDoc type inference system for documentation generation. This includes:
    - Core configuration (`src/config/index.ts`).
    - Main application entry point and server logic (`src/index.ts`, `src/mcp-server/server.ts`).
    - Echo resource and tool implementations (`src/mcp-server/resources/echoResource/`, `src/mcp-server/tools/echoTool/`).
    - Transport layers and authentication middleware (`src/mcp-server/transports/`).
    - Services (`src/services/openRouterProvider.ts`) and global type definitions (`src/types-global/errors.ts`).
    - Polished JSDoc comments in `src/mcp-client/` (`client.ts`, `configLoader.ts`, `index.ts`, `transport.ts`) to align with TypeDoc best practices, remove redundant type annotations, and ensure correct `@module` tags.
- **Documentation Files**:
  - Updated `docs/api-references/typedoc-reference.md` to provide a guide for TypeDoc usage.
- **Internal Utilities**:
  - **Logger**:
    - Simplified project root determination in `logger.ts` by using `process.cwd()`.
    - Enhanced safety check for the logs directory path.
    - Ensured application startup fails if the logs directory cannot be created by re-throwing the error.
  - **IdGenerator**:
    - Removed logging from `idGenerator.ts` to prevent circular dependencies with `requestContextService`.
    - Updated JSDoc comments to reflect this change and its rationale.
- **Build**:
  - Bumped version to `1.2.2` in `package.json` and `package-lock.json`.

## [1.2.1] - 2025-05-15

### Added

- **Development Tooling**:
  - Added `prettier` as a dev dependency for consistent code formatting.
  - Included a `format` script in `package.json` to run Prettier across the codebase.
- **Documentation**:
  - Expanded `tsdoc.json` to recognize more standard JSDoc tags (`@property`, `@class`, `@static`, `@private`, `@constant`) for improved TypeDoc generation.

### Changed

- **Code Quality**:
  - Extensively refactored JSDoc comments across the entire codebase (core utilities, MCP client/server components, services, scripts, and type definitions) for improved clarity, accuracy, and completeness.
  - Standardized code formatting throughout the project using Prettier.
  - Added `@module` and `@fileoverview` JSDoc tags to relevant files to enhance documentation structure and maintainability.
- **Scripts**:
  - Improved JSDoc comments and formatting in utility scripts (`scripts/clean.ts`, `scripts/fetch-openapi-spec.ts`, `scripts/make-executable.ts`, `scripts/tree.ts`).
- **Documentation Files**:
  - Updated `docs/api-references/jsdoc-standard-tags.md` with formatting improvements and to align with expanded `tsdoc.json`.
  - Refreshed `docs/tree.md` to reflect the current directory structure and generation timestamp.
  - Updated `README.md` to reflect the new version.
- **Configuration**:
  - Minor formatting adjustment in `repomix.config.json`.
  - Minor formatting adjustment (trailing newline) in `tsconfig.json`.
- **Core Application & Utilities**:
  - Refactored configuration management (`src/config/index.ts`) for enhanced clarity, validation using Zod, and comprehensive JSDoc.
  - Overhauled the main application entry point (`src/index.ts`) with improved startup/shutdown logic, robust error handling for uncaught exceptions/rejections, and detailed JSDoc.
  - Enhanced error type definitions (`src/types-global/errors.ts`) with extensive JSDoc, clarifying `BaseErrorCode`, `McpError`, and `ErrorSchema`.
- **MCP Components**:
  - Refactored the `echo` resource (`src/mcp-server/resources/echoResource/`) with detailed JSDoc, clearer type definitions, and improved registration logic.
  - Refactored the `echo_message` tool (`src/mcp-server/tools/echoTool/`) with detailed JSDoc, improved input/response types, and enhanced registration structure.

## [1.2.0] - 2025-05-14

### Added

- **Documentation System**:
  - Integrated JSDoc for comprehensive code documentation.
  - Added `tsdoc.json` for TSDoc configuration to ensure consistent JSDoc tag recognition by TypeDoc.
  - Included `docs/api-references/jsdoc-standard-tags.md` as a detailed reference for standard JSDoc tags.
  - Updated `.clinerules` with a new section on JSDoc and code documentation best practices.
- **Logging**: Implemented log file rotation for the Winston logger (`src/utils/internal/logger.ts`) to manage log file sizes.

### Changed

- **Refactoring**:
  - Standardized `RequestContext` creation and usage across the application (server, transports, core utilities) using `requestContextService.createRequestContext()` for improved logging, error reporting, and operational tracing.
  - Enhanced `ErrorHandler` (`src/utils/internal/errorHandler.ts`) to correctly use and create `RequestContext` and improve log payload creation.
  - Significantly refactored the `Logger` (`src/utils/internal/logger.ts`) to correctly handle `RequestContext`, improve console logging format, and enhance MCP notification payloads.
  - Updated JSDoc comments in `src/utils/internal/requestContext.ts` and improved internal logging within the service.
  - Modified various utility files (`jsonParser.ts`, `rateLimiter.ts`, `sanitization.ts`) to use `requestContextService.createRequestContext` for internal logging when a context is not provided.
- **Dependencies**:
  - Updated `@types/node` from `22.15.17` to `22.15.18`.
  - Updated `sanitize-html` from `2.16.0` to `2.17.0`.
- **Documentation**:
  - Updated `docs/tree.md` to reflect new documentation files and structure.

## [1.1.9] - 2025-05-12

### Changed

- **Configuration**:
  - Renamed `APP_URL` to `OPENROUTER_APP_URL` and `APP_NAME` to `OPENROUTER_APP_NAME` across the codebase (`src/config/index.ts`, `src/services/openRouterProvider.ts`, `README.md`) for clarity.

## [1.1.8] - 2025-05-12

### Added

- **Service**: Integrated OpenRouter service (`src/services/openRouterProvider.ts`) for leveraging various Large Language Models.
- **Configuration**:
  - Added new environment variables to `src/config/index.ts` for OpenRouter and LLM customization: `OPENROUTER_APP_URL`, `OPENROUTER_APP_NAME`, `OPENROUTER_API_KEY`, `LLM_DEFAULT_MODEL`, `LLM_DEFAULT_TEMPERATURE`, `LLM_DEFAULT_TOP_P`, `LLM_DEFAULT_MAX_TOKENS`, `LLM_DEFAULT_TOP_K`, `LLM_DEFAULT_MIN_P`.
- **Error Handling**: Introduced `INITIALIZATION_FAILED` error code to `src/types-global/errors.ts` for better service initialization diagnostics.

### Changed

- **Dependencies**:
  - Updated `@modelcontextprotocol/sdk` to `^1.11.2`.
  - Updated `@types/node` to `^22.15.17`.
  - Updated `openai` to `^4.98.0`.
- **Documentation**:
  - Updated `README.md` to document new OpenRouter environment variables and add the OpenRouter Provider to the project features table.
  - Refreshed `docs/tree.md` to reflect the current directory structure.

## [1.1.7] - 2025-05-07

### Added

- **Configuration**: Added `mcp.json` (MCP client/server configuration file) to version control.
- **Scripts**: Added `inspector` script to `package.json` for use with `mcp-inspector`.

### Changed

- **Dependencies**: Updated several direct and development dependencies, including `@types/node`, `@types/sanitize-html`, `openai`, `zod`, and `typedoc`.
- **Version**: Bumped project version to `1.1.7` in `package.json`, `README.md`.
- **Error Handling**: Significantly refactored the `ErrorHandler` utility (`src/utils/internal/errorHandler.ts`) with improved JSDoc, more robust error classification, and refined handling of `McpError` instances.
- **Logging**:
  - Made console output (warnings, info messages, errors) conditional on `stdout` being a TTY across various files (`src/config/index.ts`, `src/mcp-server/transports/httpTransport.ts`, `src/utils/internal/logger.ts`) to prevent interference with MCP protocol in stdio mode.
  - Removed `rethrow: true` from `ErrorHandler.tryCatch` calls in `src/mcp-client/client.ts` and `src/utils/metrics/tokenCounter.ts` as `tryCatch` now rethrows by default if an error occurs.
- **Request Context**: Refactored `src/utils/internal/requestContext.ts` with comprehensive JSDoc documentation and minor structural improvements for clarity and maintainability.
- **Documentation**: Updated `docs/tree.md` to reflect the addition of `mcp.json`.

## [1.1.6] - 2025-05-07

### Added

- **Scripts**: Added `inspector` script to `package.json` for use with `mcp-inspector`.
- **Configuration**: Added `mcp.json` (MCP client/server configuration file) to version control.

### Changed

- **Dependencies**: Updated several direct and development dependencies:
  - `@types/node`: `^22.15.3` -> `^22.15.15`
  - `@types/sanitize-html`: `^2.15.0` -> `^2.16.0`
  - `openai`: `^4.96.2` -> `^4.97.0`
  - `zod`: `^3.24.3` -> `^3.24.4`
  - `typedoc` (devDependency): `^0.28.3` -> `^0.28.4`
- **Logging**: Refactored logging behavior across `src/config/index.ts`, `src/index.ts`, `src/mcp-server/transports/stdioTransport.ts`, and `src/utils/internal/logger.ts` to make console output (warnings, info messages) conditional on `stdout` being a TTY. This prevents interference with the MCP protocol when running in `stdio` transport mode.
- **Build**: Bumped project version to `1.1.6` in `package.json` and `package-lock.json`.

## [1.1.5] - 2025-05-07

### Changed

- **Security**: Enhanced the `Sanitization` utility class (`src/utils/security/sanitization.ts`):
  - Improved JSDoc comments for all methods, providing more detailed explanations of functionality, parameters, and return values.
  - Refined the `sanitizePath` method for more robust and flexible path sanitization:
    - Added `PathSanitizeOptions` to control behavior like POSIX path conversion (`toPosix`), allowing/disallowing absolute paths (`allowAbsolute`), and restricting to a `rootDir`.
    - Returns a `SanitizedPathInfo` object containing the sanitized path, original input, and details about the sanitization process (e.g., if an absolute path was converted to relative).
    - Improved logic for handling root directory constraints and preventing path traversal.
  - Clarified options and behavior for `sanitizeString` and `sanitizeNumber` methods.
  - Ensured consistent error handling and logging within sanitization methods, providing more context on failures.
- **Build**: Bumped project version to `1.1.5` in `package.json`, `package-lock.json`, and `README.md`.

## [1.1.4] - 2025-05-02

### Changed

- **MCP Client**: Updated the entire client implementation (`src/mcp-client/`) to align with the **MCP 2025-03-26 specification**. This includes:
  - Correctly defining client identity and capabilities during initialization (`client.ts`).
  - Adding comprehensive JSDoc comments explaining MCP concepts and implementation details across all client files (`client.ts`, `configLoader.ts`, `transport.ts`, `index.ts`).
  - Resolving TypeScript errors related to SDK types and error codes.
  - Enhancing error handling and type safety in connection and transport logic.
  - Updating the example configuration (`mcp-config.json.example`) to include an HTTP transport example.
- **Documentation**: Updated `README.md` to reflect the client changes, add the MCP spec version badge, and refine descriptions. Updated `docs/tree.md`.

## [1.1.3] - 2025-05-02

### Added

- **HTTP Authentication**: Implemented mandatory JWT-based authentication for the HTTP transport (`src/mcp-server/transports/authentication/authMiddleware.ts`) as required by MCP security guidelines. Added `jsonwebtoken` dependency.
- **Configuration**: Added `MCP_AUTH_SECRET_KEY` environment variable for JWT signing/verification.

### Changed

- **Dependencies**: Updated `@modelcontextprotocol/sdk` to `^1.11.0`.
- **HTTP Transport**: Integrated authentication middleware, enhanced security headers (CSP, Referrer-Policy), and improved logging context/clarity.
- **Server Core**: Refined server initialization logging and error handling. Improved comments referencing MCP specifications.
- **Stdio Transport**: Improved logging context and added comments referencing MCP specifications and authentication guidelines.
- **Documentation**: Updated `README.md` with new version badges, authentication details, and configuration variable (`MCP_AUTH_SECRET_KEY`). Regenerated `docs/tree.md`.

## [1.1.2] - 2025-05-01

### Added

- **Utility Script**: Added `scripts/fetch-openapi-spec.ts`, a generic script to fetch OpenAPI specifications (YAML/JSON) from a URL with fallback logic, parse them, and save both YAML and JSON versions locally.
- **NPM Script**: Added `fetch-spec` script to `package.json` for running the new OpenAPI fetch script (`ts-node --esm scripts/fetch-openapi-spec.ts <url> <output-base-path>`).
- **Dependencies**: Added `axios`, `js-yaml`, and `@types/js-yaml` as dev dependencies required by the new fetch script.

## [1.1.1] - 2025-05-01

- **Configuration Refactoring**: Centralized the handling of environment variables (`MCP_TRANSPORT_TYPE`, `MCP_HTTP_PORT`, `MCP_HTTP_HOST`, `MCP_ALLOWED_ORIGINS`, `MCP_SERVER_NAME`, `MCP_SERVER_VERSION`, `MCP_LOG_LEVEL`, `NODE_ENV`) within `src/config/index.ts` using Zod for validation and defaulting.
- Updated `src/mcp-server/server.ts`, `src/mcp-server/transports/httpTransport.ts`, `src/index.ts`, and `src/utils/security/rateLimiter.ts` to consistently use the validated configuration object from `src/config/index.ts` instead of accessing `process.env` directly.
- Changed the default HTTP port (`MCP_HTTP_PORT`) from 3000 to 3010 in the configuration.

## [1.1.0] - 2025-05-01

This release focuses on integrating API documentation generation, enhancing the HTTP transport layer, and refining server initialization and logging.

- **API Documentation & Build**: Integrated TypeDoc for automated API documentation generation. Added `typedoc.json` configuration and a `docs:generate` script to `package.json`. Updated `.gitignore` to exclude the generated `docs/api/` directory and refreshed `README.md` and `docs/tree.md`. (Commit: `b1e5f4d` - approx, based on sequence)
- **MCP Types & Server Initialization**: Removed redundant local MCP type definitions (`src/types-global/mcp.ts`, `src/types-global/tool.ts`), relying on the SDK types. Refactored the main server entry point (`src/index.ts`) to initialize the logger _after_ configuration loading and used an async IIFE for startup. Improved JSDoc clarity in server, resource, and tool registration files. (Commit: `0459112`)
- **HTTP Transport & Logging Enhancements**:
  - Added stricter security headers (CSP, HSTS, Permissions-Policy) to HTTP responses.
  - Improved logging detail within the HTTP transport for origin checks, session handling, port checks, and request flow.
  - Made logger initialization asynchronous and added conditional console logging (active only when `MCP_LOG_LEVEL=debug` and stdout is a TTY).
  - Implemented a workaround for an SDK `isInitializeRequest` check issue in the HTTP transport.
  - Changed the default HTTP port from 3000 to 3010.
  - Enhanced port conflict detection with proactive checks before binding.
  - Cleaned up minor logging inconsistencies. (Commit: `76bf1b8`)

## [1.0.6] - 2025-04-29

### Added

- Zod dependency for enhanced schema validation (`e038177`).

### Changed

- **Project Alignment**: Updated core components to align with the **MCP Specification (2025-03-26)** and **TypeScript SDK (v1.10.2+)**. Key areas refactored include:
  - **Server**: Implemented Streamable HTTP transport (`b2b8665`).
  - **Client**: Enhanced capabilities handling, configuration loading (using Zod), and transport management (Stdio/HTTP) (`38f68b8`).
  - **Logging**: Aligned log levels with RFC 5424 standards and added notification support (`cad6f29`).
  - **Configuration**: Improved validation and aligned log level settings (`6c1e958`).
  - **Echo Example**: Updated Echo tool and resource implementations, including Base64 handling (`a7f385f`).
- **Server Refinement**: Enhanced `src/mcp-server/server.ts` with comprehensive JSDoc comments, improved logging messages, and refined HTTP transport logic including error handling and session management (`6c54d1e`).
- **Documentation**: Updated project documentation and internal cheatsheets (`de12abf`, `53c7c0d`).
