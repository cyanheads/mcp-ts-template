## Changelog (Archive2)

## 2.3.0 - 2.0.1

## [2.3.0] - 2025-09-30

### Refactor

- **Service Layer Architecture**: Overhauled the `src/services` directory to implement a domain-driven design. All services, including `llm` and `speech`, are now organized into a consistent structure with `core/` (interfaces, orchestrators) and `providers/` (concrete implementations) subdirectories. This improves modularity, scalability, and aligns with architectural best practices.
- **Dependency Injection**: Updated the DI container registrations in `src/container/registrations/core.ts` to reflect the new service locations.

### Chore

- **Documentation**:
  - Updated `AGENTS.md`, `CLAUDE.md`, and `.clinerules/AGENTS.md` to document the new service development pattern and update the version to `2.3.0`.
  - Regenerated `docs/tree.md` to accurately reflect the new directory structure.

## [2.2.8] - 2025-09-30

### Feature

- **PDF Parsing Utility**: Added a new `PdfParser` utility in `src/utils/parsing/` that wraps the `pdf-lib` library. This provides a robust, standardized interface for creating, modifying, and parsing PDF documents, complete with structured error handling and logging.
  - New `pdfParser.ts` module with a comprehensive `PdfParser` class.
  - Added full test coverage in `tests/utils/parsing/pdfParser.test.ts`.

### Chore

- **Dependencies**:
  - Added `pdf-lib` for PDF manipulation.
  - Upgraded `openai` to `^6.0.0`.
  - Upgraded `typescript` to `^5.9.3`.
- **Documentation**:
  - Updated `docs/tree.md` to include the new PDF parser files.
  - Cleaned up and simplified the "Checks & Workflow Commands" section in `AGENTS.md`, `CLAUDE.md`, and `.clinerules/AGENTS.md` to improve clarity for developers.

## [2.2.7] - 2025-09-30

### Feature

- **Speech Service**: Integrated a new speech service with providers for ElevenLabs (Text-to-Speech) and OpenAI Whisper (Speech-to-Text).
  - Added `src/services/speech/` module with `ISpeechProvider` interface and provider implementations.
  - New configuration options under `speech` in `src/config/index.ts` to enable and configure TTS/STT.
  - Registered `SpeechService` in the DI container.

### Chore

- **Dependencies**: Upgraded `openai` to `5.23.2`.
- **Documentation**: Updated `docs/tree.md` to reflect the new speech service files.

## [2.2.6] - 2025-09-29

### Feature

- **Storage Layer Enhancement**: Implemented comprehensive bulk and pagination operations across all storage providers (`InMemory`, `FileSystem`, `Supabase`, `Cloudflare KV`, `Cloudflare R2`).
  - Added `getMany`, `setMany`, and `deleteMany` for efficient batch processing.
  - Introduced `clear` to purge all data for a specific tenant.
  - Enhanced the `list` method with cursor-based pagination (`ListOptions`, `ListResult`) for handling large datasets.

### Refactor

- **Storage Validation**: Centralized all key, prefix, and tenant ID validation logic into a new `storageValidation.ts` module to ensure consistent enforcement of security and format rules across the storage layer.

### Tests

- **Expanded Storage Compliance Suite**: Significantly updated the storage provider compliance test suite to validate the new bulk operations (`getMany`, `setMany`, `deleteMany`, `clear`) and pagination behavior, ensuring all providers adhere to the enhanced `IStorageProvider` contract.

## [2.2.5] - 2025-09-29

### Tests

- **New Test Files**: Added new test files for `template_code_review_sampling` tool and `runtime` utilities.
- **Utility Coverage**: Added comprehensive tests for `logger` high-severity levels (`emerg`, `crit`, `alert`, `notice`), `rateLimiter`, `sanitization`, and `config` validation logic, hardening core infrastructure.

### Chore

- **Documentation**: Updated `docs/tree.md` to reflect the latest file structure, including new Prompt, Root, and Sampling tool definitions.

## [2.2.4] - 2025-09-29

### Feature

- **New MCP Capabilities**: Implemented support for the MCP 2025-06-18 specification, including **Sampling**, **Prompts**, and **Roots** capabilities.
- **Code Review Sampling Tool**: Added `template_code_review_sampling` tool as an example for the new Sampling capability, demonstrating how a server can request LLM completions from the client.
- **Code Review Prompt**: Added `code_review` prompt to demonstrate the Prompts capability, allowing structured message templates to be invoked by the client.
- **OAuth Resource Metadata**: Added the RFC 9728 Protected Resource Metadata endpoint (`/.well-known/oauth-protected-resource`) for OAuth discovery.

### Fixed

- **OAuth Resource Validation**: Implemented mandatory RFC 8707 Resource Indicators validation within `OauthStrategy` to prevent token mis-redemption by ensuring the token was issued for the server's specific resource identifier.
- **HTTP Transport Cleanup**: Fixed a memory leak risk in the HTTP transport by ensuring the session transport is reliably closed after processing a request, even in the case of network errors.

### Chore

- **Spec Updates**: Updated all MCP Specification references from `2025-03-26` to **`2025-06-18`**.
- **Configuration**: Added `MCP_SERVER_RESOURCE_IDENTIFIER` configuration option for RFC 8707 validation.
- **Deployment**: Bumped project version to `2.2.4` in `package.json` and `server.json`.

## [2.2.3] - 2025-09-29

### Feature

