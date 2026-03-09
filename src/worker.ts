/**
 * @fileoverview Cloudflare Worker entry point for the MCP TypeScript Template.
 * This script adapts the existing MCP server to run in a serverless environment.
 * It initializes the core application logic, creates the Hono app, and exports
 * it for the Cloudflare Workers runtime with support for bindings (KV, R2, D1, AI).
 * @module src/worker
 */
import type {
  Ai,
  IncomingRequestCfProperties as CfProperties,
  D1Database,
  KVNamespace,
  R2Bucket,
  ScheduledController,
} from '@cloudflare/workers-types';
import type { Hono } from 'hono';
import { composeContainer } from '@/container/index.js';
import { createMcpServerInstance } from '@/mcp-server/server.js';
import { createHttpApp } from '@/mcp-server/transports/http/httpTransport.js';
import { logger, type McpLogLevel } from '@/utils/internal/logger.js';
import { initHighResTimer } from '@/utils/internal/performance.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

/**
 * Define Cloudflare Worker Bindings with proper type safety.
 * These bindings are configured in wrangler.toml and injected at runtime.
 */
export interface CloudflareBindings {
  // Cloudflare AI for inference
  AI?: Ai;

  // D1 Database for relational data
  DB?: D1Database;

  // Environment variables (secrets)
  ENVIRONMENT?: string;
  // KV Namespace for fast key-value storage
  KV_NAMESPACE?: KVNamespace;
  LOG_LEVEL?: string;
  MCP_ALLOWED_ORIGINS?: string;
  MCP_AUTH_SECRET_KEY?: string;
  OAUTH_AUDIENCE?: string;
  OAUTH_ISSUER_URL?: string;
  OAUTH_JWKS_URI?: string;
  OPENROUTER_API_KEY?: string;
  OTEL_ENABLED?: string;
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;

  // R2 Bucket for object storage
  R2_BUCKET?: R2Bucket;
  SPEECH_STT_API_KEY?: string;
  SPEECH_STT_ENABLED?: string;
  SPEECH_TTS_API_KEY?: string;
  SPEECH_TTS_ENABLED?: string;
  STORAGE_PROVIDER_TYPE?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_URL?: string;
}

/**
 * Define the complete Hono environment for the worker.
 * This type is used to configure the Hono app with Cloudflare-specific bindings.
 */
type WorkerEnv = {
  Bindings: CloudflareBindings;
};

