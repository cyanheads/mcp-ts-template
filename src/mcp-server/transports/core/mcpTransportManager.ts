/**
 * @fileoverview MCP Transport Manager implementation using the MCP SDK.
 * @module src/mcp-server/transports/core/mcpTransportManager
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "http";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { logger, RequestContext } from "../../../utils/index.js";
import {
  HttpStatusCode,
  TransportManager,
  TransportResponse,
  TransportSession,
} from "./transportTypes.js";

/**
 * MCP Transport Manager that handles MCP SDK integration and session management.
 */
export class McpTransportManager implements TransportManager {
  private readonly transports = new Map<
    string,
    StreamableHTTPServerTransport
  >();
  private readonly sessions = new Map<string, TransportSession>();
  private readonly createServerInstanceFn: () => Promise<McpServer>;

  constructor(createServerInstanceFn: () => Promise<McpServer>) {
    this.createServerInstanceFn = createServerInstanceFn;
  }

  async initializeSession(
    body: unknown,
    context: RequestContext,
  ): Promise<TransportResponse> {
    if (!isInitializeRequest(body)) {
      throw new McpError(
        BaseErrorCode.INVALID_INPUT,
        "Request body is not a valid initialize request",
      );
    }

    // Clean up any existing session for re-initialization
    const existingSessionId = this.findExistingSessionForReinit();
    if (existingSessionId) {
      await this.closeSession(existingSessionId, context);
    }

    // Create new transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        this.transports.set(sessionId, transport);
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
        this.transports.delete(sessionId);
        this.sessions.delete(sessionId);
        logger.info(`MCP Session closed: ${sessionId}`, {
          ...context,
          sessionId,
        });
      }
    };

    // Connect the MCP server to the transport
    const server = await this.createServerInstanceFn();
    await server.connect(transport);

    // Return initialization response
    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    if (transport.sessionId) {
      headers.set(
        "Set-Cookie",
        `mcp-session-id=${transport.sessionId}; HttpOnly`,
      );
    }

    return {
      sessionId: transport.sessionId || undefined,
      headers,
      statusCode: 200 as HttpStatusCode,
      body: { status: "initialized", sessionId: transport.sessionId },
    };
  }

  async handleRequest(
    sessionId: string,
    req: IncomingMessage,
    res: ServerResponse,
    context: RequestContext,
    body?: unknown,
  ): Promise<void> {
    const transport = this.transports.get(sessionId);
    if (!transport) {
      logger.warning(`Request for non-existent session: ${sessionId}`, {
        ...context,
      });
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
      ...context,
      method: req.method,
    });

    // Delegate the raw request and response objects, and the body, to the SDK transport.
    await transport.handleRequest(req, res, body);
  }

  async handleDeleteRequest(
    sessionId: string,
    context: RequestContext,
  ): Promise<TransportResponse> {
    const transport = this.transports.get(sessionId);
    if (!transport) {
      throw new McpError(
        BaseErrorCode.NOT_FOUND,
        "Session not found or expired.",
      );
    }

    await this.closeSession(sessionId, context);

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
    const closePromises = Array.from(this.transports.keys()).map((sessionId) =>
      this.closeSession(sessionId, {
        requestId: "shutdown",
        timestamp: new Date().toISOString(),
      }),
    );

    await Promise.all(closePromises);
    this.transports.clear();
    this.sessions.clear();
  }

  /**
   * Helper method to close a specific session.
   */
  private async closeSession(
    sessionId: string,
    context: RequestContext,
  ): Promise<void> {
    const transport = this.transports.get(sessionId);
    if (transport) {
      await transport.close();
      this.transports.delete(sessionId);
      this.sessions.delete(sessionId);
      logger.info(`MCP Session closed: ${sessionId}`, {
        ...context,
        sessionId,
      });
    }
  }

  /**
   * Find existing session that should be closed for re-initialization.
   * This is a simplified implementation - in reality you might want more
   * sophisticated session management.
   */
  private findExistingSessionForReinit(): string | undefined {
    // For simplicity, we'll just close the most recent session
    // In a more sophisticated implementation, you might track by client IP, auth, etc.
    const sessions = Array.from(this.sessions.values());
    if (sessions.length > 0) {
      const mostRecent = sessions.reduce((latest, session) =>
        session.lastAccessedAt > latest.lastAccessedAt ? session : latest,
      );
      return mostRecent.id;
    }
    return undefined;
  }
}
