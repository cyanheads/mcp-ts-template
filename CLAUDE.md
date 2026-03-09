# Agent Protocol

**Version:** 0.1.0-beta.1
**Project:** mcp-ts-template
**Updated:** 2026-03-09
**npm:** [mcp-ts-template](https://www.npmjs.com/package/mcp-ts-template)
**Docker:** [ghcr.io/cyanheads/mcp-ts-template](https://ghcr.io/cyanheads/mcp-ts-template)

> **Developer note:** Never assume. Read related files and docs before making changes. Read full file content for context. Never edit a file before reading it.

---

## Core Rules

**Logic throws, handlers catch.** Implement pure, stateless logic in `ToolDefinition`/`ResourceDefinition` `logic` functions. No `try...catch` in logic. Throw `new McpError(code, message, data)` with an appropriate `JsonRpcErrorCode` on failure. Handlers (`createMcpToolHandler`, `registerResource`) create `RequestContext`, measure execution, format responses, and catch errors.

**Full-stack observability.** OpenTelemetry is preconfigured. Logs and errors auto-correlate to traces. `measureToolExecution` records duration, success, payload sizes, error codes. No manual instrumentation — use provided utilities and structured logging. No direct `console` calls; use the logger.

**Structured, traceable operations.** Logic receives `appContext` (logging/tracing) and `sdkContext` (Elicitation, Sampling, Roots). Pass the same `appContext` through the call stack. Use global `logger` with `appContext` in every log.

**Decoupled storage.** Never access persistence backends directly. Use `StorageService` (constructed in `createApp()`). It provides built-in validation, opaque cursor pagination, and parallel batch operations. All inputs (tenant IDs, keys, prefixes) are validated before reaching providers.

**Local/edge runtime parity.** All features work with local transports (`stdio`/`http`) and Worker bundle (`build:worker` + `wrangler`). Guard non-portable deps using `runtimeCaps` from `@/utils/internal/runtime.js`. Prefer runtime-agnostic abstractions (Hono + `@hono/mcp`, Fetch APIs).

**Elicitation for missing input.** Use `sdkContext.elicitInput()` for missing params. See `template-madlibs-elicitation.tool.ts`.

---

## Directory Structure

See [docs/tree.md](docs/tree.md) for the complete visual tree. Respect the established layout — new services go in `src/services/`, new tools in `src/mcp-server/tools/definitions/`, etc. Don't create top-level directories or put code in non-standard locations.

| Directory                               | Purpose                                                                                                                                                                                                       |
| :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/mcp-server/tools/definitions/`     | **Tool definitions.** `[tool-name].tool.ts`. Variants: `.task-tool.ts` (async tasks), `.app-tool.ts` (UI-enabled).                                                                                            |
| `src/mcp-server/resources/definitions/` | **Resource definitions.** `[resource-name].resource.ts`. Variant: `.app-resource.ts` (linked UI).                                                                                                             |
| `src/mcp-server/prompts/definitions/`   | **Prompt definitions.** `[prompt-name].prompt.ts`.                                                                                                                                                            |
| `src/mcp-server/tools/utils/`           | Shared tool infrastructure (`ToolDefinition`, `toolHandlerFactory`).                                                                                                                                          |
| `src/mcp-server/resources/utils/`       | Shared resource utilities (`ResourceDefinition`, resource handler factory).                                                                                                                                   |
| `src/mcp-server/prompts/utils/`         | Shared prompt utilities (`PromptDefinition` type).                                                                                                                                                            |
| `src/mcp-server/roots/`                 | Roots capability registration. Tracks client-provided root URIs via `RootsRegistry`.                                                                                                                          |
| `src/mcp-server/tasks/`                 | Tasks API infrastructure (experimental). `TaskManager`, `TaskToolDefinition`. Task tool definitions go in `tools/definitions/` with `.task-tool.ts` suffix.                                                   |
| `src/mcp-server/transports/`            | Transport implementations: `http/` (Hono + `@hono/mcp` Streamable HTTP), `stdio/` (MCP spec stdio), `auth/` (strategies and helpers). HTTP can enforce JWT/OAuth. Stdio should not implement HTTP-based auth. |
| `src/config/`                           | Zod-validated config from environment variables. Derives `serviceName`/`version` from `package.json`.                                                                                                         |
| `src/types-global/`                     | Global type definitions shared across the codebase (`McpError`, `JsonRpcErrorCode`, etc.).                                                                                                                    |
| `src/services/`                         | External service integrations. Each domain (e.g. `llm/`, `speech/`, `graph/`) contains: `core/` (interfaces, orchestrators), `providers/` (implementations), `types.ts`.                                      |
| `src/storage/`                          | Storage abstractions and provider implementations (in-memory, filesystem, supabase, cloudflare).                                                                                                              |
| `src/app.ts`                            | Composition root. `createApp()` constructs all services in dependency order, returns `AppHandle` with `createServer` factory and `transportManager`.                                                          |
| `src/utils/`                            | Global utilities: logging, performance, parsing, network, security, formatting, telemetry. Error handling is at `src/utils/internal/error-handler/`.                                                          |
| `tests/`                                | Unit/integration tests. Mirrors `src/` layout. Includes compliance suites.                                                                                                                                    |

**File suffix conventions:**

| Suffix             | Meaning                                                 |
| :----------------- | :------------------------------------------------------ |
| `.tool.ts`         | Standard tool                                           |
| `.task-tool.ts`    | Async task tool                                         |
| `.app-tool.ts`     | UI-enabled tool (MCP Apps, links to `.app-resource.ts`) |
| `.resource.ts`     | Standard resource                                       |
| `.app-resource.ts` | UI resource linked to an app tool                       |
| `.prompt.ts`       | Prompt template                                         |

---

## Imports

**Direct file imports are the default.** Import from the specific file that defines the symbol, not from a barrel `index.ts`.

```ts
// Correct — import from the defining file
import type { ToolDefinition } from '@/mcp-server/tools/utils/toolDefinition.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { logger } from '@/utils/internal/logger.js';
import { markdown } from '@/utils/formatting/markdownBuilder.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

// Wrong — don't import through a barrel
import { logger } from '@/utils/index.js';
import type { ToolDefinition } from '@/mcp-server/tools/utils/index.js';
```

**Barrel files (`index.ts`) exist only for aggregation points** — places where collecting exports into a single array or namespace is the actual purpose:

| Barrel | Purpose |
| :--- | :--- |
| `src/mcp-server/tools/definitions/index.ts` | Collects `allToolDefinitions[]` for registration |
| `src/mcp-server/resources/definitions/index.ts` | Collects `allResourceDefinitions[]` for registration |
| `src/mcp-server/prompts/definitions/index.ts` | Collects `allPromptDefinitions[]` for registration |
| `src/config/index.ts` | Config public API |

Do not create new barrel files. Do not import from barrel files in tool/resource/prompt logic.

---

## Adding a Tool

Template: [template-echo-message.tool.ts](src/mcp-server/tools/definitions/template-echo-message.tool.ts)

**Steps:**

1. Create `src/mcp-server/tools/definitions/[your-tool-name].tool.ts` (kebab-case)
2. Define metadata: `TOOL_NAME` (snake_case), `TOOL_TITLE`, `TOOL_DESCRIPTION` (LLM-facing), `TOOL_ANNOTATIONS` (readOnly/idempotent hints)
3. Create `InputSchema`/`OutputSchema` as `z.object()` — all fields need `.describe()`
4. Implement logic: pure function `(input, appContext, sdkContext) => result` — no try/catch, throw `McpError` on failure
5. (Optional) Add response formatter: `(result) => ContentBlock[]`
6. Apply auth: wrap with `withToolAuth(['tool:name:read'], yourLogic)`
7. Export the `ToolDefinition` combining metadata, schemas, logic, formatter
8. Register in `allToolDefinitions` in [index.ts](src/mcp-server/tools/definitions/index.ts)
9. Run `bun run devcheck`
10. Smoke-test with `bun run dev:stdio` or `dev:http`

**Definition structure:**

Export a single `const` of type `ToolDefinition<InputSchema, OutputSchema>` with:

- `name`, `title` (opt), `description` — clear, LLM-facing
- `inputSchema`/`outputSchema` as `z.object()` — all fields need `.describe()`
- `logic` — pure business logic. `(input, appContext, sdkContext) => { ... }`
- `annotations` (opt) — UI hints: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`
- `responseFormatter` (opt) — map result to `ContentBlock[]`. Default: JSON string.

**Auth wrapper:**

```ts
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
logic: withToolAuth(['tool:echo:read'], yourLogic),
```

---

## Adding a Task Tool

Task tools enable long-running async operations using the MCP Tasks API — a "call-now, fetch-later" pattern where clients poll for status and retrieve results.

> Tasks API is part of the [MCP spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks) as an experimental capability and may change.

Template: [template-async-countdown.task-tool.ts](src/mcp-server/tools/definitions/template-async-countdown.task-tool.ts)

**Steps:**

1. Create `src/mcp-server/tools/definitions/[name].task-tool.ts` (note the `.task-tool.ts` suffix)
2. Define `InputSchema` and optional `OutputSchema`
3. Implement task handlers:
   ```typescript
   taskHandlers: {
     createTask: async (args, extra) => {
       const task = await extra.taskStore.createTask({ ttl: 120000, pollInterval: 1000 });
       startBackgroundWork(task.taskId, args, extra.taskStore);
       return { task };
     },
     getTask: async (_args, extra) => {
       return await extra.taskStore.getTask(extra.taskId);
     },
     getTaskResult: async (_args, extra) => {
       return await extra.taskStore.getTaskResult(extra.taskId) as CallToolResult;
     }
   }
   ```
4. Set execution mode: `execution: { taskSupport: 'required' }` or `'optional'`
5. Export as `TaskToolDefinition` (import from `@/mcp-server/tasks/utils/taskToolDefinition.js`)
6. Register in `allToolDefinitions` in [index.ts](src/mcp-server/tools/definitions/index.ts)

**Key concepts:**

- `RequestTaskStore` provides `createTask`, `getTask`, `storeTaskResult`, `getTaskResult`, `updateTaskStatus`
- Background work updates status via `taskStore.updateTaskStatus(taskId, 'working', 'message...')`
- Terminal states: `completed`, `failed`, `cancelled` — use `storeTaskResult` for completion
- Task tools are auto-detected by `isTaskToolDefinition()` and registered via `server.experimental.tasks.registerToolTask()`

---

## Adding a Prompt

Prompts are reusable message templates that clients can discover and invoke. Simpler than tools — no `logic`/`appContext`/`sdkContext`, no auth wrappers.

Template: [code-review.prompt.ts](src/mcp-server/prompts/definitions/code-review.prompt.ts)

**Steps:**

1. Create `src/mcp-server/prompts/definitions/[your-prompt-name].prompt.ts` (kebab-case)
2. Define metadata: `PROMPT_NAME` (snake_case), `PROMPT_DESCRIPTION` (user-facing)
3. (Optional) Create `ArgumentsSchema` as `z.object()` — all fields need `.describe()`
4. Implement `generate`: `(args) => PromptMessage[]` — returns array of `{ role, content }` messages (can be `async`)
5. Export: `export const myPrompt: PromptDefinition<typeof ArgumentsSchema> = { name, description, argumentsSchema, generate }`
6. Register in `allPromptDefinitions` in [index.ts](src/mcp-server/prompts/definitions/index.ts)
7. Run `bun run devcheck`

---

## Adding a Resource

Template: [echo.resource.ts](src/mcp-server/resources/definitions/echo.resource.ts)

Export a single `const` of type `ResourceDefinition<ParamsSchema, OutputSchema>` with:

- `name`, `title` (opt), `description` — clear, LLM-facing
- `uriTemplate` (e.g. `echo://{message}`), `paramsSchema`/`outputSchema`
- `mimeType` (opt), `examples` (opt), `list()` (opt) for discovery
- `logic`: `(uri: URL, params, context: RequestContext) => result` (can be `async`)
- `annotations` (opt), `responseFormatter` (opt)

**Auth:** wrap with `withResourceAuth`.

**Register** in `allResourceDefinitions` in [index.ts](src/mcp-server/resources/definitions/index.ts).

**Note:** `list()` has a different signature from `logic`: `(extra: RequestHandlerExtra) => ListResourcesResult` — receives `extra._meta?.cursor` for pagination, not `RequestContext`.

**Pagination:** Resources returning large lists must implement pagination per [MCP spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/utils/pagination). Use `extractCursor(meta)`, `paginateArray(...)` from `@/utils/pagination/pagination.js`. Storage providers: use `encodeCursor`/`decodeCursor` from `@/storage/core/storageValidation.js` for tenant-bound cursors. Cursors are opaque; invalid cursors throw `JsonRpcErrorCode.InvalidParams` (-32602). Include `nextCursor` only when more results exist.

---

## Adding a Service

All services live in `src/services/[service-name]/` with `core/` (interfaces), `providers/` (implementations), `types.ts`. See [docs/tree.md](docs/tree.md).

**Patterns:**

- Single-provider (e.g. LLM) — inject via constructor
- Multi-provider (e.g. Speech) — create orchestrator for routing/aggregation

**Provider requirements:** implement `I<Service>Provider`, add `healthCheck()`, throw `McpError` on failure, name as `<name>.provider.ts`.

**Sequence:** directory structure, interface, providers, types. Construct the service in `src/app.ts` `createApp()` if it's a core dependency, or use the init/accessor pattern for server-specific services.

---

## Context Objects

Tool logic receives two context objects. They serve different purposes and should not be confused.

### appContext (`RequestContext`)

Defined in `@/utils/internal/requestContext.js`. Carries tracing and identity data for the current request.

| Field | Type | Description |
| :--- | :--- | :--- |
| `requestId` | `string` | Unique request ID for log correlation |
| `timestamp` | `string` | ISO 8601 creation time |
| `tenantId` | `string?` | Tenant ID (from auth or explicit) |
| `traceId` | `string?` | OpenTelemetry trace ID (auto-injected) |
| `spanId` | `string?` | OpenTelemetry span ID (auto-injected) |
| `operation` | `string?` | Descriptive name of the operation |
| `auth` | `AuthContext?` | Auth data when request is authenticated (`sub`, `clientId`, `scopes`, `token`, `tenantId`) |

**Usage in logic:**

```ts
// Spread into every log call for correlation
logger.debug('Processing request', { ...appContext, toolInput: input });

// Attach to error data for traceability
throw new McpError(JsonRpcErrorCode.NotFound, 'Item not found', {
  requestId: appContext.requestId,
});
```

### sdkContext (`SdkContext`)

Type alias for `RequestHandlerExtra<ServerRequest, ServerNotification>` from the MCP SDK. Provides protocol-level capabilities.

**Base fields (always available):**

- `signal` — `AbortSignal` for request cancellation
- `sendNotification` — send notifications to the client
- `sendRequest` — send requests to the client
- `authInfo` — raw auth info from transport

**Optional capabilities (duck-typed):**

Not all clients support all features. Check for capability presence at runtime using type guards:

```ts
// Elicitation — ask the client for missing input
type ElicitableSdkContext = SdkContext & {
  elicitInput: (args: { message: string; schema: unknown }) => Promise<unknown>;
};
function hasElicitInput(ctx: SdkContext): ctx is ElicitableSdkContext {
  return typeof (ctx as ElicitableSdkContext)?.elicitInput === 'function';
}

// Sampling — request LLM completion from the client
type SamplingSdkContext = SdkContext & {
  createMessage: (args: {
    messages: Array<{ role: string; content: unknown }>;
    maxTokens?: number;
    temperature?: number;
    modelPreferences?: { hints?: Array<{ name?: string }> };
  }) => Promise<{ role: string; content: unknown; model: string; stopReason?: string }>;
};
function hasSamplingCapability(ctx: SdkContext): ctx is SamplingSdkContext {
  return typeof (ctx as SamplingSdkContext)?.createMessage === 'function';
}
```

See `template-madlibs-elicitation.tool.ts` (elicitation) and `template-code-review-sampling.tool.ts` (sampling) for complete examples.

---

## Error Handling

`McpError` and `JsonRpcErrorCode` are defined in `@/types-global/errors.js`.

```ts
throw new McpError(JsonRpcErrorCode.InvalidParams, 'Missing required field: name', {
  requestId: appContext.requestId,
  field: 'name',
});
```

### Error Codes

| Code | Value | When to Use |
| :--- | ----: | :--- |
| `InvalidParams` | -32602 | Bad input, missing required fields, schema validation failure |
| `InvalidRequest` | -32600 | Unsupported operation, missing client capability |
| `NotFound` | -32001 | Resource, entity, or record doesn't exist |
| `Forbidden` | -32005 | Authenticated but insufficient scopes/permissions |
| `Unauthorized` | -32006 | No auth, invalid token, expired credentials |
| `RateLimited` | -32003 | Rate limit exceeded |
| `ServiceUnavailable` | -32000 | External dependency down, upstream failure |
| `Timeout` | -32004 | Operation exceeded time limit |
| `ConfigurationError` | -32008 | Missing env var, invalid config |
| `ValidationError` | -32007 | Business rule violation (not schema — use `InvalidParams` for that) |
| `Conflict` | -32002 | Duplicate key, version mismatch, concurrent modification |
| `InitializationFailed` | -32009 | Server/component startup failure |
| `DatabaseError` | -32010 | Storage/persistence layer failure |
| `InternalError` | -32603 | Unexpected failure, catch-all for programmer errors |

### Where Errors Are Handled

| Layer | Pattern |
| :--- | :--- |
| Tool/resource logic | Throw `McpError` — no try/catch |
| Handlers (toolHandlerFactory, resourceHandlerFactory) | Catch all errors, normalize to `McpError`, set `isError: true` |
| Services/setup code | `ErrorHandler.tryCatch` for graceful recovery |

---

## Response Formatters

The `responseFormatter` on a `ToolDefinition` maps structured output to `ContentBlock[]` for the client. If omitted, the handler JSON-stringifies the output.

**Common patterns:**

```ts
// Simple text
responseFormatter: (result) => [{ type: 'text', text: result.message }],

// MarkdownBuilder for conditional/structured content
import { markdown } from '@/utils/formatting/markdownBuilder.js';
responseFormatter: (result) => {
  const md = markdown()
    .text(`# ${result.title}\n`)
    .text(result.body);
  md.when(!!result.footer, () => { md.text(`\n---\n${result.footer}`); });
  return [{ type: 'text', text: md.build() }];
},

// Image content
responseFormatter: (result) => [{ type: 'image', data: result.data, mimeType: result.mimeType }],

// Multi-block (human summary + structured JSON)
responseFormatter: (result) => [
  { type: 'text', text: result.summary },
  { type: 'text', text: JSON.stringify(result.details, null, 2) },
],
```

Additional formatters: `diffFormatter`, `tableFormatter`, `treeFormatter` from `@/utils/formatting/`.

---

## Testing

**Framework:** Vitest. Tests mirror the `src/` layout under `tests/`.

### Testing Tool Logic

Test the `logic` function directly — not via transport. Parse input through the schema first.

```ts
import { describe, expect, it, vi } from 'vitest';
import { requestContextService } from '@/utils/internal/requestContext.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { myTool } from '@/mcp-server/tools/definitions/my-tool.tool.js';

// Minimal sdkContext mock — add optional capabilities only when testing them
const mockSdkContext = {
  signal: new AbortController().signal,
  requestId: 'test-request-id',
  sendNotification: vi.fn(),
  sendRequest: vi.fn(),
};

describe('myTool', () => {
  it('returns expected output', async () => {
    const appContext = requestContextService.createRequestContext();
    const input = myTool.inputSchema.parse({ message: 'hello' });
    const result = await myTool.logic(input, appContext, mockSdkContext);
    expect(result.someField).toBe('expected');
  });

  it('throws McpError on invalid state', async () => {
    const appContext = requestContextService.createRequestContext();
    const input = myTool.inputSchema.parse({ message: 'TRIGGER_ERROR' });
    await expect(myTool.logic(input, appContext, mockSdkContext))
      .rejects.toThrow(McpError);
    await expect(myTool.logic(input, appContext, mockSdkContext))
      .rejects.toHaveProperty('code', JsonRpcErrorCode.ValidationError);
  });

  it('formats response correctly', () => {
    const result = { /* mock output matching OutputSchema */ };
    const blocks = myTool.responseFormatter?.(result);
    expect(blocks).toBeDefined();
    expect(blocks![0].type).toBe('text');
  });
});
```

### Testing Optional SDK Capabilities

```ts
// Add createMessage for sampling tests
const mockSdkContextWithSampling = {
  ...mockSdkContext,
  createMessage: vi.fn().mockResolvedValue({
    role: 'assistant',
    content: { type: 'text', text: 'LLM response' },
    model: 'test-model',
  }),
};

// Without capability — should throw or degrade gracefully
const mockSdkContextWithoutSampling = { ...mockSdkContext };
```

### Test Isolation

Construct dependencies directly in `beforeEach`. For storage-dependent tests, use `new StorageService(new InMemoryProvider())`. For server tests, pass mock deps to `createMcpServerInstance()` via the `McpServerDeps` interface.

---

## Application Wiring

All services are constructed directly in `src/app.ts` via `createApp()`. No DI container, no tokens, no registration/resolution indirection.

### `createApp()` → `AppHandle`

```ts
import { createApp, type AppHandle } from '@/app.js';

const { createServer, transportManager }: AppHandle = createApp();
```

**Construction order** (inside `createApp()`):

1. **Config** — lazy proxy, parsed on first property access
2. **Supabase client** — only when `storage.providerType === 'supabase'`
3. **StorageProvider** → **StorageService**
4. **Registries** — `ToolRegistry`, `ResourceRegistry`, `PromptRegistry`, `RootsRegistry` (from imported definition arrays)
5. **TaskManager** — receives config + storageService
6. **Server factory** — `createServer()` closure that calls `createMcpServerInstance(deps)` with all registries
7. **TransportManager** — receives config, logger, createServer factory, taskManager

### `McpServerDeps`

`createMcpServerInstance()` in `src/mcp-server/server.ts` accepts an explicit deps struct:

```ts
export interface McpServerDeps {
  config: AppConfig;
  promptRegistry: PromptRegistry;
  resourceRegistry: ResourceRegistry;
  rootsRegistry: RootsRegistry;
  toolRegistry: ToolRegistry;
}
```

### Entry points

| Entry | Usage |
| :--- | :--- |
| `src/index.ts` | `const { transportManager } = createApp()` — then `transportManager.start()` |
| `src/worker.ts` | `const { createServer } = createApp()` — passed to `createHttpApp(createServer, ctx)` |
| Tests (conformance) | `const { createServer } = createApp()` — server connected via `InMemoryTransport` |

---

## Utilities

### Common Imports for Tool Logic

```ts
import { logger } from '@/utils/internal/logger.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';
import { requestContextService } from '@/utils/internal/requestContext.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { markdown } from '@/utils/formatting/markdownBuilder.js';
import { fetchWithTimeout } from '@/utils/network/fetchWithTimeout.js';
import { sanitization } from '@/utils/security/sanitization.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
```

### Utils Modules

| Module | Key Exports |
| :--- | :--- |
| `parsing/` | `csvParser`, `yamlParser`, `xmlParser`, `jsonParser`, `pdfParser`, `frontmatterParser` (handles LLM `<think>` blocks) |
| `formatting/` | `MarkdownBuilder`, `markdown()` helper, `diffFormatter`, `tableFormatter`, `treeFormatter` |
| `security/` | `sanitization`, `rateLimiter`, `idGenerator` |
| `network/` | `fetchWithTimeout` |
| `scheduling/` | `scheduler` (node-cron wrapper) |
| `pagination/` | `extractCursor`, `paginateArray` |
| `internal/` | `logger`, `requestContextService`, `ErrorHandler`, `performance`, `runtimeCaps`, `encoding` |
| `types/` | `isErrorWithCode`, `isRecord` (type guard utilities) |
| `telemetry/` | OpenTelemetry instrumentation |

All imports use direct file paths: `@/utils/<module>/<file>.js`.

### Storage

`STORAGE_PROVIDER_TYPE` = `in-memory` | `filesystem` | `supabase` | `cloudflare-r2` | `cloudflare-kv` | `cloudflare-d1`

Use `StorageService` (constructed in `createApp()`). Features: input validation, parallel batch ops (`getMany`/`setMany`/`deleteMany`), secure tenant-bound pagination, TTL support. See [storage docs](src/storage/README.md).

---

## Auth

**HTTP mode:** `MCP_AUTH_MODE` = `none` | `jwt` | `oauth`

- JWT: local secret (`MCP_AUTH_SECRET_KEY`), dev bypasses if missing
- OAuth: JWKS verification (`OAUTH_ISSUER_URL`, `OAUTH_AUDIENCE`, opt `OAUTH_JWKS_URI`)
- Claims: `clientId` (cid/client_id), `scopes` (scp/scope), `sub`, `tenantId` (tid → context.tenantId)
- Wrap logic with `withToolAuth`/`withResourceAuth` (defaults allowed if auth disabled)

**STDIO mode:** No HTTP auth. Host handles authorization.

**Endpoints:**

- Unprotected: `/healthz`, `GET /mcp`
- Protected (when auth enabled): `POST /mcp`, `OPTIONS /mcp`
- CORS: `MCP_ALLOWED_ORIGINS` or `*`

---

## Transports & Lifecycle

- `createMcpServerInstance(deps)` (`server.ts`): accepts `McpServerDeps`, creates server with declared capabilities (`logging`, `resources`/`tools`/`prompts` with `listChanged`, `tasks` with list/cancel/requests)
- Elicitation, sampling, and roots are SDK context features available to tool logic via `sdkContext`, not declared server capabilities
- `TransportManager` (`transports/manager.ts`): receives `createServer` factory, config, logger, and `taskManager` as constructor params. Instantiates transport and handles lifecycle.
- Worker (`worker.ts`): Cloudflare adapter with `serverless` flag. Uses `createApp()` to get server factory.

**Local/edge parity:** stdio and HTTP transports work identically. Worker: `build:worker` + `wrangler dev --local` must succeed. `wrangler.toml`: `compatibility_date` >= `2025-09-01`, `nodejs_compat`.

---

## Cloudflare Workers

Entry point: `src/worker.ts`. Exports standard Workers `{ fetch, scheduled }` object.

**Key design points:**

- Singleton app promise — cached after first `initializeApp()`, reset to `null` on failure for retry
- `injectEnvVars(env)` maps CF binding strings into `process.env` so config works unchanged across runtimes
- `storeBindings(env)` writes `KV_NAMESPACE`, `R2_BUCKET`, `DB`, `AI` onto `globalThis` for CF storage providers
- Bindings refreshed per-request — CF may rotate binding references between requests in the same isolate
- Per-request `McpServer` — factory pattern, not a shared instance (security fix: SDK GHSA-345p-7cg4-v4c7)

**Runtime compatibility:**

| Guard | Location | Purpose |
| :--- | :--- | :--- |
| `runtimeCaps` | `@/utils/internal/runtime.js` | Feature detection: `isNode`, `isWorkerLike`, `hasBuffer`, etc. |
| Serverless whitelist | `storageFactory.ts` | Only `in-memory`, `cloudflare-r2`, `cloudflare-kv`, `cloudflare-d1` in Workers; others fall back to `in-memory` |
| `IS_SERVERLESS` flag | `worker.ts` | Set on `process.env` (or `globalThis` if `process` absent) before `createApp()` |

**Non-portable deps:** `filesystem` and `supabase` storage providers. Gated by the serverless whitelist — won't load in Workers.

**Config:** `wrangler.toml` requires `compatibility_flags = ["nodejs_compat"]` and `compatibility_date >= "2025-09-01"`.

---

## Multi-Tenancy

`StorageService` requires `context.tenantId` (throws if missing).

**Tenant ID validation:** max 128 chars, alphanumeric/hyphens/underscores/dots only, start/end alphanumeric, no path traversal (`../`), no consecutive dots.

**HTTP with auth:** `tenantId` auto-extracted from JWT `'tid'` claim, propagated via `requestContextService.withAuthInfo(authInfo)`. Context includes: `{ requestId, timestamp, tenantId, auth: { sub, clientId, scopes, token, tenantId } }`.

**STDIO:** explicitly set tenant via `requestContextService.createRequestContext({ operation, tenantId })`.

---

## Code Style

- **JSDoc:** `@fileoverview` and `@module` required on every file
- **Validation:** Zod schemas, all fields need `.describe()`
- **Logging:** include `appContext` spread, use `logger.{debug|info|notice|warning|error|crit|emerg}`
- **Errors:** logic throws `McpError`, handlers catch. `ErrorHandler.tryCatch` for services only.
- **Secrets:** `src/config/index.ts` only
- **Rate limiting:** `RateLimiter` from `@/utils/security/rateLimiter.js`
- **Telemetry:** auto-init, no manual spans
- **Imports:** direct file imports everywhere. Barrels only for aggregation (see [Imports](#imports)).
- **No fabricated signal:** Don't invent synthetic scores, composite metrics, or calculated "confidence percentages" from arbitrary weights. They look authoritative but are epistemically empty and mislead both users and AI agents. Surface real signal: actual API scores, direct measurements, factual orderings with interpretable criteria. If ranking/sorting, use transparent rules and document them.

---

## Git Safety

**NEVER use `git stash`.** Not in the orchestrator, not in subagents, not for "quick checks", not for any reason. `git stash` silently moves uncommitted work out of the working tree and risks data loss. If you need to see the state of committed code, use `git show`, `git diff`, or read-only git commands. If you need to test something against the committed state, use a worktree.

**NEVER use destructive git commands** (`git reset --hard`, `git checkout -- .`, `git restore .`, `git clean -f`) unless the user explicitly requests them. These destroy uncommitted work.

**Read-only git is always safe.** `git status`, `git diff`, `git log`, `git show`, `git blame` — use freely.

---

## Git Commits

Use plain strings for commit messages. Never use heredoc syntax (`cat <<'EOF'`) or command substitution (`$(...)`) in commit messages.

**Correct:**

```bash
git commit -m "feat(auth): add JWT validation middleware

- Implemented token verification with exp claim validation
- Added support for RS256 and HS256 algorithms
- Includes comprehensive error handling"
```

**Wrong:**

```bash
# Do not use cat/heredoc/command substitution
git commit -m "$(cat <<'EOF'
feat(auth): add JWT validation
EOF
)"
```

**Format:** [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix             | Use                                |
| :----------------- | :--------------------------------- |
| `feat(scope):`     | New feature                        |
| `fix(scope):`      | Bug fix                            |
| `refactor(scope):` | Code refactoring                   |
| `chore(scope):`    | Maintenance (deps, config)         |
| `docs(scope):`     | Documentation                      |
| `test(scope):`     | Test additions/updates             |
| `build(scope):`    | Build system or dependency changes |

Group related changes into atomic commits. Use `filesToStage` to control which files are included.

---

## Commands

| Command                    | Purpose                                                                                                             |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| `bun run rebuild`          | Clean, rebuild, clear logs (after dep changes)                                                                      |
| `bun run devcheck`         | **Use often.** Lint, format, typecheck, security (opt-out: `--no-fix`, `--no-lint`, `--no-audit`; opt-in: `--test`) |
| `bun run test`             | Unit/integration tests                                                                                              |
| `bun run dev:stdio/http`   | Development mode                                                                                                    |
| `bun run start:stdio/http` | Production mode (after build)                                                                                       |
| `bun run build:worker`     | Cloudflare Worker bundle                                                                                            |

---

## Publishing

After a version bump and final commit, publish to npm, GHCR, and the MCP Registry:

```bash
bun publish --access public

docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/cyanheads/mcp-ts-template:<version> \
  -t ghcr.io/cyanheads/mcp-ts-template:latest \
  --push .

mcp-publisher publish
```

Remind the user to run these after completing a release flow.

---

## Configuration

All config validated via Zod in `src/config/index.ts`. Config module derives `mcpServerName`/`mcpServerVersion` from `package.json` (overridable via `MCP_SERVER_NAME`/`MCP_SERVER_VERSION` env vars).

| Category  | Key Variables                                                                                                      |
| :-------- | :----------------------------------------------------------------------------------------------------------------- |
| Transport | `MCP_TRANSPORT_TYPE` (`stdio`\|`http`), `MCP_HTTP_PORT`, `MCP_HTTP_HOST`, `MCP_HTTP_ENDPOINT_PATH`                 |
| Auth      | `MCP_AUTH_MODE` (`none`\|`jwt`\|`oauth`), `MCP_AUTH_SECRET_KEY`, `OAUTH_*`                                         |
| Storage   | `STORAGE_PROVIDER_TYPE` (`in-memory`\|`filesystem`\|`supabase`\|`cloudflare-r2`\|`cloudflare-kv`\|`cloudflare-d1`) |
| LLM       | `OPENROUTER_API_KEY`, `OPENROUTER_APP_URL/NAME`, `LLM_DEFAULT_*`                                                   |
| Telemetry | `OTEL_ENABLED`, `OTEL_SERVICE_NAME/VERSION`, `OTEL_EXPORTER_OTLP_*`                                                |

---

## Code Navigation

**LSP tools are deferred — you must load them before use.** Run `ToolSearch` with query `"select:LSP"` at the start of any task involving code navigation, refactoring, or understanding type relationships. Do this **before** reaching for Grep/Glob. LSP tools provide language-aware intelligence (types, scopes, call graphs) that text search cannot.

**Workflow: discover with Grep/Glob, understand with LSP.**

1. **Load LSP first.** At the start of a code task, run `ToolSearch` to load the LSP tool. This is a deferred tool and is not available until explicitly loaded.
2. **Discover** — Use Grep to find text patterns, error strings, config keys. Use Glob to locate files by name/path.
3. **Understand** — Once you've located the relevant code, use LSP for everything structural:

| Task | LSP Action |
| :--- | :--- |
| Find where a symbol is defined | `goToDefinition` |
| Find all usages of a symbol | `findReferences` |
| Understand a symbol's type | `hover` |
| Map a file's exports/structure | `documentSymbol` |
| Find implementations of an interface | `goToImplementation` |
| Trace call chains | `incomingCalls` / `outgoingCalls` |

**When to use which:**

- **Grep/Glob:** File discovery, text patterns, non-code files, regex searches, finding where a string literal appears.
- **LSP:** Symbol identity, type information, code structure, refactoring scope, understanding what a function returns, tracing callers/callees, navigating type hierarchies. After locating a file with Grep/Glob, use LSP to navigate within it rather than reading the entire file.

---

## Subagent Rules

**Default: do the work yourself.** The orchestrator should directly perform nearly all tasks — reading files, analyzing diffs, searching the codebase, editing code, running commands. You need information in your own context to make good decisions; a summarized version from an agent loses nuance and forces you to trust conclusions you can't verify.

**Agents are rare.** Only spawn agents when ALL of these are true:

1. The work spans 3+ files with clearly independent, non-overlapping scopes
2. You can write a precise, self-contained prompt for each agent (specific file paths, exact instructions, clear deliverable)
3. Parallelism provides genuine value — the work would take significantly longer sequentially

If any condition isn't met, do it yourself. When in doubt, do it yourself.

**When agents are used:**

- **Model selection.** Always use `model: "opus"` (preferred) or `model: "sonnet"` (acceptable). Never use `haiku`.
- **Always run in background.** Use `run_in_background: true`. The orchestrator maintains control flow and coordinates.
- **Parallel launches.** Batch all Agent tool calls into a single response message so they run concurrently.
- **Scope containment.** Each agent gets an explicit, non-overlapping file scope. Two agents editing the same file will race.
- **Summarize results.** Agent output is not visible to the user. The orchestrator must report findings in a user-facing message.
- **No git commands.** Subagents must not execute any git commands that modify state. Read-only (`status`, `diff`, `log`) is acceptable. Agents will default to git habits (stash, reset, clean up on exit) unless explicitly prohibited — this causes data loss.

**Required preamble for every agent prompt:**

> CRITICAL: Do NOT run any git commands that modify state. No commits, stashes, resets, checkouts, or clean. Git is handled by the orchestrator. Read-only commands (status, diff, log, show) are acceptable.

---

## Checklist

- [ ] Pure logic in `*.tool.ts`/`*.resource.ts`/`*.prompt.ts` (no `try...catch`, throw `McpError`)
- [ ] Zod schemas: all fields have `.describe()`, input/output schemas defined
- [ ] JSDoc `@fileoverview` + `@module` header on every new/modified file
- [ ] Auth applied with `withToolAuth`/`withResourceAuth`
- [ ] Logger used with `appContext` spread, `StorageService` for persistence
- [ ] `sdkContext` capabilities duck-typed with guards before use
- [ ] `tenantId` set on `RequestContext` when using `StorageService`
- [ ] Direct file imports — no barrel imports
- [ ] Naming: kebab-case files, snake_case `TOOL_NAME`, correct suffix (`.tool.ts`/`.task-tool.ts`/`.app-tool.ts`/`.resource.ts`/`.prompt.ts`)
- [ ] Task tools: `TaskToolDefinition` type, `taskHandlers` implemented, `.task-tool.ts` suffix
- [ ] Resources with large lists: pagination via `extractCursor`/`paginateArray`
- [ ] Secrets only in `src/config/index.ts` — no hardcoded credentials
- [ ] Registered in `definitions/index.ts` registry
- [ ] Tests added/updated (`bun run test`) — logic tested directly, sdkContext mocked
- [ ] **`bun run devcheck` passes** (lint, format, typecheck, security)
- [ ] Smoke-tested local transports (`dev:stdio`/`http`)
- [ ] Worker bundle validated (`build:worker`)
