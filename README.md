<div align="center">

# mcp-ts-template

**Build production-grade Model Context Protocol (MCP) servers with a powerful, type-safe, and extensible foundation.**

[![TypeScript](https://img.shields.io/badge/TypeScript-^5.8.3-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Model Context Protocol SDK](https://img.shields.io/badge/MCP%20SDK-^1.17.0-green?style=flat-square)](https://github.com/modelcontextprotocol/typescript-sdk)
[![MCP Spec Version](https://img.shields.io/badge/MCP%20Spec-2025--06--18-lightgrey?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx)
[![Version](https://img.shields.io/badge/Version-1.7.9-blue?style=flat-square)](./CHANGELOG.md)
[![Coverage](https://img.shields.io/badge/Coverage-65.78%25-brightgreen?style=flat-square)](./vitest.config.ts)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-Stable-green?style=flat-square)](https://github.com/cyanheads/mcp-ts-template/issues)
[![GitHub](https://img.shields.io/github/stars/cyanheads/mcp-ts-template?style=social)](https://github.com/cyanheads/mcp-ts-template)

</div>

This template provides a comprehensive foundation for building rich Model Context Protocol servers, adhering to the **MCP 2025-06-18 specification** and modern best practices. It includes a fully-featured server, production-ready utilities, and clear documentation to get you up and running quickly.

## 🤔 Why Use This Template?

Building a robust server for AI agents is more than just writing code. It requires a solid architecture, consistent error handling, and secure, type-safe practices from the ground up. This template solves these challenges by providing:

- **Accelerated Development**: Skip the boilerplate and focus on your tool's core logic.
- **Production-Ready Foundation**: Built-in logging, error handling, security, and testing.
- **Best Practices by Default**: Enforces a clean, modular architecture that's easy to maintain and extend.
- **AI-Ready**: Designed with LLM agents in mind, including detailed schemas and rich LLM developer-friendly resources (e.g. .clinerules).

> **Note on src/mcp-client & src/agent:** The MCP client & Agent components have been enhanced and moved to the [**atlas-mcp-agent**](https://github.com/cyanheads/atlas-mcp-agent) repository. This template now focuses exclusively on providing a best-in-class server implementation and framework.

## ✨ Key Features

| Feature Area                | Description                                                                                                                                          | Key Components / Location                                            |
| :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| **🔌 MCP Server**           | A functional server with example tools and resources. Supports `stdio` and a **Streamable HTTP** transport built with [**Hono**](https://hono.dev/). | `src/mcp-server/`, `src/mcp-server/transports/`                      |
| **🚀 Production Utilities** | Logging, Error Handling, ID Generation, Rate Limiting, Request Context tracking, Input Sanitization.                                                 | `src/utils/`                                                         |
| **🔒 Type Safety/Security** | Strong type checking via TypeScript & Zod validation. Built-in security utilities (sanitization, auth middleware for HTTP).                          | Throughout, `src/utils/security/`, `src/mcp-server/transports/auth/` |
| **⚙️ Error Handling**       | Consistent error categorization (`BaseErrorCode`), detailed logging, centralized handling (`ErrorHandler`).                                          | `src/utils/internal/errorHandler.ts`, `src/types-global/`            |
| **📚 Documentation**        | Comprehensive `README.md`, structured JSDoc comments, API references.                                                                                | `README.md`, Codebase, `tsdoc.json`, `docs/api-references/`          |
| **🕵️ Interaction Logging**  | Captures raw requests and responses for all external LLM provider interactions to a dedicated `interactions.log` file for full traceability.         | `src/utils/internal/logger.ts`                                       |
| **🤖 Agent Ready**          | Includes a [.clinerules](./.clinerules/clinerules.md) developer cheatsheet tailored for LLM coding agents.                                           | `.clinerules/`                                                       |
| **🛠️ Utility Scripts**      | Scripts for cleaning builds, setting executable permissions, generating directory trees, and fetching OpenAPI specs.                                 | `scripts/`                                                           |
| **🧩 Services**             | Reusable modules for LLM (OpenRouter) and data storage (DuckDB) integration, with examples.                                                          | `src/services/`, `src/storage/duckdbExample.ts`                      |
| **🧪 Integration Testing**  | Integrated with Vitest for fast and reliable integration testing. Includes example tests for core logic and a coverage reporter.                     | `vitest.config.ts`, `tests/`                                         |

## Architecture Overview

This template employs a modular, transport-agnostic architecture to ensure a clean separation of concerns.

- **Core Server (`src/mcp-server/server.ts`)**: The central point where tools and resources are registered. It remains independent of how the server is accessed.
- **Transports (`src/mcp-server/transports/`)**: The transport layer connects the core server to the outside world.
  - **StdioTransport**: For direct process-to-process communication.
  - **HttpTransport**: A modern, streamable HTTP server built with **Hono**. It uses a middleware-based approach for handling CORS, rate limiting, authentication, and MCP request processing.
- **Transport Managers (`src/mcp-server/transports/core/`)**: These managers bridge the gap between the transport layer (like Hono) and the MCP SDK, handling session management (stateful vs. stateless) and request lifecycle.

This design allows you to add new tools and logic to the core server without worrying about the underlying transport details.

## Quick Start

### 1. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/cyanheads/mcp-ts-template.git
cd mcp-ts-template
npm install
```

### 2. Build the Project

```bash
npm run build
# Or use 'npm run rebuild' for a clean install
```

### 3. Running the Server

- **Via Stdio (Default):**
  ```bash
  npm run start:server
  ```
- **Via Streamable HTTP:**
  ```bash
  npm run start:server:http
  ```

### 4. Running Tests

This template uses [Vitest](https://vitest.dev/) for testing, with a strong emphasis on **integration testing** to ensure all components work together correctly.

- **Run all tests once:**
  ```bash
  npm test
  ```
- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```
- **Run tests and generate a coverage report:**
  ```bash
  npm run test:coverage
  ```

## ⚙️ Configuration

Configure the server using these environment variables (or a `.env` file):

| Variable              | Description                                                                               | Default                                |
| :-------------------- | :---------------------------------------------------------------------------------------- | :------------------------------------- |
| `MCP_TRANSPORT_TYPE`  | Server transport: `stdio` or `http`.                                                      | `stdio`                                |
| `MCP_SESSION_MODE`    | Session mode for HTTP: `stateless`, `stateful`, or `auto`.                                | `auto`                                 |
| `MCP_HTTP_PORT`       | Port for the HTTP server.                                                                 | `3010`                                 |
| `MCP_HTTP_HOST`       | Host address for the HTTP server.                                                         | `127.0.0.1`                            |
| `MCP_ALLOWED_ORIGINS` | Comma-separated allowed origins for CORS.                                                 | (none)                                 |
| `MCP_AUTH_MODE`       | Authentication mode for HTTP: `jwt`, `oauth`, or `none`.                                  | `none`                                 |
| `MCP_AUTH_SECRET_KEY` | **Required for `jwt` mode.** Secret key (min 32 chars) for signing/verifying auth tokens. | (none - **MUST be set in production**) |
| `OAUTH_ISSUER_URL`    | **Required for `oauth` mode.** The issuer URL of your authorization server.               | (none)                                 |
| `OAUTH_AUDIENCE`      | **Required for `oauth` mode.** The audience identifier for this MCP server.               | (none)                                 |
| `OPENROUTER_API_KEY`  | API key for OpenRouter.ai service.                                                        | (none)                                 |

## 🏗️ Project Structure

- **`src/mcp-server/`**: Contains the core MCP server, tools, resources, and transport handlers.
- **`src/config/`**: Handles loading and validation of environment variables.
- **`src/services/`**: Reusable modules for integrating with external services (DuckDB, OpenRouter).
- **`src/types-global/`**: Defines shared TypeScript interfaces and type definitions.
- **`src/utils/`**: Core utilities (logging, error handling, security, etc.).
- **`src/index.ts`**: The main entry point that initializes and starts the server.

**Explore the full structure yourself:**

See the current file tree in [docs/tree.md](docs/tree.md) or generate it dynamically:

```bash
npm run tree
```

## 🧩 Extending the System

The canonical pattern for adding new tools and resources is defined in the [.clinerules](./.clinerules/clinerules.md) file. It mandates a strict separation of concerns:

1.  **`logic.ts`**: Contains the pure business logic, Zod schemas, and type definitions. This file throws structured errors on failure.
2.  **`registration.ts`**: Acts as the "handler." It registers the tool with the server, wraps the logic call in a `try...catch` block, and formats the final success or error response.

This "Logic Throws, Handler Catches" pattern ensures that core logic remains pure and testable, while the registration layer handles all side effects and response formatting.

## 🌍 Explore More MCP Resources

Looking for more examples, guides, and pre-built MCP servers? Check out the companion repository:

➡️ **[cyanheads/model-context-protocol-resources](https://github.com/cyanheads/model-context-protocol-resources)**

## 📜 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
