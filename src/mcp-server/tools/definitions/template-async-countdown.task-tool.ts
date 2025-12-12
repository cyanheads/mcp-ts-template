/**
 * @fileoverview Template task tool demonstrating the MCP Tasks API.
 *
 * This tool showcases key task patterns:
 * - Progress percentage and status message updates
 * - Cancellation detection and graceful handling
 * - Simulated failure for testing error paths
 * - Proper result formatting with structured content
 *
 * Use this as a reference for implementing long-running async operations.
 *
 * @experimental Tasks API is experimental and may change without notice.
 * @module src/mcp-server/tools/definitions/template-async-countdown.task-tool
 */
import { z } from 'zod';
import type { RequestTaskStore } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { TaskToolDefinition } from '@/mcp-server/tasks/index.js';

// ============================================================================
// Tool Metadata
// ============================================================================

const TOOL_NAME = 'template_async_countdown';
const TOOL_TITLE = 'Async Countdown (Task Demo)';
const TOOL_DESCRIPTION =
  'Demonstrates the MCP Tasks API with a countdown timer. The tool returns immediately with a task handle. Poll the task status to track progress, then retrieve the final result when complete.';

// ============================================================================
// Schemas
// ============================================================================

const InputSchema = z.object({
  seconds: z
    .number()
    .int()
    .min(1)
    .max(60)
    .describe('Number of seconds to count down (1-60)'),
  message: z
    .string()
    .optional()
    .describe('Optional message to include in the final result'),
  simulateFailure: z
    .boolean()
    .optional()
    .describe('If true, simulates a failure at 50% progress (for testing)'),
});

const OutputSchema = z.object({
  success: z.boolean().describe('Whether the countdown completed successfully'),
  message: z.string().describe('Completion or cancellation message'),
  startedAt: z.string().describe('ISO timestamp when countdown started'),
  completedAt: z.string().describe('ISO timestamp when countdown ended'),
  duration: z.number().describe('Actual duration in milliseconds'),
  progress: z.number().describe('Final progress percentage (0-100)'),
  wasCancelled: z.boolean().describe('Whether the task was cancelled'),
});

type Input = z.infer<typeof InputSchema>;
type Output = z.infer<typeof OutputSchema>;

// ============================================================================
// Background Execution
// ============================================================================

/**
 * Check if a task has been cancelled by polling its status.
 * Returns true if the task status is 'cancelled'.
 */
async function isTaskCancelled(
  taskId: string,
  taskStore: RequestTaskStore,
): Promise<boolean> {
  try {
    const task = await taskStore.getTask(taskId);
    return task.status === 'cancelled';
  } catch {
    // If we can't get the task, assume it's not cancelled
    return false;
  }
}

/**
 * Formats a progress status message with percentage.
 */
function formatProgressMessage(
  remaining: number,
  total: number,
  phase: string,
): string {
  const progress = Math.round(((total - remaining) / total) * 100);
  return `[${progress}%] ${phase}: ${remaining}s remaining`;
}

/**
 * Runs the countdown in the background, updating task status at each interval.
 * This function is fire-and-forget - it doesn't block the createTask handler.
 *
 * Demonstrates:
 * - Progress percentage updates
 * - Cancellation detection via polling
 * - Simulated failure for testing
 * - Proper error handling
 */
