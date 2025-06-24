# 🚀 MCP TypeScript Template: Agent, Server & Client

[![TypeScript](https://img.shields.io/badge/TypeScript-^5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol SDK](https://img.shields.io/badge/MCP%20SDK-^1.13.0-green.svg)](https://github.com/modelcontextprotocol/typescript-sdk)
[![MCP Spec Version](https://img.shields.io/badge/MCP%20Spec-2025--03--26-lightgrey.svg)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/changelog.mdx)
[![Version](https://img.shields.io/badge/Version-1.6.0-blue.svg)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-Stable-green.svg)](https://github.com/cyanheads/mcp-ts-template/issues)
[![GitHub](https://img.shields.io/github/stars/cyanheads/mcp-ts-template?style=social)](https://github.com/cyanheads/mcp-ts-template)

**Jumpstart your [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) development with this comprehensive TypeScript Template for building autonomous agents, servers, and clients.**

This template provides a solid, beginner-friendly foundation for building all components of the MCP ecosystem, adhering to the **MCP 2025-03-26 specification**. It includes a powerful agent framework, a fully-featured server, a robust client, production-ready utilities, and clear documentation to get you up and running quickly.

## 🏛️ Three-Part Architecture

This template is organized into three primary, interconnected components:

1.  **🤖 Agent (`src/agent/`)**: An autonomous agent framework. The agent can connect to multiple MCP servers, discover their tools, and use them to accomplish complex tasks based on a user's prompt. Use this as a starting point for your agents.
2.  **🔌 MCP Server (`src/mcp-server/`)**: An extensible MCP server that can host custom tools and resources, making them available to agents and other clients.
3.  **💻 MCP Client (`src/mcp-client/`)**: A robust client for connecting to and interacting with any MCP-compliant server. The agent uses this client to communicate with the outside world.

## ✨ Key Features

| Feature Area                | Description                                                                                                                                         | Key Components / Location                                            |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| **🤖 Agent Framework**      | Core `Agent` class and CLI for running autonomous agents that connect to MCP servers and use their tools to achieve goals.                          | `src/agent/`                                                         |
| **🔌 MCP Server**           | Functional server with example tools (`EchoTool`, `CatFactFetcher`) and an `EchoResource`. Supports `stdio` and **Streamable HTTP** transports.     | `src/mcp-server/`                                                    |
| **💻 MCP Client**           | Working client aligned with **MCP 2025-03-26 spec**. Connects via `mcp-config.json`. Includes detailed comments and isolated connection management. | `src/mcp-client/`                                                    |
| **🚀 Production Utilities** | Logging, Error Handling, ID Generation, Rate Limiting, Request Context tracking, Input Sanitization.                                                | `src/utils/`                                                         |
| **🔒 Type Safety/Security** | Strong type checking via TypeScript & Zod validation. Built-in security utilities (sanitization, auth middleware for HTTP).                         | Throughout, `src/utils/security/`, `src/mcp-server/transports/auth/` |
| **⚙️ Error Handling**       | Consistent error categorization (`BaseErrorCode`), detailed logging, centralized handling (`ErrorHandler`).                                         | `src/utils/internal/errorHandler.ts`, `src/types-global/`            |
| **📚 Documentation**        | Comprehensive `README.md`, structured JSDoc comments, API references.                                                                               | `README.md`, Codebase, `tsdoc.json`, `docs/api-references/`          |
| **🕵️ Interaction Logging**  | Captures raw requests and responses for all external LLM provider interactions to a dedicated `interactions.log` file for full traceability.        | `src/utils/internal/logger.ts`                                       |
| **🤖 Agent Ready**          | Includes a [.clinerules](.clinerules) developer cheatsheet tailored for LLM coding agents.                                                          | `.clinerules`                                                        |
| **🛠️ Utility Scripts**      | Scripts for cleaning builds, setting executable permissions, generating directory trees, and fetching OpenAPI specs.                                | `scripts/`                                                           |
| **Services**                | Reusable modules for LLM (OpenRouter) and data storage (DuckDB) integration, with examples.                                                         | `src/services/`, `src/storage/duckdbExample.ts`                      |

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

### 3. Running the Components

#### Running the MCP Server

You can run the included MCP server to make its tools available.

- **Via Stdio (Default):**
  ```bash
  npm run start:server
  ```
- **Via Streamable HTTP:**
  ```bash
  npm run start:server:http
  ```

#### Running the Agent

The agent can be run from the command line to perform tasks. It will automatically connect to the servers defined in `src/mcp-client/client-config/mcp-config.json`. If running the agent, you must have the MCP config set up correctly and your openrouter API key configured in .env.

```bash
npm run start:agent "Your prompt here"

# Example:
npm run start:agent "Use the echo tool to say hello world and then get a cat fact."
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
| `MCP_AUTH_MODE`       | Authentication mode for HTTP: `jwt` (default) or `oauth`.                                 | `jwt`                                  |
| `MCP_AUTH_SECRET_KEY` | **Required for `jwt` mode.** Secret key (min 32 chars) for signing/verifying auth tokens. | (none - **MUST be set in production**) |
| `OAUTH_ISSUER_URL`    | **Required for `oauth` mode.** The issuer URL of your authorization server.               | (none)                                 |
| `OAUTH_AUDIENCE`      | **Required for `oauth` mode.** The audience identifier for this MCP server.               | (none)                                 |
| `OPENROUTER_API_KEY`  | API key for OpenRouter.ai service. Required for the agent to function.                    | (none)                                 |

### Client & Agent Configuration

The agent uses the MCP client to connect to servers. This is configured in `src/mcp-client/client-config/mcp-config.json`. You must list all MCP servers the agent should connect to in this file.

For a detailed guide, see the [Client Configuration README](src/mcp-client/client-config/README.md).

## 🏗️ Project Structure

- **`src/agent/`**: Contains the core agent framework, including the `Agent` class and a CLI for running the agent.
- **`src/mcp-client/`**: Implements the MCP client logic for connecting to and interacting with external MCP servers.
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

### Modifying the Agent

The agent's core logic is in `src/agent/agent-core/agent.ts`. You can modify its system prompt, the models it uses (`google/gemini-2.5-flash` by default), and its decision-making loop to change its behavior.

## 🌍 Explore More MCP Resources

Looking for more examples, guides, and pre-built MCP servers? Check out the companion repository:

➡️ **[cyanheads/model-context-protocol-resources](https://github.com/cyanheads/model-context-protocol-resources)**

## 📜 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
