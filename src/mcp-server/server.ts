/**
 * @fileoverview Main entry point for the MCP (Model Context Protocol) server.
 * This file orchestrates the server's lifecycle:
 * 1. Initializes the core `McpServer` instance (from `@modelcontextprotocol/sdk`) with its identity and capabilities.
 * 2. Registers available resources and tools, making them discoverable and usable by clients.
 * 3. Selects and starts the appropriate communication transport (stdio or Streamable HTTP)
 *    based on configuration.
 * 4. Handles top-level error management during startup.
 *
 * MCP Specification References:
 * - Lifecycle: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/lifecycle.mdx
 * - Overview (Capabilities): https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/index.mdx
 * - Transports: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/transports.mdx
 * @module src/mcp-server/server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import http from "http";
import { config } from "@/config/index.js";
import { ErrorHandler, requestContextService } from "@/utils/index.js";
import {
  logFatal,
  logOperationError,
  logOperationStart,
  logOperationSuccess,
} from "@/utils/internal/logging-helpers.js";
import { registerAllResources } from "@/mcp-server/resources/index.js";
import { registerAllTools } from "@/mcp-server/tools/index.js";
import { startHttpTransport } from "@/mcp-server/transports/http/index.js";
import { startStdioTransport } from "@/mcp-server/transports/stdio/index.js";

/**
 * Creates and configures a new instance of the `McpServer`.
 *
 * @returns A promise resolving with the configured `McpServer` instance.
 * @throws {McpError} If any resource or tool registration fails.
 * @private
 */
async function createMcpServerInstance(): Promise<McpServer> {
  const context = requestContextService.createRequestContext({
    operation: "createMcpServerInstance",
  });
  logOperationStart(context, "Initializing MCP server instance");

  const server = new McpServer(
    { name: config.mcpServerName, version: config.mcpServerVersion },
    {
      capabilities: {
        logging: {},
        resources: { listChanged: true },
        tools: { listChanged: true },
      },
    },
  );

  try {
    logOperationStart(context, "Registering resources and tools...");
    await registerAllResources(server);
    await registerAllTools(server);
    logOperationSuccess(context, "Resources and tools registered successfully");
  } catch (err) {
    logOperationError(context, "Failed to register resources/tools", err);
    throw err;
  }

  return server;
}

/**
 * Selects, sets up, and starts the appropriate MCP transport layer based on configuration.
 *
 * @returns Resolves with `McpServer` for 'stdio' or `http.Server` for 'http'.
 * @throws {Error} If transport type is unsupported or setup fails.
 * @private
 */
async function startTransport(): Promise<McpServer | http.Server> {
  const transportType = config.mcpTransportType;
  const context = requestContextService.createRequestContext({
    operation: "startTransport",
    transport: transportType,
  });
  logOperationStart(context, `Starting transport: ${transportType}`);

  if (transportType === "http") {
    const { server } = await startHttpTransport(
      createMcpServerInstance,
      context,
    );
    return server as http.Server;
  }

  if (transportType === "stdio") {
    const server = await createMcpServerInstance();
    await startStdioTransport(server, context);
    return server;
  }

  const error = new Error(
    `Unsupported transport type: ${transportType}. Must be 'stdio' or 'http'.`,
  );
  logFatal(
    context,
    `Unsupported transport type configured: ${transportType}`,
    error,
  );
  // logFatal will exit, but throw for type safety and clarity
  throw error;
}

/**
 * Main application entry point. Initializes and starts the MCP server.
 */
export async function initializeAndStartServer(): Promise<
  McpServer | http.Server
> {
  const context = requestContextService.createRequestContext({
    operation: "initializeAndStartServer",
  });
  logOperationStart(context, "MCP Server initialization sequence started.");
  try {
    const result = await startTransport();
    logOperationSuccess(
      context,
      "MCP Server initialization sequence completed successfully.",
    );
    return result;
  } catch (err) {
    logFatal(context, "Critical error during MCP server initialization.", err);
    // This part is likely unreachable as logFatal exits, but kept for robustness.
    ErrorHandler.handleError(err, {
      ...context,
      operation: "initializeAndStartServer_Catch",
      critical: true,
    });
    process.exit(1);
  }
}
