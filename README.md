<div align="center">
  <h1>mcp-ts-template</h1>
  <p><b>Production-grade TypeScript template for building Model Context Protocol (MCP) servers. Ships with declarative tools/resources, robust error handling, DI, easy auth, optional OpenTelemetry, and first-class support for both local and edge (Cloudflare Workers) runtimes.</b>
  <div>5 Tools • 1 Resource • 1 Prompt</div>
  </p>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/Version-2.4.0-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--06--18-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-^1.20.0-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) [![Status](https://img.shields.io/badge/Status-Stable-brightgreen.svg?style=flat-square)](https://github.com/cyanheads/mcp-ts-template/issues) [![TypeScript](https://img.shields.io/badge/TypeScript-^5.9.3-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/) [![Bun](https://img.shields.io/badge/Bun-v1.2.23-blueviolet.svg?style=flat-square)](https://bun.sh/) [![Code Coverage](https://img.shields.io/badge/Coverage-85.96%25-brightgreen.svg?style=flat-square)](./coverage/lcov-report/)

</div>

---

## ✨ Features

- **Declarative Tools & Resources**: Define capabilities in single, self-contained files. The framework handles registration and execution.
- **Elicitation Support**: Tools can interactively prompt the user for missing parameters during execution, streamlining user workflows.
- **Robust Error Handling**: A unified `McpError` system ensures consistent, structured error responses across the server.
- **Pluggable Authentication**: Secure your server with zero-fuss support for `none`, `jwt`, or `oauth` modes.
- **Abstracted Storage**: Swap storage backends (`in-memory`, `filesystem`, `Supabase`, `Cloudflare KV/R2`) without changing business logic. Features secure opaque cursor pagination, parallel batch operations, and comprehensive validation.
- **Full-Stack Observability**: Get deep insights with structured logging (Pino) and optional, auto-instrumented OpenTelemetry for traces and metrics.
- **Dependency Injection**: Built with `tsyringe` for a clean, decoupled, and testable architecture.
- **Service Integrations**: Pluggable services for external APIs, including LLM providers (OpenRouter) and text-to-speech (ElevenLabs).
- **Rich Built-in Utility Suite**: Helpers for parsing (PDF, YAML, CSV), scheduling, security, and more.
- **Edge-Ready**: Write code once and run it seamlessly on your local machine or at the edge on Cloudflare Workers.

## 🛠️ Included Capabilities

This template includes working examples to get you started.

### Tools

| Tool                                | Description                                                       |
| :---------------------------------- | :---------------------------------------------------------------- |
| **`template_echo_message`**         | Echoes a message back with optional formatting and repetition.    |
| **`template_cat_fact`**             | Fetches a random cat fact from an external API.                   |
| **`template_madlibs_elicitation`**  | Demonstrates elicitation by asking for words to complete a story. |
| **`template_code_review_sampling`** | Uses the LLM service to perform a simulated code review.          |
| **`template_image_test`**           | Returns a test image as a base64-encoded data URI.                |

### Resources

| Resource   | URI                | Description                                   |
| :--------- | :----------------- | :-------------------------------------------- |
| **`echo`** | `echo://{message}` | A simple resource that echoes back a message. |

### Prompts

| Prompt            | Description                                                      |
| :---------------- | :--------------------------------------------------------------- |
| **`code-review`** | A structured prompt for guiding an LLM to perform a code review. |

## 🚀 Getting Started

### MCP Client Settings/Configuration

Add the following to your MCP Client configuration file (e.g., `cline_mcp_settings.json`).

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

## ⚙️ Configuration

All configuration is centralized and validated at startup in `src/config/index.ts`. Key environment variables in your `.env` file include:

| Variable                    | Description                                                                    | Default     |
| :-------------------------- | :----------------------------------------------------------------------------- | :---------- |
| `MCP_TRANSPORT_TYPE`        | The transport to use: `stdio` or `http`.                                       | `http`      |
| `MCP_HTTP_PORT`             | The port for the HTTP server.                                                  | `3010`      |
| `MCP_HTTP_HOST`             | The hostname for the HTTP server.                                              | `127.0.0.1` |
| `MCP_AUTH_MODE`             | Authentication mode: `none`, `jwt`, or `oauth`.                                | `none`      |
| `MCP_AUTH_SECRET_KEY`       | **Required for `jwt` auth mode.** A 32+ character secret.                      | `(none)`    |
| `OAUTH_ISSUER_URL`          | **Required for `oauth` auth mode.** URL of the OIDC provider.                  | `(none)`    |
| `STORAGE_PROVIDER_TYPE`     | Storage backend: `in-memory`, `filesystem`, `supabase`, `cloudflare-kv`, `r2`. | `in-memory` |
| `STORAGE_FILESYSTEM_PATH`   | **Required for `filesystem` storage.** Path to the storage directory.          | `(none)`    |
| `SUPABASE_URL`              | **Required for `supabase` storage.** Your Supabase project URL.                | `(none)`    |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required for `supabase` storage.** Your Supabase service role key.           | `(none)`    |
| `OTEL_ENABLED`              | Set to `true` to enable OpenTelemetry.                                         | `false`     |
| `LOG_LEVEL`                 | The minimum level for logging (`debug`, `info`, `warn`, `error`).              | `info`      |
| `OPENROUTER_API_KEY`        | API key for OpenRouter LLM service.                                            | `(none)`    |

### Authentication & Authorization

- **Modes**: `none` (default), `jwt` (requires `MCP_AUTH_SECRET_KEY`), or `oauth` (requires `OAUTH_ISSUER_URL` and `OAUTH_AUDIENCE`).
- **Enforcement**: Wrap your tool/resource `logic` functions with `withToolAuth([...])` or `withResourceAuth([...])` to enforce scope checks. Scope checks are bypassed for developer convenience when auth mode is `none`.

### Storage

- **Service**: A DI-managed `StorageService` provides a consistent API for persistence. **Never access `fs` or other storage SDKs directly from tool logic.**
- **Providers**: The default is `in-memory`. Node-only providers include `filesystem`. Edge-compatible providers include `supabase`, `cloudflare-kv`, and `cloudflare-r2`.
- **Multi-Tenancy**: The `StorageService` requires `context.tenantId`. This is automatically propagated from the `tid` claim in a JWT when auth is enabled.
- **Advanced Features**:
  - **Secure Pagination**: Opaque cursors with tenant ID binding prevent cross-tenant attacks
  - **Batch Operations**: Parallel execution for `getMany()`, `setMany()`, `deleteMany()`
  - **TTL Support**: Time-to-live with proper expiration handling across all providers
  - **Comprehensive Validation**: Centralized input validation for tenant IDs, keys, and options

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

```sh
bun deploy:prod
```

> **Note**: The `wrangler.toml` file is pre-configured to enable `nodejs_compat` for best results.

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

---

<div align="center">
  <p>
    <a href="https://github.com/sponsors/cyanheads">Sponsor this project</a> •
    <a href="https://www.buymeacoffee.com/cyanheads">Buy me a coffee</a>
  </p>
</div>
