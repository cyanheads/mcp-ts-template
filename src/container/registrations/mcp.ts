/**
 * @fileoverview Registers MCP (Model Context Protocol) services with the DI container.
 * This module handles the registration of tool and resource registries,
 * the tools and resources themselves, and the factory for creating the MCP server instance.
 * @module src/container/registrations/mcp
 */
import { container } from '@/container/core/container.js';
import {
  AppConfig,
  CreateMcpServerInstance,
  Logger,
  PromptRegistryToken,
  ResourceDefinitions,
  ResourceRegistryToken,
  RootsRegistryToken,
  StorageService,
  TaskManagerToken,
  ToolDefinitions,
  ToolRegistryToken,
  TransportManagerToken,
} from '@/container/core/tokens.js';
import { PromptRegistry } from '@/mcp-server/prompts/prompt-registration.js';
import { ResourceRegistry } from '@/mcp-server/resources/resource-registration.js';
import { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';
import { RootsRegistry } from '@/mcp-server/roots/roots-registration.js';
import { createMcpServerInstance } from '@/mcp-server/server.js';
import { TaskManager } from '@/mcp-server/tasks/index.js';
import { ToolRegistry } from '@/mcp-server/tools/tool-registration.js';
import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';
import { TransportManager } from '@/mcp-server/transports/manager.js';
import { logger } from '@/utils/index.js';

/**
 * Registers MCP-related services and factories with the container.
 */
export const registerMcpServices = () => {
  // Multi-register all tool definitions
  for (const tool of allToolDefinitions) {
    container.registerMulti(ToolDefinitions, tool);
  }

  // Multi-register all resource definitions
  for (const resource of allResourceDefinitions) {
    container.registerMulti(ResourceDefinitions, resource);
  }

  // Registry singletons — constructed with resolved dependencies
  container.registerSingleton(
    ToolRegistryToken,
    (c) => new ToolRegistry(c.resolveAll(ToolDefinitions)),
  );

  container.registerSingleton(
    ResourceRegistryToken,
    (c) => new ResourceRegistry(c.resolveAll(ResourceDefinitions)),
  );

  container.registerSingleton(
    PromptRegistryToken,
    (c) => new PromptRegistry(c.resolve(Logger)),
  );

  container.registerSingleton(
    RootsRegistryToken,
    (c) => new RootsRegistry(c.resolve(Logger)),
  );

  // TaskManager
  container.registerSingleton(
    TaskManagerToken,
    (c) => new TaskManager(c.resolve(AppConfig), c.resolve(StorageService)),
  );

  // Server factory function
  container.registerValue(CreateMcpServerInstance, createMcpServerInstance);

  // TransportManager
  container.registerSingleton(
    TransportManagerToken,
    (c) =>
      new TransportManager(
        c.resolve(AppConfig),
        c.resolve(Logger),
        c.resolve(CreateMcpServerInstance),
      ),
  );

  logger.info('MCP services and factories registered with the DI container.');
};