- **Server Runtime Banner**: Introduced `logStartupBanner` utility to display transport startup messages only in TTY environments, preventing output corruption when using STDIO transport or piping output. Used in `httpTransport.ts` and `stdioTransport.ts`.

### Refactor

- **Error Handler Cleanup**: Completed the Error Handler refactor by removing the legacy barrel file (`src/utils/internal/errorHandler.ts`) and adjusting all import references to point directly to the dedicated subdirectory (`src/utils/internal/error-handler/index.js`).
- **Code Quality**: Added a new ESLint rule to restrict `console` usage in the `src/` directory, mandating the use of the structured `logger` or the new TTY-safe utility.
- **Agent Protocol**: Updated `AGENTS.md` and related documents with a new section on multi-tenancy and storage context, clarifying requirements for `tenantId` in different transport modes.

### Chore

- **Dependency Updates**: Bumped various development and runtime dependencies, including `@hono/node-server`, `pino`, and OpenTelemetry packages, for stability and latest features.
- **Documentation Restructure**: Moved standalone documentation files (`mcp-elicitation-summary.md`, `publishing-mcp-server-registry.md`) into a `docs/archive` subdirectory to clean up the root `docs/` folder, reflected in `docs/tree.md`.

## [2.2.2] - 2025-09-28

### Refactor

- **Error Handling**: Major refactor of the internal error handling system. The logic from `errorHandler.ts` has been decomposed into a dedicated module at `src/utils/internal/error-handler/`. This includes `errorHandler.ts` (main class), `helpers.ts` (utility functions), `mappings.ts` (error-to-code maps), and `types.ts` (interfaces), improving modularity and maintainability.
- **Performance Measurement**: The `performance.ts` utility was refined. `initializePerformance_Hrt` now correctly falls back to `Date.now()` if `perf_hooks` is unavailable. The `measureToolExecution` function now uses a fallback for calculating byte length in environments without `Buffer` or `TextEncoder`, increasing cross-platform robustness.

### Tests

- **Increased Test Coverage**: Significantly improved test coverage across the application. Added comprehensive unit and integration tests for the newly refactored error handler, performance utilities, and various parsing and security modules. New tests include `encoding.test.ts`, `performance.init.test.ts`, `csvParser.test.ts`, `xmlParser.test.ts`, `yamlParser.test.ts`, and `authUtils.test.ts`, bringing total test count to over 200 and pushing line coverage to ~97%.

### Fixed

- **Tool Test Suites**: Corrected and expanded the test suites for all template tools (`template-cat-fact`, `template-echo-message`, `template-image-test`). The tests now cover failure cases (API errors, bad data) and response formatting, ensuring the tools are more robust and predictable.

## [2.2.1] - 2025-09-27

### Refactor

- **Transport Layer Abstraction**: Refactored the server's transport management by introducing a `TransportManager` and an `ITransport` interface. This decouples the main application logic from the specific transport implementations (HTTP, STDIO), centralizing lifecycle management (start/stop) and improving modularity and testability.
- **Improved Error Handling on Startup**: Enhanced the application's bootstrap process in `src/index.ts` to gracefully handle and report critical configuration errors, preventing the server from starting with an invalid state.
- **HTTP Authentication Middleware**: The HTTP transport now uses a dedicated Hono middleware for authentication, streamlining the request pipeline and separating auth logic from the core RPC handling.

## [2.2.0] - 2025-09-27

### Feature

- **MCP Elicitation Support**: Implemented support for the MCP Elicitation feature. The tool-handling pipeline now distinguishes between the application's internal `RequestContext` and the MCP SDK's `SdkContext`, allowing tools to access `elicitInput` and interactively request missing parameters from the user.
- **New Mad Libs Elicitation Tool**: Added a new example tool, `template-madlibs-elicitation.tool.ts`, to demonstrate the elicitation feature by playing a game of Mad Libs and prompting the user for missing parts of speech. (Untested because idk which clients support elicitation yet.)

### Refactor

- **Tool Logic Signature**: The `logic` function signature for all tools has been updated to `(input, appContext, sdkContext)`. This provides tools access to both the application's internal context (for logging, tracing) and the full SDK context (for features like elicitation).
- **Storage Provider Error Handling**: The `KvProvider` and `R2Provider` for Cloudflare now throw a structured `McpError` on JSON parsing failures instead of returning `null`, aligning them with the project's standardized error-handling strategy.

### Changed

- **Test Configuration**: Introduced a `vitest.config.ts` file to centralize test configurations and updated the `test` scripts in `package.json` to use it, ensuring consistency.
- **Tool Naming**: Renamed tool titles for consistency (e.g., "Template Cat Fact" instead of "template_cat_fact").

### Fixed

- **Test Suite**: Updated all tool-related tests to accommodate the new `logic` function signature and provide a mock `SdkContext`, ensuring all tests pass with the new architecture.

## [2.1.8] - 2025-09-27

### Feature

- **Storage Provider TTL Support**: Implemented Time-to-Live (TTL) support across all storage providers (`fileSystem`, `cloudflare-r2`, `cloudflare-kv`). Stored items can now have an expiration, after which they are considered invalid and are filtered from `get` and `list` operations. This is handled via a metadata envelope to ensure cross-provider consistency.
- **Swagger Parser Dependency**: Added `@apidevtools/swagger-parser` to enable parsing and validation of OpenAPI/Swagger specifications.

### Changed

