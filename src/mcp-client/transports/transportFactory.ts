/**
 * @fileoverview Factory for creating MCP client transports.
 * This module provides a centralized function (`getClientTransport`) to instantiate
 * the appropriate client transport (Stdio or HTTP) based on server configuration.
 * It uses specific transport creation functions from other modules within this directory.
 * @module src/mcp-client/transports/transportFactory
 */
import type { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"; // For return type
import type { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"; // For return type
import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import {
  logger,
  RequestContext,
  requestContextService,
} from "../../utils/index.js"; // Centralized internal imports
import { getMcpServerConfig } from "../client-config/configLoader.js";
import { createStdioClientTransport } from "./stdioClientTransport.js";
import { createHttpClientTransport } from "./httpClientTransport.js";

/**
 * Retrieves the server configuration and creates the appropriate client transport
 * (either `StdioClientTransport` or `StreamableHTTPClientTransport` from the `@modelcontextprotocol/sdk`)
 * based on the `transportType` specified in the server's configuration.
 * This function acts as a factory for client transport instances.
 *
 * @param serverName - The name of the MCP server, as defined in the `mcp-config.json` file.
 * @param parentContext - Optional parent request context for logging and tracing.
 * @returns A configured transport instance.
 * @throws {McpError} If the server configuration is missing or invalid, if an unsupported
 *                    transport type is specified, or if transport creation fails.
 */
export function getClientTransport(
  serverName: string,
  parentContext?: RequestContext | null,
): StdioClientTransport | StreamableHTTPClientTransport {
  const context = requestContextService.createRequestContext({
    ...(parentContext ?? {}),
    operation: "getClientTransport",
    targetServer: serverName,
  });

  logger.info(`Getting transport for server: ${serverName}`, context);

  try {
    const serverConfig = getMcpServerConfig(serverName, context);
    const { transportType, command, args, env } = serverConfig;

    logger.info(
      `Selected transport type "${transportType}" for server: ${serverName}`,
      { ...context, transportType },
    );

    switch (transportType) {
      case "stdio":
        logger.info(`Creating stdio transport for server: ${serverName}`, {
          ...context,
          command,
          args,
          envProvided: !!env,
        });
        return createStdioClientTransport({ command, args, env }, context);

      case "http": {
        const baseUrl = command;
        if (
          !baseUrl ||
          typeof baseUrl !== "string" ||
          !baseUrl.startsWith("http")
        ) {
          throw new McpError(
            BaseErrorCode.CONFIGURATION_ERROR,
            `Invalid 'command' for HTTP transport (must be a valid URL): "${baseUrl}"`,
            context,
          );
        }
        logger.info(
          `Creating HTTP transport for server: ${serverName} with base URL: ${baseUrl}`,
          context,
        );
        return createHttpClientTransport({ baseUrl }, context);
      }

      default:
        throw new McpError(
          BaseErrorCode.CONFIGURATION_ERROR,
          `Unsupported transportType "${transportType}" for server "${serverName}".`,
          context,
        );
    }
  } catch (error) {
    logger.error(
      `Failed to get or create transport for server "${serverName}"`,
      {
        ...context,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    );
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      `Unexpected error while getting transport for ${serverName}: ${error instanceof Error ? error.message : String(error)}`,
      { originalError: error, ...context },
    );
  }
}
