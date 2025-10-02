# Agent Protocol & Architectural Mandate

**Version:** 2.3.2
**Target Project:** mcp-ts-template
**Last Updated:** 2025-10-02

This document defines the operational rules for contributing to this codebase. Follow it exactly.

> **Note on File Synchronization**: This file (`AGENTS.md`), along with `CLAUDE.md` and `.clinerules/AGENTS.md`, are hard-linked on the filesystem for tool compatibility (e.g., Cline does not work with symlinks). **Edit only the root `AGENTS.md`** – changes will automatically propagate to the other copies. DO NOT TOUCH THE OTHER COPIES AT ALL.

---

## I. Core Principles (Non‑Negotiable)

1.  **The Logic Throws, The Handler Catches**
    - **Your Task (Logic):**
      - **Tools:** Implement pure, stateless business logic inside the `logic` function of a `ToolDefinition`.
      - **Resources:** Implement pure, stateless read logic inside the `logic` function of a `ResourceDefinition`.
      - **Do not add `try...catch` in these logic functions.**
    - **On Failure:** You must throw `new McpError(...)` with the appropriate `JsonRpcErrorCode` and context.
    - **Framework’s Job (Handlers):**
      - **Tools** are wrapped by `createMcpToolHandler`, which creates the `RequestContext`, measures execution via `measureToolExecution`, formats the response, and is the only place that catches errors.
      - **Resources** are wrapped by `registerResource` (`resourceHandlerFactory`). The handler validates params, invokes logic, applies `responseFormatter` (defaulting to JSON), and catches errors.

2.  **Full‑Stack Observability**
    - **Tracing:** OpenTelemetry is preconfigured. Logs and errors are automatically correlated to traces.
    - **Performance:** `measureToolExecution` automatically records duration, success, payload sizes, and error codes for every tool call.
    - **No Manual Instrumentation:** Do not add custom spans in your logic. Use the provided utilities and structured logging. The framework handles the single wrapper span per tool invocation.

3.  **Structured, Traceable Operations**
    - Your logic functions will receive two context objects: `appContext` (for internal logging/tracing) and `sdkContext` (for SDK-level operations like Elicitation, Sampling, and Roots).
    - The `sdkContext` provides methods (like `elicitInput` and `createMessage`) for client interaction.
    - Pass the _same_ `appContext` through your internal call stack for continuity.
    - Use the global `logger` for all logging; include the `appContext` in every log call.

4.  **Decoupled Storage**
    - Never directly access persistence backends (`fs`, `supabase-js`, Worker KV/R2) from tool/resource logic.
    - **Always use the `StorageService`**, injected via DI, for all persistence.
    - The concrete storage provider is configured via environment variables and initialized at startup.

5.  **Local ↔ Edge Runtime Parity**
    - All features must work with both local transports (`bun run dev:stdio`, `bun run dev:http`) and the Worker bundle (`bun run build:worker` + `bunx wrangler dev`/`deploy`).
    - Guard non-portable dependencies so the bundle stays edge-compatible.
    - Prefer runtime-agnostic abstractions (Hono + `@hono/mcp`, Fetch APIs) to keep Bun/Node on localhost identical to Cloudflare Workers.

6.  **Use Elicitation for Missing Input**
    - If a tool requires a parameter that was not provided, use the `elicitInput` function from the `sdkContext`.
    - This allows the tool to interactively request the necessary information from the user instead of failing.
    - See `template_madlibs_elicitation.tool.ts` for a canonical example.

---

## II. Architectural Overview & Directory Structure

Separation of concerns maps directly to the filesystem. Always place files in their designated locations.

