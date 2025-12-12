# MCP SDK Changes: 1.20.x → 1.24.x

> Last updated: 2025-12-12
> Current SDK version: **1.24.3** (npm)
> Current spec version: **2025-11-25**

This document covers changes in `@modelcontextprotocol/sdk` from version 1.20.x through 1.24.x, aligned with MCP specification versions 2025-03-26 through 2025-11-25.

---

## Version Timeline

| Version | Release Date | Spec Version | Type | Summary |
|---------|--------------|--------------|------|---------|
| **1.24.3** | Dec 4, 2025 | 2025-11-25 | Patch | Security fixes, HTTP connection release, protocol compat |
| **1.24.2** | Dec 3, 2025 | 2025-11-25 | Minor | Resource annotations, Express refactor to framework-agnostic |
| **1.24.1** | Dec 2, 2025 | 2025-11-25 | Patch | Retry fix for maxRetries=0, protocol version update |
| **1.24.0** | Dec 2, 2025 | 2025-11-25 | **Major** | Tasks API, M2M auth, Zod v4, SSE improvements |
| **1.23.1** | Dec 4, 2025 | 2025-11-25 | Patch | SSE backwards compatibility fix |
| **1.23.0** | Nov 25, 2025 | 2025-11-25 | **Major** | Zod v4, URL elicitation, Jest→Vitest, SSE polling |
| **1.22.0** | Nov 13, 2025 | 2025-06-18 | Minor | `registerTool` accepts ZodType, elicitation defaults (SEP-1034) |
| **1.21.x** | Oct 30–Nov 7 | 2025-06-18 | Minor | Pluggable validators, `@deprecated` annotations, auth fixes |
| **1.20.x** | Oct 9–24 | 2025-03-26 | Minor | S256 PKCE default, Zod→JSONSchema fixes, auth header fixes |

---

## Breaking/Behavioral Changes

### Critical: Tool Validation Errors (1.21.0)

**Before 1.21.0:** Tool validation errors returned via `CallToolResult.isError`
**After 1.21.0:** Tool validation errors throw **protocol-level errors** (`McpError`)

This affects:
- Non-existent tool calls
- Disabled tool calls
- Schema validation failures

```typescript
// Before: Check result.isError
const result = await client.callTool({ name: 'foo', arguments: {} });
if (result.isError) { /* handle */ }

// After: Catch protocol errors
try {
  const result = await client.callTool({ name: 'foo', arguments: {} });
} catch (e) {
  if (e instanceof McpError) { /* handle protocol error */ }
}
```

### Tool Name Format Validation (1.22.0 / SEP-986)

Tool names must now conform to a standardized format. The recommended pattern:
- Characters: `a-z`, `A-Z`, `0-9`, `_`, `-`, `.`, `/`
- Claude client enforces: `^[a-zA-Z0-9_]{1,64}$`
- **Best practice**: Use `snake_case` (90%+ of tools use this convention)

```typescript
// ✅ Good
const TOOL_NAME = 'git_status';
const TOOL_NAME = 'get_weather';

// ❌ Avoid
const TOOL_NAME = 'Git Status';  // spaces
const TOOL_NAME = 'getWeather';  // camelCase (works but not preferred)
```

### Zod v4 Peer Dependency (1.23.0+)

The SDK now requires **Zod v3.25+** for v3 users, or supports Zod v4 natively.

```typescript
// SDK imports from zod/v4 internally
// Your code can use either:
import { z } from 'zod';       // v3 API (if using v3.25+)
import { z } from 'zod/v4';    // v4 API
```

**Known limitation:** Transform functions are stripped during JSON Schema conversion. Use refinements for validation, not transforms for schema generation.

---

## Zod 4 Migration Guide (Template Implementation)

> **Context:** This section documents the changes required when upgrading from Zod 3.x to Zod 4.x in the MCP server template. The MCP SDK 1.23.0+ supports both versions via `zod-compat.js`.

### Zod 4 Breaking Changes Affecting Templates

#### 1. `z.record()` Now Requires Two Arguments

**Before (Zod 3):**
```typescript
z.record(z.any())           // Key type implicitly string
z.record(z.unknown())
```

**After (Zod 4):**
```typescript
z.record(z.string(), z.any())      // Key type explicit
z.record(z.string(), z.unknown())
```

