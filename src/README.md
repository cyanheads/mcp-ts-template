# 🚀 Source Code Overview

Welcome to the `src` directory, the heart of the MCP TypeScript Template. This document provides a technical deep-dive into the project's architecture, conventions, and development workflow. For a higher-level project overview, please see the [root README.md](../../README.md).

## 🏛️ Core Architectural Principles

This template is built on a set of core principles to ensure the codebase is robust, maintainable, and scalable. Adherence to these principles is crucial when extending the server.

### 1. Logic Throws, Handlers Catch

This is the cornerstone of our error-handling strategy, ensuring a clean separation of concerns.

- **Core Logic (`logic.ts` files)**: This layer is responsible for business logic only. It should be pure and self-contained. If an error occurs (e.g., failed validation, API error), it **must `throw` a structured `McpError`**. Logic files **must not** contain `try...catch` blocks for formatting final responses.
- **Handlers (`registration.ts`, Transports)**: This layer is responsible for invoking core logic and managing communication protocols (MCP, HTTP). It **must** wrap all calls to the logic layer in a `try...catch` block. This is the only place where errors are caught, processed by the `ErrorHandler`, and formatted into a final response for the client.

### 2. Structured, Traceable Operations

Every significant operation must be traceable from start to finish through structured logging and context propagation.

- **`RequestContext`**: Every operation begins by creating a `RequestContext` using `requestContextService.createRequestContext()`. This context, containing a unique `requestId`, must be passed down through all subsequent function calls.
- **`Logger`**: All logging must be done through the centralized `logger` singleton, and every log call must include the current `RequestContext`. This provides correlated, traceable logs that are invaluable for debugging.

## 📁 Directory Structure

The `src` directory is organized by function to maintain a clear separation of concerns.

- **`config/`**: Handles the loading and validation of all application configuration from environment variables and `package.json`. It uses Zod for schema validation to ensure type safety.

- **`mcp-client/`**: Contains the full implementation of an MCP client, capable of connecting to and interacting with external MCP servers. This client is designed to be reusable and can be integrated into other applications or services.
  - `client-config/`: Manages the `mcp-config.json` file, which defines the servers the client can connect to.
  - `core/`: Core client logic for connection management, caching, and session handling.
  - `transports/`: Implements the transport layers (`stdio`, `http`) for communicating with servers.

- **`mcp-server/`**: The core of the MCP server provided by this template. **This is where you will add your custom functionality.**
  - `tools/`: Contains individual tool implementations. Each tool has its own directory with `logic.ts` (business logic, Zod schema) and `registration.ts` (handler logic, server registration).
  - `resources/`: Contains resource implementations, following the same structure as tools.
  - `transports/`: Manages the server-side communication protocols (`stdio`, `http`), including authentication middleware for the HTTP transport.

- **`services/`**: Reusable modules for integrating with external services. This template includes examples for:
  - `duck-db/`: An in-process analytical database.
  - `llm-providers/`: An OpenRouter client for interacting with various LLMs.
  - `supabase/`: A singleton client for Supabase.

- **`storage/`**: Contains example usage scripts for the modules in `src/services/`, such as `duckdbExample.ts`.

- **`types-global/`**: Defines globally-used TypeScript types and interfaces, most notably the structured `McpError` and `BaseErrorCode` enum in `errors.ts`.

- **`utils/`**: A collection of robust, production-ready utilities.
  - `internal/`: Core internal utilities: `logger`, `errorHandler`, and `requestContext`.
  - `metrics/`: Utilities for metrics, like `tokenCounter`.
  - `network/`: Network-related helpers, like `fetchWithTimeout`.
  - `parsing/`: Utilities for parsing data, such as `dateParser` and `jsonParser`.
  - `security/`: Security-focused utilities, including `idGenerator`, `rateLimiter`, and `sanitization`.

- **`index.ts`**: The main entry point for the application. It initializes the logger, orchestrates the server startup, and wires up the chosen transport.

## 🛠️ Development Workflow

Extending the server with a new tool or resource follows a consistent pattern that aligns with our core principles.

1.  **Create the Directory**: Add a new directory for your tool in `src/mcp-server/tools/yourToolName/`.
2.  **Define the Logic (`logic.ts`)**:
    - Define a Zod schema for the tool's input parameters. Use `.describe()` to add metadata for the LLM.
    - Export the inferred TypeScript types for the input and the response payload.
    - Write the core `async function yourToolLogic(params, context)` that performs the business logic. This function should `throw McpError` on failure and return a structured data object on success.
3.  **Register the Handler (`registration.ts`)**:
    - Create a registration function (e.g., `registerYourTool`).
    - Inside, call `server.tool()` with the tool's name, description, and Zod schema shape.
    - The handler function for `server.tool()` will:
      - Create a `RequestContext`.
      - Wrap the call to your `logic` function in a `try...catch` block.
      - On success, format the result into a `CallToolResult`.
      - On error, use `ErrorHandler.handleError` to process the exception and format an error `CallToolResult`.
4.  **Integrate (`server.ts`)**:
    - Import your new registration function into `src/mcp-server/server.ts`.
    - Call it within the `createMcpServerInstance` function to make it part of the server.

For a more detailed guide and examples, refer to the [Server Extension Guide](./mcp-server/README.md).
