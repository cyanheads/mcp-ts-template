# mcp-ts-template: Architectural Standard & Developer Mandate

**Effective Date:** 2025-08-31
**Version:** 2.0.0 (Synced to Project Version)

## Preamble

This document constitutes the official mandate governing all development practices, architectural patterns, and operational procedures for projects originating from the mcp-ts-template. It is the single source of truth for ensuring code quality, consistency, and long-term maintainability. Adherence to these standards is not optional; it is a condition of all development activity.

## I. Core Architectural Principles

The architecture is founded upon a strict separation of concerns to guarantee modularity, testability, and operational clarity. These principles are non-negotiable.

### 1. The Logic Throws, The Handler Catches

This is the immutable cornerstone of the error-handling and control-flow strategy.

**Core Logic (within Tool Definition):** A tool's core logic is a pure, self-contained, and stateless function defined within its `ToolDefinition` object. If an operational or validation error occurs, it must terminate its execution by throwing a structured `McpError`. Logic functions shall not contain `try...catch` blocks for the purpose of formatting a final response.

**Handler (Generated via `toolHandlerFactory`):** The runtime handler for every tool is created by the `toolHandlerFactory`. This factory wraps the core logic function, and its responsibilities are to interface with the server, manage the `try...catch` block, and format the final `CallToolResult`. This is the exclusive location where errors are caught, processed by the `ErrorHandler`, and formatted into a definitive response.

### 2. Structured, Traceable Operations

Every operation must be fully traceable from initiation to completion via structured logging and context propagation.

**RequestContext:** Any significant operation shall be initiated by creating a `RequestContext` via `requestContextService.createRequestContext()`. This context, containing a unique `requestId`, must be passed as an argument through the entire call stack of the operation.

**Logger:** All logging shall be performed through the centralized logger singleton, which includes rate-limiting capabilities. Every log entry must include the `RequestContext` to ensure traceability.

### 3. Comprehensive Observability (OpenTelemetry)

The system shall be fully observable out-of-the-box through integrated, comprehensive OpenTelemetry (OTel) instrumentation.

**Automatic Instrumentation:** The OTel SDK is initialized at the application's entry point (`src/index.ts`) **before any other module is imported**. This ensures that all supported libraries (e.g., HTTP, DNS) are automatically instrumented for distributed tracing.

**Trace-Aware Context:** The `RequestContext` is automatically enriched with the active `traceId` and `spanId` from OTel. This links every log entry directly to a specific trace, enabling seamless correlation between logs, traces, and metrics.

**Error-Trace Correlation:** The central `ErrorHandler` automatically records exceptions on the active OTel span and sets its status to `ERROR`. This ensures that every handled error is visible and searchable within the distributed trace, providing a complete picture of the failure.

**Performance Spans:** The `measureToolExecution` utility creates detailed spans for every tool call, capturing critical performance metrics (duration, success status, error codes) as attributes. This provides granular insight into the performance of individual tools.

### 4. Decoupled, Provider-Based Storage

To ensure flexibility and testability, all persistent state is managed through a generic storage service that abstracts the underlying backend.

**Storage Service (`src/storage/core/StorageService.ts`):** A singleton service that acts as the single point of entry for all storage operations. It implements the `IStorageProvider` interface.

**Storage Provider (`src/storage/core/IStorageProvider.ts`):** A strict interface defining the contract for all storage backends (e.g., `get`, `set`, `delete`, `list`).

**Storage Factory (`src/storage/core/storageFactory.ts`):** A factory function that reads the application's configuration and dynamically instantiates the appropriate storage provider (e.g., `InMemoryProvider`, `FileSystemProvider`, `SupabaseProvider`).

### 5. Application Lifecycle and Execution Flow

This section outlines the complete operational flow of the application, from initial startup to the execution of a tool's core logic. Understanding this sequence is critical for contextualizing the role of each component.

**A. Server Startup Sequence (Executed Once)**

