/**
 * @fileoverview Encapsulates the registration of all tool definitions with an McpServer.
 * Supports legacy ToolDefinition, TaskToolDefinition, and new-style NewToolDefinition.
 * @module src/mcp-server/tools/tool-registration
 */
import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodObject, ZodRawShape } from 'zod';
import {
  isTaskToolDefinition,
  type TaskToolDefinition,
} from '@/mcp-server/tasks/utils/taskToolDefinition.js';
import {
  type AnyNewToolDefinition,
  isNewToolDefinition,
} from '@/mcp-server/tools/utils/newToolDefinition.js';
import {
  createNewToolHandler,
  type HandlerFactoryServices,
} from '@/mcp-server/tools/utils/newToolHandlerFactory.js';
import type { ToolDefinition } from '@/mcp-server/tools/utils/toolDefinition.js';
import { createMcpToolHandler } from '@/mcp-server/tools/utils/toolHandlerFactory.js';
import { JsonRpcErrorCode } from '@/types-global/errors.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
import { logger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

/** Union of all accepted tool definition shapes. */
export type AnyToolDef =
  | ToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>
  | TaskToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>
  | AnyNewToolDefinition;

export class ToolRegistry {
  constructor(
    private toolDefs: AnyToolDef[],
    private services?: HandlerFactoryServices,
  ) {}

  /**
   * Registers all tool definitions with the provided McpServer instance.
   * Automatically detects new-style, legacy, and task-based tools.
   */
  public async registerAll(server: McpServer): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'ToolRegistry.registerAll',
    });

    const newTools: AnyNewToolDefinition[] = [];
    const legacyTools: ToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>[] = [];
    const taskTools: TaskToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>[] = [];

    for (const def of this.toolDefs) {
      if (isNewToolDefinition(def)) {
        newTools.push(def);
      } else if (isTaskToolDefinition(def)) {
        taskTools.push(def);
      } else {
        legacyTools.push(def as ToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>);
      }
    }

    logger.info(
      `Registering ${newTools.length + legacyTools.length} regular tool(s) and ${taskTools.length} task tool(s)...`,
      context,
    );

    // Register new-style tools
    for (const toolDef of newTools) {
      await this.registerNewTool(server, toolDef);
    }

    // Register legacy tools
    for (const toolDef of legacyTools) {
      await this.registerTool(server, toolDef);
    }

    // Register task tools via experimental API
    for (const toolDef of taskTools) {
      await this.registerTaskTool(server, toolDef);
    }
  }

  private deriveTitleFromName(name: string): string {
    return name.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Registers a new-style tool definition (with `handler`, `input`, `auth`, etc.).
   * Requires `services` to have been passed to the constructor for Context creation.
   */
  private async registerNewTool(server: McpServer, tool: AnyNewToolDefinition): Promise<void> {
    const registrationContext = requestContextService.createRequestContext({
      operation: 'ToolRegistry.registerNewTool',
      toolName: tool.name,
    });

    logger.debug(`Registering tool (new-style): '${tool.name}'`, registrationContext);

    await ErrorHandler.tryCatch(
      () => {
        if (!this.services) {
          throw new Error(
            `Cannot register new-style tool '${tool.name}': HandlerFactoryServices not provided to ToolRegistry`,
          );
        }

        const handler = createNewToolHandler(tool, this.services);
        const title = tool.title ?? tool.annotations?.title ?? this.deriveTitleFromName(tool.name);

        // Type assertion required: SDK's conditional types don't resolve with erased generics
        server.registerTool(
          tool.name,
          {
            title,
            description: tool.description,
            inputSchema: tool.input,
            ...(tool.output && { outputSchema: tool.output }),
            ...(tool.annotations && { annotations: tool.annotations }),
            ...(tool._meta && { _meta: tool._meta }),
          },
          handler as ToolCallback<typeof tool.input>,
        );

        logger.notice(`Tool '${tool.name}' registered successfully.`, registrationContext);
      },
      {
        operation: `RegisteringTool_${tool.name}`,
        context: registrationContext,
        errorCode: JsonRpcErrorCode.InitializationFailed,
        critical: true,
      },
    );
  }

  private async registerTool<
    TInputSchema extends ZodObject<ZodRawShape>,
    TOutputSchema extends ZodObject<ZodRawShape>,
  >(server: McpServer, tool: ToolDefinition<TInputSchema, TOutputSchema>): Promise<void> {
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

        const title = tool.title ?? tool.annotations?.title ?? this.deriveTitleFromName(tool.name);

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

        logger.notice(`Tool '${tool.name}' registered successfully.`, registrationContext);
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
  >(server: McpServer, tool: TaskToolDefinition<TInputSchema, TOutputSchema>): Promise<void> {
    const registrationContext = requestContextService.createRequestContext({
      operation: 'ToolRegistry.registerTaskTool',
      toolName: tool.name,
    });

    logger.debug(`Registering task tool: '${tool.name}' (experimental)`, registrationContext);

    await ErrorHandler.tryCatch(
      () => {
        const title = tool.title ?? tool.annotations?.title ?? this.deriveTitleFromName(tool.name);

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
