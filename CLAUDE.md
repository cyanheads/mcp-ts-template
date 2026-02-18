# Agent Protocol & Architectural Mandate

**Version:** 2.6.0
**Target Project:** mcp-ts-template
**Last Updated:** 2026-02-17

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
    - `StorageService` provides built-in validation, opaque cursor pagination, and parallel batch operations.
    - All inputs (tenant IDs, keys, prefixes) are validated before reaching providers.

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
| **`src/mcp-server/tools/definitions/`**     | **MCP Tool definitions.** Add new capabilities here as `[tool-name].tool.ts`. Variants: `.task-tool.ts` (async tasks), `.app-tool.ts` (UI-enabled). Follow the **Tool Development Workflow**.                                                                                                                                     |
| **`src/mcp-server/resources/definitions/`** | **MCP Resource definitions.** Add data sources or contexts as `[resource-name].resource.ts`. Variant: `.app-resource.ts` (linked UI). Follow the **Resource Development Workflow**.                                                                                                                                               |
| **`src/mcp-server/prompts/definitions/`**   | **MCP Prompt definitions.** Add prompt templates as `[prompt-name].prompt.ts`. Follow the **Prompt Development Workflow** (Section IV.C).                                                                                                                                                                                         |
| **`src/mcp-server/tools/utils/`**           | **Shared tool utilities:** Core tool infrastructure (`ToolDefinition`, `toolHandlerFactory`)                                                                                                                                                                                                                                      |
| **`src/mcp-server/resources/utils/`**       | **Shared resource utilities,** including `ResourceDefinition` and resource handler factory.                                                                                                                                                                                                                                       |
| **`src/mcp-server/prompts/utils/`**         | **Shared prompt utilities,** including `PromptDefinition` type.                                                                                                                                                                                                                                                                   |
| **`src/mcp-server/roots/`**                 | **Roots capability registration.** Tracks client-provided root URIs via `RootsRegistry`.                                                                                                                                                                                                                                          |
| **`src/mcp-server/tasks/`**                 | **Tasks API infrastructure (experimental).** Contains `TaskManager`, `TaskToolDefinition`, and type re-exports from SDK. Task tool definitions go in `tools/definitions/` with `.task-tool.ts` suffix.                                                                                                                            |
| **`src/mcp-server/transports/`**            | **Transport implementations:**<br>- `http/` (Hono + `@hono/mcp` Streamable HTTP)<br>- `stdio/` (MCP spec stdio transport)<br>- `auth/` (strategies and helpers). HTTP mode can enforce JWT or OAuth. Stdio mode should not implement HTTP-based auth.                                                                             |
| **`src/config/`**                           | **Configuration module.** Zod-validated config from environment variables. Derives `serviceName`/`version` from `package.json`.                                                                                                                                                                                                   |
| **`src/types-global/`**                     | **Global type definitions** shared across the codebase (e.g., error types).                                                                                                                                                                                                                                                       |
| **`src/services/`**                         | **External service integrations** following a consistent domain-driven pattern:<br>- Each service domain (e.g., `llm/`, `speech/`) contains: `core/` (interfaces, orchestrators), `providers/` (implementations), `types.ts`, and `index.ts`<br>- Use DI for all service dependencies. See **Service Development Pattern** below. |
| **`src/storage/`**                          | **Abstractions and provider implementations** (in-memory, filesystem, supabase, cloudflare).                                                                                                                                                                                                                                      |
| **`src/container/`**                        | **Dependency Injection (custom typed container).** `Token<T>` phantom branding, service registration, and resolution. Zero external dependencies.                                                                                                                                                                                 |
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

## IV. Tool, Resource & Prompt Development Workflow

**Common Steps (Tools & Resources):**

1. **File Location**
   - **Tools:** `src/mcp-server/tools/definitions/[tool-name].tool.ts` (template: `template-echo-message.tool.ts`)
   - **Resources:** `src/mcp-server/resources/definitions/[resource-name].resource.ts` (template: `echo.resource.ts`)
   - **Prompts:** `src/mcp-server/prompts/definitions/[prompt-name].prompt.ts` (template: `code-review.prompt.ts`)

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
   - **Prompts:** Add to `src/mcp-server/prompts/definitions/index.ts` → `allPromptDefinitions`

