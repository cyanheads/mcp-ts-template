/**
 * @fileoverview Provides a generic factory for creating MCP tool handlers.
 * This utility centralizes common logic for performance measurement, error handling,
 * and response formatting, reducing boilerplate in individual tool registration files.
 * @module src/mcp-server/tools/utils/tool-utils
 */

import { McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  getRequestContext,
  measureToolExecution,
} from "../../../utils/index.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Defines the function signature for a core tool logic implementation.
 * @template TInput The type of the validated input parameters.
 * @template TOutput The type of the successful output from the logic.
 * @param params The validated input parameters for the tool.
 * @returns A promise that resolves with the tool's output.
 */
type ToolLogicFn<TInput, TOutput> = (params: TInput) => Promise<TOutput>;

/**
 * Defines the function signature for formatting a successful tool logic result
 * into the final structure expected by the MCP server.
 * @template TOutput The type of the successful output from the logic.
 * @param result The successful output from the tool's logic function.
 * @returns The formatted tool response.
 */
export type ResponseFormatter<TOutput> = (result: TOutput) => CallToolResult;

/**
 * A generic handler function for an MCP tool.
 * @template TInput The type of the validated input parameters.
 */
export type McpToolHandler<TInput> = (
  params: TInput,
) => Promise<CallToolResult>;

/**
 * Creates a standardized MCP tool handler.
 * This factory wraps the core business logic with cross-cutting concerns like
 * performance monitoring and centralized error handling.
 *
 * @template TInput The type of the validated input parameters.
 * @template TOutput The type of the successful output from the logic.
 * @param toolName The name of the tool, used for logging and metrics.
 * @param logicFn The core business logic function for the tool.
 * @param responseFormatter A function to format the successful output.
 * @returns A complete MCP tool handler function.
 */
export function createToolHandler<TInput, TOutput>(
  toolName: string,
  logicFn: ToolLogicFn<TInput, TOutput>,
  responseFormatter: ResponseFormatter<TOutput>,
): McpToolHandler<TInput> {
  return async (params: TInput) => {
    try {
      const result = await measureToolExecution(
        toolName,
        () => logicFn(params),
        params,
      );
      return responseFormatter(result);
    } catch (error) {
      const mcpError = ErrorHandler.handleError(error, {
        operation: `tool:${toolName}`,
        context: getRequestContext(),
        input: params,
      }) as McpError;

      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${mcpError.message}` }],
        structuredContent: {
          code: mcpError.code,
          message: mcpError.message,
          details: mcpError.details,
        },
      };
    }
  };
}
