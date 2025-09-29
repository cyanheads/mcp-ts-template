/**
 * @fileoverview Defines the standard structure for a declarative prompt definition.
 * Prompts are structured message templates that users can discover and invoke.
 * Unlike tools (which execute code), prompts generate messages for the LLM.
 *
 * MCP Prompts Specification:
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/basic/prompts | MCP Prompts}
 * @module src/mcp-server/prompts/utils/promptDefinition
 */
import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape, z } from 'zod';

/**
 * Represents the complete, self-contained definition of an MCP prompt.
 */
export interface PromptDefinition<
  TArgumentsSchema extends ZodObject<ZodRawShape> | undefined = undefined,
> {
  /**
   * The programmatic, unique name for the prompt (e.g., 'code_review').
   */
  name: string;

  /**
   * A clear, concise description of what the prompt does.
   * This helps users understand when to use this prompt.
   */
  description: string;

  /**
   * Optional Zod schema for validating the prompt's arguments.
   * If undefined, the prompt accepts no arguments.
   */
  argumentsSchema?: TArgumentsSchema;

  /**
   * The function that generates the prompt messages.
   * @param args The validated arguments (if argumentsSchema is defined).
   * @returns An array of PromptMessage objects to be sent to the LLM.
   */
  generate: (
    args: TArgumentsSchema extends ZodObject<ZodRawShape>
      ? z.infer<TArgumentsSchema>
      : Record<string, never>,
  ) => PromptMessage[] | Promise<PromptMessage[]>;
}