| Directory                                   | Purpose & Guidance                                                                                                                                                                                                                                                                                                                |
| :------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/mcp-server/tools/definitions/`**     | **MCP Tool definitions.** Add new capabilities here as `[tool-name].tool.ts`. Follow the **Tool Development Workflow**.                                                                                                                                                                                                           |
| **`src/mcp-server/resources/definitions/`** | **MCP Resource definitions.** Add data sources or contexts as `[resource-name].resource.ts`. Follow the **Resource Development Workflow**.                                                                                                                                                                                        |
| **`src/mcp-server/tools/utils/`**           | **Shared tool utilities,** including `ToolDefinition` and tool handler factory.                                                                                                                                                                                                                                                   |
| **`src/mcp-server/resources/utils/`**       | **Shared resource utilities,** including `ResourceDefinition` and resource handler factory.                                                                                                                                                                                                                                       |
| **`src/mcp-server/transports/`**            | **Transport implementations:**<br>- `http/` (Hono + `@hono/mcp` Streamable HTTP)<br>- `stdio/` (MCP spec stdio transport)<br>- `auth/` (strategies and helpers). HTTP mode can enforce JWT or OAuth. Stdio mode should not implement HTTP-based auth.                                                                             |
| **`src/services/`**                         | **External service integrations** following a consistent domain-driven pattern:<br>- Each service domain (e.g., `llm/`, `speech/`) contains: `core/` (interfaces, orchestrators), `providers/` (implementations), `types.ts`, and `index.ts`<br>- Use DI for all service dependencies. See **Service Development Pattern** below. |
| **`src/storage/`**                          | **Abstractions and provider implementations** (in-memory, filesystem, supabase, cloudflare-r2, cloudflare-kv).                                                                                                                                                                                                                    |
| **`src/container/`**                        | **Dependency Injection (`tsyringe`).** Service registration and tokens.                                                                                                                                                                                                                                                           |
| **`src/utils/`**                            | **Global utilities.** Includes logging, performance, parsing, network, security, and telemetry. Note: The error handling module is located at `src/utils/internal/error-handler/`.                                                                                                                                                |
| **`tests/`**                                | **Unit/integration tests.** Mirrors `src/` for easy navigation and includes compliance suites.                                                                                                                                                                                                                                    |

---

## III. Architectural Philosophy: Pragmatic SOLID

- **Single Responsibility:** Group code that changes together.
- **Open/Closed:** Prefer extension via abstractions (interfaces, plugins/middleware).
- **Liskov Substitution:** Subtypes must be substitutable without surprises.
- **Interface Segregation:** Keep interfaces small and focused.
- **Dependency Inversion:** Depend on abstractions (DI-managed services).

**Complementary principles:**

- **KISS:** Favor simplicity.
- **YAGNI:** Don’t build what you don’t need yet.
- **Composition over Inheritance:** Prefer composable modules.

---

## IV. Tool Development Workflow

This is the only approved workflow for authoring or modifying tools.

#### Step 1 — File Location

- Place new tools in `src/mcp-server/tools/definitions/`.
- Name files `[tool-name].tool.ts`.
- Use `src/mcp-server/tools/definitions/template-echo-message.tool.ts` as the reference template.

#### Step 2 — Define the ToolDefinition

Export a single `const` named `[toolName]Tool` of type `ToolDefinition` with:

- `name`: Programmatic tool name (`snake_case` is recommended).
- `title` (optional): Human-readable title for UIs.
- `description`: Clear, LLM-facing description of what the tool does.
- `inputSchema`: A `z.object({ ... })`. **Every field must have a `.describe()`**.
- `outputSchema`: A `z.object({ ... })` describing the successful output structure.
- `logic`: `async (input, appContext, sdkContext) => { ... }` pure business logic. No `try/catch` here. Throw `McpError` on failure.
- `annotations` (optional): UI/behavior hints such as `readOnlyHint`, `openWorldHint`, and others (flexible dictionary).
- `responseFormatter` (optional): Map successful output to `ContentBlock[]` for the LLM to consume. **CRITICAL**: The LLM receives this formatted output, not the raw result. Include all data the LLM needs to answer questions. Balance human-readable summaries with complete structured data. If omitted, a default JSON string is used.

#### Step 2.5 — Apply Authorization (Mandatory for most tools)

- Wrap `logic` with `withToolAuth`.
- **Example:**
  ```ts
  import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
  // ...
  logic: withToolAuth(['tool:echo:read'], yourToolLogic),
  ```

#### Step 3 — Register via Barrel Export

- Add your tool to `src/mcp-server/tools/definitions/index.ts` in `allToolDefinitions`.
- The DI container discovers and registers all tools from that array. No further registration is necessary.

---

### Response Formatter Best Practices

The `responseFormatter` function determines what the LLM receives. Follow these guidelines:

**❌ DO NOT:**

- Return only a summary with "Full details in structured output" (there is no separate structured output for the LLM)
- Omit critical data that the LLM needs to answer follow-up questions
- Assume the LLM can access the raw result object

**✅ DO:**

- Include both human-readable summaries AND complete data
- Structure output hierarchically (summary → details)
- Truncate extremely long fields (eligibility criteria, descriptions) but include key information
- For comparisons, show both commonalities/differences AND detailed breakdowns
- Use markdown formatting for clarity (headings, lists, code blocks)

**Examples:**

```typescript
// BAD: Summary only - LLM cannot answer detailed questions
function badFormatter(result: ComparisonOutput): ContentBlock[] {
  return [
    {
      type: 'text',
      text: 'Comparison complete. See structured output for details.',
    },
  ];
}

