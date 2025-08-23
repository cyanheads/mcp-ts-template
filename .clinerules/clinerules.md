# mcp-ts-template: Architectural Standard & Developer Mandate

**Effective Date:** 2025-08-23
**Version:** 2.5

## Preamble

This document constitutes the official mandate governing all development practices, architectural patterns, and operational procedures for projects originating from the mcp-ts-template. It is the single source of truth for ensuring code quality, consistency, and long-term maintainability. Adherence to these standards is not optional; it is a condition of all development activity.

## I. Core Architectural Principles

The architecture is founded upon a strict separation of concerns to guarantee modularity, testability, and operational clarity. These principles are non-negotiable.

### 1. The Logic Throws, The Handler Catches

This is the immutable cornerstone of the error-handling and control-flow strategy.

**Core Logic (logic.ts):** This layer's sole responsibility is the execution of business logic. It shall be pure, self-contained, and stateless where possible. It retrieves its operational context via `getRequestContext()` from an async local store. If an operational or validation error occurs, it must terminate its execution by **throwing a structured `McpError`**. Logic files shall not contain `try...catch` blocks for the purpose of formatting a final response.

**Handlers (registration.ts, Transports):** This layer's responsibility is to interface with the transport layer, invoke core logic, and manage the final response lifecycle. It **must** use the centralized utilities (`createToolHandler`, `createResourceHandler`) which contain the `try...catch` logic. This is the exclusive location where errors are caught, processed by the `ErrorHandler`, and formatted into a definitive `CallToolResult` or HTTP response.

### 2. Structured, Traceable Operations

Every operation must be fully traceable from initiation to completion via structured logging and context propagation.

**RequestContext & Async Local Storage:** Any significant operation shall be initiated by creating a `RequestContext` via `requestContextService.createRequestContext()`. This context is then stored in an `AsyncLocalStorage` store, making it implicitly available throughout the entire asynchronous call stack of that operation. Core logic functions retrieve the context via `getRequestContext()`.

**Logger:** All logging shall be performed through the centralized, pre-configured `pino` logger instance and its associated helper functions. The logger automatically enriches every log entry with the active `RequestContext` from async local storage, ensuring complete traceability.

### 3. Comprehensive Observability (OpenTelemetry)

The system shall be fully observable out-of-the-box through integrated, comprehensive OpenTelemetry (OTel) instrumentation.

**Automatic Instrumentation:** The OTel SDK is initialized at the application's entry point (`src/index.ts`) **before any other module is imported**. This ensures that all supported libraries (e.g., HTTP, DNS) are automatically instrumented for distributed tracing.

**Trace-Aware Context:** The `RequestContext` is automatically enriched with the active `traceId` and `spanId` from OTel. This links every log entry directly to a specific trace, enabling seamless correlation between logs, traces, and metrics.

**Error-Trace Correlation:** The central `ErrorHandler` automatically records exceptions on the active OTel span and sets its status to `ERROR`. This ensures that every handled error is visible and searchable within the distributed trace.

**Performance Spans:** The `measureToolExecution` utility creates detailed spans for every tool call, capturing critical performance metrics (duration, success status, error codes) as attributes.

### 4. Application Lifecycle and Execution Flow

This section outlines the complete operational flow of the application.

**A. Server Startup Sequence (Executed Once)**

1.  **Observability Initialization (`src/utils/telemetry/instrumentation.ts`):** The very first import in `src/index.ts` initializes the OTel SDK.
2.  **Entry Point (`src/index.ts`):** The application launches, calls `initializeAndStartServer()`, and establishes global process listeners for graceful shutdown.
3.  **Server Orchestration (`src/mcp-server/server.ts`):** Creates the `McpServer` instance and calls `registerAllTools` and `registerAllResources`.
4.  **Tool Registration (`src/mcp-server/tools/toolName/registration.ts`):** Each tool's registration function is executed. It calls `server.registerTool()`, passing the tool's metadata and the runtime handler function created by the `createToolHandler` utility. The logic is **not** executed at this time.

**B. Tool Execution Sequence (Executed for Each Tool Call)**

