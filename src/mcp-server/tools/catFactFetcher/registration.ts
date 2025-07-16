/**
 * @fileoverview Handles the registration of the `get_random_cat_fact` tool
 * with an MCP server instance. This tool fetches a random cat fact from the
 * Cat Fact Ninja API.
 * @module src/mcp-server/tools/catFactFetcher/registration
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
  CatFactFetcherInput,
  CatFactFetcherInputSchema,
  catFactFetcherLogic,
  CatFactFetcherResponseSchema,
} from "./logic.js";

/**
 * Registers the 'get_random_cat_fact' tool and its handler with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with.
 * @returns A promise that resolves when tool registration is complete.
 */
export const registerCatFactFetcherTool = async (
  server: McpServer,
): Promise<void> => {
  const toolName = "get_random_cat_fact";
  const toolDescription =
    "Fetches a random cat fact from the Cat Fact Ninja API. Optionally, a maximum length for the fact can be specified.";

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
          title: "Get Random Cat Fact",
          description: toolDescription,
          inputSchema: CatFactFetcherInputSchema.shape,
          outputSchema: CatFactFetcherResponseSchema.shape,
          annotations: {
            readOnlyHint: true,
            openWorldHint: true,
          },
        },
        async (params: CatFactFetcherInput) => {
          const handlerContext: RequestContext =
            requestContextService.createRequestContext({
              parentRequestId: registrationContext.requestId,
              operation: "HandleToolRequest",
              toolName: toolName,
              input: params,
            });

          try {
            const result = await catFactFetcherLogic(params, handlerContext);
            // Return both structuredContent for modern clients and
            // stringified content for backward compatibility.
            return {
              structuredContent: result,
              content: [
                { type: "text", text: JSON.stringify(result, null, 2) },
              ],
            };
          } catch (error) {
            const handledError = ErrorHandler.handleError(error, {
              operation: "catFactFetcherToolHandler",
              context: handlerContext,
              input: params,
            });

            const mcpError =
              handledError instanceof McpError
                ? handledError
                : new McpError(
                    BaseErrorCode.INTERNAL_ERROR,
                    "An unexpected error occurred while fetching a cat fact.",
                    { originalErrorName: handledError.name },
                  );

            return {
              isError: true,
              content: [{ type: "text", text: `Error: ${mcpError.message}` }],
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
