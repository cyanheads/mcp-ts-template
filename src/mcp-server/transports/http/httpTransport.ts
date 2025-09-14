/**
 * @fileoverview Configures and starts the HTTP MCP transport using Hono.
 * This file has been refactored to correctly integrate Hono's streaming
 * capabilities with the Model Context Protocol SDK's transport layer.
 * @module src/mcp-server/transports/http/httpTransport
 */
import { type ServerType, serve } from '@hono/node-server';
import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { stream } from 'hono/streaming';
import http from 'http';
import { container } from 'tsyringe';

import { config } from '@/config/index.js';
import {
  RateLimiterService,
  TransportManagerToken,
} from '@/container/index.js';
import {
  RateLimiter,
  type RequestContext,
  logger,
  requestContextService,
} from '@/utils/index.js';
import {
  createAuthMiddleware,
  createAuthStrategy,
} from '@/mcp-server/transports/auth/index.js';
import {
  StatefulTransportManager,
  type TransportManager,
} from '@/mcp-server/transports/core/index.js';
import { httpErrorHandler } from '@/mcp-server/transports/http/httpErrorHandler.js';
import type { HonoNodeBindings } from '@/mcp-server/transports/http/httpTypes.js';
import { mcpTransportMiddleware } from '@/mcp-server/transports/http/mcpTransportMiddleware.js';

const HTTP_PORT = config.mcpHttpPort;
const HTTP_HOST = config.mcpHttpHost;
const MCP_ENDPOINT_PATH = config.mcpHttpEndpointPath;

function getClientIp(c: Context<{ Bindings: HonoNodeBindings }>): string {
  const forwardedFor = c.req.header('x-forwarded-for');
  return (
    (forwardedFor?.split(',')[0] ?? '').trim() ||
    c.req.header('x-real-ip') ||
    'unknown_ip'
  );
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
                const serverAddress = `http://${info.address}:${info.port}${MCP_ENDPOINT_PATH}`;
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

export function createHttpApp(
  parentContext: RequestContext,
): Hono<{ Bindings: HonoNodeBindings }> {
  const app = new Hono<{ Bindings: HonoNodeBindings }>();
  const transportContext = {
    ...parentContext,
    component: 'HttpTransportSetup',
  };
  logger.info('Creating Hono HTTP application.', transportContext);

  const transportManager = container.resolve<TransportManager>(
    TransportManagerToken,
  );
  const rateLimiter = container.resolve<RateLimiter>(RateLimiterService);

  app.use(
    '*',
    cors({
      origin: config.mcpAllowedOrigins || [],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'Mcp-Session-Id',
        'Last-Event-ID',
        'Authorization',
      ],
      credentials: true,
    }),
  );

  app.use('*', (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff');
    return next();
  });

  app.use(MCP_ENDPOINT_PATH, async (c, next) => {
    const clientIp = getClientIp(c);
    const context = requestContextService.createRequestContext({
      operation: 'httpRateLimitCheck',
      ipAddress: clientIp,
    });
    try {
      rateLimiter.check(clientIp, context);
      logger.debug('Rate limit check passed.', context);
    } catch (error) {
      logger.warning('Rate limit check failed.', {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    await next();
  });

  const authStrategy = createAuthStrategy();
  if (authStrategy) {
    app.use(MCP_ENDPOINT_PATH, createAuthMiddleware(authStrategy));
  }

  app.onError(httpErrorHandler);

  app.get('/healthz', (c) => c.json({ status: 'ok' }));

  app.get(MCP_ENDPOINT_PATH, (c) => {
    if (c.req.header('mcp-session-id')) {
      return c.text(
        'GET requests to existing sessions are not supported.',
        405,
      );
    }
    const selectedSessionMode =
      transportManager instanceof StatefulTransportManager
        ? transportManager.getMode()
        : config.mcpSessionMode;
    return c.json({
      status: 'ok',
      server: { name: config.mcpServerName, version: config.mcpServerVersion },
      sessionMode: selectedSessionMode,
    });
  });

  app.post(MCP_ENDPOINT_PATH, mcpTransportMiddleware(transportManager), (c) => {
    const response = c.get('mcpResponse');
    if (response.sessionId) c.header('Mcp-Session-Id', response.sessionId);
    response.headers.forEach((v, k) => c.header(k, v));
    c.status(response.statusCode);
    if (response.type === 'stream') {
      return stream(c, (s) => s.pipe(response.stream));
    }
    // By exclusion, response must be 'buffered' here
    return c.json(response.body ?? {});
  });

  app.delete(MCP_ENDPOINT_PATH, async (c) => {
    const sessionId = c.req.header('mcp-session-id');
    const context = requestContextService.createRequestContext({
      ...transportContext,
      operation: 'handleDeleteRequest',
      sessionId,
    });
    if (sessionId && transportManager instanceof StatefulTransportManager) {
      const response = await transportManager.handleDeleteRequest(
        sessionId,
        context,
      );
      if (response.type === 'buffered') {
        return c.json(response.body ?? {}, response.statusCode);
      }
      // Fallback for unexpected stream response on DELETE
      return c.body(null, response.statusCode);
    }
    return c.json({ message: 'Session ID required or invalid mode.' }, 400);
  });

  logger.info('Hono application setup complete.', transportContext);
  return app;
}

export async function startHttpTransport(
  parentContext: RequestContext,
): Promise<{
  app: Hono<{ Bindings: HonoNodeBindings }>;
  server: ServerType;
  transportManager: TransportManager;
}> {
  const transportContext = {
    ...parentContext,
    component: 'HttpTransportStart',
  };
  logger.info('Starting HTTP transport.', transportContext);

  const app = createHttpApp(transportContext);
  const transportManager = container.resolve<TransportManager>(
    TransportManagerToken,
  );

  const server = await startHttpServerWithRetry(
    app,
    HTTP_PORT,
    HTTP_HOST,
    config.mcpHttpMaxPortRetries,
    transportContext,
  );

  logger.info('HTTP transport started successfully.', transportContext);
  return { app, server, transportManager };
}