1.  **Transport Layer:** The server's transport (HTTP or stdio) receives a request. An OTel span is automatically created.
2.  **Server Core:** The `McpServer` instance parses the request, validates it against the registered input schema, and invokes the corresponding handler function.
3.  **Handler Execution (`src/mcp-server/tools/utils/tool-utils.ts`):** The `createToolHandler` utility function is now executed. It creates a new `RequestContext` for the tool call, wraps the entire operation in `withRequestContext` to populate the async local store, and begins its `try...catch` block.
4.  **Performance Measurement (`performance.ts`):** The handler calls the core logic function wrapped by `measureToolExecution`, which creates a dedicated child OTel span for the tool's execution.
5.  **Logic Execution (`src/mcp-server/tools/toolName/logic.ts`):** The pure business logic runs within its own OTel span. It retrieves the context via `getRequestContext()`. On success, it returns a structured response. On failure, it **throws** an `McpError`.
6.  **Response Handling (Back in `tool-utils.ts`):**
    - **Success Path:** The `try` block completes. The result is passed to a `responseFormatter` to create the final `CallToolResult` object. The OTel span's status is set to `OK`.
    - **Error Path:** The `catch` block is triggered. `ErrorHandler.handleError` is called. It records the exception on the active span, sets the span's status to `ERROR`, logs the error, and formats a standardized error response into a `CallToolResult` with `isError: true`.
7.  **Final Transmission:** The server core sends the formatted `CallToolResult` back to the client via the transport layer. The initial request span is ended.

## II. Tool Development Workflow

This section mandates the workflow for creating and modifying all tools. Deviation is not permitted.

### A. File and Directory Structure

Each tool shall reside in a dedicated directory within `src/mcp-server/tools/`. The structure is fixed:

- **`toolName/`**
  - **`index.ts`**: A barrel file that exports the `register...` function from `registration.ts`.
  - **`logic.ts`**: Contains the tool's core business logic, Zod schemas, and TypeScript types.
  - **`registration.ts`**: Registers the tool with the MCP server using the `createToolHandler` utility.

### B. The Canonical Pattern: echoTool

The `echoTool` is the authoritative implementation and shall be used as the template for all new tool development.

**Step 1: Define Schema and Logic (logic.ts)**
The `logic.ts` file defines the tool's contract (schemas) and its core function. It remains pure, retrieves its context from async local storage, and throws errors when its contract cannot be fulfilled.

```typescript
/**
 * @fileoverview Defines the core logic, schemas, and types for the `echo_message` tool.
 * This module is the single source of truth for the tool's data contracts (Zod schemas)
 * and its pure business logic.
 * @module src/mcp-server/tools/echoTool/logic
 **/

import { z } from "zod";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import { getRequestContext } from "../../../utils/index.js";
import { logger } from "../../../utils/internal/logger.js";

/**
 * Defines the valid formatting modes for the echo tool operation.
 */
export const ECHO_MODES = ["standard", "uppercase", "lowercase"] as const;

/**
 * A constant for the magic string used to trigger a test error.
 * This improves maintainability by avoiding hardcoded strings.
 */
const TEST_ERROR_TRIGGER_MESSAGE = "fail";

/**
 * Zod schema defining the input parameters for the `echo_message` tool.
 * CRITICAL: The descriptions are sent to the LLM and must be clear.
 */
export const EchoToolInputSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(1000, "Message cannot exceed 1000 characters.")
    .describe(
      `The message to echo back. To trigger a test error, provide the exact message '${TEST_ERROR_TRIGGER_MESSAGE}'.`,
    ),
  mode: z
    .enum(ECHO_MODES)
    .optional()
    .default("standard")
    .describe(
      "Specifies how the message should be formatted. Defaults to 'standard'.",
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
      "Whether to include an ISO 8601 timestamp in the response. Defaults to true.",
    ),
});

/**
 * Zod schema for the successful response of the `echo_message` tool.
 */
export const EchoToolResponseSchema = z.object({
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
      "Optional ISO 8601 timestamp of when the response was generated.",
    ),
});

// Inferred TypeScript types
export type EchoToolInput = z.infer<typeof EchoToolInputSchema>;
export type EchoToolResponse = z.infer<typeof EchoToolResponseSchema>;

/**
 * Processes the core logic for the `echo_message` tool.
 * This function is pure; it processes inputs and returns a result or throws an error.
 * It retrieves the request context from AsyncLocalStorage.
 *
 * @param params - The validated input parameters.
 * @returns A promise resolving with the structured response data.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function echoToolLogic(
  params: EchoToolInput,
): Promise<EchoToolResponse> {
  const context = getRequestContext();
  logger.debug(
    { ...context, toolInput: params },
    "Processing echo message logic.",
  );

  // The logic layer MUST throw a structured error on failure.
  if (params.message === TEST_ERROR_TRIGGER_MESSAGE) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Deliberate failure triggered: the message was '${TEST_ERROR_TRIGGER_MESSAGE}'.`,
      { toolName: "echo_message" },
    );
  }

  let formattedMessage = params.message;
  switch (params.mode) {
    case "uppercase":
      formattedMessage = params.message.toUpperCase();
      break;
    case "lowercase":
      formattedMessage = params.message.toLowerCase();
      break;
  }

  const repeatedMessage = Array(params.repeat).fill(formattedMessage).join(" ");

  const response: EchoToolResponse = {
    originalMessage: params.message,
    formattedMessage,
    repeatedMessage,
    mode: params.mode,
    repeatCount: params.repeat,
  };

  if (params.includeTimestamp) {
    response.timestamp = new Date().toISOString();
  }

  logger.debug(
    {
      ...context,
      responseSummary: {
        messageLength: response.repeatedMessage.length,
        timestampGenerated: !!response.timestamp,
      },
    },
    "Echo message processed successfully.",
  );

  return response;
}
```

**Step 2: Register the Tool and Handle All Outcomes (registration.ts)**
The `registration.ts` file acts as the handler. It uses the `createToolHandler` utility to connect the logic to the MCP server, ensuring all error handling and response formatting is centralized and consistent.

```typescript
/**
 * @fileoverview Handles registration and error handling for the `echo_message` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/echoTool/registration
 **/

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { JsonRpcErrorCode } from "../../../types-global/errors.js";
import { ErrorHandler, requestContextService } from "../../../utils/index.js";
import {
  logOperationStart,
  logOperationSuccess,
} from "../../../utils/internal/logging-helpers.js";
import { createToolHandler, ResponseFormatter } from "../utils/tool-utils.js";
import {
  EchoToolInputSchema,
  echoToolLogic,
  EchoToolResponse,
  EchoToolResponseSchema,
} from "./logic.js";