**Files typically affected:**
- Tool output schemas with dynamic object shapes
- Any schema using `z.record()` with a single argument

#### 2. MCP SDK `Implementation` Type Changes

The `Implementation` type (used in `McpServer` constructor) no longer has a `description` property.

**Before:**
```typescript
const server = new McpServer({
  name: config.mcpServerName,
  version: config.mcpServerVersion,
  description: config.mcpServerDescription,  // ❌ No longer valid
});
```

**After:**
```typescript
const server = new McpServer({
  name: config.mcpServerName,
  version: config.mcpServerVersion,
  // description removed - use 'title' for human-readable name if needed
});
```

#### 3. `ResourceMetadata` Type Changes

`ResourceMetadata = Omit<Resource, 'uri' | 'name'>` — the `name` property is excluded.

**Before:**
```typescript
server.resource(name, template, {
  name: title,           // ❌ 'name' not in ResourceMetadata
  description: def.description,
  mimeType,
});
```

**After:**
```typescript
server.resource(name, template, {
  title,                 // ✅ Use 'title' instead
  description: def.description,
  mimeType,
});
```

### Template Type System Updates

#### `toolDefinition.ts` Changes

Update imports to use SDK types directly:

```typescript
// Before
import type { Request as McpRequest, Notification } from '@modelcontextprotocol/sdk/types.js';
export type SdkContext = RequestHandlerExtra<McpRequest, Notification>;

// After
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
export type SdkContext = RequestHandlerExtra<ServerRequest, ServerNotification>;
```

Update `ToolDefinition` interface with default type parameters:

```typescript
export interface ToolDefinition<
  TInputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  TOutputSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
  // ...
}
```

#### `toolHandlerFactory.ts` Changes

Import SDK's `AnySchema` for proper Zod 3/4 compatibility:

```typescript
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
```

Update `createMcpToolHandler` to:
1. Accept `inputSchema` as a parameter (needed for type inference)
2. Use `AnySchema` constraint for compatibility
3. Return explicit function type

```typescript
export type ToolHandlerFactoryOptions<
  TInputSchema extends AnySchema,
  TOutput extends Record<string, unknown>,
> = {
  toolName: string;
  inputSchema: TInputSchema;  // Required for type flow
  logic: (
    input: z.infer<TInputSchema>,
    appContext: RequestContext,
    sdkContext: SdkContext,
  ) => Promise<TOutput>;
  responseFormatter?: (result: TOutput) => ContentBlock[];
};

export function createMcpToolHandler<
  TInputSchema extends AnySchema,
  TOutput extends Record<string, unknown>,
>({
  toolName,
  inputSchema: _inputSchema,  // Captured for type inference, not used at runtime
  logic,
  responseFormatter = defaultResponseFormatter,
}: ToolHandlerFactoryOptions<TInputSchema, TOutput>): (
  input: z.infer<TInputSchema>,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
) => Promise<CallToolResult> {
  return async (input, extra) => {
    // ... implementation
  };
}
```

#### `tool-registration.ts` Changes

Import `ToolCallback` type and use type assertion:

```typescript
import { McpServer, type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';

// In registerTool method:
const handler = createMcpToolHandler({
  toolName: tool.name,
  inputSchema: tool.inputSchema,  // Pass schema for type inference
  logic: tool.logic,
  ...(tool.responseFormatter && { responseFormatter: tool.responseFormatter }),
});

server.registerTool(
  tool.name,
  {
    title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    ...(tool.annotations && { annotations: tool.annotations }),
  },
  // Type assertion required: SDK's conditional types don't resolve with generic constraints
  handler as ToolCallback<TInputSchema>,
);
```

### Why the Type Assertion is Necessary

The MCP SDK uses conditional types in `BaseToolCallback`:

```typescript
type BaseToolCallback<..., Args> =
  Args extends ZodRawShapeCompat ? (args: ShapeOutput<Args>, ...) => ... :
  Args extends AnySchema ? (args: SchemaOutput<Args>, ...) => ... :
  ...
```

**TypeScript limitation:** When `Args` is a generic parameter (like `TInputSchema`), conditional types remain "deferred" — TypeScript can't evaluate them until a concrete type is known at the call site.

