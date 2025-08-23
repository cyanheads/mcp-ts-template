// src/mcp-server/tools/index.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requestContextService } from "@/utils/index.js";
import {
  logOperationStart,
  logOperationSuccess,
} from "@/utils/internal/logging-helpers.js";
import { registerCatFactFetcherTool } from "./catFactFetcher/index.js";
import { registerEchoTool } from "./echoTool/index.js";
import { registerFetchImageTestTool } from "./imageTest/index.js";

/** Registers all available tools with the MCP server. */
export const registerAllTools = async (server: McpServer): Promise<void> => {
  const context = requestContextService.createRequestContext({
    operation: "registerAllTools",
  });
  logOperationStart(context, "Starting registration of all tools...");

  await Promise.all([
    registerCatFactFetcherTool(server),
    registerEchoTool(server),
    registerFetchImageTestTool(server),
  ]);

  logOperationSuccess(context, "All tools have been registered successfully.");
};
