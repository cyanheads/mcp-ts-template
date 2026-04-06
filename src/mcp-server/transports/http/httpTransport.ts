/**
 * @fileoverview Configures and starts the HTTP MCP transport using Hono.
 * This implementation uses the official @hono/mcp package for a fully
 * web-standard, platform-agnostic transport layer.
 *
 * Implements MCP Specification 2025-06-18 Streamable HTTP Transport.
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http | MCP Streamable HTTP Transport}
 * @module src/mcp-server/transports/http/httpTransport
 */

import http from 'node:http';
import { StreamableHTTPTransport } from '@hono/mcp';
import { type ServerType, serve } from '@hono/node-server';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/sdk/types.js';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config, FRAMEWORK_NAME, FRAMEWORK_VERSION } from '@/config/index.js';
import { createAuthStrategy } from '@/mcp-server/transports/auth/authFactory.js';
import { createAuthMiddleware } from '@/mcp-server/transports/auth/authMiddleware.js';
import { authContext } from '@/mcp-server/transports/auth/lib/authContext.js';
import { httpErrorHandler } from '@/mcp-server/transports/http/httpErrorHandler.js';
import type { HonoNodeBindings, ServerMeta } from '@/mcp-server/transports/http/httpTypes.js';
import { protectedResourceMetadataHandler } from '@/mcp-server/transports/http/protectedResourceMetadata.js';
import { generateSecureSessionId } from '@/mcp-server/transports/http/sessionIdUtils.js';
import { type SessionIdentity, SessionStore } from '@/mcp-server/transports/http/sessionStore.js';
import { logger } from '@/utils/internal/logger.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';
import { logStartupBanner } from '@/utils/internal/startupBanner.js';
import { createObservableGauge } from '@/utils/telemetry/metrics.js';

/**
 * Extends the base StreamableHTTPTransport to include a session ID.
 */
class McpSessionTransport extends StreamableHTTPTransport {
  public sessionId: string;

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
  }
}

/**
 * Creates a Hono HTTP application for the MCP server.
 *
 * This function is generic and can create apps with different binding types:
 * - Node.js environments use HonoNodeBindings (default)
 * - Cloudflare Workers use CloudflareBindings
 *
 * The function itself doesn't access bindings; they're only used at runtime
 * when the app processes requests in its specific environment.
 *
 * @template TBindings - The Hono binding type (must extend object, defaults to HonoNodeBindings for Node.js)
 * @param mcpServer - The MCP server instance
 * @param parentContext - Parent request context for logging
 * @returns Configured Hono application with the specified binding type
 */
