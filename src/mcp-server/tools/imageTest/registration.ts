/**
 * @fileoverview Registration for the fetch_image_test MCP tool.
 * @module src/mcp-server/tools/imageTest/registration
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
  FetchImageTestInput,
  FetchImageTestInputSchema,
  fetchImageTestLogic,
  FetchImageTestResponseSchema,
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
      server.registerTool(
        toolName,
        {
          title: "Fetch Cat Image",
          description: toolDescription,
          inputSchema: FetchImageTestInputSchema.shape,
          outputSchema: FetchImageTestResponseSchema.shape,
          annotations: {
            readOnlyHint: true,
            openWorldHint: true,
          },
        },
        async (input: FetchImageTestInput) => {
          const handlerContext: RequestContext =
            requestContextService.createRequestContext({
              parentRequestId: registrationContext.requestId,
              operation: "fetchImageTestToolHandler",
              toolName: toolName,
              input,
            });

          try {
            const result = await fetchImageTestLogic(input, handlerContext);
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
              isError: true,
              content: [{ type: "text", text: `Error: ${mcpError.message}` }],
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
