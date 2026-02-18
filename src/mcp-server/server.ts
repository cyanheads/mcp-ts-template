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
 * - Lifecycle: https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle
 * - Overview (Capabilities): https://modelcontextprotocol.io/specification/2025-06-18/basic/index
 * - Transports: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 * @module src/mcp-server/server
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { config } from '@/config/index.js';
import { container } from '@/container/core/container.js';
import {
  PromptRegistryToken,
  ResourceRegistryToken,
  RootsRegistryToken,
  ToolRegistryToken,
} from '@/container/core/tokens.js';
import { logger, requestContextService } from '@/utils/index.js';

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
    },
    {
      capabilities: {
        logging: {},
        resources: { listChanged: true },
        tools: { listChanged: true },
        prompts: { listChanged: true },
        // Experimental: Tasks API for long-running async operations
        tasks: {
          list: {},
          cancel: {},
          requests: {
            tools: { call: {} },
          },
        },
      },
    },
  );

  try {
    logger.debug('Registering all MCP capabilities via registries...', context);

    // Resolve and use registry services
    const toolRegistry = container.resolve(ToolRegistryToken);
    await toolRegistry.registerAll(server);

    const resourceRegistry = container.resolve(ResourceRegistryToken);
    await resourceRegistry.registerAll(server);

    const promptRegistry = container.resolve(PromptRegistryToken);
    promptRegistry.registerAll(server);

    const rootsRegistry = container.resolve(RootsRegistryToken);
    rootsRegistry.registerAll(server);

    logger.info('All MCP capabilities registered successfully', context);
  } catch (err) {
    logger.error('Failed to register MCP capabilities', {
      ...context,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }

  return server;
}
