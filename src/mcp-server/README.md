# MCP Server Module

## Overview

The `mcp-server/` directory contains the MCP server implementation: tools, resources, prompts, and transport layers. Implements the [MCP specification 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18).

- [tools/](tools/) — Tool definitions and utilities
- [resources/](resources/) — Resource definitions and utilities
- [prompts/](prompts/) — Prompt definitions and registration
- [roots/](roots/) — Root directory definitions
- [transports/](transports/) — HTTP and stdio transport implementations

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    MCP Client                       │
│              (Claude Code, etc.)                    │
└────────────────┬────────────────────────────────────┘
                 │
                 │ JSON-RPC 2.0
                 │
┌────────────────▼────────────────────────────────────┐
│              Transport Layer                        │
│         (HTTP/SSE or stdio pipes)                   │
├─────────────────────────────────────────────────────┤
│              MCP Server Instance                    │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐   │
│  │    Tools     │  │  Resources   │  │ Prompts  │   │
│  └──────────────┘  └──────────────┘  └──────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         Request Handler Factory              │   │
│  │   (Tool/Resource/Prompt execution)           │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ Business Logic
                   │
┌──────────────────▼──────────────────────────────────┐
│              Services Layer                         │
│        (LLM, Storage, Graph, etc.)                  │
└─────────────────────────────────────────────────────┘
```

---

## Server lifecycle

### 1. Initialization

File: [server.ts](server.ts)

```typescript
export async function createMcpServerInstance(
  context: ModeContext,
): Promise<Server>;
```

Steps:

1. Create request context
2. Initialize MCP Server with capabilities
3. Register tools, resources, and prompts
4. Set up lifecycle handlers
5. Return configured server instance

Capabilities: `logging`, `listChanged`, `elicitation`, `sampling`, `prompts`, `roots`.

### 2. Transport setup

File: [transports/manager.ts](transports/manager.ts)

```typescript
export class TransportManager {
  async start(): Promise<void>;
  async stop(): Promise<void>;
}
```

Transports:

- HTTP — Server-Sent Events (SSE) with optional auth
- stdio — Standard input/output pipes

### 3. Request handling

Flow:

```
Client Request
    ↓
Transport Layer (HTTP/stdio)
    ↓
MCP Server (route by method)
    ↓
Handler Factory (createMcpToolHandler/resourceHandlerFactory)
    ↓
RequestContext + AppContext
    ↓
Tool/Resource Logic (pure function)
    ↓
Response Formatter
    ↓
Client Response
```

### 4. Registry services

Registry services automate discovery and registration of MCP capabilities via DI:

- `ToolRegistry` — Discovers and registers all tool definitions
- `ResourceRegistry` — Discovers and registers all resource definitions
- `PromptRegistry` — Discovers and registers all prompt definitions
- `RootsRegistry` — Enables roots capability for workspace context

Registration flow:

1. Create definitions in their `definitions/` directories
2. Add to barrel export arrays (`allToolDefinitions`, `allResourceDefinitions`, etc.)
3. `registerTools()` / `registerResources()` register definitions with the DI container
4. Registry services resolve definitions from the container
5. Registries call `.registerAll(server)` to register with the MCP server instance

Example (tools):

```typescript
// 1. Define tool
// src/mcp-server/tools/definitions/my-tool.tool.ts
export const myTool: ToolDefinition<...> = { /* ... */ };

// 2. Export in barrel
// src/mcp-server/tools/definitions/index.ts
export const allToolDefinitions = [myTool, ...];

// 3. Register with DI (happens in container setup)
// src/container/registrations/mcp.ts
registerTools(container);  // Registers each tool with container

// 4. Registry resolves and registers with server
// src/mcp-server/server.ts
const toolRegistry = container.resolve(ToolRegistry);
await toolRegistry.registerAll(server);
```

---

## Tools

Executable capabilities that perform actions.

Location: [tools/definitions/](tools/definitions/). See [tools/README.md](tools/README.md) for the full guide.

### Quick example

```typescript
/**
 * @fileoverview Echo message tool
 * @module mcp-server/tools/definitions/echo
 */

