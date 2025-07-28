/**
 * @fileoverview Core types and interfaces for the transport layer abstraction.
 * @module src/mcp-server/transports/core/transportTypes
 */

import { RequestContext } from "../../../utils/index.js";

/**
 * Valid HTTP status codes for transport responses.
 */
export type HttpStatusCode =
  | 200
  | 201
  | 400
  | 401
  | 403
  | 404
  | 409
  | 429
  | 500
  | 502
  | 503;

/**
 * Represents the result of a transport operation.
 */
export interface TransportResponse {
  sessionId?: string;
  headers: Headers;
  statusCode: HttpStatusCode;
  body?: unknown;
  stream?: ReadableStream<Uint8Array>;
}

/**
 * Represents an active transport session.
 */
export interface TransportSession {
  id: string;
  createdAt: Date;
  lastAccessedAt: Date;
}

/**
 * Abstract interface for managing MCP transport sessions and operations.
 * This interface separates transport logic from HTTP routing concerns.
 */
export interface TransportManager {
  /**
   * Initializes a new session and handles the request in a single operation.
   * This is used for the initial `initialize` request.
   * @param req The raw Node.js IncomingMessage object.
   * @param res The raw Node.js ServerResponse object.
   * @param body The parsed body of the request.
   * @param context Request context for logging and tracing.
   * @returns A promise that resolves with the ServerResponse after handling.
   */
  initializeAndHandle(
    req: unknown,
    res: unknown,
    body: unknown,
    context: RequestContext,
  ): Promise<unknown>;

  /**
   * Handles an incoming HTTP request for a given session by delegating it
   * to the underlying MCP SDK transport. This method is responsible for
   * managing the entire lifecycle of a request, including streaming responses.
   *
   * @param sessionId The session identifier.
   * @param req The raw Node.js IncomingMessage object.
   * @param res The raw Node.js ServerResponse object.
   * @param body The parsed body of the request (for POST). Can be undefined for GET.
   * @param context Request context for logging and tracing.
   * @returns A promise that resolves when the request has been handled.
   */
  handleRequest(
    sessionId: string,
    req: unknown, // Using 'unknown' for http agnosticism
    res: unknown,
    context: RequestContext,
    body?: unknown,
  ): Promise<void>;

  /**
   * Handle a DELETE request to close a session.
   * @param sessionId The session identifier.
   * @param context Request context for logging and tracing.
   * @returns Promise resolving to transport response.
   */
  handleDeleteRequest(
    sessionId: string,
    context: RequestContext,
  ): Promise<TransportResponse>;

  /**
   * Retrieve session information.
   * @param sessionId The session identifier.
   * @returns The session if it exists, undefined otherwise.
   */
  getSession(sessionId: string): TransportSession | undefined;

  /**
   * Clean up resources and close all sessions.
   */
  shutdown(): Promise<void>;
}
