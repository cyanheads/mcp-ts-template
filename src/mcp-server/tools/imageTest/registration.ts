/**
 * @fileoverview Handles registration of the `fetch_image_test` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/imageTest/registration
 * @see {@link src/mcp-server/tools/imageTest/logic.ts} for the core business logic and schemas.
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
  FetchImageTestInput,
  FetchImageTestInputSchema,
  fetchImageTestLogic,
  FetchImageTestResponseSchema,
} from "./logic.js";

/**
 * The unique name for the tool, used for registration and identification.
 * Include the server's namespace if applicable, e.g., "pubmed_fetch_article".
 */
const TOOL_NAME = "fetch_image_test";

/**
 * Detailed description for the MCP Client (LLM), explaining the tool's purpose, expectations,
 * and behavior. This follows the best practice of providing rich context to the MCP Client (LLM) model. Use concise, authoritative language.
 */
const TOOL_DESCRIPTION =
  "Fetches a random cat image from an external API (cataas.com) and returns it as a blob. Useful for testing image handling capabilities.";

/**
 * Registers the fetch_image_test tool with the MCP server.
 * @param server - The McpServer instance.
 */
export const registerFetchImageTestTool = async (
  server: McpServer,
): Promise<void> => {
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
          title: "Fetch Cat Image",
          description: TOOL_DESCRIPTION,
          inputSchema: FetchImageTestInputSchema.shape,
          outputSchema: FetchImageTestResponseSchema.shape,
          annotations: {
            readOnlyHint: true,
            openWorldHint: true,
          },
        },
        async (
          input: FetchImageTestInput,
          callContext: Record<string, unknown>,
        ) => {
          const sessionId =
            typeof callContext?.sessionId === "string"
              ? callContext.sessionId
              : undefined;

          const handlerContext = requestContextService.createRequestContext({
            parentContext: callContext,
            operation: "HandleToolRequest",
            toolName: TOOL_NAME,
            sessionId,
            input,
          });

          try {
            const result = await measureToolExecution(
              () => fetchImageTestLogic(input, handlerContext),
              { ...handlerContext, toolName: TOOL_NAME },
              input,
            );
            return {
              structuredContent: result,
              content: [
                {
                  type: "image",
                  data: result.data,
                  mimeType: result.mimeType,
                },
              ],
            };
          } catch (error) {
            const mcpError = ErrorHandler.handleError(error, {
              operation: `tool:${TOOL_NAME}`,
              context: handlerContext,
              input,
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
      logger.notice(`Tool '${TOOL_NAME}' registered.`, registrationContext);
    },
    {
      operation: `RegisteringTool_${TOOL_NAME}`,
      context: registrationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
      critical: true,
    },
  );
};
