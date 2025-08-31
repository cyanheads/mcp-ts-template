/**
 * @fileoverview A factory for creating standardized MCP tool handlers.
 * This module abstracts away the boilerplate of error handling, context creation,
 * performance measurement, and response formatting for tool handlers.
 * @module src/mcp-server/tools/utils/toolHandlerFactory
 */

import type {
  CallToolResult,
  ContentBlock,
} from "@modelcontextprotocol/sdk/types.js";
import { McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  measureToolExecution,
  RequestContext,
  requestContextService,
} from "../../../utils/index.js";

// Default formatter for successful responses
const defaultResponseFormatter = (result: unknown): ContentBlock[] => [
  { type: "text", text: JSON.stringify(result, null, 2) },
];

export type ToolHandlerFactoryOptions<
  TInput,
  TOutput extends Record<string, unknown>,
> = {
  toolName: string;
  logic: (input: TInput, context: RequestContext) => Promise<TOutput>;
  responseFormatter?: (result: TOutput) => ContentBlock[];
};

/**
 * Creates a standardized MCP tool handler.
 * This factory encapsulates context creation, performance measurement,
 * error handling, and response formatting.
 */
export function createMcpToolHandler<
  TInput,
  TOutput extends Record<string, unknown>,
>({
  toolName,
  logic,
  responseFormatter = defaultResponseFormatter,
}: ToolHandlerFactoryOptions<TInput, TOutput>) {
  return async (
    input: TInput,
    callContext: Record<string, unknown>,
  ): Promise<CallToolResult> => {
    const sessionId =
      typeof callContext?.sessionId === "string"
        ? callContext.sessionId
        : undefined;

    const handlerContext = requestContextService.createRequestContext({
      parentContext: callContext,
      operation: "HandleToolRequest",
      additionalContext: { toolName, sessionId, input },
    });

    try {
      const result = await measureToolExecution(
        () => logic(input, handlerContext),
        { ...handlerContext, toolName },
        input,
      );

      return {
        structuredContent: result,
        content: responseFormatter(result),
      };
    } catch (error) {
      const mcpError = ErrorHandler.handleError(error, {
        operation: `tool:${toolName}`,
        context: handlerContext,
        input,
      }) as McpError;

      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${mcpError.message}` }],
        structuredContent: {
          code: mcpError.code,
          message: mcpError.message,
          data: mcpError.data,
        },
      };
    }
  };
}
