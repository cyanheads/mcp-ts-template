/**
 * @fileoverview Application composition root. Constructs all services in
 * dependency order, initializes telemetry/logger, starts transport, and
 * registers shutdown/signal handlers. Returns a ServerHandle for lifecycle
 * management.
 * @module src/app
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { config, resetConfig } from '@/config/index.js';
import type { AnyPromptDef } from '@/mcp-server/prompts/prompt-registration.js';
import { PromptRegistry } from '@/mcp-server/prompts/prompt-registration.js';
import type { AnyResourceDef } from '@/mcp-server/resources/resource-registration.js';
import { ResourceRegistry } from '@/mcp-server/resources/resource-registration.js';
import { RootsRegistry } from '@/mcp-server/roots/roots-registration.js';
import { createMcpServerInstance } from '@/mcp-server/server.js';
import { TaskManager } from '@/mcp-server/tasks/core/taskManager.js';
import type { AnyToolDef } from '@/mcp-server/tools/tool-registration.js';
import { ToolRegistry } from '@/mcp-server/tools/tool-registration.js';
import { TransportManager } from '@/mcp-server/transports/manager.js';
import type { ILlmProvider } from '@/services/llm/core/ILlmProvider.js';
import { OpenRouterProvider } from '@/services/llm/providers/openrouter.provider.js';
import { SpeechService } from '@/services/speech/core/SpeechService.js';
import type { SpeechProviderConfig } from '@/services/speech/types.js';
import { StorageService } from '@/storage/core/StorageService.js';
import { createStorageProvider } from '@/storage/core/storageFactory.js';
import type { Database } from '@/storage/providers/supabase/supabase.types.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger, type McpLogLevel } from '@/utils/internal/logger.js';
import { initHighResTimer } from '@/utils/internal/performance.js';
import { requestContextService } from '@/utils/internal/requestContext.js';
import { RateLimiter } from '@/utils/security/rateLimiter.js';
import {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
} from '@/utils/telemetry/instrumentation.js';

/** Options for {@link createApp}. All arrays default to the template's built-in definitions. */
export interface CreateAppOptions {
  /** Server name — overrides package.json and MCP_SERVER_NAME env var. */
  name?: string;
  /** Prompt definitions (legacy or new-style). */
  prompts?: AnyPromptDef[];
  /** Resource definitions (legacy or new-style). */
  resources?: AnyResourceDef[];
  /** Runs after core services are constructed, before transport starts. */
  setup?: (core: CoreServices) => void | Promise<void>;
  /** Tool definitions (legacy, new-style, or task). */
  tools?: AnyToolDef[];
  /** Server version — overrides package.json and MCP_SERVER_VERSION env var. */
  version?: string;
}

/** Services available in the `setup()` callback and on ServerHandle. */
export interface CoreServices {
  config: typeof config;
  llmProvider?: ILlmProvider;
  logger: typeof logger;
  rateLimiter: RateLimiter;
  speechService?: SpeechService;
  storage: StorageService;
  supabase?: SupabaseClient<Database>;
}

