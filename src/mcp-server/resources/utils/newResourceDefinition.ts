/**
 * @fileoverview New-style resource definition types and `resource()` builder function.
 * Uses the Phase 3 field names: `handler`, `params`, `format`, `auth`.
 * Handler receives `(params, ctx)` instead of `(uri, params, context)`.
 * @module src/mcp-server/resources/utils/newResourceDefinition
 */

import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ListResourcesResult,
  ReadResourceResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape, z } from 'zod';

import type { Context } from '@/context.js';
import type { ResourceAnnotations } from '@/mcp-server/resources/utils/resourceDefinition.js';

// Re-export ResourceAnnotations for convenience
export type { ResourceAnnotations };

/** Extra context provided to list() handlers. */
export type ListExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

/**
 * New-style resource definition with simplified field names.
 * Handler receives `(params, ctx)` — URI is available on `ctx.uri`.
 */
export interface NewResourceDefinition<
  TParams extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
  TOutput extends ZodObject<ZodRawShape> | undefined = undefined,
> {
  /** Display/behavior hints. */
  annotations?: ResourceAnnotations;
  /** Required auth scopes. */
  auth?: string[];
  /** LLM-facing description. */
  description: string;
  /** Optional examples for discoverability. */
  examples?: { name: string; uri: string }[];
  /**
   * Optional formatter mapping output to ReadResourceResult contents.
   * If omitted, a default JSON formatter is used.
   */
  format?: (
    result: unknown,
    meta: { uri: URL; mimeType: string },
  ) => ReadResourceResult['contents'];
  /**
   * The core handler function. Receives validated params and unified Context.
   * URI is available on `ctx.uri`. Throw McpError on failure.
   */
  handler: (
    params: z.infer<TParams>,
    ctx: Context,
  ) => TOutput extends ZodObject<ZodRawShape>
    ? z.infer<TOutput> | Promise<z.infer<TOutput>>
    : unknown | Promise<unknown>;
  /**
   * Optional provider for resource discovery/listing.
   */
  list?: (extra: ListExtra) => ListResourcesResult | Promise<ListResourcesResult>;
  /** Default MIME type for response content. */
  mimeType?: string;
  /** Programmatic unique name. Defaults to slugified URI template if omitted. */
  name?: string;
  /** Zod schema for output validation. */
  output?: TOutput;
  /** Zod schema for route/template params. All fields need `.describe()`. */
  params?: TParams;
  /** Human-readable title for UI display. */
  title?: string;
  /** URI template for resource registration (e.g., 'myscheme://{itemId}/data'). */
  uriTemplate: string;
}

/** Type-erased union for mixed arrays. */
export type AnyNewResourceDefinition = NewResourceDefinition<
  ZodObject<ZodRawShape>,
  ZodObject<ZodRawShape> | undefined
>;

/**
 * Type guard: is this a new-style resource definition?
 */
export function isNewResourceDefinition(def: unknown): def is AnyNewResourceDefinition {
  return (
    def !== null &&
    typeof def === 'object' &&
    'handler' in def &&
    typeof (def as Record<string, unknown>).handler === 'function' &&
    'uriTemplate' in def &&
    !('logic' in def)
  );
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Creates a new-style resource definition with the URI template as first argument.
 *
 * @example
 * ```ts
 * const myResource = resource('myscheme://{itemId}/data', {
 *   description: 'Retrieve item data by ID.',
 *   mimeType: 'application/json',
 *   params: z.object({ itemId: z.string().describe('Item identifier') }),
 *   async handler(params, ctx) {
 *     ctx.log.debug('Fetching item', { itemId: params.itemId });
 *     return { id: params.itemId, status: 'active' };
 *   },
 * });
 * ```
 */
export function resource<
  TParams extends ZodObject<ZodRawShape>,
  TOutput extends ZodObject<ZodRawShape> | undefined = undefined,
>(
  uriTemplate: string,
  options: Omit<NewResourceDefinition<TParams, TOutput>, 'uriTemplate'>,
): NewResourceDefinition<TParams, TOutput> {
  return { uriTemplate, ...options };
}
