/**
 * @fileoverview Implements a stateful transport manager for the MCP SDK.
 *
 * This manager handles multiple, persistent MCP sessions. It creates and maintains
 * a dedicated McpServer and StreamableHTTPServerTransport instance for each session,
 * allowing for stateful, multi-turn interactions. It includes robust mechanisms for
 * session lifecycle management, including garbage collection of stale sessions and
 * concurrency controls to prevent race conditions.
 *
 * SCALABILITY NOTE: This manager uses a distributed storage backend for session
 * state, allowing for horizontal scaling across multiple server instances.
 *
 * @module src/mcp-server/transports/core/statefulTransportManager
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingHttpHeaders } from 'http';
import type { ReadableStream } from 'node:stream/web';
import { randomUUID } from 'node:crypto';
import { inject, injectable } from 'tsyringe';

import { CreateMcpServerInstance } from '@/container/index.js';
import type { IStorageProvider } from '@/storage/index.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import {
  ErrorHandler,
  type RequestContext,
  logger,
  requestContextService,
} from '@/utils/index.js';
import { BaseTransportManager } from '@/mcp-server/transports/core/baseTransportManager.js';
import type {
  HttpStatusCode,
  IStatefulTransportManager,
  TransportResponse,
  TransportSession,
} from '@/mcp-server/transports/core/transportTypes.js';

/**
 * Defines the configuration options for the StatefulTransportManager.
 */
export interface StatefulTransportManagerOptions {
  staleSessionTimeoutMs: number;
  mcpHttpEndpointPath: string;
}

// Define a key prefix for session storage to avoid collisions.
const SESSION_STORAGE_PREFIX = 'mcp_session:';

/**
 * Manages persistent, stateful MCP sessions.
 */