export async function createHttpApp<TBindings extends object = HonoNodeBindings>(
  serverFactory: () => Promise<McpServer>,
  parentContext: RequestContext,
  meta: ServerMeta,
): Promise<{ app: Hono<{ Bindings: TBindings }>; sessionStore: SessionStore | null }> {
  const { definitionCounts, extensions } = meta;
  const app = new Hono<{ Bindings: TBindings }>();
  const transportContext = {
    ...parentContext,
    component: 'HttpTransportSetup',
  };

  // Initialize session store for stateful mode.
  // 'auto' resolves to stateful for HTTP (per MCP spec conformance).
  const isStateful = config.mcpSessionMode === 'stateful' || config.mcpSessionMode === 'auto';
  const sessionStore = isStateful
    ? new SessionStore(config.mcpStatefulSessionStaleTimeoutMs)
    : null;

  // Wire session count to OTel observable gauge for durable metrics.
  // Registered unconditionally so the series exists from startup (reports 0 when stateless/stdio).
  createObservableGauge(
    'mcp.sessions.active',
    'Number of active MCP sessions',
    () => sessionStore?.getSessionCount() ?? 0,
    '{sessions}',
  );

  // OpenTelemetry request tracing — outermost middleware on the MCP endpoint
  // so the span captures the full lifecycle (CORS, auth, handler).
  // On Bun, Node.js HTTP auto-instrumentation is a no-op; this fills that gap.
  // @hono/otel is a Tier 3 optional peer — lazy import inside the guard.
  if (config.openTelemetry.enabled) {
    try {
      const { httpInstrumentationMiddleware } = await import('@hono/otel');
      app.use(
        config.mcpHttpEndpointPath,
        httpInstrumentationMiddleware({
          captureRequestHeaders: ['mcp-session-id'],
        }),
      );
      logger.debug('OTel request tracing middleware enabled for MCP endpoint.', transportContext);
    } catch {
      logger.warning(
        '@hono/otel not installed — HTTP instrumentation disabled. Install with: bun add @hono/otel',
        transportContext,
      );
    }
  }

  // CORS (with permissive fallback)
  const allowedOrigin =
    Array.isArray(config.mcpAllowedOrigins) && config.mcpAllowedOrigins.length > 0
      ? config.mcpAllowedOrigins
      : '*';

  if (allowedOrigin === '*') {
    logger.warning(
      'CORS origin set to wildcard (*). Set MCP_ALLOWED_ORIGINS for production deployments.',
      transportContext,
    );
  }

  // Per Fetch spec, Access-Control-Allow-Origin: * with
  // Access-Control-Allow-Credentials: true is invalid — browsers reject the
  // preflight. Only enable credentials when origin is explicitly configured.
  app.use(
    '*',
    cors({
      origin: allowedOrigin,
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'Mcp-Session-Id', 'MCP-Protocol-Version'],
      exposeHeaders: ['Mcp-Session-Id'],
      ...(allowedOrigin !== '*' && { credentials: true }),
    }),
  );

  // Centralized error handling
  app.onError(httpErrorHandler);

  // MCP Spec 2025-06-18: Origin header validation for DNS rebinding protection
  // https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#security-warning
  app.use(config.mcpHttpEndpointPath, async (c, next) => {
    const origin = c.req.header('origin');
    if (origin) {
      const isAllowed =
        allowedOrigin === '*' || (Array.isArray(allowedOrigin) && allowedOrigin.includes(origin));

      if (!isAllowed) {
        logger.warning('Rejected request with invalid Origin header', {
          ...transportContext,
          origin,
          allowedOrigins: allowedOrigin,
        });
        return c.json({ error: 'Invalid origin. DNS rebinding protection.' }, 403);
      }
    }
    // Origin is valid or not present, continue
    return await next();
  });

  // Health and GET /mcp status remain unprotected for convenience
  app.get('/healthz', (c) => c.json({ status: 'ok' }));

  // RFC 9728 Protected Resource Metadata — always mounted, unauthenticated
  // https://datatracker.ietf.org/doc/html/rfc9728
  app.get('/.well-known/oauth-protected-resource', protectedResourceMetadataHandler);

  // MCP Spec 2025-06-18: GET with Accept: text/event-stream opens an SSE stream
  // for server-initiated messages. Plain GET (browser, health check) returns info.
  //
  // Security: When auth is enabled, unauthenticated plain-GET callers receive only
  // { status: 'ok' }. Full server metadata is gated behind authentication to
  // avoid leaking server name, version, environment, and capability details.
  // SSE requests always fall through to the auth middleware + transport handler.
  app.get(config.mcpHttpEndpointPath, (c, next) => {
    if (c.req.header('accept')?.includes('text/event-stream')) {
      return next(); // Fall through to transport handler for SSE
    }

    // When auth is enabled, this handler runs before auth middleware.
    // Return minimal info to avoid leaking server metadata to unauthenticated callers.
    if (config.mcpAuthMode !== 'none') {
      return c.json({ status: 'ok' });
    }

    return c.json({
      status: 'ok',
      server: {
        name: config.mcpServerName,
        version: config.mcpServerVersion,
        description: config.mcpServerDescription,
        ...(config.mcpServerHomepage && { homepage: config.mcpServerHomepage }),
        environment: config.environment,
        transport: config.mcpTransportType,
        sessionMode: config.mcpSessionMode,
      },
      protocolVersions: SUPPORTED_PROTOCOL_VERSIONS,
      capabilities: {
        logging: true,
        prompts: definitionCounts.prompts > 0,
        resources: definitionCounts.resources > 0,
        tools: definitionCounts.tools > 0,
      },
      extensions: {
        'io.modelcontextprotocol/ui': 'io.modelcontextprotocol/ui' in (extensions ?? {}),
      },
      framework: {
        name: FRAMEWORK_NAME,
        version: FRAMEWORK_VERSION,
        homepage: 'https://github.com/cyanheads/mcp-ts-core',
      },
      auth: {
        mode: config.mcpAuthMode,
      },
    });
  });

  // Create auth strategy and middleware if auth is enabled
  // IMPORTANT: Auth middleware must be registered BEFORE route handlers
  // so Hono applies it to all subsequent routes on this path.
  const authStrategy = createAuthStrategy();
  if (authStrategy) {
    const authMiddleware = createAuthMiddleware(authStrategy);
    app.use(config.mcpHttpEndpointPath, authMiddleware);
    logger.info('Authentication middleware enabled for MCP endpoint.', transportContext);
  } else {
    logger.info('Authentication is disabled; MCP endpoint is unprotected.', transportContext);
  }

  /** Extract session identity from the current auth context (ALS). */
  function extractSessionIdentity(): SessionIdentity | undefined {
    const authInfo = authContext.getStore()?.authInfo;
    if (!authInfo) return;
    return Object.fromEntries(
      Object.entries({
        tenantId: authInfo.tenantId,
        clientId: authInfo.clientId,
        subject: authInfo.subject,
      }).filter(([, v]) => v != null),
    ) as SessionIdentity;
  }

  // MCP Spec 2025-06-18: DELETE endpoint for session termination
  // Clients SHOULD send DELETE to explicitly terminate sessions
  // https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#session-management
  app.delete(config.mcpHttpEndpointPath, (c) => {
    const sessionId = c.req.header('mcp-session-id');

    if (!sessionId) {
      logger.warning('DELETE request without session ID', transportContext);
      return c.json({ error: 'Mcp-Session-Id header required' }, 400);
    }

    logger.info('Session termination requested', {
      ...transportContext,
      sessionId,
    });

    // For stateless mode or if session management is disabled, return 405
    if (config.mcpSessionMode === 'stateless' || !sessionStore) {
      return c.json({ error: 'Session termination not supported in stateless mode' }, 405);
    }

    // SECURITY: Validate session ownership before termination
    const sessionIdentity = extractSessionIdentity();

    if (!sessionStore.isValidForIdentity(sessionId, sessionIdentity)) {
      logger.warning('Session termination rejected - ownership validation failed', {
        ...transportContext,
        sessionId,
        requestTenant: sessionIdentity?.tenantId,
        requestClient: sessionIdentity?.clientId,
      });
      return c.json({ error: 'Session not found or access denied' }, 404);
    }

    // Terminate the session in the store
    sessionStore.terminate(sessionId);

    logger.info('Session terminated successfully', {
      ...transportContext,
      sessionId,
    });

    return c.json({ status: 'terminated', sessionId }, 200);
  });

  // JSON-RPC over HTTP (Streamable)
  app.all(config.mcpHttpEndpointPath, async (c) => {
    const protocolVersion = c.req.header('mcp-protocol-version') ?? '2025-03-26';
    logger.debug('Handling MCP request.', {
      ...transportContext,
      path: c.req.path,
      method: c.req.method,
      protocolVersion,
    });

    // Per MCP Spec 2025-06-18: MCP-Protocol-Version header MUST be validated
    // Server MUST respond with 400 Bad Request for unsupported versions
    // We default to 2025-03-26 for backward compatibility if not provided
    const supportedVersions = SUPPORTED_PROTOCOL_VERSIONS;
    if (!supportedVersions.includes(protocolVersion)) {
      logger.warning('Unsupported MCP protocol version requested.', {
        ...transportContext,
        protocolVersion,
        supportedVersions,
      });
      return c.json(
        {
          error: 'Unsupported MCP protocol version',
          protocolVersion,
          supportedVersions,
        },
        400,
      );
    }

    const providedSessionId = c.req.header('mcp-session-id');

    // Extract identity from auth context (if auth is enabled)
    // This MUST happen before session validation for security
    const sessionIdentity = extractSessionIdentity();

    // MCP Spec 2025-06-18: Return 404 for invalid/terminated sessions
    // https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#session-management
    // SECURITY: Validate session WITH identity binding to prevent hijacking
    if (
      sessionStore &&
      providedSessionId &&
      !sessionStore.isValidForIdentity(providedSessionId, sessionIdentity)
    ) {
      logger.warning('Session validation failed - invalid or hijacked session', {
        ...transportContext,
        sessionId: providedSessionId,
        requestTenant: sessionIdentity?.tenantId,
        requestClient: sessionIdentity?.clientId,
      });
      return c.json({ error: 'Session not found or expired' }, 404);
    }

    // Defer session minting for stateful mode: only assign a session ID to
    // requests that already carry one (returning clients) or after the SDK
    // processes the request (new initialize handshakes). This prevents
    // allocating sessions for requests that will fail protocol validation.
    const sessionId = providedSessionId ?? generateSecureSessionId();

    const transport = new McpSessionTransport(sessionId);

    const handleRpc = async (): Promise<Response> => {
      // SDK 1.26.0: Protocol.connect() throws if already connected.
      // Create a fresh McpServer per request to prevent cross-client data leaks.
      // See GHSA-345p-7cg4-v4c7.
      const server = await serverFactory();
      await server.connect(transport);
      const response = await transport.handleRequest(c);

      if (response) {
        // Only register the session in the store AFTER a successful response.
        // This avoids minting sessions for requests that fail protocol
        // validation (e.g. tools/list without prior initialize).
        if (sessionStore && response.ok) {
          sessionStore.getOrCreate(sessionId, sessionIdentity);
        }

        // MCP Spec 2025-06-18: For stateful sessions, return Mcp-Session-Id header
        // in InitializeResponse (and all subsequent responses).
        // 'auto' resolves to stateful for HTTP, matching the SessionStore creation above.
        if (isStateful && response.ok) {
          response.headers.set('Mcp-Session-Id', sessionId);
          logger.debug('Added Mcp-Session-Id header to response', {
            ...transportContext,
            sessionId,
          });
        }

        // For non-SSE responses (standard JSON-RPC POST), close the per-request
        // server/transport in a microtask so the Response is returned first.
        // SSE streams must stay open — closing would abort the ReadableStream
        // before Hono can consume it (see GHSA-345p-7cg4-v4c7 comment above).
        const isSSE = response.headers.get('content-type')?.includes('text/event-stream');
        if (!isSSE) {
          queueMicrotask(() => {
            transport.close().catch((closeErr: unknown) => {
              logger.debug('Failed to close transport after non-SSE response', {
                ...transportContext,
                sessionId,
                error: closeErr instanceof Error ? closeErr.message : String(closeErr),
              });
            });
            server.close().catch((closeErr: unknown) => {
              logger.debug('Failed to close server after non-SSE response', {
                ...transportContext,
                sessionId,
                error: closeErr instanceof Error ? closeErr.message : String(closeErr),
              });
            });
          });
        }

        return response;
      }
      return c.body(null, 204);
    };

    // Auth context is already populated by the middleware's authContext.run().
    // ALS propagates through all async continuations in this handler.
    try {
      return await handleRpc();
    } catch (err) {
      // On error, close transport immediately (success-path cleanup is handled
      // inside handleRpc — non-SSE via microtask, SSE left open for the stream).
      await transport.close().catch((closeErr: unknown) => {
        logger.debug('Failed to close transport after error', {
          ...transportContext,
          sessionId,
          error: closeErr instanceof Error ? closeErr.message : String(closeErr),
        });
      });
      throw err instanceof Error ? err : new Error(String(err));
    }
  });

  logger.info('Hono application setup complete.', transportContext);
  return { app, sessionStore };
}