// GOOD: Summary + Details - LLM has everything it needs
function goodFormatter(result: ComparisonOutput): ContentBlock[] {
  const summary = `# Comparison of ${result.studies.length} Studies\n\n`;

  const commonalities =
    result.commonalities.length > 0
      ? `## Commonalities\n${result.commonalities.map((c) => `- ${c}`).join('\n')}\n\n`
      : '';

  const details = result.studies
    .map(
      (study) =>
        `### ${study.nctId}: ${study.title}\n\n` +
        `**Status:** ${study.status}\n` +
        `**Design:** ${study.design.type} | ${study.design.phases.join(', ')}\n` +
        `**Interventions:** ${study.interventions.map((i) => i.name).join(', ')}\n` +
        `**Primary Outcomes:**\n${study.outcomes.primary.map((o) => `- ${o.measure}`).join('\n')}`,
    )
    .join('\n\n---\n\n');

  return [{ type: 'text', text: `${summary}${commonalities}${details}` }];
}

// ALSO GOOD: Pure JSON for maximum flexibility
function jsonFormatter(result: ComparisonOutput): ContentBlock[] {
  return [{ type: 'text', text: JSON.stringify(result, null, 2) }];
}
```

**When to use each approach:**

- **Summary + Details**: Best for comparison tools, analysis tools, multi-entity responses
- **Pure JSON**: Best for single-entity fetches, when data structure is self-explanatory
- **Hybrid**: Use summary sections with selective detail inclusion for very large responses

---

#### Example Tool Definition:

```ts
/**
 * @fileoverview Complete, declarative definition for the 'template_echo_message' tool.
 * Emphasizes a clean, top‑down flow with configurable metadata at the top,
 * schema definitions next, pure logic, and finally the exported ToolDefinition.
 * @module src/mcp-server/tools/definitions/template-echo-message.tool
 */
import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type {
  SdkContext,
  ToolAnnotations,
  ToolDefinition,
} from '@/mcp-server/tools/utils/toolDefinition.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { type RequestContext, logger } from '@/utils/index.js';

/**
 * Programmatic tool name (must be unique).
 * Naming convention (recommended): <server-prefix>_<action>_<object>
 * - Use a short, stable server prefix for discoverability across servers.
 * - Use lowercase snake_case.
 * - Examples: 'template_echo_message', 'template_cat_fact'.
 */
const TOOL_NAME = 'template_echo_message';
/** --------------------------------------------------------- */

