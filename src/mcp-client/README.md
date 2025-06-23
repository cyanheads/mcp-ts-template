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

The MCP client module provides a centralized and standardized way to manage communications with external MCP servers. Its primary responsibilities are:

-   **Connection Management**: Establishing, caching, and terminating connections to one or more MCP servers.
-   **Configuration Driven**: Loading server definitions from a central `mcp-config.json` file.
-   **Transport Agnostic**: Supporting different communication protocols, primarily `stdio` (for local processes) and `http` (for network services).
-   **Resilience**: Automatically handling connection errors, timeouts, and graceful shutdowns.

The main entry point for all client operations is `connectMcpClient` from `src/mcp-client/core/clientManager.ts`.

## Core Concepts

-   **Client Manager (`clientManager.ts`)**: The public-facing API for the client module. It orchestrates the entire connection lifecycle.
-   **Configuration (`client-config/`)**: All server connections are defined in `mcp-config.json`. The `configLoader.ts` is responsible for loading, validating (with Zod), and providing these configurations.
-   **Transports (`transports/`)**: These modules are responsible for the underlying communication protocol. The `transportFactory.ts` reads a server's configuration and instantiates the correct transport (`stdio` or `http`).
-   **Connection Logic (`clientConnectionLogic.ts`)**: This internal module contains the step-by-step process of establishing a connection: fetching config, creating a transport, setting up event listeners, and performing the MCP handshake.
-   **Caching (`clientCache.ts`)**: To prevent redundant connections, active client instances and pending connection promises are cached in memory. Subsequent requests for the same server will return the cached instance or promise.

## Getting Started: How to Use the Client

To connect to an MCP server, you need to:
1.  Ensure the server is correctly defined in `src/mcp-client/client-config/mcp-config.json`.
2.  Import and call `connectMcpClient` with the server's name.

### Example: Connecting to a Server

```typescript
import { connectMcpClient, ConnectedMcpClient } from './src/mcp-client';
import { logger } from './src/utils';

async function main() {
  const serverName = 'git-mcp-server'; // As defined in mcp-config.json
  let client: ConnectedMcpClient | null = null;

  try {
    logger.info(`Attempting to connect to ${serverName}...`);
    
    // Establish the connection
    client = await connectMcpClient(serverName);

    logger.info(`Successfully connected to ${serverName}.`);
    logger.info('Server Info:', client.serverInfo);
    logger.info('Available Tools:', client.tools.map(t => t.name));

    // Example: Calling a tool
    // const result = await client.callTool('git_status', {});
    // logger.info('Tool Result:', result);

  } catch (error) {
    logger.error(`Failed to connect or interact with ${serverName}`, { error });
  } finally {
    if (client) {
      logger.info(`Disconnecting from ${serverName}...`);
      // The disconnect function is available from the clientManager,
      // but for a single client, client.close() is sufficient.
      await client.close();
      logger.info('Disconnected.');
    }
  }
}

main();
```

## Configuration (`mcp-config.json`)

The client is entirely configured through `src/mcp-client/client-config/mcp-config.json`. This file contains a single top-level key, `mcpServers`, which is an object where each key is a unique server name and the value is its configuration object.

The structure is validated by a Zod schema in `configLoader.ts`.

### Transport Types

You can connect to servers using two different transport mechanisms.

#### `stdio` Transport

Used for spawning and communicating with a local server process over its standard input/output streams.

**Configuration Fields:**
-   `command` (string, required): The executable to run (e.g., `node`, `python`).
-   `args` (string[], required): An array of arguments to pass to the command.
-   `env` (object, optional): Key-value pairs of environment variables to set for the child process.
-   `transportType` (string, required): Must be `"stdio"`.
-   `disabled` (boolean, optional): If `true`, the client will refuse to connect to this server.
-   `autoApprove` (boolean, optional): If `true`, skips user approval prompts for tool calls (use with caution).

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
-   `command` (string, required): The base URL of the MCP server (e.g., `http://localhost:3010`).
-   `transportType` (string, required): Must be `"http"`.
-   `disabled` (boolean, optional): If `true`, the client will refuse to connect.
-   `autoApprove` (boolean, optional): If `true`, skips user approval prompts.
-   `args` and `env` are ignored for this transport type.

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

1.  **`connectMcpClient(serverName)` is called.**
2.  **Cache Check (`clientCache.ts`)**: It first checks if a client for `serverName` is already connected or if a connection is pending. If so, it returns the existing client/promise.
3.  **Initiate Connection**: If no client is found, it creates a new connection promise and stores it in the pending cache.
4.  **`establishNewMcpConnection` (`clientConnectionLogic.ts`)**: This function is called to perform the core connection logic.
    a. **Load Config (`configLoader.ts`)**: Fetches and validates the configuration for `serverName`.
    b. **Get Transport (`transportFactory.ts`)**: Based on `transportType`, it instantiates either a `StdioClientTransport` or a `StreamableHTTPClientTransport`.
    c. **Instantiate Client**: Creates a new `Client` instance from the `@modelcontextprotocol/sdk`.
    d. **Set Event Handlers**: Attaches `onerror` and `onclose` listeners to the client and transport. These handlers will trigger `disconnectMcpClient` to ensure proper cleanup.
    e. **Connect & Handshake**: Calls `client.connect(transport)`, which performs the MCP initialization handshake.
5.  **Cache Update**: Once the connection is successful, the new client is stored in the active cache (`connectedClients`) and the pending promise is removed.
6.  **Return Client**: The fully connected and initialized client is returned.

### Error Handling

-   All major operations within the client module are wrapped in a centralized `ErrorHandler`.
-   Errors are converted into a structured `McpError` type, which includes an error code, message, and the original context.
-   If any step in the connection process fails (e.g., invalid config, transport error, failed handshake), the `ErrorHandler` catches it, logs it, and the promise returned by `connectMcpClient` rejects with an `McpError`.
-   Runtime errors (e.g., the server process crashes) are caught by the `onerror` and `onclose` event handlers, which trigger a graceful disconnection and cache cleanup.

## API Reference

The primary functions are exported from `src/mcp-client/index.ts`:

-   `connectMcpClient(serverName: string, parentContext?: RequestContext): Promise<ConnectedMcpClient>`: The main function to get a client instance.
-   `disconnectMcpClient(serverName: string, parentContext?: RequestContext): Promise<void>`: Forcibly disconnects a specific client.
-   `disconnectAllMcpClients(parentContext?: RequestContext): Promise<void>`: Disconnects all active clients, typically used during application shutdown.
-   `loadMcpClientConfig()`: Loads and validates the `mcp-config.json` file.
-   `getMcpServerConfig(serverName: string)`: Retrieves the configuration for a single server.
