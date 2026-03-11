/**
 * @fileoverview Application composition root. Constructs all services in
 * dependency order and returns a handle for starting the server. Replaces
 * the DI container — no tokens, no registration, just direct construction.
 * @module src/app
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { config } from '@/config/index.js';
import { allPromptDefinitions } from '@/mcp-server/prompts/definitions/index.js';
import type { AnyPromptDef } from '@/mcp-server/prompts/prompt-registration.js';
import { PromptRegistry } from '@/mcp-server/prompts/prompt-registration.js';
import { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';
import type { AnyResourceDef } from '@/mcp-server/resources/resource-registration.js';
import { ResourceRegistry } from '@/mcp-server/resources/resource-registration.js';
import { RootsRegistry } from '@/mcp-server/roots/roots-registration.js';
import { createMcpServerInstance } from '@/mcp-server/server.js';
import { TaskManager } from '@/mcp-server/tasks/core/taskManager.js';
import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';
import type { AnyToolDef } from '@/mcp-server/tools/tool-registration.js';
import { ToolRegistry } from '@/mcp-server/tools/tool-registration.js';
import { TransportManager } from '@/mcp-server/transports/manager.js';
import { StorageService } from '@/storage/core/StorageService.js';
import { createStorageProvider } from '@/storage/core/storageFactory.js';
import type { Database } from '@/storage/providers/supabase/supabase.types.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';

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

/** Services available in the `setup()` callback. */
export interface CoreServices {
  config: typeof config;
  logger: typeof logger;
  storage: StorageService;
}

/** Handle returned by {@link createApp} for controlling the server lifecycle. */
export interface AppHandle {
  /** Bound factory — each call creates a fresh McpServer with all registries. */
  createServer: () => Promise<McpServer>;
  /** Transport manager for starting/stopping the server. */
  transportManager: TransportManager;
}

/**
 * Composes the application by constructing all services in dependency order.
 *
 * @param options - Definition arrays, name/version overrides, and setup callback.
 *                  All arrays default to the template's built-in definitions.
 * @returns An {@link AppHandle} for starting the transport.
 * @throws {McpError} If config parsing or service construction fails.
 */
export async function createApp(options: CreateAppOptions = {}): Promise<AppHandle> {
  const {
    tools = allToolDefinitions,
    resources = allResourceDefinitions,
    prompts = allPromptDefinitions,
    setup,
  } = options;

  // Apply name/version overrides to env before config is parsed
  if (options.name) process.env.MCP_SERVER_NAME = options.name;
  if (options.version) process.env.MCP_SERVER_VERSION = options.version;

  // --- Core services ---

  // Supabase client — only when the storage provider requires it
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

  logger.info('Core services constructed.');

  // --- Server-specific setup ---

  if (setup) {
    await setup({ config, logger, storage: storageService });
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
  const taskManager = new TaskManager(config, storageService);

  // Bound server factory — closes over registries so callers don't need them
  const createServer = (): Promise<McpServer> =>
    createMcpServerInstance({
      config,
      promptRegistry,
      resourceRegistry,
      rootsRegistry,
      toolRegistry,
    });

  const transportManager = new TransportManager(config, logger, createServer, taskManager);

  logger.info('MCP services constructed. Application ready to start.');

  return { createServer, transportManager };
}
