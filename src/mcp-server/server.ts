/**
 * @fileoverview Factory for creating configured MCP server instances.
 * Creates an McpServer with identity, capabilities, and registered
 * tools/resources/prompts/roots from the provided registries.
 *
 * MCP Specification References:
 * - Lifecycle: https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle
 * - Overview (Capabilities): https://modelcontextprotocol.io/specification/2025-06-18/basic/index
 * - Transports: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 * @module src/mcp-server/server
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AppConfig } from '@/config/index.js';
import type { PromptRegistry } from '@/mcp-server/prompts/prompt-registration.js';
import type { ResourceRegistry } from '@/mcp-server/resources/resource-registration.js';
import type { RootsRegistry } from '@/mcp-server/roots/roots-registration.js';
import type { ToolRegistry } from '@/mcp-server/tools/tool-registration.js';
import { logger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

/** Dependencies required to create an MCP server instance. */
export interface McpServerDeps {
  config: AppConfig;
  promptRegistry: PromptRegistry;
  resourceRegistry: ResourceRegistry;
  rootsRegistry: RootsRegistry;
  toolRegistry: ToolRegistry;
}

/**
 * Creates and configures a new instance of the `McpServer`.
 * Registries are provided directly — no DI container resolution.
 *
 * @returns A promise resolving with the configured `McpServer` instance.
 * @throws {McpError} If any resource or tool registration fails.
 */
export async function createMcpServerInstance(deps: McpServerDeps): Promise<McpServer> {
  const context = requestContextService.createRequestContext({
    operation: 'createMcpServerInstance',
  });
  logger.info('Initializing MCP server instance', context);

  const server = new McpServer(
    {
      name: deps.config.mcpServerName,
      version: deps.config.mcpServerVersion,
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

    await Promise.all([
      deps.toolRegistry.registerAll(server),
      deps.resourceRegistry.registerAll(server),
      deps.promptRegistry.registerAll(server),
    ]);

    deps.rootsRegistry.registerAll(server);

    logger.info('All MCP capabilities registered successfully', context);
  } catch (err) {
    logger.error(
      'Failed to register MCP capabilities',
      err instanceof Error ? err : new Error(String(err)),
      context,
    );
    throw err;
  }

  return server;
}
