/**
 * @fileoverview Configures and starts the HTTP MCP transport using Hono with clean architecture.
 * This module integrates a TransportManager abstraction with Hono HTTP routing, providing:
 * - Clean separation between HTTP concerns and MCP transport logic
 * - Testable HTTP routes through dependency injection
 * - Configurable middleware for CORS, rate limiting, and authentication
 * - Session management abstraction
 * - Port-binding logic with automatic retry on conflicts
 *
 * The MCP transport implementation is handled through the TransportManager interface,
 * allowing for different implementations (production vs testing).
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
import { McpTransportManager } from "../core/mcpTransportManager.js";
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
                });
                if (process.stdout.isTTY) {
                  console.log(`\n🚀 MCP Server running at: ${serverAddress}\n`);
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
 * Creates and configures the Hono application instance with all necessary middleware and routes.
 * This function is separated to allow for testing the app's routing logic without starting a live server.
 * @param transportManager - The transport manager to handle MCP operations.
 * @param parentContext - The parent request context for tracing.
 * @returns The configured Hono application instance.
 */
export function createHttpApp(
  transportManager: TransportManager,
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

    if (isInitializeRequest(body)) {
      // Handle initialization
      const response = await transportManager.initializeSession(
        body,
        postContext,
      );
      response.headers.forEach((value, key) => c.header(key, value));
      c.status(response.statusCode);
      return c.json(response.body as Record<string, unknown>);
    }

    const sessionId = c.req.header("mcp-session-id");
    if (!sessionId) {
      throw new McpError(
        BaseErrorCode.NOT_FOUND,
        "Session ID header missing for POST request.",
      );
    }

    // For session requests, delegate to the unified handler.
    // The transport manager will now return a 204 No Content for streaming POSTs.
    await transportManager.handleRequest(
      sessionId,
      c.env.incoming,
      c.env.res,
      postContext,
      body,
    );
    return c.body(null, 204);
  });

  const handleGetRequest = async (c: Context) => {
    const sessionId = c.req.header("mcp-session-id");
    if (!sessionId) {
      throw new McpError(
        BaseErrorCode.NOT_FOUND,
        "Session ID header missing for GET request.",
      );
    }

    const requestContext = requestContextService.createRequestContext({
      ...transportContext,
      operation: "handleGetRequest",
      sessionId,
    });

    // Delegate the raw req/res to the transport manager for direct stream handling.
    // Hono will not control the response after this point.
    await transportManager.handleRequest(
      sessionId,
      c.env.incoming,
      c.env.res,
      requestContext,
    );
    // Return the raw response object to signal to Hono that the response is being handled elsewhere.
    return c.env.res;
  };

  const handleDeleteRequest = async (c: Context) => {
    const sessionId = c.req.header("mcp-session-id");
    if (!sessionId) {
      throw new McpError(BaseErrorCode.NOT_FOUND, "Session ID header missing.");
    }

    const requestContext = requestContextService.createRequestContext({
      ...transportContext,
      operation: "handleDeleteRequest",
      sessionId,
    });

    try {
      const response = await transportManager.handleDeleteRequest(
        sessionId,
        requestContext,
      );

      // Apply headers from transport response
      response.headers.forEach((value, key) => {
        c.header(key, value);
      });

      c.status(response.statusCode);

      return c.json(response.body as Record<string, unknown>);
    } catch (error) {
      logger.error("Error in DELETE handler", {
        error,
        ...requestContext,
      });
      throw error; // Let the error handler deal with it
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
): Promise<{ app: Hono<{ Bindings: HonoNodeBindings }>; server: ServerType }> {
  const transportManager = new McpTransportManager(createServerInstanceFn);
  const app = createHttpApp(transportManager, parentContext);
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

  return { app, server };
}
