/**
 * @fileoverview Stateful Transport Manager implementation for MCP SDK.
 * This manager handles multiple, persistent sessions, creating a dedicated
 * McpServer and StreamableHTTPServerTransport instance for each one.
 * @module src/mcp-server/transports/core/statefulTransportManager
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { IncomingMessage, ServerResponse } from "http";
import { randomUUID } from "node:crypto";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, RequestContext } from "../../../utils/index.js";
import { BaseTransportManager } from "./baseTransportManager.js";
import {
  HttpStatusCode,
  StatefulTransportManager as IStatefulTransportManager,
  TransportResponse,
  TransportSession,
} from "./transportTypes.js";

/**
 * Stateful Transport Manager that handles MCP SDK integration and session management.
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

  constructor(createServerInstanceFn: () => Promise<McpServer>) {
    super(createServerInstanceFn);
    this.garbageCollector = setInterval(
      () => this.cleanupStaleSessions(),
      60 * 1000,
    );
  }

  async initializeAndHandle(
    req: IncomingMessage,
    res: ServerResponse,
    body: unknown,
    context: RequestContext,
  ): Promise<ServerResponse> {
    const server = await this.createServerInstanceFn();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        this.transports.set(sessionId, transport);
        this.servers.set(sessionId, server);
        this.sessions.set(sessionId, {
          id: sessionId,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
        });
        logger.info(`MCP Session created: ${sessionId}`, {
          ...context,
          sessionId,
        });
      },
    });

    transport.onclose = () => {
      const sessionId = transport.sessionId;
      if (sessionId) {
        this.closeSession(sessionId, {
          requestId: `transport-close-${sessionId}`,
          timestamp: new Date().toISOString(),
        }).catch((err) =>
          logger.error(
            `Error during transport.onclose cleanup for session ${sessionId}`,
            err,
          ),
        );
      }
    };

    await server.connect(transport);
    await transport.handleRequest(req, res, body);
    return res;
  }

  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    body: unknown,
    context: RequestContext,
    sessionId?: string,
  ): Promise<void> {
    if (!sessionId) {
      throw new McpError(
        BaseErrorCode.INVALID_INPUT,
        "Session ID is required for stateful requests.",
        context,
      );
    }
    const sessionContext = { ...context, sessionId };
    const transport = this.transports.get(sessionId);
    if (!transport) {
      logger.warning(
        `Request for non-existent session: ${sessionId}`,
        sessionContext,
      );
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32601, message: "Session not found" },
        }),
      );
      return;
    }

    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessedAt = new Date();
    }

    logger.debug(`Handling request for session: ${sessionId}`, {
      ...sessionContext,
      method: req.method,
    });

    // Delegate the raw request and response objects, and the body, to the SDK transport.
    await transport.handleRequest(req, res, body);
  }

  async handleDeleteRequest(
    sessionId: string,
    context: RequestContext,
  ): Promise<TransportResponse> {
    const sessionContext = { ...context, sessionId };
    const transport = this.transports.get(sessionId);
    if (!transport) {
      throw new McpError(
        BaseErrorCode.NOT_FOUND,
        "Session not found or expired.",
        sessionContext,
      );
    }

    await this.closeSession(sessionId, sessionContext);

    const headers = new Headers();
    headers.set("Content-Type", "application/json");

    return {
      headers,
      statusCode: 200 as HttpStatusCode,
      body: { status: "session_closed", sessionId },
    };
  }

  getSession(sessionId: string): TransportSession | undefined {
    return this.sessions.get(sessionId);
  }

  async shutdown(): Promise<void> {
    clearInterval(this.garbageCollector); // Stop the garbage collector
    const closePromises = Array.from(this.transports.keys()).map((sessionId) =>
      this.closeSession(sessionId, {
        requestId: "shutdown",
        timestamp: new Date().toISOString(),
      }),
    );

    await Promise.all(closePromises);
    this.transports.clear();
    this.sessions.clear();
    this.servers.clear();
  }

  /**
   * Helper method to close a specific session.
   */
  private async closeSession(
    sessionId: string,
    context: RequestContext,
  ): Promise<void> {
    const transport = this.transports.get(sessionId);
    const server = this.servers.get(sessionId); // Get the server instance

    // Close transport and server if they exist
    if (transport) {
      await transport.close();
    }
    if (server) {
      await server.close(); // Also close the McpServer instance
    }

    // Clean up all maps
    this.transports.delete(sessionId);
    this.servers.delete(sessionId);
    this.sessions.delete(sessionId);

    logger.info(`MCP Session closed: ${sessionId}`, {
      ...context,
      sessionId,
    });
  }

  /**
   * Periodically scans for and cleans up stale sessions to prevent memory leaks.
   */
  private async cleanupStaleSessions() {
    const now = Date.now();
    const STALE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    const context: RequestContext = {
      requestId: `cleanup-${randomUUID()}`,
      timestamp: new Date().toISOString(),
    };

    logger.debug("Running stale session cleanup...", { ...context });

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt.getTime() > STALE_TIMEOUT_MS) {
        logger.info(`Closing stale session: ${sessionId}`, {
          ...context,
          sessionId,
          lastAccessed: session.lastAccessedAt.toISOString(),
        });
        await this.closeSession(sessionId, context);
      }
    }
  }
}
