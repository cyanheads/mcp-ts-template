# 🚀 Source Code Overview

Welcome to the `src` directory, the heart of the MCP TypeScript Template. This document provides a technical deep-dive into the project's architecture, conventions, and development workflow, reflecting the standards mandated in the root `.clinerules`. For a higher-level project overview, please see the [root README.md](../../README.md).

## 🏛️ Core Architectural Principles

This template is built on a set of non-negotiable principles to ensure the codebase is robust, observable, maintainable, and scalable.

### 1. The Logic Throws, The Handler Catches

This is the cornerstone of the error-handling and control-flow strategy, ensuring a clean separation of concerns.

- **Core Logic (`logic.ts` files)**: This layer's sole responsibility is the execution of pure business logic. It retrieves its operational context (e.g., `requestId`) via `getRequestContext()` from an async local store. If an operational or validation error occurs, it **must `throw` a structured `McpError`**. Logic files **must not** contain `try...catch` blocks for the purpose of formatting a final response.
- **Handlers (`registration.ts`, Transports)**: This layer interfaces with the transport layer (e.g., MCP, HTTP), invokes core logic, and manages the final response lifecycle. It uses centralized utilities (`createToolHandler`, `createResourceHandler`) that contain the `try...catch` logic. This is the exclusive location where errors are caught, processed by the `ErrorHandler`, and formatted into a definitive response.

### 2. Structured, Traceable Operations

Every operation must be fully traceable from initiation to completion via structured logging and context propagation.

- **`RequestContext` & Async Local Storage**: Any significant operation is initiated by creating a `RequestContext` via `requestContextService.createRequestContext()`. This context is then stored in an `AsyncLocalStorage` store, making it implicitly available throughout the entire asynchronous call stack of that operation. Core logic functions retrieve the context via `getRequestContext()`.
- **`Logger`**: All logging is performed through the centralized, pre-configured `pino` logger instance. The logger automatically enriches every log entry with the active `RequestContext` from async local storage, ensuring complete traceability.

### 3. Comprehensive Observability (OpenTelemetry)

The system is fully observable out-of-the-box through integrated, comprehensive OpenTelemetry (OTel) instrumentation.

- **Automatic Instrumentation**: The OTel SDK is initialized at the application's entry point (`src/index.ts`) **before any other module is imported**, ensuring all supported libraries are automatically instrumented for distributed tracing.
- **Trace-Aware Context**: The `RequestContext` is automatically enriched with the active `traceId` and `spanId` from OTel, linking every log entry directly to a specific trace.
- **Performance Spans**: The `measureToolExecution` utility creates detailed spans for every tool call, capturing critical performance metrics like duration and success status.

## 🌊 Application Lifecycle and Execution Flow

Understanding this sequence is critical for contextualizing the role of each component.

1.  **Server Startup**:
    1.  **Observability Init (`instrumentation.ts`)**: The OTel SDK is initialized first.
    2.  **Entry Point (`index.ts`)**: The application launches, calling `initializeAndStartServer()`.
    3.  **Server Orchestration (`server.ts`)**: Creates the `McpServer` instance and calls `registerAllTools` and `registerAllResources`.
    4.  **Tool Registration (`registration.ts`)**: Each tool's `register...` function is called, which uses `createToolHandler` to prepare the runtime handler function and registers it with the server. The logic is **not** executed at this time.

2.  **Tool Execution**:
    1.  **Transport Layer**: The server's transport (HTTP or stdio) receives a request. An OTel span is automatically created.
    2.  **Handler Execution (`tool-utils.ts`)**: The `createToolHandler` function is now executed. It creates a new `RequestContext`, wraps the operation in `withRequestContext`, and starts a `try...catch` block.
    3.  **Performance Measurement (`performance.ts`)**: It calls the core logic function wrapped by `measureToolExecution`, which creates a dedicated child span for the tool's execution.
    4.  **Logic Execution (`logic.ts`)**: The pure business logic runs. On success, it returns a result. On failure, it **throws** an `McpError`.
    5.  **Response Handling (Back in `tool-utils.ts`)**:
        - **Success**: The result is formatted into a `CallToolResult`. The OTel span is marked as `OK`.
        - **Error**: The `catch` block is triggered. `ErrorHandler.handleError` is called, which records the exception on the OTel span, sets its status to `ERROR`, logs the error, and formats a standardized error response.

