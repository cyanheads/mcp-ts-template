/**
 * @fileoverview Implements a stateful transport manager for the MCP SDK.
 *
 * This manager handles multiple, persistent MCP sessions. It creates and maintains
 * a dedicated McpServer and StreamableHTTPServerTransport instance for each session,
 * allowing for stateful, multi-turn interactions. It includes robust mechanisms for
 * session lifecycle management, including garbage collection of stale sessions and
 * concurrency controls to prevent race conditions.
 *
 * SCALABILITY NOTE: This manager maintains all session state in local process memory.
 * For horizontal scaling across multiple server instances, a load balancer with
 * sticky sessions (session affinity) is required to ensure that all requests for a
 * given session are routed to the same process instance that holds that session's state.
 *
 * @module src/mcp-server/transports/core/statefulTransportManager
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingHttpHeaders } from 'http';
import { randomUUID } from 'node:crypto';

import { JsonRpcErrorCode, McpError } from '../../../types-global/errors.js';
import {
  ErrorHandler,
  RequestContext,
  logger,
  requestContextService,
} from '../../../utils/index.js';
import { BaseTransportManager } from './baseTransportManager.js';
import {
  HttpStatusCode,
  StatefulTransportManager as IStatefulTransportManager,
  TransportResponse,
  TransportSession,
} from './transportTypes.js';

/**
 * Defines the configuration options for the StatefulTransportManager.
 */
export interface StatefulTransportOptions {
  staleSessionTimeoutMs: number;
  mcpHttpEndpointPath: string;
}

/**
 * Manages persistent, stateful MCP sessions.
 */
export class StatefulTransportManager
  extends BaseTransportManager
  implements IStatefulTransportManager
{
  private readonly transports = new Map<
    string,
    StreamableHTTPServerTransport
  >();
  private readonly servers = new Map<string, McpServer>();
  private readonly sessions = new Map<string, TransportSession>();
  private readonly garbageCollector: NodeJS.Timeout;
  private readonly options: StatefulTransportOptions;
  private readonly mode: 'stateful' | 'auto';

  /**
   * @param createServerInstanceFn - A factory function to create new McpServer instances.
   * @param options - Configuration options for the manager.
   */
  constructor(
    createServerInstanceFn: () => Promise<McpServer>,
    options: StatefulTransportOptions,
    mode: 'stateful' | 'auto' = 'auto',
  ) {
    super(createServerInstanceFn);
    this.options = options;
    this.mode = mode;
    const context = requestContextService.createRequestContext({
      operation: 'StatefulTransportManager.constructor',
    });
    logger.info('Starting session garbage collector.', context);
    this.garbageCollector = setInterval(
      () => this.cleanupStaleSessions(),
      this.options.staleSessionTimeoutMs,
    );
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

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          const sessionContext = { ...opContext, sessionId };
          this.transports.set(sessionId, transport!);
          this.servers.set(sessionId, currentServer);
          this.sessions.set(sessionId, {
            id: sessionId,
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            activeRequests: 0,
          });
          logger.info(`MCP Session created: ${sessionId}`, sessionContext);
        },
      });

      transport.onclose = () => {
        const sessionId = transport!.sessionId;
        if (sessionId) {
          const closeContext = { ...opContext, sessionId };
          this.closeSession(sessionId, closeContext).catch((err) =>
            logger.error(
              `Error during transport.onclose cleanup for session ${sessionId}`,
              err,
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
        (async () => {
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

    const transport = this.transports.get(sessionId);
    const session = this.sessions.get(sessionId);

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

    session.lastAccessedAt = new Date();
    session.activeRequests += 1;
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
      session.activeRequests -= 1;
      session.lastAccessedAt = new Date();
      logger.debug(
        `Decremented activeRequests for session ${sessionId}. Count: ${session.activeRequests}`,
        sessionContext,
      );
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
   * Retrieves information about a specific session.
   */
  getSession(sessionId: string): TransportSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Returns the configured session mode of the manager.
   */
  getMode(): 'stateful' | 'auto' {
    return this.mode;
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
    this.sessions.clear();
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

    await ErrorHandler.tryCatch(
      async () => {
        if (transport) await transport.close();
        if (server) await server.close();
      },
      { operation: 'closeSession.cleanup', context: sessionContext },
    );

    this.transports.delete(sessionId);
    this.servers.delete(sessionId);
    this.sessions.delete(sessionId);

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

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt.getTime() > STALE_TIMEOUT_MS) {
        if (session.activeRequests > 0) {
          logger.info(
            `Session ${sessionId} is stale but has ${session.activeRequests} active requests. Skipping cleanup.`,
            { ...context, sessionId },
          );
          continue;
        }
        staleSessionIds.push(sessionId);
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
            err,
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