import { z } from 'zod';
import { ToolDefinition } from '../utils/toolDefinition.js';

const TOOL_NAME = 'echo_message' as const;

const InputSchema = z.object({
  message: z.string().describe('The message to echo back'),
  repeat: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(1)
    .describe('Number of times to repeat (1-10)'),
});

const OutputSchema = z.object({
  result: z.string().describe('The repeated message'),
});

export const echoTool: ToolDefinition<typeof InputSchema, typeof OutputSchema> =
  {
    name: TOOL_NAME,
    description: 'Echoes a message back with optional repetition',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,

    async logic(input, appContext, sdkContext) {
      const repeated = Array(input.repeat).fill(input.message).join('\n');
      return { result: repeated };
    },

    responseFormatter: (result) => [{ type: 'text', text: result.result }],
  };
```

### Tool registration

File: [tools/definitions/index.ts](tools/definitions/index.ts)

```typescript
export const allToolDefinitions = [
  echoTool,
  catFactTool,
  // ... add your tools here
] as const;
```

### Tool annotations

Tools can include optional annotations to hint at their behavior:

```typescript
interface ToolAnnotations {
  /** If not read-only, true if updates can be destructive (default: true) */
  destructiveHint?: boolean;

  /** If not read-only, true if repeat calls with same args have no additional effect (default: false) */
  idempotentHint?: boolean;

  /** True if tool may interact with external world like APIs or web search (default: true) */
  openWorldHint?: boolean;

  /** True if tool does not modify environment (default: false) */
  readOnlyHint?: boolean;

  /** Human-readable title (UI hint) */
  title?: string;
}
```

Example:

```typescript
const TOOL_ANNOTATIONS: ToolAnnotations = {
  title: 'Echo Message',
  readOnlyHint: true, // Does not modify state
  idempotentHint: true, // Same input = same output
  openWorldHint: false, // No external API calls
};

export const echoTool: ToolDefinition<typeof InputSchema, typeof OutputSchema> =
  {
    name: 'echo_message',
    annotations: TOOL_ANNOTATIONS,
    // ... other fields
  };
```

Annotations are hints only, not safety guarantees. Clients should not rely on them for security or correctness.

---

## Resources

Readable data sources exposed via URI templates.

Location: [resources/definitions/](resources/definitions/). See [resources/README.md](resources/README.md) for the full guide.

### Quick example

```typescript
/**
 * @fileoverview Echo resource
 * @module mcp-server/resources/definitions/echo
 */

import { z } from 'zod';
import { ResourceDefinition } from '../utils/resourceDefinition.js';

const ParamsSchema = z.object({
  message: z.string().optional().describe('The message to echo'),
});

const OutputSchema = z.object({
  content: z.string().describe('The echoed message'),
  metadata: z
    .object({
      timestamp: z.iso.datetime().describe('ISO 8601 timestamp'),
    })
    .describe('Response metadata'),
});

export const echoResource: ResourceDefinition<
  typeof ParamsSchema,
  typeof OutputSchema
> = {
  uriTemplate: 'echo://{message}',
  name: 'echo',
  description: 'A simple resource that echoes back a message',
  mimeType: 'text/plain',
  paramsSchema: ParamsSchema,
  outputSchema: OutputSchema,

  // Logic can be sync or async
  logic: (uri, params, context) => {
    return {
      content: `Echo: ${params.message}`,
      metadata: { timestamp: new Date().toISOString() },
    };
  },
};
```

### Resource registration

File: [resources/definitions/index.ts](resources/definitions/index.ts)

```typescript
export const allResourceDefinitions = [
  echoResource,
  // ... add your resources here
] as const;
```

---

## Prompts

Reusable prompt templates with variable substitution.

Location: [prompts/definitions/](prompts/definitions/)

### Quick example

```typescript
/**
 * @fileoverview Code review prompt
 * @module mcp-server/prompts/definitions/code-review
 */

