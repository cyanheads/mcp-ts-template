# mcp-ts-template: Architectural Standard & Developer Mandate

**Effective Date:** 2025-07-31
**Version:** 2.2

## Preamble

This document constitutes the official mandate governing all development practices, architectural patterns, and operational procedures for projects originating from the mcp-ts-template. It is the single source of truth for ensuring code quality, consistency, and long-term maintainability. Adherence to these standards is not optional; it is a condition of all development activity.

## I. Core Architectural Principles

The architecture is founded upon a strict separation of concerns to guarantee modularity, testability, and operational clarity. These principles are non-negotiable.

### 1. The Logic Throws, The Handler Catches

This is the immutable cornerstone of the error-handling and control-flow strategy.

**Core Logic (logic.ts):** This layer's sole responsibility is the execution of business logic. It shall be pure, self-contained, and stateless where possible. If an operational or validation error occurs, it must terminate its execution by throwing a structured McpError. Logic files shall not contain try...catch blocks for the purpose of formatting a final response.

**Handlers (registration.ts, Transports):** This layer's responsibility is to interface with the transport layer (e.g., MCP, HTTP), invoke core logic, and manage the final response lifecycle. It must wrap every call to the logic layer in a try...catch block. This is the exclusive location where errors are caught, processed by the ErrorHandler, and formatted into a definitive CallToolResult or HTTP response.

### 2. Structured, Traceable Operations

Every operation must be fully traceable from initiation to completion via structured logging and context propagation.

**RequestContext:** Any significant operation shall be initiated by creating a RequestContext via requestContextService.createRequestContext(). This context, containing a unique requestId, must be passed as an argument through the entire call stack of the operation.

**Logger:** All logging shall be performed through the centralized logger singleton. Every log entry must include the RequestContext to ensure traceability.

### 3. Application Lifecycle and Execution Flow

This section outlines the complete operational flow of the application, from initial startup to the execution of a tool's core logic. Understanding this sequence is critical for contextualizing the role of each component.

**A. Server Startup Sequence (Executed Once)**

1.  **Entry Point (`src/index.ts`):** The application is launched. This script performs the first-level setup:
    - Initializes the `logger` with the configured log level.
    - Calls `initializeAndStartServer()` from `server.ts`.
    - Establishes global process listeners (`uncaughtException`, `SIGTERM`) to ensure graceful shutdown.

2.  **Server Orchestration (`src/mcp-server/server.ts`):** This script orchestrates the creation and configuration of the MCP server itself.
    - Creates the core `McpServer` instance from the SDK.
    - **Crucially, it imports and calls the `register...` function from every tool and resource** (e.g., `await registerEchoTool(server)`). This is the single point where all components are attached to the server.

3.  **Tool Registration (`src/mcp-server/tools/toolName/registration.ts`):** During startup, the `registerEchoTool` function is executed.
    - It calls `server.registerTool()`, passing the tool's metadata (name, description, schemas) and the **runtime handler function**.
    - The `ErrorHandler.tryCatch` wrapper ensures that any failure during this registration step is caught, preventing a server startup failure. The handler function itself is **not** executed at this time; it is merely registered.

**B. Tool Execution Sequence (Executed for Each Tool Call)**

1.  **Transport Layer:** The server's transport (e.g., HTTP or stdio) receives an incoming tool call request from an MCP client.

2.  **Server Core:** The `McpServer` instance parses the request, validates it against the registered input schema for the requested tool (e.g., `echo_message`), and invokes the corresponding handler function that was provided during registration.

3.  **Handler Execution (`src/mcp-server/tools/toolName/registration.ts`):** The runtime handler function is now executed.
    - It creates a new, child `RequestContext` to trace this specific call.
    - The `try...catch` block begins.
    - It calls the core logic function (e.g., `echoToolLogic()`), passing the validated parameters and the new context.

4.  **Logic Execution (`src/mcp-server/tools/toolName/logic.ts`):** The `echoToolLogic` function runs.
    - It performs its pure business logic.
    - On success, it returns a structured response object.
    - On failure, it **throws** a structured `McpError`.

