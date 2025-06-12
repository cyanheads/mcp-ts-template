/**
 * @fileoverview Handles the setup and management of the Streamable HTTP MCP transport using Hono.
 * Implements the MCP Specification 2025-03-26 for Streamable HTTP.
 * This includes creating a Hono server, configuring middleware (CORS, Authentication),
 * defining request routing for the single MCP endpoint (POST/GET/DELETE),
 * managing server-side sessions, handling Server-Sent Events (SSE) for streaming,
 * and binding to a network port with retry logic for port conflicts.
 *
 * Specification Reference:
 * https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/transports.mdx#streamable-http
 * @module src/mcp-server/transports/httpTransport
 */

import { HttpBindings, serve, ServerType } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { Context, Hono } from "hono";
import { cors } from "hono/cors";
import http from "http";
import { randomUUID } from "node:crypto";
import { config } from "../../config/index.js";
import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import {
  logger,
  rateLimiter,
  RequestContext,
  requestContextService,
} from "../../utils/index.js";
import { mcpAuthMiddleware } from "./authentication/authMiddleware.js";
import { oauthMiddleware } from "./authentication/oauthMiddleware.js";
import type { AuthInfo } from "./authentication/types.js";

/**
 * The port number for the HTTP transport, configured via `MCP_HTTP_PORT` environment variable.
 * Defaults to 3010 if not specified (default is managed by the config module).
 * @constant {number} HTTP_PORT
 * @private
 */
const HTTP_PORT = config.mcpHttpPort;

/**
 * The host address for the HTTP transport, configured via `MCP_HTTP_HOST` environment variable.
 * Defaults to '127.0.0.1' if not specified (default is managed by the config module).
 * MCP Spec Security Note: Recommends binding to localhost for local servers to minimize exposure.
 * @private
 */
const HTTP_HOST = config.mcpHttpHost;

/**
 * The single HTTP endpoint path for all MCP communication, as required by the MCP specification.
 * This endpoint supports POST, GET, DELETE, and OPTIONS methods.
 * @constant {string} MCP_ENDPOINT_PATH
 * @private
 */
const MCP_ENDPOINT_PATH = "/mcp";

/**
 * Defines the Hono bindings for this application, extending the base `HttpBindings`
 * from `@hono/node-server` with a custom `auth` property injected by our middleware.
 * This provides type safety for accessing `c.env.incoming` and `c.env.auth`.
 */
type HonoBindings = HttpBindings & {
  auth?: AuthInfo;
};

/**
 * Maximum number of attempts to find an available port if the initial `HTTP_PORT` is in use.
 * The server will try ports sequentially: `HTTP_PORT`, `HTTP_PORT + 1`, ..., up to `MAX_PORT_RETRIES`.
 * @constant {number} MAX_PORT_RETRIES
 * @private
 */
const MAX_PORT_RETRIES = 15;

/**
 * Stores active `StreamableHTTPServerTransport` instances from the SDK, keyed by their session ID.
 * This is essential for routing subsequent HTTP requests (GET, DELETE, non-initialize POST)
 * to the correct stateful session transport instance.
 * @type {Record<string, StreamableHTTPServerTransport>}
 * @private
 */
const httpTransports: Record<string, StreamableHTTPServerTransport> = {};

/**
 * Stores the last activity timestamp for each session, keyed by session ID.
 * Used for garbage collecting stale/abandoned sessions.
 * @type {Record<string, number>}
 * @private
 */
const sessionActivity: Record<string, number> = {};

/**
 * The timeout period in milliseconds for inactive sessions. If a session has no
 * activity for this duration, it will be considered stale and garbage collected.
 * Defaults to 30 minutes.
 * @constant {number} SESSION_TIMEOUT_MS
 * @private
 */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * The interval in milliseconds at which the session garbage collector runs to
 * clean up stale sessions. Defaults to 1 minute.
 * @constant {number} SESSION_GC_INTERVAL_MS
 * @private
 */
