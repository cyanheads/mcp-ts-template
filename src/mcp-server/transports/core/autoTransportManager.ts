/**
 * @fileoverview Implements the "auto" mode transport manager.
 * This manager acts as a router, delegating requests to either a stateful or a
 * stateless manager based on the request's characteristics. It encapsulates the
 * logic for providing a hybrid session model.
 * @module src/mcp-server/transports/core/autoTransportManager
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { RequestContext } from "../../../utils/index.js";
import { McpTransportRequest } from "./transportRequest.js";
import {
  StatefulTransportManager,
  StatefulTransportOptions,
} from "./statefulTransportManager.js";
import { StatelessTransportManager } from "./statelessTransportManager.js";
import { TransportManager, TransportResponse } from "./transportTypes.js";

/**
 * A transport manager that dynamically handles both stateful and stateless requests.
 * It inspects each request and routes it to an underlying stateful manager if it
 * contains a session ID or is an initialization request. Otherwise, it handles
 * the request ephemerally using a temporary stateless manager.
 */
export class AutoTransportManager implements TransportManager {
  private readonly statefulManager: StatefulTransportManager;
  private readonly statelessManager: StatelessTransportManager;

  /**
   * @param createServerInstanceFn A factory function to create new McpServer instances.
   * @param options Configuration options, primarily for the underlying stateful manager.
   */
  constructor(
    createServerInstanceFn: () => Promise<McpServer>,
    options: StatefulTransportOptions,
  ) {
    this.statefulManager = new StatefulTransportManager(
      createServerInstanceFn,
      options,
    );
    this.statelessManager = new StatelessTransportManager(
      createServerInstanceFn,
    );
  }

  /**
   * Handles an incoming request by routing it to the appropriate manager.
   * If the request is an `initialize` request or includes a session ID, it is
   * delegated to the stateful manager. Otherwise, a new stateless manager is
   * created to handle the single request.
   * @param request The standardized transport request object.
   * @returns A promise that resolves to a TransportResponse object.
   */
  async handleRequest(
    request: McpTransportRequest,
  ): Promise<TransportResponse> {
    const { body, sessionId } = request;

    // Route to stateful manager if it's an initialize request or has a session ID
    if (isInitializeRequest(body) || sessionId) {
      // The plan describes an intermediate state for StatefulTransportManager's handleRequest,
      // but for consistency with the new TransportManager interface, we will pass the whole request object.
      // This anticipates the final state of the refactoring.
      return this.statefulManager.handleRequest(request);
    }

    // Otherwise, handle as a one-off stateless request
    return this.statelessManager.handleRequest(request);
  }

  /**
   * Delegates a session deletion request to the underlying stateful manager.
   * @param sessionId The ID of the session to delete.
   * @param context The request context.
   * @returns A promise resolving to a TransportResponse confirming closure.
   */
  async handleDeleteRequest(
    sessionId: string,
    context: RequestContext,
  ): Promise<TransportResponse> {
    return this.statefulManager.handleDeleteRequest(sessionId, context);
  }

  /**
   * Shuts down the underlying stateful manager, cleaning up all its resources.
   */
  async shutdown(): Promise<void> {
    await this.statefulManager.shutdown();
  }
}
