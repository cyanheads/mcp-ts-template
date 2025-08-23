/**
 * @fileoverview Hono middleware for handling MCP transport logic.
 * This middleware is responsible for adapting an incoming Hono request into a
 * standardized McpTransportRequest object and delegating all further processing
 * to the provided TransportManager. It no longer contains any session logic itself.
 * @module src/mcp-server/transports/http/mcpTransportMiddleware
 */

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import {
  requestContextService,
  withRequestContext,
} from "../../../utils/index.js";
import { convertWebHeadersToNodeHeaders } from "../core/headerUtils.js"; // Import the utility
import { McpTransportRequest } from "../core/transportRequest.js";
import { TransportManager, TransportResponse } from "../core/transportTypes.js";
import { HonoNodeBindings } from "./httpTypes.js";

type McpMiddlewareEnv = {
  Variables: {
    mcpResponse: TransportResponse;
    // Add requestId for use in the error handler
    requestId: string | number | null;
  };
};

export const mcpTransportMiddleware = (
  transportManager: TransportManager,
): MiddlewareHandler<McpMiddlewareEnv & { Bindings: HonoNodeBindings }> => {
  return createMiddleware<McpMiddlewareEnv & { Bindings: HonoNodeBindings }>(
    async (c, next) => {
      const sessionId = c.req.header("mcp-session-id");
      const context = requestContextService.createRequestContext({
        operation: "mcpTransportMiddleware",
        sessionId,
        transport: "http",
      });

      await withRequestContext(context, async () => {
        let body: unknown;
        let requestId: string | number | null = null;

        try {
          body = await c.req.json();

          // Safely extract ID
          if (body && typeof body === "object" && "id" in body) {
            const id = (body as { id: unknown }).id;
            if (
              typeof id === "string" ||
              typeof id === "number" ||
              id === null
            ) {
              requestId = id;
            }
          }
        } catch (_error) {
          // Ensure requestId is set even if parsing fails
          c.set("requestId", null);
          throw new McpError(
            ErrorCode.ParseError,
            "Failed to parse request body as JSON.",
          );
        }

        c.set("requestId", requestId); // Store in context

        const transportRequest: McpTransportRequest = {
          // Use the centralized utility
          headers: convertWebHeadersToNodeHeaders(c.req.raw.headers),
          body,
          context,
          sessionId: sessionId || undefined,
        };

        const response = await transportManager.handleRequest(transportRequest);

        c.set("mcpResponse", response);
        await next();
      });
    },
  );
};
