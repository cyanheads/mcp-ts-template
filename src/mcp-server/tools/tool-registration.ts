/**
 * @fileoverview Encapsulates the registration of all tool definitions for the application's
 * dependency injection (DI) container and provides a registry service to apply them to an
 * McpServer instance.
 * @module src/mcp-server/tools/tool-registration
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DependencyContainer, injectable, injectAll } from 'tsyringe';
import { ZodObject, ZodRawShape } from 'zod';

import { ToolDefinitions } from '../../container/index.js';
import { JsonRpcErrorCode } from '../../types-global/errors.js';
import {
  ErrorHandler,
  logger,
  requestContextService,
} from '../../utils/index.js';
import { catFactTool } from './definitions/template-cat-fact.tool.js';
import { echoTool } from './definitions/template-echo-message.tool.js';
import { imageTestTool } from './definitions/template-image-test.tool.js';
import { type ToolDefinition } from './utils/toolDefinition.js';
import { createMcpToolHandler } from './utils/toolHandlerFactory.js';

@injectable()
export class ToolRegistry {
  constructor(
    @injectAll(ToolDefinitions)
    private toolDefs: ToolDefinition<
      ZodObject<ZodRawShape>,
      ZodObject<ZodRawShape>
    >[],
  ) {}

  /**
   * Registers all resolved tool definitions with the provided McpServer instance.
   * @param {McpServer} server - The server instance to register tools with.
   */
  public async registerAll(server: McpServer): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'ToolRegistry.registerAll',
    });
    logger.info(`Registering ${this.toolDefs.length} tool(s)...`, context);
    for (const toolDef of this.toolDefs) {
      await this.registerTool(server, toolDef);
    }
  }

  private deriveTitleFromName(name: string): string {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private async registerTool<
    TInputSchema extends ZodObject<ZodRawShape>,
    TOutputSchema extends ZodObject<ZodRawShape>,
  >(
    server: McpServer,
    tool: ToolDefinition<TInputSchema, TOutputSchema>,
  ): Promise<void> {
    const registrationContext = requestContextService.createRequestContext({
      operation: 'ToolRegistry.registerTool',
      toolName: tool.name,
    });

    logger.debug(`Registering tool: '${tool.name}'`, registrationContext);

    await ErrorHandler.tryCatch(
      () => {
        const handler = createMcpToolHandler({
          toolName: tool.name,
          logic: tool.logic,
          ...(tool.responseFormatter && {
            responseFormatter: tool.responseFormatter,
          }),
        });

        const title =
          tool.title ??
          tool.annotations?.title ??
          this.deriveTitleFromName(tool.name);

        server.registerTool(
          tool.name,
          {
            title,
            description: tool.description,
            inputSchema: tool.inputSchema.shape,
            outputSchema: tool.outputSchema.shape,
            ...(tool.annotations && { annotations: tool.annotations }),
          },
          handler,
        );

        logger.notice(
          `Tool '${tool.name}' registered successfully.`,
          registrationContext,
        );
      },
      {
        operation: `RegisteringTool_${tool.name}`,
        context: registrationContext,
        errorCode: JsonRpcErrorCode.InitializationFailed,
        critical: true,
      },
    );
  }
}

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
