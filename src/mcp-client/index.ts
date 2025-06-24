/**
 * @fileoverview Barrel file for the MCP Client module (`src/mcp-client`).
 * This file re-exports the primary functions and types related to creating,
 * configuring, connecting, and managing MCP client instances based on the
 * MCP 2025-03-26 specification and the high-level TypeScript SDK.
 * @module src/mcp-client/index
 */

import { McpClientManager } from "./core/clientManager.js";

// Export the McpClientManager class, the factory function, and the connected client type alias.
export {
  McpClientManager,
  type ConnectedMcpClient,
} from "./core/clientManager.js";

/**
 * Creates and returns a new instance of the McpClientManager.
 * Each manager instance provides an isolated environment for managing MCP client connections,
 * making it suitable for use in agent swarms or other scenarios requiring
 * separate connection pools.
 *
 * @returns A new `McpClientManager` instance.
 */
export function createMcpClientManager(): McpClientManager {
  return new McpClientManager();
}

// Export configuration loading functions and related types.
// These handle reading and validating server connection details from `mcp-config.json`.
export {
  getMcpServerConfig,
  loadMcpClientConfig, // Export the type for a single server's config
  type McpClientConfigFile,
  type McpServerConfigEntry,
} from "./client-config/configLoader.js";

// Export transport creation functions and the transport factory.
export * from "./transports/index.js";
