<div align="center">
  <h1>mcp-ts-template</h1>
  <p><b>Production-grade TypeScript template for building Model Context Protocol (MCP) servers. Ships with declarative tools/resources, robust error handling, DI, easy auth, optional OpenTelemetry, and first-class support for both local and edge (Cloudflare Workers) runtimes.</b></p>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/Version-2.3.3-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--06--18-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-^1.18.2-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) [![Status](https://img.shields.io/badge/Status-Stable-brightgreen.svg?style=flat-square)](https://github.com/cyanheads/mcp-ts-template/issues) [![TypeScript](https://img.shields.io/badge/TypeScript-^5.9.3-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/) [![Bun](https://img.shields.io/badge/Bun-v1.2.23-blueviolet.svg?style=flat-square)](https://bun.sh/) [![Code Coverage](https://img.shields.io/badge/Coverage-87.74%25-brightgreen.svg?style=flat-square)](./coverage/lcov-report/)

</div>

---

## ✨ Features

- **Declarative Tools & Resources**: Define capabilities in single, self-contained files. The framework handles registration and execution.
- **Elicitation Support**: Tools can interactively prompt the user for missing parameters during execution, streamlining user workflows.
- **Robust Error Handling**: A unified `McpError` system ensures consistent, structured error responses across the server.
- **Pluggable Authentication**: Secure your server with zero-fuss support for `none`, `jwt`, or `oauth` modes.
- **Abstracted Storage**: Swap storage backends (`in-memory`, `filesystem`, `Supabase`, `Cloudflare KV/R2`) without changing business logic.
- **Full-Stack Observability**: Get deep insights with structured logging (Pino) and optional, auto-instrumented OpenTelemetry for traces and metrics.
- **Dependency Injection**: Built with `tsyringe` for a clean, decoupled, and testable architecture.
- **Service Integrations**: Pluggable services for external APIs, including LLM providers (OpenRouter) and text-to-speech (ElevenLabs).
- **Rich Built-in Utility Suite**: Helpers for parsing (PDF, YAML, CSV), scheduling, security, and more.
- **Edge-Ready**: Write code once and run it seamlessly on your local machine or at the edge on Cloudflare Workers.

## 🚀 Getting Started

### MCP Client Settings/Configuration

Add the following to your MCP Client configuration file (e.g., `cline_mcp_settings.json`).

```json
{
  "mcpServers": {
    "mcp-ts-template": {
      "command": "bunx",
      "args": ["mcp-ts-template@latest"],
      "env": {
        "MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

### Prerequisites

- [Bun v1.2.0](https://bun.sh/) or higher.

### Installation

1.  **Clone the repository:**

```sh
git clone https://github.com/cyanheads/mcp-ts-template.git
```

2.  **Navigate into the directory:**

```sh
cd mcp-ts-template
```

3.  **Install dependencies:**

```sh
bun install
```

## 🛠️ Understanding the Template: Tools & Resources

This template includes working examples of tools and resources.

### 1. Example Tool: `template_echo_message`

This tool echoes back a message with optional formatting. You can find the full source at `src/mcp-server/tools/definitions/template-echo-message.tool.ts`.

<details>
<summary>Click to see the `echoTool` definition structure</summary>

```ts
// Located at: src/mcp-server/tools/definitions/template-echo-message.tool.ts
import { z } from 'zod';
import type {
  SdkContext,
  ToolDefinition,
} from '@/mcp-server/tools/utils/toolDefinition.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { type RequestContext, logger } from '@/utils/index.js';

// 1. Define Input and Output Schemas with Zod for validation.
const InputSchema = z.object({
  message: z.string().min(1).describe('The message to echo back.'),
  mode: z
    .enum(['standard', 'uppercase', 'lowercase'])
    .default('standard')
    .describe('Formatting mode.'),
  repeat: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(1)
    .describe('Number of times to repeat the message.'),
});

const OutputSchema = z.object({
  repeatedMessage: z
    .string()
    .describe('The final, formatted, and repeated message.'),
  // ... other fields from the actual file
});

// 2. Implement the pure business logic for the tool.
async function echoToolLogic(
  input: z.infer<typeof InputSchema>,
  appContext: RequestContext,
  sdkContext: SdkContext,
): Promise<z.infer<typeof OutputSchema>> {
  // ... logic to format and repeat the message
  const formattedMessage = input.message.toUpperCase(); // simplified for example
  const repeatedMessage = Array(input.repeat).fill(formattedMessage).join(' ');
  return { repeatedMessage };
}

// 3. Assemble the final Tool Definition.
export const echoTool: ToolDefinition<typeof InputSchema, typeof OutputSchema> =
  {
    name: 'template_echo_message', // The official tool name
    title: 'Template Echo Message',
    description:
      'Echoes a message back with optional formatting and repetition.',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    logic: withToolAuth(['tool:echo:read'], echoToolLogic), // Secure the tool
  };
```

The `echoTool` is registered in `src/mcp-server/tools/definitions/index.ts`, making it available to the server on startup. For an example of how to use the new elicitation feature, see `template_madlibs_elicitation.tool.ts`.

</details>

### 2. Example Resource: `echo-resource`

This resource provides a simple echo response via a URI. The source is located at `src/mcp-server/resources/definitions/echo.resource.ts`.

<details>
<summary>Click to see the `echoResourceDefinition` structure</summary>

```ts
// Located at: src/mcp-server/resources/definitions/echo.resource.ts
import { z } from 'zod';
import type { ResourceDefinition } from '@/mcp-server/resources/utils/resourceDefinition.js';
import { withResourceAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { type RequestContext, logger } from '@/utils/index.js';

// 1. Define Parameter and Output Schemas.
const ParamsSchema = z.object({
  message: z.string().optional().describe('Message to echo from the URI.'),
});

const OutputSchema = z.object({
  message: z.string().describe('The echoed message.'),
  timestamp: z.string().datetime().describe('Timestamp of the response.'),
  requestUri: z.string().url().describe('The original request URI.'),
});

// 2. Implement the pure read logic for the resource.
function echoLogic(
  uri: URL,
  params: z.infer<typeof ParamsSchema>,
  context: RequestContext,
): z.infer<typeof OutputSchema> {
  const messageToEcho = params.message || uri.hostname || 'Default echo';
  return {
    message: messageToEcho,
    timestamp: new Date().toISOString(),
    requestUri: uri.href,
  };
}

// 3. Assemble the final Resource Definition.
export const echoResourceDefinition: ResourceDefinition<
  typeof ParamsSchema,
  typeof OutputSchema
> = {
  name: 'echo-resource', // The official resource name
  title: 'Echo Message Resource',
  description: 'A simple echo resource that returns a message.',
  uriTemplate: 'echo://{message}',
  paramsSchema: ParamsSchema,
  outputSchema: OutputSchema,
  logic: withResourceAuth(['resource:echo:read'], echoLogic), // Secure the resource
};
```

Like the tool, `echoResourceDefinition` is registered in `src/mcp-server/resources/definitions/index.ts`.

</details>

## ⚙️ Core Concepts

### Configuration

All configuration is centralized and validated at startup in `src/config/index.ts`. Key environment variables in your `.env` file include:

| Variable                | Description                                                                    | Default     |
| :---------------------- | :----------------------------------------------------------------------------- | :---------- |
| `MCP_TRANSPORT_TYPE`    | The transport to use: `stdio` or `http`.                                       | `http`      |
| `MCP_HTTP_PORT`         | The port for the HTTP server.                                                  | `3010`      |
| `MCP_AUTH_MODE`         | Authentication mode: `none`, `jwt`, or `oauth`.                                | `none`      |
| `STORAGE_PROVIDER_TYPE` | Storage backend: `in-memory`, `filesystem`, `supabase`, `cloudflare-kv`, `r2`. | `in-memory` |
| `OTEL_ENABLED`          | Set to `true` to enable OpenTelemetry.                                         | `false`     |
| `LOG_LEVEL`             | The minimum level for logging.                                                 | `info`      |

### Authentication & Authorization

- **Modes**: `none` (default), `jwt` (requires `MCP_AUTH_SECRET_KEY`), or `oauth` (requires `OAUTH_ISSUER_URL` and `OAUTH_AUDIENCE`).
- **Enforcement**: Wrap your tool/resource `logic` functions with `withToolAuth([...])` or `withResourceAuth([...])` to enforce scope checks. Scope checks are bypassed for developer convenience when auth mode is `none`.

### Storage

- **Service**: A DI-managed `StorageService` provides a consistent API for persistence. **Never access `fs` or other storage SDKs directly from tool logic.**
- **Providers**: The default is `in-memory`. Node-only providers include `filesystem`. Edge-compatible providers include `supabase`, `cloudflare-kv`, and `cloudflare-r2`.
- **Multi-Tenancy**: The `StorageService` requires `context.tenantId`. This is automatically propagated from the `tid` claim in a JWT when auth is enabled.

### Observability

- **Structured Logging**: Pino is integrated out-of-the-box. All logs are JSON and include the `RequestContext`.
- **OpenTelemetry**: Disabled by default. Enable with `OTEL_ENABLED=true` and configure OTLP endpoints. Traces, metrics (duration, payload sizes), and errors are automatically captured for every tool call.

## ▶️ Running the Server

### Local Development

- **Build and run the production version**:

  ```sh
  # One-time build
  bun rebuild

  # Run the built server
  bun start:http
  # or
  bun start:stdio
  ```

- **Run checks and tests**:
  ```sh
  bun devcheck # Lints, formats, type-checks, and more
  bun test # Runs the test suite
  ```

### Cloudflare Workers

1.  **Build the Worker bundle**:

```sh
bun build:worker
```

2.  **Run locally with Wrangler**:

```sh
bun deploy:dev
```

3.  **Deploy to Cloudflare**:
    `sh
bun deploy:prod
` > **Note**: The `wrangler.toml` file is pre-configured to enable `nodejs_compat` for best results.

## 📂 Project Structure

| Directory                              | Purpose & Contents                                                                   |
| :------------------------------------- | :----------------------------------------------------------------------------------- |
| `src/mcp-server/tools/definitions`     | Your tool definitions (`*.tool.ts`). This is where you add new capabilities.         |
| `src/mcp-server/resources/definitions` | Your resource definitions (`*.resource.ts`). This is where you add new data sources. |
| `src/mcp-server/transports`            | Implementations for HTTP and STDIO transports, including auth middleware.            |
| `src/storage`                          | The `StorageService` abstraction and all storage provider implementations.           |
| `src/services`                         | Integrations with external services (e.g., the default OpenRouter LLM provider).     |
| `src/container`                        | Dependency injection container registrations and tokens.                             |
| `src/utils`                            | Core utilities for logging, error handling, performance, security, and telemetry.    |
| `src/config`                           | Environment variable parsing and validation with Zod.                                |
| `tests/`                               | Unit and integration tests, mirroring the `src/` directory structure.                |

## 🧑‍💻 Agent Development Guide

For a strict set of rules when using this template with an AI agent, please refer to **`AGENTS.md`**. Key principles include:

- **Logic Throws, Handlers Catch**: Never use `try/catch` in your tool/resource `logic`. Throw an `McpError` instead.
- **Use Elicitation for Missing Input**: If a tool requires user input that wasn't provided, use the `elicitInput` function from the `SdkContext` to ask the user for it.
- **Pass the Context**: Always pass the `RequestContext` object through your call stack.
- **Use the Barrel Exports**: Register new tools and resources only in the `index.ts` barrel files.

## ❓ FAQ

- **Does this work with both STDIO and Streamable HTTP?**
  - Yes. Both transports are first-class citizens. Use `bun run dev:stdio` or `bun run dev:http`.
- **Can I deploy this to the edge?**
  - Yes. The template is designed for Cloudflare Workers. Run `bun run build:worker` and deploy with Wrangler.
- **Do I have to use OpenTelemetry?**
  - No, it is disabled by default. Enable it by setting `OTEL_ENABLED=true` in your `.env` file.
- **How do I publish my server to the MCP Registry?**
  - Follow the step-by-step guide in `docs/publishing-mcp-server-registry.md`.

## 🤝 Contributing

Issues and pull requests are welcome! If you plan to contribute, please run the local checks and tests before submitting your PR.

```sh
bun run devcheck
bun test
```

## 📜 License

This project is licensed under the Apache 2.0 License. See the [LICENSE](./LICENSE) file for details.
