/**
 * @fileoverview Configures and starts the HTTP MCP transport using Hono with clean architecture.
 * This module integrates a TransportManager abstraction with Hono HTTP routing, providing:
 * - Clean separation between HTTP concerns and MCP transport logic
 * - Testable HTTP routes through dependency injection
 * - Configurable middleware for CORS, rate limiting, and authentication
 * - Session management abstraction with support for both stateless and stateful modes
 * - Port-binding logic with automatic retry on conflicts
 *
 * The MCP transport implementation is handled through the TransportManager interface,
 * allowing for different implementations (stateless, stateful, or auto-detection).
 *
 * Session Mode Configuration:
 * - 'stateless': All requests are handled without session persistence
 * - 'stateful': All requests require session IDs and maintain state
 * - 'auto': Client decides mode by including/omitting Mcp-Session-Id header
 *
 * Specification Reference:
 * https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/transports.mdx#streamable-http
 * @module src/mcp-server/transports/httpTransport
 */

import { serve, ServerType } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { Context, Hono, Next } from "hono";
import { cors } from "hono/cors";
import http from "http";
import { config } from "../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  logger,
  rateLimiter,
  RequestContext,
  requestContextService,
} from "../../../utils/index.js";
import { createAuthMiddleware, createAuthStrategy } from "../auth/index.js";
import { StatefulTransportManager } from "../core/statefulTransportManager.js";
import { StatelessTransportManager } from "../core/statelessTransportManager.js";
import { TransportManager } from "../core/transportTypes.js";
import { httpErrorHandler } from "./httpErrorHandler.js";
import { HonoNodeBindings } from "./httpTypes.js";

const HTTP_PORT = config.mcpHttpPort;
const HTTP_HOST = config.mcpHttpHost;
const MCP_ENDPOINT_PATH = "/mcp";
const MAX_PORT_RETRIES = 15;

async function isPortInUse(
  port: number,
  host: string,
  _parentContext: RequestContext,
): Promise<boolean> {
  return new Promise((resolve) => {
    const tempServer = http.createServer();
    tempServer
      .once("error", (err: NodeJS.ErrnoException) => {
        resolve(err.code === "EADDRINUSE");
      })
      .once("listening", () => {
        tempServer.close(() => resolve(false));
      })
      .listen(port, host);
  });
}

function startHttpServerWithRetry(
  app: Hono<{ Bindings: HonoNodeBindings }>,
  initialPort: number,
  host: string,
  maxRetries: number,
  parentContext: RequestContext,
): Promise<ServerType> {
  const startContext = requestContextService.createRequestContext({
    ...parentContext,
    operation: "startHttpServerWithRetry",
  });

  return new Promise((resolve, reject) => {
    const tryBind = (port: number, attempt: number) => {
      if (attempt > maxRetries + 1) {
        reject(new Error("Failed to bind to any port after multiple retries."));
        return;
      }

      const attemptContext = { ...startContext, port, attempt };

      isPortInUse(port, host, attemptContext)
        .then((inUse) => {
          if (inUse) {
            logger.warning(
              `Port ${port} is in use, retrying...`,
              attemptContext,
            );
            setTimeout(() => tryBind(port + 1, attempt + 1), 50); // Small delay
            return;
          }

          try {
            const serverInstance = serve(
              { fetch: app.fetch, port, hostname: host },
              (info: { address: string; port: number }) => {
                const serverAddress = `http://${info.address}:${info.port}${MCP_ENDPOINT_PATH}`;
                logger.info(`HTTP transport listening at ${serverAddress}`, {
                  ...attemptContext,
                  address: serverAddress,
                  sessionMode: config.mcpSessionMode,
                });
                if (process.stdout.isTTY) {
                  console.log(`\n🚀 MCP Server running at: ${serverAddress}`);
                  console.log(`   Session Mode: ${config.mcpSessionMode}\n`);
                }
              },
            );
            resolve(serverInstance);
          } catch (err: unknown) {
            if (
              err &&
              typeof err === "object" &&
              "code" in err &&
              (err as { code: string }).code !== "EADDRINUSE"
            ) {
              reject(err);
            } else {
              setTimeout(() => tryBind(port + 1, attempt + 1), 50);
            }
          }
        })
        .catch((err) => reject(err));
    };

    tryBind(initialPort, 1);
  });
}

/**
 * Creates the appropriate transport manager based on configuration.
 * @param createServerInstanceFn - Factory function for creating MCP server instances
 * @param sessionMode - The session mode configuration
 * @returns The appropriate transport manager instance
 */