/** Human-readable title used by UIs. */
const TOOL_TITLE = 'Template Echo Message';
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
  'Echoes a message back with optional formatting and repetition.';
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
  idempotentHint: true,
  openWorldHint: false,
};
/** --------------------------------------------------------- */

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
async function echoToolLogic(
  input: EchoToolInput,
  appContext: RequestContext,
  _sdkContext: SdkContext,
): Promise<EchoToolResponse> {
  logger.debug('Processing echo message logic.', {
    ...appContext,
    toolInput: input,
  });

  if (input.message === TEST_ERROR_TRIGGER_MESSAGE) {
    const errorData: Record<string, unknown> = {
      requestId: appContext.requestId,
    };
    if (typeof (appContext as Record<string, unknown>).traceId === 'string') {
      errorData.traceId = (appContext as Record<string, unknown>)
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
    logic: withToolAuth(['tool:echo:read'], echoToolLogic),
    responseFormatter,
  };
```

---

## V. Resource Development Workflow

Resources mirror the tool pattern with a declarative `ResourceDefinition`. Use `src/mcp-server/resources/definitions/echo.resource.ts` as the reference template.

#### Step 1 — File Location

- Place new resources in `src/mcp-server/resources/definitions/`.
- Name files `[resource-name].resource.ts`.

#### Step 2 — Define the ResourceDefinition

Export a single `const` of type `ResourceDefinition` with:

- `name`: Unique programmatic resource name.
- `title` (optional): Human-readable title for UIs.
- `description`: Clear, LLM-facing description of what the resource returns.
- `uriTemplate`: A template like `echo://{message}`.
- `paramsSchema`: A `z.object({ ... })` for template/route params. **Every field must have a `.describe()`**.
- `outputSchema` (optional): A `z.object({ ... })` describing output.
- `mimeType` (optional): Default mime type for the response.
- `examples` (optional): Helpful discovery samples.
- `annotations` (optional): UI/behavior hints (flexible dictionary).
- `list` (optional): Provides `ListResourcesResult` for discovery.
- `logic`: `(uri, params, context) => { ... }` pure read logic. No `try/catch` here. Throw `McpError` on failure.
- `responseFormatter` (optional): `(result, { uri, mimeType }) => contents` array. If omitted, a default JSON formatter is used.

**Important:**

- The handler validates params via Zod before invoking `logic`.
- The `responseFormatter` must return an array of content blocks (`ReadResourceResult['contents']`). The handler performs a shallow validation (each item must be an object with a `uri`).
- Resource logic can be `async`; the handler `await`s it.

#### Step 2.5 — Apply Authorization

- Wrap `logic` with `withResourceAuth`.
- **Example:**
  ```ts
  import { withResourceAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
  // ...
  logic: withResourceAuth(['resource:echo:read'], yourResourceLogic),
  ```

#### Step 3 — Register via Barrel Export

- Add your resource to `src/mcp-server/resources/definitions/index.ts` in `allResourceDefinitions`.
- The DI container discovers and registers all resources from that array.

---

## VI. Service Development Pattern

All external service integrations (LLM providers, speech services, email, etc.) follow a consistent domain-driven architecture pattern.

#### Standard Service Structure

Every service domain follows this organization:

```
src/services/<service-name>/
├── core/                          # Interfaces and abstractions
│   ├── I<Service>Provider.ts     # Provider interface contract
│   └── <Service>Service.ts       # (Optional) Multi-provider orchestrator
├── providers/                     # Concrete implementations
│   ├── <provider-name>.provider.ts
│   └── ...
├── types.ts                       # Domain-specific types and DTOs
└── index.ts                       # Barrel export (public API)
```

#### When to Use a Service Orchestrator

Create a `<Service>Service.ts` class in `core/` when you need:

- **Multi-provider orchestration** (e.g., Speech uses different providers for TTS vs STT)
- **Provider routing logic** (e.g., fallback chains, load balancing)
- **Capability aggregation** (e.g., combined health checks)
- **Cross-provider state management**

If your service uses a **single provider pattern** (like LLM currently does), skip the service class and inject the provider directly via DI.

#### Example: Simple Single-Provider Pattern (LLM)

```typescript
// No service class needed - direct provider injection
@inject(LlmProvider) private llmProvider: ILlmProvider

await this.llmProvider.chatCompletion(params, context);
```

#### Example: Multi-Provider Orchestration (Speech)

```typescript
// Service class manages multiple providers
export class SpeechService {
  private ttsProvider?: ISpeechProvider;
  private sttProvider?: ISpeechProvider;

  getTTSProvider(): ISpeechProvider {
    /* ... */
  }
  getSTTProvider(): ISpeechProvider {
    /* ... */
  }
}
```

#### Provider Implementation Guidelines

1. **Interface compliance**: All providers implement `I<Service>Provider`
2. **DI-injectable**: Mark with `@injectable()` decorator
3. **Health checks**: Implement `healthCheck(): Promise<boolean>`
4. **Error handling**: Throw `McpError` for failures (no try/catch in provider logic)
5. **Naming convention**: `<provider-name>.provider.ts` (lowercase, kebab-case)

#### Adding a New Service Domain

1. Create directory: `src/services/<service-name>/`
2. Define interface: `core/I<Service>Provider.ts`
3. Implement provider(s): `providers/<name>.provider.ts`
4. Define types: `types.ts`
5. Create barrel export: `index.ts`
6. Register in DI: Add token to `src/container/tokens.ts`
7. Register service: Update `src/container/registrations/core.ts`

#### Existing Service Examples

- **`llm/`**: Single-provider pattern with direct DI injection
- **`speech/`**: Multi-provider orchestration with service class

---

## VII. Core Services & Utilities

#### DI-Managed Services (tokens in `src/container/tokens.ts`)

- **`ILlmProvider`**
  - **Token:** `LlmProvider`
  - **Usage:** `@inject(LlmProvider) private llmProvider: ILlmProvider`
- **`StorageService`**
  - **Token:** `StorageService`
  - **Usage:** `@inject(StorageService) private storage: StorageService`
  - **Note:** Requires `context.tenantId`; `StorageService` enforces presence and throws if missing.
- **`RateLimiter`**
  - **Token:** `RateLimiterService`
  - **Usage:** `@inject(RateLimiterService) private rateLimiter: RateLimiter`
- **`Logger`** (pino-backed singleton)
  - **Token:** `Logger`
  - **Usage (in injectable classes):** `@inject(Logger) private logger: typeof logger`
- **App Config**
  - **Token:** `AppConfig`
  - **Usage:** `@inject(AppConfig) private config: typeof configModule`
- **Supabase Admin Client** (only when needed)
  - **Token:** `SupabaseAdminClient`
  - **Usage:** `@inject(SupabaseAdminClient) private client: SupabaseClient<Database>`
- **Storage Provider** (for DI-only internal wiring)
  - **Token:** `StorageProvider`
  - **Usage:** This is injected into `StorageService` (do not inject provider in tools/resources).
- **`CreateMcpServerInstance`** (factory function)
  - **Token:** `CreateMcpServerInstance`
  - **Usage:** Resolved by the `TransportManager` to create/configure the `McpServer`.
- **`TransportManager`**
  - **Token:** `TransportManagerToken`
  - **Usage:** `@inject(TransportManagerToken) private transportManager: TransportManager`

#### Storage Providers (configured in `src/storage/core/storageFactory.ts`)

- Supported values (env `STORAGE_PROVIDER_TYPE`):
  - `in-memory` (default)
  - `filesystem` (requires `STORAGE_FILESYSTEM_PATH`, Node only)
  - `supabase` (requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`)
  - `cloudflare-r2` (Worker-only)
  - `cloudflare-kv` (Worker-only)
- In serverless environments (Workers), non-Cloudflare providers are forced to `in-memory`.
- **Always use `StorageService` from DI to interact with storage.**

#### Directly Imported Utilities (for function-style logic)

- `logger` from `src/utils/index.js`
- `requestContextService` from `src/utils/index.js`
- `ErrorHandler.tryCatch` from `src/utils/index.js` (NOT in tool/resource logic; OK in services or setup code)
- `sanitization` from `src/utils/index.js`
- `fetchWithTimeout` from `src/utils/index.js` (for robust network calls with timeouts)
- `measureToolExecution` from `src/utils/index.js` (used by handlers)
- `pdfParser` from `src/utils/index.js` (for creating, modifying, and parsing PDF documents)

#### Key Utilities (`src/utils/`)

The `src/utils/` directory contains a rich set of directly importable utilities for common tasks. Below is a summary of key modules.

| Module            | Description & Key Exports                                                                                                                                                                                                                                                                                                                     |
| :---------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`parsing/`**    | A suite of robust parsers for various data formats, designed to handle optional LLM `<think>` blocks. <br>- `csvParser`: For CSV data. <br>- `yamlParser`: For YAML data. <br>- `xmlParser`: For XML data. <br>- `jsonParser`: A hardened JSON parser. <br>- `pdfParser`: For creating, modifying, and parsing PDF documents using `pdf-lib`. |
| **`security/`**   | Utilities for enhancing application security. <br>- `sanitization`: For redacting sensitive data and validating inputs. <br>- `rateLimiter`: A DI-managed service for enforcing rate limits. <br>- `idGenerator`: For creating unique identifiers.                                                                                            |
| **`network/`**    | Networking helpers. <br>- `fetchWithTimeout`: A wrapper around `fetch` that includes a configurable timeout.                                                                                                                                                                                                                                  |
| **`scheduling/`** | Task scheduling utilities. <br>- `scheduler`: A wrapper around `node-cron` for managing scheduled jobs.                                                                                                                                                                                                                                       |
| **`internal/`**   | Core internal machinery. <br>- `logger`: The global Pino logger instance. <br>- `requestContextService`: The AsyncLocalStorage-based service for context propagation. <br>- `ErrorHandler`: The centralized error handling class. <br>- `performance`: Utilities for performance measurement, including `measureToolExecution`.               |
| **`telemetry/`**  | OpenTelemetry instrumentation and tracing helpers.                                                                                                                                                                                                                                                                                            |

---

## VIII. Authentication & Authorization

#### HTTP Transport (configurable)

- **Modes:** `MCP_AUTH_MODE` = `'none' | 'jwt' | 'oauth'`
- When not `'none'`, the HTTP `/mcp` endpoint requires a `Bearer` token:
  - **JWT mode** uses a local secret (`MCP_AUTH_SECRET_KEY`).
    - In production, the secret is required; startup fails otherwise.
    - In development without the secret, verification is bypassed for template usability and a dev-mode `AuthInfo` is provided using `DEV_MCP_CLIENT_ID` and `DEV_MCP_SCOPES` (or sane defaults).
  - **OAuth mode** verifies JSON Web Tokens via a remote JWKS:
    - Requires `OAUTH_ISSUER_URL` and `OAUTH_AUDIENCE`; optionally `OAUTH_JWKS_URI`.
- **Extracted claims:**
  - `clientId`: token claim `'cid'` or `'client_id'`
  - `scopes`: array claim `'scp'` or space-delimited string `'scope'`
  - `subject`: `'sub'` (optional)
  - `tenantId`: `'tid'` (optional; if present, it becomes `context.tenantId` via `requestContextService`)
- **Scope enforcement inside logic:**
  - **Always wrap tool/resource logic with `withToolAuth` or `withResourceAuth`.**
  - If no auth context exists (e.g., auth disabled), the scope check defaults to allowed for development usability.

#### STDIO Transport

- Follows MCP spec guidance: no HTTP-based auth flows over stdio.
- Authorization is expected to be handled by the host application controlling the process.

#### CORS and Endpoints

- CORS is enabled with allowed origins from `MCP_ALLOWED_ORIGINS` or `'*'` as fallback.
- `GET /healthz`: unprotected health endpoint.
- `GET /mcp`: unprotected endpoint returning server identity and config summary.
- `POST`/`OPTIONS` `/mcp`: JSON-RPC transport; protection enforced when auth mode is not `'none'`.

---

## IX. Transports & Server Lifecycle

#### `createMcpServerInstance` (`src/mcp-server/server.ts`)

- Initializes `RequestContext` global config.
- Creates `McpServer` with identity and capabilities (logging, `resources/tools listChanged`, **elicitation**, **sampling**, **prompts**, **roots**).
- Registers all capabilities via DI-managed registries.
- Returns a configured `McpServer`.

#### `TransportManager` (`src/mcp-server/transports/manager.ts`)

- Resolves the `CreateMcpServerInstance` factory to get a configured `McpServer`.
- Based on `MCP_TRANSPORT_TYPE`, it instantiates and manages the lifecycle of the appropriate transport (`http` or `stdio`).
- Handles graceful startup and shutdown of the active transport.

#### Worker (Edge)

- `worker.ts` adapts the same `McpServer` and Hono app to Cloudflare Workers.
- Sets a `serverless` flag to guide storage provider selection.
- Uses `requestContextService` and `logger` for structured, traceable startup.

---

## X. Code Style, Validation, and Security

- **JSDoc:** Every file must start with `@fileoverview` and `@module`. Exported APIs must be documented.
- **Validation:** All inputs are validated via Zod schemas. Ensure every field in schemas has a `.describe()`.
- **Logging:** Always include `RequestContext`; use `logger.debug/info/notice/warning/error/crit/emerg` appropriately.
- **Error Handling:** Logic throws `McpError`; handlers catch and standardize. Use `ErrorHandler.tryCatch` in services/infrastructure (not in tool/resource logic).
- **Secrets:** Access secrets only through `src/config/index.ts`. Never hard-code credentials.
- **Rate Limiting:** Use DI-injected `RateLimiter` where needed.
- **Telemetry:** Instrumentation is auto-initialized when enabled. Avoid manual spans.

---

## XI. Checks & Workflow Commands

Use scripts from `package.json`:

- `bun rebuild`: cleans and rebuilds; also clears logs. Run after dependency changes.
- `bun devcheck` or `bun run devcheck`: lint, format, typecheck, security. Use flags like `--no-fix`, `--no-lint`, `--no-audit` to tailor.
- `bun test`: run unit/integration tests.
- `bun run dev:stdio` / `bun run dev:http`: run server in development mode.
- `bun run start:stdio` / `bun run start:http`: run after build.
- `bun run build:worker`: build Cloudflare Worker bundle.

---

## XII. Configuration & Environment

- All configuration is validated via Zod in `src/config/index.ts`.
- Derives `serviceName` and `version` from `package.json` if not provided via env.
- **Key variables:**
  - **Transport:** `MCP_TRANSPORT_TYPE` (`'stdio'`|`'http'`), `MCP_HTTP_PORT/HOST/PATH`
  - **Auth:** `MCP_AUTH_MODE` (`'none'`|`'jwt'`|`'oauth'`), `MCP_AUTH_SECRET_KEY` (jwt), `OAUTH_*` (oauth)
  - **Storage:** `STORAGE_PROVIDER_TYPE` (`'in-memory'`|`'filesystem'`|`'supabase'`|`'cloudflare-r2'`|`'cloudflare-kv'`)
  - **LLM (OpenRouter):** `OPENROUTER_API_KEY`, `OPENROUTER_APP_URL`, `OPENROUTER_APP_NAME`, `LLM_DEFAULT_*` tuning
  - **Telemetry:** `OTEL_ENABLED`, `OTEL_SERVICE_NAME`, `OTEL_SERVICE_VERSION`, `OTEL_EXPORTER_OTLP_*`

---

## XIII. Local & Edge Targets

- **Local parity:** Ensure both stdio and HTTP transports run and behave identically for your feature.
- **Worker compatibility:** `bun run build:worker` and `wrangler dev --local` must succeed before merging.
- `wrangler.toml` should use a `compatibility_date` of `2025-09-01` or later and `nodejs_compat` enabled.

---

## XIV. Multi-Tenancy & Storage Context

### Storage Tenancy Requirements

**`StorageService` requires `context.tenantId`** and will throw `McpError` with `JsonRpcErrorCode.ConfigurationError` if it's missing.

### Automatic Tenancy (HTTP Transport with Auth)

When using HTTP transport with authentication enabled (`MCP_AUTH_MODE='jwt'` or `'oauth'`):

- The `tenantId` is automatically extracted from the JWT token claim `'tid'`
- It's propagated to `RequestContext` via `requestContextService.withAuthInfo()`
- All tool/resource invocations automatically receive the correct `tenantId`

**Example - Setting Default Tenant in STDIO:**

```typescript
// In your stdio transport setup
const context = requestContextService.createRequestContext({
  operation: 'connectStdioTransport',
  tenantId: 'default-tenant', // Explicitly provide tenant
});
```

**Troubleshooting:**

- **Error:** `"Storage operation requires a tenantId in the request context"`
- **Cause:** Attempting to use `StorageService` without a `tenantId`
- **Solution:** Apply one of the options above based on your use case

---

## XV. Quick Checklist

Before completing your task, ensure you have:

- [ ] Implemented tool/resource logic in a `*.tool.ts` or `*.resource.ts` file.
- [ ] Kept `logic` functions pure (no `try...catch`).
- [ ] Thrown `McpError` for failures within logic.
- [ ] Used `elicitInput` (for Elicitation) or `sdkContext.createMessage` (for Sampling) from `sdkContext` to request input/completions from the client.
- [ ] Applied authorization with `withToolAuth` or `withResourceAuth`.
- [ ] Used `logger` with `appContext` for all significant operations.
- [ ] Used `StorageService` (DI) for persistence.
- [ ] Registered definitions in the corresponding `index.ts` barrel files (Tools, Resources, Prompts).
- [ ] Added or updated tests (`bun test`).
- [ ] Ran `bun run devcheck` to ensure code quality.
- [ ] Smoke-tested local transports (`bun run dev:stdio`/`http`).
- [ ] Validated the Worker bundle (`bun run build:worker`).

That’s it. Follow this document precisely.
