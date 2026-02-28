/**
 * @fileoverview A factory for creating standardized MCP tool handlers.
 * This module abstracts away the boilerplate of error handling, context creation,
 * performance measurement, and response formatting for tool handlers.
 * @module mcp-server/tools/utils/toolHandlerFactory
 */
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  CallToolResult,
  ContentBlock,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
import { measureToolExecution } from '@/utils/internal/performance.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';
import { requestContextService } from '@/utils/internal/requestContext.js';
import type { SdkContext } from './toolDefinition.js';

// Default formatter for successful responses
const defaultResponseFormatter = (result: unknown): ContentBlock[] => [
  { type: 'text', text: JSON.stringify(result, null, 2) },
];

/**
 * Options for creating an MCP tool handler via the factory.
 * Uses `AnySchema` from the SDK for Zod 3/4 compatibility.
 */
export type ToolHandlerFactoryOptions<
  TInputSchema extends AnySchema,
  TOutput extends Record<string, unknown>,
> = {
  toolName: string;
  /** The input schema, captured for type inference (not used at runtime). */
  inputSchema: TInputSchema;
  logic: (
    input: z.infer<TInputSchema>,
    appContext: RequestContext,
    sdkContext: SdkContext,
  ) => Promise<TOutput>;
  responseFormatter?: (result: TOutput) => ContentBlock[];
};

/**
 * Creates a standardized MCP tool handler.
 * This factory encapsulates context creation, performance measurement,
 * error handling, and response formatting. It separates the app's internal
 * RequestContext from the SDK's `callContext` (which we type as `SdkContext`).
 *
 * @param options - Factory options including toolName, inputSchema, logic, and optional responseFormatter
 * @returns A handler function compatible with the MCP SDK's ToolCallback type
 */
export function createMcpToolHandler<
  TInputSchema extends AnySchema,
  TOutput extends Record<string, unknown>,
>({
  toolName,
  inputSchema: _inputSchema, // Captured for type inference, not used at runtime
  logic,
  responseFormatter = defaultResponseFormatter,
}: ToolHandlerFactoryOptions<TInputSchema, TOutput>): (
  input: z.infer<TInputSchema>,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
) => Promise<CallToolResult> {
  return async (
    input: z.infer<TInputSchema>,
    callContext: Record<string, unknown>,
  ): Promise<CallToolResult> => {
    // The SDK types `extra` as `Record<string, unknown>` at this boundary, but the
    // runtime object always carries the full SdkContext shape (signal, sendNotification,
    // sendRequest, authInfo, and optional capabilities like elicitInput/createMessage).
    // This cast is unavoidable at the SDK/app type boundary.
    const sdkContext = callContext as SdkContext;

    const sessionId = typeof sdkContext?.sessionId === 'string' ? sdkContext.sessionId : undefined;

    // Extract only plain-data fields from sdkContext — spreading the raw SDK
    // object copies native objects (AbortSignal) that crash Pino serialization.
    const appContext = requestContextService.createRequestContext({
      parentContext: {
        ...(typeof sdkContext?.requestId === 'string' ? { requestId: sdkContext.requestId } : {}),
        ...(sessionId ? { sessionId } : {}),
      },
      operation: 'HandleToolRequest',
      additionalContext: { toolName, sessionId, input },
    });

    try {
      const result = await measureToolExecution(
        // Pass both the app's internal context and the full SDK context to the logic.
        () => logic(input, appContext, sdkContext),
        { ...appContext, toolName },
        input,
      );

      return {
        structuredContent: result,
        content: responseFormatter(result),
      };
    } catch (error: unknown) {
      // handleError always returns McpError when no errorMapper is provided,
      // but its declared return type is the broader Error. Narrow with instanceof.
      const handled = ErrorHandler.handleError(error, {
        operation: `tool:${toolName}`,
        context: appContext,
        input,
      });
      const mcpError =
        handled instanceof McpError
          ? handled
          : new McpError(JsonRpcErrorCode.InternalError, handled.message, {
              originalError: handled.name,
            });

      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${mcpError.message}` }],
        structuredContent: {
          code: mcpError.code,
          message: mcpError.message,
          data: mcpError.data,
        },
      };
    }
  };
}
