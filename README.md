<div align="center">
  <h1>mcp-ts-template</h1>
  <p><b>TypeScript template for building Model Context Protocol (MCP) servers. Ships with declarative tools/resources, pluggable auth, multi-backend storage, OpenTelemetry observability, and support for both local and edge (Cloudflare Workers) runtimes.</b>
  <div>7 Tools • 2 Resources • 1 Prompt</div>
  </p>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/Version-3.0.9-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--11--25-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-11-25/changelog.mdx) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-^1.27.1-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) 

[![Status](https://img.shields.io/badge/Status-Stable-brightgreen.svg?style=flat-square)](https://github.com/cyanheads/mcp-ts-template/issues) [![TypeScript](https://img.shields.io/badge/TypeScript-^5.9.3-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/) [![Bun](https://img.shields.io/badge/Bun-v1.3.2-blueviolet.svg?style=flat-square)](https://bun.sh/) [![Code Coverage](https://img.shields.io/badge/Coverage-86.30%25-brightgreen.svg?style=flat-square)](./coverage/index.html)

</div>

---

> **Try it live** — A public demo instance is running at `https://mcp-ts-template.caseyjhand.com/mcp`. Connect any MCP client to test the template's tools and resources without installing anything.

## Features

- Define tools and resources in single, self-contained files. The framework handles registration.
- Tools can prompt users for missing parameters mid-execution via elicitation.
- Unified `McpError` system for consistent, structured error responses.
- Auth modes: `none`, `jwt`, or `oauth`. Wrap logic with `withToolAuth`/`withResourceAuth`.
- Swap storage backends (`in-memory`, `filesystem`, `Supabase`, `Cloudflare D1/KV/R2`) without changing tool logic. Includes cursor pagination, batch ops, and input validation.
- Structured logging (Pino) with optional OpenTelemetry for tracing and metrics.
- Direct construction via `createApp()` composition root. No DI framework.
- Pluggable service integrations: LLM (OpenRouter), TTS (ElevenLabs).
- Parsing helpers (PDF, YAML, CSV, frontmatter), formatting (diffs, tables, trees, markdown), scheduling, security.
- Runs on local (stdio/HTTP) and edge (Cloudflare Workers) with the same code.

## Architecture

Modular, domain-driven layout with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│              MCP Client (Claude Code, ChatGPT, etc.)    │
└────────────────────┬────────────────────────────────────┘
                     │ JSON-RPC 2.0
                     ▼
┌─────────────────────────────────────────────────────────┐
│           MCP Server (Tools, Resources)                 │
│              [MCP Server Guide](src/mcp-server/)         │
└────────────────────┬────────────────────────────────────┘
                     │ createApp() composition root
                     ▼
        ┌────────────┼────────────┐
        ▼            ▼            ▼
 ┌──────────┐   ┌──────────┐   ┌──────────┐
 │ Services │   │ Storage  │   │ Utilities│
 │    [→]   │   │    [→]   │   │    [→]   │
 └──────────┘   └──────────┘   └──────────┘

[→]: src/services/    [→]: src/storage/    [→]: src/utils/
```

Key modules:

- [MCP Server](src/mcp-server/) — Tools, resources, prompts, and transport layer
- [Services](src/services/) — External integrations (LLM, Speech, Graph) with pluggable providers
- [Storage](src/storage/) — Persistence layer with multiple backend support
- [Utilities](src/utils/) — Logging, security, parsing, telemetry

## Included capabilities

This template includes working examples to get you started.

### Tools

| Tool                                | Description                                                              |
| :---------------------------------- | :----------------------------------------------------------------------- |
| **`template_echo_message`**         | Echoes a message back with optional formatting and repetition.           |
| **`template_cat_fact`**             | Fetches a random cat fact from an external API.                          |
| **`template_madlibs_elicitation`**  | Demonstrates elicitation by asking for words to complete a story.        |
| **`template_code_review_sampling`** | Uses the LLM service to perform a simulated code review.                 |
| **`template_image_test`**           | Returns a test image as a base64-encoded data URI.                       |
| **`template_async_countdown`**      | Demonstrates MCP Tasks API with an async countdown timer (experimental). |
| **`template_data_explorer`**        | Generates sample sales data with an interactive explorer UI (MCP Apps).  |

### Resources

| Resource               | URI                                    | Description                                                 |
| :--------------------- | :------------------------------------- | :---------------------------------------------------------- |
| **`echo`**             | `echo://{message}`                     | A simple resource that echoes back a message.               |
| **`data-explorer-ui`** | `ui://template-data-explorer/app.html` | Interactive HTML app for the data explorer tool (MCP Apps). |

### Prompts

| Prompt            | Description                                                      |
| :---------------- | :--------------------------------------------------------------- |
| **`code-review`** | A structured prompt for guiding an LLM to perform a code review. |

## Getting started

### MCP client configuration

Add the following to your MCP client configuration file.

```json
{
  "mcpServers": {
    "mcp-ts-template": {
      "type": "stdio",
      "command": "bunx",
      "args": ["mcp-ts-template@latest"],
      "env": {
        "MCP_TRANSPORT_TYPE": "stdio",
        "MCP_LOG_LEVEL": "info",
        "STORAGE_PROVIDER_TYPE": "filesystem",
        "STORAGE_FILESYSTEM_PATH": "/path/to/your/storage"
      }
    }
  }
}
```

Or connect to the public demo server over HTTP — no installation required:

```json
{
  "mcpServers": {
    "mcp-ts-template": {
      "type": "streamable-http",
      "url": "https://mcp-ts-template.caseyjhand.com/mcp"
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

## Configuration

All configuration is centralized and validated at startup in `src/config/index.ts`. Key environment variables in your `.env` file include:

| Variable                  | Description                                                                                                | Default      |
| :------------------------ | :--------------------------------------------------------------------------------------------------------- | :----------- |
| `MCP_TRANSPORT_TYPE`      | The transport to use: `stdio` or `http`.                                                                   | `stdio`      |
| `MCP_HTTP_PORT`           | The port for the HTTP server.                                                                              | `3010`       |
| `MCP_HTTP_HOST`           | The hostname for the HTTP server.                                                                          | `127.0.0.1`  |
| `MCP_LOG_LEVEL`           | Logging level (`debug`, `info`, `notice`, `warning`, `error`, `crit`, `alert`, `emerg`).                   | `debug`      |
| `MCP_AUTH_MODE`           | Authentication mode: `none`, `jwt`, or `oauth`.                                                            | `none`       |
| `MCP_AUTH_SECRET_KEY`     | **Required for `jwt` auth mode.** A 32+ character secret.                                                  | `(none)`     |
| `DEV_MCP_AUTH_BYPASS`     | Set to `true` to bypass JWT auth in development (requires no secret key).                                  | `false`      |
| `OAUTH_ISSUER_URL`        | **Required for `oauth` auth mode.** URL of the OIDC provider.                                              | `(none)`     |
| `OAUTH_AUDIENCE`          | **Required for `oauth` auth mode.** Expected audience claim in the JWT.                                    | `(none)`     |
| `STORAGE_PROVIDER_TYPE`   | Storage backend: `in-memory`, `filesystem`, `supabase`, `cloudflare-d1`, `cloudflare-kv`, `cloudflare-r2`. | `in-memory`  |
| `STORAGE_FILESYSTEM_PATH` | Path to the storage directory (for `filesystem` provider).                                                 | `./.storage` |
| `SUPABASE_URL`            | **Required for `supabase` storage.** Your Supabase project URL.                                            | `(none)`     |
| `SUPABASE_ANON_KEY`       | **Required for `supabase` storage.** Your Supabase anon key.                                               | `(none)`     |
| `OTEL_ENABLED`            | Set to `true` to enable OpenTelemetry.                                                                     | `false`      |
| `OPENROUTER_API_KEY`      | API key for OpenRouter LLM service.                                                                        | `(none)`     |

### Authentication and authorization

- Modes: `none` (default), `jwt` (requires `MCP_AUTH_SECRET_KEY`), or `oauth` (requires `OAUTH_ISSUER_URL` and `OAUTH_AUDIENCE`).
- In development, set `DEV_MCP_AUTH_BYPASS=true` to skip JWT validation without a secret key. Rejected in production.
- Wrap tool/resource `logic` with `withToolAuth([...])` or `withResourceAuth([...])` for scope checks. Checks are bypassed when auth mode is `none`.

### Storage

- `StorageService` provides a consistent API for persistence. Never access `fs` or storage SDKs directly from tool logic.
- Default provider is `in-memory`. Node-only: `filesystem`. Edge-compatible: `supabase`, `cloudflare-kv`, `cloudflare-r2`.
- `StorageService` requires `context.tenantId`, auto-propagated from the JWT `tid` claim when auth is enabled.
- Opaque cursor pagination with tenant binding, parallel batch ops (`getMany`/`setMany`/`deleteMany`), TTL support, centralized input validation.

### Observability

- Pino for structured JSON logging. All logs include `RequestContext`.
- OpenTelemetry disabled by default. Enable with `OTEL_ENABLED=true`. HTTP spans via `@hono/otel` (works on Bun). Tool-call metrics (duration, payload sizes, errors) captured automatically. Pino logs correlate to traces via `trace_id`/`span_id`.

## Running the server

### Local development

- **Build and run the production version**:

  ```sh
  # One-time build
  bun run rebuild

  # Run the built server
  bun run start:http
  # or
  bun run start:stdio
  ```

- **Run checks and tests**:
  ```sh
  bun run devcheck # Lints, formats, type-checks, and more
  bun run test # Runs the test suite (Do not use 'bun test' directly as it may not work correctly)
  ```

### Cloudflare workers

1.  **Build the Worker bundle**:

```sh
bun run build:worker
```

2.  **Run locally with Wrangler**:

```sh
bun run deploy:dev
```

3.  **Deploy to Cloudflare**:

```sh
bun run deploy:prod
```

> **Note**: The `wrangler.toml` file is pre-configured to enable `nodejs_compat` for best results.

## Project structure

| Directory                               | Purpose & Contents                                                                   | Guide                                |
| :-------------------------------------- | :----------------------------------------------------------------------------------- | :----------------------------------- |
| `src/mcp-server/tools/definitions`      | Tool definitions (`*.tool.ts`). Add new capabilities here.                           | [MCP Guide](src/mcp-server/)      |
| `src/mcp-server/resources/definitions`  | Resource definitions (`*.resource.ts`). Add new data sources here.                   | [MCP Guide](src/mcp-server/)      |
| `src/mcp-server/prompts/definitions`    | Prompt definitions (`*.prompt.ts`). Add new prompt templates here.                   | [MCP Guide](src/mcp-server/)      |
| `src/mcp-server/tasks`                  | Async task infrastructure (MCP Tasks API, experimental).                             | [MCP Guide](src/mcp-server/)      |
| `src/mcp-server/transports`             | HTTP and STDIO transports, including auth middleware.                                 | [MCP Guide](src/mcp-server/)      |
| `src/storage`                           | `StorageService` abstraction and provider implementations.                           | [Storage Guide](src/storage/)     |
| `src/services`                          | External service integrations (LLM, Speech, Graph) with pluggable providers.         | [Services Guide](src/services/)   |
| `src/app.ts`                            | Composition root — `createApp()` constructs all services in dependency order.         |                                      |
| `src/utils`                             | Core utilities for logging, error handling, performance, security, and telemetry.    |                                      |
| `src/config`                            | Environment variable parsing and validation with Zod.                                |                                      |
| `tests/`                                | Unit and integration tests, mirroring the `src/` directory structure.                |                                      |

## Documentation

Each module directory has its own README with architecture details and examples.

### Core modules

- [MCP Server Guide](src/mcp-server/) — Building tools, resources, auth, transports, SDK context, response formatting
- [Services Guide](src/services/) — LLM (OpenRouter), Speech (ElevenLabs, Whisper), Graph, custom providers
- [Storage Guide](src/storage/) — Provider implementations, multi-tenancy, pagination, batch ops, TTL

### Other references

- [AGENTS.md](AGENTS.md) — Development rules for AI agents
- [CHANGELOG.md](CHANGELOG.md) — Version history and breaking changes
- [docs/tree.md](docs/tree.md) — Visual directory structure
- [docs/publishing-mcp-server-registry.md](docs/publishing-mcp-server-registry.md) — Publishing to MCP Registry

## Agent development guide

See `AGENTS.md` for the full rules when using this template with an AI agent. Key principles:

- Never use `try/catch` in tool/resource `logic`. Throw `McpError` instead — handlers catch.
- Use `elicitInput` from `SdkContext` to ask for missing user input.
- Pass `RequestContext` through the call stack.
- Import from the defining file, not barrel `index.ts`. Register new tools/resources in `definitions/index.ts`.

## FAQ

- **Does this work with both STDIO and Streamable HTTP?** Yes. Use `bun run dev:stdio` or `bun run dev:http`.
- **Can I deploy this to the edge?** Yes. Run `bun run build:worker` and deploy with Wrangler.
- **Do I have to use OpenTelemetry?** No, disabled by default. Set `OTEL_ENABLED=true` to enable.
- **How do I publish my server to the MCP Registry?** See `docs/publishing-mcp-server-registry.md`.

## Contributing

Issues and pull requests are welcome. Run checks and tests before submitting:

```sh
bun run devcheck
bun run test
```

## License

This project is licensed under the Apache 2.0 License. See the [LICENSE](./LICENSE) file for details.

---

<div align="center">
  <p>
    <a href="https://github.com/sponsors/cyanheads">Sponsor this project</a> •
    <a href="https://www.buymeacoffee.com/cyanheads">Buy me a coffee</a>
  </p>
</div>
