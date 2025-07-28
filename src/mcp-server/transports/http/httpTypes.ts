/**
 * @fileoverview Defines custom types for the Hono HTTP transport layer.
 * @module src/mcp-server/transports/http/httpTypes
 */

import type { IncomingMessage, ServerResponse } from "http";

/**
 * Extends Hono's Bindings to include the raw Node.js request and response objects.
 * This is necessary for integrating with libraries like the MCP SDK that
 * need to write directly to the response stream.
 */
export type HonoNodeBindings = {
  incoming: IncomingMessage;
  res: ServerResponse;
};