import { z } from 'zod';
import { PromptDefinition } from '../utils/promptDefinition.js';

const ArgumentsSchema = z.object({
  language: z
    .string()
    .optional()
    .describe('Programming language of the code to review'),
  focus: z.string().optional().describe('Primary focus area for the review'),
});

export const codeReviewPrompt: PromptDefinition<typeof ArgumentsSchema> = {
  name: 'code_review',
  description:
    'Generates a structured code review prompt for analyzing code quality',
  argumentsSchema: ArgumentsSchema,

  generate: (args) => {
    const focus = args.focus || 'general';
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `You are an expert code reviewer${args.language ? ` specializing in ${args.language}` : ''}. Please conduct a thorough code review with a focus on ${focus}.`,
        },
      },
    ];
  },
};
```

---

## Transports

### HTTP transport

File: [transports/http/httpTransport.ts](transports/http/httpTransport.ts)

- SSE streaming per MCP Spec 2025-06-18
- Session management (stateful/stateless modes)
- Optional authentication (JWT/OAuth) with identity-bound sessions
- CORS with Origin header validation (DNS rebinding protection)
- Health check endpoint
- OAuth Protected Resource Metadata (RFC 9728)
- MCP-Protocol-Version header validation

Configuration:

```bash
MCP_TRANSPORT_TYPE=http
MCP_HTTP_PORT=3000
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PATH=/mcp
MCP_ALLOWED_ORIGINS=https://example.com,https://app.example.com

# Session management (stateful or stateless)
MCP_SESSION_MODE=stateful
MCP_STATEFUL_SESSION_STALE_TIMEOUT_MS=3600000  # 1 hour
```

Endpoints:

| Endpoint | Description |
| :--- | :--- |
| `GET /healthz` | Health check (unauthenticated) |
| `GET /.well-known/oauth-protected-resource` | OAuth metadata per RFC 9728 (unauthenticated) |
| `GET /mcp` | Server status info (unauthenticated) |
| `POST /mcp` | JSON-RPC requests (authenticated if auth enabled, returns `Mcp-Session-Id` header) |
| `DELETE /mcp` | Session termination (requires `Mcp-Session-Id` header, stateful mode only) |
| `OPTIONS /mcp` | CORS preflight |

Session management (MCP Spec 2025-06-18):

- Stateful mode: sessions bound to authenticated identity (`tenantId`, `clientId`, `subject`). Clients receive `Mcp-Session-Id` in responses and must send it in subsequent requests. Sessions auto-expire after inactivity timeout. DELETE endpoint terminates sessions.
- Stateless mode: each request is independent. Session ID generated for tracing only. DELETE returns 405.

Security:

- Origin header validation (DNS rebinding protection per MCP spec)
- MCP-Protocol-Version validation (rejects unsupported versions with 400)
- Session identity binding (prevents hijacking in multi-tenant scenarios)
- OAuth discovery via RFC 9728 metadata endpoint

Auth: See [transports/auth/README.md](transports/auth/README.md).

```bash
# JWT mode
MCP_AUTH_MODE=jwt
MCP_AUTH_SECRET_KEY=your-secret-key

