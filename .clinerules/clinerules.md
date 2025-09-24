# Agent Protocol & Architectural Mandate

**Version:** 2.1.0
**Target Project:** `mcp-ts-template`

This document defines the operational rules for contributing to this codebase. Follow it exactly.

---

## I. Core Principles (Non‑Negotiable)

1.  **The Logic Throws, The Handler Catches**
    - **Your Task (Logic):** Implement pure, stateless business logic inside the `logic` function of a `ToolDefinition`. **Do not add `try...catch` here.**
    - **On Failure:** You must throw `new McpError(...)` with the appropriate `JsonRpcErrorCode` and context.
    - **Framework’s Job (Handler):** The standardized handler created by `createMcpToolHandler` wraps your logic, manages `RequestContext`, measures execution via `measureToolExecution`, formats the response, and is the sole location for catching errors.

2.  **Full‑Stack Observability**
    - **Tracing:** OpenTelemetry is preconfigured; your logs and errors are automatically correlated to traces.
    - **Performance:** `measureToolExecution` automatically records duration, success, payload sizes, and error codes for every tool call.
    - **No Manual Instrumentation:** Do not add custom tracing or spans; use the provided utilities and structured logging.

3.  **Structured, Traceable Operations**
    - Always accept a `RequestContext` as the last parameter of any significant operation.
    - Pass the _same_ `context` through your entire call stack for continuity.
    - Use the global `logger` for all logging; include the `context` in every log call.

4.  **Decoupled Storage**
    - Never access storage backends (e.g., `fs`, `supabase-js`) directly from tool logic.
    - **Always use the `StorageService`**, injected via the DI container, for all persistence operations.
    - The concrete provider is configured via environment variables and initialized at startup.

5.  **Local ↔ Edge Runtime Parity**
    - Every feature must continue to run through the local transports: `bun run dev:stdio` and `bun run dev:http` (and their `start:*` counterparts once built).
    - Keep the Worker build (`bun run build:worker`) and Wrangler flows (`bunx wrangler dev`, `bunx wrangler deploy`) healthy; guard any non-portable dependencies so the bundle stays edge-compatible.
    - Prefer runtime-agnostic abstractions (e.g., Hono + `@hono/mcp`, Fetch APIs) so Bun/Node on localhost behaves identically to Cloudflare's Worker runtime.

---

## II. Architectural Philosophy: Pragmatic SOLID

SOLID principles are the foundation for building maintainable, decoupled, and testable systems. They are not rigid laws, but a toolkit for making sound architectural decisions. The guiding question should always be: **"Does this design help build and maintain the system effectively?"**

This is complemented by other core principles:

