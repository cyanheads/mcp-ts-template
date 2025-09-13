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

## II. Architectural Philosophy: Pragmatic SOLID

SOLID principles are the foundation for building maintainable, decoupled, and testable systems. They are not rigid laws, but a toolkit for making sound architectural decisions. The guiding question should always be: **"Does this design help build and maintain the system effectively?"**

This is complemented by other core principles:
- **KISS (Keep It Simple, Stupid):** Avoid over-engineering to satisfy a principle. The simplest code is often the most maintainable.
- **YAGNI (You Ain't Gonna Need It):** Defer building complex abstractions until they are necessary.
- **Composition over Inheritance:** This is the preferred approach, as it naturally leads to more flexible and decoupled systems.

### Modern Interpretation of SOLID

| Principle | The Goal |
| :--- | :--- |
| **S** - Single Responsibility | **Group code that changes together.** A class or module should be cohesive and focused on a single concept, actor, or domain in the system. |
| **O** - Open/Closed | **Make it easy to add new features without breaking existing ones.** Use abstractions like interfaces, plugins, and middleware to allow for extension. |
| **L** - Liskov Substitution | **Your abstractions must not be leaky or surprising.** Subtypes must be substitutable for their base types without altering the correctness of the program. |
| **I** - Interface Segregation | **Keep interfaces small and focused.** Do not force clients to depend on methods they do not use. This is key to modular, service-oriented design. |
| **D** - Dependency Inversion | **Depend on abstractions, not on concrete details.** This is the core idea behind Dependency Injection and is absolutely critical for testability and decoupling. |

---

## III. Tool Development Workflow

This is the only approved workflow for authoring or modifying tools.

Step 1 — File Location

- Place tools in `src/mcp-server/tools/definitions/`.
- Name files `[tool-name].tool.ts`.
- Use `src/mcp-server/tools/definitions/template-echo-message.tool.ts` as the reference template.

Step 2 — Define the ToolDefinition
Export a single `const` named `[toolName]Tool` of type `ToolDefinition` with:

- name: Programmatic tool name (e.g., `"get_weather_forecast"`).
- title (optional): Human-readable display name used by UIs; preferred over name when present.
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
  Title precedence at registration: `tool.title ?? tool.annotations?.title ?? deriveTitleFromName(tool.name)`.

Example src/mcp-server/tools/definitions/template-echo-message.tool.ts

```ts
/**
 * @fileoverview Complete, declarative definition for the 'template_echo_message' tool.
 * Emphasizes a clean, top‑down flow with configurable metadata at the top,
 * schema definitions next, pure logic, and finally the exported ToolDefinition.
 * @module src/mcp-server/tools/definitions/echo.tool
 */
import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { JsonRpcErrorCode, McpError } from '../../../types-global/errors.js';
import { type RequestContext, logger } from '../../../utils/index.js';
import type {
  ToolAnnotations,
  ToolDefinition,
} from '../utils/toolDefinition.js';

// Configurable metadata and constants
// -----------------------------------
/**
 * Programmatic tool name (must be unique).
 * Naming convention (recommended): <server-prefix>_<action>_<object>
 * - Use a short, stable server prefix for discoverability across servers.
 * - Use lowercase snake_case.
 * - Examples: 'template_echo_message', 'template_cat_fact'.
 */
const TOOL_NAME = 'template_echo_message';
/** Optional human-readable title used by UIs. */
const TOOL_TITLE = 'Echo Message';
/**
 * LLM-facing description of the tool.
 * Guidance:
 * - Be descriptive but concise (aim for 1–2 sentences).
 * - Write from the LLM's perspective to optimize tool selection.
 * - State purpose, primary inputs, notable constraints, and side effects.
 * - Mention any requirements (auth, permissions, online access) and limits
 *   (rate limits, size constraints, expected latency) if critically applicable.
 * - Note determinism/idempotency and external-world interactions when relevant.
 * - Avoid implementation details; focus on the observable behavior and contract.
 */
const TOOL_DESCRIPTION =
  'Echoes a message back with optional formatting and repetition.';
/**
 * UI/behavior hints for clients. All supported options:
 * - title?: string — Optional human display name (UI hint).
 * - readOnlyHint?: boolean — True if tool does not modify environment.
 * - destructiveHint?: boolean — If not read-only, set true if updates can be destructive. Default true.
 * - idempotentHint?: boolean — If not read-only, true if repeat calls with same args have no additional effect.
 * - openWorldHint?: boolean — True if tool may interact with an open, external world (e.g., web search). Default true.
 *
 * Note: These are hints only. Clients should not rely on them for safety guarantees.
 */
const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

/** Supported formatting modes. */
const ECHO_MODES = ['standard', 'uppercase', 'lowercase'] as const;
/** Default mode when not provided. */
const DEFAULT_MODE: (typeof ECHO_MODES)[number] = 'standard';
/** Default repeat count. */
const DEFAULT_REPEAT = 1;
/** Default includeTimestamp behavior. */
const DEFAULT_INCLUDE_TIMESTAMP = false;
/** Special input which deliberately triggers a failure for testing. */
export const TEST_ERROR_TRIGGER_MESSAGE = 'TRIGGER_ERROR';

//
// Schemas (input and output)
// --------------------------
const InputSchema = z
  .object({
    message: z
      .string()
      .min(1, 'Message cannot be empty.')
      .max(1000, 'Message cannot exceed 1000 characters.')
      .describe(
        `The message to echo back. To trigger a test error, provide '${TEST_ERROR_TRIGGER_MESSAGE}'.`,
      ),
    mode: z
      .enum(ECHO_MODES)
      .default(DEFAULT_MODE)
      .describe(
        "How to format the message ('standard' | 'uppercase' | 'lowercase').",
      ),
    repeat: z
      .number()
      .int()
      .min(1)
      .max(5)
      .default(DEFAULT_REPEAT)
      .describe('Number of times to repeat the formatted message.'),
    includeTimestamp: z
      .boolean()
      .default(DEFAULT_INCLUDE_TIMESTAMP)
      .describe('Whether to include an ISO 8601 timestamp in the response.'),
  })
  .describe('Echo a message with optional formatting and repetition.');

const OutputSchema = z
  .object({
    originalMessage: z
      .string()
      .describe('The original message provided in the input.'),
    formattedMessage: z
      .string()
      .describe('The message after applying the specified formatting.'),
    repeatedMessage: z
      .string()
      .describe('The final message repeated the requested number of times.'),
    mode: z.enum(ECHO_MODES).describe('The formatting mode that was applied.'),
    repeatCount: z
      .number()
      .int()
      .min(1)
      .describe('The number of times the message was repeated.'),
    timestamp: z
      .string()
      .datetime()
      .optional()
      .describe(
        'Optional ISO 8601 timestamp of when the response was generated.',
      ),
  })
  .describe('Echo tool response payload.');

type EchoToolInput = z.infer<typeof InputSchema>;
type EchoToolResponse = z.infer<typeof OutputSchema>;

//
// Pure business logic (no try/catch; throw McpError on failure)
// -------------------------------------------------------------
function echoToolLogic(
  input: EchoToolInput,
  context: RequestContext,
): Promise<EchoToolResponse> {
  logger.debug('Processing echo message logic.', {
    ...context,
    toolInput: input,
  });

  if (input.message === TEST_ERROR_TRIGGER_MESSAGE) {
    const errorData: Record<string, unknown> = {
      requestId: context.requestId,
    };
    if (typeof (context as Record<string, unknown>).traceId === 'string') {
      errorData.traceId = (context as Record<string, unknown>)
        .traceId as string;
    }
    throw new McpError(
      JsonRpcErrorCode.ValidationError,
      'Deliberate failure triggered.',
      errorData,
    );
  }

  const formattedMessage =
    input.mode === 'uppercase'
      ? input.message.toUpperCase()
      : input.mode === 'lowercase'
        ? input.message.toLowerCase()
        : input.message;

  const repeatedMessage = Array(input.repeat).fill(formattedMessage).join(' ');

  const response: EchoToolResponse = {
    originalMessage: input.message,
    formattedMessage,
    repeatedMessage,
    mode: input.mode,
    repeatCount: input.repeat,
    ...(input.includeTimestamp && { timestamp: new Date().toISOString() }),
  };

  return Promise.resolve(response);
}

/**
 * Formats a concise human-readable summary while structuredContent carries the full payload.
 */
function responseFormatter(result: EchoToolResponse): ContentBlock[] {
  const preview =
    result.repeatedMessage.length > 200
      ? `${result.repeatedMessage.slice(0, 197)}…`
      : result.repeatedMessage;
  const lines = [
    `Echo (mode=${result.mode}, repeat=${result.repeatCount})`,
    preview,
    result.timestamp ? `timestamp=${result.timestamp}` : undefined,
  ].filter(Boolean) as string[];

  return [
    {
      type: 'text',
      text: lines.join('\n'),
    },
  ];
}

/**
 * The complete tool definition for the echo tool.
 */
export const echoTool: ToolDefinition<typeof InputSchema, typeof OutputSchema> =
  {
    name: TOOL_NAME,
    title: TOOL_TITLE,
    description: TOOL_DESCRIPTION,
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    annotations: TOOL_ANNOTATIONS,
    logic: echoToolLogic,
    responseFormatter,
  };
```

Note: For binary or image outputs, provide a `responseFormatter` that returns `ContentBlock[]` (see `template-image-test.tool.ts`).

---

## IV. Resource Development Workflow

This mirrors the tools pattern with a definition-based approach and a generic registrar.

Step 1 — File Location

- Place resources in `src/mcp-server/resources/definitions/`.
- Name files `[resource-name].resource.ts`.

Step 2 — Define the ResourceDefinition
Export a single `const` of type `ResourceDefinition` with:

- name: Programmatic resource name (e.g., `"echo-resource"`).
- description: What the resource returns/do.
- uriTemplate: e.g., `"echo://{message}"`.
- paramsSchema: Zod `z.object({ ... })` validating route/template params; every field should have `.describe()`.
- outputSchema (recommended): Zod `z.object({ ... })` describing the returned payload.
- logic: `(uri, params, context) => { ... }` pure logic; no try/catch; throw `McpError` on failure.
- annotations (optional): Hints like `{ readOnlyHint, openWorldHint }`.
- examples (optional): `{ name, uri }[]` to aid discovery.
- list (optional): A function returning `ListResourcesResult` for discovery.
- responseFormatter (optional): Map logic result to `ReadResourceResult.contents` for custom mime output.

References

- Definition: `src/mcp-server/resources/utils/resourceDefinition.ts`
- Registrar: `src/mcp-server/resources/utils/resourceHandlerFactory.ts` (`registerResource`)
- Example: `src/mcp-server/resources/definitions/echo.resource.ts`

Step 3 — Register the Resource

- Edit `src/mcp-server/server.ts` and import your definition.
- Register it directly (mirrors tools):

```ts
import { myResourceDefinition } from './resources/definitions/my.resource.js';
import { registerResource } from './resources/utils/resourceHandlerFactory.js';

await registerResource(server, myResourceDefinition);
```

Handler Responsibilities (Implicit)

- Creates `RequestContext` via `requestContextService`.
- Validates params with your Zod schema.
- Formats success output (default JSON) or uses your `responseFormatter`.
- Handles errors via `ErrorHandler.handleError`.

Logic Responsibilities (Explicit)

- Pure, stateless function. No `try...catch`.
- Throw `McpError` on failure.
- Use `storageService` for storage access; never `fs` directly.
- Log with `logger` and pass along `context`.

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

## V. Checks & Workflow Commands

- Quick all-in-one checks (lint + typecheck): `bun run devcheck`
  - Use this (sparingly) after making changes.
- Format code: `bun run format`

Always prefer `bun run devcheck` to catch issues early.

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
