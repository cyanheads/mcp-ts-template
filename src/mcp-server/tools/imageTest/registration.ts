/**
 * @fileoverview Registration for the fetch_image_test MCP tool.
 * @module src/mcp-server/tools/imageTest/registration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "../../../utils/index.js";
import {
  FetchImageTestInput,
  FetchImageTestInputSchema,
  fetchImageTestLogic,
} from "./logic.js";

/**
 * Registers the fetch_image_test tool with the MCP server.
 * @param server - The McpServer instance.
 */
export function registerFetchImageTestTool(server: McpServer): void {
  const operation = "registerFetchImageTestTool";
  const toolName = "fetch_image_test";
  const toolDescription =
    "Fetches a random cat image from an external API (cataas.com) and returns it as a blob. Useful for testing image handling capabilities.";
  const registrationContext = requestContextService.createRequestContext({
    operation,
  });

  ErrorHandler.tryCatch(
    async () => {
      server.tool(
        toolName,
        toolDescription,
        FetchImageTestInputSchema.shape,
        async (
          input: FetchImageTestInput,
          mcpProvidedContext: any,
        ): Promise<CallToolResult> => {
          const handlerContext: RequestContext =
            requestContextService.createRequestContext({
              parentRequestId:
                mcpProvidedContext?.requestId || registrationContext.requestId,
              operation: "fetchImageTestToolHandler",
              toolName: toolName,
              input,
            });

          try {
            const result = await fetchImageTestLogic(input, handlerContext);
            return {
              content: [
                {
                  type: "image",
                  data: result.data,
                  mimeType: result.mimeType,
                },
              ],
              isError: false,
            };
          } catch (error) {
            const handledError = ErrorHandler.handleError(error, {
              operation: "fetchImageTestToolHandler",
              context: handlerContext,
              input,
            });

            const mcpError =
              handledError instanceof McpError
                ? handledError
                : new McpError(
                    BaseErrorCode.INTERNAL_ERROR,
                    "An unexpected error occurred while fetching the image.",
                    { originalErrorName: handledError.name },
                  );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    error: {
                      code: mcpError.code,
                      message: mcpError.message,
                      details: mcpError.details,
                    },
                  }),
                },
              ],
              isError: true,
            };
          }
        },
      );
      logger.notice(`Tool '${toolName}' registered.`, registrationContext);
    },
    {
      operation,
      context: registrationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
      critical: true,
    },
  );
}