- **Refactored Storage Providers**: All storage providers (`kvProvider`, `r2Provider`, `fileSystemProvider`) have been refactored to use a centralized `ErrorHandler.tryCatch` wrapper, improving robustness and standardizing error responses. The `storageFactory` was also updated to accept pre-resolved dependencies, enhancing testability.
- **Documentation**:
  - The `mcp-elicitation-summary.md` has been significantly expanded into a comprehensive developer's guide with client/server examples and best practices.
  - Added detailed documentation to `IStorageProvider.ts` explaining the TTL implementation and behavior for each storage provider.
- **Dependencies**: Bumped `hono` to `^4.9.9`.

### Fixed

- **Storage Listing**: The `list` method in `FileSystemProvider` now correctly filters expired items, ensuring that only active keys are returned.

## [2.1.7] - 2025-09-27

### Changed

- **Asynchronous Resource Logic**: The resource handler factory (`resourceHandlerFactory.ts`) now supports `async` logic functions. This allows resources to perform asynchronous operations, such as fetching data from a network, before returning a result.
- **Documentation**: Major updates to `README.md` & `AGENTS.md` to improve clarity, streamline the development workflow, and reflect the latest architectural patterns, including asynchronous resource handling.
- **Dependencies**: Upgraded `hono` to `^4.9.9`.

### Fixed

- Corrected a minor module path typo in the JSDoc for `httpErrorHandler.ts`.

## [2.1.6] - 2025-09-27

### Feature

- **HTTP Transport Security**: Implemented bearer token authentication for the HTTP transport. The server now validates `Authorization` headers and uses a configurable authentication strategy (`none`, `jwt`, `oauth`) to protect the `/mcp` endpoint.
- **Elicitation Summary**: Added a new document `docs/mcp-elicitation-summary.md` summarizing the MCP Elicitation feature based on the latest specification research. To be integrated into the template in a future release.

### Changed

- **Dependencies**:
  - Upgraded `openai` to `^5.23.1`.
  - Upgraded `@cloudflare/workers-types` to `^4.20250927.0`.
  - Upgraded `hono` to `^4.9.9`.
- **`devdocs` Script**: The `devdocs.ts` script now automatically ignores dependencies found in the `resolutions` field of `package.json` when running `repomix`, preventing noisy or irrelevant output.
- **Configuration**: Exported the `AppConfig` type from `src/config/index.ts` to allow other modules to type-check configuration objects.
- **Sanitization**: The `sanitizeAndValidateJson` utility in `src/utils/security/sanitization.ts` now uses a cross-environment method to compute byte length, ensuring it works correctly in both Node.js and Cloudflare Workers.

## [2.1.5] - 2025-09-26

### Feature

- **Universal Parsing Utilities**: Added a suite of robust parsing utilities in `src/utils/parsing` for CSV, XML, and YAML formats. Each parser (`csvParser`, `xmlParser`, `yamlParser`) is built on a high-performance library (`papaparse`, `fast-xml-parser`, `js-yaml`) and automatically handles optional `<think>...</think>` blocks from LLM outputs, ensuring clean and reliable data extraction.

### Changed

- **Dependencies**: Added `fast-xml-parser`, `papaparse`, `clipboardy` and `execa`. Updated `bun.lock` to reflect the new dependencies.
- Updated the shebang in `scripts/devcheck.ts` from `#!/usr/bin/env node` to `#!/usr/bin/env bun` to ensure it is always executed with Bun.
- Version bump to `2.1.5` in `package.json`.

## [2.1.4] - 2025-09-26

### Feature

- **Cloudflare Storage Providers**: Added new storage providers for Cloudflare R2 and Cloudflare KV (`src/storage/providers/cloudflare/`). This allows the MCP server to use Cloudflare's edge storage solutions when deployed in a Cloudflare Workers environment. The `storageFactory` (`src/storage/core/storageFactory.ts`) has been updated to dynamically instantiate these providers.
- **Enhanced Configuration**: The storage configuration in `src/config/index.ts` now accepts `cloudflare-r2` and `cloudflare-kv` as valid provider types.

### Changed

- **Dependencies**: Upgraded `@cloudflare/workers-types` to `4.20250926.0` and `tsx` to `4.20.6`.
- **Typings**: Improved TypeScript configurations in `tsconfig.json` and `tsconfig.test.json` for better type safety and compatibility with Cloudflare Workers.

### Fixed

- **Test Suite Robustness**: Made numerous fixes across the test suite to improve reliability and type safety. This includes correcting import paths, improving mock implementations, and ensuring proper type inference in test files.

## [2.1.3] - 2025-09-25

### Changed

- **`server.json` Schema Migration**: Migrated `server.json` to the `2025-09-16` schema, updating all field names from snake_case to camelCase to align with the latest MCP registry standards.

### Refactor

- **`devcheck` Script Overhaul**: The `scripts/devcheck.ts` script has been completely rewritten for improved performance and robustness. It now uses `Bun.spawn` for faster execution, supports auto-fixing via `--no-fix`, and intelligently scans only staged files when run in a git hook. It also includes new checks for TODOs/FIXMEs, security vulnerabilities, and tracked secrets.
- **Agent Protocol Files**: Replaced symbolic links for `AGENTS.md` and `CLAUDE.md` with hard links to `.clinerules/AGENTS.md`, ensuring content is identical and directly reflects the source of truth for agent development protocols.

### Chore