/** Handle returned by {@link createApp} for controlling the server lifecycle. */
export interface ServerHandle {
  /** Read-only access to core services for integration testing or embedding. */
  readonly services: CoreServices;
  /** Initiates graceful shutdown (stops transport, flushes OTEL, closes logger). */
  shutdown(signal?: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Internal: shared service composition
// ---------------------------------------------------------------------------

/** @internal Result of composeServices — used by createApp and createWorkerHandler. */
export interface ComposedApp {
  coreServices: CoreServices;
  createServer: () => Promise<McpServer>;
}

/**
 * Constructs core services, registries, and server factory.
 * Shared by createApp() (Node) and createWorkerHandler() (Workers).
 * Does NOT start transport, register signal handlers, or init OTEL/logger.
 * @internal
 */
export async function composeServices(options: CreateAppOptions = {}): Promise<ComposedApp> {
  const { tools = [], resources = [], prompts = [], setup } = options;

  // Apply name/version overrides to env before config is parsed.
  // resetConfig() invalidates the cached parse so the next config access
  // picks up the new env values. This is the single authority for overrides —
  // createApp() and createWorkerHandler() both delegate here.
  if (options.name || options.version) {
    if (options.name) process.env.MCP_SERVER_NAME = options.name;
    if (options.version) process.env.MCP_SERVER_VERSION = options.version;
    resetConfig();
  }

  // --- Core services ---

  let supabaseClient: SupabaseClient<Database> | undefined;
  if (config.storage.providerType === 'supabase') {
    if (!config.supabase?.url || !config.supabase?.serviceRoleKey) {
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Supabase URL or service role key is missing for admin client.',
      );
    }
    const { createClient } = await import('@supabase/supabase-js').catch(() => {
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Install "@supabase/supabase-js" to use Supabase storage: bun add @supabase/supabase-js',
      );
    });
    supabaseClient = createClient<Database>(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const storageProvider = createStorageProvider(config, {
    ...(supabaseClient && { supabaseClient }),
  });
  const storageService = new StorageService(storageProvider);
  const rateLimiter = new RateLimiter(config, logger);

  // --- Optional services (constructed when config is present) ---

  let llmProvider: ILlmProvider | undefined;
  if (config.openrouterApiKey) {
    llmProvider = new OpenRouterProvider(rateLimiter, config, logger);
  }

  let speechService: SpeechService | undefined;
  if (config.speech) {
    const ttsConfig: SpeechProviderConfig | undefined = config.speech.tts?.enabled
      ? (config.speech.tts as SpeechProviderConfig)
      : undefined;
    const sttConfig: SpeechProviderConfig | undefined = config.speech.stt?.enabled
      ? (config.speech.stt as SpeechProviderConfig)
      : undefined;
    if (ttsConfig || sttConfig) {
      speechService = new SpeechService(ttsConfig, sttConfig);
    }
  }

  const coreServices: CoreServices = {
    config,
    logger,
    rateLimiter,
    storage: storageService,
    ...(llmProvider && { llmProvider }),
    ...(speechService && { speechService }),
    ...(supabaseClient && { supabase: supabaseClient }),
  };

  // --- Server-specific setup ---
  if (setup) {
    await setup(coreServices);
  }

  // --- MCP services ---

  const toolRegistry = new ToolRegistry(tools, {
    logger,
    storage: storageService,
  });
  const resourceRegistry = new ResourceRegistry(resources, {
    logger,
    storage: storageService,
  });
  const promptRegistry = new PromptRegistry(prompts, logger);
  const rootsRegistry = new RootsRegistry(logger);

  const createServer = () =>
    createMcpServerInstance({
      config,
      promptRegistry,
      resourceRegistry,
      rootsRegistry,
      toolRegistry,
    });

  return { coreServices, createServer };
}

// ---------------------------------------------------------------------------
// Public: createApp()
// ---------------------------------------------------------------------------

/**
 * Suppresses ANSI color codes for MCP client compatibility.
 */
function suppressColors(): void {
  const transportType = process.env.MCP_TRANSPORT_TYPE?.toLowerCase();
  const isStdioMode = !transportType || transportType === 'stdio';
  const isHttpModeWithoutTty = transportType === 'http' && !process.stdout.isTTY;

  if (isStdioMode || isHttpModeWithoutTty) {
    process.env.NO_COLOR = '1';
    process.env.FORCE_COLOR = '0';
  }
}

/**
 * Composes the application, initializes all services, starts transport,
 * and registers signal/error handlers. This is the complete entry point
 * for a Node.js MCP server process.
 *
 * @param options - Definition arrays, name/version overrides, and setup callback.
 *                  All arrays default to the template's built-in definitions.
 * @returns A {@link ServerHandle} with `shutdown()` and `services`.
 * @throws {McpError} If config parsing or service construction fails.
 */
export async function createApp(options: CreateAppOptions = {}): Promise<ServerHandle> {
  suppressColors();

  // --- Initialize OTEL + high-res timer (independent, run in parallel) ---
  await Promise.all([
    initializeOpenTelemetry().catch((err: unknown) => {
      console.error('[Startup] Failed to initialize OpenTelemetry:', err);
    }),
    initHighResTimer(),
  ]);

  // --- Compose services (handles name/version overrides + resetConfig) ---
  const { coreServices, createServer } = await composeServices(options);

  // --- Initialize logger (after composeServices so config reflects overrides) ---
  await logger.initialize(config.logLevel as McpLogLevel, config.mcpTransportType);

  logger.info('Core services constructed.');
  logger.info(
    `Storage service initialized with provider: ${config.storage.providerType}`,
    requestContextService.createRequestContext({ operation: 'StorageInit' }),
  );

  // --- Transport ---
  const taskManager = new TaskManager(config, coreServices.storage);
  const transportManager = new TransportManager(config, logger, createServer, taskManager);

  // --- Startup context ---
  const startupContext = requestContextService.createRequestContext({
    operation: 'ServerStartup',
    applicationName: config.mcpServerName,
    applicationVersion: config.mcpServerVersion,
    nodeEnvironment: config.environment,
  });

  logger.info(`Starting ${config.mcpServerName} (v${config.mcpServerVersion})...`, startupContext);

  // --- Named handlers (stored for cleanup in shutdown) ---
  const onUncaughtException = (error: Error) => {
    logger.fatal('FATAL: Uncaught exception detected.', error, startupContext);
    void shutdown('uncaughtException');
  };
  const onUnhandledRejection = (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.fatal('FATAL: Unhandled promise rejection detected.', err, startupContext);
    void shutdown('unhandledRejection');
  };
  const onSigterm = () => void shutdown('SIGTERM');
  const onSigint = () => void shutdown('SIGINT');

  // --- Shutdown ---
  let isShuttingDown = false;

  const shutdown = async (signal = 'SHUTDOWN'): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    // Remove listeners to prevent re-entry and allow GC in tests
    process.removeListener('uncaughtException', onUncaughtException);
    process.removeListener('unhandledRejection', onUnhandledRejection);
    process.removeListener('SIGTERM', onSigterm);
    process.removeListener('SIGINT', onSigint);

    const shutdownContext = requestContextService.createRequestContext({
      operation: 'ServerShutdown',
      triggerEvent: signal,
    });

    logger.info(`Received ${signal}. Initiating graceful shutdown...`, shutdownContext);

    try {
      await transportManager.stop(signal);
      logger.info('Graceful shutdown completed successfully.', shutdownContext);
      await shutdownOpenTelemetry();
      await logger.close();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Critical error during shutdown process.', err, shutdownContext);
      try {
        await logger.close();
      } catch {
        // Ignore errors during final logger close
      }
    }
  };

  // --- Register error/signal handlers ---
  process.on('uncaughtException', onUncaughtException);
  process.on('unhandledRejection', onUnhandledRejection);

  // --- Start transport ---
  await transportManager.start();

  logger.info(`${config.mcpServerName} is now running and ready.`, startupContext);

  process.on('SIGTERM', onSigterm);
  process.on('SIGINT', onSigint);

  return { services: coreServices, shutdown };
}

// ---------------------------------------------------------------------------
// Convenience re-exports from the main entry point
// ---------------------------------------------------------------------------

export type { Context, ContextLogger, ContextProgress, ContextState } from '@/context.js';
export type { NewPromptDefinition as PromptDefinition } from '@/mcp-server/prompts/utils/newPromptDefinition.js';
export { prompt } from '@/mcp-server/prompts/utils/newPromptDefinition.js';
export type {
  AnyNewResourceDefinition as AnyResourceDefinition,
  NewResourceDefinition as ResourceDefinition,
} from '@/mcp-server/resources/utils/newResourceDefinition.js';
export { resource } from '@/mcp-server/resources/utils/newResourceDefinition.js';
export type {
  AnyNewToolDefinition as AnyToolDefinition,
  NewToolDefinition as ToolDefinition,
  ToolAnnotations,
} from '@/mcp-server/tools/utils/newToolDefinition.js';
export { tool } from '@/mcp-server/tools/utils/newToolDefinition.js';