const SESSION_GC_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Proactively checks if a specific network port is already in use.
 * @param port - The port number to check.
 * @param host - The host address to check the port on.
 * @param parentContext - Logging context from the caller.
 * @returns A promise that resolves to `true` if the port is in use, or `false` otherwise.
 * @private
 */
async function isPortInUse(
  port: number,
  host: string,
  parentContext: RequestContext,
): Promise<boolean> {
  const checkContext = requestContextService.createRequestContext({
    ...parentContext,
    operation: "isPortInUse",
    port,
    host,
  });
  logger.debug(`Proactively checking port usability...`, checkContext);
  return new Promise((resolve) => {
    const tempServer = http.createServer();
    tempServer
      .once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          logger.debug(
            `Proactive check: Port confirmed in use (EADDRINUSE).`,
            checkContext,
          );
          resolve(true);
        } else {
          logger.debug(
            `Proactive check: Non-EADDRINUSE error encountered: ${err.message}`,
            { ...checkContext, errorCode: err.code },
          );
          resolve(false);
        }
      })
      .once("listening", () => {
        logger.debug(`Proactive check: Port is available.`, checkContext);
        tempServer.close(() => resolve(false));
      })
      .listen(port, host);
  });
}

/**
 * Attempts to start the HTTP server, retrying on incrementing ports if `EADDRINUSE` occurs.
 *
 * @param app - The Hono application instance.
 * @param initialPort - The initial port number to try.
 * @param host - The host address to bind to.
 * @param maxRetries - Maximum number of additional ports to attempt.
 * @param parentContext - Logging context from the caller.
 * @returns A promise that resolves with the Node.js `http.Server` instance the server successfully bound to.
 * @throws {Error} If binding fails after all retries or for a non-EADDRINUSE error.
 * @private
 */
function startHttpServerWithRetry(
  app: Hono<{ Bindings: HonoBindings }>,
  initialPort: number,
  host: string,
  maxRetries: number,
  parentContext: RequestContext,
): Promise<ServerType> {
  const startContext = requestContextService.createRequestContext({
    ...parentContext,
    operation: "startHttpServerWithRetry",
    initialPort,
    host,
    maxRetries,
  });
  logger.debug(`Attempting to start HTTP server...`, startContext);

  return new Promise(async (resolve, reject) => {
    let lastError: Error | null = null;
    for (let i = 0; i <= maxRetries; i++) {
      const currentPort = initialPort + i;
      const attemptContext = requestContextService.createRequestContext({
        ...startContext,
        port: currentPort,
        attempt: i + 1,
        maxAttempts: maxRetries + 1,
      });
      logger.debug(
        `Attempting port ${currentPort} (${attemptContext.attempt}/${attemptContext.maxAttempts})`,
        attemptContext,
      );

      if (await isPortInUse(currentPort, host, attemptContext)) {
        logger.warning(
          `Proactive check detected port ${currentPort} is in use, retrying...`,
          attemptContext,
        );
        lastError = new Error(
          `EADDRINUSE: Port ${currentPort} detected as in use by proactive check.`,
        );
        await new Promise((res) => setTimeout(res, 100));
        continue;
      }

      try {
        const serverInstance = serve(
          { fetch: app.fetch, port: currentPort, hostname: host },
          (info: { address: string; port: number }) => {
            const serverAddress = `http://${info.address}:${info.port}${MCP_ENDPOINT_PATH}`;
            logger.info(
              `HTTP transport successfully listening on host ${host} at ${serverAddress}`,
              { ...attemptContext, address: serverAddress },
            );

            // Display user-friendly startup message only after server is confirmed listening
            let serverAddressLog = serverAddress;
            let productionNote = "";
            if (config.environment === "production") {
              serverAddressLog = `https://${info.address}:${info.port}${MCP_ENDPOINT_PATH}`;
              productionNote = ` (via HTTPS, ensure reverse proxy is configured)`;
            }

            if (process.stdout.isTTY) {
              console.log(
                `\n🚀 MCP Server running in HTTP mode at: ${serverAddressLog}${productionNote}\n   (MCP Spec: 2025-03-26 Streamable HTTP Transport)\n`,
              );
            }
          },
        );
        resolve(serverInstance);
        return;
      } catch (err: any) {
        lastError = err;
        logger.debug(
          `Listen error on port ${currentPort}: Code=${err.code}, Message=${err.message}`,
          { ...attemptContext, errorCode: err.code, errorMessage: err.message },
        );
        if (err.code === "EADDRINUSE") {
          logger.warning(
            `Port ${currentPort} already in use (EADDRINUSE), retrying...`,
            attemptContext,
          );
          await new Promise((res) => setTimeout(res, 100));
        } else {
          logger.error(
            `Failed to bind to port ${currentPort} due to non-EADDRINUSE error: ${err.message}`,
            { ...attemptContext, error: err.message },
          );
          reject(err);
          return;
        }
      }
    }
    logger.error(
      `Failed to bind to any port after ${maxRetries + 1} attempts. Last error: ${lastError?.message}`,
      { ...startContext, error: lastError?.message },
    );
    reject(
      lastError ||
        new Error("Failed to bind to any port after multiple retries."),
    );
  });
}

