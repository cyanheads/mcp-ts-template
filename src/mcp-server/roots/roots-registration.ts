/**
 * @fileoverview Service for implementing MCP roots capability.
 * Roots provide filesystem/workspace context awareness for the server.
 *
 * MCP Roots Specification:
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/basic/roots | MCP Roots}
 * @module src/mcp-server/roots/roots-registration
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  type logger as defaultLogger,
  requestContextService,
} from '@/utils/index.js';

export class RootsRegistry {
  constructor(private logger: typeof defaultLogger) {}

  /**
   * Registers roots handlers on the given MCP server.
   * Note: In MCP, roots are typically provided BY THE CLIENT to the server.
   * This implementation provides a placeholder for demonstration.
   * In production, roots would be received from the client via client.listRoots().
   */
  registerAll(_server: McpServer): void {
    const context = requestContextService.createRequestContext({
      operation: 'RootsRegistry.registerAll',
    });

    this.logger.debug(
      'Roots capability enabled (client-provided roots)',
      context,
    );

    // Note: The MCP SDK handles roots automatically via the client-server protocol.
    // Servers receive roots from clients, not the other way around.
    // This is just a placeholder to demonstrate the capability is enabled.
    // To access roots in your tools, use sdkContext to query the client.

    this.logger.info('Roots capability registered successfully', context);
  }
}
