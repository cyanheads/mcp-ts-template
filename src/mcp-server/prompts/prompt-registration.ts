/**
 * @fileoverview Service for registering MCP prompts on a server instance.
 * Supports legacy PromptDefinition and new-style NewPromptDefinition.
 *
 * MCP Prompts Specification:
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/basic/prompts | MCP Prompts}
 * @module src/mcp-server/prompts/prompt-registration
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodObject, ZodRawShape } from 'zod';

import {
  isNewPromptDefinition,
  type NewPromptDefinition,
} from '@/mcp-server/prompts/utils/newPromptDefinition.js';
import type { PromptDefinition } from '@/mcp-server/prompts/utils/promptDefinition.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
import type { logger as defaultLogger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

/** Union of all accepted prompt definition shapes. */
export type AnyPromptDef =
  | PromptDefinition<ZodObject<ZodRawShape> | undefined>
  | NewPromptDefinition<ZodObject<ZodRawShape> | undefined>;

export class PromptRegistry {
  constructor(
    private promptDefs: AnyPromptDef[],
    private logger: typeof defaultLogger,
  ) {}

  /**
   * Registers all prompts on the given MCP server.
   */
  async registerAll(server: McpServer): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'PromptRegistry.registerAll',
    });

    const newPrompts: NewPromptDefinition<ZodObject<ZodRawShape> | undefined>[] = [];
    const legacyPrompts: PromptDefinition<ZodObject<ZodRawShape> | undefined>[] = [];

    for (const def of this.promptDefs) {
      if (isNewPromptDefinition(def)) {
        newPrompts.push(def as NewPromptDefinition<ZodObject<ZodRawShape> | undefined>);
      } else {
        legacyPrompts.push(def as PromptDefinition<ZodObject<ZodRawShape> | undefined>);
      }
    }

    this.logger.debug(
      `Registering ${newPrompts.length + legacyPrompts.length} prompt(s) (${newPrompts.length} new-style, ${legacyPrompts.length} legacy)...`,
      context,
    );

    // Register new-style prompts
    for (const promptDef of newPrompts) {
      await this.registerNewPrompt(server, promptDef, context);
    }

    // Register legacy prompts
    for (const promptDef of legacyPrompts) {
      await this.registerLegacyPrompt(server, promptDef, context);
    }

    this.logger.info(
      `Successfully registered ${newPrompts.length + legacyPrompts.length} prompts`,
      context,
    );
  }

  /**
   * Registers a new-style prompt definition (with `args` instead of `argumentsSchema`).
   */
  private async registerNewPrompt(
    server: McpServer,
    promptDef: NewPromptDefinition<ZodObject<ZodRawShape> | undefined>,
    context: ReturnType<typeof requestContextService.createRequestContext>,
  ): Promise<void> {
    this.logger.debug(`Registering prompt (new-style): ${promptDef.name}`, context);

    await ErrorHandler.tryCatch(
      () => {
        server.registerPrompt(
          promptDef.name,
          {
            description: promptDef.description,
            ...(promptDef.args && {
              argsSchema: promptDef.args.shape,
            }),
          },
          async (args: Record<string, unknown>) => {
            try {
              const validatedArgs = promptDef.args ? promptDef.args.parse(args) : args;
              const messages = await promptDef.generate(
                validatedArgs as Parameters<typeof promptDef.generate>[0],
              );
              return { messages };
            } catch (error: unknown) {
              const handled = ErrorHandler.handleError(error, {
                operation: `prompt:${promptDef.name}`,
                context,
              });
              throw handled instanceof McpError
                ? handled
                : new McpError(JsonRpcErrorCode.InternalError, handled.message);
            }
          },
        );

        this.logger.info(`Registered prompt: ${promptDef.name}`, context);
      },
      {
        operation: `RegisteringPrompt_${promptDef.name}`,
        context,
        errorCode: JsonRpcErrorCode.InitializationFailed,
        critical: true,
      },
    );
  }

  /**
   * Registers a legacy prompt definition (with `argumentsSchema`).
   */
  private async registerLegacyPrompt(
    server: McpServer,
    promptDef: PromptDefinition<ZodObject<ZodRawShape> | undefined>,
    context: ReturnType<typeof requestContextService.createRequestContext>,
  ): Promise<void> {
    this.logger.debug(`Registering prompt: ${promptDef.name}`, context);

    await ErrorHandler.tryCatch(
      () => {
        server.registerPrompt(
          promptDef.name,
          {
            description: promptDef.description,
            ...(promptDef.argumentsSchema && {
              argsSchema: promptDef.argumentsSchema.shape,
            }),
          },
          async (args: Record<string, unknown>) => {
            try {
              const validatedArgs = promptDef.argumentsSchema
                ? promptDef.argumentsSchema.parse(args)
                : args;
              const messages = await promptDef.generate(
                validatedArgs as Parameters<typeof promptDef.generate>[0],
              );
              return { messages };
            } catch (error: unknown) {
              const handled = ErrorHandler.handleError(error, {
                operation: `prompt:${promptDef.name}`,
                context,
              });
              throw handled instanceof McpError
                ? handled
                : new McpError(JsonRpcErrorCode.InternalError, handled.message);
            }
          },
        );

        this.logger.info(`Registered prompt: ${promptDef.name}`, context);
      },
      {
        operation: `RegisteringPrompt_${promptDef.name}`,
        context,
        errorCode: JsonRpcErrorCode.InitializationFailed,
        critical: true,
      },
    );
  }
}
