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

### Changed

- **Documentation**: Overhauled `README.md` to feature a more modern, scannable design and updated content. Moved the developer mandate to a new `AGENTS.md` file to better align with agent-based development workflows.
- **Code Quality**: Applied formatting and minor code quality improvements across several tool definitions and utilities.

### Removed

- **Legacy Tool Structure**: Deleted all legacy tool files, including the `logic.ts`, `registration.ts`, and `index.ts` files for `echoTool`, `catFactFetcher`, and `imageTest`.
- **Legacy `.clinerules`**: Deleted the now-redundant `.clinerules/clinerules.md` in favor of the new `AGENTS.md`.
- **Obsolete Tests**: Removed all tests related to the legacy tool registration pattern (`tests/mcp-server/tools/`).

### Changed

- **Transport Layer**: Refactored `StatefulTransportManager` and `StatelessTransportManager` to use a new `_processRequestWithBridge` method in the base class, centralizing request handling and stream management.
- **LLM Provider**: Overhauled `OpenRouterProvider` to be more robust, with constructor-based configuration and improved parameter handling.
- **Configuration**: Enhanced the configuration system to include package description and more detailed settings for OAuth and storage providers.
- **Developer Scripts**: Significantly improved the `devdocs.ts` script for better prompt generation and reliability.
- **Logging**: The `Logger` class now uses overloaded methods for high-severity logs (`error`, `crit`, etc.) for more flexible error reporting.
