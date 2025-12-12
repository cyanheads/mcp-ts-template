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

import type { SdkContext } from './toolDefinition.js';
import { McpError } from '@/types-global/errors.js';
import {
  ErrorHandler,
  type RequestContext,
  measureToolExecution,
  requestContextService,
} from '@/utils/index.js';

// Define a type for a context that may have elicitation capabilities.
type ElicitableContext = RequestContext & {
  elicitInput?: (args: {
    message: string;
    schema: unknown;
  }) => Promise<unknown>;
};

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
    // The `callContext` from the SDK is cast to our specific SdkContext type.
    const sdkContext = callContext as SdkContext;

    const sessionId =
      typeof sdkContext?.sessionId === 'string'
        ? sdkContext.sessionId
        : undefined;

    // Create the application's internal logger/tracing context.
    const appContext: ElicitableContext =
      requestContextService.createRequestContext({
        parentContext: sdkContext,
        operation: 'HandleToolRequest',
        additionalContext: { toolName, sessionId, input },
      });

    // If the SDK context supports elicitation, add it to our app context.
    // This makes it available to the tool's logic function.
    if (
      'elicitInput' in sdkContext &&
      typeof sdkContext.elicitInput === 'function'
    ) {
      appContext.elicitInput = sdkContext.elicitInput as (args: {
        message: string;
        schema: unknown;
      }) => Promise<unknown>;
    }

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
      const mcpError = ErrorHandler.handleError(error, {
        operation: `tool:${toolName}`,
        context: appContext,
        input,
      }) as McpError;

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
