/**
 * @fileoverview Abstract base class for transport managers.
 * @module src/mcp-server/transports/core/baseTransportManager
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, requestContextService } from "@/utils/index.js";
import { McpTransportRequest } from "./transportRequest.js";
import { TransportManager, TransportResponse } from "./transportTypes.js";

/**
 * Abstract base class for transport managers, providing common functionality.
 */
export abstract class BaseTransportManager implements TransportManager {
  protected readonly createServerInstanceFn: () => Promise<McpServer>;

  constructor(createServerInstanceFn: () => Promise<McpServer>) {
    const context = requestContextService.createRequestContext({
      operation: "BaseTransportManager.constructor",
      managerType: this.constructor.name,
    });
    logger.debug(context, "Initializing transport manager.");
    this.createServerInstanceFn = createServerInstanceFn;
  }

  abstract handleRequest(
    request: McpTransportRequest,
  ): Promise<TransportResponse>;

  abstract shutdown(): Promise<void>;
}
