/**
 * @fileoverview Application composition root. Constructs all services in
 * dependency order and returns a handle for starting the server. Replaces
 * the DI container — no tokens, no registration, just direct construction.
 * @module src/app
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClient } from '@supabase/supabase-js';

import { config } from '@/config/index.js';
import { allPromptDefinitions } from '@/mcp-server/prompts/definitions/index.js';
import { PromptRegistry } from '@/mcp-server/prompts/prompt-registration.js';
import { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';
import { ResourceRegistry } from '@/mcp-server/resources/resource-registration.js';
import { RootsRegistry } from '@/mcp-server/roots/roots-registration.js';
import { createMcpServerInstance } from '@/mcp-server/server.js';
import { TaskManager } from '@/mcp-server/tasks/core/taskManager.js';
import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';
import { ToolRegistry } from '@/mcp-server/tools/tool-registration.js';
import { TransportManager } from '@/mcp-server/transports/manager.js';
import { StorageService } from '@/storage/core/StorageService.js';
import { createStorageProvider } from '@/storage/core/storageFactory.js';
import type { Database } from '@/storage/providers/supabase/supabase.types.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';

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
 * Accessing the `config` proxy inside this function triggers lazy parsing
 * of environment variables. If config is invalid, an `McpError` is thrown
 * and the caller's try/catch handles it (same as the old `composeContainer`).
 *
 * @returns An {@link AppHandle} for starting the transport.
 * @throws {McpError} If config parsing or service construction fails.
 */
export function createApp(): AppHandle {
  // --- Core services (was registerCoreServices) ---

  // Supabase client — only when the storage provider requires it
  let supabaseClient: ReturnType<typeof createClient<Database>> | undefined;
  if (config.storage.providerType === 'supabase') {
    if (!config.supabase?.url || !config.supabase?.serviceRoleKey) {
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Supabase URL or service role key is missing for admin client.',
      );
    }
    supabaseClient = createClient<Database>(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  const storageProvider = createStorageProvider(config, {
    ...(supabaseClient && { supabaseClient }),
  });
  const storageService = new StorageService(storageProvider);

  logger.info('Core services constructed.');

  // --- MCP services (was registerMcpServices) ---

  const toolRegistry = new ToolRegistry(allToolDefinitions);
  const resourceRegistry = new ResourceRegistry(allResourceDefinitions);
  const promptRegistry = new PromptRegistry(allPromptDefinitions, logger);
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
