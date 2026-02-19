/**
 * @fileoverview Defines transport-related types.
 * @module src/mcp-server/transports/ITransport
 */
import type { ServerType } from '@hono/node-server';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type TransportServer = ServerType | McpServer;

/**
 * Transport lifecycle contract for HTTP and stdio transports.
 */
export interface ITransport {
  start(): Promise<TransportServer>;
  stop(): Promise<void>;
}