- **Dependency Updates**: Upgraded `zod` to `^3.23.8` and added `bun-types` for improved type safety with Bun APIs.
- **Configuration**: Updated `tsconfig.json` and `tsconfig.test.json` to include `bun-types` and `vitest/globals` for better type inference.
- **CI/CD**: Refined build and workflow configurations in `.github/workflows/publish.yml`, `.husky/pre-commit`, and `smithery.yaml`.

## [2.1.2] - 2025-09-25

### Refactor

- **Major Test Suite Overhaul**: The entire testing framework has been restructured to align with the `src` directory layout, improving modularity and clarity. Integration tests have been reorganized from a monolithic `integration` directory into `tests/config`, `tests/mcp-server`, and so on. The `storageProviderCompliance` suite has been converted into a proper test file. This change provides a more scalable and intuitive testing foundation.

- **Enhanced `devdocs` Script**: The `devdocs.ts` script for generating AI context has been completely rewritten for robustness. It now uses `execa` for safer command execution, features structured JSON logging, handles arguments with `node:utilparseArgs`, and runs 'repomix' analyses in parallel for improved performance.

- **Improved Configuration Handling**: The core configuration module (`src/config/index.ts`) now includes validation and aliasing for `logLevel`, `environment`, and `storage.providerType`. This allows for more flexible environment variable settings (e.g., `dev` for `development`).

- **Strengthened MCP Resource Handling**: The resource handler factory now includes stricter type checking and validation for resource formatter outputs, ensuring all formatters return a valid `ContentBlock[]` array and preventing runtime errors.

### Chore

- **Dependency Updates**: Updated key dependencies across the project, including `@modelcontextprotocol/sdk`, `@hono/node-server`, `hono`, and `zod` to their latest versions. Added the `repomix` dependency to formalize its use in the developer workflow.

## [2.1.1] - 2025-09-24

### Changed

- Enhanced the HTTP transport's health check endpoint (`/mcp`) to return a more detailed server status object, including description, environment, transport type, and session mode.

### Fixed

- Corrected minor code formatting issues, including import ordering in several files.

## [2.1.0] - 2025-09-24

### Feature

- **Cloudflare Workers Support**: Introduced first-class support for deploying the MCP server to Cloudflare Workers. This includes a new worker-specific entry point (`src/worker.ts`), a `wrangler.toml` configuration file, and updated build scripts (`build:worker`, `deploy:dev`, `deploy:prod`) to enable seamless edge deployments.

### Changed

- **Environment-Aware Architecture**:
  - Refactored core utilities (`logger`, `storageFactory`, `sanitization`, `performance`) to be environment-aware. They now dynamically adapt to run efficiently in both Node.js and serverless environments like Cloudflare Workers.
  - The dependency injection container is now composed via a `composeContainer()` function to ensure services are initialized correctly at application startup, regardless of the runtime.
  - Updated `httpTransport.ts` to improve compatibility with Hono's streamable transport and ensure a non-optional `sessionId` is always present.
- **Dependencies**: Added `@cloudflare/workers-types` to provide type definitions for the Workers runtime.
- **Configuration**:
  - `tsconfig.json` was updated to include Cloudflare Workers types.
  - Added `wrangler.toml` for Cloudflare deployment configuration.
- **Documentation**:
  - Updated `.clinerules/clinerules.md` with new guidance and a checklist for developing and deploying on both local and edge runtimes.
  - Regenerated `docs/tree.md` to include new worker-related files.

## [2.0.8] - 2025-09-24

### BREAKING CHANGE

- **Logging Abstraction**: The internal logging system has been migrated from `Winston` to `Pino`. This change provides a more performant, structured logging implementation and integrates seamlessly with OpenTelemetry for automatic trace context injection. While the public `logger` API remains largely the same, underlying transport configurations and direct `winston` dependencies are removed.

### Changed

- Migrated `logger.ts` from Winston to Pino for performance and better structured logging, and ability to scale (e.g. Cloudflare Workers).
- Replaced `winston` and `@opentelemetry/instrumentation-winston` with `pino`, `pino-pretty`, and `@opentelemetry/instrumentation-pino`.
- Updated `instrumentation.ts` to use `PinoInstrumentation` and inject trace/span IDs into logs automatically.

### Fixed

- Integration tests for the logger (`logger.test.ts`) were updated to work with Pino's JSON output format.
- Removed `Logger.resetForTesting()` which is no longer needed with the new implementation.

### Docs

- Updated `README.md` to reflect the change from Winston to Pino.
- Updated `docs/tree.md` with the correct generation date.

## [2.0.7] - 2025-09-23

### Changed

- Bumped project version to `2.0.7`.
- Dependencies:
  - `openai` to `^5.23.0`.

### Configuration

- `server.json` manifest:
  - Added `MCP_HTTP_HOST` (default `127.0.0.1`).
  - Added `MCP_HTTP_ENDPOINT_PATH` (default `/mcp`).

### Refactored

- Logger:
  - Suppress console transport when running in test environment to reduce noisy output.
  - Minor import reordering for type-only clarity.
- Scheduler:
  - Switched to explicit named imports from `node-cron` (`validate`, `createTask`) and updated internal usage for clarity and testability.

### Tests

