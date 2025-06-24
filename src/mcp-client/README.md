# MCP Client Module

This directory contains a robust, production-grade client for connecting to and interacting with Model Context Protocol (MCP) servers. It is designed for reliability, handling multiple server connections, caching, and graceful error recovery.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Getting Started: How to Use the Client](#getting-started-how-to-use-the-client)
- [Configuration (`mcp-config.json`)](#configuration-mcp-configjson)
  - [Transport Types](#transport-types)
    - [stdio Transport](#stdio-transport)
    - [http Transport](#http-transport)
- [Architectural Deep Dive](#architectural-deep-dive)
  - [Connection Flow](#connection-flow)
  - [Error Handling](#error-handling)
- [API Reference](#api-reference)

---

## Overview

The MCP client module provides a robust, production-grade system for connecting to and interacting with Model Context Protocol (MCP) servers. It is designed for reliability and flexibility, supporting scenarios from single-server connections to complex, multi-agent swarms.

Its primary responsibilities are:

- **Isolated Connection Management**: Providing `McpClientManager` instances, each with its own isolated connection pool.
- **Configuration Driven**: Loading all server definitions from a central `mcp-config.json` file.
- **Transport Agnostic**: Supporting different communication protocols, primarily `stdio` (for local processes) and `http` (for network services).
- **Resilience**: Automatically handling connection errors, timeouts, and graceful shutdowns within each manager instance.

The main entry point for creating a connection manager is the `createMcpClientManager` factory function.

## Core Concepts

- **`McpClientManager` (`clientManager.ts`)**: The core of the client module. Each instance of this class manages a distinct, isolated set of client connections. It contains its own connection cache and lifecycle methods (`connectMcpClient`, `disconnectAllMcpClients`).
- **Configuration (`client-config/`)**: All server connections are defined in `mcp-config.json`. The `configLoader.ts` is responsible for loading, validating (with Zod), and providing these configurations.
- **Transports (`transports/`)**: These modules are responsible for the underlying communication protocol. The `transportFactory.ts` reads a server's configuration and instantiates the correct transport (`stdio` or `http`). For `stdio` transports, a new server process is spawned for each connection.
- **Connection Logic (`clientConnectionLogic.ts`)**: This internal module contains the step-by-step process of establishing a connection: fetching config, creating a transport, setting up event listeners, and performing the MCP handshake.

## Agent Swarm Support

This client architecture is specifically designed to support "agent swarm" scenarios, where multiple independent agents need to interact with the same set of configured MCP servers without interfering with each other.

This is achieved by instantiating a new `McpClientManager` for each agent.

- **Isolation**: Each `McpClientManager` has its own private connection cache. Agent A's connection to `server-1` is completely separate from Agent B's connection to the same server.
- **Process Spawning (`stdio`)**: When an agent connects to a `stdio`-based server, its manager spawns a **new, dedicated server process**. This provides maximum isolation, as each agent communicates with its own private server instance.
- **Shared Connections (`http`)**: When an agent connects to an `http`-based server, it connects to the **same, pre-existing HTTP endpoint** as all other agents. This is ideal for shared services designed for concurrent connections.

## Getting Started: How to Use the Client

To connect to MCP servers, you first create a manager, then use that manager to connect to the servers defined in your configuration.

### Example: Creating a Client Manager and Connecting

This example demonstrates creating a manager and using it to connect to all enabled servers in the configuration.

```typescript
import { createMcpClientManager, loadMcpClientConfig } from "./src/mcp-client";
import { logger } from "./src/utils";

async function main() {
  // 1. Create a new, isolated manager.
  const manager = createMcpClientManager();
  logger.info("MCP Client Manager created.");

  try {
    // 2. Load the configuration to find all servers.
    const config = loadMcpClientConfig();
    const serverNames = Object.keys(config.mcpServers);
    const enabledServers = serverNames.filter(
      (name) => !config.mcpServers[name].disabled,
    );

    logger.info(
      `Found ${enabledServers.length} enabled servers to connect to.`,
    );

    // 3. Use the manager to connect to all enabled servers.
    const connectionPromises = enabledServers.map(async (serverName) => {
      try {
        const client = await manager.connectMcpClient(serverName);
        logger.info(`Successfully connected to ${serverName}.`);
        return { serverName, client };
      } catch (error) {
        logger.error(`Failed to connect to ${serverName}`, { error });
        return null;
      }
    });

    await Promise.all(connectionPromises);

    // ... your application logic would go here ...
  } catch (error) {
    logger.error("An unexpected error occurred in the main process.", {
      error,
    });
  } finally {
    // 4. Disconnect all clients managed by this manager on shutdown.
    logger.info("Shutting down: disconnecting all clients...");
    await manager.disconnectAllMcpClients();
    logger.info("All clients disconnected.");
  }
}

main();
```

For a more detailed example showing a multi-agent swarm, see `src/mcp-client/examples/agentSwarmExample.ts`.

## Configuration (`mcp-config.json`)

The client is entirely configured through `src/mcp-client/client-config/mcp-config.json`. This file contains a single top-level key, `mcpServers`, which is an object where each key is a unique server name and the value is its configuration object.

The structure is validated by a Zod schema in `configLoader.ts`.

### Transport Types

You can connect to servers using two different transport mechanisms.

#### `stdio` Transport

Used for spawning and communicating with a local server process over its standard input/output streams.

**Configuration Fields:**

- `command` (string, required): The executable to run (e.g., `node`, `python`).
- `args` (string[], required): An array of arguments to pass to the command.
- `env` (object, optional): Key-value pairs of environment variables to set for the child process.
- `transportType` (string, required): Must be `"stdio"`.
- `disabled` (boolean, optional): If `true`, the client will refuse to connect to this server.
- `autoApprove` (boolean, optional): If `true`, skips user approval prompts for tool calls (use with caution).

**Example:**

```json
"git-mcp-server": {
  "command": "node",
  "args": [
    "/Users/casey/Developer/github/git-mcp-server/dist/index.js"
  ],
  "env": {
    "GIT_USERNAME": "cyanheads"
  },
  "transportType": "stdio"
}
```

#### `http` Transport

Used for communicating with a server over a network via HTTP/HTTPS.

**Configuration Fields:**

- `command` (string, required): The base URL of the MCP server (e.g., `http://localhost:3010`).
- `transportType` (string, required): Must be `"http"`.
- `disabled` (boolean, optional): If `true`, the client will refuse to connect.
- `autoApprove` (boolean, optional): If `true`, skips user approval prompts.
- `args` and `env` are ignored for this transport type.

**Example:**

```json
"example-http-server": {
  "command": "http://localhost:3010",
  "args": [],
  "transportType": "http",
  "disabled": false
}
```

## Architectural Deep Dive

The client is designed with a clear separation of concerns to make it maintainable and extensible.

### Connection Flow

1.  **`createMcpClientManager()` is called** to get a new manager instance.
2.  **`manager.connectMcpClient(serverName)` is called.**
3.  **Cache Check**: The manager checks its **own internal cache** to see if a client for `serverName` is already connected or pending. If so, it returns the existing client/promise.
4.  **Initiate Connection**: If no client is found, the manager creates a new connection promise and stores it in its pending cache.
5.  **`establishNewMcpConnection` (`clientConnectionLogic.ts`)**: This function is called to perform the core connection logic.
    a. **Load Config (`configLoader.ts`)**: Fetches and validates the configuration for `serverName`.
    b. **Get Transport (`transportFactory.ts`)**: Based on `transportType`, it instantiates a transport. For `stdio`, this **spawns a new process**.
    c. **Instantiate Client**: Creates a new `Client` instance from the `@modelcontextprotocol/sdk`.
    d. **Set Event Handlers**: Attaches `onerror` and `onclose` listeners. These handlers call the manager's `disconnectMcpClient` method to ensure proper cleanup within that manager's scope.
    e. **Connect & Handshake**: Calls `client.connect(transport)`, which performs the MCP initialization handshake.
6.  **Cache Update**: Once successful, the new client is stored in the manager's active cache, and the pending promise is removed.
7.  **Return Client**: The fully connected and initialized client is returned.

### Error Handling

- All major operations within the client module are wrapped in a centralized `ErrorHandler`.
- Errors are converted into a structured `McpError` type, which includes an error code, message, and the original context.
- If any step in the connection process fails (e.g., invalid config, transport error, failed handshake), the `ErrorHandler` catches it, logs it, and the promise returned by `connectMcpClient` rejects with an `McpError`.
- Runtime errors (e.g., the server process crashes) are caught by the `onerror` and `onclose` event handlers, which trigger a graceful disconnection and cache cleanup.

## API Reference

The primary exports are from `src/mcp-client/index.ts`:

- `createMcpClientManager(): McpClientManager`: Factory function to create a new, isolated client manager.
- `McpClientManager`: The class for managing a set of connections.
  - `connectMcpClient(serverName)`: Connects to a server.
  - `disconnectMcpClient(serverName)`: Disconnects a specific client.
  - `disconnectAllMcpClients()`: Disconnects all clients managed by the instance.
- `loadMcpClientConfig()`: Loads and validates the `mcp-config.json` file.
- `getMcpServerConfig(serverName)`: Retrieves the configuration for a single server.