5.  **Response Handling (Back in `registration.ts`):**
    - **Success Path:** The `try` block completes. The result from the logic function is formatted into a final `CallToolResult` object and returned to the server core.
    - **Error Path:** The `catch` block is triggered. `ErrorHandler.handleError` is called to log the error and format it into a standardized error response, which is then returned to the server core.

6.  **Final Transmission:** The server core sends the formatted success or error response back to the client via the transport layer.

## II. Tool Development Workflow

This section mandates the workflow for creating and modifying all tools. Deviation is not permitted.

### A. File and Directory Structure

Each tool shall reside in a dedicated directory within src/mcp-server/tools/. The structure is fixed as follows:

- **`toolName/`**
  - **`index.ts`**: A barrel file that performs a single function: exporting the register... function from registration.ts. No other logic shall exist in this file.
  - **`logic.ts`**: Contains the tool's core business logic. It must define and export the tool's Zod input schema, all inferred TypeScript types (input and output), and the primary logic function.
  - **`registration.ts`**: Registers the tool with the MCP server. It imports from logic.ts and strictly implements the "Handler" role as defined in the core principles.

### B. The Canonical Pattern: echoTool

The echoTool is the authoritative implementation and shall be used as the template for all new tool development.

**Step 1: Define Schema and Logic (logic.ts)**
The `logic.ts` file defines the tool's contract (schemas) and its core function. It remains pure and throws errors when its contract cannot be fulfilled. The JSDoc header includes a `@see` link for easy navigation to the corresponding handler file.

```typescript
/**
 * @fileoverview Defines the core logic, schemas, and types for the `echo_message` tool.
 * This module is the single source of truth for the tool's data contracts (Zod schemas)
 * and its pure business logic.
 * @module src/mcp-server/tools/echoTool/logic
 * @see {@link src/mcp-server/tools/echoTool/registration.ts} for the handler and registration logic.
 */

import { z } from "zod";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, type RequestContext } from "../../../utils/index.js";

// Defines the valid formatting modes for the echo tool operation.
export const ECHO_MODES = ["standard", "uppercase", "lowercase"] as const;

// Zod schema defining the input parameters for the `echo_message` tool.
// CRITICAL: The descriptions are sent to the LLM and must be clear.
export const EchoToolInputSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(1000, "Message cannot exceed 1000 characters.")
    .describe(
      "The message to echo back. To trigger a test error, provide the exact message 'fail'.",
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

// Zod schema for the successful response of the `echo_message` tool.
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
 *
 * @param params - The validated input parameters.
 * @param context - The request context for logging and tracing.
 * @returns A promise resolving with the structured response data.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function echoToolLogic(
  params: EchoToolInput,
  context: RequestContext,
): Promise<EchoToolResponse> {
  logger.debug("Processing echo message logic.", {
    ...context,
    toolInput: params,
  });

  // The logic layer MUST throw a structured error on failure.
  if (params.message === "fail") {
    throw new McpError(
      BaseErrorCode.VALIDATION_ERROR,
      "Deliberate failure triggered: the message was 'fail'.",
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

  logger.debug("Echo message processed successfully.", {
    ...context,
    responseSummary: {
      messageLength: response.repeatedMessage.length,
      timestampGenerated: !!response.timestamp,
    },
  });

  return response;
}
```

````

**Step 2: Register the Tool and Handle All Outcomes (registration.ts)**
The `registration.ts` file acts as the handler. It connects the logic to the MCP server, wraps the registration in a top-level error handler, and wraps each tool invocation in another error handler. This ensures maximum stability.