async function runCountdown(
  taskId: string,
  seconds: number,
  message: string | undefined,
  simulateFailure: boolean,
  taskStore: RequestTaskStore,
): Promise<void> {
  const startedAt = new Date();

  try {
    // Count down, updating status at each second
    for (let remaining = seconds; remaining > 0; remaining--) {
      // Check for cancellation before each iteration
      if (await isTaskCancelled(taskId, taskStore)) {
        // Task was cancelled externally (via SDK's tasks/cancel endpoint).
        // The SDK already handles the cancelled status, so we just stop processing.
        // Note: We intentionally do NOT try to store a result here because
        // the task is already in terminal 'cancelled' state.
        return;
      }

      // Simulate failure at 50% if requested (for testing error handling)
      const progress = Math.round(((seconds - remaining) / seconds) * 100);
      if (simulateFailure && progress >= 50) {
        throw new Error(
          'Simulated failure at 50% progress (simulateFailure=true)',
        );
      }

      // Update status with progress
      const phase =
        progress < 25
          ? 'Starting'
          : progress < 75
            ? 'In progress'
            : 'Finishing';
      await taskStore.updateTaskStatus(
        taskId,
        'working',
        formatProgressMessage(remaining, seconds, phase),
      );

      // Wait for 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Countdown complete - store the successful result
    const completedAt = new Date();
    const result: Output = {
      success: true,
      message: message ?? `Countdown of ${seconds} seconds complete!`,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      duration: completedAt.getTime() - startedAt.getTime(),
      progress: 100,
      wasCancelled: false,
    };

    await taskStore.storeTaskResult(taskId, 'completed', {
      content: [
        {
          type: 'text',
          text: `✓ ${result.message}\n\nDuration: ${result.duration}ms\nStarted: ${result.startedAt}\nCompleted: ${result.completedAt}`,
        },
      ],
      structuredContent: result,
    });
  } catch (error) {
    // Handle failures - store error result
    // Note: If the task was cancelled externally, we may not be able to store a result
    // because the task is already in terminal state. Wrap in try-catch to handle gracefully.
    try {
      const failedAt = new Date();
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const elapsedSeconds = (failedAt.getTime() - startedAt.getTime()) / 1000;
      const progress = Math.round((elapsedSeconds / seconds) * 100);

      const result: Output = {
        success: false,
        message: `Countdown failed: ${errorMessage}`,
        startedAt: startedAt.toISOString(),
        completedAt: failedAt.toISOString(),
        duration: failedAt.getTime() - startedAt.getTime(),
        progress: Math.max(0, Math.min(100, progress)),
        wasCancelled: false,
      };

      await taskStore.storeTaskResult(taskId, 'failed', {
        content: [
          {
            type: 'text',
            text: `✗ ${result.message}\n\nProgress: ${result.progress}%\nDuration: ${result.duration}ms`,
          },
        ],
        structuredContent: result,
        isError: true,
      });
    } catch {
      // Task may already be in terminal state (e.g., cancelled externally)
      // In this case, we just log and exit gracefully
    }
  }
}

// ============================================================================
// Task Tool Definition
// ============================================================================

/**
 * Template task tool demonstrating async countdown with advanced features.
 *
 * @example
 * ```typescript
 * // 1. Start a countdown task
 * const response = await client.callTool({
 *   name: 'template_async_countdown',
 *   arguments: { seconds: 10, message: 'Timer complete!' },
 *   task: { ttl: 120000 }
 * });
 * const { taskId } = response.task;
 *
 * // 2. Poll for status updates
 * let task = await client.getTask({ taskId });
 * while (task.status === 'working') {
 *   console.log(task.statusMessage); // "[50%] In progress: 5s remaining"
 *   await sleep(task.pollInterval);
 *   task = await client.getTask({ taskId });
 * }
 *
 * // 3. Get final result
 * if (task.status === 'completed') {
 *   const result = await client.getTaskResult({ taskId });
 *   console.log(result.structuredContent); // { success: true, ... }
 * }
 *
 * // 4. Or cancel if needed
 * await client.cancelTask({ taskId });
 * ```
 *
 * @experimental
 */
export const asyncCountdownTaskTool: TaskToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: {
    readOnlyHint: true,
    openWorldHint: false,
  },
  execution: {
    taskSupport: 'required',
  },
  taskHandlers: {
    /**
     * Creates a new countdown task.
     * Validates input, creates the task, and starts background execution.
     */
    createTask: async (args, extra) => {
      const input = args as Input;

      // Create task with appropriate TTL based on countdown duration
      // TTL = countdown time + 60s buffer for result retrieval
      const ttl = (input.seconds + 60) * 1000;

      const task = await extra.taskStore.createTask({
        ttl,
        pollInterval: 1000, // Recommend polling every second
      });

      // Update initial status
      await extra.taskStore.updateTaskStatus(
        task.taskId,
        'working',
        formatProgressMessage(input.seconds, input.seconds, 'Starting'),
      );

      // Start countdown in background (fire and forget)
      void runCountdown(
        task.taskId,
        input.seconds,
        input.message,
        input.simulateFailure ?? false,
        extra.taskStore,
      );

      return { task };
    },

    /**
     * Returns the current status of the countdown task.
     * Status message includes progress percentage.
     */
    getTask: async (_args, extra) => {
      return await extra.taskStore.getTask(extra.taskId);
    },

    /**
     * Returns the final result of the countdown task.
     * Includes both human-readable content and structured data.
     */
    getTaskResult: async (_args, extra) => {
      return (await extra.taskStore.getTaskResult(
        extra.taskId,
      )) as CallToolResult;
    },
  },
};
