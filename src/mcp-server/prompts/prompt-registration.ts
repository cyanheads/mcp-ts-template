/**
 * @fileoverview Service for registering MCP prompts on a server instance.
 *
 * MCP Prompts Specification:
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/basic/prompts | MCP Prompts}
 * @module src/mcp-server/prompts/prompt-registration
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AnyPromptDefinition } from '@/mcp-server/prompts/utils/promptDefinition.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
import type { logger as defaultLogger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

export class PromptRegistry {
  constructor(
    private promptDefs: AnyPromptDefinition[],
    private logger: typeof defaultLogger,
  ) {}

  /**
   * Registers all prompts on the given MCP server.
   */
  async registerAll(server: McpServer): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'PromptRegistry.registerAll',
    });

    this.logger.debug(`Registering ${this.promptDefs.length} prompt(s)...`, context);

    for (const promptDef of this.promptDefs) {
      await this.registerPrompt(server, promptDef, context);
    }

    this.logger.info(`Successfully registered ${this.promptDefs.length} prompts`, context);
  }

  private async registerPrompt(
    server: McpServer,
    promptDef: AnyPromptDefinition,
    context: ReturnType<typeof requestContextService.createRequestContext>,
  ): Promise<void> {
    this.logger.debug(`Registering prompt: ${promptDef.name}`, context);

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
}
