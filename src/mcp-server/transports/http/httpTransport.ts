/**
 * @fileoverview Configures and starts the HTTP MCP transport using Hono.
 * This implementation uses the official @hono/mcp package for a fully
 * web-standard, platform-agnostic transport layer.
 * @module src/mcp-server/transports/http/httpTransport
 */
import { StreamableHTTPTransport } from '@hono/mcp';
import { type ServerType, serve } from '@hono/node-server';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import http from 'http';
import { randomUUID } from 'node:crypto';

import { config } from '@/config/index.js';
import { httpErrorHandler } from '@/mcp-server/transports/http/httpErrorHandler.js';
import type { HonoNodeBindings } from '@/mcp-server/transports/http/httpTypes.js';
import { type RequestContext, logger } from '@/utils/index.js';

/**
 * Creates and configures a Hono app wired to an MCP server instance over the
 * Streamable HTTP transport. This adheres to MCP 2025-03-26 HTTP transport spec.
 *
 * Key behaviors:
 * - Single endpoint (configurable path) accepts both GET (status) and ALL (JSON-RPC).
 * - CORS is configured using allowed origins from config.
 * - Errors are routed through a centralized error handler that formats JSON-RPC-compliant errors.
 */
export function createHttpApp(
  mcpServer: McpServer,
  parentContext: RequestContext,
): Hono<{ Bindings: HonoNodeBindings }> {
  const app = new Hono<{ Bindings: HonoNodeBindings }>();
  const transportContext = {
    ...parentContext,
    component: 'HttpTransportSetup',
  };

  // CORS
  app.use(
    '*',
    cors({
      origin: config.mcpAllowedOrigins || [],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'Mcp-Session-Id',
        'MCP-Protocol-Version',
      ],
      exposeHeaders: ['Mcp-Session-Id'],
      credentials: true,
    }),
  );

  // Centralized error handling
  app.onError(httpErrorHandler);

  // Health
  app.get('/healthz', (c) => c.json({ status: 'ok' }));

  // Status/identity at the same MCP endpoint path for convenience (GET)
  app.get(config.mcpHttpEndpointPath, (c) => {
    return c.json({
      status: 'ok',
      server: { name: config.mcpServerName, version: config.mcpServerVersion },
    });
  });

  // JSON-RPC over HTTP (Streamable)
  app.all(config.mcpHttpEndpointPath, async (c) => {
    logger.debug('Handling MCP request.', {
      ...transportContext,
      path: c.req.path,
      method: c.req.method,
    });

    // Use the official StreamableHTTPTransport and assert a non-optional sessionId for TS (exactOptionalPropertyTypes).
    // The MCP server's Transport contract requires `sessionId: string`, while Hono's StreamableHTTPTransport has it optional.
    const transport =
      new StreamableHTTPTransport() as StreamableHTTPTransport & {
        sessionId: string;
      };
    transport.sessionId = c.req.header('mcp-session-id') ?? randomUUID();

    try {
      // The `connect` method expects a Transport with a non-optional sessionId.
      // We ensure it's always a string when creating the transport.
      await mcpServer.connect(transport);
      // Let the transport handle the Hono context; it will stream the response.
      return transport.handleRequest(c);
    } catch (err) {
      // Ensure transport is closed on failure; bubble to onError handler.
      await transport.close?.();
      throw err instanceof Error ? err : new Error(String(err));
    }
  });

  logger.info('Hono application setup complete.', transportContext);
  return app;
}

async function isPortInUse(
  port: number,
  host: string,
  parentContext: RequestContext,
): Promise<boolean> {
  const context = { ...parentContext, operation: 'isPortInUse', port, host };
  logger.debug(`Checking if port ${port} is in use...`, context);
  return new Promise((resolve) => {
    const tempServer = http.createServer();
    tempServer
      .once('error', (err: NodeJS.ErrnoException) =>
        resolve(err.code === 'EADDRINUSE'),
      )
      .once('listening', () => tempServer.close(() => resolve(false)))
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
  const startContext = {
    ...parentContext,
    operation: 'startHttpServerWithRetry',
  };
  logger.info(
    `Attempting to start HTTP server on port ${initialPort} with ${maxRetries} retries.`,
    startContext,
  );

  return new Promise((resolve, reject) => {
    const tryBind = (port: number, attempt: number) => {
      if (attempt > maxRetries + 1) {
        const error = new Error(
          `Failed to bind to any port after ${maxRetries} retries.`,
        );
        logger.fatal(error.message, { ...startContext, port, attempt });
        return reject(error);
      }

      isPortInUse(port, host, { ...startContext, port, attempt })
        .then((inUse) => {
          if (inUse) {
            logger.warning(`Port ${port} is in use, retrying...`, {
              ...startContext,
              port,
              attempt,
            });
            setTimeout(
              () => tryBind(port + 1, attempt + 1),
              config.mcpHttpPortRetryDelayMs,
            );
            return;
          }

          try {
            const serverInstance = serve(
              { fetch: app.fetch, port, hostname: host },
              (info) => {
                const serverAddress = `http://${info.address}:${info.port}${config.mcpHttpEndpointPath}`;
                logger.info(`HTTP transport listening at ${serverAddress}`, {
                  ...startContext,
                  port,
                  address: serverAddress,
                });
                if (process.stdout.isTTY)
                  console.log(`\n🚀 MCP Server running at: ${serverAddress}`);
              },
            );
            resolve(serverInstance);
          } catch (err: unknown) {
            logger.warning(
              `Binding attempt failed for port ${port}, retrying...`,
              { ...startContext, port, attempt, error: String(err) },
            );
            setTimeout(
              () => tryBind(port + 1, attempt + 1),
              config.mcpHttpPortRetryDelayMs,
            );
          }
        })
        .catch((err) =>
          reject(err instanceof Error ? err : new Error(String(err))),
        );
    };

    tryBind(initialPort, 1);
  });
}

export async function startHttpTransport(
  mcpServer: McpServer,
  parentContext: RequestContext,
): Promise<{
  app: Hono<{ Bindings: HonoNodeBindings }>;
  server: ServerType;
}> {
  const transportContext = {
    ...parentContext,
    component: 'HttpTransportStart',
  };
  logger.info('Starting HTTP transport.', transportContext);

  const app = createHttpApp(mcpServer, transportContext);

  const server = await startHttpServerWithRetry(
    app,
    config.mcpHttpPort,
    config.mcpHttpHost,
    config.mcpHttpMaxPortRetries,
    transportContext,
  );

  logger.info('HTTP transport started successfully.', transportContext);
  return { app, server };
}