/**
 * Sets up and starts the Streamable HTTP transport layer for the MCP server.
 *
 * @param createServerInstanceFn - An asynchronous factory function that returns a new `McpServer` instance.
 * @param parentContext - Logging context from the main server startup process.
 * @returns A promise that resolves with the Node.js `http.Server` instance when the HTTP server is successfully listening.
 * @throws {Error} If the server fails to start after all port retries.
 */
export async function startHttpTransport(
  createServerInstanceFn: () => Promise<McpServer>,
  parentContext: RequestContext,
): Promise<ServerType> {
  const app = new Hono<{ Bindings: HonoBindings }>();
  const transportContext = requestContextService.createRequestContext({
    ...parentContext,
    transportType: "HTTP",
    component: "HttpTransportSetup",
  });
  logger.debug("Setting up Hono app for HTTP transport...", transportContext);

  // Start the session garbage collector
  setInterval(() => {
    const now = Date.now();
    const gcContext = requestContextService.createRequestContext({
      operation: "SessionGarbageCollector",
    });
    logger.debug("Running session garbage collector...", gcContext);
    for (const sessionId in sessionActivity) {
      if (now - sessionActivity[sessionId] > SESSION_TIMEOUT_MS) {
        logger.info(
          `Session ${sessionId} timed out due to inactivity. Cleaning up.`,
          { ...gcContext, sessionId },
        );
        const transport = httpTransports[sessionId];
        if (transport) {
          transport.close(); // This will trigger the onclose handler to delete it from httpTransports
        }
        delete sessionActivity[sessionId];
      }
    }
  }, SESSION_GC_INTERVAL_MS);

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

  app.use("*", async (c, next) => {
    const securityContext = requestContextService.createRequestContext({
      ...transportContext,
      operation: "securityMiddleware",
      path: c.req.path,
      method: c.req.method,
      origin: c.req.header("origin"),
    });
    logger.debug(`Applying security middleware...`, securityContext);
    c.res.headers.set("X-Content-Type-Options", "nosniff");
    c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    c.res.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; object-src 'none'; style-src 'self'; img-src 'self'; media-src 'self'; frame-src 'none'; font-src 'self'; connect-src 'self'",
    );
    logger.debug("Security middleware passed.", securityContext);
    await next();
  });

  app.use(MCP_ENDPOINT_PATH, async (c, next) => {
    const xff = c.req.header("x-forwarded-for");
    const clientIp = xff ? xff.split(",")[0].trim() : "unknown_ip";
    const rateLimitKey =
      clientIp || c.req.header("host") || "unknown_ip_for_rate_limit";

    const context = requestContextService.createRequestContext({
      operation: "httpRateLimitCheck",
      ipAddress: rateLimitKey,
      method: c.req.method,
      path: c.req.path,
    });

    try {
      rateLimiter.check(rateLimitKey, context);
      logger.debug("Rate limit check passed.", context);
      await next();
    } catch (error) {
      if (
        error instanceof McpError &&
        error.code === BaseErrorCode.RATE_LIMITED
      ) {
        logger.warning(`Rate limit exceeded for IP: ${rateLimitKey}`, {
          ...context,
          errorMessage: error.message,
          details: error.details,
        });
        return c.json(
          {
            jsonrpc: "2.0",
            error: { code: -32000, message: "Too Many Requests" },
            id: (await c.req.json().catch(() => ({})))?.id || null,
          },
          429,
        );
      } else {
        logger.error("Unexpected error in rate limit middleware", {
          ...context,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    }
  });

  // Use the appropriate authentication middleware based on config
  if (config.mcpAuthMode === "oauth") {
    app.use(MCP_ENDPOINT_PATH, oauthMiddleware);
  } else {
    app.use(MCP_ENDPOINT_PATH, mcpAuthMiddleware);
  }

  app.post(MCP_ENDPOINT_PATH, async (c) => {
    const basePostContext = requestContextService.createRequestContext({
      ...transportContext,
      operation: "handlePost",
      method: "POST",
      path: c.req.path,
      origin: c.req.header("origin"),
    });
    const body = await c.req.json();
    logger.debug(`Received POST request on ${MCP_ENDPOINT_PATH}`, {
      ...basePostContext,
      headers: c.req.header(),
      bodyPreview: JSON.stringify(body).substring(0, 100),
    });

    const sessionId = c.req.header("mcp-session-id");
    logger.debug(`Extracted session ID: ${sessionId}`, {
      ...basePostContext,
      sessionId,
    });

    let transport = sessionId ? httpTransports[sessionId] : undefined;
    if (transport && sessionId) {
      sessionActivity[sessionId] = Date.now(); // Update activity timestamp
    }
    logger.debug(`Found existing transport for session ID: ${!!transport}`, {
      ...basePostContext,
      sessionId,
    });

    const isInitReq = isInitializeRequest(body);
    logger.debug(`Is InitializeRequest: ${isInitReq}`, {
      ...basePostContext,
      sessionId,
    });
    const requestId = (body as any)?.id || null;

    try {
      if (isInitReq) {
        if (transport) {
          logger.warning(
            "Received InitializeRequest on an existing session ID. Closing old session and creating new.",
            { ...basePostContext, sessionId },
          );
          await transport.close();
          // onclose handler will delete from httpTransports and sessionActivity
        }
        logger.info("Handling Initialize Request: Creating new session...", {
          ...basePostContext,
          sessionId,
        });

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => {
            const newId = randomUUID();
            logger.debug(`Generated new session ID: ${newId}`, basePostContext);
            return newId;
          },
          onsessioninitialized: (newId) => {
            logger.debug(
              `Session initialized callback triggered for ID: ${newId}`,
              { ...basePostContext, newSessionId: newId },
            );
            httpTransports[newId] = transport!;
            sessionActivity[newId] = Date.now(); // Initialize activity timestamp
            logger.info(`HTTP Session created: ${newId}`, {
              ...basePostContext,
              newSessionId: newId,
            });
          },
        });

        transport.onclose = () => {
          const closedSessionId = transport!.sessionId;
          if (closedSessionId) {
            logger.debug(
              `onclose handler triggered for session ID: ${closedSessionId}`,
              { ...basePostContext, closedSessionId },
            );
            delete httpTransports[closedSessionId];
            delete sessionActivity[closedSessionId]; // Clean up activity tracker
            logger.info(`HTTP Session closed: ${closedSessionId}`, {
              ...basePostContext,
              closedSessionId,
            });
          } else {
            logger.debug(
              "onclose handler triggered for transport without session ID (likely init failure).",
              basePostContext,
            );
          }
        };

        logger.debug(
          "Creating McpServer instance for new session...",
          basePostContext,
        );
        const server = await createServerInstanceFn();
        logger.debug(
          "Connecting McpServer to new transport...",
          basePostContext,
        );
        await server.connect(transport);
        logger.debug("McpServer connected to transport.", basePostContext);
      } else if (!transport) {
        logger.warning(
          "Invalid or missing session ID for non-initialize POST request.",
          { ...basePostContext, sessionId },
        );
        return c.json(
          {
            jsonrpc: "2.0",
            error: { code: -32004, message: "Invalid or expired session ID" },
            id: requestId,
          },
          404,
        );
      }

      const currentSessionId = transport.sessionId;
      logger.debug(
        `Processing POST request content for session ${currentSessionId}...`,
        { ...basePostContext, sessionId: currentSessionId, isInitReq },
      );
      const response = await transport.handleRequest(
        c.env.incoming,
        c.env.outgoing,
        body,
      );
      logger.debug(
        `Finished processing POST request content for session ${currentSessionId}.`,
        { ...basePostContext, sessionId: currentSessionId },
      );
      return response;
    } catch (err) {
      const errorSessionId = transport?.sessionId || sessionId;
      logger.error("Error handling POST request", {
        ...basePostContext,
        sessionId: errorSessionId,
        isInitReq,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      if (isInitReq && transport && !transport.sessionId) {
        logger.debug("Cleaning up transport after initialization failure.", {
          ...basePostContext,
          sessionId: errorSessionId,
        });
        await transport.close().catch((closeErr) =>
          logger.error("Error closing transport after init failure", {
            ...basePostContext,
            sessionId: errorSessionId,
            closeError: closeErr,
          }),
        );
      }
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error during POST handling",
          },
          id: requestId,
        },
        500,
      );
    }
  });

  const handleSessionReq = async (c: Context<{ Bindings: HonoBindings }>) => {
    const method = c.req.method;
    const baseSessionReqContext = requestContextService.createRequestContext({
      ...transportContext,
      operation: `handle${method}`,
      method,
      path: c.req.path,
      origin: c.req.header("origin"),
    });
    logger.debug(`Received ${method} request on ${MCP_ENDPOINT_PATH}`, {
      ...baseSessionReqContext,
      headers: c.req.header(),
    });

    const sessionId = c.req.header("mcp-session-id");
    logger.debug(`Extracted session ID: ${sessionId}`, {
      ...baseSessionReqContext,
      sessionId,
    });

    const transport = sessionId ? httpTransports[sessionId] : undefined;
    if (transport && sessionId) {
      sessionActivity[sessionId] = Date.now(); // Update activity timestamp
    }
    logger.debug(`Found existing transport for session ID: ${!!transport}`, {
      ...baseSessionReqContext,
      sessionId,
    });

    if (!transport) {
      logger.warning(`Session not found for ${method} request`, {
        ...baseSessionReqContext,
        sessionId,
      });
      return c.json(
        {
          jsonrpc: "2.0",
          error: { code: -32004, message: "Session not found or expired" },
          id: null,
        },
        404,
      );
    }

    try {
      logger.debug(
        `Delegating ${method} request to transport for session ${sessionId}...`,
        { ...baseSessionReqContext, sessionId },
      );
      const response = await transport.handleRequest(
        c.env.incoming,
        c.env.outgoing,
      );
      logger.info(
        `Successfully handled ${method} request for session ${sessionId}`,
        { ...baseSessionReqContext, sessionId },
      );
      return response;
    } catch (err) {
      logger.error(
        `Error handling ${method} request for session ${sessionId}`,
        {
          ...baseSessionReqContext,
          sessionId,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        },
      );
      return c.json(
        {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal Server Error" },
          id: null,
        },
        500,
      );
    }
  };

  app.get(MCP_ENDPOINT_PATH, handleSessionReq);
  app.delete(MCP_ENDPOINT_PATH, handleSessionReq);

  logger.debug("Creating HTTP server instance...", transportContext);
  try {
    logger.debug(
      "Attempting to start HTTP server with retry logic...",
      transportContext,
    );
    const serverInstance = await startHttpServerWithRetry(
      app,
      config.mcpHttpPort,
      config.mcpHttpHost,
      MAX_PORT_RETRIES,
      transportContext,
    );

    return serverInstance;
  } catch (err) {
    logger.fatal("HTTP server failed to start after multiple port retries.", {
      ...transportContext,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