function createTransportManager(
  createServerInstanceFn: () => Promise<McpServer>,
  sessionMode: string,
): TransportManager {
  switch (sessionMode) {
    case "stateless":
      logger.info("Creating stateless transport manager");
      return new StatelessTransportManager(createServerInstanceFn);
    case "stateful":
      logger.info("Creating stateful transport manager");
      return new StatefulTransportManager(createServerInstanceFn);
    case "auto":
    default:
      logger.info("Creating auto-mode transport manager (stateful with stateless fallback)");
      return new StatefulTransportManager(createServerInstanceFn);
  }
}

/**
 * Handles stateless requests by creating ephemeral server instances.
 * @param createServerInstanceFn - Factory function for creating MCP server instances
 * @param req - The HTTP request object
 * @param res - The HTTP response object
 * @param body - The parsed request body
 * @param context - The request context
 * @returns The response object after handling
 */
async function handleStatelessRequest(
  createServerInstanceFn: () => Promise<McpServer>,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  body: unknown,
  context: RequestContext,
): Promise<unknown> {
  const statelessManager = new StatelessTransportManager(createServerInstanceFn);
  return statelessManager.handleRequest(req, res, body, context);
}

/**
 * Creates and configures the Hono application instance with all necessary middleware and routes.
 * This function is separated to allow for testing the app's routing logic without starting a live server.
 * @param transportManager - The transport manager to handle MCP operations.
 * @param createServerInstanceFn - Factory function for creating MCP server instances (used for auto mode).
 * @param parentContext - The parent request context for tracing.
 * @returns The configured Hono application instance.
 */