@injectable()
export class StatefulTransportManager
  extends BaseTransportManager
  implements IStatefulTransportManager
{
  private readonly garbageCollector: NodeJS.Timeout;

  /**
   * @param storageProvider - The storage provider for distributed session management.
   * @param createServerInstanceFn - A factory function to create new McpServer instances.
   * @param options - Configuration options for the manager.
   */
  constructor(
    private storageProvider: IStorageProvider,
    @inject(CreateMcpServerInstance)
    createServerInstanceFn: () => Promise<McpServer>,
    private options: StatefulTransportManagerOptions,
  ) {
    super(createServerInstanceFn);
    const context = requestContextService.createRequestContext({
      operation: 'StatefulTransportManager.constructor',
    });
    logger.info('Starting session garbage collector.', context);
    this.garbageCollector = setInterval(() => {
      void this.cleanupStaleSessions();
    }, this.options.staleSessionTimeoutMs);
  }

  private getTenantId(context: RequestContext): string {
    return context.auth?.sub ?? 'default-tenant';
  }

  private getSessionKey(tenantId: string, sessionId: string): string {
    return `tenant:${tenantId}/${SESSION_STORAGE_PREFIX}${sessionId}`;
  }

  /**
   * Initializes a new stateful session and handles the first request.
   * The server and transport instances are ephemeral and exist only for this request.
   */
  async initializeAndHandle(
    headers: IncomingHttpHeaders,
    body: unknown,
    context: RequestContext,
  ): Promise<TransportResponse> {
    const opContext = requestContextService.createRequestContext({
      parentContext: context,
      operation: 'StatefulTransportManager.initializeAndHandle',
    });
    logger.debug('Initializing new stateful session.', opContext);

    const server = await this.createServerInstanceFn();
    const tenantId = this.getTenantId(opContext);
    let transport: StreamableHTTPServerTransport | undefined;

    try {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: async (sessionId) => {
          const sessionContext = { ...opContext, sessionId, tenantId };
          const session: TransportSession = {
            id: sessionId,
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            activeRequests: 0,
          };
          const sessionKey = this.getSessionKey(tenantId, sessionId);
          await this.storageProvider.set(sessionKey, session, sessionContext, {
            ttl: this.options.staleSessionTimeoutMs / 1000 + 60,
          });
          logger.info(
            `MCP Session created and stored: ${sessionId}`,
            sessionContext,
          );
        },
      });

      await server.connect(transport);

      const response = await this._processRequestWithBridge(
        transport,
        headers,
        body,
        this.options.mcpHttpEndpointPath,
      );

      // Since this is a self-contained operation, ensure cleanup.
      // We can adapt the deferred cleanup logic from StatelessTransportManager.
      if (response.type === 'stream') {
        this.setupDeferredCleanup(
          response.stream,
          server,
          transport,
          opContext,
        );
      } else {
        // For buffered responses, cleanup can happen immediately.
        await transport.close();
        await server.close();
      }

      return response;
    } catch (error) {
      // Cleanup on error
      if (transport)
        await transport
          .close()
          .catch((e) =>
            logger.error(
              'Error closing transport on failure',
              e as Error,
              opContext,
            ),
          );
      if (server)
        await server
          .close()
          .catch((e) =>
            logger.error(
              'Error closing server on failure',
              e as Error,
              opContext,
            ),
          );

      throw ErrorHandler.handleError(error, {
        operation: opContext.operation as string,
        context: opContext,
        rethrow: true,
      });
    }
  }

  /**
   * Handles a subsequent request for an existing stateful session.
   */
  async handleRequest(
    headers: IncomingHttpHeaders,
    body: unknown,
    context: RequestContext,
    sessionId?: string,
  ): Promise<TransportResponse> {
    if (!sessionId) {
      throw new McpError(
        JsonRpcErrorCode.InvalidRequest,
        'Session ID is required for stateful requests.',
        context,
      );
    }
    const sessionContext = requestContextService.createRequestContext({
      parentContext: context,
      operation: 'StatefulTransportManager.handleRequest',
      additionalContext: { sessionId },
    });

    // 1. Validate session existence and update timestamp
    const tenantId = this.getTenantId(sessionContext);
    const sessionKey = this.getSessionKey(tenantId, sessionId);
    const session = await this.storageProvider.get<TransportSession>(
      sessionKey,
      sessionContext,
    );

    if (!session) {
      logger.warning(
        `Request for non-existent session: ${sessionId}`,
        sessionContext,
      );
      return {
        type: 'buffered',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        statusCode: 404,
        body: {
          jsonrpc: '2.0',
          error: { code: -32601, message: 'Session not found' },
        },
      };
    }

    // Update lastAccessedAt
    session.lastAccessedAt = new Date();
    await this.storageProvider.set(sessionKey, session, sessionContext);

    // 2. Create ephemeral server and transport for this request
    const server = await this.createServerInstanceFn();
    const transport = new StreamableHTTPServerTransport({
      // IMPORTANT: We must re-use the existing session ID
      sessionIdGenerator: () => sessionId,
      onsessioninitialized: () => {}, // No-op as session is already initialized
    });

    try {
      await server.connect(transport);

      const response = await this._processRequestWithBridge(
        transport,
        headers,
        body,
        this.options.mcpHttpEndpointPath,
      );

      // Use the same deferred cleanup pattern
      if (response.type === 'stream') {
        this.setupDeferredCleanup(
          response.stream,
          server,
          transport,
          sessionContext,
        );
      } else {
        await transport.close();
        await server.close();
      }

      return response;
    } catch (error) {
      // Cleanup on error
      await transport
        .close()
        .catch((e) =>
          logger.error(
            'Error closing transport on failure',
            e as Error,
            sessionContext,
          ),
        );
      await server
        .close()
        .catch((e) =>
          logger.error(
            'Error closing server on failure',
            e as Error,
            sessionContext,
          ),
        );
      throw ErrorHandler.handleError(error, {
        operation: sessionContext.operation as string,
        context: sessionContext,
        rethrow: true,
      });
    }
  }

  /**
   * Handles a request to explicitly delete a session from storage.
   */
  async handleDeleteRequest(
    sessionId: string,
    context: RequestContext,
  ): Promise<TransportResponse> {
    const sessionContext = requestContextService.createRequestContext({
      parentContext: context,
      operation: 'StatefulTransportManager.handleDeleteRequest',
      additionalContext: { sessionId },
    });
    logger.info(`Attempting to delete session: ${sessionId}`, sessionContext);

    const tenantId = this.getTenantId(sessionContext);
    const sessionKey = this.getSessionKey(tenantId, sessionId);
    const deleted = await this.storageProvider.delete(
      sessionKey,
      sessionContext,
    );

    if (!deleted) {
      logger.warning(
        `Attempted to delete non-existent session: ${sessionId}`,
        sessionContext,
      );
      throw new McpError(
        JsonRpcErrorCode.NotFound,
        'Session not found or expired.',
        sessionContext,
      );
    }

    return {
      type: 'buffered',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      statusCode: 200 as HttpStatusCode,
      body: { status: 'session_closed', sessionId },
    };
  }

  /**
   * Returns the configured session mode of the manager.
   */
  getMode(): 'stateful' | 'auto' {
    return 'stateful';
  }

  /**
   * Gracefully shuts down the manager.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async shutdown(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'StatefulTransportManager.shutdown',
    });
    logger.info('Shutting down stateful transport manager...', context);
    clearInterval(this.garbageCollector);
    logger.debug('Garbage collector stopped.', context);
    logger.info(
      'Stateful manager shut down. Session cleanup is handled by storage provider TTLs.',
      context,
    );
  }

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

  private cleanup(
    server: McpServer | undefined,
    transport: StreamableHTTPServerTransport | undefined,
    context: RequestContext,
  ): void {
    const opContext = {
      ...context,
      operation: 'StatefulTransportManager.cleanup',
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
   * Periodically runs to find and clean up stale, inactive sessions.
   */
  private async cleanupStaleSessions(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'StatefulTransportManager.cleanupStaleSessions',
    });
    logger.debug('Running stale session cleanup...', context);

    // This method is now simpler: it just deletes expired records from storage.
    // The actual complexity depends on the IStorageProvider implementation.
    // For a provider with native TTL support (like Redis), this might be a no-op.
    // For others, it might involve listing keys and checking expiry.

    // We assume the storageProvider's 'delete' and 'get' handle expiration logic,
    // or that a separate process cleans up expired records.
    // For providers without built-in TTL, we iterate and check.

    const now = Date.now();
    const STALE_TIMEOUT_MS = this.options.staleSessionTimeoutMs;
    let checkedCount = 0;
    let deletedCount = 0;

    // This is a simplification. A real multi-tenant cleanup would need a way
    // to list all tenants or have a centralized list of all active sessions.
    const allSessionKeys = await this.storageProvider.list(
      SESSION_STORAGE_PREFIX,
      context,
    );

    for (const key of allSessionKeys) {
      checkedCount++;
      const session = await this.storageProvider.get<TransportSession>(
        key,
        context,
      );
      if (session) {
        const isStale =
          now - new Date(session.lastAccessedAt).getTime() > STALE_TIMEOUT_MS;
        if (isStale) {
          if (session.activeRequests > 0) {
            logger.info(
              `Session ${session.id} is stale but has active requests. Skipping.`,
              { ...context, sessionId: session.id },
            );
            continue;
          }
          await this.storageProvider.delete(key, context);
          deletedCount++;
          logger.info(`Deleted stale session: ${session.id}`, {
            ...context,
            sessionId: session.id,
          });
        }
      }
    }

    if (checkedCount > 0) {
      logger.info(
        `Stale session cleanup complete. Checked ${checkedCount} keys, deleted ${deletedCount} sessions.`,
        context,
      );
    } else {
      logger.debug('No sessions found to cleanup.', context);
    }
  }
}
