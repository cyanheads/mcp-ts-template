# Agent Protocol & Architectural Mandate

Version: 2.0.0
Target Project: `mcp-ts-template`

This document defines the operational rules for contributing to this codebase. Follow it exactly.

---

## I. Core Principles (Non‑Negotiable)

1. The Logic Throws, The Handler Catches
   - Your Task (logic): Implement pure, stateless business logic inside the `logic` function on a `ToolDefinition`. Do not add `try...catch` here.
   - On Failure: Throw `new McpError(...)` with the appropriate `JsonRpcErrorCode` and context.
   - Framework’s Job (Handler): The standardized handler created by `createMcpToolHandler` (in `src/mcp-server/tools/utils/toolHandlerFactory.ts`) wraps your logic, manages `RequestContext`, measures execution via `measureToolExecution`, formats the response, and handles errors.

2. Full‑Stack Observability
   - Tracing: OpenTelemetry is preconfigured; your logs and errors are correlated to traces automatically.
   - Performance: `measureToolExecution` records duration, success, payload sizes, and error codes.
   - No Manual Instrumentation: Do not add custom tracing; use the provided utilities and logging.

3. Structured, Traceable Operations
   - Always accept a `RequestContext` as the last parameter of any significant operation.
   - Pass the same `context` through your entire call stack for continuity.
   - Use the global `logger` for all logging; include the `context` in every log call.

4. Decoupled Storage
   - Never access storage backends directly.
   - Always use `storageService` for `get`, `set`, `delete`, and `list` operations.
   - The concrete provider is configured via environment variables and initialized at startup.

---

## II. Tool Development Workflow

This is the only approved workflow for authoring or modifying tools.

Step 1 — File Location

- Place tools in `src/mcp-server/tools/definitions/`.
- Name files `[tool-name].tool.ts`.
- Use `src/mcp-server/tools/definitions/echo.tool.ts` as the reference template.

Step 2 — Define the ToolDefinition
Export a single `const` named `[toolName]Tool` of type `ToolDefinition` with:

- name: Programmatic tool name (e.g., `"get_weather_forecast"`).
- description: Clear, LLM-facing description.
- inputSchema: Zod `z.object({ ... })` for parameters. Every field must have `.describe()`.
- outputSchema: Zod `z.object({ ... })` describing success output.
- logic: `async (input, context) => { ... }` pure business logic; throws `McpError` on failure.
- annotations (optional): Hints like `{ readOnlyHint, openWorldHint }`.
- responseFormatter (optional): Map successful output to `ContentBlock[]` when non-JSON output is preferred (e.g., images).

Step 3 — Register the Tool

- Edit `src/mcp-server/server.ts` and import the new tool.
- Register it using the existing helper: `await registerTool(server, yourNewTool);`.
  The helper constructs the handler via `createMcpToolHandler` and registers schemas and annotations.

Example (Echo Tool)

```ts
/**
 * @fileoverview The complete definition for the 'echo_message' tool.
 * @module src/mcp-server/tools/definitions/echo.tool
 */
import { z } from 'zod';

import { JsonRpcErrorCode, McpError } from '../../../types-global/errors.js';
import { RequestContext, logger } from '../../../utils/index.js';
import { ToolDefinition } from '../utils/toolDefinition.js';

const ECHO_MODES = ['standard', 'uppercase', 'lowercase'] as const;
const TEST_ERROR_TRIGGER_MESSAGE = 'fail';

const InputSchema = z.object({
  message: z
    .string()
    .min(1)
    .max(1000)
    .describe(
      `The message to echo back. To trigger a test error, pass '${TEST_ERROR_TRIGGER_MESSAGE}'.`,
    ),
  mode: z
    .enum(ECHO_MODES)
    .default('standard')
    .describe('Case formatting for the message.'),
  repeat: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(1)
    .describe('Times to repeat the message.'),
  includeTimestamp: z
    .boolean()
    .default(true)
    .describe('Include ISO 8601 timestamp in the response.'),
});

const OutputSchema = z.object({
  originalMessage: z.string().describe('Original input message.'),
  formattedMessage: z.string().describe('Message after formatting.'),
  repeatedMessage: z.string().describe('Final repeated output.'),
  mode: z.enum(ECHO_MODES).describe('Applied formatting mode.'),
  repeatCount: z.number().int().describe('Repeat count used.'),
  timestamp: z
    .string()
    .datetime()
    .optional()
    .describe('Optional ISO timestamp.'),
});

type EchoToolInput = z.infer<typeof InputSchema>;
type EchoToolResponse = z.infer<typeof OutputSchema>;

async function echoToolLogic(
  input: EchoToolInput,
  context: RequestContext,
): Promise<EchoToolResponse> {
  logger.debug('Processing echo message logic.', {
    ...context,
    toolInput: input,
  });

  if (input.message === TEST_ERROR_TRIGGER_MESSAGE) {
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Deliberate failure triggered.',
    );
  }

  const base =
    input.mode === 'uppercase'
      ? input.message.toUpperCase()
      : input.mode === 'lowercase'
        ? input.message.toLowerCase()
        : input.message;

  const repeatedMessage = Array(input.repeat).fill(base).join(' ');

  const result: EchoToolResponse = {
    originalMessage: input.message,
    formattedMessage: base,
    repeatedMessage,
    mode: input.mode,
    repeatCount: input.repeat,
  };
  if (input.includeTimestamp) result.timestamp = new Date().toISOString();
  return result;
}

export const echoTool: ToolDefinition<typeof InputSchema, typeof OutputSchema> =
  {
    name: 'echo_message',
    description: 'Echoes a message with optional formatting and repetition.',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
    logic: echoToolLogic,
  };
```

