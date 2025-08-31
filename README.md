<div align="center">
  <br />
  <img src="https://raw.githubusercontent.com/modelcontextprotocol/brand-assets/main/mcp-icon-dark-bg.png" alt="MCP Logo" width="120" />
  <br />
  <h1>MCP TypeScript Server Template</h1>
  <p><b>The definitive starting point for building production-grade Model Context Protocol (MCP) servers.</b></p>
  
  [![Version](https://img.shields.io/badge/Version-2.0.0-blue.svg?style=flat-square)](./CHANGELOG.md)
  [![MCP Spec](https://img.shields.io/badge/MCP%20Spec-2025--06--18-8A2BE2.svg?style=flat-square)](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-06-18/changelog.mdx)
  [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE)
  [![Status](https://img.shields.io/badge/Status-Stable-brightgreen.svg?style=flat-square)](https://github.com/cyanheads/mcp-ts-template/issues)
  [![TypeScript](https://img.shields.io/badge/TypeScript-^5.8-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/)
  <br />

</div>

---

**`mcp-ts-template`** is a feature-rich, production-ready framework designed to accelerate the development of robust and scalable MCP servers. It handles the foundational plumbing—observability, error handling, security, and more—so you can focus on building powerful tools for AI agents.

## 🚀 Get Started in Seconds

Launch your MCP server development environment instantly.

```bash
# 1. Clone the repository
git clone https://github.com/cyanheads/mcp-ts-template.git

# 2. Navigate and install dependencies
cd mcp-ts-template && npm install

# 3. Build the project
npm run build

# 4. Run the server (stdio)
npm run start:server
```

Or, start the server with the HTTP transport:

```bash
npm run start:server:http
# Server now running at http://127.0.0.1:3010
```

## ✨ Core Features at a Glance

This template is packed with production-grade features out-of-the-box.

| Icon | Feature                     | Description                                                                                                                              |
| :--: | :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| 🔌   | **Declarative Tooling**     | Simple, single-file tool definitions. The framework handles the rest.                                                                    |
| 🔭   | **Full Observability**      | Zero-config OpenTelemetry for traces and metrics.                                                                                        |
| 🛡️   | **Rock-Solid Security**     | Type-safe, Zod-validated inputs, sanitization utilities, and built-in auth middleware.                                                   |
| ⚙️   | **Robust Error Handling**   | Centralized error management with standardized `JsonRpcErrorCode`.                                                                       |
| 💾   | **Abstracted Storage**      | A provider-based storage layer supporting in-memory, filesystem, and Supabase.                                                           |
| 🧪   | **Integration-First Tests** | Vitest configured for real-world integration testing, not just isolated units.                                                           |
| 🤖   | **Agent-Ready Design**      | Includes detailed `.clinerules` to guide LLM coding agents.                                                                              |
| ⏱️   | **Auto-Performance Metrics**| Every tool call is automatically benchmarked for execution time.                                                                         |

---

## 🏗️ Architectural Philosophy

The template's design is guided by a few core principles to ensure your server is both powerful and maintainable.

### The "Logic Throws, Handler Catches" Pattern

This is the cornerstone of our architecture, enforced by the `toolHandlerFactory`.

1.  **Core Logic**: A pure, stateless function within your `ToolDefinition`. It focuses solely on the business task and `throws` a structured `McpError` on failure.
2.  **Handler (Auto-Generated)**: The factory wraps your logic in a robust `try...catch` block. It manages request context, error handling, performance measurement, and final response formatting. You write the logic; the factory ensures it's a well-behaved server component.

### Declarative by Design

Creating new tools is effortless. Define a single `ToolDefinition` object in a `.tool.ts` file, and the server does the rest.

```typescript
// src/mcp-server/tools/definitions/my-tool.tool.ts
export const myTool: ToolDefinition<...> = {
  name: "my_tool_action",
  description: "Does something amazing.",
  inputSchema: MyToolInputSchema,
  outputSchema: MyToolOutputSchema,
  logic: async (input, context) => {
    // Your pure business logic here...
    return { result: "success" };
  }
};
```

The server automatically discovers and registers it at startup. No boilerplate required.

---

## 🛠️ Configuration & Extension

### Environment Variables

Control your server's behavior with a `.env` file. A comprehensive list is available in the [.env.example](./.env.example) file.

### Extending the System

-   **Add a New Tool**: Create a new `*.tool.ts` file in `src/mcp-server/tools/definitions/`. Use `echo.tool.ts` as your guide.
-   **Add a Resource**: Follow the existing pattern in `src/mcp-server/resources/`.
-   **Add a Storage Provider**: Implement the `IStorageProvider` interface and add it to the `storageFactory`.

For a deep dive into the architectural standards, refer to the **[Developer Mandate](./.clinerules/clinerules.md)**.

## 🤝 Contributing & Community

This template is an open-source project. Contributions, issues, and feature requests are welcome.

1.  **Fork the repository.**
2.  **Create a new branch** (`git checkout -b feature/your-feature`).
3.  **Commit your changes** (`git commit -m 'feat: Add some feature'`).
4.  **Push to the branch** (`git push origin feature/your-feature`).
5.  **Open a Pull Request.**

Looking for more MCP tools and resources? Check out our companion repository: **[cyanheads/model-context-protocol-resources](https://github.com/cyanheads/model-context-protocol-resources)**.

---

<p align="center">Licensed under the <a href="./LICENSE">Apache 2.0 License</a>.</p>
