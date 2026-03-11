/**
 * @fileoverview New-style prompt definition type and `prompt()` builder function.
 * Uses `args` instead of `argumentsSchema`.
 * @module src/mcp-server/prompts/utils/newPromptDefinition
 */

import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape, z } from 'zod';

/**
 * New-style prompt definition with simplified field names.
 * Prompts are pure message templates — no Context, no auth, no side effects.
 */
export interface NewPromptDefinition<TArgs extends ZodObject<ZodRawShape> | undefined = undefined> {
  /**
   * Optional Zod schema for prompt arguments. All fields need `.describe()`.
   * If undefined, the prompt accepts no arguments.
   */
  args?: TArgs;
  /** LLM-facing description. */
  description: string;
  /**
   * Generates the prompt messages from validated arguments.
   */
  generate: (
    args: TArgs extends ZodObject<ZodRawShape> ? z.infer<TArgs> : Record<string, never>,
  ) => PromptMessage[] | Promise<PromptMessage[]>;
  /** Programmatic unique name (snake_case). */
  name: string;
}

/**
 * Type guard: is this a new-style prompt definition?
 */
export function isNewPromptDefinition(def: unknown): def is NewPromptDefinition {
  return (
    def !== null &&
    typeof def === 'object' &&
    'generate' in def &&
    typeof (def as Record<string, unknown>).generate === 'function' &&
    !('argumentsSchema' in def)
  );
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Creates a new-style prompt definition.
 *
 * @example
 * ```ts
 * const codeReview = prompt('code_review', {
 *   description: 'Review code for security and best practices.',
 *   args: z.object({
 *     code: z.string().describe('Code to review'),
 *     language: z.string().optional().describe('Programming language'),
 *   }),
 *   generate: (args) => [
 *     { role: 'user', content: { type: 'text', text: `Review: ${args.code}` } },
 *   ],
 * });
 * ```
 */
export function prompt<TArgs extends ZodObject<ZodRawShape> | undefined = undefined>(
  name: string,
  options: Omit<NewPromptDefinition<TArgs>, 'name'>,
): NewPromptDefinition<TArgs> {
  return { name, ...options };
}