1.  **Observability Initialization (`src/utils/telemetry/instrumentation.ts`):** The very first import in `src/index.ts` is the OpenTelemetry instrumentation module.
2.  **Entry Point (`src/index.ts`):** The application is launched. It initializes the logger, storage service, and then calls `initializeAndStartServer()`.
3.  **Server Orchestration (`src/mcp-server/server.ts`):** This script creates the `McpServer` instance. Crucially, it imports all tool definitions (e.g., `echoTool`) from `src/mcp-server/tools/definitions/` and iterates through them, calling a type-safe `registerTool` helper for each one. This is the single point where all components are attached to the server.
4.  **Tool Registration (`src/mcp-server/server.ts`):** During startup, the `registerTool` helper function is executed for each tool definition.
    - It creates a runtime handler for the tool using `createMcpToolHandler`.
    - It calls `server.registerTool()`, passing the tool's metadata (name, description, schemas) and the newly created handler function.
    - The `ErrorHandler.tryCatch` wrapper ensures that any failure during this registration step is caught, preventing a server startup failure.

**B. Tool Execution Sequence (Executed for Each Tool Call)**

1.  **Transport Layer:** The server's transport (e.g., HTTP or stdio) receives an incoming tool call request. An OTel span is automatically created.
2.  **Server Core:** The `McpServer` instance parses the request, validates it against the registered input schema, and invokes the corresponding factory-generated handler function.
3.  **Handler Execution (via `createMcpToolHandler`):** The runtime handler is now executed.
    - It creates a `RequestContext`.
    - It wraps the logic call in `measureToolExecution` to create a dedicated child span.
    - The `try...catch` block begins. It invokes the tool's core logic function.
4.  **Logic Execution (from `tool-name.tool.ts`):** The core logic function runs within its own OTel span.
    - It performs its pure business logic.
    - On success, it returns a structured response. The span's status is set to `OK`.
    - On failure, it **throws** a structured `McpError`.
5.  **Response Handling (within `createMcpToolHandler`):**
    - **Success Path:** The `try` block completes. The result is formatted into a final `CallToolResult` (using a custom formatter if provided, or a default JSON stringifier) and returned.
    - **Error Path:** The `catch` block is triggered. `ErrorHandler.handleError` is called. It records the exception, logs the error, and formats a standardized error response.
6.  **Final Transmission:** The server core sends the formatted response back to the client.

## II. Tool Development Workflow

This section mandates the workflow for creating and modifying all tools. Deviation is not permitted. The new architecture uses a declarative, single-file pattern for tool definitions.

### A. File and Directory Structure

Each tool is defined in a single, self-contained file within `src/mcp-server/tools/definitions/`. The supporting utilities are in `src/mcp-server/tools/utils/`.

- **`src/mcp-server/tools/`**
  - **`definitions/`**
    - **`my-tool.tool.ts`**: The complete definition for a new tool.
  - **`utils/`**
    - **`toolDefinition.ts`**: Defines the `ToolDefinition<TInput, TOutput>` interface.
    - **`toolHandlerFactory.ts`**: The factory that creates runtime handlers from a `ToolDefinition`.

### B. The Canonical Pattern: `echo.tool.ts`

The `echo.tool.ts` file is the authoritative implementation and shall be used as the template for all new tool development. It defines the tool's entire contract—schemas, logic, and metadata—in one place.

