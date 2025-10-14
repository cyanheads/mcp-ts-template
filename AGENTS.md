# Agent Protocol & Architectural Mandate

**Version:** 2.3.7
**Target Project:** mcp-ts-template

This document defines the operational rules for contributing to this codebase. Follow it exactly.

> **Note on File Synchronization**: `AGENTS.md` is symlinked to CLAUDE.md & `.clinerules/AGENTS.md` for consistency. Only edit the root `AGENTS.md` file. You do not have permission edit, touch, or change in any way the `CLAUDE.md` or `.clinerules/AGENTS.md` files.

> **Note for Developer**: Never assume anything. Always review related files, search for documentation, etc. when making changes. Always prefer reading the full file content to understand the full context. NEVER attempt to edit a file before reading the current content.

---

## I. Core Principles (Non‑Negotiable)

1.  **The Logic Throws, The Handler Catches**
    - Implement pure, stateless logic in `ToolDefinition`/`ResourceDefinition` `logic` functions. No `try...catch` in logic.
    - Throw `new McpError(...)` with appropriate `JsonRpcErrorCode` on failure.
    - Handlers (`createMcpToolHandler`, `resourceHandlerFactory`) create `RequestContext`, measure execution, format responses, and catch errors.

2.  **Full‑Stack Observability**
    - OpenTelemetry preconfigured. Logs/errors auto-correlated to traces. `measureToolExecution` records duration, success, payload sizes, error codes.
    - No manual instrumentation. Use provided utilities and structured logging. No direct console calls - use our logger.

3.  **Structured, Traceable Operations**
    - Logic receives `appContext` (logging/tracing) and `sdkContext` (Elicitation, Sampling, Roots operations).
    - Pass same `appContext` through call stack. Use global `logger` with `appContext` in every log.

4.  **Decoupled Storage**
    - Never access persistence backends directly. Always use DI-injected `StorageService`.

5.  **Local ↔ Edge Runtime Parity**
    - All features work with local transports (`stdio`/`http`) and Worker bundle (`build:worker` + `wrangler`).
    - Guard non-portable deps. Prefer runtime-agnostic abstractions (Hono + `@hono/mcp`, Fetch APIs).

6.  **Use Elicitation for Missing Input**
    - Use `sdkContext.elicitInput()` for missing params. See `template_madlibs_elicitation.tool.ts`.

---

## II. Architectural Overview & Directory Structure

> **📁 Repository Structure Reference**: For a complete visual tree of the codebase, see [docs/tree.md](docs/tree.md). This will help you understand the full directory layout and where to place your code.
>
> **⚠️ Architectural Discipline**: ALWAYS respect the established directory structure. New services go in `src/services/`, new tools in `src/mcp-server/tools/definitions/`, etc. Do not create top-level directories or place code in non-standard locations.

Separation of concerns maps directly to the filesystem. Always place files in their designated locations.

| Directory                                   | Purpose & Guidance                                                                                                                                                                                                                                                                                                                |
| :------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`src/mcp-server/tools/definitions/`**     | **MCP Tool definitions.** Add new capabilities here as `[tool-name].tool.ts`. Follow the **Tool Development Workflow**.                                                                                                                                                                                                           |
| **`src/mcp-server/resources/definitions/`** | **MCP Resource definitions.** Add data sources or contexts as `[resource-name].resource.ts`. Follow the **Resource Development Workflow**.                                                                                                                                                                                        |
| **`src/mcp-server/tools/utils/`**           | **Shared tool utilities:** Core tool infrastructure (`ToolDefinition`, `toolHandlerFactory`)                                                                                                                                                                                                                                      |
| **`src/mcp-server/resources/utils/`**       | **Shared resource utilities,** including `ResourceDefinition` and resource handler factory.                                                                                                                                                                                                                                       |
| **`src/mcp-server/transports/`**            | **Transport implementations:**<br>- `http/` (Hono + `@hono/mcp` Streamable HTTP)<br>- `stdio/` (MCP spec stdio transport)<br>- `auth/` (strategies and helpers). HTTP mode can enforce JWT or OAuth. Stdio mode should not implement HTTP-based auth.                                                                             |
| **`src/services/`**                         | **External service integrations** following a consistent domain-driven pattern:<br>- Each service domain (e.g., `llm/`, `speech/`) contains: `core/` (interfaces, orchestrators), `providers/` (implementations), `types.ts`, and `index.ts`<br>- Use DI for all service dependencies. See **Service Development Pattern** below. |
| **`src/storage/`**                          | **Abstractions and provider implementations** (in-memory, filesystem, supabase, cloudflare-r2, cloudflare-kv).                                                                                                                                                                                                                    |
| **`src/container/`**                        | **Dependency Injection (`tsyringe`).** Service registration and tokens.                                                                                                                                                                                                                                                           |
| **`src/utils/`**                            | **Global utilities.** Includes logging, performance, parsing, network, security, formatting, and telemetry. Note: The error handling module is located at `src/utils/internal/error-handler/`.                                                                                                                                    |
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

