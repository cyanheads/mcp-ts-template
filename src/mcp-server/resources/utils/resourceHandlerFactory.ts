/**
 * @fileoverview Handler factory for resource definitions.
 * Constructs Context (with `uri`), checks inline auth, validates params, formats response.
 * @module src/mcp-server/resources/utils/resourceHandlerFactory
 */

import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import type {
  ReadResourceResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape } from 'zod';

import type { SamplingOpts } from '@/core/context.js';
import { createContext } from '@/core/context.js';
import type { AnyResourceDefinition } from '@/mcp-server/resources/utils/resourceDefinition.js';
import { withRequiredScopes } from '@/mcp-server/transports/auth/lib/authUtils.js';
import type { StorageService } from '@/storage/core/StorageService.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
import type { Logger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SdkExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

interface SdkRuntimeCapabilities {
  createMessage?: (params: Record<string, unknown>) => Promise<unknown>;
  elicitInput?: (params: { message: string; requestedSchema: unknown }) => Promise<unknown>;
}

/** Services required by the handler factory to construct Context. */
export interface ResourceHandlerFactoryServices {
  logger: Logger;
  storage: StorageService;
}

// ---------------------------------------------------------------------------
// Default formatter
// ---------------------------------------------------------------------------

function defaultResponseFormatter(
  result: unknown,
  meta: { uri: URL; mimeType: string },
): ReadResourceResult['contents'] {
  return [
    {
      uri: meta.uri.href,
      text: JSON.stringify(result, null, 2),
      mimeType: meta.mimeType,
    },
  ];
}

// ---------------------------------------------------------------------------
// Capability detection helpers
// ---------------------------------------------------------------------------

function wrapElicit(sdkContext: SdkRuntimeCapabilities) {
  if (typeof sdkContext.elicitInput !== 'function') return;
  const fn = sdkContext.elicitInput;
  return (msg: string, schema: ZodObject<ZodRawShape>) =>
    fn({ message: msg, requestedSchema: schema }) as ReturnType<
      NonNullable<import('@/core/context.js').Context['elicit']>
    >;
}

function wrapSample(sdkContext: SdkRuntimeCapabilities) {
  if (typeof sdkContext.createMessage !== 'function') return;
  const fn = sdkContext.createMessage;
  return (
    msgs: Parameters<NonNullable<import('@/core/context.js').Context['sample']>>[0],
    opts?: SamplingOpts,
  ) =>
    fn({ messages: msgs, ...opts }) as ReturnType<
      NonNullable<import('@/core/context.js').Context['sample']>
    >;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an MCP resource read handler from a resource definition.
 * The returned function is compatible with the MCP SDK's resource callback type.
 *
 * Responsibilities:
 * - Creates RequestContext from SDK context (for tracing)
 * - Creates unified Context with `ctx.uri` set
 * - Checks inline `auth` scopes if defined
 * - Validates params via Zod schema
 * - Formats response via `format` or JSON default
 * - Catches errors and re-throws for the SDK
 */
export function createResourceHandler(
  def: AnyResourceDefinition,
  services: ResourceHandlerFactoryServices,
): (uri: URL, variables: Variables, extra: SdkExtra) => Promise<ReadResourceResult> {
  const mimeType = def.mimeType ?? 'application/json';
  const formatter = def.format ?? defaultResponseFormatter;

  return async (uri, variables, callContext): Promise<ReadResourceResult> => {
    const sdkContext = callContext as unknown as SdkExtra;
    const sdkCaps = callContext as unknown as SdkRuntimeCapabilities;

    const sessionId = typeof sdkContext?.sessionId === 'string' ? sdkContext.sessionId : undefined;

    const appContext = requestContextService.createRequestContext({
      parentContext: {
        ...(typeof sdkContext?.requestId === 'string' ? { requestId: sdkContext.requestId } : {}),
        ...(sessionId ? { sessionId } : {}),
      },
      operation: 'HandleResourceRead',
      additionalContext: {
        resourceName: def.name ?? def.uriTemplate,
        resourceUri: uri.href,
        sessionId,
        inputParams: variables,
      },
    });

    try {
      // Check inline auth scopes
      if (def.auth && def.auth.length > 0) {
        withRequiredScopes(def.auth, appContext);
      }

      // Validate params via schema if defined
      const validatedParams = def.params ? def.params.parse(variables) : variables;

      // Construct Context with uri set
      const ctx = createContext({
        appContext,
        logger: services.logger,
        storage: services.storage,
        signal: sdkContext.signal,
        elicit: wrapElicit(sdkCaps),
        sample: wrapSample(sdkCaps),
        uri,
      });

      const result = await Promise.resolve(def.handler(validatedParams, ctx));

      const contents = formatter(result, { uri, mimeType });
      return { contents };
    } catch (error: unknown) {
      throw ErrorHandler.handleError(error, {
        operation: `resource:${def.name ?? def.uriTemplate}:readHandler`,
        context: appContext,
        input: { uri: uri.href, variables },
      });
    }
  };
}