## 📁 Directory Structure

- **`config/`**: Handles loading and validation of all application configuration from environment variables using Zod for type safety.
- **`mcp-server/`**: The core of the MCP server. **This is where you will add your custom functionality.**
  - `tools/`: Contains individual tool implementations. Each tool has its own directory with `logic.ts` (business logic, Zod schema) and `registration.ts` (handler logic, server registration).
  - `resources/`: Contains resource implementations, following the same structure as tools.
  - `transports/`: Manages the server-side communication protocols (`stdio`, `http`). The `http` transport is a robust implementation using Hono, supporting middleware for authentication, rate limiting, and stateful/stateless session management.
- **`services/`**: Reusable modules for integrating with external services.
  - `duck-db/`: An in-process analytical database service.
  - `llm-providers/`: An OpenRouter client for interacting with various LLMs.
  - `supabase/`: A singleton client for Supabase.
- **`storage/`**: Contains example usage scripts for the modules in `src/services/`.
- **`types-global/`**: Defines globally-used types, most notably the structured `McpError` and `JsonRpcErrorCode` enum in `errors.ts`.
- **`utils/`**: A collection of robust, production-ready utilities.
  - `internal/`: Core utilities: `logger`, `errorHandler`, `requestContext`, `asyncContext`, and `performance`.
  - `metrics/`: Utilities for metrics, like `tokenCounter`.
  - `network/`: Network-related helpers, like `fetchWithTimeout`.
  - `parsing/`: Utilities for parsing data, such as `dateParser` and `jsonParser`.
  - `security/`: Security-focused utilities, including `idGenerator`, `rateLimiter`, and `sanitization`.
  - `telemetry/`: OpenTelemetry instrumentation and semantic conventions.
- **`index.ts`**: The main application entry point. It initializes OpenTelemetry, orchestrates the server startup, and handles graceful shutdown.

## 🛠️ Development Workflow: Adding a New Tool

Extending the server follows a consistent pattern. The `echoTool` serves as the canonical example.

1.  **Create the Directory**: Add a new directory in `src/mcp-server/tools/yourToolName/`.

2.  **Define the Logic (`logic.ts`)**:
    - Define a Zod schema for the tool's input parameters. **Crucially, use `.describe()` on each field** to provide clear metadata for the LLM.
    - Export the inferred TypeScript types for the input and the successful response payload.
    - Write the core `async function yourToolLogic(params)` function. It must:
      - Retrieve the context via `getRequestContext()`.
      - Perform its business logic.
      - `throw new McpError(...)` on failure.
      - Return a structured data object on success.

3.  **Register the Handler (`registration.ts`)**:
    - Create a `registerYourTool` function.
    - Define a `responseFormatter` function that transforms the successful output from your logic into the final `CallToolResult` structure.
    - Call `server.registerTool()` with the tool's metadata (name, description, schemas).
    - For the handler parameter, use the `createToolHandler` utility, passing it the `TOOL_NAME`, your `logic` function, and the `responseFormatter`. This utility automatically wires up context creation, performance measurement (`measureToolExecution`), and error handling.

4.  **Integrate (`tools/index.ts`)**:
    - Import your new registration function into `src/mcp-server/tools/index.ts`.
    - Add it to the `Promise.all` array within the `registerAllTools` function.

This workflow ensures that every new tool automatically benefits from the template's robust architecture, including structured logging, error handling, and performance tracing.
