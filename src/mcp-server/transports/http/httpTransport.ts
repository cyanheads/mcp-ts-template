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
import {
  authContext,
  createAuthStrategy,
} from '@/mcp-server/transports/auth/index.js';
import { httpErrorHandler } from '@/mcp-server/transports/http/httpErrorHandler.js';
import type { HonoNodeBindings } from '@/mcp-server/transports/http/httpTypes.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { type RequestContext, logger } from '@/utils/index.js';

export function createHttpApp(
  mcpServer: McpServer,
  parentContext: RequestContext,
): Hono<{ Bindings: HonoNodeBindings }> {
  const app = new Hono<{ Bindings: HonoNodeBindings }>();
  const transportContext = {
    ...parentContext,
    component: 'HttpTransportSetup',
  };

  // CORS (with permissive fallback)
  const allowedOrigin =
    Array.isArray(config.mcpAllowedOrigins) &&
    config.mcpAllowedOrigins.length > 0
      ? config.mcpAllowedOrigins
      : '*';

  app.use(
    '*',
    cors({
      origin: allowedOrigin,
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

  // Health and GET /mcp status remain unprotected for convenience
  app.get('/healthz', (c) => c.json({ status: 'ok' }));

  app.get(config.mcpHttpEndpointPath, (c) => {
    return c.json({
      status: 'ok',
      server: {
        name: config.mcpServerName,
        version: config.mcpServerVersion,
        description: config.mcpServerDescription,
        environment: config.environment,
        transport: config.mcpTransportType,
        sessionMode: config.mcpSessionMode,
      },
    });
  });

  // JSON-RPC over HTTP (Streamable) with auth when enabled
  app.all(config.mcpHttpEndpointPath, async (c) => {
    logger.debug('Handling MCP request.', {
      ...transportContext,
      path: c.req.path,
      method: c.req.method,
    });

    const transport =
      new StreamableHTTPTransport() as StreamableHTTPTransport & {
        sessionId: string;
      };
    transport.sessionId = c.req.header('mcp-session-id') ?? randomUUID();

    const handleRpc = async (): Promise<Response> => {
      await mcpServer.connect(transport);
      const response = await transport.handleRequest(c);
      if (response) {
        return response;
      }
      // handleRequest may return undefined for notifications.
      // Return 204 No Content as per HTTP best practices for such cases.
      return c.body(null, 204);
    };

    const protectRpc = config.mcpAuthMode !== 'none';

    try {
      if (!protectRpc) {
        return await handleRpc();
      }

      const authHeader = c.req.header('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warning(
          'Authorization header missing or invalid (HTTP JSON-RPC).',
          {
            ...transportContext,
            method: c.req.method,
            path: c.req.path,
          },
        );
        throw new McpError(
          JsonRpcErrorCode.Unauthorized,
          'Missing or invalid Authorization header. Bearer scheme required.',
          transportContext,
        );
      }

      const strategy = createAuthStrategy();
      if (!strategy) {
        logger.warning(
          'Auth mode indicates protection, but no strategy was created. Proceeding unauthenticated.',
          transportContext,
        );
        return await handleRpc();
      }

      const token = authHeader.substring(7);
      const authInfo = await strategy.verify(token);

      return await authContext.run({ authInfo }, async () => {
        return await handleRpc();
      });
    } catch (err) {
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