const TOOL_NAME = "echo_message";
const TOOL_DESCRIPTION =
  "Echoes a message back with optional formatting and repetition.";

const responseFormatter: ResponseFormatter<EchoToolResponse> = (result) => ({
  structuredContent: result,
  content: [
    { type: "text", text: `Success: ${JSON.stringify(result, null, 2)}` },
  ],
});

export const registerEchoTool = async (server: McpServer): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({
    operation: "RegisterTool",
    toolName: TOOL_NAME,
  });

  logOperationStart(registrationContext, `Registering tool: '${TOOL_NAME}'`);

  await ErrorHandler.tryCatch(
    async () => {
      server.registerTool(
        TOOL_NAME,
        {
          title: "Echo Message",
          description: TOOL_DESCRIPTION,
          inputSchema: EchoToolInputSchema.shape,
          outputSchema: EchoToolResponseSchema.shape,
          annotations: {
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        createToolHandler(TOOL_NAME, echoToolLogic, responseFormatter),
      );

      logOperationSuccess(
        registrationContext,
        `Tool '${TOOL_NAME}' registered successfully.`,
      );
    },
    {
      operation: `RegisteringTool_${TOOL_NAME}`,
      context: registrationContext,
      errorCode: JsonRpcErrorCode.InitializationFailed,
      critical: true,
    },
  );
};
```

## III. Resource Development Workflow

The workflow for creating Resources mirrors that of Tools, with a focus on data retrieval.

**File Structure:** The structure is identical to that of tools, but located under `src/mcp-server/resources/`.
**Registration:** Registration shall use `server.resource()`. The handler **must** be created using the `createResourceHandler` utility to centralize context creation, error handling, and response formatting.

## IV. External Service Integration

Interaction with any external service shall be encapsulated within a singleton provider class.

**Encapsulation:** Each service provider (e.g., `src/services/llm-providers/openRouterProvider.ts`) is responsible for its own client and configuration.
**Singleton Pattern:** The singleton pattern shall be employed to manage a single, shared instance of a service client (e.g., `src/services/supabase/supabaseClient.ts`).
**Usage:** The singleton instance shall be imported directly into the `logic.ts` file where it is required.

## V. Code Quality and Documentation Mandates

**JSDoc:** Every file shall begin with a `@fileoverview` and `@module` block. All exported functions, types, and classes shall have complete JSDoc comments.

**LLM-Facing Descriptions:** The tool's title, description, and all parameter descriptions defined in Zod schemas (`.describe()`) are transmitted directly to the LLM. These descriptions **must** be written with the LLM as the primary audience: be descriptive, concise, and explicit about any constraints or expected formats.

**Clarity and Intent:** Code shall be self-documenting. Variable and function names must be explicit and unambiguous.

**Immutability:** Functional approaches and immutable data structures are the required standard.

**Formatting:** All code must be formatted using Prettier (`npm run format`) prior to being committed.

## VI. Security Mandates

**Input Sanitization:** All input from any external source shall be treated as untrusted and validated with Zod.

**Secrets Management:** Hardcoding secrets is a direct violation of this standard. All secrets shall be loaded exclusively from environment variables via the `config` module.

**Authentication & Authorization:** The server's authentication mode is configured via `MCP_AUTH_MODE`. Tools requiring specific permissions **must** be protected by checking scopes. The `withRequiredScopes(["scope:read"])` utility **must** be used within the handler layer (`registration.ts`), ideally by wrapping the `createToolHandler` or the logic function it contains.

**Rate Limiting:** Handlers for public-facing or resource-intensive tools shall be protected by the centralized `rateLimiter`.

## VII. Testing Mandates

A `tests/` directory exists at the project root and mirrors the `src/` directory structure. All tests shall be written using Vitest.

**INTEGRATION TESTING FIRST PRINCIPLE:**
Tests shall prioritize **integration testing over mocked unit testing**. The goal is to test real interactions between components and actual MCP protocol flows.

**A. Test Methodology**

1.  **Real Dependencies:** Use actual service instances (e.g., in-memory databases) and real data flows wherever possible.
2.  **Network-Level Mocking:** For external HTTP services, **Mock Service Worker (`msw`) is the mandated tool**. It is configured in `tests/setup.ts` and `tests/mocks/`. `msw` intercepts actual network requests, providing high-fidelity test doubles that validate the entire network stack of the application.
3.  **End-to-End Validation:** Test the complete execution path from tool invocation to final response, including error scenarios.
4.  **Error Flow Testing:** Test actual error conditions by triggering real failure states, not by mocking thrown errors from internal functions.

**B. MCP Transport Integration Testing**

- **HTTP Transport:** Test actual `StreamableHTTPServerTransport` instances with real MCP protocol flows, including session lifecycle, streaming, and error scenarios.
- **Stdio Transport:** Test actual stdio transport functionality with real process communication.

**C. Tool Registration Integration Testing**

- Validate the complete registration → invocation → response cycle through a real `McpServer` instance.
- Test the "Logic Throws, Handler Catches" pattern through actual error scenarios.

**D. Controlled Mocking Guidelines**
When `msw` is not applicable (e.g., for non-HTTP dependencies), mocking must be **surgical and justified**:

- Mock only truly external, uncontrollable dependencies.
- Mocks must accurately simulate real service behavior.
- All mocks must be documented with justification.

**F. Test Architecture Patterns**

**Preferred Pattern - Integration:**

```typescript
describe("Echo Tool Integration", () => {
  let server: McpServer;
  let transport: StreamableHTTPServerTransport;

  beforeEach(async () => {
    server = new McpServer({ name: "test-server", version: "1.0.0" });
    transport = new StreamableHTTPServerTransport({
      /* real config */
    });
    await server.connect(transport);
    // Register actual tools
  });

  it("should execute complete tool flow", async () => {
    // Test real MCP protocol message flow
    const response = await transport.handleRequest(/* real request */);
    // Validate actual response
  });
});
```

**Discouraged Pattern - Heavy Mocking:**

```typescript
// AVOID: This doesn't test real integration
vi.mock("../logic.js", () => ({ echoToolLogic: vi.fn() }));
```

**G. Test File Organization**

- **Integration Tests:** Primary test files (e.g., `tests/mcp-server/tools/toolName/integration.test.ts`)
- **Logic Tests:** Focused tests for complex business logic (e.g., `tests/mcp-server/tools/toolName/logic.test.ts`)
- **Registration Tests:** End-to-end registration and execution tests (e.g., `tests/mcp-server/tools/toolName/registration.test.ts`)

**H. Test Environment Setup**

- **Test Databases:** Use dedicated test instances or in-memory databases
- **Isolated Networking:** Use controlled test endpoints or local test servers
- **Clean State:** Ensure test isolation through proper setup/teardown without relying on mocks

**I. Running Tests**

- Use the following npm scripts to run tests:
  - `npm test`: Run all tests once.
  - `npm test:watch`: Run tests in watch mode for development.
  - `npm test:coverage`: Run all tests and generate a coverage report.

**J. Critical Testing Requirements**

1.  **Read Before Testing:** Always read the file before creating or modifying tests.
2.  **Real Error Conditions:** Test actual error scenarios by creating real failure conditions.
3.  **Protocol Compliance:** All MCP transport tests must validate actual MCP protocol compliance.
4.  **Performance Validation:** Integration tests should validate that real system performance meets requirements.
5.  **Security Testing:** Test actual authentication, authorization, and input validation flows.

This integration-first approach, centered on tools like `msw`, ensures that tests catch real-world issues that pure unit tests with heavy mocking would miss, providing confidence that the system works correctly in production scenarios.
