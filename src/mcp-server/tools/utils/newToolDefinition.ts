/**
 * @fileoverview New-style tool definition types and `tool()` builder function.
 * Uses the Phase 3 field names: `handler`, `input`, `output`, `format`, `auth`, `task`.
 * Coexists with the legacy `ToolDefinition` during migration.
 * @module src/mcp-server/tools/utils/newToolDefinition
 */

import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape, z } from 'zod';

import type { Context } from '@/context.js';
import type { ToolAnnotations } from '@/mcp-server/tools/utils/toolDefinition.js';

// Re-export ToolAnnotations for convenience
export type { ToolAnnotations };

/**
 * New-style tool definition with simplified field names.
 * Produced by the `tool()` builder or constructed directly.
 */
export interface NewToolDefinition<
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
   * Throw McpError on failure — no try/catch needed.
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
export type AnyNewToolDefinition = NewToolDefinition<
  ZodObject<ZodRawShape>,
  ZodObject<ZodRawShape>
>;

/**
 * Type guard: is this a new-style tool definition?
 * Distinguishes from legacy ToolDefinition (which has `logic` + `inputSchema`)
 * and TaskToolDefinition (which has `taskHandlers`).
 */
export function isNewToolDefinition(def: unknown): def is AnyNewToolDefinition {
  return (
    def !== null &&
    typeof def === 'object' &&
    'handler' in def &&
    typeof (def as Record<string, unknown>).handler === 'function' &&
    'input' in def &&
    !('taskHandlers' in def) &&
    !('logic' in def)
  );
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Creates a new-style tool definition with full type inference from Zod schemas.
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
  options: Omit<NewToolDefinition<TInput, TOutput>, 'name'>,
): NewToolDefinition<TInput, TOutput> {
  return { name, ...options };
}
