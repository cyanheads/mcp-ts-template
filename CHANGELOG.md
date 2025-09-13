# Changelog

All notable changes to this project will be documented in this file.

For changelog details prior to version 2.0.0, please refer to the [changelog/archive1.md](changelog/archive1.md) file.

## [2.0.0-alpha.4] - 2025-09-12

### Added
- **Declarative Tool & Resource Registration**: Implemented barrel exports (`index.ts`) in `src/mcp-server/tools/definitions/` and `src/mcp-server/resources/definitions/` to create central arrays (`allToolDefinitions`, `allResourceDefinitions`). This allows `tool-registration.ts` and `resource-registration.ts` to loop over the arrays, automating the registration process and removing the need for manual imports of each new definition.
- **Improved `devcheck.ts` Script**: Significantly enhanced the `devcheck.ts` script with more detailed, colorful logging, command-line flags (`--no-lint`, `--no-types`, etc.) for skipping specific checks, and an auto-fix mode (`--no-fix` disables it). The summary now provides duration for each check and offers contextual tips for fixing failures.

### Changed
- **Decoupled DI in Transport Layer**: Refactored `AutoTransportManager` and `httpTransport` to receive `StatefulTransportManager` and `StatelessTransportManager` via dependency injection, removing direct instantiation and the `createMcpServerFn` dependency. This fully decouples the transport layer from the server creation logic.
- **Dependency Updates**: Upgraded various `@opentelemetry/*` packages and other dependencies to their latest versions, as reflected in `bun.lock` and `package.json`.

### Fixed
- **Pre-commit Hook**: Modified the `.husky/pre-commit` hook to run `bun run devcheck --no-deps`. This prevents the hook from failing due to outdated dependency checks, which are not critical for a pre-commit verification and can be handled separately.

## [2.0.0-alpha.3] - 2025-09-12

### BREAKING CHANGE

- **Architectural Refactor: Dependency Injection with `tsyringe`**: The entire application architecture was refactored to use a Dependency Injection (DI) container (`tsyringe`). This is a fundamental shift from manual instantiation and singletons to a more robust, maintainable, and testable architecture. All major components, including services, providers, transports, and strategies, are now resolved through the container.

### Added

- **Dependency Injection Container**: Introduced `tsyringe` for managing object lifecycles and dependencies. A central container is configured in `src/container/index.ts` with registration tokens in `src/container/tokens.ts`.
- **Modular Registration**: Created `src/mcp-server/tools/tool-registration.ts` and `src/mcp-server/resources/resource-registration.ts` to modularize tool and resource registration with the DI container.
- **`ILlmProvider` Interface**: Added `src/services/llm-providers/ILlmProvider.ts` to define a standard contract for LLM providers, enabling easier swapping of implementations.
- **New `clinerules`**: Added a new `.clinerules/clinerules.md` file to replace the old `AGENTS.md`.

### Changed

- **Application Bootstrap**: The main entry point (`src/index.ts`) now initializes the DI container to bootstrap the application.
- **Server Initialization**: `src/mcp-server/server.ts` now resolves tool and resource definitions from the container instead of importing them directly.
- **Transport Layer**: `StatefulTransportManager` and `httpTransport` are now managed by the container. The `TransportManager` is resolved via a token (`TransportManagerToken`).
- **Authentication**: Authentication strategies (`JwtStrategy`, `OauthStrategy`) are now injectable classes that receive their dependencies (config, logger) via the constructor.
- **Services Refactoring**: Core services like `OpenRouterProvider` and `RateLimiter` have been refactored into injectable classes, receiving dependencies from the container.
- **Configuration & Logging**: The application `config` and `logger` are now registered as values in the container and injected into dependent classes.

### Removed

- **Legacy `AGENTS.md`**: Deleted the old `AGENTS.md` and `.github/workflows/sync-agents-md.yml` as they are replaced by the new `.clinerules/clinerules.md`.
- **Manual Instantiation**: Removed manual singleton creation for services like `openRouterProvider` and `rateLimiter`.

## [2.0.0-alpha.2] - 2025-09-12

### Added