- Added comprehensive unit tests across core utilities and internals:
  - `ErrorHandler` (additional branches, mapping/default factory paths, stack inclusion, and McpError preservation).
  - `health` snapshot utility.
  - `performance` measurement helper (`measureToolExecution` success and error paths).
  - `requestContext` service creation/merge/trace metadata behavior.
  - `metrics/registry` (counters, histograms, caching, disabled mode).
  - `network/fetchWithTimeout` (success, HTTP errors, timeouts, network errors).
  - `parsing/dateParser` (basic and detailed parsing, error wrapping).
  - `scheduling/scheduler` (validation, lifecycle, overlap prevention, error capture).
  - `security/rateLimiter` (limits, development skip, cleanup and reset).
- Test setup: ensure `NODE_ENV=test` in `tests/setup.ts` so logger suppresses noisy warnings during tests.

### Docs

- Regenerated `docs/tree.md` to reflect new files and structure.

## [2.0.6] - 2025-09-22

### BREAKING CHANGE

- Storage providers are now tenant-scoped. The `IStorageProvider` interface methods require a `tenantId` parameter for `get`, `set`, `delete`, and `list`. `StorageService` enforces presence of `tenantId` via `RequestContext`.

### Feature

- Multi-tenancy across storage and auth:
  - Add `tenantId` to `AuthInfo` and propagate into `RequestContext` (via ALS auth store). Include `tenantId` in auth logs.
  - Filesystem provider segregates data per-tenant using sanitized directory paths.
  - In-memory provider uses per-tenant maps with lazy TTL cleanup.
  - Supabase provider uses a `tenant_id` column and an admin client injected via DI; operations are filtered by `tenant_id`.
  - DI: Register `SupabaseAdminClient` token and factory in the container; resolve `SupabaseProvider` via DI in `storageFactory`.

### Refactored

- Config: derive `pkg.name`/`pkg.version`/`pkg.description` from `package.json` with env overrides; remove baked-in defaults for pkg/telemetry, set `openrouterAppName` from `pkg.name`, add FS-availability guard for `logsPath`, and reorder imports to satisfy linting.

### Changed

- Dependencies bumped:
  - `openai` to `^5.22.0`
  - `@eslint/js` to `^9.36.0`
  - `eslint` to `^9.36.0`
  - `msw` to `^2.11.3`
  - `vite` to `^7.1.7`
- Versions:
  - `package.json` version to `2.0.6`
  - `server.json` manifest version fields to `2.0.5`

### Removed

- Deleted legacy `src/storage/providers/supabase/supabaseClient.ts`.

### Docs

- Regenerated `docs/tree.md`.

## [2.0.5] - 2025-09-18

### Changed

- **Major Refactoring**: Replaced the custom transport management system (`StatefulTransportManager`, `StatelessTransportManager`, `AutoTransportManager`) with the official `@hono/mcp` package. This simplifies the architecture, removes significant maintenance overhead, and aligns the project with standard practices for Hono-based MCP servers.
- Updated multiple dependencies to their latest versions, including the MCP SDK, Hono, and TypeScript types.

## [2.0.4] - 2025-09-18

### Refactored

- **DI & Storage**: Decoupled `StorageService` from its static, singleton-based instantiation and integrated it into the `tsyringe` dependency injection container. Core services now resolve `StorageService` through the container, improving testability and adherence to IoC principles.
- **Authorization**: Renamed the `withAuth` higher-order function to `withToolAuth` to create a more explicit and discoverable API for applying authorization to tool logic.
- **`FileSystemProvider`**: Simplified the `FileSystemProvider` by removing redundant key sanitization and expiration logic, delegating that responsibility to a higher-level caching layer. This change streamlines the provider's focus to core file I/O operations.

### Changed

- **Dependencies**: Bumped the project version to `2.0.4` across `package.json` and `server.json`.

## [2.0.3] - 2025-09-15

### Changed

- **Dependencies**: Updated `axios`, `@types/node`, and `typedoc` to their latest versions.
- **Documentation**: Improved the MCP registry publishing guide (`docs/publishing-mcp-server-registry.md`) with more detailed instructions, environment variable precedence warnings, and best practices for transport URLs.
- **Build Script**: The `scripts/validate-mcp-publish-schema.ts` script was enhanced to include a post-publication verification step, which polls the registry to confirm the server is live.

## [2.0.1] - 2025-09-14

### Feature

- **MCP Registry Publishing**:
  - Added a new GitHub Actions workflow (`.github/workflows/publish-mcp.yml`) to automatically publish the server to the official MCP Registry when a new version tag is pushed.
  - Introduced a `server.json` manifest file, which is required for the MCP registry to discover and understand how to run the server.
  - Added a validation script (`scripts/validate-mcp-publish-schema.ts`) to ensure `server.json` conforms to the official schema.
  - Updated `package.json` with the `mcpName` field and bumped the version to `2.0.1`.
- **Dockerfile Enhancements**:
  - Optimized the Dockerfile for smaller and more secure production builds by using the `bun:1-slim` base image.
  - Added the `io.modelcontextprotocol.server.name` OCI label required for MCP registry validation.
  - Improved environment variable handling and now uses the built-in non-root `bun` user.

## [2.0.0] - 2025-09-14

### BREAKING CHANGE

- **Architectural Refactor: Dependency Injection with `tsyringe`**: The entire application architecture was refactored to use a Dependency Injection (DI) container (`tsyringe`). This is a fundamental shift from manual instantiation and singletons to a more robust, maintainable, and testable architecture. All major components, including services, providers, transports, and strategies, are now resolved through the container.
- **Declarative Tooling Architecture**: Completely refactored the tool registration and definition architecture to a declarative, single-file pattern. This is a significant breaking change that simplifies tool creation and improves maintainability.

### Feature

