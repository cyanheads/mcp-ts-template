/**
 * @fileoverview Handles registration and error handling for the `echo_message` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/echoTool/registration
 **/

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { JsonRpcErrorCode } from "../../../types-global/errors.js";
import { ErrorHandler, requestContextService } from "../../../utils/index.js";
import {
  logOperationStart,
  logOperationSuccess,
} from "../../../utils/internal/logging-helpers.js";
import { createToolHandler, ResponseFormatter } from "../utils/tool-utils.js";
import {
  EchoToolInputSchema,
  echoToolLogic,
  EchoToolResponse,
  EchoToolResponseSchema,
} from "./logic.js";

const TOOL_NAME = "echo_message";
const TOOL_DESCRIPTION =
  "Echoes a message back with optional formatting and repetition.";

const responseFormatter: ResponseFormatter<EchoToolResponse> = (result) => ({
  structuredContent: result,
  content: [
    { type: "text", text: `Success: ${JSON.stringify(result, null, 2)}` },
  ],
});

export const registerEchoTool = async (server: McpServer): Promise<void> => {
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
          title: "Echo Message",
          description: TOOL_DESCRIPTION,
          inputSchema: EchoToolInputSchema.shape,
          outputSchema: EchoToolResponseSchema.shape,
          annotations: {
            readOnlyHint: true,
            openWorldHint: false,
          },
        },
        createToolHandler(TOOL_NAME, echoToolLogic, responseFormatter),
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
