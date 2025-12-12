/**
 * @fileoverview Defines the structure for task-based tool definitions.
 * Task tools support long-running async operations with the MCP Tasks API,
 * enabling "call-now, fetch-later" execution patterns.
 *
 * @experimental These APIs are experimental and may change without notice.
 * @module src/mcp-server/tasks/utils/taskToolDefinition
 */
import type { ZodObject, ZodRawShape } from 'zod';

import type { ToolAnnotations } from '@/mcp-server/tools/utils/toolDefinition.js';
import type {
  ToolTaskHandler,
  TaskToolExecution,
} from '@/mcp-server/tasks/core/taskTypes.js';

/**
 * Represents a task-based tool definition for long-running async operations.
 *
 * Unlike regular tools that execute synchronously and return immediately,
 * task tools create durable task handles that clients can poll for status
 * and retrieve results after completion.
 *
 * Task tools are registered via `server.experimental.tasks.registerToolTask()`
 * and must implement three handlers:
 * - `createTask`: Called when the tool is invoked, creates the task and starts work
 * - `getTask`: Called to poll task status (tasks/get)
 * - `getTaskResult`: Called to retrieve results (tasks/result)
 *
 * @example
 * ```typescript
 * const myTaskTool: TaskToolDefinition<typeof InputSchema, typeof OutputSchema> = {
 *   name: 'long_running_analysis',
 *   description: 'Performs a long-running analysis operation',
 *   inputSchema: z.object({ data: z.string() }),
 *   outputSchema: z.object({ result: z.string() }),
 *   execution: { taskSupport: 'required' },
 *   taskHandlers: {
 *     createTask: async (args, extra) => {
 *       const task = await extra.taskStore.createTask({ ttl: 300000 }, ...);
 *       startBackgroundWork(task.taskId, args);
 *       return { task };
 *     },
 *     getTask: async (_args, extra) => {
 *       return await extra.taskStore.getTask(extra.taskId);
 *     },
 *     getTaskResult: async (_args, extra) => {
 *       return await extra.taskStore.getTaskResult(extra.taskId);
 *     }
 *   }
 * };
 * ```
 *
 * @experimental
 */
export interface TaskToolDefinition<
  TInputSchema extends ZodObject<ZodRawShape>,
  TOutputSchema extends ZodObject<ZodRawShape>,
> {
  /**
   * The programmatic, unique name for the tool (e.g., 'async_analysis').
   * Must follow MCP tool naming conventions: alphanumeric, underscores, hyphens.
   */
  name: string;

  /**
   * An optional, human-readable title for the tool.
   * If not provided, derived from `name` or `annotations.title`.
   */
  title?: string;

  /**
   * A clear, concise description of what the tool does.
   * This is sent to the LLM to help it decide when to use the tool.
   */
  description: string;

  /**
   * The Zod schema for validating the tool's input parameters.
   * All fields should have `.describe()` for LLM context.
   */
  inputSchema: TInputSchema;

  /**
   * The Zod schema for validating the tool's successful output structure.
   * Used for documentation and client-side type inference.
   */
  outputSchema?: TOutputSchema;

  /**
   * Optional metadata providing hints about the tool's behavior.
   */
  annotations?: ToolAnnotations;

  /**
   * Task execution configuration.
   *
   * - `taskSupport: 'required'` - Tool MUST be invoked as a task
   * - `taskSupport: 'optional'` - Tool can be invoked normally or as a task
   *
   * Note: `taskSupport: 'forbidden'` is not valid for task tools;
   * use a regular ToolDefinition instead.
   */
  execution: TaskToolExecution;

  /**
   * The task handlers implementing the task lifecycle.
   *
   * These handlers are called by the SDK at different points:
   * - `createTask`: When the tool is first invoked (tools/call with task param)
   * - `getTask`: When polling for status (tasks/get)
   * - `getTaskResult`: When retrieving results (tasks/result)
   */
  taskHandlers: ToolTaskHandler<TInputSchema>;
}

/**
 * Type guard to check if a tool definition is a task tool.
 *
 * @param def - The tool definition to check
 * @returns True if the definition has taskHandlers (is a TaskToolDefinition)
 */
export function isTaskToolDefinition(
  def: unknown,
): def is TaskToolDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape>> {
  return (
    def !== null &&
    typeof def === 'object' &&
    'taskHandlers' in def &&
    def.taskHandlers !== null &&
    typeof def.taskHandlers === 'object'
  );
}
