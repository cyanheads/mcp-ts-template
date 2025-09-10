/**
 * @fileoverview Defines the standard structure for a declarative tool definition.
 * This interface ensures that all tools provide the necessary metadata (name, schemas)
 * and logic in a consistent, self-contained format, aligned with MCP specifications.
 * @module src/mcp-server/tools/utils/toolDefinition
 */
import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import type { ZodObject, ZodRawShape, z } from 'zod';

import type { RequestContext } from '../../../utils/index.js';

/**
 * Defines the annotations that provide hints about a tool's behavior.
 * These are not guarantees but are useful for client-side rendering and decision-making.
 * The index signature `[key: string]: unknown;` ensures compatibility with the MCP SDK.
 */
export interface ToolAnnotations {
  [key: string]: unknown;
  /**
   * An optional human-readable name for the tool, optimized for UI display.
   * If provided, it may be used by clients instead of the programmatic `name`.
   */
  title?: string;
  /**
   * A hint indicating that the tool does not modify any state.
   * For example, a "read" operation.
   */
  readOnlyHint?: boolean;
  /**
   * A hint indicating that the tool may interact with external, unpredictable,
   * or dynamic systems (e.g., fetching from a live API, web search).
   */
  openWorldHint?: boolean;
}

/**
 * Represents the complete, self-contained definition of an MCP tool.
 */
export interface ToolDefinition<
  TInputSchema extends ZodObject<ZodRawShape>,
  TOutputSchema extends ZodObject<ZodRawShape>,
> {
  /**
   * The programmatic, unique name for the tool (e.g., 'echo_message').
   */
  name: string;
  /**
   * An optional, human-readable title for the tool. This is preferred for display in UIs.
   * If not provided, the `name` or `annotations.title` may be used as a fallback.
   */
  title?: string;
  /**
   * A clear, concise description of what the tool does.
   * This is sent to the LLM to help it decide when to use the tool.
   */
  description: string;
  /**
   * The Zod schema for validating the tool's input parameters.
   */
  inputSchema: TInputSchema;
  /**
   * The Zod schema for validating the tool's successful output structure.
   */
  outputSchema: TOutputSchema;
  /**
   * Optional metadata providing hints about the tool's behavior.
   */
  annotations?: ToolAnnotations;
  /**
   * The core business logic function for the tool.
   * It receives validated input and returns a structured output or throws an McpError.
   * @param input The validated tool input.
   * @param context The request context for logging and tracing.
   * @returns A promise that resolves with the structured output.
   */
  logic: (
    input: z.infer<TInputSchema>,
    context: RequestContext,
  ) => Promise<z.infer<TOutputSchema>>;
  /**
   * An optional function to format the successful output into an array of ContentBlocks
   * for the `CallToolResult`. If not provided, a default JSON stringifier is used.
   * @param result The successful output from the logic function.
   * @returns An array of ContentBlocks to be sent to the client.
   */
  responseFormatter?: (result: z.infer<TOutputSchema>) => ContentBlock[];
}