# OAuth mode
MCP_AUTH_MODE=oauth
OAUTH_ISSUER_URL=https://auth.example.com
OAUTH_AUDIENCE=your-app
OAUTH_JWKS_URI=https://auth.example.com/.well-known/jwks.json
MCP_SERVER_RESOURCE_IDENTIFIER=https://api.example.com/mcp  # Optional, defaults to audience
```

### stdio transport

File: [transports/stdio/index.ts](transports/stdio/index.ts)

Standard input/output communication. No authentication (host-managed). Suitable for local MCP clients.

Configuration:

```bash
MCP_TRANSPORT_TYPE=stdio
```

Usage:

```bash
bun run dev:stdio    # Development
bun run start:stdio  # Production
```

---

## Request context

Every request includes context for tracing and multi-tenancy:

```typescript
interface RequestContext {
  requestId: string; // Unique identifier for this request
  timestamp: string; // ISO 8601 timestamp
  operation: string; // Operation name (e.g., 'HandleToolRequest')
  sessionId?: string; // MCP session ID (HTTP transport)
  tenantId?: string; // Tenant identifier for multi-tenancy
  traceId?: string; // OpenTelemetry trace ID
  spanId?: string; // OpenTelemetry span ID
  auth?: {
    // Authentication info (when auth enabled)
    subject: string; // User/service subject (sub claim)
    clientId: string; // OAuth client ID
    scopes: string[]; // Authorized scopes
    token: string; // Raw JWT/OAuth token
    tenantId?: string; // Tenant from token (tid claim)
  };
  // Additional context fields can be added dynamically
  [key: string]: unknown;
}
```

Usage in tools:

```typescript
async logic(input, appContext, sdkContext) {
  const { requestId, sessionId, tenantId } = appContext;

  logger.info('Processing request', {
    ...appContext,
    inputSize: JSON.stringify(input).length,
  });

  // Access auth info if available
  if (appContext.auth) {
    const { subject, scopes } = appContext.auth;
    // Use auth info for authorization checks
  }

  // Business logic
}
```

---

## Authentication and authorization

### Tool-level authorization

File: [transports/auth/lib/withAuth.ts](transports/auth/lib/withAuth.ts)

```typescript
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';

export const myTool: ToolDefinition<typeof InputSchema> = {
  name: 'my_tool',
  description: 'Protected tool',
  inputSchema: InputSchema,

  // Wrap logic with auth check
  logic: withToolAuth(
    ['tool:my_tool:execute', 'admin'],
    async (input, appContext, sdkContext) => {
      // Only executed if user has required scopes
      return { success: true };
    },
  ),
};
```

### Resource-level authorization

```typescript
import { withResourceAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';

export const myResource: ResourceDefinition<typeof ParamsSchema> = {
  name: 'my_resource',
  uriTemplate: 'myresource://{id}',
  paramsSchema: ParamsSchema,

  logic: withResourceAuth(
    ['resource:my_resource:read'],
    (uri, params, context) => {
      // Only executed if user has required scopes
      return { data: 'protected' };
    },
  ),
};
```

### Security

The HTTP transport binds sessions to authenticated identities to prevent session hijacking:

```typescript
// Session is created with identity binding
const sessionIdentity = {
  tenantId: authInfo.tenantId, // From JWT 'tid' claim
  clientId: authInfo.clientId, // From JWT 'cid' claim
  subject: authInfo.subject, // From JWT 'sub' claim
};

// Session validation checks identity match
if (!sessionStore.isValidForIdentity(sessionId, sessionIdentity)) {
  return c.json({ error: 'Session not found or expired' }, 404);
}
```

This prevents User A from using User B's session ID, enforces tenant isolation, and auto-expires stale sessions.

OAuth Protected Resource Metadata (RFC 9728) for client discovery:

```bash
GET /.well-known/oauth-protected-resource
```

Response:

```json
{
  "resource": "https://api.example.com/mcp",
  "authorization_servers": ["https://auth.example.com"],
  "bearer_methods_supported": ["header"],
  "resource_signing_alg_values_supported": ["RS256", "ES256", "PS256"],
  "resource_documentation": "https://api.example.com/docs",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json"
}
```

Clients use this for OAuth auto-configuration, authorization server discovery, and JWKS endpoint discovery.

---

## Error handling

Logic throws, handlers catch:

```typescript
import { McpError, JsonRpcErrorCode } from '@/types-global/errors.js';

async logic(input, appContext, sdkContext) {
  // ❌ DO NOT do this in logic:
  try {
    // ... logic
  } catch (error) {
    // Handle here
  }

  // ✅ DO THIS instead:
  if (!input.requiredField) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      'requiredField is required',
      { providedInput: input }
    );
  }

  // Let handler catch errors
  const result = await riskyOperation();
  return result;
}
```

Error codes: `InvalidParams` (-32602), `InternalError` (-32603), `MethodNotFound` (-32601), `InvalidRequest` (-32600).

---

## SDK context

The `sdkContext` parameter provides access to MCP SDK capabilities:

```typescript
interface SdkContext {
  // Request cancellation
  signal: AbortSignal; // AbortSignal for request cancellation

