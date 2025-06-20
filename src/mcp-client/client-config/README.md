# 🔌 MCP Client Configuration

This document details the configuration for the built-in **MCP client**. For a broader overview of the `src` directory and the client-server architecture, please see the [Source Code Overview](../../README.md).

The client's behavior is managed via the `mcp-config.json` file located in this directory.

---

### `mcp-config.json`

The primary configuration file for the MCP client is `src/mcp-client/client-config/mcp-config.json`. If this file is missing, the application will throw a startup error. An example configuration can be found in `mcp-config.json.example`.

This file defines the external MCP servers that the client can connect to and interact with. The client implementation strictly adheres to the **MCP 2025-03-26 specification**.

**Example `mcp-config.json`:**

For the complete example and all available options, please refer to `src/mcp-client/client-config/mcp-config.json.example`. A snippet is shown below:

```json
{
  "mcpServers": {
    "my-stdio-server": {
      "command": "node",
      "args": ["/path/to/my-server/index.js"],
      "env": {
        "LOG_LEVEL": "debug"
      },
      "transportType": "stdio"
    },
    "my-http-server": {
      "command": "http://localhost:8080",
      "args": [],
      "env": {},
      "transportType": "http"
    }
  }
}
```

**Key Configuration Fields:**

- **`command`**:
  - For `stdio` transport: The executable or command to run the server (e.g., `node`, `python`).
  - For `http` transport: The base URL of the MCP server (e.g., `http://localhost:8080`).
- **`args`**:
  - An array of string arguments to pass to the command when using `stdio` transport. This is required for `stdio`.
  - Not used for `http` transport.
- **`env`**:
  - An optional object defining environment variables to set for the server process.
  - Primarily used with `stdio` transport.
- **`transportType`**:
  - Specifies the communication protocol.
  - `"stdio"` (default if omitted): For servers communicating over standard input/output.
  - `"http"`: For servers communicating over HTTP/HTTPS.

**Schema and Validation:**

The structure and validation rules for `mcp-config.json` are defined using Zod in `src/mcp-client/client-config/configLoader.ts`. This ensures that the configuration is correctly formatted and contains all necessary information before the client attempts to establish connections.

For a comprehensive example demonstrating all features and a detailed structure, please consult the `src/mcp-client/client-config/mcp-config.json.example` file.
