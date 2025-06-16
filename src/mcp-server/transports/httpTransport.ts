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
  ErrorHandler,
  logger,
  rateLimiter,
  RequestContext,
  requestContextService,
} from "../../utils/index.js";
import { mcpAuthMiddleware } from "./authentication/authMiddleware.js";
import { oauthMiddleware } from "./authentication/oauthMiddleware.js";
import type { AuthInfo } from "./authentication/types.js";

const HTTP_PORT = config.mcpHttpPort;
const HTTP_HOST = config.mcpHttpHost;
const MCP_ENDPOINT_PATH = "/mcp";
const MAX_PORT_RETRIES = 15;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_GC_INTERVAL_MS = 60 * 1000;

type HonoBindings = HttpBindings & {
  auth?: AuthInfo;
};

const httpTransports: Record<string, StreamableHTTPServerTransport> = {};
const sessionActivity: Record<string, number> = {};

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
  app: Hono<{ Bindings: HonoBindings }>,
  initialPort: number,
  host: string,
  maxRetries: number,
  parentContext: RequestContext,
): Promise<ServerType> {
  const startContext = requestContextService.createRequestContext({
    ...parentContext,
    operation: "startHttpServerWithRetry",
  });

  return new Promise(async (resolve, reject) => {
    for (let i = 0; i <= maxRetries; i++) {
      const currentPort = initialPort + i;
      const attemptContext = { ...startContext, port: currentPort, attempt: i + 1 };

      if (await isPortInUse(currentPort, host, attemptContext)) {
        logger.warning(`Port ${currentPort} is in use, retrying...`, attemptContext);
        continue;
      }

      try {
        const serverInstance = serve(
          { fetch: app.fetch, port: currentPort, hostname: host },
          (info) => {
            const serverAddress = `http://${info.address}:${info.port}${MCP_ENDPOINT_PATH}`;
            logger.info(`HTTP transport listening at ${serverAddress}`, { ...attemptContext, address: serverAddress });
            if (process.stdout.isTTY) {
              console.log(`\n🚀 MCP Server running at: ${serverAddress}\n`);
            }
          },
        );
        resolve(serverInstance);
        return;
      } catch (err: any) {
        if (err.code !== "EADDRINUSE") {
          reject(err);
          return;
        }
      }
    }
    reject(new Error("Failed to bind to any port after multiple retries."));
  });
}

export async function startHttpTransport(
  createServerInstanceFn: () => Promise<McpServer>,
  parentContext: RequestContext,
): Promise<ServerType> {
  const app = new Hono<{ Bindings: HonoBindings }>();
  const transportContext = requestContextService.createRequestContext({
    ...parentContext,
    component: "HttpTransportSetup",
  });

  setInterval(() => {
    const now = Date.now();
    const gcContext = requestContextService.createRequestContext({ operation: "SessionGarbageCollector" });
    for (const sessionId in sessionActivity) {
      if (now - sessionActivity[sessionId] > SESSION_TIMEOUT_MS) {
        logger.info(`Session ${sessionId} timed out. Cleaning up.`, { ...gcContext, sessionId });
        httpTransports[sessionId]?.close();
        delete sessionActivity[sessionId];
      }
    }
  }, SESSION_GC_INTERVAL_MS);

  app.use("*", cors({
    origin: config.mcpAllowedOrigins || [],
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Mcp-Session-Id", "Last-Event-ID", "Authorization"],
    credentials: true,
  }));

  app.use("*", async (c, next) => {
    c.res.headers.set("X-Content-Type-Options", "nosniff");
    await next();
  });

  app.use(MCP_ENDPOINT_PATH, async (c, next) => {
    const clientIp = c.req.header("x-forwarded-for")?.split(",")[0].trim() || "unknown_ip";
    const context = requestContextService.createRequestContext({ operation: "httpRateLimitCheck", ipAddress: clientIp });
    try {
      rateLimiter.check(clientIp, context);
      await next();
    } catch (error) {
      const handledError = ErrorHandler.handleError(error, { operation: "rateLimitMiddleware", context });
      return c.json({
        jsonrpc: "2.0",
        error: { code: -32000, message: handledError.message },
        id: (await c.req.json().catch(() => ({})))?.id || null,
      }, 429);
    }
  });

  if (config.mcpAuthMode === "oauth") {
    app.use(MCP_ENDPOINT_PATH, oauthMiddleware);
  } else {
    app.use(MCP_ENDPOINT_PATH, mcpAuthMiddleware);
  }

  app.post(MCP_ENDPOINT_PATH, async (c) => {
    const postContext = requestContextService.createRequestContext({ ...transportContext, operation: "handlePost" });
    let transport: StreamableHTTPServerTransport | undefined;
    try {
      const body = await c.req.json();
      const sessionId = c.req.header("mcp-session-id");
      transport = sessionId ? httpTransports[sessionId] : undefined;
      if (transport && sessionId) sessionActivity[sessionId] = Date.now();

      if (isInitializeRequest(body)) {
        if (transport) {
          logger.warning("Re-initializing existing session.", { ...postContext, sessionId });
          await transport.close();
        }
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newId) => {
            httpTransports[newId] = transport!;
            sessionActivity[newId] = Date.now();
            logger.info(`HTTP Session created: ${newId}`, { ...postContext, newSessionId: newId });
          },
        });
        transport.onclose = () => {
          const closedSessionId = transport!.sessionId;
          if (closedSessionId) {
            delete httpTransports[closedSessionId];
            delete sessionActivity[closedSessionId];
            logger.info(`HTTP Session closed: ${closedSessionId}`, { ...postContext, closedSessionId });
          }
        };
        const server = await createServerInstanceFn();
        await server.connect(transport);
      } else if (!transport) {
        throw new McpError(BaseErrorCode.NOT_FOUND, "Invalid or expired session ID.");
      }

      return await transport.handleRequest(c.env.incoming, c.env.outgoing, body);
    } catch (err) {
      const handledError = ErrorHandler.handleError(err, { operation: "handlePost", context: postContext });
      const requestId = (await c.req.json().catch(() => ({})))?.id || null;
      return c.json({
        jsonrpc: "2.0",
        error: { code: -32603, message: handledError.message },
        id: requestId,
      }, handledError instanceof McpError && handledError.code === BaseErrorCode.NOT_FOUND ? 404 : 500);
    }
  });

  const handleSessionReq = async (c: Context<{ Bindings: HonoBindings }>) => {
    const method = c.req.method;
    const sessionReqContext = requestContextService.createRequestContext({ ...transportContext, operation: `handle${method}` });
    try {
      const sessionId = c.req.header("mcp-session-id");
      const transport = sessionId ? httpTransports[sessionId] : undefined;
      if (!transport) {
        throw new McpError(BaseErrorCode.NOT_FOUND, "Session not found or expired.");
      }
      if (sessionId) sessionActivity[sessionId] = Date.now();
      return await transport.handleRequest(c.env.incoming, c.env.outgoing);
    } catch (err) {
      const handledError = ErrorHandler.handleError(err, { operation: `handle${method}`, context: sessionReqContext });
      return c.json({
        jsonrpc: "2.0",
        error: { code: -32603, message: handledError.message },
        id: null,
      }, handledError instanceof McpError && handledError.code === BaseErrorCode.NOT_FOUND ? 404 : 500);
    }
  };

  app.get(MCP_ENDPOINT_PATH, handleSessionReq);
  app.delete(MCP_ENDPOINT_PATH, handleSessionReq);

  return startHttpServerWithRetry(app, HTTP_PORT, HTTP_HOST, MAX_PORT_RETRIES, transportContext);
}
