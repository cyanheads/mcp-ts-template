# MCP TypeScript Template 🚀

[![TypeScript](https://img.shields.io/badge/TypeScript-^5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol SDK](https://img.shields.io/badge/MCP%20SDK-^1.12.3-green.svg)](https://github.com/modelcontextprotocol/typescript-sdk)
[![MCP Spec Version](https://img.shields.io/badge/MCP%20Spec-2025--03--26-lightgrey.svg)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/changelog.mdx)
[![Version](https://img.shields.io/badge/Version-1.5.3-blue.svg)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-Stable-green.svg)](https://github.com/cyanheads/mcp-ts-template/issues)
[![GitHub](https://img.shields.io/github/stars/cyanheads/mcp-ts-template?style=social)](https://github.com/cyanheads/mcp-ts-template)

**Jumpstart your [Model Context Protocol (MCP) Client & Server](https://modelcontextprotocol.io/) development with this TypeScript MCP Repo Template!**

This template provides a solid, beginner-friendly foundation for building robust MCP servers and clients, adhering to the **MCP 2025-03-26 specification**. It includes production-ready utilities, a well-structured codebase, working examples, and clear documentation to get you up and running quickly.

Whether you're creating a new MCP server to extend an AI's capabilities or integrating MCP client features into your application, this template is your starting point.

## 📋 Table of Contents

- [✨ Key Features](#-key-features)
- [🌟 Projects Using This Template](#-projects-using-this-template)
- [🏁 Quick Start](#-quick-start)
- [⚙️ Configuration](#️-configuration)
- [🔩 Server Configuration (Environment Variables)](#-server-configuration-environment-variables)
- [🏗️ Project Structure](#️-project-structure)
- [🧩 Extending the MCP Server](#-extending-the-mcp-server)
- [🌍 More MCP Resources](#-explore-more-mcp-resources)
- [📜 License](#-license)
- [📊 Detailed Features Table](#-detailed-features-table)

## ✨ Key Features

| Feature Area                | Description                                                                                                                                                                   | Key Components / Location                                                      |
| :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **🔌 MCP Server**           | Functional server with example tools (`EchoTool`, `CatFactFetcher` for async/Promise API example) and an `EchoResource`. Supports `stdio` and **Streamable HTTP** transports. | `src/mcp-server/`                                                              |
| **💻 MCP Client**           | Working client aligned with **MCP 2025-03-26 spec**. Connects via `mcp-config.json`. Includes detailed comments.                                                              | `src/mcp-client/`                                                              |
| **🚀 Production Utilities** | Logging, Error Handling, ID Generation, Rate Limiting, Request Context tracking, Input Sanitization.                                                                          | `src/utils/`                                                                   |
| **🔒 Type Safety/Security** | Strong type checking via TypeScript & Zod validation. Built-in security utilities (sanitization, auth middleware stub for HTTP).                                              | Throughout, `src/utils/security/`, `src/mcp-server/transports/authentication/` |
| **⚙️ Error Handling**       | Consistent error categorization (`BaseErrorCode`), detailed logging, centralized handling (`ErrorHandler`).                                                                   | `src/utils/internal/errorHandler.ts`, `src/types-global/`                      |
| **📚 Documentation**        | Comprehensive `README.md`, structured JSDoc comments, API references                                                                                                          | `README.md`, Codebase, `tsdoc.json`, `docs/api-references/`                    |
| **🤖 Agent Ready**          | Includes a [.clinerules](.clinerules) developer cheatsheet tailored for LLM coding agents.                                                                                    | `.clinerules`                                                                  |
| **🛠️ Utility Scripts**      | Scripts for cleaning builds, setting executable permissions, generating directory trees, and fetching OpenAPI specs.                                                          | `scripts/`                                                                     |
| **🧩 Services**             | Reusable modules for LLM (OpenRouter) and data storage (DuckDB) integration, with examples.                                                                                   | `src/services/`, `src/storage/duckdbExample.ts`                                |

_For a more granular breakdown, see the [Detailed Features Table](#detailed-features-table) below._

## 🌟 Projects Using This Template

This template is already powering several MCP servers, demonstrating its flexibility and robustness:

| Project                                                                                                   | Description                                                                                                                                                                                                                  | Status / Notes                                                                                                                           |
| :-------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| [**pubmed-mcp-server**](https://github.com/cyanheads/pubmed-mcp-server)                                   | MCP server for PubMed, enabling AI agents to search, retrieve, analyze, and visualize biomedical literature via NCBI E-utilities. Features advanced research workflow capabilities.                                          | Actively using this template.                                                                                                            |
| [**git-mcp-server**](https://github.com/cyanheads/git-mcp-server)                                         | Provides an enterprise-ready MCP interface for Git operations. Allows LLM agents to initialize, clone, branch, commit, and manage repositories via STDIO & Streamable HTTP.                                                  | Actively using this template.                                                                                                            |
| [**obsidian-mcp-server**](https://github.com/cyanheads/obsidian-mcp-server/tree/mcp-ts-template-refactor) | Enables LLMs to interact securely with Obsidian vaults via MCP. Offers token-aware tools for searching, navigating, and updating Obsidian notes, facilitating seamless knowledge base management with Properties management. | Refactor in progress using this template ([see branch](https://github.com/cyanheads/obsidian-mcp-server/tree/mcp-ts-template-refactor)). |
| [**atlas-mcp-server**](https://github.com/cyanheads/atlas-mcp-server)                                     | Advanced task and knowledge management system with Neo4j backend, enabling structured data organization and complex querying for AI agents.                                                                                  | Aligned with this template (as of v2.8.8).                                                                                               |
| [**filesystem-mcp-server**](https://github.com/cyanheads/filesystem-mcp-server)                           | Offers platform-agnostic file system capabilities for AI agents via MCP. Enables reading, writing, updating, and managing files/directories, featuring advanced search/replace and directory traversal.                      | Actively using this template.                                                                                                            |

_Note: [**toolkit-mcp-server**](https://github.com/cyanheads/toolkit-mcp-server) was initially built using an older version of this template and is pending updates to the latest structure._

You can also **see my [GitHub profile](https://github.com/cyanheads/)** for additional MCP servers I've created, many of which are planned to be migrated to or built upon this template in the future.

## 📦 Installation

This project is a template, but can also directly be run as an MCP server. To get started, follow these steps:

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/cyanheads/mcp-ts-template.git
    cd mcp-ts-template
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Build the project:**
    ```bash
    npm run build
    # Or use 'npm run rebuild' for a clean install
    ```

## 🚀 Usage

Once built, you can run the server. If you intend to publish your project as a package, you can test the `npx` command by linking it locally.

### Using NPX
To run the MCP server directly using `npx`, you can use the following command:

```bash

Now you can run it via `npx`:

```bash
# Run with default stdio transport
npx mcp-ts-template

# Run with HTTP transport
MCP_TRANSPORT_TYPE=http npx mcp-ts-template
```

### From Source (for Development)

You can also use the npm scripts to run the server directly from your cloned repository:

-   **Via Stdio (Default):**
    ```bash
    npm start
    # or 'npm run start:stdio'
    ```
-   **Via Streamable HTTP:**
    ```bash
    npm run start:http
    ```
This starts a **Streamable HTTP** server (default: `http://127.0.0.1:3010`) which uses Server-Sent Events for the server-to-client streaming component. The port, host, and allowed origins are configurable via environment variables (see [Configuration](#configuration)).

## ⚙️ Configuration

### 🔩 Server Configuration (Environment Variables)

Configure the MCP server's behavior using these environment variables:

| Variable                  | Description                                                                                         | Default                                 |
| :------------------------ | :-------------------------------------------------------------------------------------------------- | :-------------------------------------- |
| `MCP_TRANSPORT_TYPE`      | Server transport: `stdio` or `http`.                                                                | `stdio`                                 |
| `MCP_HTTP_PORT`           | Port for the HTTP server (if `MCP_TRANSPORT_TYPE=http`).                                            | `3010`                                  |
| `MCP_HTTP_HOST`           | Host address for the HTTP server (if `MCP_TRANSPORT_TYPE=http`).                                    | `127.0.0.1`                             |
| `MCP_ALLOWED_ORIGINS`     | Comma-separated allowed origins for CORS (if `MCP_TRANSPORT_TYPE=http`).                            | (none)                                  |
| `MCP_SERVER_NAME`         | Optional server name (used in MCP initialization).                                                  | (from package.json)                     |
| `MCP_SERVER_VERSION`      | Optional server version (used in MCP initialization).                                               | (from package.json)                     |
| `MCP_LOG_LEVEL`           | Server logging level (`debug`, `info`, `warning`, `error`, etc.).                                   | `debug`                                 |
| `LOGS_DIR`                | Directory for log files.                                                                            | `logs/` (in project root)               |
| `NODE_ENV`                | Runtime environment (`development`, `production`).                                                  | `development`                           |
| `MCP_AUTH_SECRET_KEY`     | **Required for HTTP transport.** Secret key (min 32 chars) for signing/verifying auth tokens (JWT). | (none - **MUST be set in production**)  |
| `MCP_AUTH_MODE`           | Authentication mode: `jwt` (default) or `oauth`.                                                    | `jwt`                                   |
| `OAUTH_ISSUER_URL`        | **Required for `oauth` mode.** The issuer URL of your authorization server.                         | (none)                                  |
| `OAUTH_AUDIENCE`          | **Required for `oauth` mode.** The audience identifier for this MCP server.                         | (none)                                  |
| `OAUTH_JWKS_URI`          | **Optional for `oauth` mode.** The JWKS endpoint URL. If omitted, it's discovered from the issuer.  | (none)                                  |
| `OPENROUTER_API_KEY`      | API key for OpenRouter.ai service. Optional, but service will be unconfigured without it.           | (none)                                  |
| `LLM_DEFAULT_MODEL`       | Default model to use for LLM calls via OpenRouter.                                                  | `google/gemini-2.5-flash-preview-05-20` |
| `LLM_DEFAULT_TEMPERATURE` | Default temperature for LLM calls (0-2). Optional.                                                  | (none)                                  |

**Note on HTTP Port Retries:** If the `MCP_HTTP_PORT` is busy, the server automatically tries the next port (up to 15 times).

**Security Note for HTTP Transport:** When using `MCP_TRANSPORT_TYPE=http`, authentication is **mandatory** as per the MCP specification. This template supports two modes via `MCP_AUTH_MODE`:

- **`jwt` (default):** A simple, self-contained JWT mode ideal for development. It requires the `MCP_AUTH_SECRET_KEY` to be set for signing and verifying tokens.
- **`oauth`:** A production-ready OAuth 2.1 mode where the server validates Bearer tokens from an external Authorization Server. This requires `OAUTH_ISSUER_URL` and `OAUTH_AUDIENCE` to be configured.

You **MUST** configure one of these modes for the security mechanism to function correctly when using the HTTP transport.

### 🔌 Client Configuration

For detailed information on configuring the built-in **MCP client**, including how to set up connections to external MCP servers using `mcp-config.json`, please see the [Client Configuration Guide](src/mcp-client/client-config/README.md).

#### Example: Adding to an MCP Client

To add this server to an MCP client application (like [Claude Desktop](https://github.com/cyanheads/claude-desktop)), you would update the client's configuration file. This example assumes you have published your package or have used `npm link` to make it available locally.

```json
{
  "mcpServers": {
    "mcp-ts-template": {
      "command": "npx",
      "args": ["mcp-ts-template"],
      "env": {
        "MCP_LOG_LEVEL": "debug",
        "MCP_TRANSPORT_TYPE": "http",
        "MCP_HTTP_PORT": "3010"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## 🏗️ Project Structure

This project follows a standard TypeScript project layout. Here's an overview of the key directories and files:

- **`.clinerules`**: Developer cheatsheet and guidelines for LLM coding agents working with this repository.
- **`docs/`**: Contains project documentation, including API references and the auto-generated `tree.md` file.
- **`scripts/`**: Utility scripts for development tasks like cleaning builds, generating directory trees, and fetching OpenAPI specs.
- **`src/`**: The heart of the application, containing all TypeScript source code.
  - `src/config/`: Handles loading and validation of environment variables and application configuration.
  - `src/mcp-client/`: Implements the MCP client logic for connecting to and interacting with external MCP servers. This includes client configuration, core connection management, and transport handlers.
  - `src/mcp-server/`: Contains the MCP server implementation provided by this template, including example tools, resources, and transport handlers (Stdio, HTTP).
  - `src/services/`: Provides reusable modules for integrating with external services, such as DuckDB for local data storage and OpenRouter for LLM access.
  - `src/types-global/`: Defines shared TypeScript interfaces and type definitions used across the project, particularly for error handling and MCP-specific types.
  - `src/utils/`: A collection of core utilities.
    - `src/utils/internal/`: Core internal utilities like the logger, error handler, and request context management.
    - `src/utils/metrics/`: Utilities related to metrics, such as token counting.
    - `src/utils/network/`: Network-related utilities, like fetch with timeout.
    - `src/utils/parsing/`: Utilities for parsing data, such as dates and JSON.
    - `src/utils/security/`: Security-focused utilities including ID generation, rate limiting, and input sanitization.
  - `src/index.ts`: The main entry point for the application, responsible for initializing and starting the MCP server. The MCP client is meant to be built upon, so it does not have a dedicated entry point in this template.
- **`package.json`**: Defines project metadata, dependencies, and npm scripts.
- **`README.md`**: This file, providing an overview of the project.
- **`tsconfig.json`**: TypeScript compiler options for the project.
- **`LICENSE`**: Apache 2.0 License file.

**Explore the full structure yourself:**

See the current file tree in [docs/tree.md](docs/tree.md) or generate it dynamically:

```bash
npm run tree
```

(This uses `scripts/tree.ts` to generate a current file tree, respecting `.gitignore`.)

## 🧩 Extending the MCP Server

For detailed guidance on how to add your own custom Tools and Resources to this MCP server template, including workflow examples and best practices, please see the [Server Extension Guide](src/mcp-server/README.md).

## 🌍 Explore More MCP Resources

Looking for more examples, guides, and pre-built MCP servers? Check out the companion repository:

➡️ **[cyanheads/model-context-protocol-resources](https://github.com/cyanheads/model-context-protocol-resources)**

This collection includes servers for Filesystem, Obsidian, Git, GitHub, Perplexity, Atlas, Ntfy, and more, along with in-depth guides based on my real-world MCP development.

## 📜 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

## 📊 Detailed Features Table

| Category                 | Feature                         | Description                                                                                                                                                                                                                                          | Location(s)                                                               |
| :----------------------- | :------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| **Core Components**      | MCP Server                      | Core server logic, tool/resource registration, transport handling. Includes Echo Tool & Resource examples.                                                                                                                                           | `src/mcp-server/`                                                         |
|                          | MCP Client                      | Logic for connecting to external MCP servers (updated to **MCP 2025-03-26 spec**). Refactored for modularity.                                                                                                                                        | `src/mcp-client/` (see subdirs: `core/`, `client-config/`, `transports/`) |
|                          | Configuration                   | Environment-aware settings with Zod validation.                                                                                                                                                                                                      | `src/config/`, `src/mcp-client/client-config/configLoader.ts`             |
|                          | Streamable HTTP Transport       | Hono-based server implementing the MCP **Streamable HTTP** transport with session management, CORS, and port retries.                                                                                                                                | `src/mcp-server/transports/httpTransport.ts`                              |
|                          | Stdio Transport                 | Handles MCP communication over standard input/output.                                                                                                                                                                                                | `src/mcp-server/transports/stdioTransport.ts`                             |
| **Utilities (Core)**     | Logger                          | Structured, context-aware logging (files with rotation & MCP notifications).                                                                                                                                                                         | `src/utils/internal/logger.ts`                                            |
|                          | ErrorHandler                    | Centralized error processing, classification, and logging.                                                                                                                                                                                           | `src/utils/internal/errorHandler.ts`                                      |
|                          | RequestContext                  | Request/operation tracking and correlation.                                                                                                                                                                                                          | `src/utils/internal/requestContext.ts`                                    |
| **Utilities (Metrics)**  | TokenCounter                    | Estimates token counts using `tiktoken`.                                                                                                                                                                                                             | `src/utils/metrics/tokenCounter.ts`                                       |
| **Utilities (Parsing)**  | DateParser                      | Parses natural language date strings using `chrono-node`.                                                                                                                                                                                            | `src/utils/parsing/dateParser.ts`                                         |
|                          | JsonParser                      | Parses potentially partial JSON, handles `<think>` blocks.                                                                                                                                                                                           | `src/utils/parsing/jsonParser.ts`                                         |
| **Utilities (Security)** | IdGenerator                     | Generates unique IDs (prefixed or UUIDs).                                                                                                                                                                                                            | `src/utils/security/idGenerator.ts`                                       |
|                          | RateLimiter                     | Request throttling based on keys.                                                                                                                                                                                                                    | `src/utils/security/rateLimiter.ts`                                       |
|                          | Sanitization                    | Input validation/cleaning (HTML, paths, URLs, numbers, JSON) & log redaction (`validator`, `sanitize-html`).                                                                                                                                         | `src/utils/security/sanitization.ts`                                      |
| **Services**             | DuckDB Integration              | Reusable module for in-process analytical data management using DuckDB. A storage layer that runs on the same level as the application. Includes connection management, query execution, and example usage. Integrated with our utils (logger, etc.) | `src/services/duck-db/`, `src/storage/duckdbExample.ts`                   |
|                          | OpenRouter LLM Integration      | Reusable module for interacting with various LLMs via the OpenRouter API (OpenAI SDK compatible). Integrated with our utils (logger, etc.)                                                                                                           | `src/services/llm-providers/openRouterProvider.ts`                        |
| **Type Safety**          | Global Types                    | Shared TypeScript definitions for consistent interfaces (Errors, MCP types).                                                                                                                                                                         | `src/types-global/`                                                       |
|                          | Zod Schemas                     | Used for robust validation of configuration files and tool/resource inputs.                                                                                                                                                                          | Throughout (`config`, `mcp-client`, tools, etc.)                          |
| **Error Handling**       | Pattern-Based Classification    | Automatically categorize errors based on message patterns.                                                                                                                                                                                           | `src/utils/internal/errorHandler.ts`                                      |
|                          | Consistent Formatting           | Standardized error responses with additional context.                                                                                                                                                                                                | `src/utils/internal/errorHandler.ts`                                      |
|                          | Safe Try/Catch Patterns         | Centralized error processing helpers (`ErrorHandler.tryCatch`).                                                                                                                                                                                      | `src/utils/internal/errorHandler.ts`                                      |
|                          | Client/Transport Error Handling | Specific handlers for MCP client and transport error handling.                                                                                                                                                                                       | `src/mcp-client/core/`, `src/mcp-client/transports/`                      |
| **Security**             | Input Validation                | Using `validator` and `zod` for various data type checks.                                                                                                                                                                                            | `src/utils/security/sanitization.ts`, etc.                                |
|                          | Input Sanitization              | Using `sanitize-html` to prevent injection attacks.                                                                                                                                                                                                  | `src/utils/security/sanitization.ts`                                      |
|                          | Sensitive Data Redaction        | Automatic redaction in logs.                                                                                                                                                                                                                         | `src/utils/security/sanitization.ts`                                      |
|                          | Configuration Validation        | Throws a descriptive error if the primary client config (`mcp-config.json`) is missing, preventing fallback to a potentially insecure example file.                                                                                                  | `src/mcp-client/client-config/configLoader.ts`                            |
| **Scripts**              | Clean Script                    | Removes `dist` and `logs` directories (or custom targets).                                                                                                                                                                                           | `scripts/clean.ts`                                                        |
|                          | Make Executable Script          | Sets executable permissions (`chmod +x`) on specified files (Unix-like only).                                                                                                                                                                        | `scripts/make-executable.ts`                                              |
|                          | Tree Script                     | Generates a directory structure tree, respecting `.gitignore`.                                                                                                                                                                                       | `scripts/tree.ts`                                                         |
|                          | Fetch OpenAPI Spec Script       | Fetches an OpenAPI spec (YAML/JSON) from a URL with fallbacks, saves locally.                                                                                                                                                                        | `scripts/fetch-openapi-spec.ts`                                           |

---

<div align="center">
Built with ❤️ and the <a href="https://modelcontextprotocol.io/">Model Context Protocol</a>
</div>
