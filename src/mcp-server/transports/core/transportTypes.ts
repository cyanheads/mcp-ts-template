/**
 * @fileoverview Defines the core types and interfaces for the transport layer abstraction.
 * This module establishes the data contracts and abstract interfaces that decouple
 * the MCP server's core logic from specific transport implementations like HTTP or stdio.
 * @module src/mcp-server/transports/core/transportTypes
 */

import type { IncomingHttpHeaders } from "http";
import { RequestContext } from "../../../utils/index.js";

/**
 * Defines the set of valid HTTP status codes that the transport layer can return.
 * This ensures type safety and consistency in response handling.
 */
export type HttpStatusCode =
  | 200 // OK
  | 201 // Created
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 502 // Bad Gateway
  | 503; // Service Unavailable

/**
 * A base interface for all transport responses, containing common properties.
 */
interface BaseTransportResponse {
  sessionId?: string;
  headers: Headers;
  statusCode: HttpStatusCode;
}

/**
 * Represents a transport response where the entire body is buffered in memory.
 * Suitable for small, non-streamed responses.
 */
export interface BufferedTransportResponse extends BaseTransportResponse {
  type: "buffered";
  body: unknown;
}

/**
 * Represents a transport response that streams its body.
 * Essential for handling large or chunked responses efficiently without high memory usage.
 */
export interface StreamingTransportResponse extends BaseTransportResponse {
  type: "stream";
  stream: ReadableStream<Uint8Array>;
}

/**
 * A discriminated union representing the possible types of a transport response.
 * Using a discriminated union on the `type` property allows for type-safe handling
 * of different response formats (buffered vs. streamed).
 */
export type TransportResponse =
  | BufferedTransportResponse
  | StreamingTransportResponse;

/**
 * Represents the state of an active, persistent transport session.
 */
export interface TransportSession {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
  /**
   * A counter for requests currently being processed for this session.
   * This is a critical mechanism to prevent race conditions where a session
   * might be garbage-collected while a long-running request is still in flight.
   * It is incremented when a request begins and decremented when it finishes.
   */
  activeRequests: number;
}

/**
 * Defines the abstract interface for a transport manager.
 * This contract ensures that any transport manager, regardless of its statefulness,
 * provides a consistent way to handle requests and manage its lifecycle.
 */
export interface TransportManager {
  /**
   * Handles an incoming request.
   * @param headers The incoming request headers.
   * @param body The parsed body of the request.
   * @param context The request context for logging, tracing, and metadata.
   * @param sessionId An optional session identifier for stateful operations.
   * @returns A promise that resolves to a TransportResponse object.
   */
  handleRequest(
    headers: IncomingHttpHeaders,
    body: unknown,
    context: RequestContext,
    sessionId?: string,
  ): Promise<TransportResponse>;

  /**
   * Gracefully shuts down the transport manager, cleaning up any resources.
   */
  shutdown(): Promise<void>;
}

/**
 * Extends the base TransportManager with operations specific to stateful sessions.
 */
export interface StatefulTransportManager extends TransportManager {
  /**
   * Initializes a new stateful session and handles the first request.
   * @param headers The incoming request headers.
   * @param body The parsed body of the request.
   * @param context The request context.
   * @returns A promise resolving to a TransportResponse, which will include a session ID.
   */
  initializeAndHandle(
    headers: IncomingHttpHeaders,
    body: unknown,
    context: RequestContext,
  ): Promise<TransportResponse>;

  /**
   * Handles a request to explicitly delete a session.
   * @param sessionId The ID of the session to delete.
   * @param context The request context.
   * @returns A promise resolving to a TransportResponse confirming closure.
   */
  handleDeleteRequest(
    sessionId: string,
    context: RequestContext,
  ): Promise<TransportResponse>;

  /**
   * Retrieves information about a specific session.
   * @param sessionId The ID of the session to retrieve.
   * @returns A TransportSession object if the session exists, otherwise undefined.
   */
  getSession(sessionId: string): TransportSession | undefined;
}
