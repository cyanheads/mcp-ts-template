/**
 * @fileoverview Encapsulates the registration of all tool definitions for the application's
 * dependency injection (DI) container. This modular approach allows for clean separation of
 * concerns, making it easy to add or remove tools without modifying the core container setup.
 * @module src/mcp-server/tools/tool-registration
 */
import { DependencyContainer } from 'tsyringe';

import { ToolDefinitions } from '../../container/index.js';
import { catFactTool } from './definitions/template-cat-fact.tool.js';
import { echoTool } from './definitions/template-echo-message.tool.js';
import { imageTestTool } from './definitions/template-image-test.tool.js';

/**
 * Registers all tool definitions with the provided dependency container.
 * This function uses multi-injection to register each tool under the `ToolDefinitions` token.
 *
 * @param {DependencyContainer} container - The tsyringe container instance to register tools with.
 */
export const registerTools = (container: DependencyContainer): void => {
  container.register(ToolDefinitions, { useValue: echoTool });
  container.register(ToolDefinitions, { useValue: catFactTool });
  container.register(ToolDefinitions, { useValue: imageTestTool });
};
