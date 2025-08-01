/**
 * @fileoverview Implements a stateless transport manager for the MCP SDK.
 *
 * This manager handles single, ephemeral MCP operations. For each incoming request,
 * it dynamically creates a temporary McpServer and transport instance, processes the
 * request, and then immediately schedules the resources for cleanup. This approach
 * is ideal for simple, one-off tool calls that do not require persistent session state.
 *
 * The key challenge addressed here is bridging the Node.js-centric MCP SDK with
 * modern, Web Standards-based frameworks like Hono. This is achieved by deferring
 * resource cleanup until the response stream has been fully consumed by the web
 * framework, preventing premature closure and truncated responses.
 *
 * @module src/mcp-server/transports/core/statelessTransportManager
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { IncomingHttpHeaders, ServerResponse } from "http";
import { Readable } from "stream";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "../../../utils/index.js";
import { BaseTransportManager } from "./baseTransportManager.js";
import { HonoStreamResponse } from "./honoNodeBridge.js";
import { convertNodeHeadersToWebHeaders } from "./headerUtils.js";
import { HttpStatusCode, TransportResponse } from "./transportTypes.js";

/**
 * Manages ephemeral, single-request MCP operations.
 */
export class StatelessTransportManager extends BaseTransportManager {
  /**
   * Handles a single, stateless MCP request.
   *
   * This method orchestrates the creation of temporary server and transport instances,
   * handles the request, and ensures resources are cleaned up only after the
   * response stream is closed.
   *
   * @param headers - The incoming request headers.
   * @param body - The parsed body of the request.
   * @param context - The request context for logging and tracing.
   * @returns A promise resolving to a streaming TransportResponse.
   */
  async handleRequest(
    headers: IncomingHttpHeaders,
    body: unknown,
    context: RequestContext,
  ): Promise<TransportResponse> {
    const opContext = {
      ...context,
      operation: "StatelessTransportManager.handleRequest",
    };
    logger.debug(
      "Creating ephemeral server instance for stateless request.",
      opContext,
    );

    let server: McpServer | undefined;
    let transport: StreamableHTTPServerTransport | undefined;

    try {
      // 1. Create ephemeral instances for this request.
      server = await this.createServerInstanceFn();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        onsessioninitialized: undefined,
      });

      await server.connect(transport);
      logger.debug("Ephemeral server connected to transport.", opContext);

      // 2. Set up the Node.js-to-Web stream bridge.
      const mockReq = {
        headers,
        method: "POST",
      } as import("http").IncomingMessage;
      const mockResBridge = new HonoStreamResponse();

      // 3. Defer cleanup until the stream is fully processed.
      // This is the critical fix to prevent premature resource release.
      this.setupDeferredCleanup(mockResBridge, server, transport, opContext);

      // 4. Process the request using the MCP transport.
      const mockRes = mockResBridge as unknown as ServerResponse;
      await transport.handleRequest(mockReq, mockRes, body);

      logger.info("Stateless request handled successfully.", opContext);

      // 5. Convert headers and create the final streaming response.
      const responseHeaders = convertNodeHeadersToWebHeaders(
        mockRes.getHeaders(),
      );
      const webStream = Readable.toWeb(
        mockResBridge,
      ) as ReadableStream<Uint8Array>;

      return {
        type: "stream",
        headers: responseHeaders,
        statusCode: mockRes.statusCode as HttpStatusCode,
        stream: webStream,
      };
    } catch (error) {
      // If an error occurs before the stream is returned, we must clean up immediately.
      if (server || transport) {
        this.cleanup(server, transport, opContext);
      }
      throw ErrorHandler.handleError(error, {
        operation: "StatelessTransportManager.handleRequest",
        context: opContext,
        rethrow: true,
      });
    }
  }

  /**
   * Attaches listeners to the response stream to trigger resource cleanup
   * only after the stream has been fully consumed or has errored.
   *
   * @param stream - The response stream bridge.
   * @param server - The ephemeral McpServer instance.
   * @param transport - The ephemeral transport instance.
   * @param context - The request context for logging.
   */
  private setupDeferredCleanup(
    stream: HonoStreamResponse,
    server: McpServer,
    transport: StreamableHTTPServerTransport,
    context: RequestContext,
  ): void {
    let cleanedUp = false;
    const cleanupFn = (error?: Error) => {
      if (cleanedUp) return;
      cleanedUp = true;

      if (error) {
        logger.warning("Stream ended with an error, proceeding to cleanup.", {
          ...context,
          error: error.message,
        });
      }
      // Cleanup is fire-and-forget.
      this.cleanup(server, transport, context);
    };

    // 'close' is the most reliable event, firing on both normal completion and abrupt termination.
    stream.on("close", () => cleanupFn());
    stream.on("error", (err) => cleanupFn(err));
  }

  /**
   * Performs the actual cleanup of ephemeral resources.
   * This method is designed to be "fire-and-forget".
   */
  private cleanup(
    server: McpServer | undefined,
    transport: StreamableHTTPServerTransport | undefined,
    context: RequestContext,
  ): void {
    const opContext = {
      ...context,
      operation: "StatelessTransportManager.cleanup",
    };
    logger.debug("Scheduling cleanup for ephemeral resources.", opContext);

    Promise.all([transport?.close(), server?.close()])
      .then(() => {
        logger.debug("Ephemeral resources cleaned up successfully.", opContext);
      })
      .catch((cleanupError) => {
        logger.warning("Error during stateless resource cleanup.", {
          ...opContext,
          error:
            cleanupError instanceof Error
              ? cleanupError.message
              : String(cleanupError),
        });
      });
  }

  /**
   * Shuts down the manager. For the stateless manager, this is a no-op
   * as there are no persistent resources to manage.
   */
  async shutdown(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "StatelessTransportManager.shutdown",
    });
    logger.info(
      "Stateless transport manager shutdown - no persistent resources to clean up.",
      context,
    );
    return Promise.resolve();
  }
}