export function createHttpApp(
  transportManager: TransportManager,
  createServerInstanceFn: () => Promise<McpServer>,
  parentContext: RequestContext,
): Hono<{ Bindings: HonoNodeBindings }> {
  const app = new Hono<{ Bindings: HonoNodeBindings }>();
  const transportContext = requestContextService.createRequestContext({
    ...parentContext,
    component: "HttpTransportSetup",
  });

  app.use(
    "*",
    cors({
      origin: config.mcpAllowedOrigins || [],
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: [
        "Content-Type",
        "Mcp-Session-Id",
        "Last-Event-ID",
        "Authorization",
      ],
      credentials: true,
    }),
  );

  app.use("*", async (c: Context, next: Next) => {
    c.res.headers.set("X-Content-Type-Options", "nosniff");
    await next();
  });

  app.use(MCP_ENDPOINT_PATH, async (c: Context, next: Next) => {
    const clientIp =
      c.req.header("x-forwarded-for")?.split(",")[0].trim() || "unknown_ip";
    const context = requestContextService.createRequestContext({
      operation: "httpRateLimitCheck",
      ipAddress: clientIp,
    });
    rateLimiter.check(clientIp, context);
    await next();
  });

  const authStrategy = createAuthStrategy();
  if (authStrategy) {
    app.use(MCP_ENDPOINT_PATH, createAuthMiddleware(authStrategy));
  }

  app.onError(httpErrorHandler);

  app.post(MCP_ENDPOINT_PATH, async (c: Context) => {
    const postContext = requestContextService.createRequestContext({
      ...transportContext,
      operation: "handlePost",
    });

    const body = await c.req.json();
    const sessionId = c.req.header("mcp-session-id");

    // Handle initialize requests
    if (isInitializeRequest(body)) {
      if (config.mcpSessionMode === "stateless") {
        // Force stateless mode - create ephemeral instance
        return handleStatelessRequest(
          createServerInstanceFn,
          c.env.incoming,
          c.env.res,
          body,
          postContext,
        );
      } else {
        // Stateful or auto mode - use transport manager (creates session)
        return (transportManager as StatefulTransportManager).initializeAndHandle(
          c.env.incoming,
          c.env.res,
          body,
          postContext,
        );
      }
    }

    // Handle non-initialize requests
    if (sessionId) {
      // Client wants stateful mode
      if (config.mcpSessionMode === "stateless") {
        throw new McpError(
          BaseErrorCode.CONFLICT,
          "Session ID provided but server is configured for stateless-only mode.",
        );
      }
      // Use stateful transport manager
      await transportManager.handleRequest(
        c.env.incoming,
        c.env.res,
        body,
        postContext,
        sessionId,
      );
      return c.env.res;
    } else {
      // Client wants stateless mode
      if (config.mcpSessionMode === "stateful") {
        throw new McpError(
          BaseErrorCode.NOT_FOUND,
          "Session ID header missing for non-initialize POST request in stateful-only mode.",
        );
      }
      // Handle as stateless request in auto or stateless mode
      return handleStatelessRequest(
        createServerInstanceFn,
        c.env.incoming,
        c.env.res,
        body,
        postContext,
      );
    }
  });

  const handleGetRequest = async (c: Context) => {
    const sessionId = c.req.header("mcp-session-id");

    if (sessionId) {
      // Client wants stateful streaming
      if (config.mcpSessionMode === "stateless") {
        throw new McpError(
          BaseErrorCode.CONFLICT,
          "Session ID provided but server is configured for stateless-only mode.",
        );
      }

      const requestContext = requestContextService.createRequestContext({
        ...transportContext,
        operation: "handleGetRequest",
        sessionId,
      });

      // Delegate the raw req/res to the transport manager for direct stream handling.
      await transportManager.handleRequest(
        c.env.incoming,
        c.env.res,
        undefined,
        requestContext,
        sessionId,
      );
      return c.env.res;
    } else {
      // Client wants stateless streaming
      if (config.mcpSessionMode === "stateful") {
        throw new McpError(
          BaseErrorCode.NOT_FOUND,
          "Session ID header missing for GET request in stateful-only mode.",
        );
      }

      const requestContext = requestContextService.createRequestContext({
        ...transportContext,
        operation: "handleStatelessGetRequest",
      });

      // Handle as stateless streaming request
      return handleStatelessRequest(
        createServerInstanceFn,
        c.env.incoming,
        c.env.res,
        undefined, // No body for GET requests
        requestContext,
      );
    }
  };

  const handleDeleteRequest = async (c: Context) => {
    const sessionId = c.req.header("mcp-session-id");

    if (sessionId) {
      // Client wants to delete a stateful session
      if (config.mcpSessionMode === "stateless") {
        throw new McpError(
          BaseErrorCode.CONFLICT,
          "Session ID provided but server is configured for stateless-only mode.",
        );
      }

      const requestContext = requestContextService.createRequestContext({
        ...transportContext,
        operation: "handleDeleteRequest",
        sessionId,
      });

      try {
        const response = await (
          transportManager as StatefulTransportManager
        ).handleDeleteRequest(sessionId, requestContext);

        // Apply headers from transport response
        response.headers.forEach((value: string, key: string) => {
          c.header(key, value);
        });

        c.status(response.statusCode);
        return c.json(response.body as Record<string, unknown>);
      } catch (error) {
        logger.error("Error in stateful DELETE handler", {
          error,
          ...requestContext,
        });
        throw error;
      }
    } else {
      // Stateless mode - no sessions to delete
      if (config.mcpSessionMode === "stateful") {
        throw new McpError(
          BaseErrorCode.NOT_FOUND,
          "Session ID header missing for DELETE request in stateful-only mode.",
        );
      }

      const _requestContext = requestContextService.createRequestContext({
        ...transportContext,
        operation: "handleStatelessDeleteRequest",
      });

      // Return standard stateless response
      c.header("Content-Type", "application/json");
      return c.json({
        status: "stateless_mode",
        message: "No sessions to delete in stateless mode",
      });
    }
  };

  app.get(MCP_ENDPOINT_PATH, handleGetRequest);
  app.delete(MCP_ENDPOINT_PATH, handleDeleteRequest);

  return app;
}

/**
 * Initializes the Hono app and starts the HTTP server with retry logic.
 * @param createServerInstanceFn - A factory function that returns a new McpServer instance.
 * @param parentContext - The parent request context for tracing.
 * @returns A promise that resolves with the Hono app and the running server instance.
 */
export async function startHttpTransport(
  createServerInstanceFn: () => Promise<McpServer>,
  parentContext: RequestContext,
): Promise<{
  app: Hono<{ Bindings: HonoNodeBindings }>;
  server: ServerType;
  transportManager: TransportManager;
}> {
  const transportManager = createTransportManager(
    createServerInstanceFn,
    config.mcpSessionMode,
  );
  
  const app = createHttpApp(transportManager, createServerInstanceFn, parentContext);
  const transportContext = requestContextService.createRequestContext({
    ...parentContext,
    component: "HttpTransportStart",
  });

  const server = await startHttpServerWithRetry(
    app,
    HTTP_PORT,
    HTTP_HOST,
    MAX_PORT_RETRIES,
    transportContext,
  );

  return { app, server, transportManager };
}