```typescript
/**
 * @fileoverview Handles registration and error handling for the `echo_message` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/echoTool/registration
 * @see {@link src/mcp-server/tools/echoTool/logic.ts} for the core business logic and schemas.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  requestContextService
} from "../../../utils/index.js";
import {
  EchoToolInput,
  EchoToolInputSchema,
  echoToolLogic,
  EchoToolResponseSchema,
} from "./logic.js";

// The unique name for the tool, used for registration and identification.
const TOOL_NAME = "echo_message";

// A concise description for the LLM. More detailed guidance should be in the
// parameter descriptions within the Zod schema in `logic.ts`.
const TOOL_DESCRIPTION = `Echoes a message back with optional formatting and repetition.`;

/**
 * Registers the 'echo_message' tool and its handler with the provided MCP server instance.
 * This function uses ErrorHandler.tryCatch to ensure that any failure during the
 * registration process itself is caught and logged, preventing server startup failures.
 *
 * @param server - The MCP server instance to register the tool with.
 */
export const registerEchoTool = async (server: McpServer): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({
    operation: "RegisterTool",
    toolName: TOOL_NAME,
  });

  logger.info(`Registering tool: '${TOOL_NAME}'`, registrationContext);

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
            readOnlyHint: true, // This tool does not modify state.
            openWorldHint: false, // This tool does not interact with external, unpredictable systems.
          },
        },
        // This is the runtime handler for the tool.
        async (params: EchoToolInput, callContext: Record<string, unknown>) => {
          const handlerContext = requestContextService.createRequestContext({
            parentContext: callContext,
            operation: "HandleToolRequest",
            toolName: TOOL_NAME,
            input: params,
          });

          try {
            // 1. INVOKE the core logic within the try block.
            const result = await echoToolLogic(params, handlerContext);

            // 2. FORMAT the SUCCESS response.
            return {
              structuredContent: result,
              content: [
                { type: "text", text: `Success: ${JSON.stringify(result, null, 2)}` },
              ],
            };
          } catch (error) {
            // 3. CATCH and PROCESS any error from the logic layer.
            const mcpError = ErrorHandler.handleError(error, {
              operation: `tool:${TOOL_NAME}`,
              context: handlerContext,
              input: params,
            }) as McpError;

            // 4. FORMAT the ERROR response.
            return {
              isError: true,
              content: [{ type: "text", text: `Error: ${mcpError.message}` }],
              structuredContent: {
                code: mcpError.code,
                message: mcpError.message,
                details: mcpError.details,
              },
            };
          }
        },
      );

      logger.info(
        `Tool '${TOOL_NAME}' registered successfully.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringTool_${TOOL_NAME}`,
      context: registrationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
      critical: true, // A failure to register a tool is a critical startup error.
    },
  );
};
```

## III. Resource Development Workflow

The workflow for creating Resources mirrors that of Tools, with a focus on data retrieval.

**File Structure:** The structure is identical to that of tools, but located under src/mcp-server/resources/.

**Registration:** Registration shall use server.resource(registrationName, template, metadata, handler). The handler receives URI parameters and must return an object conforming to the { contents: [{ uri, blob, mimeType }] } structure.

## IV. External Service Integration

Interaction with any external service (e.g., database, third-party API) shall be encapsulated within a singleton provider class.

**Encapsulation:** Each service provider (e.g., src/services/llm-providers/openRouterProvider.ts) is responsible for its own client, configuration, and API-specific logic.

**Singleton Pattern:** The singleton pattern shall be employed to manage a single, shared instance of a service client across the application (e.g., src/services/supabase/supabaseClient.ts).

**Usage:** The singleton instance shall be imported directly into the logic.ts file where it is required.

## V. Code Quality and Documentation Mandates

**JSDoc:** Every file shall begin with a @fileoverview and @module block. All exported functions, types, and classes shall have complete JSDoc comments.

**LLM-Facing Descriptions:** The tool's title, description, and all parameter descriptions defined in Zod schemas (.describe()) are transmitted directly to the LLM to inform its tool-use decisions. These descriptions must be written with the LLM as the primary audience. They must be descriptive, concise, and explicitly state any requirements, constraints, or expected formats outside of the Zod shape itself. This is a primary interface for prompting the model and is critical for correct tool invocation.

**Clarity and Intent:** Code shall be self-documenting. Variable and function names must be explicit and unambiguous. Brevity is secondary to clarity.

**Immutability:** Functional approaches and immutable data structures are the required standard to prevent side effects. State mutation must be justified and localized.

**Formatting:** All code must be formatted using Prettier (npm run format) prior to being committed. This will be enforced by CI.

## VI. Security Mandates