function isPortInUse(port: number, host: string, parentContext: RequestContext): Promise<boolean> {
  const context = { ...parentContext, operation: 'isPortInUse', port, host };
  logger.debug(`Checking if port ${port} is in use...`, context);
  return new Promise((resolve) => {
    const tempServer = http.createServer();
    tempServer
      .once('error', (err: NodeJS.ErrnoException) => resolve(err.code === 'EADDRINUSE'))
      .once('listening', () => tempServer.close(() => resolve(false)))
      .listen(port, host);
  });
}

function startHttpServerWithRetry<TBindings extends object = HonoNodeBindings>(
  app: Hono<{ Bindings: TBindings }>,
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

  const { promise, resolve, reject } = Promise.withResolvers<ServerType>();

  const tryBind = (port: number, attempt: number) => {
    if (attempt > maxRetries + 1) {
      const error = new Error(`Failed to bind to any port after ${maxRetries} retries.`);
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
          setTimeout(() => tryBind(port + 1, attempt + 1), config.mcpHttpPortRetryDelayMs);
          return;
        }

        try {
          const serverInstance = serve({ fetch: app.fetch, port, hostname: host }, (info) => {
            const serverAddress = `http://${info.address}:${info.port}${config.mcpHttpEndpointPath}`;
            logger.info(`HTTP transport listening at ${serverAddress}`, {
              ...startContext,
              port,
              address: serverAddress,
            });
            logStartupBanner(`\n🚀 MCP Server running at: ${serverAddress}`, 'http');
          });
          resolve(serverInstance);
        } catch (err: unknown) {
          logger.warning(`Binding attempt failed for port ${port}, retrying...`, {
            ...startContext,
            port,
            attempt,
            error: String(err),
          });
          setTimeout(() => tryBind(port + 1, attempt + 1), config.mcpHttpPortRetryDelayMs);
        }
      })
      .catch((err) => reject(err instanceof Error ? err : new Error(String(err))));
  };

  tryBind(initialPort, 1);
  return promise;
}

