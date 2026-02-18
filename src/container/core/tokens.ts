/**
 * @fileoverview Typed DI tokens for the application.
 * Each token carries its resolved type via the phantom `Token<T>` parameter,
 * enabling fully type-safe container resolution without casts.
 * @module src/container/tokens
 */
import { token } from '@/container/core/container.js';

import type { parseConfig } from '@/config/index.js';
import type { logger } from '@/utils/internal/logger.js';
import type { StorageService as StorageServiceClass } from '@/storage/core/StorageService.js';
import type { IStorageProvider } from '@/storage/core/IStorageProvider.js';
import type { ILlmProvider } from '@/services/llm/core/ILlmProvider.js';
import type { RateLimiter } from '@/utils/security/rateLimiter.js';
import type { TransportManager } from '@/mcp-server/transports/manager.js';
import type { SpeechService as SpeechServiceClass } from '@/services/speech/index.js';
import type { TaskManager } from '@/mcp-server/tasks/core/taskManager.js';
import type { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';
import type { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/storage/providers/supabase/supabase.types.js';
import type { ToolRegistry } from '@/mcp-server/tools/tool-registration.js';
import type { ResourceRegistry } from '@/mcp-server/resources/resource-registration.js';
import type { PromptRegistry } from '@/mcp-server/prompts/prompt-registration.js';
import type { RootsRegistry } from '@/mcp-server/roots/roots-registration.js';

// --- Core service tokens ---
export const AppConfig = token<ReturnType<typeof parseConfig>>('AppConfig');
export const Logger = token<typeof logger>('Logger');

// --- Storage tokens ---
export const StorageService = token<StorageServiceClass>('StorageService');
export const StorageProvider = token<IStorageProvider>('IStorageProvider');
export const SupabaseAdminClient = token<SupabaseClient<Database>>(
  'SupabaseAdminClient',
);

// --- Service tokens ---
export const LlmProvider = token<ILlmProvider>('ILlmProvider');
export const RateLimiterService = token<RateLimiter>('RateLimiterService');
export const SpeechService = token<SpeechServiceClass>('SpeechService');

// --- MCP server tokens ---
export const CreateMcpServerInstance = token<() => Promise<McpServer>>(
  'CreateMcpServerInstance',
);
export const TransportManagerToken =
  token<TransportManager>('TransportManager');
export const TaskManagerToken = token<TaskManager>('TaskManager');

// --- Registry tokens ---
export const ToolRegistryToken = token<ToolRegistry>('ToolRegistry');
export const ResourceRegistryToken =
  token<ResourceRegistry>('ResourceRegistry');
export const PromptRegistryToken = token<PromptRegistry>('PromptRegistry');
export const RootsRegistryToken = token<RootsRegistry>('RootsRegistry');

// --- Multi-registration tokens ---
// Token types are inferred from the barrel exports to accommodate all definition
// variants (ToolDefinition, TaskToolDefinition, etc.) in the same collection.
export const ToolDefinitions =
  token<(typeof allToolDefinitions)[number]>('ToolDefinitions');
export const ResourceDefinitions = token<
  (typeof allResourceDefinitions)[number]
>('ResourceDefinitions');
