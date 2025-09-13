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
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingHttpHeaders } from 'http';

import { config } from '../../../config/index.js';
import {
  ErrorHandler,
  RequestContext,
  idGenerator,
  logger,
  requestContextService,
} from '../../../utils/index.js';
import { BaseTransportManager } from './baseTransportManager.js';
import type { TransportResponse } from './transportTypes.js';

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
      operation: 'StatelessTransportManager.handleRequest',
    };
    logger.debug(
      'Creating ephemeral server instance for stateless request.',
      opContext,
    );

    let server: McpServer | undefined;
    let transport: StreamableHTTPServerTransport | undefined;

    try {
      // 1. Create ephemeral instances for this request.
      server = await this.createServerInstanceFn();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => idGenerator.generate(),
        onsessioninitialized: () => {},
      });

      await server.connect(transport);
      logger.debug('Ephemeral server connected to transport.', opContext);

      // 2. Process the request using the bridge method from the base class.
      const response = await this._processRequestWithBridge(
        transport,
        headers,
        body,
        config.mcpHttpEndpointPath,
      );

      if (response.type !== 'stream') {
        // This should not happen with _processRequestWithBridge
        throw new Error(
          'Expected a streaming response but got a buffered one.',
        );
      }

      // 3. Defer cleanup until the stream is fully processed.
      // This is the critical fix to prevent premature resource release.
      this.setupDeferredCleanup(response.stream, server, transport, opContext);

      logger.info('Stateless request handled successfully.', opContext);

      // 4. Return the streaming response.
      return response;
    } catch (error) {
      // If an error occurs before the stream is returned, we must clean up immediately.
      if (server || transport) {
        this.cleanup(server, transport, opContext);
      }
      throw ErrorHandler.handleError(error, {
        operation: 'StatelessTransportManager.handleRequest',
        context: opContext,
        rethrow: true,
      });
    }
  }

  /**
   * Attaches listeners to the response stream to trigger resource cleanup
   * only after the stream has been fully consumed or has errored.
   *
   * @param stream - The response stream.
   * @param server - The ephemeral McpServer instance.
   * @param transport - The ephemeral transport instance.
   * @param context - The request context for logging.
   */
  private setupDeferredCleanup(
    stream: ReadableStream<Uint8Array>,
    server: McpServer,
    transport: StreamableHTTPServerTransport,
    context: RequestContext,
  ): void {
    let cleanedUp = false;
    const cleanupFn = (error?: Error) => {
      if (cleanedUp) return;
      cleanedUp = true;

      if (error) {
        logger.warning('Stream ended with an error, proceeding to cleanup.', {
          ...context,
          error: error.message,
        });
      }
      // Cleanup is fire-and-forget.
      this.cleanup(server, transport, context);
    };

    // Use a reader to reliably detect stream closure/error
    const reader = stream.getReader();
    const processStream = async () => {
      try {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } catch (err) {
        cleanupFn(err instanceof Error ? err : new Error(String(err)));
      } finally {
        cleanupFn();
        reader.releaseLock();
      }
    };

    void processStream();
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
      operation: 'StatelessTransportManager.cleanup',
    };
    logger.debug('Scheduling cleanup for ephemeral resources.', opContext);

    void Promise.all([transport?.close(), server?.close()])
      .then(() => {
        logger.debug('Ephemeral resources cleaned up successfully.', opContext);
      })
      .catch((cleanupError) => {
        logger.warning('Error during stateless resource cleanup.', {
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
      operation: 'StatelessTransportManager.shutdown',
    });
    logger.info(
      'Stateless transport manager shutdown - no persistent resources to clean up.',
      context,
    );
    return Promise.resolve();
  }
}