- **Bun Test Integration**: Overhauled the testing framework to be compatible with Bun's built-in test runner (`bun test`).
  - Introduced a `tests/setup.ts` compatibility layer, preloaded via `bunfig.toml`, to shim `vi.mock` and other Vitest APIs.
  - Split test execution into unit (`bun test`) and integration (`bun test:integration`) suites with separate `vitest.config.ts` and `vitest.integration.config.ts` files.
  - Added new integration tests for core utilities like `config`, `logger`, and `errorHandler`.
- **Declarative Authorization**: Introduced `withAuth` and `withResourceAuth` higher-order functions to declaratively add scope-based authorization to tool and resource logic, centralizing access control.
- **Enhanced Auth Utilities**: Improved `withRequiredScopes` to default to an open/permissive mode when authentication is disabled, simplifying the experience for template users while maintaining strict checks when auth is active.

### Added

- **Dependency Injection Container**: Introduced `tsyringe` for managing object lifecycles and dependencies. A central container is configured in `src/container/index.ts` with registration tokens in `src/container/tokens.ts`.
- **Modular Registration**: Created `src/mcp-server/tools/tool-registration.ts` and `src/mcp-server/resources/resource-registration.ts` to modularize tool and resource registration with the DI container.
- **`ILlmProvider` Interface**: Added `src/services/llm-providers/ILlmProvider.ts` to define a standard contract for LLM providers, enabling easier swapping of implementations.
- **New `clinerules`**: Added a new `.clinerules/clinerules.md` file to replace the old `AGENTS.md`.
- **Declarative Tool & Resource Registration**: Implemented barrel exports (`index.ts`) in `src/mcp-server/tools/definitions/` and `src/mcp-server/resources/definitions/` to create central arrays (`allToolDefinitions`, `allResourceDefinitions`). This allows `tool-registration.ts` and `resource-registration.ts` to loop over the arrays, automating the registration process and removing the need for manual imports of each new definition.
- **Improved `devcheck.ts` Script**: Significantly enhanced the `devcheck.ts` script with more detailed, colorful logging, command-line flags (`--no-lint`, `--no-types`, etc.) for skipping specific checks, and an auto-fix mode (`--no-fix` disables it). The summary now provides duration for each check and offers contextual tips for fixing failures.
- **Health & Runtime Utils**: Introduced `src/utils/internal/health.ts` for health checks and `src/utils/internal/runtime.ts` for runtime assertions.
- **Metrics Registry**: Added `src/utils/metrics/registry.ts` to manage and register metrics collectors.
- **Centralized Telemetry**: Created `src/utils/telemetry/index.ts` and `src/utils/telemetry/trace.ts` to centralize OpenTelemetry tracing logic.
- **Formatting**: Introduced `.prettierrc.json` for consistent repository formatting.
- **Developer Scripts**: Added `scripts/devcheck.ts` utility for local checks during development.
- **Documentation**: Added root-level `AGENTS.md` as the single source of truth for agent development mandates; retained `.clinerules/AGENTS.md` as a synced artifact.
- **CI**: Added `.github/workflows/sync-agents-md.yml` to automatically mirror `.clinerules/AGENTS.md` to `AGENTS.md` on push.
- **Husky**: Introduced a `pre-commit` hook to run `bun run devcheck` for local guardrails.
- **Resource Pattern**: Added `src/mcp-server/resources/definitions/echo.resource.ts` and resource utilities (`resources/utils/resourceDefinition.ts`, `resources/utils/resourceHandlerFactory.ts`) with `registerResource` support.
- **Template Tools**: Added `template-echo-message.tool.ts`, `template-cat-fact.tool.ts`, and `template-image-test.tool.ts` as reference implementations for the declarative tool pattern.

### Changed