**File Suffix Conventions:**

- `.tool.ts` — standard tool
- `.task-tool.ts` — async task tool (Section IV.B)
- `.app-tool.ts` — UI-enabled tool (MCP Apps extension, links to an `.app-resource.ts`)
- `.resource.ts` — standard resource
- `.app-resource.ts` — UI resource linked to an app tool
- `.prompt.ts` — prompt template

**Resource-Specific Notes:**

- Resources use `uriTemplate` (e.g., `echo://{message}`), `paramsSchema`, and optional `list()` for discovery
- Logic signature: `(uri: URL, params, context: RequestContext) => result` (can be `async`)
- `list()` signature differs from `logic`: `(extra: RequestHandlerExtra) => ListResourcesResult` — receives `extra._meta?.cursor` for pagination, not `RequestContext`
- See `echo.resource.ts` and Section IV.A for complete examples

**Resource Pagination:** Resources returning large lists must implement pagination per [MCP spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/utils/pagination). Use `extractCursor(meta)`, `paginateArray(...)` from `@/utils/index.js`. Storage providers: use `encodeCursor`/`decodeCursor` from `@/storage/core/storageValidation.js` for tenant-bound cursors. Cursors are opaque; invalid cursors → `JsonRpcErrorCode.InvalidParams` (-32602). Include `nextCursor` only when more results exist.

---

## IV.A. Quick Start: Creating Your First Tool

- [ ] **1. Study template:** [template-echo-message.tool.ts](src/mcp-server/tools/definitions/template-echo-message.tool.ts) — understand: metadata → schemas → logic → export
- [ ] **2. Create file:** `src/mcp-server/tools/definitions/[your-tool-name].tool.ts` (kebab-case)
- [ ] **3. Define metadata:** `TOOL_NAME` (snake_case), `TOOL_TITLE`, `TOOL_DESCRIPTION` (LLM-facing), `TOOL_ANNOTATIONS` (readOnly/idempotent hints)
- [ ] **4. Create schemas:** `InputSchema`/`OutputSchema` as `z.object()` — **CRITICAL:** all fields need `.describe()`
- [ ] **5. Implement logic:** Pure function `async (input, appContext, sdkContext) => result` — NO try/catch, throw `McpError` on failure
- [ ] **6. (Optional) Response formatter:** `(result) => ContentBlock[]`
- [ ] **7. Apply auth:** Wrap with `withToolAuth(['tool:name:read'], yourLogic)`
- [ ] **8. Export ToolDefinition:** Combine metadata, schemas, logic, formatter
- [ ] **9. Register:** Add to `allToolDefinitions` in [index.ts](src/mcp-server/tools/definitions/index.ts)
- [ ] **10. Quality check:** `bun run devcheck`
- [ ] **11. Test:** `bun run dev:stdio` or `dev:http`, verify with MCP client

See Section IV for full workflow, Section XIV for comprehensive checklist.

---

## IV.B. Quick Start: Creating a Task Tool (Experimental)

Task tools enable long-running async operations using the MCP Tasks API. They follow a "call-now, fetch-later" pattern where clients can poll for status and retrieve results after completion.

> **Note:** Tasks API is part of the [MCP spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks) as an experimental capability and may change without notice.

- [ ] **1. Study template:** [template-async-countdown.task-tool.ts](src/mcp-server/tools/definitions/template-async-countdown.task-tool.ts)
- [ ] **2. Create file:** `src/mcp-server/tools/definitions/[name].task-tool.ts` (note: `.task-tool.ts` suffix)
- [ ] **3. Define schemas:** `InputSchema` and optional `OutputSchema`
- [ ] **4. Implement task handlers:**
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
- [ ] **5. Set execution mode:** `execution: { taskSupport: 'required' }` or `'optional'`
- [ ] **6. Export as `TaskToolDefinition`:** Import from `@/mcp-server/tasks/index.js`
- [ ] **7. Register:** Add to `allToolDefinitions` in [index.ts](src/mcp-server/tools/definitions/index.ts)

**Key Concepts:**

