/**
 * @fileoverview Handles the registration of the `get_random_cat_fact` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/catFactFetcher/registration
 **/

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { JsonRpcErrorCode } from "@/types-global/errors.js";
import { ErrorHandler, requestContextService } from "@/utils/index.js";
import {
  logOperationStart,
  logOperationSuccess,
} from "@/utils/internal/logging-helpers.js";
import {
  createToolHandler,
  ResponseFormatter,
} from "@/mcp-server/tools/utils/tool-utils.js";
import {
  CatFactFetcherInputSchema,
  catFactFetcherLogic,
  CatFactFetcherResponse,
  CatFactFetcherResponseSchema,
} from "./logic.js";

const TOOL_NAME = "get_random_cat_fact";
const TOOL_DESCRIPTION =
  "Fetches a random cat fact from a public API. Optionally, a maximum length for the fact can be specified.";

const responseFormatter: ResponseFormatter<CatFactFetcherResponse> = (
  result,
) => ({
  structuredContent: result,
  content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
});

export const registerCatFactFetcherTool = async (
  server: McpServer,
): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({
    operation: "RegisterTool",
    toolName: TOOL_NAME,
  });

  logOperationStart(registrationContext, `Registering tool: '${TOOL_NAME}'`);

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
            openWorldHint: true,
          },
        },
        createToolHandler(TOOL_NAME, catFactFetcherLogic, responseFormatter),
      );

      logOperationSuccess(
        registrationContext,
        `Tool '${TOOL_NAME}' registered successfully.`,
      );
    },
    {
      operation: `RegisteringTool_${TOOL_NAME}`,
      context: registrationContext,
      errorCode: JsonRpcErrorCode.InitializationFailed,
      critical: true,
    },
  );
};
