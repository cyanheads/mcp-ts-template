/**
 * @fileoverview Handles registration of the `fetch_image_test` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/imageTest/registration
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
  FetchImageTestInputSchema,
  fetchImageTestLogic,
  FetchImageTestResponse,
  FetchImageTestResponseSchema,
} from "./logic.js";

const TOOL_NAME = "fetch_image_test";
const TOOL_DESCRIPTION =
  "Fetches a random cat image from an external API (cataas.com) and returns it as a blob. Useful for testing image handling capabilities.";

const responseFormatter: ResponseFormatter<FetchImageTestResponse> = (
  result,
) => ({
  structuredContent: result,
  content: [
    {
      type: "image",
      data: result.data,
      mimeType: result.mimeType,
    },
  ],
});

export const registerFetchImageTestTool = async (
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
          title: "Fetch Cat Image",
          description: TOOL_DESCRIPTION,
          inputSchema: FetchImageTestInputSchema.shape,
          outputSchema: FetchImageTestResponseSchema.shape,
          annotations: {
            readOnlyHint: true,
            openWorldHint: true,
          },
        },
        createToolHandler(TOOL_NAME, fetchImageTestLogic, responseFormatter),
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
