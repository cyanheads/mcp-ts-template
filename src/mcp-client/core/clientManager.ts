/**
 * @fileoverview Defines the McpClientManager class for orchestrating MCP client connections.
 * This module provides a class-based approach to managing MCP server connections,
 * allowing for isolated sets of connections, suitable for multi-agent or swarm scenarios.
 * Each instance of McpClientManager maintains its own cache of active and pending connections.
 *
 * Key responsibilities include:
 * - Providing `connectMcpClient` to establish or retrieve cached/pending connections within an instance.
 * - Providing `disconnectMcpClient` to terminate a specific server connection with a timeout.
 * - Providing `disconnectAllMcpClients` for graceful shutdown of all connections managed by an instance.
 *
 * @module src/mcp-client/core/clientManager
 */

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "../../utils/index.js";
import { establishNewMcpConnection } from "./clientConnectionLogic.js";

export type ConnectedMcpClient = Client;

const SHUTDOWN_TIMEOUT_MS = 5000; // 5 seconds for client.close() timeout

/**
 * Manages a distinct, isolated set of MCP client connections.
 * Each instance of this class has its own connection cache, making it suitable
 * for scenarios like agent swarms where each agent needs its own connection pool.
 */
export class McpClientManager {
  private connectedClients: Map<string, ConnectedMcpClient> = new Map();
  private pendingConnections: Map<string, Promise<ConnectedMcpClient>> =
    new Map();

  /**
   * Creates, connects, or returns an existing/pending MCP client instance for a specified server
   * within this manager's scope.
   *
   * @param serverName - The unique name of the MCP server to connect to.
   * @param parentContext - Optional parent `RequestContext` for logging and tracing.
   * @returns A promise that resolves to the connected and initialized `ConnectedMcpClient` instance.
   * @throws {McpError} If connection or initialization fails, or if configuration is invalid.
   */
  public async connectMcpClient(
    serverName: string,
    parentContext?: RequestContext | null,
  ): Promise<ConnectedMcpClient> {
    const operationContext = requestContextService.createRequestContext({
      ...(parentContext ?? {}),
      operation: "connectMcpClient",
      targetServer: serverName,
    });

    const cachedClient = this.connectedClients.get(serverName);
    if (cachedClient) {
      logger.debug(
        `Returning existing connected client for server: ${serverName}`,
        operationContext,
      );
      return cachedClient;
    }

    const pendingPromise = this.pendingConnections.get(serverName);
    if (pendingPromise) {
      logger.debug(
        `Returning pending connection promise for server: ${serverName}`,
        operationContext,
      );
      return pendingPromise;
    }

    logger.info(
      `No active or pending connection for ${serverName}. Initiating new connection.`,
      operationContext,
    );

    const connectionPromise = (async () => {
      try {
        const client = await establishNewMcpConnection(
          serverName,
          operationContext,
          (name, context, error) =>
            this.disconnectMcpClient(name, context, error),
        );
        this.connectedClients.set(serverName, client);
        return client;
      } catch (error) {
        const handledError = ErrorHandler.handleError(error, {
          operation: `connectMcpClient (server: ${serverName})`,
          context: operationContext,
          errorCode: BaseErrorCode.INITIALIZATION_FAILED,
        });
        // Re-throw the handled error to be caught by the caller
        throw handledError;
      } finally {
        this.pendingConnections.delete(serverName);
      }
    })();

    this.pendingConnections.set(serverName, connectionPromise);
    return connectionPromise;
  }

