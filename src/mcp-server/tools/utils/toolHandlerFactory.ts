/**
 * @fileoverview Handler factory for tool definitions.
 * Constructs Context, checks inline auth, measures execution, formats response.
 * @module src/mcp-server/tools/utils/toolHandlerFactory
 */

import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  CallToolResult,
  ContentBlock,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';

import type { ZodObject, ZodRawShape } from 'zod';

import type { Context, SamplingOpts } from '@/core/context.js';
import { createContext } from '@/core/context.js';
import { withRequiredScopes } from '@/mcp-server/transports/auth/lib/authUtils.js';
import type { StorageService } from '@/storage/core/StorageService.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
import type { Logger } from '@/utils/internal/logger.js';
import { measureToolExecution } from '@/utils/internal/performance.js';
import { requestContextService } from '@/utils/internal/requestContext.js';
import type { AnyToolDefinition } from './toolDefinition.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SdkExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

interface SdkRuntimeCapabilities {
  createMessage?: (params: Record<string, unknown>) => Promise<unknown>;
  elicitInput?: (params: { message: string; requestedSchema: unknown }) => Promise<unknown>;
}

/** Services required by the handler factory to construct Context. */
export interface HandlerFactoryServices {
  logger: Logger;
  notifyResourceListChanged?: () => void;
  notifyResourceUpdated?: (uri: string) => void;
  storage: StorageService;
}

// ---------------------------------------------------------------------------
// Default formatter
// ---------------------------------------------------------------------------

const defaultResponseFormatter = (result: unknown): ContentBlock[] => [
  { type: 'text', text: JSON.stringify(result, null, 2) },
];

// ---------------------------------------------------------------------------
// Capability detection helpers
// ---------------------------------------------------------------------------

function wrapElicit(sdkContext: SdkRuntimeCapabilities): Context['elicit'] {
  if (typeof sdkContext.elicitInput !== 'function') return;
  const fn = sdkContext.elicitInput;
  return (msg: string, schema: ZodObject<ZodRawShape>) =>
    fn({ message: msg, requestedSchema: schema }) as ReturnType<NonNullable<Context['elicit']>>;
}

function wrapSample(sdkContext: SdkRuntimeCapabilities): Context['sample'] {
  if (typeof sdkContext.createMessage !== 'function') return;
  const fn = sdkContext.createMessage;
  return (msgs: Parameters<NonNullable<Context['sample']>>[0], opts?: SamplingOpts) =>
    fn({ messages: msgs, ...opts }) as ReturnType<NonNullable<Context['sample']>>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an MCP tool handler from a tool definition.
 * The returned function is compatible with the MCP SDK's ToolCallback type.
 *
 * Responsibilities:
 * - Creates RequestContext from SDK context (for tracing)
 * - Creates unified Context (for the handler)
 * - Checks inline `auth` scopes if defined
 * - Validates input via Zod schema
 * - Measures execution time
 * - Formats response via `format` or JSON default
 * - Catches errors and returns `isError: true`
 */
export function createToolHandler(
  def: AnyToolDefinition,
  services: HandlerFactoryServices,
): (input: Record<string, unknown>, extra: SdkExtra) => Promise<CallToolResult> {
  const formatter = def.format ?? defaultResponseFormatter;

  return async (input, callContext): Promise<CallToolResult> => {
    // The SDK types `extra` as Record<string, unknown> at the boundary
    const sdkContext = callContext as unknown as SdkExtra;
    const sdkCaps = callContext as unknown as SdkRuntimeCapabilities;

    const sessionId = typeof sdkContext?.sessionId === 'string' ? sdkContext.sessionId : undefined;

    // Create internal RequestContext for tracing
    const appContext = requestContextService.createRequestContext({
      parentContext: {
        ...(typeof sdkContext?.requestId === 'string' ? { requestId: sdkContext.requestId } : {}),
        ...(sessionId ? { sessionId } : {}),
      },
      operation: 'HandleToolRequest',
      additionalContext: { toolName: def.name, sessionId, input },
    });

    try {
      // Check inline auth scopes
      if (def.auth && def.auth.length > 0) {
        withRequiredScopes(def.auth, appContext);
      }

      // Validate input
      const validatedInput = def.input.parse(input);

      // Construct Context with detected capabilities
      const ctx = createContext({
        appContext,
        logger: services.logger,
        storage: services.storage,
        signal: sdkContext.signal,
        elicit: wrapElicit(sdkCaps),
        sample: wrapSample(sdkCaps),
        notifyResourceListChanged: services.notifyResourceListChanged,
        notifyResourceUpdated: services.notifyResourceUpdated,
      });

      // Execute handler with performance measurement.
      // Wrap with Promise.resolve — handler may return sync or async.
      const result = await measureToolExecution(
        () => Promise.resolve(def.handler(validatedInput, ctx)),
        { ...appContext, toolName: def.name },
        validatedInput,
      );

      const validatedResult = def.output.parse(result);

      // Isolate formatter errors from handler errors so they get classified correctly
      let content: ContentBlock[];
      try {
        content = formatter(validatedResult);
      } catch (formatError) {
        throw new Error(
          `Output formatting failed: ${formatError instanceof Error ? formatError.message : String(formatError)}`,
        );
      }

      return {
        structuredContent: validatedResult,
        content,
      };
    } catch (error: unknown) {
      const handled = ErrorHandler.handleError(error, {
        operation: `tool:${def.name}`,
        context: appContext,
        input,
      });
      const mcpError =
        handled instanceof McpError
          ? handled
          : new McpError(JsonRpcErrorCode.InternalError, handled.message, {
              originalError: handled.name,
            });

      // Surface error classification via _meta so programmatic clients can distinguish error types (auth, validation, not-found, etc.) without parsing the text message. Only propagate data from explicitly thrown McpError instances — ErrorHandler enrichment contains internal context (stack traces, operation details) that shouldn't be client-visible.
      const originalData = error instanceof McpError ? error.data : undefined;
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${mcpError.message}` }],
        _meta: {
          error: {
            code: mcpError.code,
            ...(originalData !== undefined && { data: originalData }),
          },
        },
      };
    }
  };
}