  // Session info
  sessionId?: string; // MCP session ID

  // Authentication (if auth enabled)
  authInfo?: {
    subject: string;
    clientId: string;
    scopes: string[];
    token: string;
    tenantId?: string;
  };

  // Client interaction methods
  elicitInput: (args: ElicitInputArgs) => Promise<unknown>;
  createMessage: (args: SamplingArgs) => Promise<Message>;
  sendNotification: (notification: Notification) => Promise<void>;
  sendRequest: (request: Request) => Promise<Response>;
}
```

### Elicitation

Collect missing parameters from the client interactively:

```typescript
async logic(input, appContext, sdkContext) {
  // Check if required param is missing
  if (!input.optionalParam) {
    // Ask user for it
    const response = await sdkContext.elicitInput({
      prompt: 'Please provide the optional parameter',
      schema: z.object({
        optionalParam: z.string(),
      }),
    });
    input.optionalParam = response.optionalParam;
  }

  return { result: input.optionalParam };
}
```

### Sampling

Request LLM completions from the client (MCP Spec 2025-06-18):

```typescript
async logic(input, appContext, sdkContext) {
  // Create message for LLM
  const message = await sdkContext.createMessage({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze: ${input.text}`,
        },
      },
    ],
    maxTokens: 1000,
  });

  return { analysis: message.content.text };
}
```

### Request cancellation

```typescript
async logic(input, appContext, sdkContext) {
  // Check if request was cancelled
  if (sdkContext.signal.aborted) {
    throw new McpError(
      JsonRpcErrorCode.RequestCancelled,
      'Request was cancelled',
    );
  }

  // Register cancellation handler for long-running operations
  sdkContext.signal.addEventListener('abort', () => {
    // Clean up resources
  });

  // Long-running operation
  const result = await longOperation();
  return result;
}
```

### Notifications

Send notifications to the client (no response expected):

```typescript
async logic(input, appContext, sdkContext) {
  // Send progress notification
  await sdkContext.sendNotification({
    method: 'notifications/progress',
    params: {
      progress: 50,
      message: 'Processing...',
    },
  });

  return { result: 'done' };
}
```

---

## Response formatting

### Simple text

```typescript
responseFormatter: (result) => [{ type: 'text', text: result.message }];
```

### Markdown

```typescript
import { markdown } from '@/utils/index.js';

responseFormatter: (result) => [
  {
    type: 'text',
    text: markdown()
      .heading(1, 'Result')
      .paragraph(result.summary)
      .codeBlock('json', JSON.stringify(result.data, null, 2))
      .build(),
  },
];
```

### Binary (images)

```typescript
responseFormatter: (result) => [
  {
    type: 'image',
    data: result.imageBase64,
    mimeType: 'image/png',
  },
];
```

---

## Testing

### Tool testing pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { myTool } from '@/mcp-server/tools/definitions/my-tool.tool.js';

describe('myTool', () => {
  let appContext: AppContext;
  let sdkContext: SdkContext;

  beforeEach(() => {
    appContext = {
      requestContext: {
        requestId: 'test-req-1',
        timestamp: new Date().toISOString(),
        operation: 'test',
      },
      logger,
    };

    sdkContext = {
      elicitInput: vi.fn(),
      createMessage: vi.fn(),
    };
  });

  it('executes successfully with valid input', async () => {
    const input = { message: 'test' };
    const result = await myTool.logic(input, appContext, sdkContext);
    expect(result).toBeDefined();
  });

  it('throws McpError on invalid input', async () => {
    const input = { message: '' };
    await expect(myTool.logic(input, appContext, sdkContext)).rejects.toThrow(
      McpError,
    );
  });
});
```

---

## Observability

### Logging

All requests are logged with context automatically:

```typescript
logger.info('Tool execution started', {
  tool: TOOL_NAME,
  requestId: appContext.requestContext.requestId,
  inputSize: JSON.stringify(input).length,
});
```

### OpenTelemetry

Automatic instrumentation tracks:

- Request duration
- Success/failure rates
- Input/output payload sizes
- Error codes

Metrics: `mcp_tool_execution_duration_ms`, `mcp_tool_execution_success`, `mcp_tool_payload_size_bytes`.

---

## Best practices

### Pure logic functions

```typescript
// ❌ Bad - side effects in logic
async logic(input, appContext, sdkContext) {
  console.log('Processing...');
  globalState.update(input);
  return { result: 'done' };
}

// ✅ Good - pure function
async logic(input, appContext, sdkContext) {
  const result = processInput(input);
  return { result };
}
```

### Descriptive schemas

```typescript
// ❌ Bad - no descriptions
const InputSchema = z.object({
  msg: z.string(),
  n: z.number(),
});

// ✅ Good - LLM-friendly descriptions
const InputSchema = z.object({
  message: z.string().describe('The message to process'),
  count: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe('Number of times to repeat (1-10)'),
});
```

### Error handling in logic

```typescript
// ❌ Bad - swallow errors
async logic(input) {
  try {
    return await riskyOperation();
  } catch {
    return { error: 'failed' };
  }
}

// ✅ Good - throw McpError
async logic(input) {
  try {
    return await riskyOperation();
  } catch (error) {
    throw new McpError(
      JsonRpcErrorCode.InternalError,
      `Operation failed: ${error instanceof Error ? error.message : 'Unknown'}`,
      { originalError: error }
    );
  }
}
```

### Dependency injection for services

Tools and resources are declarative definitions, not classes. For services, use DI:

```typescript
// ❌ Bad - direct instantiation in logic
import { StorageService } from '@/storage/core/StorageService.js';

async logic(input, appContext, sdkContext) {
  const storage = new StorageService();  // Don't do this!
  return await storage.get('key', appContext);
}

// ✅ Good - use DI-injected services from appContext
// Services are injected at server startup and made available through context
import { container } from 'tsyringe';
import { StorageService } from '@/container/core/tokens.js';

async logic(input, appContext, sdkContext) {
  // Resolve service from container
  const storage = container.resolve(StorageService);
  return await storage.get('key', appContext);
}
```

Declarative tool pattern:

```typescript
// Tools are declarative definitions, not classes
export const myTool: ToolDefinition<typeof InputSchema, typeof OutputSchema> = {
  name: 'my_tool',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  async logic(input, appContext, sdkContext) {
    // Use services via container resolution
    const storage = container.resolve(StorageService);
    return await storage.get(input.key, appContext);
  },
};
```

---

## Troubleshooting

| Problem | Fix |
| :--- | :--- |
| Tool not found | Ensure tool is exported in [tools/definitions/index.ts](tools/definitions/index.ts) |
| Input validation error | Check Zod schema has `.describe()` calls and matches client input |
| 401 Unauthorized | Check `MCP_AUTH_MODE`, verify token, check scopes in `withToolAuth` |
| Cannot connect to server | Verify `MCP_TRANSPORT_TYPE`. HTTP: check port/firewall. stdio: check process spawn. |

---

## See also

- [Tools](tools/README.md) — Tool development guide
- [Resources](resources/README.md) — Resource development guide
- [Transports](transports/README.md) — Transport configuration
- [Services](../services/README.md) — External service integration
- [CLAUDE.md](../../CLAUDE.md) — Architectural mandate
