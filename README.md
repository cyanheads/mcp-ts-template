<div align="center">
  <br />
  <img src="https://raw.githubusercontent.com/modelcontextprotocol/brand-assets/main/mcp-icon-dark-bg.png" alt="MCP Logo" width="140" />
  <br />
  <h1>MCP TypeScript Server Template</h1>
  <p><b>The definitive, production-grade starting point for building powerful and scalable Model Context Protocol (MCP) servers.</b></p>
  
  [![Version](https://img.shields.io/badge/Version-2.0.0-blue.svg?style=flat-square)](./CHANGELOG.md)
  [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--06--18-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx)
  [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE)
  [![Status](https://img.shields.io/badge/Status-Stable-brightgreen.svg?style=flat-square)](https://github.com/cyanheads/mcp-ts-template/issues)
  [![TypeScript](https://img.shields.io/badge/TypeScript-^5.5-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/)
  <br />

</div>

---

**`mcp-ts-template`** is more than just a template; it's a feature-rich, production-ready framework for building robust, observable, and secure MCP servers. It provides a solid architectural foundation, handling the complex plumbing of a modern backend system so you can focus entirely on creating powerful tools and resources for AI agents.

Provides an LLM-Optimized **[AGENTS.md](./.AGENTS.md)** for your coding agents, ensuring best practices are followed from the start.

## ✨ Core Features

This template is packed with production-grade features designed for high-performance, secure, and maintainable MCP servers.

| Feature                             | Description                                                                                                                                                          |
| :---------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Declarative Tooling**             | Define tools in a single, self-contained file (`*.tool.ts`). The framework handles registration, validation, error handling, and performance metrics automatically.  |
| **Full Observability**              | Zero-configuration **OpenTelemetry** integration. Get distributed traces and metrics out-of-the-box for all your tools and underlying dependencies (HTTP, DNS).      |
| **Pluggable Auth**                  | Built-in authentication middleware supporting **JWT** and **OAuth 2.1**. Easily toggle auth modes or extend with new strategies via the `AuthStrategy` interface.    |
| **Stateful & Stateless Transports** | Choose between **stdio** or **HTTP** transports. The HTTP transport supports both persistent, stateful sessions and ephemeral, stateless requests intelligently.     |
| **Robust Error Handling**           | A centralized `ErrorHandler` maps all exceptions to standardized `JsonRpcErrorCode`s and automatically correlates them with OpenTelemetry traces for easy debugging. |
| **Type-Safe & Validated**           | **Zod** is used everywhere for rigorous schema validation of configuration, tool inputs/outputs, and API boundaries, preventing invalid data at the source.          |
| **Abstracted Storage Layer**        | A flexible, provider-based storage service (`IStorageProvider`) with ready-to-use backends for **In-Memory**, **Filesystem**, and **Supabase**.                      |
| **Comprehensive Utilities**         | A rich set of internal utilities for logging (`Winston`), rate-limiting, security sanitization, ID generation, cron scheduling, and network requests.                |
| **Integration-First Testing**       | Pre-configured with **Vitest** and **`msw`** for writing meaningful integration tests that reflect real-world usage, ensuring reliability from end to end.           |
| **Agent-Ready Design**              | Includes detailed `.clinerules` to guide developer LLM agents, ensuring they adhere to the project's architectural standards from day one.                           |

---

## 🚀 Getting Started

Launch your MCP server development environment in minutes.

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/cyanheads/mcp-ts-template.git
    cd mcp-ts-template
    ```

2.  **Install Dependencies (Bun)**

    ```bash
    bun install
    ```

3.  **Configure Environment**
    Copy the example environment file and fill in any necessary values (e.g., API keys).

    ```bash
    cp .env.example .env
    ```

4.  **Build the Project**

    ```bash
    bun run build
    ```

5.  **Run the Server**
    You can run the server in two primary modes:
    - **STDIO Transport**: Ideal for local development or when the server is a child process.

      ```bash
      bun run start:stdio
      ```

    - **HTTP Transport**: For network-accessible deployments.
      ```bash
      bun run start:http
      # Server now running at http://127.0.0.1:3010
      ```

---

## 🏗️ Architectural Principles

This template enforces a set of non-negotiable architectural principles to ensure every server built from it is robust, maintainable, and debuggable.

### 1. The "Logic Throws, Handler Catches" Pattern

This is the cornerstone of control flow and error handling. It creates a complete separation between pure business logic and the surrounding infrastructure concerns.

- **Core Logic (`logic`)**: Defined within your `ToolDefinition`, this is a pure, stateless `async` function. It contains only the business logic for the tool. If an operational or validation error occurs, it **must** terminate by `throw`ing a structured `McpError`. It **never** contains a `try...catch` block.
- **Handler (Auto-Generated)**: The `toolHandlerFactory` automatically wraps your `logic` function in a robust `try...catch` block at runtime. This factory-generated handler is responsible for creating the `RequestContext`, measuring performance with OpenTelemetry, invoking your logic, and catching any thrown errors. It is the _only_ place where errors are caught and formatted into a final `CallToolResult`.

This pattern allows you to write clean, focused business logic while the framework guarantees it's executed within a fully instrumented, safe, and observable context.

### 2. Full-Stack Observability by Default

Every operation is traceable from end to end without any manual setup.

- **OpenTelemetry SDK**: Initialized in `src/utils/telemetry/instrumentation.ts` _before any other module_, it automatically instruments supported I/O operations (HTTP, DNS, etc.).
- **Trace-Aware Context**: The `requestContextService` automatically injects the active `traceId` and `spanId` into every `RequestContext`.
- **Error-Trace Correlation**: The central `ErrorHandler` records every handled exception on the active OTel span and sets its status to `ERROR`, ensuring every failure is visible and searchable in your tracing backend.
- **Performance Spans**: The `measureToolExecution` utility wraps every tool call in a dedicated span, capturing duration, status, and input/output sizes as attributes.

### 3. Declarative, Self-Contained Components

Tools and resources are defined declaratively in single, self-contained files. This makes the system highly modular and easy to reason about. The server discovers and registers these components at startup, handling all the necessary boilerplate.

---

## 📁 Project Structure

```
.
├── .clinerules/         # --> Rules and mandates for LLM-based development agents.
├── .github/             # --> GitHub Actions workflows (e.g., CI/CD).
├── .vscode/             # --> Recommended VS Code settings.
├── scripts/             # --> Helper scripts for development (cleaning, docs, etc.).
├── src/
│   ├── config/          # --> Application configuration (Zod schemas, loader).
│   ├── mcp-server/
│   │   ├── resources/   # --> Resource definitions (e.g., echoResource).
│   │   ├── tools/       # --> Tool definitions and utilities.
│   │   ├── transports/  # --> HTTP and STDIO transport layers, including auth.
│   │   └── server.ts    # --> Core McpServer setup and component registration.
│   ├── services/        # --> Clients for external services (e.g., LLM providers).
│   ├── storage/         # --> Abstracted storage layer and providers.
│   ├── types-global/    # --> Global TypeScript types (e.g., McpError).
│   └── utils/           # --> Core utilities (logger, error handler, security).
└── tests/               # --> Vitest integration and unit tests.
```

## 🔧 Extending the Template

### Adding a New Tool

1.  Create a new file: `src/mcp-server/tools/definitions/my-new-tool.tool.ts`.
2.  Use `echo.tool.ts` or `cat-fact.tool.ts` as a template.
3.  Define your `InputSchema` and `OutputSchema` using **Zod**.
4.  Write your core business logic in an `async` function.
5.  Export a `ToolDefinition` object containing the name, schemas, and logic.
6.  Import and register your new tool in `src/mcp-server/server.ts`.

The framework will automatically handle the rest: validation, error handling, performance metrics, and registration with the MCP server.

### Adding a New Storage Provider

1.  Create a new provider class that implements the `IStorageProvider` interface from `src/storage/core/IStorageProvider.ts`.
2.  Add your new provider type to the `enum` in `src/config/index.ts`.
3.  Add a case for your provider in the `createStorageProvider` function in `src/storage/core/storageFactory.ts`.
4.  Set the `STORAGE_PROVIDER_TYPE` environment variable to your new provider's name.

---

## ⚙️ Configuration

The server is configured via environment variables, loaded and validated by the `config` module (`src/config/index.ts`).

1.  Copy `.env.example` to `.env`.
2.  Fill in the required values for your setup.

Key environment variables include:

- `MCP_TRANSPORT_TYPE`: `stdio` or `http`.
- `MCP_SESSION_MODE`: `stateless` or `stateful`.
- `MCP_AUTH_MODE`: `none`, `jwt`, or `oauth`.
- `STORAGE_PROVIDER_TYPE`: `in-memory`, `filesystem`, or `supabase`.
- `OTEL_ENABLED`: Set to `true` to enable OpenTelemetry.
- `OPENROUTER_API_KEY`: API key for the OpenRouter LLM service.

Refer to **`.env.example`** for a complete list of configurable options.

## 🤝 Contributing

This is an open-source project. Contributions, issues, and feature requests are welcome. Please feel free to fork the repository, make changes, and open a pull request.

## 📄 License

This project is licensed under the **Apache 2.0 License**. See the [LICENSE](./LICENSE) file for details.
