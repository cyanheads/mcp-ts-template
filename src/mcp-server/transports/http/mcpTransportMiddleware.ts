/**
 * @fileoverview Hono middleware for handling MCP transport logic.
 * This middleware encapsulates the logic for processing MCP requests,
 * delegating to the appropriate transport manager, and preparing the
 * response for Hono to send.
 * @module src/mcp-server/transports/http/mcpTransportMiddleware
 */
import { MiddlewareHandler } from 'hono';
import { IncomingHttpHeaders } from 'http';

import { requestContextService } from '../../../utils/index.js';
import { TransportManager, TransportResponse } from '../core/transportTypes.js';
import { HonoNodeBindings } from './httpTypes.js';

/**
 * Converts a Fetch API Headers object to Node.js IncomingHttpHeaders.
 * @param headers - The Headers object to convert.
 * @returns An object compatible with IncomingHttpHeaders.
 */
function toIncomingHttpHeaders(headers: Headers): IncomingHttpHeaders {
  const result: IncomingHttpHeaders = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

type McpMiddlewareEnv = {
  Variables: {
    mcpResponse: TransportResponse;
  };
};

export const mcpTransportMiddleware = (
  transportManager: TransportManager,
): MiddlewareHandler<McpMiddlewareEnv & { Bindings: HonoNodeBindings }> => {
  return async (c, next) => {
    const sessionId = c.req.header('mcp-session-id');
    const context = requestContextService.createRequestContext({
      operation: 'mcpTransportMiddleware',
      sessionId,
    });

    const body = (await c.req.json()) as unknown;

    // The logic is now beautifully simple. Just delegate.
    const response = await transportManager.handleRequest(
      toIncomingHttpHeaders(c.req.raw.headers),
      body,
      context,
      sessionId,
    );

    c.set('mcpResponse', response);
    await next();
  };
};
