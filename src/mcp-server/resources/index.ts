/**
 * @fileoverview Centralized registration for all available MCP resources.
 * This module imports all resource registration functions and exports a single
 * function to register them all with the MCP server, simplifying server setup.
 * @module src/mcp-server/resources/index
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requestContextService } from "@/utils/index.js";
import {
  logOperationStart,
  logOperationSuccess,
} from "@/utils/internal/logging-helpers.js";
import { registerEchoResource } from "./echoResource/index.js";

/** Registers all available resources with the MCP server. */
export const registerAllResources = async (
  server: McpServer,
): Promise<void> => {
  const context = requestContextService.createRequestContext({
    operation: "registerAllResources",
  });
  logOperationStart(context, "Starting registration of all resources...");

  await Promise.all([registerEchoResource(server)]);

  logOperationSuccess(
    context,
    "All resources have been registered successfully.",
  );
};