- **KISS (Keep It Simple, Stupid):** Avoid over-engineering to satisfy a principle. The simplest code is often the most maintainable.
- **YAGNI (You Ain't Gonna Need It):** Defer building complex abstractions until they are necessary.
- **Composition over Inheritance:** This is the preferred approach, as it naturally leads to more flexible and decoupled systems.

### Modern Interpretation of SOLID

| Principle                     | The Goal                                                                                                                                                          |
| :---------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** - Single Responsibility | **Group code that changes together.** A class or module should be cohesive and focused on a single concept, actor, or domain in the system.                       |
| **O** - Open/Closed           | **Make it easy to add new features without breaking existing ones.** Use abstractions like interfaces, plugins, and middleware to allow for extension.            |
| **L** - Liskov Substitution   | **Your abstractions must not be leaky or surprising.** Subtypes must be substitutable for their base types without altering the correctness of the program.       |
| **I** - Interface Segregation | **Keep interfaces small and focused.** Do not force clients to depend on methods they do not use. This is key to modular, service-oriented design.                |
| **D** - Dependency Inversion  | **Depend on abstractions, not on concrete details.** This is the core idea behind Dependency Injection and is absolutely critical for testability and decoupling. |

---

## III. Tool Development Workflow

This is the only approved workflow for authoring or modifying tools.

#### Step 1 — File Location

- Place new tools in `src/mcp-server/tools/definitions/`.
- Name files `[tool-name].tool.ts`.
- Use `src/mcp-server/tools/definitions/template-echo-message.tool.ts` as the reference template.

#### Step 2 — Define the ToolDefinition

Export a single `const` named `[toolName]Tool` of type `ToolDefinition` with:

- `name`: Programmatic tool name (e.g., `"get_weather_forecast"`).
- `title` (optional): Human-readable display name used by UIs.
- `description`: Clear, LLM-facing description of what the tool does.
- `inputSchema`: A Zod `z.object({ ... })` for parameters. **Every field must have a `.describe()` statement.**
- `outputSchema`: A Zod `z.object({ ... })` describing the structure of a successful output.
- `logic`: The `async (input, context) => { ... }` function containing the pure business logic.
- `annotations` (optional): Behavioral hints like `{ readOnlyHint, openWorldHint }`.
- `responseFormatter` (optional): A function to map successful output to `ContentBlock[]` for non-JSON or complex outputs (e.g., images, rich text).

#### Step 2.5 — Apply Authorization (Mandatory for most tools)

- Wrap your `logic` function with the `withToolAuth` higher-order function to enforce scope-based access control.
- Provide an array of required scopes (e.g., `['tool:echo:read']`).

```ts
// Correct way to assign the logic property with authorization
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';

// ... inside your ToolDefinition
logic: withToolAuth(['tool:echo:read'], echoToolLogic),
```

#### Step 3 — Register the Tool via Barrel Export

1.  Open `src/mcp-server/tools/definitions/index.ts`.
2.  Import your new tool definition.
3.  Add it to the `allToolDefinitions` array.

The DI container automatically discovers and registers all tools from this array. No other registration step is needed.

#### Canonical Example: `template-cat-fact.tool.ts`

```ts
/**
 * @fileoverview Complete, declarative definition for the 'template_cat_fact' tool.
 * Mirrors the updated tool structure used by the echo tool: metadata constants,
 * Zod schemas, pure logic (no try/catch), and an optional response formatter.
 * @module src/mcp-server/tools/definitions/template-cat-fact.tool
 */
import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import {
  type RequestContext,
  fetchWithTimeout,
  logger,
} from '@/utils/index.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import type {
  ToolAnnotations,
  ToolDefinition,
} from '@/mcp-server/tools/utils/toolDefinition.js';

/**
 * Programmatic tool name (must be unique).
 * Naming convention (recommended): <server-prefix>_<action>_<object>
 * - Use a short, stable server prefix for discoverability across servers.
 * - Use lowercase snake_case.
 * - Examples: 'template_echo_message', 'template_cat_fact'.
 */
const TOOL_NAME = 'template_cat_fact';
/** --------------------------------------------------------- */

/** Human-readable title used by UIs. */
const TOOL_TITLE = 'template_cat_fact';
/** --------------------------------------------------------- */

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
  'Fetches a random cat fact from a public API with an optional maximum length.';
/** --------------------------------------------------------- */

/**
 * UI/behavior hints for clients. All supported options:
 * - title?: string — Human display name (UI hint).
 * - readOnlyHint?: boolean — True if tool does not modify environment.
 * - destructiveHint?: boolean — If not read-only, set true if updates can be destructive. Default true.
 * - idempotentHint?: boolean — If not read-only, true if repeat calls with same args have no additional effect.
 * - openWorldHint?: boolean — True if tool may interact with an open, external world (e.g., web search). Default true.
 *
 * Note: These are hints only. Clients should not rely on them for safety guarantees.
 */
const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: true,
  idempotentHint: true,
};
/** --------------------------------------------------------- */

// External API details
const CAT_FACT_API_URL = 'https://catfact.ninja/fact';
const CAT_FACT_API_TIMEOUT_MS = 5000;

// API response validation
const CatFactApiSchema = z.object({
  fact: z.string(),
  length: z.number(),
});

//
// Schemas (input and output)
// --------------------------
const InputSchema = z
  .object({
    maxLength: z
      .number()
      .int('Max length must be an integer.')
      .min(1, 'Max length must be at least 1.')
      .optional()
      .describe(
        'Optional: The maximum character length of the cat fact to retrieve.',
      ),
  })
  .describe('Parameters for fetching a random cat fact.');

const OutputSchema = z
  .object({
    fact: z.string().describe('The retrieved cat fact.'),
    length: z.number().int().describe('The character length of the cat fact.'),
    requestedMaxLength: z
      .number()
      .int()
      .optional()
      .describe('The maximum length that was requested for the fact.'),
    timestamp: z
      .string()
      .datetime()
      .describe('ISO 8601 timestamp of when the response was generated.'),
  })
  .describe('Cat fact tool response payload.');

type CatFactToolInput = z.infer<typeof InputSchema>;
type CatFactToolResponse = z.infer<typeof OutputSchema>;

//
// Pure business logic (no try/catch; throw McpError on failure)
// -------------------------------------------------------------
async function catFactToolLogic(
  input: CatFactToolInput,
  context: RequestContext,
): Promise<CatFactToolResponse> {
  logger.debug('Processing template_cat_fact logic.', {
    ...context,
    toolInput: input,
  });

  const url =
    input.maxLength !== undefined
      ? `${CAT_FACT_API_URL}?max_length=${input.maxLength}`
      : CAT_FACT_API_URL;

  logger.info(`Fetching random cat fact from: ${url}`, context);

  const response = await fetchWithTimeout(
    url,
    CAT_FACT_API_TIMEOUT_MS,
    context,
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => undefined);
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      `Cat Fact API request failed: ${response.status} ${response.statusText}`,
      {
        requestId: context.requestId,
        httpStatusCode: response.status,
        responseBody: errorText,
      },
    );
  }

  const rawData = await response.json();
  const parsed = CatFactApiSchema.safeParse(rawData);
  if (!parsed.success) {
    logger.error('Cat Fact API response validation failed', {
      ...context,
      receivedData: rawData,
      issues: parsed.error.issues,
    });
    throw new McpError(
      JsonRpcErrorCode.ServiceUnavailable,
      'Cat Fact API returned unexpected data format.',
      {
        requestId: context.requestId,
        issues: parsed.error.issues,
      },
    );
  }

  const data = parsed.data;
  const toolResponse: CatFactToolResponse = {
    fact: data.fact,
    length: data.length,
    requestedMaxLength: input.maxLength,
    timestamp: new Date().toISOString(),
  };

  logger.notice('Random cat fact fetched and processed successfully.', {
    ...context,
    factLength: toolResponse.length,
  });

  return toolResponse;
}

/**
 * Formats a concise human-readable summary while structuredContent carries the full payload.
 */
function responseFormatter(result: CatFactToolResponse): ContentBlock[] {
  const maxPart =
    typeof result.requestedMaxLength === 'number'
      ? `, max<=${result.requestedMaxLength}`
      : '';
  const header = `Cat Fact (length=${result.length}${maxPart})`;
  const preview =
    result.fact.length > 300 ? `${result.fact.slice(0, 297)}…` : result.fact;
  const lines = [header, preview, `timestamp=${result.timestamp}`];
  return [{ type: 'text', text: lines.filter(Boolean).join('\n') }];
}

/**
 * The complete tool definition for the cat fact tool.
 */
export const catFactTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:cat_fact:read'], catFactToolLogic),
  responseFormatter,
};
```

---

## IV. Resource Development Workflow

This mirrors the tool pattern. Use `src/mcp-server/resources/definitions/echo.resource.ts` as your template.

1.  **File Location**: `src/mcp-server/resources/definitions/[name].resource.ts`.
2.  **Define**: Export a `const` of type `ResourceDefinition`.
3.  **Authorize**: Wrap your `logic` function with `withResourceAuth(['scope:here'], yourResourceLogic)`.
4.  **Register**: Add the definition to the `allResourceDefinitions` array in `src/mcp-server/resources/definitions/index.ts`.

---

## V. Core Services & Utilities

#### DI-Managed Services

All core services are managed by the DI container (`tsyringe`). **Inject them into class constructors; do not create instances manually.**

- **`ILlmProvider`**: Interface for LLM operations.
  - **Token**: `LlmProvider`
  - **Usage**: `@inject(LlmProvider) private llmProvider: ILlmProvider`
- **`StorageService`**: Abstraction for persistence.
  - **Token**: `StorageService`
  - **Usage**: `@inject(StorageService) private storage: StorageService`
- **`RateLimiter`**: Service for rate-limiting.
  - **Token**: `RateLimiterService`
  - **Usage**: `@inject(RateLimiterService) private rateLimiter: RateLimiter`
- **`Logger`**: The Pino logger instance.
  - **Token**: `Logger`
  - **Usage (in injectable classes)**: `@inject(Logger) private logger: typeof logger`

#### Directly Imported Utilities

For non-class-based logic (like tool `logic` functions), import these singletons directly:

- `logger` from `src/utils/index.js`
- `requestContextService` from `src/utils/index.js`
- `ErrorHandler.tryCatch` from `src/utils/index.js`
- `sanitization` from `src/utils/index.js`

---

## VI. Checks & Workflow Commands

Use these scripts from `package.json` to maintain code quality and run the server.

| Script                 | Description                                                         |
| :--------------------- | :------------------------------------------------------------------ |
| `bun run devcheck`     | **Run this often.** Comprehensive check (lint, type-check, format). |
| `bun run dev:http`     | Runs the server with hot-reloading (HTTP).                          |
| `bun run format`       | Automatically formats all code with Prettier.                       |
| `bun run lint`         | Lints the codebase with ESLint to find issues.                      |
| `bun run typecheck`    | Checks the project for TypeScript errors without compiling.         |
| `bun test`             | Runs all unit and integration tests.                                |
| `bun test:integration` | Runs only the integration tests located in `tests/integration/`.    |

---

## VII. Code Quality & Security

- **JSDoc**: Every file must start with `@fileoverview` and `@module`. Document all exported APIs.
- **Authentication & Authorization**: Protect tools and resources by wrapping their `logic` functions with `withToolAuth` or `withResourceAuth` and specifying the required scopes.
- **Validation**: All inputs are validated via your Zod `inputSchema`. Your `logic` function receives typed, safe `input`.
- **Secrets**: Access secrets _only_ through the `config` module. Never hard-code credentials.
- **Formatting, Linting, & Type Checking**: Run `bun run devcheck` before finishing any task to ensure consistency.

---

## VIII. Repo-Specific Context and Guidance

This project has unique documentation and workflows. If the user asks about certain topics, use this guidance to provide accurate and helpful responses.

| If the user asks about...                                            | Your primary course of action should be to...                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| :------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Publishing the server"** or **"MCP Registry"**                    | 1. Read the primary guide at **`docs/publishing-mcp-server-registry.md`**. <br> 2. Use this guide to answer questions or to perform publishing-related tasks. Do not rely on generic knowledge.                                                                                                                                                                                                                                                                                  |
| **"Creating a new tool or resource"**                                | Follow the **Tool Development Workflow** and **Resource Development Workflow** sections outlined in this document. Use an existing definition (e.g., `template-cat-fact.tool.ts`) as a direct template.                                                                                                                                                                                                                                                                          |
| **"Configuration"** or **"Environment variables"**                   | 1. Refer to `src/config/index.ts` to understand all available configuration options and their default values. <br> 2. Refer to `.env.example` for the list of variable names.                                                                                                                                                                                                                                                                                                    |
| **Adding or changing dependencies**                                  | Always use `bun add <package>` or `bun remove <package>`. After any change, run `bun install` to install the new dependencies.                                                                                                                                                                                                                                                                                                                                                   |
| **"How to run the server"** or **"Available scripts"**               | Consult the `scripts` section of `package.json` and the **Available Scripts** section of the `README.md` to provide exact `bun run ...` commands.                                                                                                                                                                                                                                                                                                                                |
| **"I need to understand the project"** or **"Analyze the codebase"** | When asked to perform an analysis or a complex implementation on a specific section of the code base, we can use the `devdocs` script to generate a comprehensive context prompt. Run `bun run devdocs -- <path-of-codebase-section-to-focus-on>` to get a full project overview combined with the specific code you need to analyze. This provides the necessary context to create a high-quality implementation plan. The default output will be located at `docs/devdocs.md`. |

---

## IX. Runtime Targets: Local & Edge

The template must stay portable across local transports and Cloudflare's global edge. Treat both modes as first-class citizens when designing features and workflows.

### Local transports (stdio & HTTP)

- Use `bun run dev:stdio` and `bun run dev:http` during development; parity bugs between transports are regressions.
- After building (`bun run build`), confirm `bun run start:stdio` and `bun run start:http` still boot with your changes.
- Avoid relying on host-only features (raw TCP sockets, shelling out to unavailable binaries, etc.). If a capability is required, gate it behind feature detection and provide Worker-safe fallbacks.

### Cloudflare Workers & Pages Functions

- Edge bundles must compile with `bun run build:worker` and execute under `bunx wrangler dev --local` before merging.
- Set `nodejs_compat` in `wrangler.toml` and use a compatibility date of `2025-09-01` or later so Cloudflare automatically enables Node's HTTP client and server APIs. For earlier dates, explicitly add `enable_nodejs_http_modules` (client helpers) and `enable_nodejs_http_server_modules` (server helpers).
- Example Worker configuration:

```toml
compatibility_date = "2025-09-24"
compatibility_flags = ["nodejs_compat"]
```

- Cloudflare now supports `node:http`/`node:https` on Workers, so existing Express/Koa-style logic can be wrapped. Prefer Hono with `@hono/mcp` (already bundled) to share routing across Bun/Node and Workers; leverage `httpServerHandler` or `fetch`-first adapters instead of direct socket listeners.
- Workers cannot open arbitrary ports—`http.createServer().listen()` registers the handler with Cloudflare's router. Ensure any server-style code runs without assuming raw socket handles.
- When storing state, continue using DI-managed services (for example Durable Objects implementations of `StorageService`) so the same logic works locally and on the edge.

---

## X. Quick Checklist

Before completing your task, ensure you have:

- [ ] Implemented the tool/resource logic in a `*.tool.ts` or `*.resource.ts` file.
- [ ] Kept the `logic` function pure (no `try...catch`).
- [ ] Thrown a structured `McpError` for any failures within the logic.
- [ ] Applied authorization using `withToolAuth` or `withResourceAuth`.
- [ ] Used the `logger` with a `RequestContext` for all significant operations.
- [ ] Used the injected `StorageService` for all persistence needs.
- [ ] Registered the new definition in the corresponding `index.ts` barrel file.
- [ ] Added or updated tests in `tests/` and confirmed they pass with `bun test`.
- [ ] Run `bun run devcheck` to ensure code quality, formatting, and linting are correct.
- [ ] Smoke-test local transports with `bun run dev:stdio` or `bun run dev:http` (and `start:*` scripts post-build).
- [ ] Validate the Worker bundle (`bun run build:worker`) and `wrangler.toml` compatibility flags before shipping edge-impacting changes.
