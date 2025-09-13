/**
 * @fileoverview Abstract base class for transport managers.
 * @module src/mcp-server/transports/core/baseTransportManager
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingHttpHeaders, ServerResponse } from 'http';
import { Readable } from 'stream';

import {
  RequestContext,
  logger,
  requestContextService,
} from '../../../utils/index.js';
import { convertNodeHeadersToWebHeaders } from './headerUtils.js';
import { HonoStreamResponse } from './honoNodeBridge.js';
import type {
  HttpStatusCode,
  TransportManager,
  TransportResponse,
} from './transportTypes.js';

/**
 * Abstract base class for transport managers, providing common functionality.
 */
export abstract class BaseTransportManager implements TransportManager {
  protected readonly createServerInstanceFn: () => Promise<McpServer>;

  constructor(createServerInstanceFn: () => Promise<McpServer>) {
    const context = requestContextService.createRequestContext({
      operation: 'BaseTransportManager.constructor',
      managerType: this.constructor.name,
    });
    logger.debug('Initializing transport manager.', context);
    this.createServerInstanceFn = createServerInstanceFn;
  }

  abstract handleRequest(
    headers: IncomingHttpHeaders,
    body: unknown,
    context: RequestContext,
    sessionId?: string,
  ): Promise<TransportResponse>;

  abstract shutdown(): Promise<void>;

  /**
   * Processes a request using a provided SDK transport instance and bridges
   * the Node.js-style response to a Web Standards-based TransportResponse.
   * @param transport The StreamableHTTPServerTransport instance to handle the request.
   * @param headers The incoming request headers.
   * @param body The request body.
   * @param endpointPath The path for the mock request URL.
   * @returns A promise that resolves to a streaming TransportResponse.
   * @protected
   */
  protected async _processRequestWithBridge(
    transport: StreamableHTTPServerTransport,
    headers: IncomingHttpHeaders,
    body: unknown,
    endpointPath: string,
  ): Promise<TransportResponse> {
    const mockReq = {
      headers,
      method: 'POST',
      url: endpointPath,
    } as import('http').IncomingMessage;
    const mockRes = new HonoStreamResponse() as unknown as ServerResponse;

    await transport.handleRequest(mockReq, mockRes, body);

    const responseHeaders = convertNodeHeadersToWebHeaders(
      mockRes.getHeaders(),
    );
    if (transport.sessionId) {
      responseHeaders.set('Mcp-Session-Id', transport.sessionId);
    }

    const webStream = Readable.toWeb(
      mockRes as unknown as HonoStreamResponse,
    ) as ReadableStream<Uint8Array>;

    const sessionId = transport.sessionId;
    return {
      type: 'stream',
      headers: responseHeaders,
      statusCode: mockRes.statusCode as HttpStatusCode,
      stream: webStream,
      ...(sessionId && { sessionId }),
    };
  }
}