```typescript
/**
 * @fileoverview The complete definition for the 'echo_message' tool.
 * This file encapsulates the tool's schema, logic, and metadata,
 * making it a self-contained and modular component.
 * @module src/mcp-server/tools/definitions/echo.tool
 */

import { z } from "zod";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, RequestContext } from "../../../utils/index.js";
import { ToolDefinition } from "../utils/toolDefinition.js";

// Schemas and Logic
const ECHO_MODES = ["standard", "uppercase", "lowercase"] as const;
const TEST_ERROR_TRIGGER_MESSAGE = "fail";

const InputSchema = z.object({
  message: z
    .string()
    .min(1)
    .max(1000)
    .describe(
      `The message to echo back. To trigger a test error, provide the exact message '${TEST_ERROR_TRIGGER_MESSAGE}'.`
    ),
  mode: z
    .enum(ECHO_MODES)
    .optional()
    .default("standard")
    .describe(
      "Specifies how the message should be formatted. Defaults to 'standard'."
    ),
  repeat: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .default(1)
    .describe("The number of times to repeat the message. Defaults to 1."),
  includeTimestamp: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Whether to include an ISO 8601 timestamp in the response. Defaults to true."
    ),
});

const OutputSchema = z.object({
  originalMessage: z
    .string()
    .describe("The original message provided in the input."),
  formattedMessage: z
    .string()
    .describe("The message after applying the specified formatting mode."),
  repeatedMessage: z
    .string()
    .describe("The formatted message repeated the specified number of times."),
  mode: z.enum(ECHO_MODES).describe("The formatting mode that was applied."),
  repeatCount: z
    .number()
    .int()
    .min(1)
    .describe("The number of times the message was repeated."),
  timestamp: z
    .string()
    .datetime()
    .optional()
    .describe(
      "Optional ISO 8601 timestamp of when the response was generated."
    ),
});

type EchoToolInput = z.infer<typeof InputSchema>;
type EchoToolResponse = z.infer<typeof OutputSchema>;

async function echoToolLogic(
  input: EchoToolInput,
  context: RequestContext
): Promise<EchoToolResponse> {
  logger.debug("Processing echo message logic.", {
    ...context,
    toolInput: input,
  });
  if (input.message === TEST_ERROR_TRIGGER_MESSAGE) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Deliberate failure triggered.`
    );
  }
  let formattedMessage = input.message;
  if (input.mode === "uppercase")
    formattedMessage = input.message.toUpperCase();
  if (input.mode === "lowercase")
    formattedMessage = input.message.toLowerCase();
  const repeatedMessage = Array(input.repeat).fill(formattedMessage).join(" ");
  const response: EchoToolResponse = {
    originalMessage: input.message,
    formattedMessage,
    repeatedMessage,
    mode: input.mode,
    repeatCount: input.repeat,
  };
  if (input.includeTimestamp) {
    response.timestamp = new Date().toISOString();
  }
  return response;
}

// The Tool Definition
export const echoTool: ToolDefinition<typeof InputSchema, typeof OutputSchema> =
  {
    name: "echo_message",
    description:
      "Echoes a message back with optional formatting and repetition.",
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      title: "Echo Message",
    },
    logic: echoToolLogic,
  };
```

## III. Resource Development Workflow

The workflow for creating Resources remains unchanged, with a focus on data retrieval using a `registration.ts` and `logic.ts` file structure.

**File Structure:** The structure is located under `src/mcp-server/resources/`.

**Registration:** Registration shall use `server.resource(registrationName, template, metadata, handler)`. The handler receives URI parameters and must return an object conforming to the `{ contents: [{ uri, blob, mimeType }] }` structure.

## IV. External Service Integration

Interaction with any external service shall be encapsulated within a singleton provider class.

**Usage:** The singleton instance shall be imported directly into the tool's definition file (e.g., `my-tool.tool.ts`) and used within the `logic` function.

## V. Code Quality and Documentation Mandates

**JSDoc:** Every file shall begin with a `@fileoverview` and `@module` block. All exported functions, types, and classes shall have complete JSDoc comments.

**LLM-Facing Descriptions:** The tool's `description`, and all parameter descriptions in Zod schemas (`.describe()`), are transmitted directly to the LLM. They must be descriptive, concise, and explicit.

**Clarity and Intent:** Code shall be self-documenting. Variable and function names must be explicit and unambiguous.

**Immutability:** Functional approaches and immutable data structures are the required standard.

**Formatting:** All code must be formatted using Prettier (`npm run format`) prior to being committed.

## VI. Security Mandates

**Input Sanitization:** All input from any external source is validated with Zod by the MCP Server core before the handler is called.
**Secrets Management:** All secrets shall be loaded exclusively from environment variables via the config module.
**Authentication & Authorization:** The server's authentication mode is configured via the `MCP_AUTH_MODE` environment variable.

## VII. Testing Mandates

A `tests/` directory exists at the project root and mirrors the `src/` directory structure. All tests shall be written using Vitest. The **INTEGRATION TESTING FIRST PRINCIPLE** remains in effect. Tests must validate the complete flow from input to output, including real dependencies where feasible.
