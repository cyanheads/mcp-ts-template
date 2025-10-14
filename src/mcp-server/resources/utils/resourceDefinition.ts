/**
 * @fileoverview Defines the standard structure for a declarative resource definition.
 * This mirrors the ToolDefinition pattern to provide a consistent, modern
 * architecture for MCP resources, separating pure logic from handler concerns.
 * @module src/mcp-server/resources/utils/resourceDefinition
 */
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  ListResourcesResult,
  ReadResourceResult,
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape, z } from 'zod';

import type { RequestContext } from '@/utils/index.js';

/**
 * Optional UI/display hints for resources.
 */
export interface ResourceAnnotations {
  [key: string]: unknown;
  /** A hint indicating the resource is read-only. */
  readOnlyHint?: boolean;
  /** A hint indicating the resource may call external dynamic systems. */
  openWorldHint?: boolean;
}

/**
 * Represents a complete, self-contained definition of an MCP resource.
 */
export interface ResourceDefinition<
  TParamsSchema extends ZodObject<ZodRawShape>,
  TOutputSchema extends ZodObject<ZodRawShape> | undefined = undefined,
> {
  /** The programmatic, unique name for the resource (e.g., 'echo-resource'). */
  name: string;
  /** Optional, human-readable title for display in UIs. */
  title?: string;
  /** A concise description of what the resource returns. */
  description: string;
  /** The URI template used to register the resource (e.g., 'echo://{message}'). */
  uriTemplate: string;
  /** Zod schema validating the route/template params received by the handler. */
  paramsSchema: TParamsSchema;
  /** Optional Zod schema describing the successful output payload. */
  outputSchema?: TOutputSchema;
  /** Default mime type for the response content. */
  mimeType?: string;
  /** Optional examples to improve discoverability. */
  examples?: { name: string; uri: string }[];
  /** Optional display/behavior hints. */
  annotations?: ResourceAnnotations;
  /**
   * Optional provider for list results. If provided, it's used for resource discovery.
   * The `extra` parameter provides access to request metadata including pagination cursor
   * via `extra._meta?.cursor` or from the request params.
   * Return value should conform to the MCP SDK's ListResourcesResult, which can include
   * a `nextCursor` field for pagination support per MCP spec 2025-06-18.
   *
   * @param extra - Request handler context including signal, authInfo, sessionId, and request metadata
   * @returns ListResourcesResult with resources array and optional nextCursor for pagination
   *
   * @example
   * ```typescript
   * import { extractCursor, paginateArray } from '@/utils/index.js';
   *
   * list: (extra) => {
   *   const allResources = [...]  // Your full resource list
   *   const cursor = extractCursor(extra._meta);
   *   const { items, nextCursor } = paginateArray(
   *     allResources,
   *     cursor,
   *     50,   // defaultPageSize
   *     1000, // maxPageSize
   *     context
   *   );
   *   return {
   *     resources: items,
   *     ...(nextCursor && { nextCursor }),
   *   };
   * }
   * ```
   */
  list?: (
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ) => ListResourcesResult | Promise<ListResourcesResult>;
  /**
   * The pure, stateless core logic for the resource read operation.
   * MUST NOT contain try/catch. Throw McpError on failure.
   */
  logic: (
    uri: URL,
    params: z.infer<TParamsSchema>,
    context: RequestContext,
  ) => unknown;
  /**
   * Optional formatter mapping the logic result into MCP ReadResourceResult.contents entries.
   * If omitted, a default JSON formatter is applied using `mimeType`.
   */
  responseFormatter?: (
    result: unknown,
    meta: { uri: URL; mimeType: string },
  ) => ReadResourceResult['contents'];
}