**Input Sanitization:** All input from any external source (tool arguments, API responses) shall be treated as untrusted and validated with Zod. Use sanitization utilities for explicit sanitization where Zod parsing is insufficient.

**Secrets Management:** Hardcoding secrets is a direct violation of this standard. All secrets (API keys, credentials) shall be loaded exclusively from environment variables via the config module.

**Authentication & Authorization:**
The server's authentication mode is configured via the MCP_AUTH_MODE environment variable.
Tools requiring specific permissions shall be protected by checking scopes. The withRequiredScopes(["scope:read"]) utility must be used inside the tool handler for this purpose.

**Rate Limiting:** To prevent abuse, handlers for public-facing or resource-intensive tools shall be protected by the centralized rateLimiter.

## VII. Testing Mandates

A `tests/` directory exists at the project root and mirrors the `src/` directory structure. All tests shall be written using Vitest.

**INTEGRATION TESTING FIRST PRINCIPLE:**
Tests shall prioritize **integration testing over mocked unit testing**. The goal is to test real interactions between components, actual MCP protocol flows, and complete system behavior. Heavy mocking that isolates components from their real dependencies is explicitly discouraged as it can miss critical integration issues.

**A. Integration Testing for Core Logic**

- **Focus:** Tests must validate the complete flow from input to output, including real dependencies and service interactions where feasible.
- **Methodology:**
  1.  **Real Dependencies:** Use actual service instances and real data flows instead of mocks wherever possible. For external services that cannot be controlled, use test doubles that simulate realistic behavior.
  2.  **End-to-End Validation:** Test the complete execution path from tool invocation through to final response, including error scenarios.
  3.  **Schema Compliance:** Use `@anatine/zod-mock` to generate test data, but validate that the complete system properly handles and transforms this data.
  4.  **Error Flow Testing:** Test actual error conditions by triggering real failure states, not by mocking errors.

**B. MCP Transport Integration Testing**

- **HTTP Transport:** Test actual `StreamableHTTPServerTransport` instances with real MCP protocol flows, including:
  1.  **Session Lifecycle:** Complete initialize → tool call → cleanup flows
  2.  **Streaming Responses:** Server-Sent Events (SSE) functionality
  3.  **JSON-RPC 2.0 Compliance:** Actual protocol message validation
  4.  **Session Management:** Real session persistence and cleanup
  5.  **Error Scenarios:** Invalid sessions, malformed requests, concurrent sessions
- **Stdio Transport:** Test actual stdio transport functionality with real process communication
- **Protocol Compliance:** Validate MCP specification adherence through real message flows

**C. Tool Registration Integration Testing**

- **Real Registration:** Test tools through the actual registration process with a real `McpServer` instance
- **Tool Execution:** Validate tool execution through the complete registration → invocation → response cycle
- **Handler Integration:** Test the "Logic Throws, Handler Catches" pattern through actual error scenarios, not mocked exceptions

**D. Service Integration Testing**

- **Database Services:** Use test databases or in-memory instances for real query execution
- **External APIs:** Use test endpoints or controlled test environments when possible
- **Singleton Services:** Test actual singleton behavior and state management

**E. Controlled Mocking Guidelines**

When mocking is necessary, it must be **surgical and justified**:

- **External Services Only:** Mock only truly external, uncontrollable dependencies (third-party APIs without test environments)
- **Behavior Simulation:** Mocks must accurately simulate real service behavior, including realistic response times and error conditions
- **Test Data Integrity:** Mocked responses must use actual data structures and realistic content
- **Documentation Required:** All mocks must be documented with justification for why integration testing wasn't feasible

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

1.  **Read Before Testing:** Always read the file before creating or modifying tests. Never edit without understanding current implementation.
2.  **Real Error Conditions:** Test actual error scenarios by creating real failure conditions, not by mocking errors.
3.  **Protocol Compliance:** All MCP transport tests must validate actual MCP protocol compliance.
4.  **Performance Validation:** Integration tests should validate that real system performance meets requirements.
5.  **Security Testing:** Test actual authentication, authorization, and input validation flows.

This integration-first approach ensures that tests catch real-world issues that pure unit tests with heavy mocking would miss, providing confidence that the system works correctly in production scenarios.

````
