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
import { randomUUID } from 'node:crypto';
import { inject, injectable } from 'tsyringe';

import { CreateMcpServerInstance } from '../../../container/index.js';
import type { IStorageProvider } from '../../../storage/index.js';
import { JsonRpcErrorCode, McpError } from '../../../types-global/errors.js';
import {
  ErrorHandler,
  RequestContext,
  logger,
  requestContextService,
} from '../../../utils/index.js';
import { BaseTransportManager } from './baseTransportManager.js';
import type {
  HttpStatusCode,
  IStatefulTransportManager,
  TransportResponse,
  TransportSession,
} from './transportTypes.js';

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
  private readonly transports = new Map<
    string,
    StreamableHTTPServerTransport
  >();
  private readonly servers = new Map<string, McpServer>();
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
   *
   * @param headers - The incoming request headers.
   * @param body - The parsed body of the request.
   * @param context - The request context.
   * @returns A promise resolving to a streaming TransportResponse with a session ID.
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

    let server: McpServer | undefined;
    let transport: StreamableHTTPServerTransport | undefined;

    try {
      server = await this.createServerInstanceFn();
      const currentServer = server;
      const tenantId = this.getTenantId(opContext);

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: async (sessionId) => {
          const sessionContext = { ...opContext, sessionId, tenantId };
          this.transports.set(sessionId, transport!);
          this.servers.set(sessionId, currentServer);

          // CREATE and STORE the session object in the storage provider
          const session: TransportSession = {
            id: sessionId,
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            activeRequests: 0,
          };
          const sessionKey = this.getSessionKey(tenantId, sessionId);
          await this.storageProvider.set(
            sessionKey,
            session,
            sessionContext,
            { ttl: this.options.staleSessionTimeoutMs / 1000 + 60 }, // Add a buffer
          );

          logger.info(
            `MCP Session created and stored: ${sessionId}`,
            sessionContext,
          );
        },
      });

      transport.onclose = () => {
        const sessionId = transport!.sessionId;
        if (sessionId) {
          const closeContext = { ...opContext, sessionId };
          this.closeSession(sessionId, closeContext).catch((err) =>
            logger.error(
              `Error during transport.onclose cleanup for session ${sessionId}`,
              err instanceof Error ? err : new Error(String(err)),
              closeContext,
            ),
          );
        }
      };

      await server.connect(transport);
      logger.debug('Server connected, handling initial request.', opContext);

      return await this._processRequestWithBridge(
        transport,
        headers,
        body,
        this.options.mcpHttpEndpointPath,
      );
    } catch (error) {
      const logContext = { ...opContext, error: String(error) };
      if (error instanceof Error) {
        logger.error(
          'Failed to initialize stateful session. Cleaning up orphaned resources.',
          error,
          logContext,
        );
      } else {
        logger.error(
          'Failed to initialize stateful session with non-error object. Cleaning up orphaned resources.',
          logContext,
        );
      }

      const sessionInitialized =
        transport?.sessionId && this.transports.has(transport.sessionId);
      if (!sessionInitialized) {
        void (async () => {
          await ErrorHandler.tryCatch(
            async () => {
              if (transport) await transport.close();
              if (server) await server.close();
            },
            {
              operation: 'initializeAndHandle.cleanupOrphaned',
              context: opContext,
            },
          );
        })();
      }
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

    const tenantId = this.getTenantId(sessionContext);
    const sessionKey = this.getSessionKey(tenantId, sessionId);
    const transport = this.transports.get(sessionId);
    // FETCH the session from storage instead of the in-memory map
    const session = await this.storageProvider.get<TransportSession>(
      sessionKey,
      sessionContext,
    );

    if (!transport || !session) {
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

    // UPDATE session atomically
    session.lastAccessedAt = new Date();
    session.activeRequests += 1;
    await this.storageProvider.set(sessionKey, session, sessionContext);

    logger.debug(
      `Incremented activeRequests for session ${sessionId}. Count: ${session.activeRequests}`,
      sessionContext,
    );

    try {
      return await this._processRequestWithBridge(
        transport,
        headers,
        body,
        this.options.mcpHttpEndpointPath,
      );
    } catch (error) {
      throw ErrorHandler.handleError(error, {
        operation: sessionContext.operation as string,
        context: sessionContext,
        rethrow: true,
      });
    } finally {
      // Decrement and save again
      // Re-fetch the session to avoid race conditions if another request modified it.
      const finalSession = await this.storageProvider.get<TransportSession>(
        sessionKey,
        sessionContext,
      );
      if (finalSession) {
        finalSession.activeRequests -= 1;
        finalSession.lastAccessedAt = new Date();
        await this.storageProvider.set(
          sessionKey,
          finalSession,
          sessionContext,
        );
        logger.debug(
          `Decremented activeRequests for session ${sessionId}. Count: ${finalSession.activeRequests}`,
          sessionContext,
        );
      }
    }
  }

  /**
   * Handles a request to explicitly delete a session.
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

    if (!this.transports.has(sessionId)) {
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

    await this.closeSession(sessionId, sessionContext);

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
   * Gracefully shuts down the manager, closing all active sessions.
   */
  async shutdown(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'StatefulTransportManager.shutdown',
    });
    logger.info('Shutting down stateful transport manager...', context);
    clearInterval(this.garbageCollector);
    logger.debug('Garbage collector stopped.', context);

    const sessionIds = Array.from(this.transports.keys());
    if (sessionIds.length > 0) {
      logger.info(`Closing ${sessionIds.length} active sessions.`, context);
      const closePromises = sessionIds.map((sessionId) =>
        this.closeSession(sessionId, context),
      );
      await Promise.all(closePromises);
    }

    this.transports.clear();
    this.servers.clear();
    logger.info('All active sessions closed and manager shut down.', context);
  }

  /**
   * Closes a single session and releases its associated resources.
   */
  private async closeSession(
    sessionId: string,
    context: RequestContext,
  ): Promise<void> {
    const sessionContext = requestContextService.createRequestContext({
      parentContext: context,
      operation: 'StatefulTransportManager.closeSession',
      additionalContext: { sessionId },
    });
    logger.debug(`Closing session: ${sessionId}`, sessionContext);

    const transport = this.transports.get(sessionId);
    const server = this.servers.get(sessionId);
    const tenantId = this.getTenantId(sessionContext);
    const sessionKey = this.getSessionKey(tenantId, sessionId);

    await ErrorHandler.tryCatch(
      async () => {
        if (transport) await transport.close();
        if (server) await server.close();
      },
      { operation: 'closeSession.cleanup', context: sessionContext },
    );

    this.transports.delete(sessionId);
    this.servers.delete(sessionId);
    // DELETE the session from the storage provider
    await this.storageProvider.delete(sessionKey, sessionContext);

    logger.info(
      `MCP Session closed and resources released: ${sessionId}`,
      sessionContext,
    );
  }

  /**
   * Periodically runs to find and clean up stale, inactive sessions.
   */
  private async cleanupStaleSessions(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'StatefulTransportManager.cleanupStaleSessions',
    });
    logger.debug('Running stale session cleanup...', context);

    const now = Date.now();
    const STALE_TIMEOUT_MS = this.options.staleSessionTimeoutMs;
    const staleSessionIds: string[] = [];

    // This is a simplification. A real multi-tenant cleanup would need a way
    // to list all tenants or have a centralized list of all active sessions.
    // For this template, we'll assume cleanup operates on a known tenant,
    // or that list() can handle prefix matching across tenants.
    const tenantId = this.getTenantId(context);
    const sessionKeys = await this.storageProvider.list(
      `tenant:${tenantId}/${SESSION_STORAGE_PREFIX}`,
      context,
    );

    for (const key of sessionKeys) {
      const session = await this.storageProvider.get<TransportSession>(
        key,
        context,
      );
      if (
        session &&
        now - new Date(session.lastAccessedAt).getTime() > STALE_TIMEOUT_MS
      ) {
        if (session.activeRequests > 0) {
          logger.info(
            `Session ${session.id} is stale but has ${session.activeRequests} active requests. Skipping cleanup.`,
            { ...context, sessionId: session.id },
          );
          continue;
        }
        staleSessionIds.push(session.id);
      }
    }

    if (staleSessionIds.length > 0) {
      logger.info(
        `Found ${staleSessionIds.length} stale sessions. Closing concurrently.`,
        context,
      );
      const closePromises = staleSessionIds.map((sessionId) =>
        this.closeSession(sessionId, context).catch((err) => {
          logger.error(
            `Error during concurrent stale session cleanup for ${sessionId}`,
            err instanceof Error ? err : new Error(String(err)),
            { ...context, sessionId },
          );
        }),
      );
      await Promise.all(closePromises);
      logger.info(
        `Stale session cleanup complete. Closed ${staleSessionIds.length} sessions.`,
        context,
      );
    } else {
      logger.debug('No stale sessions found.', context);
    }
  }
}
