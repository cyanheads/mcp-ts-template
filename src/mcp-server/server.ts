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
import { ServerType } from '@hono/node-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import http from 'http';
import { container } from 'tsyringe';

import { config } from '../config/index.js';
import { ErrorHandler, logger, requestContextService } from '../utils/index.js';
import { ResourceRegistry } from './resources/resource-registration.js';
import { ToolRegistry } from './tools/tool-registration.js';
import type { TransportManager } from './transports/core/transportTypes.js';
import { startHttpTransport } from './transports/http/index.js';
import { startStdioTransport } from './transports/stdio/index.js';

/**
 * Creates and configures a new instance of the `McpServer`.
 * This function now resolves tool and resource definitions from the DI container.
 *
 * @returns A promise resolving with the configured `McpServer` instance.
 * @throws {McpError} If any resource or tool registration fails.
 * @private
 */
export async function createMcpServerInstance(): Promise<McpServer> {
  const context = requestContextService.createRequestContext({
    operation: 'createMcpServerInstance',
  });
  logger.info('Initializing MCP server instance', context);

  requestContextService.configure({
    appName: config.mcpServerName,
    appVersion: config.mcpServerVersion,
    environment: config.environment,
  });

  const server = new McpServer(
    {
      name: config.mcpServerName,
      version: config.mcpServerVersion,
      description: config.mcpServerDescription,
    },
    {
      capabilities: {
        logging: {},
        resources: { listChanged: true },
        tools: { listChanged: true },
      },
    },
  );

  try {
    logger.debug('Registering resources and tools via registries...', context);

    // Resolve and use the new registry services
    const toolRegistry = container.resolve(ToolRegistry);
    await toolRegistry.registerAll(server);

    const resourceRegistry = container.resolve(ResourceRegistry);
    await resourceRegistry.registerAll(server);

    logger.info('Resources and tools registered successfully', context);
  } catch (err) {
    logger.error('Failed to register resources/tools', {
      ...context,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
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
async function startTransport(): Promise<
  | { server: ServerType; transportManager: TransportManager }
  | { server: McpServer; transportManager: undefined }
> {
  const transportType = config.mcpTransportType;
  const context = requestContextService.createRequestContext({
    operation: 'startTransport',
    transport: transportType,
  });
  logger.info(`Starting transport: ${transportType}`, context);

  if (transportType === 'http') {
    const { server, transportManager } = await startHttpTransport(context);
    return { server, transportManager };
  }

  if (transportType === 'stdio') {
    const server = await createMcpServerInstance();
    await startStdioTransport(server, context);
    return { server, transportManager: undefined };
  }

  logger.crit(
    `Unsupported transport type configured: ${transportType as string}`,
    context,
  );
  throw new Error(
    `Unsupported transport type: ${transportType as string}. Must be 'stdio' or 'http'.`,
  );
}

/**
 * Main application entry point. Initializes and starts the MCP server.
 */
export async function initializeAndStartServer(): Promise<
  | { server: ServerType; transportManager: TransportManager }
  | { server: McpServer; transportManager: undefined }
> {
  const context = requestContextService.createRequestContext({
    operation: 'initializeAndStartServer',
  });
  logger.info('MCP Server initialization sequence started.', context);
  try {
    const result = await startTransport();
    logger.info(
      'MCP Server initialization sequence completed successfully.',
      context,
    );
    if (
      'transportManager' in result &&
      result.transportManager &&
      result.server instanceof http.Server
    ) {
      return {
        server: result.server as ServerType,
        transportManager: result.transportManager,
      };
    }
    return {
      server: result.server as McpServer,
      transportManager: undefined,
    };
  } catch (err) {
    logger.crit('Critical error during MCP server initialization.', {
      ...context,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    ErrorHandler.handleError(err, {
      ...context,
      operation: 'initializeAndStartServer_Catch',
      critical: true,
    });
    logger.info(
      'Exiting process due to critical initialization error.',
      context,
    );
    process.exit(1);
  }
}
