/**
 * @fileoverview Convenience builders for MCP Apps — `appTool()` and `appResource()`.
 * Wraps the standard `tool()` and `resource()` builders with MCP Apps-specific
 * defaults: auto-populates `_meta.ui.resourceUri`, sets the correct MIME type,
 * and handles the compat key (`ui/resourceUri`) required by some hosts.
 * @module src/mcp-server/apps/appBuilders
 */

import type { ZodObject, ZodRawShape } from 'zod';

import type { ResourceDefinition } from '@/mcp-server/resources/utils/resourceDefinition.js';
import { resource } from '@/mcp-server/resources/utils/resourceDefinition.js';
import type { ToolDefinition } from '@/mcp-server/tools/utils/toolDefinition.js';
import { tool } from '@/mcp-server/tools/utils/toolDefinition.js';

/**
 * MIME type for MCP Apps HTML resources.
 * Matches `RESOURCE_MIME_TYPE` from `@modelcontextprotocol/ext-apps/server`
 * so consumers don't need the peer dependency for this constant alone.
 */
export const APP_RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * Backwards-compat metadata key required by some MCP hosts.
 * Matches `RESOURCE_URI_META_KEY` from `@modelcontextprotocol/ext-apps/server`.
 */
const RESOURCE_URI_META_KEY = 'ui/resourceUri';

// ---------------------------------------------------------------------------
// appTool()
// ---------------------------------------------------------------------------

/** Options for `appTool()` — extends standard tool options with the UI resource URI. */
type AppToolOptions<
  TInput extends ZodObject<ZodRawShape>,
  TOutput extends ZodObject<ZodRawShape>,
> = Omit<ToolDefinition<TInput, TOutput>, '_meta' | 'name'> & {
  /**
   * Additional `_meta` fields beyond the auto-populated `ui` and compat key.
   * Merged with the generated `_meta.ui` — do not set `ui` or `ui/resourceUri` here.
   */
  extraMeta?: Record<string, unknown>;
  /** URI of the `ui://` resource that hosts will fetch and render as a sandboxed iframe. */
  resourceUri: string;
};

/**
 * Creates an MCP Apps tool definition. Wraps `tool()` with:
 * - `_meta.ui.resourceUri` set automatically
 * - `_meta['ui/resourceUri']` compat key set automatically
 *
 * @example
 * ```ts
 * import { appTool, z } from '@cyanheads/mcp-ts-core';
 *
 * export const myAppTool = appTool('my_app_tool', {
 *   resourceUri: 'ui://my-app/app.html',
 *   description: 'Interactive widget.',
 *   input: z.object({ query: z.string().describe('Search query') }),
 *   output: z.object({ items: z.array(z.string()).describe('Results') }),
 *   handler(input, ctx) { return { items: ['a', 'b'] }; },
 * });
 * ```
 */
export function appTool<
  TInput extends ZodObject<ZodRawShape>,
  TOutput extends ZodObject<ZodRawShape>,
>(name: string, options: AppToolOptions<TInput, TOutput>): ToolDefinition<TInput, TOutput> {
  const { resourceUri, extraMeta, ...rest } = options;

  return tool(name, {
    ...rest,
    _meta: {
      ...extraMeta,
      ui: { resourceUri },
      [RESOURCE_URI_META_KEY]: resourceUri,
    },
  });
}

// ---------------------------------------------------------------------------
// appResource()
// ---------------------------------------------------------------------------

/** Options for `appResource()` — standard resource options with app-specific defaults. */
type AppResourceOptions<
  TParams extends ZodObject<ZodRawShape>,
  TOutput extends ZodObject<ZodRawShape> | undefined = undefined,
> = Omit<ResourceDefinition<TParams, TOutput>, 'mimeType' | 'uriTemplate'> & {
  /** Override the default `text/html;profile=mcp-app` MIME type. Rarely needed. */
  mimeType?: string;
};

/**
 * Creates an MCP Apps resource definition. Wraps `resource()` with:
 * - `mimeType` defaulting to `text/html;profile=mcp-app`
 * - `annotations.audience` defaulting to `['user']`
 *
 * The `uriTemplate` should use the `ui://` scheme.
 *
 * @example
 * ```ts
 * import { appResource, z } from '@cyanheads/mcp-ts-core';
 *
 * export const myAppResource = appResource('ui://my-app/app.html', {
 *   name: 'my-app-ui',
 *   description: 'Interactive UI for my_app_tool.',
 *   params: z.object({}).describe('No parameters.'),
 *   handler(_params, ctx) {
 *     return '<html>...</html>';
 *   },
 * });
 * ```
 */
export function appResource<
  TParams extends ZodObject<ZodRawShape>,
  TOutput extends ZodObject<ZodRawShape> | undefined = undefined,
>(
  uriTemplate: string,
  options: AppResourceOptions<TParams, TOutput>,
): ResourceDefinition<TParams, TOutput> {
  const { mimeType, annotations, ...rest } = options;

  return resource(uriTemplate, {
    ...rest,
    mimeType: mimeType ?? APP_RESOURCE_MIME_TYPE,
    annotations: {
      audience: ['user'],
      ...annotations,
    },
  });
}