- `RequestTaskStore` provides `createTask`, `getTask`, `storeTaskResult`, `getTaskResult`, `updateTaskStatus`
- Background work updates status via `taskStore.updateTaskStatus(taskId, 'working', 'message...')`
- Terminal states: `completed`, `failed`, `cancelled` — use `storeTaskResult` for completion
- Task tools are auto-detected by `isTaskToolDefinition()` and registered via `server.experimental.tasks.registerToolTask()`

---

## IV.C. Quick Start: Creating Your First Prompt

Prompts are reusable message templates that clients can discover and invoke. They follow the same definition → registration pattern as tools and resources.

- [ ] **1. Study template:** [code-review.prompt.ts](src/mcp-server/prompts/definitions/code-review.prompt.ts) — understand: metadata → schema → generate → export
- [ ] **2. Create file:** `src/mcp-server/prompts/definitions/[your-prompt-name].prompt.ts` (kebab-case)
- [ ] **3. Define metadata:** `PROMPT_NAME` (snake_case), `PROMPT_DESCRIPTION` (user-facing)
- [ ] **4. Create schema (optional):** `ArgumentsSchema` as `z.object()` — all fields need `.describe()`
- [ ] **5. Implement `generate`:** `(args) => PromptMessage[]` — returns array of `{ role, content }` messages (can be `async`)
- [ ] **6. Export `PromptDefinition`:** `export const myPrompt: PromptDefinition<typeof ArgumentsSchema> = { name, description, argumentsSchema, generate }`
- [ ] **7. Register:** Add to `allPromptDefinitions` in [index.ts](src/mcp-server/prompts/definitions/index.ts)
- [ ] **8. Quality check:** `bun run devcheck`

**Key differences from tools:** No `logic`/`appContext`/`sdkContext` — prompts are simpler. The `generate` function receives validated args and returns `PromptMessage[]` directly. No auth wrappers needed.

---

## V. Service Development Pattern

> **All services:** `src/services/[service-name]/` with `core/` (interfaces), `providers/` (impls), `types.ts`, `index.ts`. See [docs/tree.md](docs/tree.md).

**Patterns:** Single-provider (e.g., LLM) → inject via constructor. Multi-provider (e.g., Speech) → create orchestrator for routing/aggregation.

**Provider requirements:** Implement `I<Service>Provider`, `healthCheck()`, throw `McpError` on failure, name as `<name>.provider.ts`. Register in `registrations/core.ts` via `container.registerSingleton(token, factory)`.

**Add service:** Dir structure → Interface → Providers → Types → Barrel export → DI token (`tokens.ts`) → Register (`registrations/core.ts`)

---

## VI. Core Services & Utilities

#### DI-Managed Services (tokens in `src/container/core/tokens.ts`)

| Service           | Token                   | Resolution                                 | Notes                         |
| ----------------- | ----------------------- | ------------------------------------------ | ----------------------------- |
| `ILlmProvider`    | `LlmProvider`           | `container.resolve(LlmProvider)`           |                               |
| `StorageService`  | `StorageService`        | `container.resolve(StorageService)`        | Requires `context.tenantId`   |
| `RateLimiter`     | `RateLimiterService`    | `container.resolve(RateLimiterService)`    |                               |
| `Logger`          | `Logger`                | `container.resolve(Logger)`                | Pino-backed singleton         |
| App Config        | `AppConfig`             | `container.resolve(AppConfig)`             |                               |
| Supabase Client   | `SupabaseAdminClient`   | `container.resolve(SupabaseAdminClient)`   | Only when needed              |
| Transport Manager | `TransportManagerToken` | `container.resolve(TransportManagerToken)` |                               |
| `SpeechService`   | `SpeechService`         | `container.resolve(SpeechService)`         | TTS/STT provider orchestrator |
| `TaskManager`     | `TaskManagerToken`      | `container.resolve(TaskManagerToken)`      | For MCP Tasks API support     |

**Storage:** `STORAGE_PROVIDER_TYPE` = `in-memory` | `filesystem` | `supabase` | `cloudflare-r2` | `cloudflare-kv` | `cloudflare-d1`. Use DI-injected `StorageService`. Features: input validation, parallel batch ops (`getMany/setMany/deleteMany`), secure tenant-bound pagination, TTL support. See [storage docs](src/storage/README.md).

#### Directly Imported Utilities (`src/utils/`)

