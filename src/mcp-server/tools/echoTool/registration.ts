/**
 * @fileoverview Handles registration and error handling for the `echo_message` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/echoTool/registration
 * @see {@link src/mcp-server/tools/echoTool/logic.ts} for the core business logic and schemas.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  measureToolExecution,
  requestContextService,
} from "../../../utils/index.js";
import {
  EchoToolInput,
  EchoToolInputSchema,
  echoToolLogic,
  EchoToolResponseSchema,
} from "./logic.js";

/**
 * The unique name for the tool, used for registration and identification.
 * Include the server's namespace if applicable, e.g., "pubmed_fetch_article".
 */
const TOOL_NAME = "echo_message";

/**
 * Detailed description for the MCP Client (LLM), explaining the tool's purpose, expectations,
 * and behavior. This follows the best practice of providing rich context to the MCP Client (LLM) model. Use concise, authoritative language.
 */
const TOOL_DESCRIPTION =
  "Echoes a message back with optional formatting and repetition.";

/**
 * Registers the 'echo_message' tool and its handler with the provided MCP server instance.
 *
 * @param server - The MCP server instance to register the tool with.
 */
export const registerEchoTool = async (server: McpServer): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({
    operation: "RegisterTool",
    toolName: TOOL_NAME,
  });

  logger.info(`Registering tool: '${TOOL_NAME}'`, registrationContext);

  await ErrorHandler.tryCatch(
    async () => {
      server.registerTool(
        TOOL_NAME,
        {
          title: "Echo Message",
          description: TOOL_DESCRIPTION,
          inputSchema: EchoToolInputSchema.shape,
          outputSchema: EchoToolResponseSchema.shape,
          annotations: {
            readOnlyHint: true, // This tool does not modify state.
            openWorldHint: false, // This tool does not interact with external, unpredictable systems.
          },
        },
        // This is the runtime handler for the tool.
        async (params: EchoToolInput, callContext: Record<string, unknown>) => {
          // Extract sessionId from the call context if it exists
          const sessionId =
            typeof callContext?.sessionId === "string"
              ? callContext.sessionId
              : undefined;

          const handlerContext = requestContextService.createRequestContext({
            parentContext: callContext,
            operation: "HandleToolRequest",
            toolName: TOOL_NAME,
            sessionId, // Add sessionId for enhanced traceability
            input: params,
          });

          try {
            // 1. WRAP the logic call with the performance measurement utility.
            const result = await measureToolExecution(
              () => echoToolLogic(params, handlerContext),
              { ...handlerContext, toolName: TOOL_NAME },
              params, // Pass input payload for size metrics
            );

            // 2. FORMAT the SUCCESS response.
            return {
              structuredContent: result,
              content: [
                {
                  type: "text",
                  text: `Success: ${JSON.stringify(result, null, 2)}`,
                },
              ],
            };
            // 3. CATCH any error re-thrown by the measurement utility.
          } catch (error) {
            // 4. PROCESS the error using the centralized ErrorHandler.
            const mcpError = ErrorHandler.handleError(error, {
              operation: `tool:${TOOL_NAME}`,
              context: handlerContext,
              input: params,
            }) as McpError;

            // 5. FORMAT the ERROR response.
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
        `Tool '${TOOL_NAME}' registered successfully.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringTool_${TOOL_NAME}`,
      context: registrationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
      critical: true, // A failure to register a tool is a critical startup error.
    },
  );
};
