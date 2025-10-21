<div align="center">
  <h1>mcp-ts-template</h1>
  <p><b>Production-grade TypeScript template for building Model Context Protocol (MCP) servers. Ships with declarative tools/resources, robust error handling, DI, easy auth, optional OpenTelemetry, and first-class support for both local and edge (Cloudflare Workers) runtimes.</b>
  <div>5 Tools • 1 Resource • 1 Prompt</div>
  </p>
</div>

<div align="center">

[![Version](https://img.shields.io/badge/Version-2.5.5-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--06--18-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-^1.20.1-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) [![Status](https://img.shields.io/badge/Status-Stable-brightgreen.svg?style=flat-square)](https://github.com/cyanheads/mcp-ts-template/issues) [![TypeScript](https://img.shields.io/badge/TypeScript-^5.9.3-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/) [![Bun](https://img.shields.io/badge/Bun-v1.2.23-blueviolet.svg?style=flat-square)](https://bun.sh/) [![Code Coverage](https://img.shields.io/badge/Coverage-76.12%25-brightgreen.svg?style=flat-square)](./coverage/index.html)

</div>

---

## ✨ Features

- **Declarative Tools & Resources**: Define capabilities in single, self-contained files. The framework handles registration and execution.
- **Elicitation Support**: Tools can interactively prompt the user for missing parameters during execution, streamlining user workflows.
- **Robust Error Handling**: A unified `McpError` system ensures consistent, structured error responses across the server.
- **Pluggable Authentication**: Secure your server with zero-fuss support for `none`, `jwt`, or `oauth` modes.
- **Abstracted Storage**: Swap storage backends (`in-memory`, `filesystem`, `Supabase`, `SurrealDB`, `Cloudflare D1/KV/R2`) without changing business logic. Features secure opaque cursor pagination, parallel batch operations, and comprehensive validation.
- **Graph Database Operations**: Optional graph service for relationship management, graph traversals, and pathfinding algorithms (SurrealDB provider).
- **Full-Stack Observability**: Get deep insights with structured logging (Pino) and optional, auto-instrumented OpenTelemetry for traces and metrics.
- **Dependency Injection**: Built with `tsyringe` for a clean, decoupled, and testable architecture.
- **Service Integrations**: Pluggable services for external APIs, including LLM providers (OpenRouter), text-to-speech (ElevenLabs), and graph operations (SurrealDB).
- **Rich Built-in Utility Suite**: Helpers for parsing (PDF, YAML, CSV, frontmatter), formatting (diffs, tables, trees, markdown), scheduling, security, and more.
- **Edge-Ready**: Write code once and run it seamlessly on your local machine or at the edge on Cloudflare Workers.

## 🏗️ Architecture

This template follows a modular, domain-driven architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│              MCP Client (Claude Code, ChatGPT, etc.)    │
└────────────────────┬────────────────────────────────────┘
                     │ JSON-RPC 2.0
                     ▼
┌─────────────────────────────────────────────────────────┐
│           MCP Server (Tools, Resources)                 │
│           📖 [MCP Server Guide](src/mcp-server/)        │
└────────────────────┬────────────────────────────────────┘
                     │ Dependency Injection
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Dependency Injection Container                 │
│              📦 [Container Guide](src/container/)       │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
 ┌──────────┐   ┌──────────┐   ┌──────────┐
 │ Services │   │ Storage  │   │ Utilities│
 │ 🔌 [→]   │   │ 💾 [→]   │   │ 🛠️ [→]   │
 └──────────┘   └──────────┘   └──────────┘

[→]: src/services/    [→]: src/storage/    [→]: src/utils/
```

**Key Modules:**

- **[MCP Server](src/mcp-server/)** - Tools, resources, prompts, and transport layer implementations
- **[Container](src/container/)** - Dependency injection setup with tsyringe for clean architecture
- **[Services](src/services/)** - External service integrations (LLM, Speech, Graph) with pluggable providers
- **[Storage](src/storage/)** - Abstracted persistence layer with multiple backend support
- **[Utilities](src/utils/)** - Cross-cutting concerns (logging, security, parsing, telemetry)

> 💡 **Tip**: Each module has its own comprehensive README with architecture diagrams, usage examples, and best practices. Click the links above to dive deeper!

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

- [Bun v1.2.21](https://bun.sh/) or higher.

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

| Variable                    | Description                                                                                                             | Default     |
| :-------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :---------- |
| `MCP_TRANSPORT_TYPE`        | The transport to use: `stdio` or `http`.                                                                                | `http`      |
| `MCP_HTTP_PORT`             | The port for the HTTP server.                                                                                           | `3010`      |
| `MCP_HTTP_HOST`             | The hostname for the HTTP server.                                                                                       | `127.0.0.1` |
| `MCP_AUTH_MODE`             | Authentication mode: `none`, `jwt`, or `oauth`.                                                                         | `none`      |
| `MCP_AUTH_SECRET_KEY`       | **Required for `jwt` auth mode.** A 32+ character secret.                                                               | `(none)`    |
| `OAUTH_ISSUER_URL`          | **Required for `oauth` auth mode.** URL of the OIDC provider.                                                           | `(none)`    |
| `STORAGE_PROVIDER_TYPE`     | Storage backend: `in-memory`, `filesystem`, `supabase`, `surrealdb`, `cloudflare-d1`, `cloudflare-kv`, `cloudflare-r2`. | `in-memory` |
| `STORAGE_FILESYSTEM_PATH`   | **Required for `filesystem` storage.** Path to the storage directory.                                                   | `(none)`    |
| `SUPABASE_URL`              | **Required for `supabase` storage.** Your Supabase project URL.                                                         | `(none)`    |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required for `supabase` storage.** Your Supabase service role key.                                                    | `(none)`    |
| `SURREALDB_URL`             | **Required for `surrealdb` storage.** SurrealDB endpoint (e.g., `wss://cloud.surrealdb.com/rpc`).                       | `(none)`    |
| `SURREALDB_NAMESPACE`       | **Required for `surrealdb` storage.** SurrealDB namespace.                                                              | `(none)`    |
| `SURREALDB_DATABASE`        | **Required for `surrealdb` storage.** SurrealDB database name.                                                          | `(none)`    |
| `SURREALDB_USERNAME`        | **Optional for `surrealdb` storage.** Database username for authentication.                                             | `(none)`    |
| `SURREALDB_PASSWORD`        | **Optional for `surrealdb` storage.** Database password for authentication.                                             | `(none)`    |
| `OTEL_ENABLED`              | Set to `true` to enable OpenTelemetry.                                                                                  | `false`     |
| `LOG_LEVEL`                 | The minimum level for logging (`debug`, `info`, `warn`, `error`).                                                       | `info`      |
| `OPENROUTER_API_KEY`        | API key for OpenRouter LLM service.                                                                                     | `(none)`    |

### Authentication & Authorization

- **Modes**: `none` (default), `jwt` (requires `MCP_AUTH_SECRET_KEY`), or `oauth` (requires `OAUTH_ISSUER_URL` and `OAUTH_AUDIENCE`).
- **Enforcement**: Wrap your tool/resource `logic` functions with `withToolAuth([...])` or `withResourceAuth([...])` to enforce scope checks. Scope checks are bypassed for developer convenience when auth mode is `none`.

### Storage

- **Service**: A DI-managed `StorageService` provides a consistent API for persistence. **Never access `fs` or other storage SDKs directly from tool logic.**
- **Providers**: The default is `in-memory`. Node-only providers include `filesystem`. Edge-compatible providers include `supabase`, `surrealdb`, `cloudflare-kv`, and `cloudflare-r2`.
- **SurrealDB Setup**: When using `surrealdb` provider, initialize the database schema using `docs/surrealdb-schema.surql` before first use.
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
  bun run test # Runs the test suite (Do not use 'bun test' directly as it may not work correctly)
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

| Directory                              | Purpose & Contents                                                                   | Guide                                |
| :------------------------------------- | :----------------------------------------------------------------------------------- | :----------------------------------- |
| `src/mcp-server/tools/definitions`     | Your tool definitions (`*.tool.ts`). This is where you add new capabilities.         | [📖 MCP Guide](src/mcp-server/)      |
| `src/mcp-server/resources/definitions` | Your resource definitions (`*.resource.ts`). This is where you add new data sources. | [📖 MCP Guide](src/mcp-server/)      |
| `src/mcp-server/transports`            | Implementations for HTTP and STDIO transports, including auth middleware.            | [📖 MCP Guide](src/mcp-server/)      |
| `src/storage`                          | The `StorageService` abstraction and all storage provider implementations.           | [💾 Storage Guide](src/storage/)     |
| `src/services`                         | Integrations with external services (e.g., the default OpenRouter LLM provider).     | [🔌 Services Guide](src/services/)   |
| `src/container`                        | Dependency injection container registrations and tokens.                             | [📦 Container Guide](src/container/) |
| `src/utils`                            | Core utilities for logging, error handling, performance, security, and telemetry.    |                                      |
| `src/config`                           | Environment variable parsing and validation with Zod.                                |                                      |
| `tests/`                               | Unit and integration tests, mirroring the `src/` directory structure.                |                                      |

## 📚 Documentation

Each major module includes comprehensive documentation with architecture diagrams, usage examples, and best practices:

### Core Modules

- **[MCP Server Guide](src/mcp-server/)** - Complete guide to building MCP tools and resources
  - Creating tools with declarative definitions
  - Resource development with URI templates
  - Authentication and authorization
  - Transport layer (HTTP/stdio) configuration
  - SDK context and client interaction
  - Response formatting and error handling

- **[Container Guide](src/container/)** - Dependency injection with tsyringe
  - Understanding DI tokens and registration
  - Service lifetimes (singleton, transient, instance)
  - Constructor injection patterns
  - Testing with mocked dependencies
  - Adding new services to the container

- **[Services Guide](src/services/)** - External service integration patterns
  - LLM provider integration (OpenRouter)
  - Speech services (TTS/STT with ElevenLabs, Whisper)
  - Graph database operations (SurrealDB)
  - Creating custom service providers
  - Health checks and error handling

- **[Storage Guide](src/storage/)** - Abstracted persistence layer
  - Storage provider implementations
  - Multi-tenancy and tenant isolation
  - Secure cursor-based pagination
  - Batch operations and TTL support
  - Provider-specific setup guides

### Additional Resources

- **[AGENTS.md](AGENTS.md)** - Strict development rules for AI agents
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and breaking changes
- **[docs/tree.md](docs/tree.md)** - Complete visual directory structure
- **[docs/publishing-mcp-server-registry.md](docs/publishing-mcp-server-registry.md)** - Publishing guide for MCP Registry

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