/** Core string bindings injected into process.env for config parsing. */
const CORE_ENV_BINDINGS: ReadonlyArray<[keyof CloudflareBindings, string]> = [
  ['ENVIRONMENT', 'NODE_ENV'],
  ['LOG_LEVEL', 'MCP_LOG_LEVEL'],
  ['MCP_AUTH_SECRET_KEY', 'MCP_AUTH_SECRET_KEY'],
  ['OPENROUTER_API_KEY', 'OPENROUTER_API_KEY'],
  ['SUPABASE_URL', 'SUPABASE_URL'],
  ['SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
  ['STORAGE_PROVIDER_TYPE', 'STORAGE_PROVIDER_TYPE'],
  ['OAUTH_ISSUER_URL', 'OAUTH_ISSUER_URL'],
  ['OAUTH_AUDIENCE', 'OAUTH_AUDIENCE'],
  ['OAUTH_JWKS_URI', 'OAUTH_JWKS_URI'],
  ['MCP_ALLOWED_ORIGINS', 'MCP_ALLOWED_ORIGINS'],
  ['SPEECH_TTS_ENABLED', 'SPEECH_TTS_ENABLED'],
  ['SPEECH_TTS_API_KEY', 'SPEECH_TTS_API_KEY'],
  ['SPEECH_STT_ENABLED', 'SPEECH_STT_ENABLED'],
  ['SPEECH_STT_API_KEY', 'SPEECH_STT_API_KEY'],
  ['OTEL_ENABLED', 'OTEL_ENABLED'],
  ['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'],
  ['OTEL_EXPORTER_OTLP_METRICS_ENDPOINT', 'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT'],
] as const;

/** Core object bindings stored on globalThis for storage/AI providers. */
const CORE_OBJECT_BINDINGS: ReadonlyArray<[keyof CloudflareBindings, string]> = [
  ['KV_NAMESPACE', 'KV_NAMESPACE'],
  ['R2_BUCKET', 'R2_BUCKET'],
  ['DB', 'DB'],
  ['AI', 'AI'],
] as const;

// Use a Promise to ensure the app is only initialized once per worker instance.
let appPromise: Promise<Hono<WorkerEnv>> | null = null;

/**
 * Injects Cloudflare environment variables into process.env for consumption
 * by the config module. This enables seamless environment variable access
 * across local and Worker environments.
 */
function injectEnvVars(env: CloudflareBindings): void {
  if (typeof process === 'undefined') return;
  for (const [bindingKey, processKey] of CORE_ENV_BINDINGS) {
    const value = env[bindingKey];
    if (typeof value === 'string' && value.trim() !== '') {
      process.env[processKey] = value;
    }
  }
}

/**
 * Stores bindings globally for access by storage providers.
 * This is necessary because R2/KV providers need runtime binding instances.
 */
function storeBindings(env: CloudflareBindings): void {
  for (const [bindingKey, globalKey] of CORE_OBJECT_BINDINGS) {
    const value = env[bindingKey];
    if (value != null) {
      Object.assign(globalThis, { [globalKey]: value });
    }
  }
}

/**
 * Initializes the Hono application with proper error handling and observability.
 * This function is idempotent and returns a cached promise after first invocation.
 */
function initializeApp(env: CloudflareBindings): Promise<Hono<WorkerEnv>> {
  if (appPromise) {
    return appPromise;
  }

  appPromise = (async () => {
    const initStartTime = Date.now();

    try {
      // Set a process-level flag to indicate a serverless environment.
      if (typeof process !== 'undefined' && process.env) {
        process.env.IS_SERVERLESS = 'true';
      } else {
        Object.assign(globalThis, { IS_SERVERLESS: true });
      }

      // Initialize core services lazily.
      composeContainer();
      await initHighResTimer();

      // Initialize logger with level from env or default to 'info'
      // Workers always use HTTP transport (no STDIO support)
      const logLevel = env.LOG_LEVEL?.toLowerCase() ?? 'info';
      // Validate log level against the canonical McpLogLevel type from the logger module
      const validLogLevels: McpLogLevel[] = [
        'debug',
        'info',
        'notice',
        'warning',
        'error',
        'crit',
        'alert',
        'emerg',
      ];
      const validatedLogLevel = validLogLevels.includes(logLevel as McpLogLevel)
        ? (logLevel as McpLogLevel)
        : 'info';
      await logger.initialize(validatedLogLevel, 'http');

      // Create a root context for the worker's lifecycle.
      const workerContext = requestContextService.createRequestContext({
        operation: 'WorkerInitialization',
        isServerless: true,
      });

      logger.info('Cloudflare Worker initializing...', {
        ...workerContext,
        environment: env.ENVIRONMENT ?? 'production',
        storageProvider: env.STORAGE_PROVIDER_TYPE ?? 'in-memory',
      });

      // Create the Hono application with Cloudflare Worker bindings.
      // Pass server factory so each request gets a fresh McpServer+transport pair
      // (SDK 1.26.0 security fix — GHSA-345p-7cg4-v4c7)
      const { app } = createHttpApp<CloudflareBindings>(createMcpServerInstance, workerContext);

      const initDuration = Date.now() - initStartTime;
      logger.info('Cloudflare Worker initialized successfully.', {
        ...workerContext,
        initDurationMs: initDuration,
      });

      return app;
    } catch (error: unknown) {
      const initDuration = Date.now() - initStartTime;
      const errorContext = requestContextService.createRequestContext({
        operation: 'WorkerInitialization',
        isServerless: true,
        initDurationMs: initDuration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      logger.crit(
        'Failed to initialize Cloudflare Worker.',
        error instanceof Error ? error : new Error(String(error)),
        errorContext,
      );

      // Reset appPromise to allow retry on next request
      appPromise = null;

      throw error;
    }
  })();

  return appPromise;
}

/**
 * The default export for Cloudflare Workers runtime.
 * Implements the standard Worker interface with fetch, scheduled, and optional handlers.
 */
export default {
  /**
   * Handles incoming HTTP requests.
   * Extracts Worker-specific metadata and passes it to the request context.
   */
  async fetch(request: Request, env: CloudflareBindings, ctx: ExecutionContext): Promise<Response> {
    try {
      // Refresh bindings on every request — Cloudflare may rotate
      // binding references between requests within the same isolate.
      injectEnvVars(env);
      storeBindings(env);

      const app = await initializeApp(env);

      // Extract Cloudflare-specific request metadata
      // TypeScript doesn't know about the cf property, but it's added by Cloudflare runtime
      type RequestWithCf = Request & { cf?: CfProperties };
      const cfProperties = (request as RequestWithCf).cf;
      const requestId = request.headers.get('cf-ray') ?? crypto.randomUUID();

      // Create enhanced request context with Worker metadata
      const requestContext = requestContextService.createRequestContext({
        operation: 'WorkerFetch',
        requestId,
        isServerless: true,
        // Optional: Add CF-specific metadata
        ...(cfProperties && {
          colo: cfProperties.colo,
          country: cfProperties.country,
          city: cfProperties.city,
        }),
      });

      logger.debug('Processing Worker fetch request.', {
        ...requestContext,
        method: request.method,
        url: request.url,
        colo: cfProperties?.colo,
      });

      return await app.fetch(request, env, ctx);
    } catch (error: unknown) {
      const requestId = request.headers.get('cf-ray');
      const errorContext = requestContextService.createRequestContext({
        operation: 'WorkerFetch',
        isServerless: true,
        method: request.method,
        url: request.url,
        ...(requestId && { requestId }),
      });

      logger.error(
        'Worker fetch handler error.',
        error instanceof Error ? error : new Error(String(error)),
        errorContext,
      );

      // Return a generic error response — do not leak internal details
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: 'An internal error occurred.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  },

  /**
   * Handles scheduled/cron events.
   * Enable by adding cron triggers in wrangler.toml.
   * @example
   * [triggers]
   * crons = ["0 *\/6 * * *"]  # Run every 6 hours
   */
  async scheduled(
    controller: ScheduledController,
    env: CloudflareBindings,
    _ctx: ExecutionContext,
  ): Promise<void> {
    try {
      // Refresh bindings on every invocation
      injectEnvVars(env);
      storeBindings(env);

      // Initialize app to ensure services are ready
      await initializeApp(env);

      const scheduledContext = requestContextService.createRequestContext({
        operation: 'WorkerScheduled',
        isServerless: true,
        cron: controller.cron,
      });

      logger.info('Processing scheduled event.', {
        ...scheduledContext,
        scheduledTime: new Date(controller.scheduledTime).toISOString(),
      });

      // Add your scheduled task logic here
      // Example: Cleanup expired sessions, send reports, etc.
      // Use _ctx.waitUntil() for background operations if needed

      logger.info('Scheduled event completed.', scheduledContext);
    } catch (error: unknown) {
      const errorContext = requestContextService.createRequestContext({
        operation: 'WorkerScheduled',
        isServerless: true,
        cron: controller.cron,
      });

      logger.error(
        'Worker scheduled handler error.',
        error instanceof Error ? error : new Error(String(error)),
        errorContext,
      );

      // Errors in scheduled handlers don't return responses
      // but should be logged for monitoring
    }
  },
};
