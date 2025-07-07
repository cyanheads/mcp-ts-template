/**
 * @fileoverview Handles the detailed logic for establishing a new MCP client connection.
 * This module encapsulates the steps involved in connecting to an MCP server,
 * including configuration validation, client identity setup, transport acquisition,
 * client instantiation, event handling, and the MCP initialization handshake.
 * @module src/mcp-client/core/clientConnectionLogic
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ClientCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import {
  logger,
  RequestContext,
  // ErrorHandler will be used by the caller (clientManager)
} from "../../utils/index.js";
import { getClientTransport } from "../transports/index.js";
import { getMcpServerConfig } from "../client-config/configLoader.js";

// Client version remains hard-coded as per user instruction.
const CLIENT_VERSION = "1.0.0";

/**
 * Type for the disconnect function that will be passed into `establishNewMcpConnection`.
 * This helps break the circular dependency with clientManager.
 */
type DisconnectFunction = (
  serverName: string,
  context: RequestContext,
  error?: Error | McpError,
) => Promise<void>;

/**
 * Establishes a new connection to the specified MCP server.
 * This function performs the core steps of connecting, including configuration validation,
 * client identity setup, transport acquisition, SDK client instantiation, event handler setup,
 * and the MCP initialization handshake.
 *
 * IMPORTANT: This function is intended to be wrapped by a higher-level error handler
 * (e.g., ErrorHandler.tryCatch in clientManager.ts) to manage exceptions.
 *
 * @param serverName - The unique name of the MCP server to connect to.
 * @param operationContext - The request context for this connection attempt.
 * @param disconnectFn - A function to call for disconnecting the client (passed from clientManager).
 * @returns A promise that resolves to the connected and initialized `ConnectedMcpClient` instance.
 * @throws {McpError} If server configuration is missing/invalid, transport cannot be established,
 *                    or if the connection/MCP initialization fails.
 */
export async function establishNewMcpConnection(
  serverName: string,
  operationContext: RequestContext,
  disconnectFn: DisconnectFunction,
): Promise<Client> {
  // --- Step 1: Validate Server Configuration ---
  logger.debug(
    `Validating configuration for server: ${serverName}`,
    operationContext,
  );
  const serverConfig = getMcpServerConfig(serverName, operationContext);
  logger.debug(
    `Configuration successfully validated for server: ${serverName}`,
    operationContext,
  );

  if (serverConfig.disabled) {
    logger.warning(
      `Connection to server "${serverName}" aborted: Server is marked as disabled in configuration.`,
      operationContext,
    );
    throw new McpError(
      BaseErrorCode.CONFIGURATION_ERROR,
      `Server "${serverName}" is disabled.`,
      operationContext,
    );
  }

  // --- Step 2: Define Client Identity & Capabilities (MCP Spec 2025-03-26) ---
  const clientIdentity = {
    name: `mcp-ts-template-client-for-${serverName}`,
    version: CLIENT_VERSION,
  };

  const clientCapabilities: ClientCapabilities = {
    resources: { list: true, read: true, templates: { list: true } },
    tools: { list: true, call: true },
    prompts: { list: true, get: true },
    logging: { setLevel: true },
    roots: { listChanged: true },
    // ping, cancellation, progress are implicitly supported by SDK Client
  };
  logger.debug("Client identity and capabilities defined", {
    ...operationContext,
    identity: clientIdentity,
    capabilities: clientCapabilities,
  });

  // --- Step 3: Get Transport ---
  const transport = getClientTransport(serverName, operationContext);
  logger.debug(
    `Transport acquired for server ${serverName}: ${transport.constructor.name}`,
    operationContext,
  );

  // --- Step 4: Create Client Instance ---
  const client = new Client(clientIdentity, {
    capabilities: clientCapabilities,
  });

  // --- Step 5: Setup Event Handlers ---
  // These handlers are crucial for reacting to errors and closures.
  // They will call the main disconnectMcpClient from clientManager.ts for cleanup.
  client.onerror = (clientError: Error) => {
    const errorCode =
      typeof clientError === "object" &&
      clientError !== null &&
      "code" in clientError
        ? (clientError as { code: unknown }).code
        : "UNKNOWN";
    const errorData =
      typeof clientError === "object" &&
      clientError !== null &&
      "data" in clientError
        ? (clientError as { data: unknown }).data
        : undefined;
    logger.error(`MCP SDK Client error for server ${serverName}`, {
      ...operationContext,
      error: clientError.message,
      code: errorCode,
      data: errorData,
      stack: clientError.stack,
    });
    // disconnectFn (passed from clientManager) will handle cache removal.
    disconnectFn(serverName, operationContext, clientError).catch(
      (disconnectErr) => {
        logger.error(
          `Error during disconnect triggered by client.onerror (via disconnectFn) for ${serverName}`,
          { ...operationContext, disconnectError: disconnectErr },
        );
      },
    );
  };

  transport.onerror = (transportError: Error) => {
    logger.error(`MCP Transport layer error for server ${serverName}`, {
      ...operationContext,
      error: transportError.message,
      stack: transportError.stack,
    });
    disconnectFn(serverName, operationContext, transportError).catch(
      (disconnectErr) => {
        logger.error(
          `Error during disconnect triggered by transport.onerror (via disconnectFn) for ${serverName}`,
          { ...operationContext, disconnectError: disconnectErr },
        );
      },
    );
  };

  transport.onclose = () => {
    logger.info(
      `MCP Transport closed for server ${serverName}. Initiating client disconnect.`,
      operationContext,
    );
    disconnectFn(serverName, operationContext).catch((disconnectErr) => {
      logger.error(
        `Error during disconnect triggered by transport.onclose (via disconnectFn) for ${serverName}`,
        { ...operationContext, disconnectError: disconnectErr },
      );
    });
  };
  logger.debug(
    `Event handlers (onerror, onclose) set up for client and transport for ${serverName}`,
    operationContext,
  );

  // --- Step 6: Connect and Initialize ---
  logger.info(
    `Connecting client to transport and performing MCP initialization for ${serverName}...`,
    operationContext,
  );
  await client.connect(transport);
  logger.info(
    `Successfully connected and initialized with MCP server: ${serverName}`,
    operationContext,
  );

  return client;
}