- **Documentation**: Refined formatting and updated content in `AGENTS.md` and `.clinerules/clinerules.md` to align with the latest tool/resource development workflows and architectural mandates.
- **Project Structure**: Updated `README.md` with current TypeScript version, enhanced descriptions for agent-friendly design, expanded sections on server execution and configuration.
- **Tool Definitions**: Clarified metadata comments and updated import paths in `template-cat-fact.tool.ts`, `template-echo-message.tool.ts`, and `template-image-test.tool.ts` to conform to the declarative tool pattern.
- **Build Process**: Transitioned from `tsc` to `bun build` for our primary build process, enhancing build times and simplifying configuration. This includes updates to `package.json` scripts and related dependency adjustments (`bun.lock`, `tsup`, `tsc-alias`).
- **Configuration Robustness**: Significantly improved configuration loading in `src/config/index.ts` by introducing `emptyStringAsUndefined` preprocessing and setting more intelligent default values, making the server more resilient to missing environment variables.
- **OpenTelemetry Instrumentation**: Refined OpenTelemetry initialization and shutdown in `src/utils/telemetry/instrumentation.ts`. Added checks for multiple initializations, included warnings for unconfigured OTLP endpoints, and made error handling more graceful to prevent application crashes.
- **Dependency Updates**: Updated various dependencies to their latest versions for improved stability and security.
- **Application Entry Point**: Reordered imports in `src/index.ts` to ensure OpenTelemetry instrumentation loads optimally, and updated logger import paths.
- **Dependencies**: Updated `bun.lock` and `package.json` with the latest dependency versions.
- **Application Bootstrap**: The main entry point (`src/index.ts`) now initializes the DI container to bootstrap the application.
- **Server Initialization**: `src/mcp-server/server.ts` now resolves tool and resource definitions from the container instead of importing them directly.
- **Transport Layer**: `StatefulTransportManager` and `httpTransport` are now managed by the container. The `TransportManager` is resolved via a token (`TransportManagerToken`).
- **Authentication**: Authentication strategies (`JwtStrategy`, `OauthStrategy`) are now injectable classes that receive their dependencies (config, logger) via the constructor.
- **Services Refactoring**: Core services like `OpenRouterProvider` and `RateLimiter` have been refactored into injectable classes, receiving dependencies from the container.
- **Configuration & Logging**: The application `config` and `logger` are now registered as values in the container and injected into dependent classes.
- **Core Refactoring**: Completed significant refactoring across the internal utility stack (`errorHandler`, `logger`, `performance`) and metrics (`tokenCounter`) to improve robustness, context propagation, and observability. This aligns with our full-stack observability goals and hardens the core infrastructure.
- **Async Hygiene & Error Handling**: Systematically hardened error handling, improved asynchronous discipline by eliminating floating promises, and strengthened type safety across transports, utilities, and scripts.
- **Linting**: Refined the ESLint flat configuration to correctly scope type-aware rules for TypeScript files, improving build-time checks.
- **Dependencies**: Updated `bun.lock`, `package.json`, and `tsconfig.json` to reflect the latest changes and ensure a consistent build environment.
- **Documentation**: Overhauled `README.md` to feature a more modern, scannable design and updated content. Moved the developer mandate to a new `AGENTS.md` file to better align with agent-based development workflows.
- **Documentation**: Formalized the "Agent Protocol & Architectural Mandate" and aligned internal docs (`CLAUDE.md`, `.clinerules/AGENTS.md`) with the declarative tool pattern and error-handling invariants (logic throws, handler catches).
- **Code Quality**: Applied formatting and minor code quality improvements across several tool definitions and utilities.
- **Transport Layer**: Refactored `StatefulTransportManager` and `StatelessTransportManager` to use a new `_processRequestWithBridge` method in the base class, centralizing request handling and stream management.
- **Auth**: Consolidated auth type definitions and refined middleware; improved JWT and OAuth strategies for clearer flows and stronger typing (`authFactory`, `authMiddleware`, `authUtils`, `jwtStrategy`, `oauthStrategy`).
- **LLM Provider**: Overhauled `OpenRouterProvider` to be more robust, with constructor-based configuration and improved parameter handling.
- **Configuration**: Enhanced the configuration system to include package description and more detailed settings for OAuth and storage providers.
- **Developer Scripts**: Significantly improved the `devdocs.ts` script for better reliability.
- **Logging**: The `Logger` class now uses overloaded methods for high-severity logs (`error`, `crit`, etc.) for more flexible error reporting.
- **Build & Type Safety**: Upgraded the project's build and linting configurations for enhanced type safety and stricter code quality checks.
  - Enabled type-aware linting rules (`@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-misused-promises`).
  - Activated `exactOptionalPropertyTypes` in `tsconfig.json` to prevent bugs related to optional properties.
- **Core Refactoring**: Refactored object creation patterns across the application to be compliant with `exactOptionalPropertyTypes`. This improves robustness by ensuring optional properties are handled correctly and consistently, particularly in auth strategies, transport managers, and storage providers.
- **Server Lifecycle**: Introduced a `TransportManager` to handle the lifecycle of transport-related resources, ensuring graceful shutdown of stateful sessions (e.g., in `HTTP` transport) and preventing resource leaks. The main application entry point (`index.ts`) and server startup sequence were refactored to support this.
- **HTTP Middleware**: Aligned the MCP transport middleware with Hono v4 by removing the deprecated `createMiddleware` factory, improving compatibility and future-proofing the transport layer.
- **CI/CD**: Tweaked `.github/workflows/publish.yml` to improve publish reliability and alignment with the 2.0.0 pipeline.
- **Configuration**: Updated `Dockerfile` and `eslint.config.js`; refreshed `smithery.yaml` for current tool and publishing settings.
- **Build**: Standardized on Bun lockfiles by adding `bun.lock` and updating `package.json` (replacing `package-lock.json`).
- **Developer Scripts**: Updated `scripts/clean.ts`, `scripts/devdocs.ts`, `scripts/fetch-openapi-spec.ts`, `scripts/make-executable.ts`, and `scripts/tree.ts` for consistency and improved DX.
- **Observability & Context**: Tightened `RequestContext` propagation and performance logging across utils (`errorHandler`, `logger`, `performance`, `requestContext`) to align with full-stack observability goals.
- **Tools**: Brought existing tool definitions (`echo`, `cat-fact`, `image-test`) and echo resource into compliance with the declarative single-file pattern and handler factory; removed ad-hoc try/catch from tool logic and enforced `McpError` throwing.
- **Server Registration**: Updated `src/mcp-server/server.ts` to register tools and resources via `registerTool` and `registerResource`, applying title-precedence rules for UIs.
- **Agent Meta**: Updated `AGENTS.md` and `.clinerules/AGENTS.md` with the Protocol & Architectural Mandate v2.0.0 and clarified development workflow and invariants.
- **Docs**: Refreshed `docs/tree.md` to match the new structure (tools/resources moved under `definitions/` with `utils/` for registrars).
- **Tests**: Updated and expanded tests to reflect new patterns across transports, auth, storage providers, metrics, network, parsing, scheduling, and security utilities; refined `vitest.config.ts`.
- **Documentation**: Updated `README.md`, `CLAUDE.md`, and `scripts/README.md`; tidied `changelog/archive1.md`.
- **Type Safety & Error Handling**: Hardened non-`Error` inputs in `ErrorHandler.getErrorMessage`; added safer JSON-RPC id extraction in `httpErrorHandler`; improved error wrapping and propagation in HTTP transport startup and port checks; standardized string conversions for unknown values across factories/providers.
- **Async Discipline**: Converted trivial async functions to sync where appropriate (echo resource logic, date parser); eliminated floating promises by using `void` in scheduler, transport manager, and developer scripts; ensured interval cleanup invocations are awaited via `void` semantics.
- **Configuration Parsing**: Strengthened `package.json` parsing in the config loader with unknown-typed deserialization and guards for `name`, `version`, and `description`.
- **Tools**: Minor no-op `await Promise.resolve()` in `echo.tool` logic to satisfy linting without affecting purity or behavior.

