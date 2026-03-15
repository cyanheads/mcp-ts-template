<div align="center">
  <h1>@cyanheads/mcp-ts-core</h1>
  <p><b>TypeScript framework for building Model Context Protocol (MCP) servers. Declarative tool/resource/prompt definitions, pluggable auth, multi-backend storage, OpenTelemetry observability, and support for both local (stdio/HTTP) and edge (Cloudflare Workers) runtimes.</b></p>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/Version-0.1.4-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--11--25-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/changelog.mdx) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-^1.27.1-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE)

[![TypeScript](https://img.shields.io/badge/TypeScript-^5.9.3-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/) [![Bun](https://img.shields.io/badge/Bun-v1.3.2-blueviolet.svg?style=flat-square)](https://bun.sh/)

</div>

---

## What is this?

`@cyanheads/mcp-ts-core` is the infrastructure layer for TypeScript MCP servers. Install it as a dependency — don't fork it. You write tools, resources, and prompts; the framework handles transports, auth, storage, config, logging, telemetry, and lifecycle.

```ts
import { createApp, tool, z } from '@cyanheads/mcp-ts-core';

const greet = tool('greet', {
  description: 'Greet someone by name and return a personalized message.',
  annotations: { readOnlyHint: true },
  input: z.object({ name: z.string().describe('Name of the person to greet') }),
  output: z.object({ message: z.string().describe('The greeting message') }),
  handler: async (input) => ({ message: `Hello, ${input.name}!` }),
});

await createApp({ tools: [greet] });
```

That's a complete MCP server. Every tool call is automatically logged with duration, payload sizes, memory usage, and request correlation — no instrumentation code needed. `createApp()` handles config parsing, logger init, transport startup, signal handlers, and graceful shutdown.

## Features

- **Declarative definitions** — `tool()`, `resource()`, `prompt()` builders with Zod schemas. Framework handles registration, validation, and response formatting.
- **Unified Context** — handlers receive a single `ctx` object with `ctx.log` (request-scoped logging), `ctx.state` (tenant-scoped storage), `ctx.elicit` (user prompting), `ctx.sample` (LLM completion), and `ctx.signal` (cancellation).
- **Inline auth** — `auth: ['scope']` on definitions. No wrapper functions. Framework checks scopes before calling your handler.
- **Task tools** — `task: true` flag for long-running operations. Framework manages the full lifecycle (create, poll, progress, complete/fail/cancel).
- **Structured error handling** — Handlers throw freely; the framework catches, classifies, and formats. Error factories (`notFound()`, `validationError()`, `serviceUnavailable()`, etc.) for precise control when the code matters. Auto-classification from plain `Error` messages when it doesn't.
- **Multi-backend storage** — `in-memory`, `filesystem`, `Supabase`, `Cloudflare D1/KV/R2`. Swap providers via env var without changing tool logic. Cursor pagination, batch ops, TTL, tenant isolation.
- **Pluggable auth** — `none`, `jwt`, or `oauth` modes. JWT with local secret or OAuth with JWKS verification.
- **Observability** — Pino structured logging with optional OpenTelemetry tracing and metrics. Request IDs, trace correlation, tool execution metrics — all automatic.
- **Local + edge** — Same code runs on stdio, HTTP (Hono), and Cloudflare Workers. `createApp()` for Node, `createWorkerHandler()` for Workers.
- **Tiered dependencies** — Core deps always installed. Parsers, sanitization, scheduling, OTEL SDK, Supabase, OpenAI — optional peers. Install what you use.
- **Agent-first DX** — Ships `CLAUDE.md` with full exports catalog, patterns, and contracts. AI coding agents can build on the framework with zero ramp-up.

## Quick start

```bash
bunx @cyanheads/mcp-ts-core init my-mcp-server
cd my-mcp-server
bun install
```

That gives you a working project with `CLAUDE.md`, skills, config files, and a scaffolded `src/` directory. Open it in your editor, start your coding agent, and tell it what tools to build. The agent learns the framework from the included docs and skills — tool definitions, resources, services, testing patterns, all of it.

### What you get

Here's what tool definitions look like:

```ts
import { tool, z } from '@cyanheads/mcp-ts-core';

export const search = tool('search', {
  description: 'Search for items by query.',
  input: z.object({
    query: z.string().describe('Search query'),
    limit: z.number().default(10).describe('Max results'),
  }),
  async handler(input) {
    const results = await doSearch(input.query, input.limit);
    return { items: results };
  },
});
```

And resources:

```ts
import { resource, z } from '@cyanheads/mcp-ts-core';

export const itemData = resource('items://{itemId}', {
  description: 'Retrieve item data by ID.',
  params: z.object({ itemId: z.string().describe('Item ID') }),
  async handler(params, ctx) {
    return await getItem(params.itemId);
  },
});
```

Everything registers through `createApp()` in your entry point:

```ts
await createApp({
  name: 'my-mcp-server',
  version: '0.1.0',
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
});
```

It also works on Cloudflare Workers with `createWorkerHandler()` — same definitions, different entry point.

## Server structure

```
my-mcp-server/
  src/
    index.ts                              # createApp() entry point
    worker.ts                             # createWorkerHandler() (optional)
    config/
      server-config.ts                    # Server-specific env vars
    services/
      [domain]/                           # Domain services (init/accessor pattern)
    mcp-server/
      tools/definitions/                  # Tool definitions (.tool.ts)
      resources/definitions/              # Resource definitions (.resource.ts)
      prompts/definitions/                # Prompt definitions (.prompt.ts)
  package.json
  tsconfig.json                           # extends @cyanheads/mcp-ts-core/tsconfig.base.json
  CLAUDE.md                               # Points to core's CLAUDE.md for framework docs
```

No `src/utils/`, no `src/storage/`, no `src/types-global/`, no `src/mcp-server/transports/` — infrastructure lives in `node_modules`.

## Configuration

All core config is Zod-validated from environment variables. Server-specific config uses a separate Zod schema with lazy parsing.

| Variable | Description | Default |
|:---------|:------------|:--------|
| `MCP_TRANSPORT_TYPE` | `stdio` or `http` | `stdio` |
| `MCP_HTTP_PORT` | HTTP server port | `3010` |
| `MCP_HTTP_HOST` | HTTP server hostname | `127.0.0.1` |
| `MCP_AUTH_MODE` | `none`, `jwt`, or `oauth` | `none` |
| `MCP_AUTH_SECRET_KEY` | JWT signing secret (required for `jwt` mode) | — |
| `STORAGE_PROVIDER_TYPE` | `in-memory`, `filesystem`, `supabase`, `cloudflare-d1`/`kv`/`r2` | `in-memory` |
| `OTEL_ENABLED` | Enable OpenTelemetry | `false` |
| `OPENROUTER_API_KEY` | OpenRouter LLM API key | — |

See [CLAUDE.md](CLAUDE.md) for the full configuration reference.

## API overview

### Entry points

| Function | Purpose |
|:---------|:--------|
| `createApp(options)` | Node.js server — handles full lifecycle |
| `createWorkerHandler(options)` | Cloudflare Workers — returns `{ fetch, scheduled }` |

### Builders

| Builder | Usage |
|:--------|:------|
| `tool(name, options)` | Define a tool with `handler(input, ctx)` |
| `resource(uriTemplate, options)` | Define a resource with `handler(params, ctx)` |
| `prompt(name, options)` | Define a prompt with `generate(args)` |

### Context

Handlers receive a unified `Context` object:

| Property | Type | Description |
|:---------|:-----|:------------|
| `ctx.log` | `ContextLogger` | Request-scoped logger (auto-correlates requestId, traceId, tenantId) |
| `ctx.state` | `ContextState` | Tenant-scoped key-value storage |
| `ctx.elicit` | `Function?` | Ask the user for input (when client supports it) |
| `ctx.sample` | `Function?` | Request LLM completion from the client |
| `ctx.signal` | `AbortSignal` | Cancellation signal |
| `ctx.progress` | `ContextProgress?` | Task progress reporting (when `task: true`) |
| `ctx.requestId` | `string` | Unique request ID |
| `ctx.tenantId` | `string?` | Tenant ID (from JWT or `'default'` for stdio) |

### Subpath exports

```ts
import { createApp, tool, resource, prompt } from '@cyanheads/mcp-ts-core';
import { createWorkerHandler } from '@cyanheads/mcp-ts-core/worker';
import { McpError, JsonRpcErrorCode, notFound, serviceUnavailable } from '@cyanheads/mcp-ts-core/errors';
import { checkScopes } from '@cyanheads/mcp-ts-core/auth';
import { markdown, fetchWithTimeout } from '@cyanheads/mcp-ts-core/utils';
import { OpenRouterProvider, GraphService } from '@cyanheads/mcp-ts-core/services';
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
```

See [CLAUDE.md](CLAUDE.md) for the complete exports reference.

## Examples

The `examples/` directory contains a reference server consuming core through public exports, demonstrating all patterns:

| Tool | Pattern |
|:-----|:--------|
| `template_echo_message` | Basic tool with `format`, `auth` |
| `template_cat_fact` | External API call, error factories |
| `template_madlibs_elicitation` | `ctx.elicit` for interactive input |
| `template_code_review_sampling` | `ctx.sample` for LLM completion |
| `template_image_test` | Image content blocks |
| `template_async_countdown` | `task: true` with `ctx.progress` |
| `template_data_explorer` | MCP Apps with linked UI resource |

## Testing

```ts
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
import { myTool } from '@/mcp-server/tools/definitions/my-tool.tool.js';

const ctx = createMockContext({ tenantId: 'test-tenant' });
const input = myTool.input.parse({ query: 'test' });
const result = await myTool.handler(input, ctx);
```

`createMockContext()` provides stubbed `log`, `state`, and `signal`. Pass `{ tenantId }` for state operations, `{ sample }` for LLM mocking, `{ elicit }` for elicitation mocking, `{ progress: true }` for task tools.

## Documentation

- **[CLAUDE.md](CLAUDE.md)** — Complete API reference: exports catalog, patterns, Context interface, error codes, auth, config, testing. Ships in the npm package.
- **[CHANGELOG.md](CHANGELOG.md)** — Version history

## Development

```bash
bun run build          # tsc && tsc-alias
bun run devcheck       # lint, format, typecheck, security
bun run test           # vitest
bun run dev:stdio      # dev mode (stdio)
bun run dev:http       # dev mode (HTTP)
```

## Contributing

Issues and pull requests welcome. Run checks before submitting:

```bash
bun run devcheck
bun run test
```

## License

Apache 2.0 — see [LICENSE](./LICENSE).

---

<div align="center">
  <p>
    <a href="https://github.com/sponsors/cyanheads">Sponsor this project</a> •
    <a href="https://www.buymeacoffee.com/cyanheads">Buy me a coffee</a>
  </p>
</div>