/**
 * Handle returned by {@link startHttpTransport} bundling the HTTP server
 * and a shutdown function that cleans up all associated resources
 * (session store intervals, etc.).
 */
export interface HttpTransportHandle {
  server: ServerType;
  stop: (parentContext: RequestContext) => Promise<void>;
}

export async function startHttpTransport(
  serverFactory: () => Promise<McpServer>,
  parentContext: RequestContext,
  meta: ServerMeta,
): Promise<HttpTransportHandle> {
  const transportContext = {
    ...parentContext,
    component: 'HttpTransportStart',
  };
  logger.info('Starting HTTP transport.', transportContext);

  const { app, sessionStore } = await createHttpApp(serverFactory, transportContext, meta);

  const server = await startHttpServerWithRetry(
    app,
    config.mcpHttpPort,
    config.mcpHttpHost,
    config.mcpHttpMaxPortRetries,
    transportContext,
  );

  logger.info('HTTP transport started successfully.', transportContext);

  return {
    server,
    stop: (ctx: RequestContext) => stopHttpTransport(server, sessionStore, ctx),
  };
}

/** Max time (ms) to wait for in-flight connections (e.g. SSE streams) to drain. */
const DRAIN_TIMEOUT_MS = 5_000;

function stopHttpTransport(
  server: ServerType,
  sessionStore: SessionStore | null,
  parentContext: RequestContext,
): Promise<void> {
  const operationContext = {
    ...parentContext,
    operation: 'stopHttpTransport',
    transportType: 'Http',
  };
  logger.info('Attempting to stop http transport...', operationContext);

  sessionStore?.destroy();

  return new Promise((resolve, reject) => {
    // Force-close all connections (including pre-existing SSE streams) after a
    // grace period. server.closeAllConnections() (Node 18.2+) covers sockets
    // that were already alive before server.close() — unlike the `connection`
    // event which only fires for new arrivals.
    const drainTimer = setTimeout(() => {
      logger.warning('Drain timeout reached — force-closing all connections.', operationContext);
      (server as http.Server).closeAllConnections();
    }, DRAIN_TIMEOUT_MS);
    drainTimer.unref();

    server.close((err) => {
      clearTimeout(drainTimer);
      if (err) {
        logger.error('Error closing HTTP server.', err, operationContext);
        return reject(err);
      }
      logger.info('HTTP server closed successfully.', operationContext);
      resolve();
    });
  });
}