Note: For binary or image outputs, provide a `responseFormatter` that returns `ContentBlock[]` (see `image-test.tool.ts`).

---

## III. Core Services & Utilities

Use these singletons/utilities; do not reimplement them. They are logging/trace aware.

- requestContextService (src/utils/internal/requestContext.ts): Create and manage `RequestContext`.
  - Usage: `const context = requestContextService.createRequestContext({ operation: "MyOp" });`
  - Rule: Start every operation by creating a context and pass it down.

- logger (src/utils/internal/logger.ts): Centralized, structured logging.
  - Usage: `logger.info("Message", context)` or `logger.info("Message", { ...context, extra })`.
  - Rule: Never use `console.log`.

- ErrorHandler.tryCatch (src/utils/internal/errorHandler.ts): Robust wrapper for fallible operations outside tool logic.
  - Usage: `await ErrorHandler.tryCatch(async () => { ... }, { operation: "MyOp", context });`
  - Rule: Use in services/providers and bootstrapping; tool logic is already handled by the handler.

- storageService (src/storage/core/StorageService.ts): Abstraction over configured storage provider.
  - Usage: `await storageService.set(key, value, context)`; also `get`, `delete`, `list`.
  - Rule: Never access storage directly.

- openRouterProvider (src/services/llm-providers/openRouterProvider.ts): OpenRouter LLM gateway client.
  - Usage: `await openRouterProvider.chatCompletion(params, context)`.

- sanitization (src/utils/security/sanitization.ts): Input/path sanitization helpers.
  - Usage: `sanitization.sanitizeHtml(str)`, `sanitization.sanitizePath(path)`.
  - Rule: Sanitize untrusted input.

- rateLimiter (src/utils/security/rateLimiter.ts): Rate limiting utility.
  - Usage: `rateLimiter.check(identifier, context)` on public/resource-heavy flows.

- measureToolExecution (src/utils/internal/performance.ts): Tool execution metrics wrapper.
  - Note: Invoked by the standardized handler; you do not call it directly from tool logic.

---

## IV. Code Quality & Security

- JSDoc: Every file starts with `@fileoverview` and `@module`. Document all exported APIs.
- Immutability: Prefer functional patterns; avoid reassignments.
- External Dependencies: Encapsulate API clients/providers under `src/services/`.
- Validation: Inputs are validated via Zod `inputSchema`; your `logic` receives typed, safe `input`.
- Secrets: Access through the `config` module only; never hard‑code.
- Formatting: Run `npm run format` before finishing any task.
- Testing: Add/extend Vitest integration tests under `tests/`, following existing structure.

---

## V. Quick Checklist

- Implement tool in `src/mcp-server/tools/definitions/[name].tool.ts` using the echo tool as a template.
- Keep logic pure; throw `McpError` for failures. No `try...catch` inside logic.
- Use `logger` with `RequestContext` in every meaningful operation.
- Use `storageService` for all persistence.
- Add `annotations` and a `responseFormatter` when needed (e.g., images).
- Register via `registerTool(server, myTool)` in `src/mcp-server/server.ts`.
- Add tests in `tests/`; run `npm run test` and `npm run format`.
