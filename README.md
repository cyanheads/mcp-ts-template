<div align="center">

# 🚀 Model Context Protocol (MCP) Server TypeScript Template

**Build production-grade MCP servers with a powerful, type-safe, and extensible foundation.**

[![TypeScript](https://img.shields.io/badge/TypeScript-^5.8.3-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Model Context Protocol SDK](https://img.shields.io/badge/MCP%20SDK-^1.17.0-green?style=flat-square)](https://github.com/modelcontextprotocol/typescript-sdk)
[![MCP Spec Version](https://img.shields.io/badge/MCP%20Spec-2025--06--18-lightgrey?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx)
[![Version](https://img.shields.io/badge/Version-1.7.3-blue?style=flat-square)](./CHANGELOG.md)
[![Coverage](https://img.shields.io/badge/Coverage-41.08%25-yellow?style=flat-square)](./vitest.config.ts)
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

| Feature Area                | Description                                                                                                                                     | Key Components / Location                                            |
| :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| **🔌 MCP Server**           | Functional server with example tools (`EchoTool`, `CatFactFetcher`) and an `EchoResource`. Supports `stdio` and **Streamable HTTP** transports. | `src/mcp-server/`                                                    |
| **🚀 Production Utilities** | Logging, Error Handling, ID Generation, Rate Limiting, Request Context tracking, Input Sanitization.                                            | `src/utils/`                                                         |
| **🔒 Type Safety/Security** | Strong type checking via TypeScript & Zod validation. Built-in security utilities (sanitization, auth middleware for HTTP).                     | Throughout, `src/utils/security/`, `src/mcp-server/transports/auth/` |
| **⚙️ Error Handling**       | Consistent error categorization (`BaseErrorCode`), detailed logging, centralized handling (`ErrorHandler`).                                     | `src/utils/internal/errorHandler.ts`, `src/types-global/`            |
| **📚 Documentation**        | Comprehensive `README.md`, structured JSDoc comments, API references.                                                                           | `README.md`, Codebase, `tsdoc.json`, `docs/api-references/`          |
| **🕵️ Interaction Logging**  | Captures raw requests and responses for all external LLM provider interactions to a dedicated `interactions.log` file for full traceability.    | `src/utils/internal/logger.ts`                                       |
| **🤖 Agent Ready**          | Includes a [.clinerules](.clinerules) developer cheatsheet tailored for LLM coding agents.                                                      | `.clinerules`                                                        |
| **🛠️ Utility Scripts**      | Scripts for cleaning builds, setting executable permissions, generating directory trees, and fetching OpenAPI specs.                            | `scripts/`                                                           |
| **🧩 Services**             | Reusable modules for LLM (OpenRouter) and data storage (DuckDB) integration, with examples.                                                     | `src/services/`, `src/storage/duckdbExample.ts`                      |
| **🧪 Unit Testing**         | Integrated with Vitest for fast and reliable unit testing. Includes example tests for core tool logic and a coverage reporter.                  | `vitest.config.ts`, `tests/`                                         |

## 🌟 Projects Using This Template

This template is already powering several MCP servers, demonstrating its flexibility and robustness:

| Project                                                                                       | Description                                                                                                                   |
| :-------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| [**clinicaltrialsgov-mcp-server**](https://github.com/cyanheads/clinicaltrialsgov-mcp-server) | Provides an LLM-friendly interface to the official ClinicalTrials.gov v2 API, enabling agents to analyze clinical study data. |
| [**pubmed-mcp-server**](https://github.com/cyanheads/pubmed-mcp-server)                       | Enables AI agents to search, retrieve, and visualize biomedical literature from PubMed via NCBI E-utilities.                  |
| [**git-mcp-server**](https://github.com/cyanheads/git-mcp-server)                             | Provides an enterprise-ready MCP interface for Git operations, allowing agents to manage repositories programmatically.       |
| [**obsidian-mcp-server**](https://github.com/cyanheads/obsidian-mcp-server)                   | Allows AI agents to read, write, search, and manage notes in Obsidian via the Local REST API plugin.                          |
| [**atlas-mcp-server**](https://github.com/cyanheads/atlas-mcp-server)                         | An advanced task and knowledge management system with a Neo4j backend for structured data organization.                       |
| [**filesystem-mcp-server**](https://github.com/cyanheads/filesystem-mcp-server)               | Offers platform-agnostic file system capabilities for AI agents, including advanced search and directory traversal.           |
| [**workflows-mcp-server**](https://github.com/cyanheads/workflows-mcp-server)                 | A declarative workflow engine that allows agents to execute complex, multi-step automations from simple YAML files.           |

_Note: [**toolkit-mcp-server**](https://github.com/cyanheads/toolkit-mcp-server) was built on an older version of this template and is pending updates._

You can also **see my [GitHub profile](https://github.com/cyanheads/)** for additional MCP servers I've created.

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

This template uses [Vitest](https://vitest.dev/) for unit testing. Tests are located in the `tests/` directory, mirroring the `src/` structure.

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

### Server Configuration (Environment Variables)

Configure the MCP server's behavior using these environment variables:

| Variable              | Description                                                                               | Default                                |
| :-------------------- | :---------------------------------------------------------------------------------------- | :------------------------------------- |
| `MCP_TRANSPORT_TYPE`  | Server transport: `stdio` or `http`.                                                      | `stdio`                                |
| `MCP_HTTP_PORT`       | Port for the HTTP server (if `MCP_TRANSPORT_TYPE=http`).                                  | `3010`                                 |
| `MCP_HTTP_HOST`       | Host address for the HTTP server (if `MCP_TRANSPORT_TYPE=http`).                          | `127.0.0.1`                            |
| `MCP_ALLOWED_ORIGINS` | Comma-separated allowed origins for CORS (if `MCP_TRANSPORT_TYPE=http`).                  | (none)                                 |
| `MCP_AUTH_MODE`       | Authentication mode for HTTP: `jwt`, `oauth`, or `none`.                                  | `none`                                 |
| `MCP_AUTH_SECRET_KEY` | **Required for `jwt` mode.** Secret key (min 32 chars) for signing/verifying auth tokens. | (none - **MUST be set in production**) |
| `OAUTH_ISSUER_URL`    | **Required for `oauth` mode.** The issuer URL of your authorization server.               | (none)                                 |
| `OAUTH_AUDIENCE`      | **Required for `oauth` mode.** The audience identifier for this MCP server.               | (none)                                 |
| `OPENROUTER_API_KEY`  | API key for OpenRouter.ai service.                                                        | (none)                                 |

## 🏗️ Project Structure

- **`src/mcp-server/`**: Contains the MCP server implementation, including example tools, resources, and transport handlers.
- **`src/config/`**: Handles loading and validation of environment variables and application configuration.
- **`src/services/`**: Provides reusable modules for integrating with external services (DuckDB, OpenRouter).
- **`src/types-global/`**: Defines shared TypeScript interfaces and type definitions.
- **`src/utils/`**: A collection of core utilities (logging, error handling, security, etc.).
- **`src/index.ts`**: The main entry point for the application, responsible for initializing and starting the MCP server.

**Explore the full structure yourself:**

See the current file tree in [docs/tree.md](docs/tree.md) or generate it dynamically:

```bash
npm run tree
```

## 🧩 Extending the System

### Adding Tools to the Server

For detailed guidance on how to add your own custom Tools and Resources to the MCP server, please see the [Server Extension Guide](src/mcp-server/README.md).

## 🌍 Explore More MCP Resources

Looking for more examples, guides, and pre-built MCP servers? Check out the companion repository:

➡️ **[cyanheads/model-context-protocol-resources](https://github.com/cyanheads/model-context-protocol-resources)**

## 📜 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
