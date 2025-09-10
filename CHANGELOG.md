# Changelog

All notable changes to this project will be documented in this file.

For changelog details prior to version 2.0.0, please refer to the [changelog/archive1.md](changelog/archive1.md) file.

## [2.0.0] - 2025-08-31

### BREAKING CHANGE

- **Declarative Tooling Architecture**: Completely refactored the tool registration and definition architecture to a declarative, single-file pattern. This is a significant breaking change that simplifies tool creation and improves maintainability.
  - **ToolDefinition Interface**: Introduced a new `ToolDefinition` interface (`src/mcp-server/tools/utils/toolDefinition.ts`) that encapsulates a tool's name, description, schemas, annotations, and core logic in a single object.
  - **Tool Handler Factory**: Created a `toolHandlerFactory.ts` to abstract away boilerplate for error handling, context creation, performance measurement, and response formatting, ensuring all tools behave consistently.
  - **Single-File Tool Definitions**: All tools (`echo`, `cat-fact`, `image-test`) are now defined in a single file within `src/mcp-server/tools/definitions/`. This replaces the previous `logic.ts`, `registration.ts`, and `index.ts` structure for each tool.
  - **Type-Safe Registration**: Implemented a new type-safe `registerTool` helper function in `src/mcp-server/server.ts` that uses the `ToolDefinition` to correctly register the tool and its handler.

### Removed

- **Legacy Tool Structure**: Deleted all legacy tool files, including the `logic.ts`, `registration.ts`, and `index.ts` files for `echoTool`, `catFactFetcher`, and `imageTest`.
- **Legacy `.clinerules`**: Deleted the now-redundant `.clinerules/clinerules.md` in favor of the new `AGENTS.md`. (ee77911)
- **Obsolete Tests**: Removed all tests related to the legacy tool registration pattern (`tests/mcp-server/tools/`).

### Changed

- **Documentation**: Overhauled `README.md` to feature a more modern, scannable design and updated content. Moved the developer mandate to a new `AGENTS.md` file to better align with agent-based development workflows. (ee77911)
- **Documentation**: Formalized the "Agent Protocol & Architectural Mandate" and aligned internal docs (`CLAUDE.md`, `.clinerules/AGENTS.md`) with the declarative tool pattern and error-handling invariants (logic throws, handler catches).
- **Code Quality**: Applied formatting and minor code quality improvements across several tool definitions and utilities. (7e6cf63)
- **Transport Layer**: Refactored `StatefulTransportManager` and `StatelessTransportManager` to use a new `_processRequestWithBridge` method in the base class, centralizing request handling and stream management.
- **Auth**: Consolidated auth type definitions and refined middleware; improved JWT and OAuth strategies for clearer flows and stronger typing (`authFactory`, `authMiddleware`, `authUtils`, `jwtStrategy`, `oauthStrategy`).
- **LLM Provider**: Overhauled `OpenRouterProvider` to be more robust, with constructor-based configuration and improved parameter handling. (32f4c38)
- **Configuration**: Enhanced the configuration system to include package description and more detailed settings for OAuth and storage providers. (15ce967)
- **Developer Scripts**: Significantly improved the `devdocs.ts` script for better prompt generation and reliability. (297fa4e)
- **Logging**: The `Logger` class now uses overloaded methods for high-severity logs (`error`, `crit`, etc.) for more flexible error reporting.
- **Build & Type Safety**: Upgraded the project's build and linting configurations for enhanced type safety and stricter code quality checks. (15ce967)
  - Enabled type-aware linting rules (`@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-misused-promises`). (15ce967)
  - Activated `exactOptionalPropertyTypes` in `tsconfig.json` to prevent bugs related to optional properties. (15ce967)
