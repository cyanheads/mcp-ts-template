/**
 * @fileoverview Handles the registration of the `get_random_cat_fact` tool
 * with an MCP server instance. This tool fetches a random cat fact from the
 * Cat Fact Ninja API.
 * @module src/mcp-server/tools/catFactFetcher/catFactFetcherRegistration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "../../../utils/index.js";
import { withRequiredScopes } from "../../transports/authentication/authUtils.js";
import type { CatFactFetcherInput } from "./logic.js";
import { CatFactFetcherInputSchema, processCatFactFetcher } from "./logic.js";

/**
 * Registers the 'get_random_cat_fact' tool and its handler with the MCP server.
 *
 * @param server - The MCP server instance to register the tool with.
 * @returns A promise that resolves when tool registration is complete.
 * @throws {McpError} If registration fails critically.
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
      moduleName: "CatFactFetcherRegistration",
    });

  logger.info(
    `Attempting to register tool: '${toolName}'`,
    registrationContext,
  );

  await ErrorHandler.tryCatch(
    async () => {
      server.tool(
        toolName,
        toolDescription,
        CatFactFetcherInputSchema.shape, // SDK uses this for schema generation & validation
        async (params: CatFactFetcherInput): Promise<CallToolResult> => {
          const handlerContext: RequestContext =
            requestContextService.createRequestContext({
              parentContext: registrationContext,
              operation: "HandleToolRequest",
              toolName: toolName,
              inputSummary: { maxLength: params.maxLength },
            });

          logger.debug(`Handling '${toolName}' tool request.`, handlerContext);

          // --- EXAMPLE: Scope-Based Authorization ---
          // To protect this tool with OAuth 2.1 scopes, uncomment the following line.
          // This requires the MCP_AUTH_MODE to be 'oauth' and the client's access token
          // to contain the specified scope(s).
          //
          // withRequiredScopes(['facts:read']);
          //

          return await ErrorHandler.tryCatch(
            async () => {
              const responsePayload = await processCatFactFetcher(
                params,
                handlerContext,
              );

              logger.debug(
                `'${toolName}' tool processed successfully. Preparing result.`,
                handlerContext,
              );

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(responsePayload, null, 2),
                  },
                ],
                isError: false,
              };
            },
            {
              operation: `ExecutingCoreLogicFor_${toolName}`,
              context: handlerContext,
              input: params, // Input is sanitized by ErrorHandler for logging
              errorMapper: (error: unknown): McpError => {
                // Ensure a specific McpError is created if not already one
                if (error instanceof McpError) return error;

                const errorMessage = `Error processing '${toolName}' tool: ${error instanceof Error ? error.message : "An unknown error occurred"}`;
                return new McpError(
                  BaseErrorCode.INTERNAL_ERROR,
                  errorMessage,
                  {
                    ...handlerContext,
                    originalErrorName:
                      error instanceof Error ? error.name : typeof error,
                  },
                );
              },
            },
          );
        },
      );

      logger.info(
        `Tool '${toolName}' registered successfully with the MCP server.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringTool_${toolName}`,
      context: registrationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
      errorMapper: (error: unknown): McpError => {
        if (error instanceof McpError) return error;
        const errorMessage = `Failed to register tool '${toolName}': ${error instanceof Error ? error.message : "An unknown error occurred during registration."}`;
        return new McpError(BaseErrorCode.INITIALIZATION_FAILED, errorMessage, {
          ...registrationContext,
          originalErrorName: error instanceof Error ? error.name : typeof error,
        });
      },
      critical: true, // Registration failure is critical
    },
  );
};
