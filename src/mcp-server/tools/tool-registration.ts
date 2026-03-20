/**
 * @fileoverview Encapsulates the registration of all tool definitions with an McpServer.
 * Supports ToolDefinition (standard and auto-task via `task: true`) and TaskToolDefinition
 * (escape hatch for custom task lifecycle).
 * @module src/mcp-server/tools/tool-registration
 */
import type { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestTaskStore } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { CallToolResult, ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape } from 'zod';

import { createContext } from '@/core/context.js';
import {
  isTaskToolDefinition,
  type TaskToolDefinition,
} from '@/mcp-server/tasks/utils/taskToolDefinition.js';
import type { AnyToolDefinition } from '@/mcp-server/tools/utils/toolDefinition.js';
import {
  createToolHandler,
  type HandlerFactoryServices,
} from '@/mcp-server/tools/utils/toolHandlerFactory.js';
import { authContext } from '@/mcp-server/transports/auth/lib/authContext.js';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';
import { withRequiredScopes } from '@/mcp-server/transports/auth/lib/authUtils.js';
import { JsonRpcErrorCode } from '@/types-global/errors.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
import { logger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

/** Union of all accepted tool definition shapes. */
export type AnyToolDef =
  | AnyToolDefinition
  | TaskToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>;

export class ToolRegistry {
  constructor(
    private toolDefs: AnyToolDef[],
    private services?: HandlerFactoryServices,
  ) {}

  /**
   * Registers all tool definitions with the provided McpServer instance.
   * Automatically detects standard tools, auto-task tools (task: true),
   * and escape-hatch TaskToolDefinitions.
   */
  public async registerAll(server: McpServer): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'ToolRegistry.registerAll',
    });

    const standardTools: AnyToolDefinition[] = [];
    const taskTools: TaskToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>[] = [];

    for (const def of this.toolDefs) {
      if (isTaskToolDefinition(def)) {
        taskTools.push(def);
      } else {
        standardTools.push(def as AnyToolDefinition);
      }
    }

    logger.info(
      `Registering ${standardTools.length} regular tool(s) and ${taskTools.length} task tool(s)...`,
      context,
    );

    // Register standard tools (regular and auto-task)
    for (const toolDef of standardTools) {
      if (toolDef.task) {
        await this.registerAutoTaskTool(server, toolDef);
      } else {
        await this.registerTool(server, toolDef);
      }
    }

    // Register escape-hatch task tools via experimental API
    for (const toolDef of taskTools) {
      await this.registerTaskTool(server, toolDef);
    }
  }

  private deriveTitleFromName(name: string): string {
    return name.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Registers a standard tool definition.
   * Requires `services` to have been passed to the constructor for Context creation.
   */
  private async registerTool(server: McpServer, tool: AnyToolDefinition): Promise<void> {
    const registrationContext = requestContextService.createRequestContext({
      operation: 'ToolRegistry.registerTool',
      toolName: tool.name,
    });

    logger.debug(`Registering tool: '${tool.name}'`, registrationContext);

    await ErrorHandler.tryCatch(
      () => {
        if (!this.services) {
          throw new Error(
            `Cannot register tool '${tool.name}': HandlerFactoryServices not provided to ToolRegistry`,
          );
        }

        const handler = createToolHandler(tool, this.services);
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

  /**
   * Registers a tool with `task: true` via the experimental Tasks API.
   * Auto-generates task handlers from the definition's `handler` function.
   * The framework manages the full task lifecycle: create, background run, store result.
   */
  private async registerAutoTaskTool(server: McpServer, tool: AnyToolDefinition): Promise<void> {
    const registrationContext = requestContextService.createRequestContext({
      operation: 'ToolRegistry.registerAutoTaskTool',
      toolName: tool.name,
    });

    logger.debug(`Registering auto-task tool (task: true): '${tool.name}'`, registrationContext);

    await ErrorHandler.tryCatch(
      () => {
        if (!this.services) {
          throw new Error(
            `Cannot register auto-task tool '${tool.name}': HandlerFactoryServices not provided to ToolRegistry`,
          );
        }

        const services = this.services;
        const title = tool.title ?? tool.annotations?.title ?? this.deriveTitleFromName(tool.name);
        const formatter = (result: unknown): ContentBlock[] =>
          tool.format
            ? tool.format(result as Record<string, unknown>)
            : [{ type: 'text', text: JSON.stringify(result, null, 2) }];

        server.experimental.tasks.registerToolTask(
          tool.name,
          {
            title,
            description: tool.description,
            inputSchema: tool.input,
            ...(tool.output && { outputSchema: tool.output }),
            ...(tool.annotations && { annotations: tool.annotations }),
            execution: { taskSupport: 'optional' },
          },
          {
            createTask: async (args, extra) => {
              // Capture auth info from the request's ALS before firing the
              // background handler — ALS is gone once we leave this scope.
              // Single getStore() call serves both scope checking and capture.
              const callerAuth = authContext.getStore()?.authInfo;

              // Check inline auth scopes in the request path (inside ALS context)
              // before creating the task — not in the background handler.
              if (tool.auth && tool.auth.length > 0) {
                withRequiredScopes(tool.auth);
              }

              const validatedInput = tool.input.parse(args);

              const task = await extra.taskStore.createTask({
                ttl: 120_000,
                pollInterval: 1000,
              });

              // Fire-and-forget: run handler in background
              void this.runAutoTaskHandler(
                tool,
                validatedInput,
                task.taskId,
                extra.taskStore,
                services,
                formatter,
                callerAuth,
              );

              return { task };
            },
            getTask: async (_args, extra) => extra.taskStore.getTask(extra.taskId),
            getTaskResult: async (_args, extra) =>
              (await extra.taskStore.getTaskResult(extra.taskId)) as CallToolResult,
          },
        );

        logger.notice(
          `Auto-task tool '${tool.name}' registered successfully (experimental).`,
          registrationContext,
        );
      },
      {
        operation: `RegisteringAutoTaskTool_${tool.name}`,
        context: registrationContext,
        errorCode: JsonRpcErrorCode.InitializationFailed,
        critical: true,
      },
    );
  }

  /**
   * Runs a tool handler as a background task.
   * Creates Context with `progress` and `signal`, stores result/error on completion.
   */
  private async runAutoTaskHandler(
    tool: AnyToolDefinition,
    input: unknown,
    taskId: string,
    taskStore: RequestTaskStore,
    services: HandlerFactoryServices,
    formatter: (result: unknown) => ContentBlock[],
    callerAuth?: AuthInfo,
  ): Promise<void> {
    const abortController = new AbortController();

    // Poll for cancellation every 2 seconds
    const cancelInterval = setInterval(async () => {
      try {
        const task = await taskStore.getTask(taskId);
        if (task.status === 'cancelled') {
          abortController.abort();
          clearInterval(cancelInterval);
        }
      } catch {
        // Task may have been cleaned up — stop polling
        clearInterval(cancelInterval);
      }
    }, 2000);

    try {
      // Auth scopes are checked in createTask (inside the request's ALS context),
      // not here — this runs in a detached background context where ALS is gone.
      // We use the captured callerAuth to populate ctx.auth for identity access.
      const appContext = callerAuth
        ? requestContextService.withAuthInfo(callerAuth, {
            operation: 'AutoTaskHandler',
            toolName: tool.name,
            taskId,
          })
        : requestContextService.createRequestContext({
            operation: 'AutoTaskHandler',
            additionalContext: { toolName: tool.name, taskId },
          });

      const ctx = createContext({
        appContext,
        logger: services.logger,
        storage: services.storage,
        signal: abortController.signal,
        taskCtx: { store: taskStore, taskId },
      });

      const result = await Promise.resolve(tool.handler(input as Record<string, unknown>, ctx));
      const validatedResult = tool.output ? tool.output.parse(result) : result;

      clearInterval(cancelInterval);

      await taskStore.storeTaskResult(taskId, 'completed', {
        content: formatter(validatedResult),
        ...(tool.output && { structuredContent: validatedResult }),
      });
    } catch (error: unknown) {
      clearInterval(cancelInterval);

      // If cancelled, the SDK already set the terminal state — don't overwrite
      if (abortController.signal.aborted) return;

      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await taskStore.storeTaskResult(taskId, 'failed', {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        });
      } catch {
        // Task may already be in terminal state
      }
    }
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
            inputSchema: tool.input,
            ...(tool.output && { outputSchema: tool.output }),
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