Our handler's signature `(input: z.infer<TInputSchema>, extra) => Promise<CallToolResult>` is structurally identical to what `ToolCallback<TInputSchema>` resolves to, but TypeScript can't prove this at compile time with generic constraints.

**This is the proper pattern**, not a hack:
- ✅ `handler as ToolCallback<TInputSchema>` — specific, type-safe assertion
- ❌ `handler as any` — loses type safety, actually hacky

The assertion is safe because:
1. Our handler signature matches the SDK's expected signature
2. `z.infer<T>` equals `SchemaOutput<T>` for Zod schemas
3. We pass the same `TInputSchema` to both the handler factory and `registerTool`

### Migration Checklist for Templates

- [ ] Update `zod` to `^4.x` in `package.json` (both `devDependencies` and `resolutions`)
- [ ] Run `bun install` / `npm install` to update lockfile
- [ ] Find/replace `z.record(z.foo())` → `z.record(z.string(), z.foo())`
- [ ] Remove `description` from `McpServer` constructor
- [ ] Update `ResourceMetadata` usage: `name` → `title`
- [ ] Update `toolDefinition.ts` imports and `SdkContext` type
- [ ] Update `toolHandlerFactory.ts`:
  - Import `AnySchema` from SDK
  - Add `inputSchema` to factory options
  - Update return type signature
- [ ] Update `tool-registration.ts`:
  - Import `ToolCallback` type
  - Pass `inputSchema` to handler factory
  - Add type assertion on handler
- [ ] Run `bunx tsc --noEmit` to verify no type errors
- [ ] Run tests to verify runtime behavior

---

## New Capabilities by Version

### 1.24.0: Tasks API (SEP-1686) — Experimental

The Tasks primitive enables long-running, asynchronous operations with a "call-now, fetch-later" pattern.

**Problem solved:** Before Tasks, every tool call blocked until completion. No progress tracking, no result retrieval after disconnection.

**Task States:**
| State | Description |
|-------|-------------|
| `working` | Task is executing |
| `input_required` | Waiting for user input (via elicitation) |
| `completed` | Successfully finished |
| `failed` | Execution failed |
| `cancelled` | Cancelled by client |

**Supported Request Types:**
- `tools/call`
- `sampling/createMessage`
- `elicitation/create`

**Key Features:**
- Client-generated task IDs (idempotent, retry-safe)
- Built-in TTL for automatic cleanup
- Graceful degradation (servers without Tasks support ignore metadata)
- Bidirectional: clients OR servers can create tasks

```typescript
// Client creates a task for a long-running tool call
const taskResult = await client.callTool({
  name: 'analyze_codebase',
  arguments: { path: '/large/repo' },
  _meta: {
    taskId: 'task-123',  // Client-generated
    taskTTL: 3600000,    // 1 hour
  }
});

// Poll for completion
const status = await client.getTaskStatus({ taskId: 'task-123' });
```

### 1.23.0+: Elicitation (SEP-1034, SEP-1036)

Servers can request additional user input during execution.

**Two Modes:**

| Mode | Use Case | Implementation |
|------|----------|----------------|
| **Form** | Structured data collection | JSON Schema-validated input fields |
| **URL** | Sensitive operations (auth, payments) | Redirect to external URL |

**Form Elicitation:**
```typescript
// In tool logic
const apiKey = await sdkContext.elicitInput({
  message: 'Enter your API key to continue',
  schema: {
    type: 'object',
    properties: {
      apiKey: { type: 'string', description: 'API Key' }
    },
    required: ['apiKey']
  }
});
```

**URL Elicitation (SEP-1036):**
```typescript
// Redirect user to external auth flow
const result = await sdkContext.elicitUrl({
  url: 'https://auth.example.com/oauth/authorize?...',
  message: 'Complete authentication in your browser'
});
```

**Security Notes:**
- Never request PII or credentials via form elicitation
- URL elicitation is designed for sensitive operations
- Clients should always allow users to reject/cancel

### 1.24.0: Sampling with Tools (SEP-1577)

MCP servers can now request LLM completions with tool definitions, enabling server-side agentic loops.

**Before SEP-1577:** Sampling didn't support tool calling
**After SEP-1577:** Full tool calling in sampling requests