- `logger`, `requestContextService`, `sanitization`, `fetchWithTimeout`, `measureToolExecution`, `pdfParser`, `frontmatterParser`, `markdown()`, `diffFormatter`, `tableFormatter`, `treeFormatter` from `@/utils/index.js`
- `ErrorHandler.tryCatch` (for services/setup code, NOT tool/resource logic)

**Response Formatters:** Simple: `[{ type: 'text', text: lines.join('\n') }]`. Complex: `markdown()` helper, `diffFormatter`, `tableFormatter`, `treeFormatter` (see `template-echo-message.tool.ts`)

#### Utils Modules (`src/utils/`)

| Module        | Key Exports                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `parsing/`    | `csvParser`, `yamlParser`, `xmlParser`, `jsonParser`, `pdfParser`, `frontmatterParser` (handles LLM `<think>` blocks) |
| `formatting/` | `MarkdownBuilder`, `markdown()` helper, `diffFormatter`, `tableFormatter`, `treeFormatter`                            |
| `security/`   | `sanitization`, `rateLimiter`, `idGenerator`                                                                          |
| `network/`    | `fetchWithTimeout`                                                                                                    |
| `scheduling/` | `scheduler` (node-cron wrapper)                                                                                       |
| `internal/`   | `logger`, `requestContextService`, `ErrorHandler`, `performance`                                                      |
| `telemetry/`  | OpenTelemetry instrumentation                                                                                         |

---

## VII. Authentication & Authorization

**HTTP:** `MCP_AUTH_MODE` = `none` | `jwt` | `oauth`. JWT: local secret (`MCP_AUTH_SECRET_KEY`), dev bypasses if missing. OAuth: JWKS verification (`OAUTH_ISSUER_URL`, `OAUTH_AUDIENCE`, opt `OAUTH_JWKS_URI`). Claims: `clientId` (cid/client_id), `scopes` (scp/scope), `sub`, `tenantId` (tid → context.tenantId). Wrap logic with `withToolAuth`/`withResourceAuth` (defaults allowed if auth disabled).

**STDIO:** No HTTP auth. Host handles authorization.

**Endpoints:** `/healthz`, `GET /mcp` unprotected. `POST`/`OPTIONS /mcp` protected when auth enabled. CORS: `MCP_ALLOWED_ORIGINS` or `*`.

---

## VIII. Transports & Server Lifecycle

**`createMcpServerInstance`** (`server.ts`): Init context, create server with declared capabilities (`logging`, `resources`/`tools`/`prompts` with `listChanged`, `tasks` with list/cancel/requests). Elicitation, sampling, and roots are SDK context features available to tool logic via `sdkContext`, not declared server capabilities. **`TransportManager`** (`transports/manager.ts`): Resolve factory, instantiate transport, handle lifecycle. **Worker** (`worker.ts`): Cloudflare adapter, `serverless` flag.

---

## IX. Code Style, Validation, and Security

**JSDoc:** `@fileoverview`, `@module` required. **Validation:** Zod schemas, all fields need `.describe()`. **Logging:** Include `RequestContext`, use `logger.{debug|info|notice|warning|error|crit|emerg}`. **Errors:** Logic throws `McpError`, handlers catch. `ErrorHandler.tryCatch` for services only. **Secrets:** `src/config/index.ts` only. **Rate Limiting:** DI-injected `RateLimiter`. **Telemetry:** Auto-init, no manual spans. **Imports:** Barrel exports (`index.ts`) are used for module public APIs (e.g., `@/utils/index.js`, `definitions/index.ts`). Cross-module imports should use the public barrel, not reach into another module's internals.

---

## IX.A. Git Commit Messages

**CRITICAL:** When creating git commits, NEVER use heredoc syntax (`cat <<'EOF'`) or command substitution (`$(...)`) in commit messages. Use plain strings only.

**Correct:**

```bash
git commit -m "feat(auth): add JWT validation middleware

- Implemented token verification with exp claim validation
- Added support for RS256 and HS256 algorithms
- Includes comprehensive error handling"
```

**INCORRECT - NEVER DO THIS:**

```bash
# ❌ WRONG - Do not use cat/heredoc/command substitution
git commit -m "$(cat <<'EOF'
feat(auth): add JWT validation
EOF
)"
```