- **Health & Runtime Utils**: Introduced `src/utils/internal/health.ts` for health checks and `src/utils/internal/runtime.ts` for runtime assertions. ([d3a1cdb](https://github.com/cyanheads/mcp-ts-template/commit/d3a1cdb))
- **Metrics Registry**: Added `src/utils/metrics/registry.ts` to manage and register metrics collectors. ([d3a1cdb](https://github.com/cyanheads/mcp-ts-template/commit/d3a1cdb))
- **Centralized Telemetry**: Created `src/utils/telemetry/index.ts` and `src/utils/telemetry/trace.ts` to centralize OpenTelemetry tracing logic. ([d3a1cdb](https://github.com/cyanheads/mcp-ts-template/commit/d3a1cdb))

### Changed

- **Core Refactoring**: Completed significant refactoring across the internal utility stack (`errorHandler`, `logger`, `performance`) and metrics (`tokenCounter`) to improve robustness, context propagation, and observability. This aligns with our full-stack observability goals and hardens the core infrastructure. ([d3a1cdb](https://github.com/cyanheads/mcp-ts-template/commit/d3a1cdb))
- **Async Hygiene & Error Handling**: Systematically hardened error handling, improved asynchronous discipline by eliminating floating promises, and strengthened type safety across transports, utilities, and scripts. ([d3a1cdb](https://github.com/cyanheads/mcp-ts-template/commit/d3a1cdb))
- **Linting**: Refined the ESLint flat configuration to correctly scope type-aware rules for TypeScript files, improving build-time checks. ([d3a1cdb](https://github.com/cyanheads/mcp-ts-template/commit/d3a1cdb))
- **Dependencies**: Updated `bun.lock`, `package.json`, and `tsconfig.json` to reflect the latest changes and ensure a consistent build environment. ([d3a1cdb](https://github.com/cyanheads/mcp-ts-template/commit/d3a1cdb))

### Docs

- **Tree**: Updated `docs/tree.md` to reflect the new file structure. ([d3a1cdb](https://github.com/cyanheads/mcp-ts-template/commit/d3a1cdb))
- **Developer Documentation**: Improved `scripts/devdocs.ts` script for better reliability. ([d3a1cdb](https://github.com/cyanheads/mcp-ts-template/commit/d3a1cdb))

## [2.0.0-alpha.1] - 2025-08-31

### BREAKING CHANGE

- **Declarative Tooling Architecture**: Completely refactored the tool registration and definition architecture to a declarative, single-file pattern. This is a significant breaking change that simplifies tool creation and improves maintainability.
  - **ToolDefinition Interface**: Introduced a new `ToolDefinition` interface (`src/mcp-server/tools/utils/toolDefinition.ts`) that encapsulates a tool's name, description, schemas, annotations, and core logic in a single object.
  - **Tool Handler Factory**: Created a `toolHandlerFactory.ts` to abstract away boilerplate for error handling, context creation, performance measurement, and response formatting, ensuring all tools behave consistently.
  - **Single-File Tool Definitions**: All tools (`echo`, `cat-fact`, `image-test`) are now defined in a single file within `src/mcp-server/tools/definitions/`. This replaces the previous `logic.ts`, `registration.ts`, and `index.ts` structure for each tool.
  - **Type-Safe Registration**: Implemented a new type-safe `registerTool` helper function in `src/mcp-server/server.ts` that uses the `ToolDefinition` to correctly register the tool and its handler.
  - **Resource Definitions**: Established a parallel declarative pattern for resources using `ResourceDefinition` and a dedicated registrar (`resources/utils/resourceHandlerFactory.ts`), replacing ad-hoc resource wiring.

### Removed

- **Legacy Tool Structure**: Deleted all legacy tool files, including the `logic.ts`, `registration.ts`, and `index.ts` files for `echoTool`, `catFactFetcher`, and `imageTest`.
- **Legacy `.clinerules`**: Deleted the now-redundant `.clinerules/clinerules.md` in favor of the new `AGENTS.md`. ([ee77911](https://github.com/cyanheads/mcp-ts-template/commit/ee77911))
- **Obsolete Tests**: Removed tests tied to the old patterns, including `tests/mcp-server/server.test.ts` and `tests/services/llm-providers/openRouterProvider.test.ts`.

### Changed

- **Documentation**: Overhauled `README.md` to feature a more modern, scannable design and updated content. Moved the developer mandate to a new `AGENTS.md` file to better align with agent-based development workflows. ([ee77911](https://github.com/cyanheads/mcp-ts-template/commit/ee77911))
- **Documentation**: Formalized the "Agent Protocol & Architectural Mandate" and aligned internal docs (`CLAUDE.md`, `.clinerules/AGENTS.md`) with the declarative tool pattern and error-handling invariants (logic throws, handler catches).
- **Code Quality**: Applied formatting and minor code quality improvements across several tool definitions and utilities. ([7e6cf63](https://github.com/cyanheads/mcp-ts-template/commit/7e6cf63))
- **Transport Layer**: Refactored `StatefulTransportManager` and `StatelessTransportManager` to use a new `_processRequestWithBridge` method in the base class, centralizing request handling and stream management.
- **Auth**: Consolidated auth type definitions and refined middleware; improved JWT and OAuth strategies for clearer flows and stronger typing (`authFactory`, `authMiddleware`, `authUtils`, `jwtStrategy`, `oauthStrategy`).
- **LLM Provider**: Overhauled `OpenRouterProvider` to be more robust, with constructor-based configuration and improved parameter handling. ([32f4c38](https://github.com/cyanheads/mcp-ts-template/commit/32f4c38))
- **Configuration**: Enhanced the configuration system to include package description and more detailed settings for OAuth and storage providers. ([15ce967](https://github.com/cyanheads/mcp-ts-template/commit/15ce967))
- **Developer Scripts**: Significantly improved the `devdocs.ts` script for better prompt generation and reliability. ([297fa4e](https://github.com/cyanheads/mcp-ts-template/commit/297fa4e))
- **Logging**: The `Logger` class now uses overloaded methods for high-severity logs (`error`, `crit`, etc.) for more flexible error reporting.
- **Build & Type Safety**: Upgraded the project's build and linting configurations for enhanced type safety and stricter code quality checks. ([15ce967](https://github.com/cyanheads/mcp-ts-template/commit/15ce967))
  - Enabled type-aware linting rules (`@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-misused-promises`). ([15ce967](https://github.com/cyanheads/mcp-ts-template/commit/15ce967))
  - Activated `exactOptionalPropertyTypes` in `tsconfig.json` to prevent bugs related to optional properties. ([15ce967](https://github.com/cyanheads/mcp-ts-template/commit/15ce967))
- **Core Refactoring**: Refactored object creation patterns across the application to be compliant with `exactOptionalPropertyTypes`. This improves robustness by ensuring optional properties are handled correctly and consistently, particularly in auth strategies, transport managers, and storage providers. ([0265bcd](https://github.com/cyanheads/mcp-ts-template/commit/0265bcd))
- **Server Lifecycle**: Introduced a `TransportManager` to handle the lifecycle of transport-related resources, ensuring graceful shutdown of stateful sessions (e.g., in HTTP transport) and preventing resource leaks. The main application entry point (`index.ts`) and server startup sequence were refactored to support this. ([df3643f](https://github.com/cyanheads/mcp-ts-template/commit/df3643f))
- **HTTP Middleware**: Aligned the MCP transport middleware with Hono v4 by removing the deprecated `createMiddleware` factory, improving compatibility and future-proofing the transport layer. ([32f4c38](https://github.com/cyanheads/mcp-ts-template/commit/32f4c38))
- **CI/CD**: Tweaked `.github/workflows/publish.yml` to improve publish reliability and alignment with the 2.0.0 pipeline. ([f301041](https://github.com/cyanheads/mcp-ts-template/commit/f301041))
- **Configuration**: Updated `Dockerfile` and `eslint.config.js`; refreshed `smithery.yaml` for current tool and publishing settings. ([f301041](https://github.com/cyanheads/mcp-ts-template/commit/f301041))
- **Build**: Standardized on Bun lockfiles by adding `bun.lock` and updating `package.json` (replacing `package-lock.json`). ([26e66a8](https://github.com/cyanheads/mcp-ts-template/commit/26e66a8))
- **Developer Scripts**: Updated `scripts/clean.ts`, `scripts/devdocs.ts`, `scripts/fetch-openapi-spec.ts`, `scripts/make-executable.ts`, and `scripts/tree.ts` for consistency and improved DX. ([297fa4e](https://github.com/cyanheads/mcp-ts-template/commit/297fa4e))
- **Observability & Context**: Tightened `RequestContext` propagation and performance logging across utils (`errorHandler`, `logger`, `performance`, `requestContext`) to align with full-stack observability goals.
- **Tools**: Brought existing tool definitions (`echo`, `cat-fact`, `image-test`) and echo resource into compliance with the declarative single-file pattern and handler factory; removed ad-hoc try/catch from tool logic and enforced `McpError` throwing.
- **Server Registration**: Updated `src/mcp-server/server.ts` to register tools and resources via `registerTool` and `registerResource`, applying title-precedence rules for UIs.
- **Agent Meta**: Updated `AGENTS.md` and `.clinerules/AGENTS.md` with the Protocol & Architectural Mandate v2.0.0 and clarified development workflow and invariants.
- **Docs**: Refreshed `docs/tree.md` to match the new structure (tools/resources moved under `definitions/` with `utils/` for registrars).
- **Tests**: Updated and expanded tests to reflect new patterns across transports, auth, storage providers, metrics, network, parsing, scheduling, and security utilities; refined `vitest.config.ts`.
- **Documentation**: Updated `README.md`, `CLAUDE.md`, and `scripts/README.md`; tidied `changelog/archive1.md`. ([18d4cda](https://github.com/cyanheads/mcp-ts-template/commit/18d4cda))

- **Type Safety & Error Handling**: Hardened non-`Error` inputs in `ErrorHandler.getErrorMessage`; added safer JSON-RPC id extraction in `httpErrorHandler`; improved error wrapping and propagation in HTTP transport startup and port checks; standardized string conversions for unknown values across factories/providers.
- **Async Discipline**: Converted trivial async functions to sync where appropriate (echo resource logic, date parser); eliminated floating promises by using `void` in scheduler, transport manager, and developer scripts; ensured interval cleanup invocations are awaited via `void` semantics.
- **Configuration Parsing**: Strengthened `package.json` parsing in the config loader with unknown-typed deserialization and guards for `name`, `version`, and `description`.
- **Tools**: Minor no-op `await Promise.resolve()` in `echo.tool` logic to satisfy linting without affecting purity or behavior.

### Added

- **Formatting**: Introduced `.prettierrc.json` for consistent repository formatting. ([f301041](https://github.com/cyanheads/mcp-ts-template/commit/f301041))
- **Developer Scripts**: Added `scripts/devcheck.ts` utility for local checks during development. ([297fa4e](https://github.com/cyanheads/mcp-ts-template/commit/297fa4e))
- **Documentation**: Added root-level `AGENTS.md` as the single source of truth for agent development mandates; retained `.clinerules/AGENTS.md` as a synced artifact.
- **CI**: Added `.github/workflows/sync-agents-md.yml` to automatically mirror `.clinerules/AGENTS.md` to `AGENTS.md` on push.
- **Husky**: Introduced a `pre-commit` hook to run `bun run devcheck` for local guardrails.
- **Resource Pattern**: Added `src/mcp-server/resources/definitions/echo.resource.ts` and resource utilities (`resources/utils/resourceDefinition.ts`, `resources/utils/resourceHandlerFactory.ts`) with `registerResource` support.
- **Template Tools**: Added `template-echo-message.tool.ts`, `template-cat-fact.tool.ts`, and `template-image-test.tool.ts` as reference implementations for the declarative tool pattern.

### Fixed

- **Storage**: The Supabase storage provider's `list` method now correctly filters out expired items, ensuring that only active key-value pairs are returned. ([77d7ba5](https://github.com/cyanheads/mcp-ts-template/commit/77d7ba5))
- **HTTP Transport**: Startup and port check errors are now wrapped and rejected as proper `Error` instances, improving reliability and log fidelity. Also uses `c.header` for security headers to align with Hono best practices.
- **Scheduler**: Start/stop/remove operations no longer create unhandled promise rejections by explicitly using `void` on promise-returning calls.
- **Error Mapping**: Avoids unsafe index access on `ERROR_TYPE_MAPPINGS` and improves fallbacks for unstringifiable errors, ensuring stable error codes and messages.