```typescript
const response = await sdkContext.createMessage({
  messages: [
    { role: 'user', content: 'Analyze this data and fetch more if needed' }
  ],
  tools: [
    {
      name: 'fetch_data',
      description: 'Fetch additional data from source',
      inputSchema: { /* ... */ }
    }
  ],
  toolChoice: { mode: 'auto' }  // or 'required'
});

// Handle tool calls in response
for (const content of response.content) {
  if (content.type === 'toolUse') {
    // Process tool call, return result
  }
}
```

**Tool Choice Modes:**
- `{ mode: 'auto' }`: Model decides whether to use tools (default)
- `{ mode: 'required' }`: Model MUST use at least one tool

### 1.24.0: OAuth Client Credentials (SEP-1046)

Machine-to-machine authentication for headless agents and backend services.

```typescript
// SDK auto-detects M2M vs interactive based on client_secret presence
const transport = new StreamableHTTPClientTransport({
  url: 'https://mcp.example.com/mcp',
  auth: {
    clientId: 'my-service',
    clientSecret: process.env.MCP_CLIENT_SECRET,  // Triggers M2M flow
    scopes: ['tool:read', 'tool:write']
  }
});
```

### 1.23.0: URL-based Client Registration (SEP-991)

Replaces Dynamic Client Registration (DCR) with Client ID Metadata Documents (CIMD).

**Before:** Complex OAuth proxy setup or manual registration
**After:** Client provides URL as `client_id`, server fetches metadata

```json
// https://my-app.example.com/client.json
{
  "client_id": "https://my-app.example.com/client.json",
  "client_name": "My MCP App",
  "logo_uri": "https://my-app.example.com/logo.png",
  "redirect_uris": ["https://my-app.example.com/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"]
}
```

---

## SSE/Transport Changes

### 1.24.0+: Improved SSE Handling

| Change | Description |
|--------|-------------|
| `closeSSEStream` callback | Server explicitly closes SSE after responses sent |
| `closeStandaloneSSEStream` | For GET polling scenarios |
| Reconnection with backoff | Exponential backoff on network errors |
| Header normalization | Consistent header handling |
| Empty SSE data fix | Fixed JSON parsing errors on empty data events |

### StreamableHTTP vs SSE

StreamableHTTP (recommended since spec 2025-03-26) provides:
- Single endpoint architecture
- Bidirectional communication
- Stateless-capable (no long-lived connections required)
- Resumable streams with TTL support

Legacy HTTP+SSE is **deprecated** but still supported for backwards compatibility.

---

## Tool Annotations (2025-03-26 spec)

Comprehensive hints for tool behavior:

| Annotation | Type | Description |
|------------|------|-------------|
| `readOnlyHint` | boolean | Tool only reads, never modifies |
| `destructiveHint` | boolean | Tool may perform irreversible actions |
| `idempotentHint` | boolean | Multiple calls produce same result |
| `openWorldHint` | boolean | Tool accesses external resources |

```typescript
export const gitStatusTool: ToolDefinition = {
  name: 'git_status',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  // ...
};
```

**Notes:**
- `destructiveHint` and `idempotentHint` only meaningful when `readOnlyHint: false`
- Annotations are **advisory only**, not security controls
- Clients like Claude use these for confirmation prompts

---

## Detailed Changelog

### 1.24.3 (Dec 4, 2025)
- **Security:** Bump Express 5.0.1 → 5.2.1
- **Fix:** Release HTTP connections after POST responses
- **Fix:** Skip SSE priming events for older protocol versions (backwards compat)

### 1.24.2 (Dec 3, 2025)
- **Feature:** Optional resource annotations support
- **Refactor:** Server class framework-agnostic (Express extracted to own module)

### 1.24.1 (Dec 2, 2025)
- **Fix:** Infinite retries when `maxRetries: 0` in StreamableHTTP
- **Update:** Protocol version to 2025-11-25

### 1.24.0 (Dec 2, 2025)
**Major release aligned with MCP 2025-11-25 (first anniversary)**

