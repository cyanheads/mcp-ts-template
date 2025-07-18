/**
 * @fileoverview Handles the registration of the `echo_message` tool with an MCP server instance.
 * This module defines the tool's metadata, its input schema shape,
 * and the asynchronous handler function that processes tool invocation requests.
 * @module src/mcp-server/tools/echoTool/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "../../../utils/index.js";
import {
  EchoToolInput,
  EchoToolInputSchema,
  echoToolLogic,
  EchoToolResponseSchema,
} from "./logic.js";

/**
 * Registers the 'echo_message' tool and its handler with the provided MCP server instance.
 *
 * @param server - The MCP server instance to register the tool with.
 * @returns A promise that resolves when the tool registration is complete.
 */
export const registerEchoTool = async (server: McpServer): Promise<void> => {
  const toolName = "echo_message";
  const toolDescription =
    "Echoes a message back with optional formatting and repetition.";

  const registrationContext: RequestContext =
    requestContextService.createRequestContext({
      operation: "RegisterTool",
      toolName: toolName,
    });

  logger.info(`Registering tool: '${toolName}'`, registrationContext);

  await ErrorHandler.tryCatch(
    async () => {
      server.registerTool(
        toolName,
        {
          title: "Echo Message",
          description: toolDescription,
          inputSchema: EchoToolInputSchema.shape,
          outputSchema: EchoToolResponseSchema.shape,
          annotations: {
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        async (params: EchoToolInput) => {
          const handlerContext: RequestContext =
            requestContextService.createRequestContext({
              parentRequestId: registrationContext.requestId,
              operation: "HandleToolRequest",
              toolName: toolName,
              input: params,
            });

          try {
            const result = await echoToolLogic(params, handlerContext);
            // Return both structuredContent for modern clients and
            // stringified content for backward compatibility.
            return {
              structuredContent: result,
              content: [
                { type: "text", text: JSON.stringify(result, null, 2) },
              ],
            };
          } catch (error) {
            const mcpError = ErrorHandler.handleError(error, {
              operation: "echoToolHandler",
              context: handlerContext,
              input: params,
            }) as McpError;

            return {
              isError: true,
              content: [{ type: "text", text: `Error: ${mcpError.message}` }],
              structuredContent: {
                code: mcpError.code,
                message: mcpError.message,
                details: mcpError.details,
              },
            };
          }
        },
      );

      logger.info(
        `Tool '${toolName}' registered successfully.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringTool_${toolName}`,
      context: registrationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
      critical: true,
    },
  );
};
