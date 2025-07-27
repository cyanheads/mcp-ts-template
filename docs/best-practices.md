````markdown
# mcp-ts-template: Architectural Standard & Developer Mandate

**Effective Date:** 2025-07-17
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
The logic.ts file defines the tool's contract (schemas) and its core function. It remains pure and throws errors when its contract cannot be fulfilled.

```typescript
/**
 * @fileoverview Defines the core logic, schemas, and types for the `echo_message` tool.
 * @module src/mcp-server/tools/echoTool/logic
 */
import { z } from "zod";
import { logger, type RequestContext } from "../../../utils/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";

// 1. DEFINE the Zod input schema. This is the contract for the tool's input.
// CRITICAL: The descriptions provided via .describe() for the object and each field
// are sent directly to the LLM. They must be clear, concise, and contain all
// necessary context, requirements, and formatting expectations for the model
// to effectively use this tool.
export const EchoToolInputSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(1000, "Message cannot exceed 1000 characters.")
    .describe(
      "The message to echo back. Clearly state any expectations for the LLM here.",
    ),
});

// 2. DEFINE and export the Zod response schema for structured output.
export const EchoToolResponseSchema = z.object({
  originalMessage: z.string().describe("The original message provided."),
  timestamp: z
    .string()
    .datetime()
    .describe("The ISO 8601 timestamp of the operation."),
});

// 3. INFER and export TypeScript types from Zod schemas.
export type EchoToolInput = z.infer<typeof EchoToolInputSchema>;
export type EchoToolResponse = z.infer<typeof EchoToolResponseSchema>;

/**
 * 4. IMPLEMENT and export the core logic function.
 * This function MUST remain pure; its only concerns are its inputs and its return value or thrown error.
 * @param params - The validated input parameters.
 * @param context - The request context for logging and tracing.
 * @returns A promise resolving with the structured response data.
 * @throws {McpError} If the logic encounters an unrecoverable issue.
 */
export async function echoToolLogic(
  params: EchoToolInput,
  context: RequestContext,
): Promise<EchoToolResponse> {
  logger.debug("Executing echoToolLogic...", { ...context });

  // Example of a logic failure.
  if (params.message === "fail") {
    // CRITICAL: Logic layer MUST throw a structured error on failure.
    throw new McpError(
      BaseErrorCode.VALIDATION_ERROR,
      "The message was 'fail'.",
    );
  }

  // On success, RETURN a structured output object adhering to the response schema.
  return {
    originalMessage: params.message,
    timestamp: new Date().toISOString(),
  };
}
```
````

**Step 2: Register the Tool and Handle All Outcomes (registration.ts)**
The registration.ts file acts as the handler, connecting the pure logic to the MCP server and managing all possible outcomes (success or failure).

```typescript
/**
 * @fileoverview Handles registration and error handling for the `echo_message` tool.
 * @module src/mcp-server/tools/echoTool/registration
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ErrorHandler,
  logger,
  requestContextService,
} from "../../../utils/index.js";
// 1. IMPORT all necessary components from the logic file.
import {
  EchoToolInput,
  EchoToolInputSchema,
  echoToolLogic,
  EchoToolResponseSchema,
} from "./logic.js";

/**
 * Registers the 'echo_message' tool with the MCP server instance.
 * @param server - The MCP server instance.
 */
export const registerEchoTool = async (server: McpServer): Promise<void> => {
  const toolName = "echo_message";

  server.registerTool(
    toolName,
    {
      // CRITICAL: The title and description are sent to the LLM.
      // They must clearly and concisely explain the tool's purpose to the model.
      title: "Echo Message",
      description:
        "Echoes a message back with a timestamp. Use this to send a simple reply.",
      inputSchema: EchoToolInputSchema.shape,
      outputSchema: EchoToolResponseSchema.shape, // MANDATORY: Use the structured output schema.
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (params: EchoToolInput) => {
      const handlerContext = requestContextService.createRequestContext({
        toolName,
      });

      try {
        // 2. INVOKE the core logic within the try block.
        const result = await echoToolLogic(params, handlerContext);

        // 3. FORMAT the SUCCESS response. It must include structuredContent.
        return {
          structuredContent: result,
          content: [
            { type: "text", text: `Success: ${JSON.stringify(result)}` },
          ],
        };
      } catch (error) {
        // 4. CATCH any error thrown by the logic layer.
        logger.error("Error in echo_message handler", {
          error,
          ...handlerContext,
        });
        const mcpError = ErrorHandler.handleError(error, {
          operation: toolName,
          context: handlerContext,
          input: params,
        }) as McpError;

        // 5. FORMAT the ERROR response. It must be an error object.
        return {
          isError: true,
          content: [{ type: "text", text: mcpError.message }],
          structuredContent: {
            code: mcpError.code,
            message: mcpError.message,
            details: mcpError.details,
          },
        };
      }
    },
  );
  logger.info(`Tool '${toolName}' registered successfully.`);
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

```

```
