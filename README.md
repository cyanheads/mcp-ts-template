<div align="center">
  <h1>mcp-ts-template</h1>
  <p><b>The definitive, production-grade template for building powerful and scalable Model Context Protocol (MCP) servers with TypeScript, featuring built-in observability (OpenTelemetry), declarative tooling, robust error handling, and a modular, DI-driven architecture.</b></p>
  
  [![Version](https://img.shields.io/badge/Version-2.0.7-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--06--18-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx) [![Model Context Protocol](https://img.shields.io/badge/MCP%20SDK-^1.18.0-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) [![Status](https://img.shields.io/badge/Status-Stable-brightgreen.svg?style=flat-square)](https://github.com/cyanheads/mcp-ts-template/issues) [![TypeScript](https://img.shields.io/badge/TypeScript-^5.9-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/) [![Bun](https://img.shields.io/badge/Bun-v1.2.21-blueviolet.svg?style=flat-square)](https://bun.sh/) [![Code Coverage](https://img.shields.io/badge/Coverage-96.14%25-brightgreen.svg?style=flat-square)](./coverage/lcov-report/)

</div>

---

**`mcp-ts-template`** is more than just a template; it's a feature-rich, production-ready framework for building robust, observable, and secure MCP servers, providing a solid architectural foundation so you can focus entirely on creating powerful tools and resources for AI agents.

This project is designed to be **AI-agent-friendly**, providing an LLM-optimized **[AGENTS.md](./AGENTS.md)** and detailed rules in **[.clinerules/clinerules.md](./.clinerules/clinerules.md)** to ensure your coding agents adhere to best practices from the start.

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
| **Agent-Ready Design**              | Includes detailed guidance in `AGENTS.md` and `.clinerules/` to direct developer LLM agents, ensuring they adhere to the project's architectural standards.          |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.2.0 or higher)

### Installation

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/cyanheads/mcp-ts-template.git
    cd mcp-ts-template
    ```

2.  **Install Dependencies**

    ```bash
    bun install
    ```

3.  **Build the Project**
    ```bash
    bun build # or bun rebuild
    ```

---

## 🏃 Running the Server

You can run the server in several modes for development and production.

### Standard Transports

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

Tools and resources are defined declaratively in single, self-contained files. This makes the system highly modular and easy to reason about.

### 4. Dependency Injection for Maximum Decoupling

The entire architecture is built around a Dependency Injection (DI) container (`tsyringe`).

- **Centralized Container**: All services, providers, and managers are registered in a central DI container, configured in `src/container/`.
- **Inversion of Control**: Components never create their own dependencies. Instead, they receive them via constructor injection, making them highly testable and decoupled.
- **Auto-Registration**: Tool and resource definitions are automatically discovered and registered with the container from barrel exports, eliminating manual wiring.

---

## 📁 Project Structure

```
.
├── .clinerules/         # --> Rules and mandates for LLM-based development agents.
├── .github/             # --> GitHub Actions workflows (e.g., CI/CD).
├── scripts/             # --> Helper scripts for development (cleaning, docs, etc.).
├── src/
│   ├── config/          # --> Application configuration (Zod schemas, loader).
│   ├── container/       # --> Dependency Injection container setup and registrations.
│   ├── mcp-server/
│   │   ├── resources/   # --> Declarative resource definitions (*.resource.ts).
│   │   ├── tools/       # --> Declarative tool definitions (*.tool.ts).
│   │   ├── transports/  # --> HTTP and STDIO transport layers, including auth.
│   │   └── server.ts    # --> Core McpServer setup (resolves components from DI).
│   ├── services/        # --> Clients for external services (e.g., LLM providers).
│   ├── storage/         # --> Abstracted storage layer and providers.
│   ├── types-global/    # --> Global TypeScript types (e.g., McpError).
│   └── utils/           # --> Core utilities (logger, error handler, security).
├── tests/               # --> Vitest integration and unit tests.
├── .env.example         # --> Example environment variables.
├── AGENTS.md            # --> Detailed architectural guide for LLM agents.
└── Dockerfile           # --> For building and running the server in a container.
```

## 🔧 Extending the Template

### Adding a New Tool

1.  **Create the Definition**: Create a new file at `src/mcp-server/tools/definitions/my-new-tool.tool.ts`. Use an existing tool as a template.
2.  **Define the Tool**: Export a single `const` of type `ToolDefinition` containing the name, Zod schemas, and pure business logic.
3.  **Register via Barrel Export**: Open `src/mcp-server/tools/definitions/index.ts` and add your new tool definition to the `allToolDefinitions` array.

```ts
// src/mcp-server/tools/definitions/index.ts
import { myNewTool } from './my-new-tool.tool.js';
// ... other imports
export const allToolDefinitions = [
  // ... other tools
  myNewTool,
];
```

That's it. The DI container automatically discovers and registers all tools from this array at startup.

### Adding a New Storage Provider

1.  **Create Provider**: Create a new class under `src/storage/providers/` that implements the `IStorageProvider` interface.
2.  **Add to Factory**: Open `src/storage/core/storageFactory.ts`. Add a case to the `switch` statement to instantiate your new provider based on the `STORAGE_PROVIDER_TYPE` from the config.
3.  **Update Config Schema**: Add your new provider's name to the `StorageProviderType` enum in `src/config/index.ts`.
4.  **Set Environment Variable**: In your `.env` file, set `STORAGE_PROVIDER_TYPE` to your new provider's name.

---

## ⚙️ Configuration

The server is configured via environment variables, loaded and validated by `src/config/index.ts`. Copy `.env.example` to `.env` and fill in the required values.

| Variable                    | Description                                                  | Default      |
| :-------------------------- | :----------------------------------------------------------- | :----------- |
| `MCP_TRANSPORT_TYPE`        | Transport to use: `stdio` or `http`.                         | `http`       |
| `MCP_SESSION_MODE`          | HTTP session mode: `stateless`, `stateful`, or `auto`.       | `auto`       |
| `MCP_AUTH_MODE`             | Authentication mode: `none`, `jwt`, or `oauth`.              | `none`       |
| `MCP_LOG_LEVEL`             | Minimum log level: `debug`, `info`, `warning`, `error`, etc. | `debug`      |
| `LOGS_DIR`                  | Directory for log files.                                     | `logs/`      |
| `STORAGE_PROVIDER_TYPE`     | Storage backend: `in-memory`, `filesystem`, `supabase`.      | `filesystem` |
| `STORAGE_FILESYSTEM_PATH`   | Path for the filesystem storage provider.                    | `./.storage` |
| `OPENROUTER_API_KEY`        | API key for the OpenRouter LLM service.                      | ` `          |
| `OTEL_ENABLED`              | Set to `true` to enable OpenTelemetry.                       | `false`      |
| `MCP_AUTH_SECRET_KEY`       | Secret key for signing JWTs (required for `jwt` auth mode).  | ` `          |
| `SUPABASE_URL`              | URL for your Supabase project.                               | ` `          |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for Supabase admin tasks.                   | ` `          |

Refer to **`.env.example`** for a complete list of configurable options.

## 📜 Available Scripts

Key scripts available in `package.json`:

| Script                  | Description                                                                                                    |
| :---------------------- | :------------------------------------------------------------------------------------------------------------- |
| `bun run devdocs`       | Generates a comprehensive development documentation prompt for AI analysis.                                    |
| `bun run rebuild`       | Clears logs, cache, and compiles the TypeScript source code to JavaScript in `dist/`.                          |
| `bun run start:http`    | Starts the compiled server using the HTTP transport.                                                           |
| `bun run start:stdio`   | Starts the compiled server using the STDIO transport.                                                          |
| `bun run test`          | Runs all unit and integration tests with Vitest.                                                               |
| `bun run test:coverage` | Runs all tests and generates a code coverage report.                                                           |
| `bun run devcheck`      | A comprehensive script that runs linting, type-checking, and formatting.                                       |
| `bun run publish-mcp`   | **(Recommended)** An all-in-one script to sync, validate, commit, and publish your server to the MCP Registry. |

You can find these scripts in the `scripts/` directory.

---

## 📦 Publishing to the MCP Registry

This template is configured for easy publishing to the public [MCP Registry](https://modelcontext.com/registry), making your server discoverable by any MCP-compatible client. The recommended method is to use the all-in-one publishing script.

For a complete walkthrough, including alternative methods and CI/CD automation, please refer to the detailed guide:

**[➡️ How to Publish Your MCP Server](./docs/publishing-mcp-server-registry.md)**

### The Easy Way: All-in-One Publish Script

This template includes a powerful script that automates the entire publishing workflow—from syncing versions and validating schemas to committing changes and publishing.

1.  **Ensure you are on the `main` branch with no uncommitted changes.**
2.  **Run the script:**
    ```bash
    bun run publish-mcp
    ```

The script will guide you through the process, including pausing for you to complete the GitHub browser login.

### Script Flags for More Control

The script also supports flags for more granular control:

- `--validate-only`: Syncs metadata, validates `server.json`, then stops.
- `--no-commit`: Skips the automatic Git commit step.
- `--publish-only`: Skips local file changes and proceeds directly to publishing.

Example:

```bash
bun run publish-mcp --validate-only
```

This template also includes a GitHub Actions workflow (`.github/workflows/publish-mcp.yml`) that can be configured to automate this process whenever you push a new Git tag.

## 🤝 Contributing

This is an open-source project. Contributions, issues, and feature requests are welcome. Please feel free to fork the repository, make changes, and open a pull request.

## 📄 License

This project is licensed under the **Apache 2.0 License**. See the [LICENSE](./LICENSE) file for details.
