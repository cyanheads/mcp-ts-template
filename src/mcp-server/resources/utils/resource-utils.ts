/**
 * @fileoverview Provides a generic factory for creating MCP resource handlers.
 * This utility centralizes common logic for context creation, performance measurement,
 * error handling, and response formatting, reducing boilerplate in individual
 * resource registration files.
 * @module src/mcp-server/resources/utils/resource-utils
 */

import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import {
  ErrorHandler,
  measureToolExecution,
  requestContextService,
  RequestContext,
} from "../../../utils/index.js";

/**
 * Defines the function signature for a core resource logic implementation.
 * @template TParams The type of the validated query parameters.
 * @template TPayload The type of the successful output payload from the logic.
 * @param uri The full URL object of the incoming resource request.
 * @param params The validated query parameters for the request.
 * @param context The request context for logging and tracing.
 * @returns A promise that resolves with the resource's data payload.
 */
type ResourceLogicFn<TParams, TPayload> = (
  uri: URL,
  params: TParams,
  context: RequestContext,
) => Promise<TPayload>;

/**
 * Defines the function signature for formatting a successful resource logic result
 * into the final structure expected by the MCP server.
 * @template TPayload The type of the successful output from the logic.
 * @param result The successful output from the resource's logic function.
 * @param uri The original request URI.
 * @returns The formatted resource response.
 */
export type ResourceResponseFormatter<TPayload> = (
  result: TPayload,
  uri: URL,
) => ReadResourceResult;

/**
 * Creates a standardized MCP resource handler.
 * This factory wraps the core business logic with context creation, performance
 * monitoring, and centralized error handling.
 *
 * @template TParams The type of the validated query parameters.
 * @template TPayload The type of the successful output from the logic.
 * @param resourceName The name of the resource, used for logging and metrics.
 * @param logicFn The core business logic function for the resource.
 * @param responseFormatter A function to format the successful output.
 * @returns A complete MCP resource handler function.
 */
export function createResourceHandler<TParams, TPayload>(
  resourceName: string,
  logicFn: ResourceLogicFn<TParams, TPayload>,
  responseFormatter: ResourceResponseFormatter<TPayload>,
) {
  return async (
    uri: URL,
    params: TParams,
    callContext: Record<string, unknown>,
  ): Promise<ReadResourceResult> => {
    const handlerContext = requestContextService.createRequestContext({
      parentContext: callContext,
      operation: "HandleResourceRead",
      resourceUri: uri.href,
      inputParams: params,
    });

    try {
      // Wrap the logic call with performance measurement
      const result = await measureToolExecution(
        `resource:${resourceName}`,
        () => logicFn(uri, params, handlerContext),
        params,
      );
      return responseFormatter(result, uri);
    } catch (error) {
      // Re-throw to be caught by the SDK's top-level error handler
      throw ErrorHandler.handleError(error, {
        operation: `resource:${resourceName}`,
        context: handlerContext,
        input: { uri: uri.href, params },
      });
    }
  };
}
