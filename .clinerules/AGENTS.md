# Agent Protocol & Architectural Mandate

**Version:** 2.0.0
**Target Project:** `mcp-ts-template`

This document provides the operational directives for developing and modifying this project. Adherence is mandatory.

---

## Ⅰ. Core Principles: The Non-Negotiable Rules

1.  **The Logic Throws, The Handler Catches**:
    - **Your Task (`logic` function)**: Write your core business logic inside the `logic` function of a `ToolDefinition`. This function MUST be pure and stateless. It MUST NOT contain a `try...catch` block.
    - **On Failure**: If your logic encounters an error, you MUST `throw new McpError(...)`.
    - **Framework's Job (Handler)**: The `toolHandlerFactory` automatically wraps your `logic` in a `try...catch` block, handles `RequestContext`, measures performance, and formats the final response. Do not replicate this behavior.

2.  **Full-Stack Observability**:
    - **Tracing**: OpenTelemetry is auto-configured. Every log and error you generate is automatically correlated to a trace.
    - **Performance**: The `measureToolExecution` wrapper automatically benchmarks your tool's execution time.
    - **Your Responsibility**: You do not need to manually instrument your tools. The framework handles it.

3.  **Structured & Traceable Operations**:
    - Every significant operation MUST accept a `RequestContext` object as its last parameter.
    - This `context` object MUST be passed through the entire call stack of the operation.
    - All logging MUST be performed using the global `logger` singleton, and every log entry MUST include the `context` object. Example: `logger.info("Message", context);`.

4.  **Decoupled Storage**:
    - **DO NOT** access storage backends (filesystem, database) directly.
    - **ALWAYS** use the `storageService` singleton for all storage operations (`get`, `set`, `delete`, `list`).
    - The `storageService` abstracts the underlying provider (in-memory, filesystem, Supabase), which is configured via environment variables.

---

## Ⅱ. The Tool Development Workflow

This is the **only** permitted workflow for creating or modifying tools.

### Step 1: Locate or Create the Tool Definition File

- All tools are defined in a single file located at: `src/mcp-server/tools/definitions/`.
- The filename MUST be `[tool-name].tool.ts`.
- Use `src/mcp-server/tools/definitions/echo.tool.ts` as the canonical template for all new tools.

### Step 2: Define the `ToolDefinition` Object

Your tool file must export a single `const` named `[toolName]Tool` of type `ToolDefinition`.

This object MUST contain:

1.  **`name`**: The programmatic name of the tool (e.g., `"get_weather_forecast"`).
2.  **`description`**: A clear, concise, LLM-facing description of the tool's purpose.
3.  **`inputSchema`**: A `z.object({})` from Zod defining all input parameters. Each parameter MUST have a `.describe()` chain.
4.  **`outputSchema`**: A `z.object({})` from Zod defining the structure of the successful return object.
5.  **`logic`**: An `async` function containing the pure business logic.
    - It accepts two arguments: `(input: z.infer<typeof InputSchema>, context: RequestContext)`.
    - It MUST `return` a promise that resolves to an object matching `OutputSchema` on success.
    - It MUST `throw new McpError(...)` on failure.

### Step 3: Register the Tool

- In `src/mcp-server/server.ts`, import your new tool definition.
- Add it to the list of tools being registered with `await registerTool(server, yourNewTool);`.

### Example `ToolDefinition` Structure:

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

const ECHO_MODES = ["standard", "uppercase", "lowercase"] as const;
const TEST_ERROR_TRIGGER_MESSAGE = "fail";

const InputSchema = z.object({
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
      "Optional ISO 8601 timestamp of when the response was generated.",
    ),
});

type EchoToolInput = z.infer<typeof InputSchema>;
type EchoToolResponse = z.infer<typeof OutputSchema>;

async function echoToolLogic(
  input: EchoToolInput,
  context: RequestContext,
): Promise<EchoToolResponse> {
  logger.debug("Processing echo message logic.", {
    ...context,
    toolInput: input,
  });
  if (input.message === TEST_ERROR_TRIGGER_MESSAGE) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      `Deliberate failure triggered.`,
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
    annotations: { readOnlyHint: true, openWorldHint: false },
    logic: echoToolLogic,
  };
```

---

## III. Core Services & Utilities

This project includes a suite of singleton services and utilities to handle common backend tasks. You are required to use these services instead of implementing your own solutions. They are all instrumented for logging and tracing.

- **`requestContextService`**:
  - **Purpose**: Creates and manages the `RequestContext` for tracing and logging.
  - **Usage**: `const context = requestContextService.createRequestContext({ operation: 'MyOperation' });`
  - **Rule**: Every new operational flow must start by creating a context. Pass this context down through all subsequent function calls.

- **`logger`**:
  - **Purpose**: Centralized, level-based logging.
  - **Usage**: `logger.info("Message", context);`, `logger.error("Error message", error, context);`
  - **Rule**: Use for all logging. Never use `console.log`.

- **`ErrorHandler.tryCatch`**:
  - **Purpose**: A robust wrapper for any fallible operation that ensures proper error handling and logging.
  - **Usage**: `await ErrorHandler.tryCatch(async () => { /* your logic */ }, { operation: 'MyOperation', context });`
  - **Rule**: Use this to wrap external API calls or any other code that might throw an unexpected error _outside_ of a tool's main `logic` function (which has its own handler).

- **`storageService`**:
  - **Purpose**: Interacts with the configured storage backend (in-memory, filesystem, or Supabase).
  - **Usage**: `await storageService.set('my-key', { value: 1 }, context);`
  - **Rule**: Use for all key-value storage needs. Do not directly access `fs` or a database for storage.

- **`openRouterProvider`**:
  - **Purpose**: A client for making calls to the OpenRouter LLM Gateway.
  - **Usage**: `const response = await openRouterProvider.chatCompletion(params, context);`
  - **Rule**: Use this for any required LLM interactions.

- **`sanitization`**:
  - **Purpose**: Provides methods for cleaning input to prevent security vulnerabilities.
  - **Usage**: `sanitization.sanitizeHtml(userInput);`, `sanitization.sanitizePath(filePath);`
  - **Rule**: Sanitize any data that originates from an external, untrusted source before using it.

- **`rateLimiter`**:
  - **Purpose**: Enforces rate limits on operations.
  - **Usage**: `rateLimiter.check(userIdentifier, context);`
  - **Rule**: Apply to public-facing or resource-intensive operations to prevent abuse.

## IV. Code Quality and Security Mandates

- **JSDoc**: Every file must start with `@fileoverview` and `@module`. All exported functions, types, and classes must have complete JSDoc comments.
- **Immutability**: Use functional patterns and immutable data structures. Avoid reassigning variables where possible.
- **Dependencies**: All external service interactions (e.g., APIs) MUST be encapsulated within a singleton provider class in the `src/services/` directory.
- **Validation**: All inputs are automatically validated by the framework using your Zod a`inputSchema`. You can assume the `input` to your `logic` function is type-safe.
- **Secrets**: Access secrets **only** from the `config` module, which loads them from environment variables. Do not hard-code secrets.
- **Formatting**: Before completing a task, you MUST run `npm run format` to ensure code style consistency.
- **Testing**: All new functionality must be accompanied by integration tests in the `tests/` directory, following the existing structure. Use Vitest.