  /**
   * Disconnects a specific MCP client managed by this instance, closes its transport with a timeout,
   * and removes it from the cache.
   *
   * @param serverName - The name of the server whose client connection should be terminated.
   * @param parentContext - Optional parent `RequestContext` for logging.
   * @param error - Optional error that triggered the disconnect, for logging.
   * @returns A promise that resolves when the disconnection attempt is complete.
   */
  public async disconnectMcpClient(
    serverName: string,
    parentContext?: RequestContext | null,
    error?: Error | McpError,
  ): Promise<void> {
    const context = requestContextService.createRequestContext({
      ...(parentContext ?? {}),
      operation: "disconnectMcpClient",
      targetServer: serverName,
      triggerReason: error
        ? `Error: ${error.message}`
        : "Explicit disconnect call",
    });

    const client = this.connectedClients.get(serverName);

    if (!client) {
      if (!error) {
        logger.warning(
          `Client for ${serverName} not found in this manager's cache or already disconnected.`,
          context,
        );
      }
      this.connectedClients.delete(serverName);
      return;
    }

    logger.info(
      `Disconnecting client for server: ${serverName} within this manager.`,
      context,
    );

    await ErrorHandler.tryCatch(
      async () => {
        const closePromise = client.close();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Timeout: client.close() for ${serverName} exceeded ${SHUTDOWN_TIMEOUT_MS}ms`,
                ),
              ),
            SHUTDOWN_TIMEOUT_MS,
          ),
        );
        await Promise.race([closePromise, timeoutPromise]);
        logger.info(
          `Client for ${serverName} and its transport closed successfully.`,
          context,
        );
      },
      {
        operation: `disconnectMcpClient.close (server: ${serverName})`,
        context,
        errorCode: BaseErrorCode.SHUTDOWN_ERROR,
      },
    ).finally(() => {
      this.connectedClients.delete(serverName);
    });
  }

  /**
   * Disconnects all currently active MCP client connections managed by this instance.
   *
   * @param parentContext - Optional parent `RequestContext` for logging.
   * @returns A promise that resolves when all disconnection attempts are processed.
   */
  public async disconnectAllMcpClients(
    parentContext?: RequestContext | null,
  ): Promise<void> {
    const context = requestContextService.createRequestContext({
      ...(parentContext ?? {}),
      operation: "disconnectAllMcpClients",
    });
    logger.info(
      "Disconnecting all active MCP clients for this manager...",
      context,
    );

    const serverNamesToDisconnect = Array.from(this.connectedClients.keys());

    if (serverNamesToDisconnect.length === 0) {
      logger.info(
        "No active MCP clients in this manager to disconnect.",
        context,
      );
      this.clearAllCache();
      return;
    }

    logger.debug(
      `Found ${serverNamesToDisconnect.length} active clients to disconnect: ${serverNamesToDisconnect.join(", ")}`,
      context,
    );

    const disconnectionPromises = serverNamesToDisconnect.map((serverName) =>
      this.disconnectMcpClient(serverName, context),
    );

    await Promise.allSettled(disconnectionPromises);

    logger.info(
      "All MCP client disconnection attempts for this manager have been processed.",
      context,
    );

    this.clearAllCache();
    logger.info(
      "All client caches for this manager have been cleared.",
      context,
    );
  }

  /**
   * Clears all cached clients and pending connections for this manager instance.
   */
  private clearAllCache(): void {
    const context = requestContextService.createRequestContext({
      operation: "clearAllCache",
    });
    const connectedCount = this.connectedClients.size;
    const pendingCount = this.pendingConnections.size;

    this.connectedClients.clear();
    this.pendingConnections.clear();

    logger.info(
      `Cleared all caches for this manager. Removed ${connectedCount} connected clients and ${pendingCount} pending connections.`,
      context,
    );
  }

  /**
   * Asynchronously retrieves a map of all available tools from all connected MCP servers by actively fetching them.
   * @param parentContext - The context of the calling operation.
   * @returns A promise that resolves to a map where keys are tool names and values are their definitions.
   */
  public async getAllTools(
    parentContext?: RequestContext | null,
  ): Promise<Map<string, unknown>> {
    const context = requestContextService.createRequestContext({
      ...(parentContext ?? {}),
      operation: "McpClientManager.getAllTools",
    });
    const allTools = new Map<string, unknown>();
    logger.debug(
      `Fetching tools from ${this.connectedClients.size} connected clients.`,
      context,
    );

    const toolPromises = Array.from(this.connectedClients.entries()).map(
      async ([serverName, client]) => {
        try {
          const result = await client.listTools();
          const tools =
            result && typeof result === "object" && "tools" in result
              ? (result as { tools: unknown[] }).tools
              : [];
          if (Array.isArray(tools)) {
            logger.debug(
              `Successfully fetched ${tools.length} tools from server: ${serverName}`,
              { ...context, serverName },
            );
            for (const tool of tools) {
              if (tool && typeof tool === "object" && "name" in tool) {
                allTools.set(tool.name as string, {
                  ...tool,
                  server: serverName,
                });
              }
            }
          } else {
            logger.warning(
              `No 'tools' array found in listTools response from server: ${serverName}`,
              { ...context, serverName, response: result },
            );
          }
        } catch (error) {
          logger.error(`Failed to fetch tools from server: ${serverName}`, {
            ...context,
            serverName,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      },
    );

    await Promise.all(toolPromises);

    logger.debug(`Total tools fetched: ${allTools.size}`, context);
    return allTools;
  }

  /**
   * Finds the server name for a given tool from the cached tool map.
   * This is a synchronous method and relies on `getAllTools` having been called first.
   * @param toolName - The name of the tool to find.
   * @param allTools - The map of all available tools.
   * @returns The server name, or null if the tool is not found.
   */
  public getServerForTool(
    toolName: string,
    allTools: Map<string, unknown>,
  ): string | null {
    const tool = allTools.get(toolName);
    if (tool && typeof tool === "object" && "server" in tool) {
      return (tool as { server: string }).server;
    }
    return null;
  }
}
