# Changelog

All notable changes to this project will be documented in this file.

For changelog details prior to version 2.0.0, please refer to the [changelog/archive1.md](changelog/archive1.md) file.

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
- **Developer Scripts**: Significantly improved the `devdocs.ts` script for better prompt generation and reliability.
- **Logging**: The `Logger` class now uses overloaded methods for high-severity logs (`error`, `crit`, etc.) for more flexible error reporting.
- **Build & Type Safety**: Upgraded the project's build and linting configurations for enhanced type safety and stricter code quality checks.
  - Enabled type-aware linting rules (`@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-misused-promises`).
  - Activated `exactOptionalPropertyTypes` in `tsconfig.json` to prevent bugs related to optional properties.
- **Core Refactoring**: Refactored object creation patterns across the application to be compliant with `exactOptionalPropertyTypes`. This improves robustness by ensuring optional properties are handled correctly and consistently, particularly in auth strategies, transport managers, and storage providers.
- **Server Lifecycle**: Introduced a `TransportManager` to handle the lifecycle of transport-related resources, ensuring graceful shutdown of stateful sessions (e.g., in HTTP transport) and preventing resource leaks. The main application entry point (`index.ts`) and server startup sequence were refactored to support this.
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
