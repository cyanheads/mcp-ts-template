[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/cyanheads-mcp-ts-template-badge.png)](https://mseep.ai/app/cyanheads-mcp-ts-template)

# MCP TypeScript Template 🚀

[![TypeScript](https://img.shields.io/badge/TypeScript-^5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol SDK](https://img.shields.io/badge/MCP%20SDK-1.11.0-green.svg)](https://github.com/modelcontextprotocol/typescript-sdk)
[![MCP Spec Version](https://img.shields.io/badge/MCP%20Spec-2025--03--26-lightgrey.svg)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/changelog.mdx)
[![Version](https://img.shields.io/badge/Version-1.1.9-blue.svg)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Status](https://img.shields.io/badge/Status-Stable-green.svg)](https://github.com/cyanheads/mcp-ts-template/issues)
[![GitHub](https://img.shields.io/github/stars/cyanheads/mcp-ts-template?style=social)](https://github.com/cyanheads/mcp-ts-template)

**Jumpstart your [Model Context Protocol (MCP) Client & Server](https://modelcontextprotocol.io/) development with this TypeScript Repo Template!**

This template provides a solid, beginner-friendly foundation for building robust MCP servers and clients, adhering to the **MCP 2025-03-26 specification**. It includes production-ready utilities, a well-structured codebase, working examples, and clear documentation to get you up and running quickly.

Whether you're creating a new MCP server to extend an AI's capabilities or integrating MCP client features into your application, this template is your starting point.

## ✨ Key Features

| Feature Area                | Description                                                                                                                      | Key Components / Location                                                      |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------- |
| **🔌 MCP Server**           | Functional server example with Echo Tool & Resource. Supports `stdio` and `http` (SSE) transports.                               | `src/mcp-server/`                                                              |
| **💻 MCP Client**           | Working client aligned with **MCP 2025-03-26 spec**. Connects via `mcp-config.json`. Includes detailed comments.                 | `src/mcp-client/`                                                              |
| **🚀 Production Utilities** | Logging, Error Handling, ID Generation, Rate Limiting, Request Context tracking, Input Sanitization.                             | `src/utils/`                                                                   |
| **🔒 Type Safety/Security** | Strong type checking via TypeScript & Zod validation. Built-in security utilities (sanitization, auth middleware stub for HTTP). | Throughout, `src/utils/security/`, `src/mcp-server/transports/authentication/` |
| **⚙️ Error Handling**       | Consistent error categorization (`BaseErrorCode`), detailed logging, centralized handling (`ErrorHandler`).                      | `src/utils/internal/errorHandler.ts`, `src/types-global/`                      |
| **📚 Documentation**        | Comprehensive `README.md`, inline JSDoc comments.                                                                                | `README.md`, Codebase                                                          |
| **🤖 Agent Ready**          | Includes a [.clinerules](.clinerules) developer cheatsheet tailored for LLM coding agents.                                       | `.clinerules`                                                                  |
| **🛠️ Utility Scripts**      | Scripts for cleaning builds, setting executable permissions, generating directory trees, and fetching OpenAPI specs.             | `scripts/`                                                                     |

_For a more granular breakdown, see the [Detailed Features Table](#detailed-features-table) below._

## 🚀 Projects Using This Template

This template is already powering several MCP servers, demonstrating its flexibility and robustness:

| Project                                                                                                   | Description                                                                                                                                                                                                                  | Status / Notes                                                                                                                           |
| :-------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| [**git-mcp-server**](https://github.com/cyanheads/git-mcp-server)                                         | Provides an enterprise-ready MCP interface for Git operations. Allows LLM agents to initialize, clone, branch, commit, and manage repositories via STDIO & Streamable HTTP.                                                  | Actively using this template.                                                                                                            |
| [**obsidian-mcp-server**](https://github.com/cyanheads/obsidian-mcp-server/tree/mcp-ts-template-refactor) | Enables LLMs to interact securely with Obsidian vaults via MCP. Offers token-aware tools for searching, navigating, and updating Obsidian notes, facilitating seamless knowledge base management with Properties management. | Refactor in progress using this template ([see branch](https://github.com/cyanheads/obsidian-mcp-server/tree/mcp-ts-template-refactor)). |
| [**filesystem-mcp-server**](https://github.com/cyanheads/filesystem-mcp-server)                           | Offers platform-agnostic file system capabilities for AI agents via MCP. Enables reading, writing, updating, and managing files/directories, featuring advanced search/replace and directory traversal.                      | Actively using this template.                                                                                                            |

_Note: [**toolkit-mcp-server**](https://github.com/cyanheads/toolkit-mcp-server) and [**atlas-mcp-server**](https://github.com/cyanheads/atlas-mcp-server) were initially built using an older version of this template and are pending updates to the latest structure._

You can also **see my [GitHub profile](https://github.com/cyanheads/)** for additional MCP servers I've created, many of which are planned to be migrated to or built upon this template in the future.

## 📋 Table of Contents

[✨ Key Features](#-key-features) | [🚀 Projects Using This Template](#-projects-using-this-template) | [🚀 Quick Start](#quick-start) | [⚙️ Configuration](#️-configuration) | [Server Configuration](#server-configuration-environment-variables) | [Client Configuration](#client-configuration-mcp-configjson) | [🏗️ Project Structure](#️-project-structure) | [🧩 Adding Tools/Resources](#-adding-your-own-tools--resources) | [🌍 More MCP Resources](#-explore-more-mcp-resources) | [📜 License](#-license) | [Detailed Features](#detailed-features-table)

## Quick Start

Get the example server running in minutes:

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
    # Or use 'npm run rebuild' for a clean install (deletes node_modules, logs, dist)
    ```

4.  **Run the Example Server:**

    - **Via Stdio (Default):** Many MCP host applications will run this automatically using `stdio`. To run manually for testing:
      ```bash
      npm start
      # or 'npm run start:stdio'
      ```
    - **Via HTTP (SSE):**
      ```bash
      npm run start:http
      ```
      This starts an HTTP server (default: `http://127.0.0.1:3010`) using Server-Sent Events. The port, host, and allowed origins are configurable via environment variables (see [Configuration](#configuration)).

## ⚙️ Configuration

### Server Configuration (Environment Variables)

Configure the MCP server's behavior using these environment variables:

| Variable                  | Description                                                                                         | Default                                    |
| :------------------------ | :-------------------------------------------------------------------------------------------------- | :----------------------------------------- |
| `MCP_TRANSPORT_TYPE`      | Server transport: `stdio` or `http`.                                                                | `stdio`                                    |
| `MCP_HTTP_PORT`           | Port for the HTTP server (if `MCP_TRANSPORT_TYPE=http`).                                            | `3010`                                     |
| `MCP_HTTP_HOST`           | Host address for the HTTP server (if `MCP_TRANSPORT_TYPE=http`).                                    | `127.0.0.1`                                |
| `MCP_ALLOWED_ORIGINS`     | Comma-separated allowed origins for CORS (if `MCP_TRANSPORT_TYPE=http`).                            | (none)                                     |
| `MCP_SERVER_NAME`         | Optional server name (used in MCP initialization).                                                  | (from package.json)                        |
| `MCP_SERVER_VERSION`      | Optional server version (used in MCP initialization).                                               | (from package.json)                        |
| `MCP_LOG_LEVEL`           | Server logging level (`debug`, `info`, `warning`, `error`, etc.).                                   | `info`                                     |
| `NODE_ENV`                | Runtime environment (`development`, `production`).                                                  | `development`                              |
| `MCP_AUTH_SECRET_KEY`     | **Required for HTTP transport.** Secret key (min 32 chars) for signing/verifying auth tokens (JWT). | (none - **MUST be set in production**)     |
| `OPENROUTER_APP_URL`      | URL of the application (used by OpenRouter service for HTTP Referer).                               | `https://caseyjhand.com`                   |
| `OPENROUTER_APP_NAME`     | Name of the application (used by OpenRouter service for X-Title header).                            | 'mcp-ts-template'                          |
| `OPENROUTER_API_KEY`      | API key for OpenRouter.ai service. Optional, but service will be unconfigured without it.           | (none)                                     |
| `LLM_DEFAULT_MODEL`       | Default model to use for LLM calls via OpenRouter.                                                  | `google/gemini-2.5-flash-preview:thinking` |
| `LLM_DEFAULT_TEMPERATURE` | Default temperature for LLM calls (0-2). Optional.                                                  | (none)                                     |
| `LLM_DEFAULT_TOP_P`       | Default top_p for LLM calls (0-1). Optional.                                                        | (none)                                     |
| `LLM_DEFAULT_MAX_TOKENS`  | Default max_tokens for LLM calls. Optional.                                                         | (none)                                     |
| `LLM_DEFAULT_TOP_K`       | Default top_k for LLM calls (non-negative integer). Optional.                                       | (none)                                     |
| `LLM_DEFAULT_MIN_P`       | Default min_p for LLM calls (0-1). Optional.                                                        | (none)                                     |

**Note on HTTP Port Retries:** If the `MCP_HTTP_PORT` is busy, the server automatically tries the next port (up to 15 times).

**Security Note for HTTP Transport:** When using `MCP_TRANSPORT_TYPE=http`, authentication is **mandatory** as per the MCP specification. This template includes JWT-based authentication middleware (`src/mcp-server/transports/authentication/authMiddleware.ts`). You **MUST** set a strong, unique `MCP_AUTH_SECRET_KEY` in your production environment for this security mechanism to function correctly. Failure to do so will result in bypassed authentication checks in development and fatal errors in production.

### Client Configuration (`mcp-config.json`)

Configure the connections for the built-in **MCP client** using `src/mcp-client/mcp-config.json`. If this file is missing, it falls back to `src/mcp-client/mcp-config.json.example`.

This file defines external MCP servers the client can connect to. The client implementation adheres to the **MCP 2025-03-26 specification**.

**Example `mcp-config.json` (see `mcp-config.json.example` for the full version):**

```json
{
  "mcpServers": {
    "my-stdio-server": {
      "command": "node", // Command or executable
      "args": ["/path/to/my-server/index.js"], // Arguments for stdio
      "env": { "LOG_LEVEL": "debug" }, // Optional environment variables
      "transportType": "stdio" // Explicitly stdio (or omit for default)
    },
    "my-http-server": {
      "command": "http://localhost:8080", // Base URL for HTTP
      "args": [], // Not used for HTTP
      "env": {}, // Not used for HTTP
      "transportType": "http" // Explicitly http
    }
    // ... add other servers
  }
}
```

- **`command`**: Executable path (`stdio`) or Base URL (`http`).
- **`args`**: Array of arguments (required for `stdio`).
- **`env`**: Optional environment variables to set for the server process (`stdio`).
- **`transportType`**: `stdio` (default) or `http`.

See `src/mcp-client/configLoader.ts` for the Zod validation schema and `src/mcp-client/mcp-config.json.example` for a complete example.

## 🏗️ Project Structure

The `src/` directory is organized for clarity:

- `config/`: Loads environment variables and package info.
- `mcp-client/`: Logic for the client connecting to _external_ MCP servers (updated to MCP 2025-03-26 spec).
  - `client.ts`: Core connection management, initialization, capability declaration.
  - `configLoader.ts`: Loads and validates `mcp-config.json`.
  - `transport.ts`: Creates `stdio` or `http` client transports based on config.
  - `mcp-config.json.example`: Example client config. Copy to `mcp-config.json`.
- `mcp-server/`: Logic for the MCP server _provided by this template_.
  - `server.ts`: Initializes the server, registers tools/resources.
  - `resources/`: Example resource implementations (e.g., EchoResource).
  - `tools/`: Example tool implementations (e.g., EchoTool).
  - `transports/`: Handles `stdio` and `http` communication for the server.
- `types-global/`: Shared TypeScript definitions (Errors, MCP types).
- `utils/`: Reusable utilities (logging, errors, security, parsing, etc.). Exported via `index.ts`.

**Explore the structure yourself:**

```bash
npm run tree
```

(This uses `scripts/tree.ts` to generate a current file tree.)

## 🧩 Adding Your Own Tools & Resources

This template is designed for extension! Follow the high-level SDK patterns:

1.  **Create Directories**: Add new directories under `src/mcp-server/tools/yourToolName/` or `src/mcp-server/resources/yourResourceName/`.
2.  **Implement Logic (`logic.ts`)**: Define Zod schemas for inputs/outputs and write your core processing function.
3.  **Register (`registration.ts`)**:
    - **Tools**: Use `server.tool(name, description, zodSchemaShape, handler)` (SDK v1.10.2+). This handles schema generation, validation, and routing. Remember to add relevant annotations (`readOnlyHint`, `destructiveHint`, etc.) as untrusted hints.
    - **Resources**: Use `server.resource(regName, template, metadata, handler)`.
    - Wrap logic in `ErrorHandler.tryCatch` for robust error handling.
4.  **Export & Import**: Export the registration function from your new directory's `index.ts` and call it within `createMcpServerInstance` in `src/mcp-server/server.ts`.

Refer to the included `EchoTool` and `EchoResource` examples and the [.clinerules](.clinerules) cheatsheet for detailed patterns.

## 🌍 Explore More MCP Resources

Looking for more examples, guides, and pre-built MCP servers? Check out the companion repository:

➡️ **[cyanheads/model-context-protocol-resources](https://github.com/cyanheads/model-context-protocol-resources)**

This collection includes servers for Filesystem, Obsidian, Git, GitHub, Perplexity, Atlas, Ntfy, and more, along with in-depth guides based on my real-world MCP development.

## 📜 License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

## Detailed Features Table

| Category                 | Feature                         | Description                                                                                                  | Location(s)                                      |
| :----------------------- | :------------------------------ | :----------------------------------------------------------------------------------------------------------- | :----------------------------------------------- |
| **Core Components**      | MCP Server                      | Core server logic, tool/resource registration, transport handling. Includes Echo Tool & Resource examples.   | `src/mcp-server/`                                |
|                          | MCP Client                      | Logic for connecting to external MCP servers (updated to **MCP 2025-03-26 spec**).                           | `src/mcp-client/`                                |
|                          | Configuration                   | Environment-aware settings with Zod validation.                                                              | `src/config/`, `src/mcp-client/configLoader.ts`  |
|                          | HTTP Transport                  | Express-based server with SSE, session management, CORS, port retries.                                       | `src/mcp-server/transports/httpTransport.ts`     |
|                          | Stdio Transport                 | Handles MCP communication over standard input/output.                                                        | `src/mcp-server/transports/stdioTransport.ts`    |
| **Utilities (Core)**     | Logger                          | Structured, context-aware logging (files & MCP notifications).                                               | `src/utils/internal/logger.ts`                   |
|                          | ErrorHandler                    | Centralized error processing, classification, and logging.                                                   | `src/utils/internal/errorHandler.ts`             |
|                          | RequestContext                  | Request/operation tracking and correlation.                                                                  | `src/utils/internal/requestContext.ts`           |
| **Utilities (Metrics)**  | TokenCounter                    | Estimates token counts using `tiktoken`.                                                                     | `src/utils/metrics/tokenCounter.ts`              |
| **Utilities (Parsing)**  | DateParser                      | Parses natural language date strings using `chrono-node`.                                                    | `src/utils/parsing/dateParser.ts`                |
|                          | JsonParser                      | Parses potentially partial JSON, handles `<think>` blocks.                                                   | `src/utils/parsing/jsonParser.ts`                |
| **Utilities (Security)** | IdGenerator                     | Generates unique IDs (prefixed or UUIDs).                                                                    | `src/utils/security/idGenerator.ts`              |
|                          | RateLimiter                     | Request throttling based on keys.                                                                            | `src/utils/security/rateLimiter.ts`              |
|                          | Sanitization                    | Input validation/cleaning (HTML, paths, URLs, numbers, JSON) & log redaction (`validator`, `sanitize-html`). | `src/utils/security/sanitization.ts`             |
| **Services**             | OpenRouter Provider             | Service for interacting with OpenRouter API via OpenAI SDK compatibility.                                    | `src/services/openRouterProvider.ts`             |
| **Type Safety**          | Global Types                    | Shared TypeScript definitions for consistent interfaces (Errors, MCP types).                                 | `src/types-global/`                              |
|                          | Zod Schemas                     | Used for robust validation of configuration files and tool/resource inputs.                                  | Throughout (`config`, `mcp-client`, tools, etc.) |
| **Error Handling**       | Pattern-Based Classification    | Automatically categorize errors based on message patterns.                                                   | `src/utils/internal/errorHandler.ts`             |
|                          | Consistent Formatting           | Standardized error responses with additional context.                                                        | `src/utils/internal/errorHandler.ts`             |
|                          | Safe Try/Catch Patterns         | Centralized error processing helpers (`ErrorHandler.tryCatch`).                                              | `src/utils/internal/errorHandler.ts`             |
|                          | Client/Transport Error Handling | Specific handlers for MCP client and transport error handling.                                               | `src/mcp-client/client.ts`, `transport.ts`       |
| **Security**             | Input Validation                | Using `validator` and `zod` for various data type checks.                                                    | `src/utils/security/sanitization.ts`, etc.       |
|                          | Input Sanitization              | Using `sanitize-html` to prevent injection attacks.                                                          | `src/utils/security/sanitization.ts`             |
|                          | Sensitive Data Redaction        | Automatic redaction in logs.                                                                                 | `src/utils/security/sanitization.ts`             |
|                          | Configuration Fallback          | Safely falls back to `mcp-config.json.example` if primary client config is missing.                          | `src/mcp-client/configLoader.ts`                 |
| **Scripts**              | Clean Script                    | Removes `dist` and `logs` directories (or custom targets).                                                   | `scripts/clean.ts`                               |
|                          | Make Executable Script          | Sets executable permissions (`chmod +x`) on specified files (Unix-like only).                                | `scripts/make-executable.ts`                     |
|                          | Tree Script                     | Generates a directory structure tree, respecting `.gitignore`.                                               | `scripts/tree.ts`                                |
|                          | Fetch OpenAPI Spec Script       | Fetches an OpenAPI spec (YAML/JSON) from a URL with fallbacks, saves locally.                                | `scripts/fetch-openapi-spec.ts`                  |

---

<div align="center">
Built with ❤️ and the <a href="https://modelcontextprotocol.io/">Model Context Protocol</a>
</div>
