/**
 * @fileoverview Stateless Transport Manager implementation for MCP SDK.
 * This manager handles single-request operations without maintaining sessions.
 * Each request creates a temporary server instance that is cleaned up immediately.
 * @module src/mcp-server/transports/core/statelessTransportManager
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { IncomingMessage, ServerResponse } from "http";
import { logger, RequestContext } from "../../../utils/index.js";
import { BaseTransportManager } from "./baseTransportManager.js";

/**
 * Stateless Transport Manager that handles ephemeral MCP operations.
 * Each request creates a temporary server and transport that are immediately cleaned up.
 */
export class StatelessTransportManager extends BaseTransportManager {
  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    body: unknown,
    context: RequestContext,
  ): Promise<ServerResponse> {
    logger.debug("Creating ephemeral server instance for stateless request", {
      ...context,
    });

    let server: McpServer | undefined;
    let transport: StreamableHTTPServerTransport | undefined;

    try {
      server = await this.createServerInstanceFn();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        onsessioninitialized: undefined,
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, body);

      logger.debug("Stateless request handled successfully", { ...context });
      return res;
    } catch (error) {
      logger.error("Error handling stateless request", { error, ...context });
      throw error;
    } finally {
      this.cleanup(server, transport, context);
    }
  }

  async shutdown(): Promise<void> {
    logger.debug("Stateless transport manager shutdown - no action needed");
  }

  private cleanup(
    server: McpServer | undefined,
    transport: StreamableHTTPServerTransport | undefined,
    context: RequestContext,
  ): void {
    // Non-blocking cleanup
    Promise.all([transport?.close(), server?.close()])
      .then(() => {
        logger.debug("Ephemeral resources cleaned up", { ...context });
      })
      .catch((cleanupError) => {
        logger.warning("Error during stateless cleanup", {
          error: cleanupError,
          ...context,
        });
      });
  }
}
