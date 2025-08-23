/**
 * @fileoverview Configures and starts the HTTP MCP transport using Hono.
 * This file has been refactored to correctly integrate Hono's streaming
 * capabilities with the Model Context Protocol SDK's transport layer.
 * @module src/mcp-server/transports/http/httpTransport
 */

import { serve, ServerType } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Context, Hono, Next } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { stream } from "hono/streaming";
import http from "http";
import { config } from "@/config/index.js";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import {
  logger,
  rateLimiter,
  RequestContext,
  requestContextService,
} from "@/utils/index.js";
import {
  authContext,
  createAuthMiddleware,
  createAuthStrategy,
} from "../auth/index.js";
import { AutoTransportManager } from "../core/autoTransportManager.js";
import { StatelessTransportManager } from "../core/statelessTransportManager.js";
import { TransportManager, TransportResponse } from "../core/transportTypes.js";
import { StatefulTransportManager } from "./../core/statefulTransportManager.js";
import { httpErrorHandler } from "./httpErrorHandler.js";
import { HonoNodeBindings } from "./httpTypes.js";
import { mcpTransportMiddleware } from "./mcpTransportMiddleware.js";

const HTTP_PORT = config.mcpHttpPort;
const HTTP_HOST = config.mcpHttpHost;
const MCP_ENDPOINT_PATH = config.mcpHttpEndpointPath;

/**
 * Extracts the client IP address from the request, prioritizing common proxy headers.
 * @param c - The Hono context object.
 * @returns The client's IP address or a default string if not found.
 */
function getClientIp(c: Context<{ Bindings: HonoNodeBindings }>): string {
  const forwardedFor = c.req.header("x-forwarded-for");
  return (
    (forwardedFor?.split(",")[0] ?? "").trim() ||
    c.req.header("x-real-ip") ||
    "unknown_ip"
  );
}

/**
 * Converts a Fetch API Headers object to Node.js IncomingHttpHeaders.
 * Hono uses Fetch API Headers, but the underlying transport managers expect
 * Node's native IncomingHttpHeaders.
 * @param headers - The Headers object to convert.
 * @returns An object compatible with IncomingHttpHeaders.
 */

async function isPortInUse(
  port: number,
  host: string,
  parentContext: RequestContext,
): Promise<boolean> {
  const context = { ...parentContext, operation: "isPortInUse", port, host };
  logger.debug(context, `Checking if port ${port} is in use...`);
  return new Promise((resolve) => {
    const tempServer = http.createServer();
    tempServer
      .once("error", (err: NodeJS.ErrnoException) => {
        const inUse = err.code === "EADDRINUSE";
        logger.debug(
          context,
          `Port check resulted in error: ${err.code}. Port in use: ${inUse}`,
        );
        resolve(inUse);
      })
      .once("listening", () => {
        logger.debug(
          context,
          `Successfully bound to port ${port} temporarily. Port is not in use.`,
        );
        tempServer.close(() => resolve(false));
      })
      .listen(port, host);
  });
}