### Refactored

- **Build Configuration**: Refined the TypeScript build process by setting `rootDir` to `src` and adjusting `include`/`exclude` paths in `tsconfig.json`. This provides a stricter, more conventional build setup.
- **Module Imports**: Simplified internal module imports in `src/utils/internal/index.ts` to use relative paths instead of package subpaths, improving module resolution consistency.
- **Storage Layer**: Updated the storage service and providers to prefer type-only imports (`import type`) for interfaces like `IStorageProvider`. This hardens the architecture by enforcing a clean separation between type definitions and their concrete implementations.
- **Auth Strategy**: Decoupled `OauthStrategy` from the dependency injection container by removing `@inject` decorators. It now consumes the singleton `config` and `logger` directly, simplifying its instantiation.
- **Logger**: Refined the `Logger` service for more reliable shutdown and cleanup logic, improving resource management.
- **DI Container**: Re-organized DI container registration into modular files under `src/container/registrations/` for core, MCP, and transport services. This improves separation of concerns and makes the container configuration more scannable and maintainable.
- **Declarative Auto-Registration**: Implemented fully declarative, auto-registering tool and resource definitions. Developers now only need to create a definition file; the system handles registration automatically, removing manual registration steps.
- **Distributed Session Management**: Re-architected `StatefulTransportManager` to use a distributed storage provider for session management instead of in-memory maps. This enables horizontal scaling without requiring sticky sessions.
- **Decoupled DI in Transport Layer**: Refactored `AutoTransportManager` and `httpTransport` to receive `StatefulTransportManager` and `StatelessTransportManager` via dependency injection, removing direct instantiation and the `createMcpServerFn` dependency. This fully decouples the transport layer from the server creation logic.

### Fixed

- **Sanitization Utility**: Enhanced the sensitive field sanitization logic to use a more robust, normalized key-matching algorithm, providing more accurate redaction of secrets in logs.
- **Build Script**: Corrected the `build` script in `package.json` to `tsc -b` for proper composite project builds.
- **Resource/Tool Registration**: Refined barrel exports and registration loops to be more robust.
- **Pre-commit Hook**: Modified the `.husky/pre-commit` hook to run `bun run devcheck --no-deps --husky-hook`. This prevents the hook from failing due to outdated dependency checks and ensures that any files auto-formatted during the pre-commit phase are automatically re-staged.
- **Husky Workflow**: Added a `--husky-hook` flag to the `devcheck.ts` script. When active, it captures the list of staged files, runs formatters, and then automatically re-stages any of those files that were modified, ensuring a clean working directory after the commit.
- **Storage**: The Supabase storage provider's `list` method now correctly filters out expired items, ensuring that only active key-value pairs are returned.
- **HTTP Transport**: Startup and port check errors are now wrapped and rejected as proper `Error` instances, improving reliability and log fidelity. Also uses `c.header` for security headers to align with Hono best practices.
- **Scheduler**: Start/stop/remove operations no longer create unhandled promise rejections by explicitly using `void` on promise-returning calls.
- **Error Mapping**: Avoids unsafe index access on `ERROR_TYPE_MAPPINGS` and improves fallbacks for unstringifiable errors, ensuring stable error codes and messages.

### Removed

- **Documentation**: Deleted `docs/all-files.md` and `scripts/README.md` as they are no longer needed.
- **Legacy `AGENTS.md`**: Deleted the old `AGENTS.md` and `.github/workflows/sync-agents-md.yml` as they are replaced by the new `.clinerules/clinerules.md`.
- **Manual Instantiation**: Removed manual singleton creation for services like `openRouterProvider` and `rateLimiter`.
- **Legacy Tool Structure**: Deleted all legacy tool files, including the `logic.ts`, `registration.ts`, and `index.ts` files for `echoTool`, `catFactFetcher`, and `imageTest`.
- **Legacy `.clinerules`**: Deleted the now-redundant `.clinerules/clinerules.md` in favor of the new `AGENTS.md`.
- **Obsolete Tests**: Removed tests tied to the old patterns, including `tests/mcp-server/server.test.ts` and `tests/services/llm-providers/openRouterProvider.test.ts`.

### Docs

- **Developer Mandates**: Updated `AGENTS.md` and `.clinerules/clinerules.md` to reflect the new DI-free and barrel-export-based registration for tools and resources.
- **Tree**: Updated `docs/tree.md` to reflect the new file structure.
- **Developer Documentation**: Improved `scripts/devdocs.ts` script for better reliability.
