/**
 * @fileoverview Orchestrates MCP (Model Context Protocol) client connections.
 * This module serves as the primary public interface for connecting to, disconnecting from,
 * and managing MCP server connections. It utilizes helper modules for caching
 * (`clientCache.ts`) and detailed connection establishment logic (`clientConnectionLogic.ts`).
 *
 * Key responsibilities include:
 * - Providing `connectMcpClient` to establish or retrieve cached/pending connections.
 * - Providing `disconnectMcpClient` to terminate a specific server connection with timeout.
 * - Providing `disconnectAllMcpClients` for graceful shutdown of all connections.
 *
 * MCP Specification References:
 * - Client Lifecycle & Initialization: Aligns with general MCP lifecycle principles.
 * @module src/mcp-client/core/clientManager
 */

import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "../../utils/index.js";
import {
  clearAllClientCache,
  getAllCachedServerNames,
  getCachedClient,
  getPendingConnection,
  removeClientFromCache,
  removePendingConnection,
  setCachedClient,
  setPendingConnection,
  type ConnectedMcpClient as CachedConnectedMcpClient,
} from "./clientCache.js";
import { establishNewMcpConnection } from "./clientConnectionLogic.js";

/**
 * Represents a successfully connected and initialized MCP Client instance.
 * This type alias is re-exported for external use.
 */
export type ConnectedMcpClient = CachedConnectedMcpClient;

const SHUTDOWN_TIMEOUT_MS = 5000; // 5 seconds for client.close() timeout

/**
 * Creates, connects, or returns an existing/pending MCP client instance for a specified server.
 *
 * @param serverName - The unique name of the MCP server to connect to.
 * @param parentContext - Optional parent `RequestContext` for logging and tracing.
 * @returns A promise that resolves to the connected and initialized `ConnectedMcpClient` instance.
 * @throws {McpError} If connection or initialization fails, or if configuration is invalid.
 */
export async function connectMcpClient(
  serverName: string,
  parentContext?: RequestContext | null,
): Promise<ConnectedMcpClient> {
  const operationContext = requestContextService.createRequestContext({
    ...(parentContext ?? {}),
    operation: "connectMcpClient",
    targetServer: serverName,
  });

  const cachedClient = getCachedClient(serverName);
  if (cachedClient) {
    logger.debug(
      `Returning existing connected client for server: ${serverName}`,
      operationContext,
    );
    return cachedClient;
  }

  const pendingPromise = getPendingConnection(serverName);
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

  const connectionPromise = ErrorHandler.tryCatch(
    async () => {
      const client = await establishNewMcpConnection(
        serverName,
        operationContext,
        disconnectMcpClient,
      );
      setCachedClient(serverName, client);
      return client;
    },
    {
      operation: `connectMcpClient (server: ${serverName})`,
      context: operationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
    },
  ).finally(() => {
    removePendingConnection(serverName);
  });

  setPendingConnection(serverName, connectionPromise);
  return connectionPromise;
}

/**
 * Disconnects a specific MCP client, closes its transport with a timeout, and removes it from the cache.
 *
 * @param serverName - The name of the server whose client connection should be terminated.
 * @param parentContext - Optional parent `RequestContext` for logging.
 * @param error - Optional error that triggered the disconnect, for logging.
 * @returns A promise that resolves when the disconnection attempt is complete.
 */
export async function disconnectMcpClient(
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

  const client = getCachedClient(serverName);

  if (!client) {
    if (!error) {
      logger.warning(
        `Client for ${serverName} not found in cache or already disconnected.`,
        context,
      );
    }
    removeClientFromCache(serverName, "Not found during disconnect");
    return;
  }

  logger.info(`Disconnecting client for server: ${serverName}...`, context);

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
    removeClientFromCache(serverName, "After close attempt");
  });
}

/**
 * Disconnects all currently active MCP client connections.
 *
 * @param parentContext - Optional parent `RequestContext` for logging.
 * @returns A promise that resolves when all disconnection attempts are processed.
 */
export async function disconnectAllMcpClients(
  parentContext?: RequestContext | null,
): Promise<void> {
  const context = requestContextService.createRequestContext({
    ...(parentContext ?? {}),
    operation: "disconnectAllMcpClients",
  });
  logger.info("Disconnecting all active MCP clients...", context);

  const serverNamesToDisconnect = getAllCachedServerNames();

  if (serverNamesToDisconnect.length === 0) {
    logger.info("No active MCP clients to disconnect.", context);
    clearAllClientCache();
    return;
  }

  logger.debug(
    `Found ${serverNamesToDisconnect.length} active clients to disconnect: ${serverNamesToDisconnect.join(", ")}`,
    context,
  );

  const disconnectionPromises = serverNamesToDisconnect.map((serverName) =>
    disconnectMcpClient(serverName, context),
  );

  await Promise.allSettled(disconnectionPromises);

  logger.info(
    "All MCP client disconnection attempts have been processed.",
    context,
  );

  clearAllClientCache();
  logger.info("All client caches have been cleared.", context);
}