function startHttpServerWithRetry(
  app: Hono<HonoAppEnv>,
  initialPort: number,
  host: string,
  maxRetries: number,
  parentContext: RequestContext,
): Promise<ServerType> {
  const startContext = {
    ...parentContext,
    operation: "startHttpServerWithRetry",
  };
  logger.info(
    startContext,
    `Attempting to start HTTP server on port ${initialPort} with ${maxRetries} retries.`,
  );

  return new Promise((resolve, reject) => {
    const tryBind = (port: number, attempt: number) => {
      const attemptContext = { ...startContext, port, attempt };
      if (attempt > maxRetries + 1) {
        const error = new Error(
          `Failed to bind to any port after ${maxRetries} retries.`,
        );
        logger.fatal(attemptContext, error.message);
        return reject(error);
      }

      isPortInUse(port, host, attemptContext)
        .then((inUse) => {
          if (inUse) {
            logger.warning(
              attemptContext,
              `Port ${port} is in use, retrying on port ${port + 1}...`,
            );
            setTimeout(
              () => tryBind(port + 1, attempt + 1),
              config.mcpHttpPortRetryDelayMs,
            );
            return;
          }

          try {
            const serverInstance = serve(
              { fetch: app.fetch, port, hostname: host },
              (info: { address: string; port: number }) => {
                const serverAddress = `http://${info.address}:${info.port}${MCP_ENDPOINT_PATH}`;
                logger.info(
                  {
                    ...attemptContext,
                    address: serverAddress,
                    sessionMode: config.mcpSessionMode,
                  },
                  `HTTP transport listening at ${serverAddress}`,
                );
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
              const errorToLog =
                err instanceof Error ? err : new Error(String(err));
              logger.error(
                { error: errorToLog, ...attemptContext },
                "An unexpected error occurred while starting the server.",
              );
              return reject(err);
            }
            logger.warning(
              attemptContext,
              `Encountered EADDRINUSE race condition on port ${port}, retrying...`,
            );
            setTimeout(
              () => tryBind(port + 1, attempt + 1),
              config.mcpHttpPortRetryDelayMs,
            );
          }
        })
        .catch((err) => {
          const error = err instanceof Error ? err : new Error(String(err));
          logger.fatal(
            {
              error,
              ...attemptContext,
            },
            "Failed to check if port is in use.",
          );
          reject(err);
        });
    };

    tryBind(initialPort, 1);
  });
}

function createTransportManager(
  createServerInstanceFn: () => Promise<McpServer>,
  sessionMode: string,
  context: RequestContext,
): TransportManager {
  const opContext = {
    ...context,
    operation: "createTransportManager",
    sessionMode,
  };
  logger.info(
    opContext,
    `Creating transport manager for session mode: ${sessionMode}`,
  );

  const statefulOptions = {
    staleSessionTimeoutMs: config.mcpStatefulSessionStaleTimeoutMs,
    mcpHttpEndpointPath: config.mcpHttpEndpointPath,
  };

  switch (sessionMode) {
    case "stateless":
      return new StatelessTransportManager(createServerInstanceFn);
    case "stateful":
      return new StatefulTransportManager(
        createServerInstanceFn,
        statefulOptions,
      );
    case "auto":
    default:
      logger.info(opContext, "Using 'auto' mode manager.");
      return new AutoTransportManager(createServerInstanceFn, statefulOptions);
  }
}

/**
 * Middleware to enforce 'application/json' content type for POST requests.
 */
const enforceJsonContentType = async (c: Context, next: Next) => {
  if (c.req.method === "POST") {
    const contentType = c.req.header("content-type");
    if (!contentType || !contentType.startsWith("application/json")) {
      // Use the request context if available
      const context = requestContextService.createRequestContext({
        operation: "enforceJsonContentType",
      });
      throw new McpError(
        JsonRpcErrorCode.InvalidRequest,
        "Unsupported Media Type: Content-Type must be 'application/json'.",
        context,
      );
    }
  }
  await next();
};

// Define the Hono app's environment to include custom variables
type HonoAppEnv = {
  Bindings: HonoNodeBindings;
  Variables: {
    mcpResponse?: TransportResponse;
    requestId?: string | number | null;
  };
};

export function createHttpApp(
  transportManager: TransportManager,
  createServerInstanceFn: () => Promise<McpServer>,
  parentContext: RequestContext,
): Hono<HonoAppEnv> {
  const app = new Hono<HonoAppEnv>();
  const transportContext = {
    ...parentContext,
    component: "HttpTransportSetup",
  };
  logger.info(transportContext, "Creating Hono HTTP application.");

  // 1. HTTP Access Logging
  app.use(honoLogger());

  // 2. Security Headers
  app.use(secureHeaders());

  // 3. CORS
  app.use(
    "*",
    cors({
      origin:
        config.mcpAllowedOrigins && config.mcpAllowedOrigins.length > 0
          ? config.mcpAllowedOrigins
          : config.environment === "production"
            ? []
            : "*",
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

  // 4. Content Type Enforcement (Specific to MCP endpoint)
  app.use(MCP_ENDPOINT_PATH, enforceJsonContentType);

  // 5. Authentication and Advanced Rate Limiting (Order Matters)

  const authStrategy = createAuthStrategy();

  // Define the rate limiting logic as a reusable middleware
  const rateLimitHandler = async (
    c: Context<{ Bindings: HonoNodeBindings }>,
    next: Next,
  ) => {
    const clientIp = getClientIp(c);
    let key: string;
    let clientId: string | undefined;

    if (authStrategy) {
      // If auth is enabled, authContext should be populated by the preceding authMiddleware.
      const store = authContext.getStore();
      clientId = store?.authInfo.clientId;
      // Key should be clientId if authenticated, otherwise fallback to IP.
      key = clientId || clientIp;
    } else {
      // If auth is disabled, key is always IP.
      key = clientIp;
    }

    const context = requestContextService.createRequestContext({
      operation: "httpRateLimitCheck",
      rateLimitKey: key,
      ipAddress: clientIp,
      clientId: clientId,
    });

    try {
      rateLimiter.check(key, context);
      logger.debug(context, "Rate limit check passed.");
    } catch (error) {
      logger.warning(
        { ...context, error: error as Error },
        "Rate limit check failed.",
      );
      throw error;
    }
    await next();
  };

  if (authStrategy) {
    logger.info(
      transportContext,
      "Authentication strategy found, enabling auth middleware.",
    );
    // Auth Middleware first
    app.use(MCP_ENDPOINT_PATH, createAuthMiddleware(authStrategy));
  } else {
    logger.info(
      transportContext,
      "No authentication strategy found, auth middleware disabled.",
    );
  }

  // Rate Limiting second (can now leverage auth context if available)
  app.use(MCP_ENDPOINT_PATH, rateLimitHandler);

  app.onError(httpErrorHandler);

  app.get("/healthz", (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.get(
    MCP_ENDPOINT_PATH,
    async (c: Context<{ Bindings: HonoNodeBindings }>) => {
      const sessionId = c.req.header("mcp-session-id");
      if (sessionId) {
        return c.text(
          "GET requests to existing sessions are not supported.",
          405,
        );
      }

      // Since this is a stateless endpoint, we create a temporary instance
      // to report on the server's configuration.
      const serverInstance = await createServerInstanceFn();
      await serverInstance.close(); // ensure cleanup
      return c.json({
        status: "ok",
        server: {
          name: config.mcpServerName,
          version: config.mcpServerVersion,
          description:
            (config.pkg as { description?: string })?.description ||
            "No description provided.",
          nodeVersion: process.version,
          environment: config.environment,
        },
        sessionMode: config.mcpSessionMode,
        message:
          "Server is running. POST to this endpoint to execute a tool call.",
      });
    },
  );

  app.post(MCP_ENDPOINT_PATH, mcpTransportMiddleware(transportManager), (c) => {
    const response = c.get("mcpResponse");

    if (!response) {
      // This case should ideally not be reached if middleware runs correctly
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: JsonRpcErrorCode.InternalError,
            message: "Middleware failed to produce a response.",
          },
          id: c.get("requestId") ?? null,
        },
        500,
      );
    }

    if (response.sessionId) {
      c.header("Mcp-Session-Id", response.sessionId);
    }
    response.headers.forEach((value: string, key: string) => {
      c.header(key, value);
    });

    c.status(response.statusCode);

    if (response.type === "stream") {
      return stream(c, async (s) => {
        await s.pipe(response.stream);
      });
    } else {
      const body =
        typeof response.body === "object" && response.body !== null
          ? response.body
          : { body: response.body };
      return c.json(body);
    }
  });

  app.delete(
    MCP_ENDPOINT_PATH,
    async (c: Context<{ Bindings: HonoNodeBindings }>) => {
      const sessionId = c.req.header("mcp-session-id");
      const context = requestContextService.createRequestContext({
        ...transportContext,
        operation: "handleDeleteRequest",
        sessionId,
      });

      if (sessionId) {
        // Type-safe check for the optional method
        if (transportManager.handleDeleteRequest) {
          const response = await transportManager.handleDeleteRequest(
            sessionId,
            context,
          );
          if (response.type === "buffered") {
            const body =
              typeof response.body === "object" && response.body !== null
                ? response.body
                : { body: response.body };
            return c.json(body, response.statusCode);
          }
          // Fallback for unexpected stream response on DELETE
          return c.body(null, response.statusCode);
        } else {
          return c.json(
            {
              error: "Method Not Allowed",
              message: "DELETE operations are not supported in this mode.",
            },
            405,
          );
        }
      } else {
        return c.json({
          status: "stateless_mode",
          message: "No sessions to delete in stateless mode",
        });
      }
    },
  );

  logger.info(transportContext, "Hono application setup complete.");
  return app;
}

export async function startHttpTransport(
  createServerInstanceFn: () => Promise<McpServer>,
  parentContext: RequestContext,
): Promise<{
  app: Hono<HonoAppEnv>;
  server: ServerType;
  transportManager: TransportManager;
}> {
  const transportContext = {
    ...parentContext,
    component: "HttpTransportStart",
  };
  logger.info(transportContext, "Starting HTTP transport.");

  const transportManager = createTransportManager(
    createServerInstanceFn,
    config.mcpSessionMode,
    transportContext,
  );
  const app = createHttpApp(
    transportManager,
    createServerInstanceFn,
    transportContext,
  );

  const server = await startHttpServerWithRetry(
    app,
    HTTP_PORT,
    HTTP_HOST,
    config.mcpHttpMaxPortRetries,
    transportContext,
  );

  logger.info(transportContext, "HTTP transport started successfully.");
  return { app, server, transportManager };
}