- **Core Refactoring**: Refactored object creation patterns across the application to be compliant with `exactOptionalPropertyTypes`. This improves robustness by ensuring optional properties are handled correctly and consistently, particularly in auth strategies, transport managers, and storage providers. (0265bcd)
- **Server Lifecycle**: Introduced a `TransportManager` to handle the lifecycle of transport-related resources, ensuring graceful shutdown of stateful sessions (e.g., in HTTP transport) and preventing resource leaks. The main application entry point (`index.ts`) and server startup sequence were refactored to support this. (df3643f)
- **HTTP Middleware**: Aligned the MCP transport middleware with Hono v4 by removing the deprecated `createMiddleware` factory, improving compatibility and future-proofing the transport layer. (32f4c38)
- **CI/CD**: Tweaked `.github/workflows/publish.yml` to improve publish reliability and alignment with the 2.0.0 pipeline. (f301041)
- **Configuration**: Updated `Dockerfile` and `eslint.config.js`; refreshed `smithery.yaml` for current tool and publishing settings. (f301041)
- **Build**: Standardized on Bun lockfiles by adding `bun.lock` and updating `package.json` (replacing `package-lock.json`). (26e66a8)
- **Developer Scripts**: Updated `scripts/clean.ts`, `scripts/devdocs.ts`, `scripts/fetch-openapi-spec.ts`, `scripts/make-executable.ts`, and `scripts/tree.ts` for consistency and improved DX. (297fa4e)
- **Observability & Context**: Tightened `RequestContext` propagation and performance logging across utils (`errorHandler`, `logger`, `performance`, `requestContext`) to align with full-stack observability goals.
- **Tools**: Brought existing tool definitions (`echo`, `cat-fact`, `image-test`) and echo resource into compliance with the declarative single-file pattern and handler factory; removed ad-hoc try/catch from tool logic and enforced `McpError` throwing.
- **Tests**: Updated and expanded tests to reflect new patterns across transports, auth, storage providers, metrics, network, parsing, scheduling, and security utilities; refined `vitest.config.ts`.
- **Documentation**: Updated `README.md`, `CLAUDE.md`, and `scripts/README.md`; tidied `changelog/archive1.md`. (18d4cda)

- **Type Safety & Error Handling**: Hardened non-`Error` inputs in `ErrorHandler.getErrorMessage`; added safer JSON-RPC id extraction in `httpErrorHandler`; improved error wrapping and propagation in HTTP transport startup and port checks; standardized string conversions for unknown values across factories/providers.
- **Async Discipline**: Converted trivial async functions to sync where appropriate (echo resource logic, date parser); eliminated floating promises by using `void` in scheduler, transport manager, and developer scripts; ensured interval cleanup invocations are awaited via `void` semantics.
- **Configuration Parsing**: Strengthened `package.json` parsing in the config loader with unknown-typed deserialization and guards for `name`, `version`, and `description`.
- **Tools**: Minor no-op `await Promise.resolve()` in `echo.tool` logic to satisfy linting without affecting purity or behavior.

### Added

- **Formatting**: Introduced `.prettierrc.json` for consistent repository formatting. (f301041)
- **Developer Scripts**: Added `scripts/devcheck.ts` utility for local checks during development. (297fa4e)
- **Documentation**: Added root-level `AGENTS.md` as the single source of truth for agent development mandates; retained `.clinerules/AGENTS.md` as a synced artifact.
- **CI**: Added `.github/workflows/sync-agents-md.yml` to automatically mirror `.clinerules/AGENTS.md` to `AGENTS.md` on push.
- **Husky**: Introduced a `pre-commit` hook to run `bun run devcheck` for local guardrails.

### Fixed

- **Storage**: The Supabase storage provider's `list` method now correctly filters out expired items, ensuring that only active key-value pairs are returned. (77d7ba5)
- **HTTP Transport**: Startup and port check errors are now wrapped and rejected as proper `Error` instances, improving reliability and log fidelity. Also uses `c.header` for security headers to align with Hono best practices.
- **Scheduler**: Start/stop/remove operations no longer create unhandled promise rejections by explicitly using `void` on promise-returning calls.
- **Error Mapping**: Avoids unsafe index access on `ERROR_TYPE_MAPPINGS` and improves fallbacks for unstringifiable errors, ensuring stable error codes and messages.
