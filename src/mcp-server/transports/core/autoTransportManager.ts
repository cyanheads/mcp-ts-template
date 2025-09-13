/**
 * @fileoverview Implements an 'auto' mode transport manager for the MCP SDK.
 * This manager acts as a router, delegating requests to either a stateful or
 * stateless handler based on the request content (e.g., presence of an
 * `initialize` method).
 * @module src/mcp-server/transports/core/autoTransportManager
 */
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { IncomingHttpHeaders } from 'http';
import { inject, injectable } from 'tsyringe';

import { RequestContext } from '../../../utils/index.js';
import { StatefulTransportManager } from './statefulTransportManager.js';
import { StatelessTransportManager } from './statelessTransportManager.js';
import {
  IStatefulTransportManager,
  TransportManager,
  TransportResponse,
} from './transportTypes.js';

@injectable()
export class AutoTransportManager implements TransportManager {
  constructor(
    // Inject the concrete managers. The container will resolve them.
    @inject(StatefulTransportManager)
    private statefulManager: IStatefulTransportManager,
    @inject(StatelessTransportManager)
    private statelessManager: StatelessTransportManager,
  ) {}

  /**
   * Handles an incoming request by routing it to the appropriate handler.
   * @param headers The incoming request headers.
   * @param body The parsed body of the request.
   * @param context The request context for logging and tracing.
   * @param sessionId An optional session identifier.
   * @returns A promise that resolves to a TransportResponse object.
   */
  public async handleRequest(
    headers: IncomingHttpHeaders,
    body: unknown,
    context: RequestContext,
    sessionId?: string,
  ): Promise<TransportResponse> {
    // If it's an initialization request, always start a new stateful session.
    if (isInitializeRequest(body)) {
      return this.statefulManager.initializeAndHandle(headers, body, context);
    }

    // If a session ID is provided, delegate to the stateful manager.
    if (sessionId) {
      return this.statefulManager.handleRequest(
        headers,
        body,
        context,
        sessionId,
      );
    }
    // Otherwise, handle it as a one-off stateless request.

    // Use the injected stateless manager.
    return this.statelessManager.handleRequest(headers, body, context);
  }

  /**
   * Gracefully shuts down the underlying stateful manager.
   */
  public async shutdown(): Promise<void> {
    await this.statefulManager.shutdown();
  }
}
