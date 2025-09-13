/**
 * @fileoverview Registers MCP (Model Context Protocol) services with the DI container.
 * This module handles the registration of tool and resource registries,
 * the tools and resources themselves, and the factory for creating the MCP server instance.
 * @module src/container/registrations/mcp
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { container } from 'tsyringe';
import {
  ResourceRegistry,
  registerResources,
} from '../../mcp-server/resources/resource-registration.js';
import { createMcpServerInstance } from '../../mcp-server/server.js';
import {
  ToolRegistry,
  registerTools,
} from '../../mcp-server/tools/tool-registration.js';
import { logger } from '../../utils/index.js';
import { CreateMcpServerInstance } from '../tokens.js';

/**
 * Registers MCP-related services and factories with the tsyringe container.
 */
export const registerMcpServices = () => {
  // --- Register Registries ---
  container.registerSingleton(ToolRegistry);
  container.registerSingleton(ResourceRegistry);

  // --- Register Tools & Resources (via modular functions) ---
  registerTools(container);
  registerResources(container);

  // --- Register Factories ---
  // Register the server factory function. It will be resolved by the transport layer.
  container.register<() => Promise<McpServer>>(CreateMcpServerInstance, {
    useValue: createMcpServerInstance,
  });

  logger.info('MCP services and factories registered with the DI container.');
};
