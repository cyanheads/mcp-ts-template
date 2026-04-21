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
   * Optional formatter mapping output to MCP `content[]`. Different MCP clients
   * forward different surfaces to the model: some (e.g., Claude Code) read
   * `structuredContent` from `output`, others (e.g., Claude Desktop) read
   * `content[]` from `format()`. **Both must be content-complete** — `format()`
   * is the markdown-rendered twin of `structuredContent`, not a separate payload.
   *
   * **Make `format()` content-complete.** A thin one-liner (e.g., a count or
   * title) leaves `content[]`-only clients blind to data that `structuredContent`
   * clients can see. The `format-parity` lint rule enforces this at startup.
   *
   * If omitted, the handler factory JSON-stringifies the output as a fallback.
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
  /** Zod schema for output validation. All fields need `.describe()`. */
  output: TOutput;
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
 *   output: z.object({
 *     items: z.array(z.object({
 *       id: z.string().describe('Item ID'),
 *       name: z.string().describe('Item name'),
 *       status: z.string().describe('Current status'),
 *     })).describe('Matching items'),
 *   }),
 *   auth: ['tool:my_tool:read'],
 *   annotations: { readOnlyHint: true },
 *   async handler(input, ctx) {
 *     ctx.log.info('Processing', { query: input.query });
 *     return { items: await search(input.query) };
 *   },
 *   // format() populates content[] — the markdown twin of structuredContent.
 *   // Different clients read different surfaces; both must be content-complete.
 *   format: (result) => [{
 *     type: 'text',
 *     text: result.items.map(i => `**${i.id}**: ${i.name} (${i.status})`).join('\n'),
 *   }],
 * });
 * ```
 */
export function tool<TInput extends ZodObject<ZodRawShape>, TOutput extends ZodObject<ZodRawShape>>(
  name: string,
  options: Omit<ToolDefinition<TInput, TOutput>, 'name'>,
): ToolDefinition<TInput, TOutput> {
  return { name, ...options };
}