## IV. Tool & Resource Development Workflow

**Common Steps (Tools & Resources):**

1. **File Location**
   - **Tools:** `src/mcp-server/tools/definitions/[tool-name].tool.ts` (template: `template-echo-message.tool.ts`)
   - **Resources:** `src/mcp-server/resources/definitions/[resource-name].resource.ts` (template: `echo.resource.ts`)

2. **Define the ToolDefinition or ResourceDefinition**
   - Export single `const` of type `ToolDefinition<InputSchema, OutputSchema>` or `ResourceDefinition<ParamsSchema, OutputSchema>` with:
     - `name`, `title` (opt), `description`: Clear, LLM-facing descriptions
     - **Tools:** `inputSchema`/`outputSchema` as `z.object()`. **All fields need `.describe()`**.
     - **Resources:** `paramsSchema`/`outputSchema`, `uriTemplate`, `mimeType` (opt), `examples` (opt), `list()` (opt)
     - `logic`: Pure business logic function. No `try/catch`. Throw `McpError` on failure.
       - **Tools:** `async (input, appContext, sdkContext) => { ... }`
       - **Resources:** `(uri, params, context) => { ... }` (can be `async`)
     - `annotations` (opt): UI hints (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`)
     - `responseFormatter` (opt): Map result to `ContentBlock[]`. Default: JSON string.

3. **Apply Authorization**
   - Wrap `logic` with `withToolAuth` or `withResourceAuth`:
     ```ts
     import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
     logic: withToolAuth(['tool:echo:read'], yourLogic),
     ```

4. **Register via Barrel Export**
   - **Tools:** Add to `src/mcp-server/tools/definitions/index.ts` → `allToolDefinitions`
   - **Resources:** Add to `src/mcp-server/resources/definitions/index.ts` → `allResourceDefinitions`

**Example Tool Structure** (see `template-echo-message.tool.ts` for complete reference):

```ts
import type { ToolDefinition } from '@/mcp-server/tools/utils/index.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { z } from 'zod';

// Metadata constants
const TOOL_NAME = 'template_echo_message';
const TOOL_TITLE = 'Template Echo Message';
const TOOL_DESCRIPTION =
  'Echoes a message back with optional formatting and repetition.';
const TOOL_ANNOTATIONS = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

// Schemas (all fields must have .describe())
const InputSchema = z.object({
  message: z.string().min(1).max(1000).describe('The message to echo back.'),
  mode: z
    .enum(['standard', 'uppercase', 'lowercase'])
    .default('standard')
    .describe('Formatting mode.'),
  // ...
});
const OutputSchema = z.object({
  originalMessage: z.string().describe('The original message.'),
  // ...
});

// Pure logic function
async function echoToolLogic(input, appContext, sdkContext) {
  logger.debug('Processing echo message.', { ...appContext });
  // Business logic here (no try/catch, throw McpError on failure)
  return {
    /* result */
  };
}

// Optional response formatter
function responseFormatter(result): ContentBlock[] {
  return [{ type: 'text', text: `Echo: ${result.message}` }];
}

// Export definition
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

**Resource-Specific Notes:**

- Resources use `uriTemplate` (e.g., `echo://{message}`), `paramsSchema`, and optional `list()` for discovery
- Logic signature: `(uri: URL, params, context) => result` (can be `async`)
- See `echo.resource.ts` for complete example

**Resource Pagination:**

Resources that return large lists should implement pagination support per [MCP spec 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/utils/pagination). The `list()` function receives a `RequestHandlerExtra` parameter that provides access to the cursor for pagination.

Key pagination utilities (available from `@/utils/index.js`):

- `extractCursor(meta)`: Extract cursor from request metadata
- `paginateArray(items, cursor, defaultPageSize, maxPageSize, context)`: Paginate in-memory arrays
- `encodeCursor(state)` / `decodeCursor(cursor, context)`: Manual cursor encoding/decoding

**Important pagination notes:**

- Cursors are opaque strings - clients must not parse or construct them
- Page sizes are server-controlled - clients cannot specify size
- Invalid cursors throw `JsonRpcErrorCode.InvalidParams` (-32602)
- Use `nextCursor` conditionally - only include if more results exist
- See `src/utils/pagination/index.ts` for detailed implementation

---

## IV.A. Quick Start: Creating Your First Tool

**Follow these steps to add a new tool capability:**

- [ ] **1. Read the template**
  - Open and study: [src/mcp-server/tools/definitions/template-echo-message.tool.ts](src/mcp-server/tools/definitions/template-echo-message.tool.ts)
  - Understand the structure: metadata → schemas → logic → export

- [ ] **2. Create your tool file**
  - Location: `src/mcp-server/tools/definitions/[your-tool-name].tool.ts`
  - Use kebab-case naming (e.g., `my-custom-tool.tool.ts`)

- [ ] **3. Define metadata constants**

  ```ts
  const TOOL_NAME = 'your_tool_name'; // snake_case, unique
  const TOOL_TITLE = 'Your Tool Title'; // Human-readable
  const TOOL_DESCRIPTION = 'What it does...'; // LLM-facing, 1-2 sentences
  const TOOL_ANNOTATIONS = {
    // UI hints
    readOnlyHint: true, // No state changes?
    idempotentHint: true, // Same input = same output?
  };
  ```

- [ ] **4. Create Zod schemas**
  - Define `InputSchema` and `OutputSchema` as `z.object()`
  - **CRITICAL:** Every field must have `.describe('Clear description')`
  - Example: `z.string().min(1).describe('The message to process')`

- [ ] **5. Implement pure logic function**

  ```ts
  async function yourToolLogic(input, appContext, sdkContext) {
    logger.debug('Processing...', { ...appContext });

    // NO try/catch - handlers catch errors
    // Throw McpError on failure:
    // throw new McpError(JsonRpcErrorCode.InvalidParams, 'Reason');

    return {
      /* your result matching OutputSchema */
    };
  }
  ```

- [ ] **6. (Optional) Add response formatter**

  ```ts
  function responseFormatter(result): ContentBlock[] {
    return [{ type: 'text', text: `Result: ${result.data}` }];
  }
  ```

- [ ] **7. Wrap logic with authorization**

  ```ts
  import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';

  logic: withToolAuth(['tool:yourname:read'], yourToolLogic),
  ```

- [ ] **8. Export the ToolDefinition**

  ```ts
  export const yourTool: ToolDefinition<
    typeof InputSchema,
    typeof OutputSchema
  > = {
    name: TOOL_NAME,
    title: TOOL_TITLE,
    description: TOOL_DESCRIPTION,
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    annotations: TOOL_ANNOTATIONS,
    logic: withToolAuth(['tool:yourname:read'], yourToolLogic),
    responseFormatter, // optional
  };
  ```

- [ ] **9. Register in barrel export**
  - Open [src/mcp-server/tools/definitions/index.ts](src/mcp-server/tools/definitions/index.ts)
  - Import: `import { yourTool } from './your-tool-name.tool.js';`
  - Add to `allToolDefinitions` array

- [ ] **10. Run quality checks**

  ```bash
  bun devcheck
  ```

- [ ] **11. Test your tool**

  ```bash
  bun run dev:stdio    # or dev:http
  ```

  - Use an MCP client (Claude Desktop, Cline, etc.) to invoke your tool
  - Verify input validation, logic execution, and response format

**Need more details?** See the full workflow in Section IV and comprehensive checklist in Section XIV.

---

## V. Service Development Pattern

> **Architecture reminder:** All new services MUST be created in `src/services/[service-name]/` following the domain-driven pattern. See [docs/tree.md](docs/tree.md) for the complete structure.

**Structure:** `src/services/<service-name>/` contains `core/` (interfaces, optional orchestrator), `providers/` (implementations), `types.ts`, `index.ts`

**Single-Provider Pattern** (e.g., LLM): Direct DI injection `@inject(LlmProvider) private llmProvider: ILlmProvider`

**Multi-Provider Pattern** (e.g., Speech): Create `<Service>Service.ts` orchestrator when you need provider routing, capability aggregation, or cross-provider state.

**Provider Guidelines:**

1. Implement `I<Service>Provider`, mark `@injectable()`, provide `healthCheck(): Promise<boolean>`
2. Throw `McpError` for failures (no try/catch in provider logic)
3. Name: `<provider-name>.provider.ts` (kebab-case)

**Adding New Service:**

1. Create dir structure → 2. Define interface → 3. Implement providers → 4. Define types → 5. Barrel export → 6. Register DI token (`src/container/tokens.ts`) → 7. Register service (`src/container/registrations/core.ts`)

---

## VI. Core Services & Utilities

#### DI-Managed Services (tokens in `src/container/tokens.ts`)

| Service           | Token                   | Usage                                                                   | Notes                       |
| ----------------- | ----------------------- | ----------------------------------------------------------------------- | --------------------------- |
| `ILlmProvider`    | `LlmProvider`           | `@inject(LlmProvider) private llmProvider: ILlmProvider`                |                             |
| `StorageService`  | `StorageService`        | `@inject(StorageService) private storage: StorageService`               | Requires `context.tenantId` |
| `RateLimiter`     | `RateLimiterService`    | `@inject(RateLimiterService) private rateLimiter: RateLimiter`          |                             |
| `Logger`          | `Logger`                | `@inject(Logger) private logger: typeof logger`                         | Pino-backed singleton       |
| App Config        | `AppConfig`             | `@inject(AppConfig) private config: typeof configModule`                |                             |
| Supabase Client   | `SupabaseAdminClient`   | `@inject(SupabaseAdminClient) private client: SupabaseClient<Database>` | Only when needed            |
| Transport Manager | `TransportManagerToken` | `@inject(TransportManagerToken) private tm: TransportManager`           |                             |

**Storage Providers:** `STORAGE_PROVIDER_TYPE` = `in-memory` (default) \| `filesystem` (Node) \| `supabase` \| `cloudflare-r2/kv` (Worker). Always use `StorageService` from DI.

#### Directly Imported Utilities (`src/utils/`)

- `logger`, `requestContextService`, `sanitization`, `fetchWithTimeout`, `measureToolExecution`, `pdfParser`, `markdown()` from `@/utils/index.js`
- `ErrorHandler.tryCatch` (for services/setup code, NOT tool/resource logic)

#### Response Formatters

**Simple:** `const lines = [...].filter(Boolean); return [{ type: 'text', text: lines.join('\n') }];`
**Complex:** Use `markdown()` from `@/utils/index.js` for structured markdown (see `template-echo-message.tool.ts`)

#### Utils Modules (`src/utils/`)

| Module        | Key Exports                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `parsing/`    | `csvParser`, `yamlParser`, `xmlParser`, `jsonParser`, `pdfParser` (handles LLM `<think>` blocks) |
| `formatting/` | `MarkdownBuilder`, `markdown()` helper                                                           |
| `security/`   | `sanitization`, `rateLimiter`, `idGenerator`                                                     |
| `network/`    | `fetchWithTimeout`                                                                               |
| `scheduling/` | `scheduler` (node-cron wrapper)                                                                  |
| `internal/`   | `logger`, `requestContextService`, `ErrorHandler`, `performance`                                 |
| `telemetry/`  | OpenTelemetry instrumentation                                                                    |

---

## VII. Authentication & Authorization

**HTTP Transport:** `MCP_AUTH_MODE` = `none` \| `jwt` \| `oauth`

- **JWT:** Local secret (`MCP_AUTH_SECRET_KEY`). Dev mode bypasses verification if secret missing.
- **OAuth:** Remote JWKS verification. Requires `OAUTH_ISSUER_URL`, `OAUTH_AUDIENCE`, optional `OAUTH_JWKS_URI`.
- **Claims extracted:** `clientId` (`cid`/`client_id`), `scopes` (`scp`/`scope`), `subject` (`sub`), `tenantId` (`tid` → `context.tenantId`)
- **Scope enforcement:** Always wrap logic with `withToolAuth`/`withResourceAuth`. Defaults to allowed if auth disabled.

**STDIO Transport:** No HTTP-based auth. Authorization handled by host application.

**Endpoints:**

- `GET /healthz`, `GET /mcp`: Unprotected
- `POST`/`OPTIONS /mcp`: Protected when `MCP_AUTH_MODE != 'none'`
- CORS: `MCP_ALLOWED_ORIGINS` or `'*'`

---

## VIII. Transports & Server Lifecycle

- **`createMcpServerInstance`** (`src/mcp-server/server.ts`): Initializes `RequestContext`, creates `McpServer` with capabilities (logging, listChanged, elicitation, sampling, prompts, roots), registers all via DI.
- **`TransportManager`** (`src/mcp-server/transports/manager.ts`): Resolves factory, instantiates transport (`http`/`stdio`), handles lifecycle.
- **Worker** (`worker.ts`): Cloudflare Workers adapter with `serverless` flag for storage selection.

---

## IX. Code Style, Validation, and Security

- **JSDoc:** Every file needs `@fileoverview` and `@module`. Document exported APIs.
- **Validation:** Zod schemas for all inputs. Every field needs `.describe()`.
- **Logging:** Include `RequestContext`. Use `logger.debug/info/notice/warning/error/crit/emerg`.
- **Error Handling:** Logic throws `McpError`; handlers catch. Use `ErrorHandler.tryCatch` in services only.
- **Secrets:** Access via `src/config/index.ts` only. Never hard-code.
- **Rate Limiting:** Use DI-injected `RateLimiter`.
- **Telemetry:** Auto-initialized. No manual spans.

---

## X. Checks & Workflow Commands

| Command                    | Purpose                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `bun rebuild`              | Clean, rebuild, clear logs (after dep changes)                                                 |
| `bun devcheck`             | **USE OFTEN** Lint, format, typecheck, security (flags: `--no-fix`, `--no-lint`, `--no-audit`) |
| `bun test`                 | Unit/integration tests                                                                         |
| `bun run dev:stdio/http`   | Development mode                                                                               |
| `bun run start:stdio/http` | Production mode (after build)                                                                  |
| `bun run build:worker`     | Cloudflare Worker bundle                                                                       |

---

## XI. Configuration & Environment

All config validated via Zod in `src/config/index.ts`. Derives `serviceName`/`version` from `package.json`.

| Category      | Key Variables                                                                       |
| ------------- | ----------------------------------------------------------------------------------- |
| **Transport** | `MCP_TRANSPORT_TYPE` (`stdio`\|`http`), `MCP_HTTP_PORT/HOST/PATH`                   |
| **Auth**      | `MCP_AUTH_MODE` (`none`\|`jwt`\|`oauth`), `MCP_AUTH_SECRET_KEY`, `OAUTH_*`          |
| **Storage**   | `STORAGE_PROVIDER_TYPE` (`in-memory`\|`filesystem`\|`supabase`\|`cloudflare-r2/kv`) |
| **LLM**       | `OPENROUTER_API_KEY`, `OPENROUTER_APP_URL/NAME`, `LLM_DEFAULT_*`                    |
| **Telemetry** | `OTEL_ENABLED`, `OTEL_SERVICE_NAME/VERSION`, `OTEL_EXPORTER_OTLP_*`                 |

---

## XII. Local & Edge Targets

- **Local parity:** Both stdio/HTTP transports must work identically.
- **Worker compatibility:** `bun run build:worker` and `wrangler dev --local` must succeed.
- **wrangler.toml:** Use `compatibility_date` ≥ `2025-09-01` with `nodejs_compat`.

---

## XIII. Multi-Tenancy & Storage Context

**`StorageService` requires `context.tenantId`** (throws `McpError` if missing).

**HTTP with Auth:** `tenantId` auto-extracted from JWT claim `'tid'` → propagated via `requestContextService.withAuthInfo()`.

**STDIO:** Explicitly set tenant:

```typescript
const context = requestContextService.createRequestContext({
  operation: 'connectStdioTransport',
  tenantId: 'default-tenant',
});
```

---

## XIV. Quick Checklist

- [ ] Implement logic in `*.tool.ts`/`*.resource.ts` (pure, no `try...catch`, throw `McpError`)
- [ ] Run `bun devcheck`
- [ ] Apply auth with `withToolAuth`/`withResourceAuth`
- [ ] Use `logger` with `appContext`, `StorageService` (DI) for persistence
- [ ] Use `sdkContext.elicitInput()`/`createMessage()` for client interaction
- [ ] Run `bun devcheck`
- [ ] Register in `index.ts` barrel (Tools, Resources, Prompts)
- [ ] Add/update tests (`bun test`)
- [ ] Run `bun devcheck`
- [ ] Smoke-test local transports (`dev:stdio`/`http`)
- [ ] Validate Worker bundle (`build:worker`)

That's it. Follow this document precisely.
