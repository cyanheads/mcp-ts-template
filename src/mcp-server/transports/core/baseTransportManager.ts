/**
 * @fileoverview Abstract base class for transport managers.
 * @module src/mcp-server/transports/core/baseTransportManager
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RequestContext } from "../../../utils/index.js";
import { TransportManager } from "./transportTypes.js";

/**
 * Abstract base class for transport managers, providing common functionality.
 */
export abstract class BaseTransportManager implements TransportManager {
  protected readonly createServerInstanceFn: () => Promise<McpServer>;

  constructor(createServerInstanceFn: () => Promise<McpServer>) {
    this.createServerInstanceFn = createServerInstanceFn;
  }

  abstract handleRequest(
    req: unknown,
    res: unknown,
    body: unknown,
    context: RequestContext,
    sessionId?: string,
  ): Promise<unknown>;

  abstract shutdown(): Promise<void>;
}