**Conventional Commits Format:** Use the [Conventional Commits](https://www.conventionalcommits.org/) standard:

- `feat(scope): description` - New feature
- `fix(scope): description` - Bug fix
- `refactor(scope): description` - Code refactoring
- `chore(scope): description` - Maintenance tasks (deps, config, etc.)
- `docs(scope): description` - Documentation updates
- `test(scope): description` - Test additions or updates
- `build(scope): description` - Build system or dependency changes

**Atomic Commits:** Group related changes together. Use `filesToStage` parameter to precisely control which files are included in each commit.

---

## X. Checks & Workflow Commands

| Command                    | Purpose                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `bun run rebuild`          | Clean, rebuild, clear logs (after dep changes)                                                                     |
| `bun run devcheck`         | **USE OFTEN** Lint, format, typecheck, security (opt-out: `--no-fix`, `--no-lint`, `--no-audit`; opt-in: `--test`) |
| `bun run test`             | Unit/integration tests                                                                                             |
| `bun run dev:stdio/http`   | Development mode                                                                                                   |
| `bun run start:stdio/http` | Production mode (after build)                                                                                      |
| `bun run build:worker`     | Cloudflare Worker bundle                                                                                           |

---

## XI. Configuration & Environment

All config validated via Zod in `src/config/index.ts`. Config module derives `mcpServerName`/`mcpServerVersion` from `package.json` (overridable via `MCP_SERVER_NAME`/`MCP_SERVER_VERSION` env vars).

| Category      | Key Variables                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Transport** | `MCP_TRANSPORT_TYPE` (`stdio`\|`http`), `MCP_HTTP_PORT`, `MCP_HTTP_HOST`, `MCP_HTTP_ENDPOINT_PATH`                 |
| **Auth**      | `MCP_AUTH_MODE` (`none`\|`jwt`\|`oauth`), `MCP_AUTH_SECRET_KEY`, `OAUTH_*`                                         |
| **Storage**   | `STORAGE_PROVIDER_TYPE` (`in-memory`\|`filesystem`\|`supabase`\|`cloudflare-r2`\|`cloudflare-kv`\|`cloudflare-d1`) |
| **LLM**       | `OPENROUTER_API_KEY`, `OPENROUTER_APP_URL/NAME`, `LLM_DEFAULT_*`                                                   |
| **Telemetry** | `OTEL_ENABLED`, `OTEL_SERVICE_NAME/VERSION`, `OTEL_EXPORTER_OTLP_*`                                                |

---

## XII. Local & Edge Targets

**Local parity:** stdio/HTTP transports work identically. **Worker:** `build:worker` + `wrangler dev --local` must succeed. **wrangler.toml:** `compatibility_date` ≥ `2025-09-01`, `nodejs_compat`.

---

## XIII. Multi-Tenancy & Storage Context

**`StorageService` requires `context.tenantId`** (throws if missing). **Validation:** Max 128 chars, alphanumeric/hyphens/underscores/dots only, start/end alphanumeric, no path traversal (`../`), no consecutive dots.

**HTTP with Auth:** `tenantId` auto-extracted from JWT `'tid'` claim → propagated via `requestContextService.withAuthInfo(authInfo)`. Context includes: `{ requestId, timestamp, tenantId, auth: { sub, clientId, scopes, token, tenantId } }`.

**STDIO:** Explicitly set tenant via `requestContextService.createRequestContext({ operation, tenantId })`.

---

## XIV. Quick Checklist

- [ ] Implement pure logic in `*.tool.ts`/`*.resource.ts`/`*.prompt.ts` (no `try...catch`, throw `McpError`)
- [ ] Apply auth with `withToolAuth`/`withResourceAuth`
- [ ] Use `logger` with `appContext`, `StorageService` (DI) for persistence
- [ ] Use `sdkContext.elicitInput()`/`createMessage()` for client interaction
- [ ] Register in `index.ts` barrel
- [ ] Add/update tests (`bun test`)
- [ ] **Run `bun devcheck`** (lint, format, typecheck, security)
- [ ] Smoke-test local transports (`dev:stdio`/`http`)
- [ ] Validate Worker bundle (`build:worker`)

Follow this document precisely.
