/**
 * @fileoverview Handles the registration of the `get_random_cat_fact` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/catFactFetcher/registration
 * @see {@link src/mcp-server/tools/catFactFetcher/logic.ts} for the core business logic and schemas.
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
  CatFactFetcherInput,
  CatFactFetcherInputSchema,
  catFactFetcherLogic,
  CatFactFetcherResponseSchema,
} from "./logic.js";

/**
 * The unique name for the tool, used for registration and identification.
 * Include the server's namespace if applicable, e.g., "pubmed_fetch_article".
 */
const TOOL_NAME = "get_random_cat_fact";

/**
 * Detailed description for the MCP Client (LLM), explaining the tool's purpose, expectations,
 * and behavior. This follows the best practice of providing rich context to the MCP Client (LLM) model. Use concise, authoritative language.
 */
const TOOL_DESCRIPTION =
  "Fetches a random cat fact from a public API. Optionally, a maximum length for the fact can be specified.";

/**
 * Registers the 'get_random_cat_fact' tool and its handler with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with.
 */
export const registerCatFactFetcherTool = async (
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
          title: "Get Random Cat Fact",
          description: TOOL_DESCRIPTION,
          inputSchema: CatFactFetcherInputSchema.shape,
          outputSchema: CatFactFetcherResponseSchema.shape,
          annotations: {
            readOnlyHint: true,
            openWorldHint: true, // This tool interacts with an external API.
          },
        },
        async (
          params: CatFactFetcherInput,
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
            input: params,
          });

          try {
            const result = await measureToolExecution(
              () => catFactFetcherLogic(params, handlerContext),
              { ...handlerContext, toolName: TOOL_NAME },
              params,
            );
            return {
              structuredContent: result,
              content: [
                { type: "text", text: JSON.stringify(result, null, 2) },
              ],
            };
          } catch (error) {
            const mcpError = ErrorHandler.handleError(error, {
              operation: `tool:${TOOL_NAME}`,
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
        `Tool '${TOOL_NAME}' registered successfully.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringTool_${TOOL_NAME}`,
      context: registrationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
      critical: true,
    },
  );
};
