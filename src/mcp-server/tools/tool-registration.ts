/**
 * @fileoverview Encapsulates the registration of all tool definitions for the application's
 * dependency injection (DI) container and provides a registry service to apply them to an
 * McpServer instance. Supports both regular tools and task-based tools (experimental).
 * @module src/mcp-server/tools/tool-registration
 */
import {
  McpServer,
  type ToolCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ZodObject, type ZodRawShape } from 'zod';

import { JsonRpcErrorCode } from '@/types-global/errors.js';
import { ErrorHandler, logger, requestContextService } from '@/utils/index.js';
import type { ToolDefinition } from '@/mcp-server/tools/utils/index.js';
import { createMcpToolHandler } from '@/mcp-server/tools/utils/index.js';
import {
  type TaskToolDefinition,
  isTaskToolDefinition,
} from '@/mcp-server/tasks/index.js';

export class ToolRegistry {
  constructor(
    private toolDefs: (
      | ToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>
      | TaskToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>
    )[],
  ) {}

  /**
   * Registers all resolved tool definitions with the provided McpServer instance.
   * Automatically detects task-based tools and registers them via the experimental Tasks API.
   * @param {McpServer} server - The server instance to register tools with.
   */
  public async registerAll(server: McpServer): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'ToolRegistry.registerAll',
    });

    const regularTools: ToolDefinition<
      ZodObject<ZodRawShape>,
      ZodObject<ZodRawShape>
    >[] = [];
    const taskTools: TaskToolDefinition<
      ZodObject<ZodRawShape>,
      ZodObject<ZodRawShape>
    >[] = [];

    // Separate regular tools from task tools
    for (const toolDef of this.toolDefs) {
      if (isTaskToolDefinition(toolDef)) {
        taskTools.push(toolDef);
      } else {
        regularTools.push(toolDef);
      }
    }

    logger.info(
      `Registering ${regularTools.length} regular tool(s) and ${taskTools.length} task tool(s)...`,
      context,
    );

    // Register regular tools
    for (const toolDef of regularTools) {
      await this.registerTool(server, toolDef);
    }

    // Register task tools via experimental API
    for (const toolDef of taskTools) {
      await this.registerTaskTool(server, toolDef);
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
          inputSchema: tool.inputSchema,
          logic: tool.logic,
          ...(tool.responseFormatter && {
            responseFormatter: tool.responseFormatter,
          }),
        });

        const title =
          tool.title ??
          tool.annotations?.title ??
          this.deriveTitleFromName(tool.name);

        // Type assertion required: SDK's conditional types don't resolve with generic constraints
        server.registerTool(
          tool.name,
          {
            title,
            description: tool.description,
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema,
            ...(tool.annotations && { annotations: tool.annotations }),
            ...(tool._meta && { _meta: tool._meta }),
          },
          handler as ToolCallback<TInputSchema>,
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

  /**
   * Registers a task-based tool with the MCP server via the experimental Tasks API.
   * Task tools support long-running async operations with polling for status and results.
   *
   * @experimental
   */
  private async registerTaskTool<
    TInputSchema extends ZodObject<ZodRawShape>,
    TOutputSchema extends ZodObject<ZodRawShape>,
  >(
    server: McpServer,
    tool: TaskToolDefinition<TInputSchema, TOutputSchema>,
  ): Promise<void> {
    const registrationContext = requestContextService.createRequestContext({
      operation: 'ToolRegistry.registerTaskTool',
      toolName: tool.name,
    });

    logger.debug(
      `Registering task tool: '${tool.name}' (experimental)`,
      registrationContext,
    );

    await ErrorHandler.tryCatch(
      () => {
        const title =
          tool.title ??
          tool.annotations?.title ??
          this.deriveTitleFromName(tool.name);

        // Use the experimental Tasks API to register task-based tools
        server.experimental.tasks.registerToolTask(
          tool.name,
          {
            title,
            description: tool.description,
            inputSchema: tool.inputSchema,
            ...(tool.outputSchema && { outputSchema: tool.outputSchema }),
            ...(tool.annotations && { annotations: tool.annotations }),
            execution: tool.execution,
          },
          tool.taskHandlers,
        );

        logger.notice(
          `Task tool '${tool.name}' registered successfully (experimental).`,
          registrationContext,
        );
      },
      {
        operation: `RegisteringTaskTool_${tool.name}`,
        context: registrationContext,
        errorCode: JsonRpcErrorCode.InitializationFailed,
        critical: true,
      },
    );
  }
}
