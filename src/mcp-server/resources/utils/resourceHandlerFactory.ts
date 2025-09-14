/**
 * @fileoverview A factory for registering standardized MCP resources from definitions.
 * Encapsulates context creation, error handling, and response formatting, keeping
 * resource logic pure and stateless.
 * @module src/mcp-server/resources/utils/resourceHandlerFactory
 */
import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape, z } from 'zod';

import { JsonRpcErrorCode } from '@/types-global/errors.js';
import {
  ErrorHandler,
  type RequestContext,
  logger,
  requestContextService,
} from '@/utils/index.js';
import type { ResourceDefinition } from '@/mcp-server/resources/utils/resourceDefinition.js';

/** Default formatter producing a single JSON text content block. */
function defaultResponseFormatter(
  result: unknown,
  meta: { uri: URL; mimeType: string },
): ReadResourceResult['contents'] {
  return [
    {
      uri: meta.uri.href,
      text: JSON.stringify(result),
      mimeType: meta.mimeType,
    },
  ];
}

/**
 * Registers a single resource definition with the provided MCP server.
 */
export async function registerResource<
  TParamsSchema extends ZodObject<ZodRawShape>,
  TOutputSchema extends ZodObject<ZodRawShape> | undefined = undefined,
>(
  server: McpServer,
  def: ResourceDefinition<TParamsSchema, TOutputSchema>,
): Promise<void> {
  const resourceName = def.name;
  const registrationContext: RequestContext =
    requestContextService.createRequestContext({
      operation: 'RegisterResource',
      additionalContext: { resourceName },
    });

  logger.info(`Registering resource: '${resourceName}'`, registrationContext);

  await ErrorHandler.tryCatch(
    () => {
      const template = new ResourceTemplate(def.uriTemplate, {
        list: def.list,
      });

      const mimeType = def.mimeType ?? 'application/json';
      const formatter = def.responseFormatter ?? defaultResponseFormatter;
      const title = def.title ?? resourceName;

      server.resource(
        resourceName,
        template,
        {
          name: title,
          description: def.description,
          mimeType,
          ...(def.examples && { examples: def.examples }),
        },
        (uri, params, callContext): ReadResourceResult => {
          const sessionId =
            typeof callContext?.sessionId === 'string'
              ? callContext.sessionId
              : undefined;

          const handlerContext: RequestContext =
            requestContextService.createRequestContext({
              parentContext: callContext,
              operation: 'HandleResourceRead',
              additionalContext: {
                resourceUri: uri.href,
                sessionId,
                inputParams: params,
              },
            });

          try {
            // Validate params via the schema before invoking logic
            type TParams = z.infer<TParamsSchema>;
            type TOutput =
              TOutputSchema extends ZodObject<ZodRawShape>
                ? z.infer<TOutputSchema>
                : unknown;
            const parsedParams = def.paramsSchema.parse(params) as TParams;
            const responseData = def.logic(
              uri,
              parsedParams,
              handlerContext,
            ) as TOutput;

            const contents = formatter(responseData, { uri, mimeType });
            return { contents };
          } catch (error) {
            // Re-throw to be caught by the SDK's top-level error handler
            throw ErrorHandler.handleError(error, {
              operation: `resource:${resourceName}:readHandler`,
              context: handlerContext,
              input: { uri: uri.href, params },
            });
          }
        },
      );

      logger.notice(
        `Resource '${resourceName}' registered successfully.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringResource_${resourceName}`,
      context: registrationContext,
      errorCode: JsonRpcErrorCode.InitializationFailed,
      critical: true,
    },
  );
}