- **Feature:** Tasks API implementation (SEP-1686)
- **Feature:** Sampling with tools (SEP-1577) — backwards-compatible `createMessage` overloads
- **Feature:** Client credentials M2M flow (SEP-1046)
- **Feature:** `closeSSEStream` callback, `closeStandaloneSSEStream` for GET polling
- **Feature:** Allow Zod 4 transformations
- **Fix:** Optional args in prompts for Zod v4
- **Fix:** Typed `registerTool` signature
- **Fix:** `StreamableHTTPClientTransport` instantiation issues
- **Fix:** Consume HTTP error response bodies
- **Fix:** `StreamableHTTPError` in `send()`
- **Fix:** Hanging stdio servers
- **Fix:** Origin header validation relaxed (allows no-Origin requests)
- **Fix:** `expires_in` coerced to number
- **Auth:** `invalid_target` OAuth error (RFC 8707)
- **Auth:** HTTP issuer URLs allowed in dev mode

### 1.23.1 (Dec 4, 2025)
- **Fix:** Disabled SSE priming events (1.23.x clients crashed on empty SSE data)

### 1.23.0 (Nov 25, 2025)
- **Feature:** Full Zod v4 support with v3.25+ backwards compatibility
- **Feature:** URL-based client metadata registration (SEP-991 / CIMD)
- **Feature:** URL elicitation (SEP-1036)
- **Feature:** Upscoping support for 403 `insufficient_scope` responses
- **Feature:** SSE polling implementation
- **Migration:** Jest → Vitest
- **Dependency:** Requires zod v3.25+ for v3 users

### 1.22.0 (Nov 13, 2025)
- **Feature:** `registerTool` accepts `ZodType` directly
- **Feature:** Elicitation defaults (SEP-1034)
- **Breaking:** Tool name format validation per SEP-986

### 1.21.x (Oct 30 – Nov 7, 2025)
- **Feature:** Pluggable JSON schema validators
- **Feature:** `@deprecated` annotations support
- **Breaking:** Tool validation errors now throw protocol-level errors
- **Fix:** Various auth header fixes

### 1.20.x (Oct 9–24, 2025)
- **Security:** S256 PKCE as default (previously plain PKCE)
- **Fix:** Zod → JSON Schema pipe transformation fixes
- **Fix:** Auth header handling fixes

---

## Migration Checklist

### From 1.20.x to 1.24.x

- [ ] **Error handling:** Update tool call error handling to catch `McpError` for protocol errors
- [ ] **Tool names:** Audit tool names for SEP-986 compliance (`snake_case` preferred)
- [ ] **Zod version:** Upgrade to Zod v3.25+ or v4
- [ ] **Transform removal:** Remove Zod transforms from schemas used for JSON Schema generation
- [ ] **Elicitation:** Consider adding elicitation for missing required inputs
- [ ] **Tasks:** Evaluate Tasks API for long-running tools (experimental)
- [ ] **Annotations:** Add tool annotations for better client UX

### New Capabilities to Consider

| Capability | Benefit | Effort |
|------------|---------|--------|
| Tool annotations | Better UX, skip confirmations for safe tools | Low |
| Elicitation | Interactive input collection | Medium |
| Tasks API | Long-running operations without timeouts | Medium-High |
| Sampling with tools | Server-side agentic loops | High |
| M2M auth | Headless service authentication | Medium |

---

## References

**Specification:**
- [MCP Spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Spec Changelog](https://modelcontextprotocol.io/specification/2025-03-26/changelog)
- [One Year of MCP Blog Post](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/)

**SDK:**
- [TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [npm @modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)

**SEPs Referenced:**
- SEP-835: Default OAuth scopes
- SEP-986: Tool name format
- SEP-990: Cross App Access (XAA)
- SEP-991: URL-based client registration (CIMD)
- SEP-1024: Client security requirements
- SEP-1034: Elicitation defaults
- SEP-1036: URL-mode elicitation
- SEP-1046: OAuth client credentials (M2M)
- SEP-1309: Spec version management
- SEP-1319: Decoupled request payloads
- SEP-1577: Sampling with tools
- SEP-1686: Tasks primitive
- SEP-1699: SSE connection management
- SEP-1724: Extensions framework

**Articles:**
- [MCP Tasks Deep Dive](https://workos.com/blog/mcp-async-tasks-ai-agent-workflows)
- [MCP Elicitation Guide](https://workos.com/blog/mcp-elicitation)
- [MCP 2025-11-25 Update](https://workos.com/blog/mcp-2025-11-25-spec-update)
- [Why MCP Deprecated SSE](https://blog.fka.dev/blog/2025-06-06-why-mcp-deprecated-sse-and-go-with-streamable-http/)
