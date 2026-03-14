/**
 * @fileoverview Tool definition types and `tool()` builder function.
 * Provides the canonical `ToolDefinition` interface and `ToolAnnotations` type
 * used by all tool definitions and the handler factory.
 * @module src/mcp-server/tools/utils/toolDefinition
 */

import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape, z } from 'zod';

import type { Context } from '@/core/context.js';

/**
 * Defines the annotations that provide hints about a tool's behavior.
 * These are not guarantees but are useful for client-side rendering and decision-making.
 * The index signature `[key: string]: unknown;` ensures compatibility with the MCP SDK.
 */
export interface ToolAnnotations {
  /**
   * A hint indicating that the tool may destroy or modify data in a way that cannot
   * be undone. Only meaningful when `readOnlyHint` is false (the default).
   * Defaults to `true` when unset.
   */
  destructiveHint?: boolean;
  /**
   * A hint indicating that repeated calls with the same arguments have no additional
   * effect beyond the first call. Only meaningful when `readOnlyHint` is false.
   * Defaults to `false` when unset.
   */
  idempotentHint?: boolean;
  /**
   * A hint indicating that the tool may interact with external, unpredictable,
   * or dynamic systems (e.g., fetching from a live API, web search).
   */
  openWorldHint?: boolean;
  /**
   * A hint indicating that the tool does not modify any state.
   * For example, a "read" operation.
   */
  readOnlyHint?: boolean;
  /**
   * An optional human-readable name for the tool, optimized for UI display.
   * If provided, it may be used by clients instead of the programmatic `name`.
   */
  title?: string;
  [key: string]: unknown;
}

/**
 * Represents the complete, self-contained definition of an MCP tool.
 */
export interface ToolDefinition<
  TInput extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
  TOutput extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
> {
  /** Protocol-level metadata (e.g., MCP Apps extension). */
  _meta?: Record<string, unknown>;
  /** UI/behavior hints for clients. */
  annotations?: ToolAnnotations;
  /** Required auth scopes. Checked by handler factory before calling handler. */
  auth?: string[];
  /** LLM-facing description. */
  description: string;
  /**
   * Optional formatter mapping output to ContentBlock[].
   * If omitted, the handler factory JSON-stringifies the output.
   */
  format?: (result: z.infer<TOutput>) => ContentBlock[];
  /**
   * The core handler function. Receives validated input and unified Context.
   * Throw on failure — no try/catch needed.
   */
  handler: (input: z.infer<TInput>, ctx: Context) => Promise<z.infer<TOutput>> | z.infer<TOutput>;
  /** Zod schema for input validation. All fields need `.describe()`. */
  input: TInput;
  /** Programmatic unique name (snake_case). */
  name: string;
  /** Zod schema for output validation. */
  output?: TOutput;
  /** When true, the framework manages task lifecycle automatically. */
  task?: boolean;
  /** Human-readable title for UI display. */
  title?: string;
}

/** Type-erased union for mixed arrays passed to createApp(). */
export type AnyToolDefinition = ToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>>;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Creates a tool definition with full type inference from Zod schemas.
 *
 * @example
 * ```ts
 * const myTool = tool('my_tool', {
 *   description: 'Does something useful.',
 *   input: z.object({ query: z.string().describe('Search query') }),
 *   output: z.object({ result: z.string().describe('Search result') }),
 *   auth: ['tool:my_tool:read'],
 *   annotations: { readOnlyHint: true },
 *   async handler(input, ctx) {
 *     ctx.log.info('Processing', { query: input.query });
 *     return { result: `Found: ${input.query}` };
 *   },
 * });
 * ```
 */
export function tool<
  TInput extends ZodObject<ZodRawShape>,
  TOutput extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
>(
  name: string,
  options: Omit<ToolDefinition<TInput, TOutput>, 'name'>,
): ToolDefinition<TInput, TOutput> {
  return { name, ...options };
}
