/**
 * @fileoverview Tests for the TaskToolDefinition type and type guard.
 * @module tests/mcp-server/tasks/utils/taskToolDefinition.test
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  isTaskToolDefinition,
  type TaskToolDefinition,
} from '@/mcp-server/tasks/utils/taskToolDefinition.js';
import type { ToolDefinition } from '@/mcp-server/tools/utils/toolDefinition.js';

describe('isTaskToolDefinition', () => {
  // Sample schemas for testing
  const SampleInputSchema = z.object({
    data: z.string().describe('Test data'),
  });
  const SampleOutputSchema = z.object({
    result: z.string().describe('Test result'),
  });

  describe('should return true for valid task tool definitions', () => {
    it('with minimal taskHandlers', () => {
      const taskTool: TaskToolDefinition<
        typeof SampleInputSchema,
        typeof SampleOutputSchema
      > = {
        name: 'test_task_tool',
        description: 'A test task tool',
        inputSchema: SampleInputSchema,
        outputSchema: SampleOutputSchema,
        execution: { taskSupport: 'required' },
        taskHandlers: {
          createTask: async () => ({ task: { taskId: 'test' } as never }),
          getTask: async () => null as never,
          getTaskResult: async () => ({ content: [] }),
        },
      };

      expect(isTaskToolDefinition(taskTool)).toBe(true);
    });

    it('with optional outputSchema omitted', () => {
      const taskTool = {
        name: 'test_task_tool',
        description: 'A test task tool',
        inputSchema: SampleInputSchema,
        execution: { taskSupport: 'required' },
        taskHandlers: {
          createTask: async () => ({ task: { taskId: 'test' } as never }),
          getTask: async () => null as never,
          getTaskResult: async () => ({ content: [] }),
        },
      };

      expect(isTaskToolDefinition(taskTool)).toBe(true);
    });

    it('with annotations', () => {
      const taskTool = {
        name: 'test_task_tool',
        description: 'A test task tool',
        inputSchema: SampleInputSchema,
        execution: { taskSupport: 'optional' },
        annotations: {
          readOnlyHint: true,
          openWorldHint: false,
        },
        taskHandlers: {
          createTask: async () => ({ task: { taskId: 'test' } as never }),
          getTask: async () => null as never,
          getTaskResult: async () => ({ content: [] }),
        },
      };

      expect(isTaskToolDefinition(taskTool)).toBe(true);
    });

    it('with title specified', () => {
      const taskTool = {
        name: 'test_task_tool',
        title: 'Test Task Tool',
        description: 'A test task tool',
        inputSchema: SampleInputSchema,
        execution: { taskSupport: 'required' },
        taskHandlers: {
          createTask: async () => ({ task: { taskId: 'test' } as never }),
          getTask: async () => null as never,
          getTaskResult: async () => ({ content: [] }),
        },
      };

      expect(isTaskToolDefinition(taskTool)).toBe(true);
    });
  });

  describe('should return false for non-task tool definitions', () => {
    it('for regular tool definition without taskHandlers', () => {
      const regularTool: ToolDefinition<
        typeof SampleInputSchema,
        typeof SampleOutputSchema
      > = {
        name: 'test_regular_tool',
        description: 'A regular tool',
        inputSchema: SampleInputSchema,
        outputSchema: SampleOutputSchema,
        logic: async () => ({ result: 'done' }),
      };

      expect(isTaskToolDefinition(regularTool)).toBe(false);
    });

    it('for null', () => {
      expect(isTaskToolDefinition(null)).toBe(false);
    });

    it('for undefined', () => {
      expect(isTaskToolDefinition(undefined)).toBe(false);
    });

    it('for primitive values', () => {
      expect(isTaskToolDefinition('string')).toBe(false);
      expect(isTaskToolDefinition(123)).toBe(false);
      expect(isTaskToolDefinition(true)).toBe(false);
    });

    it('for empty object', () => {
      expect(isTaskToolDefinition({})).toBe(false);
    });

    it('for object with taskHandlers as null', () => {
      const invalidTool = {
        name: 'test_tool',
        description: 'A tool',
        inputSchema: SampleInputSchema,
        taskHandlers: null,
      };

      expect(isTaskToolDefinition(invalidTool)).toBe(false);
    });

    it('for object with taskHandlers as non-object', () => {
      const invalidTool = {
        name: 'test_tool',
        description: 'A tool',
        inputSchema: SampleInputSchema,
        taskHandlers: 'not an object',
      };

      expect(isTaskToolDefinition(invalidTool)).toBe(false);
    });

    it('for array', () => {
      expect(isTaskToolDefinition([])).toBe(false);
      expect(isTaskToolDefinition([{ taskHandlers: {} }])).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle object with only taskHandlers property', () => {
      const minimalTaskTool = {
        taskHandlers: {
          createTask: async () => ({ task: {} as never }),
          getTask: async () => null as never,
          getTaskResult: async () => ({ content: [] }),
        },
      };

      // This should be true since we only check for taskHandlers presence
      expect(isTaskToolDefinition(minimalTaskTool)).toBe(true);
    });

    it('should handle object with empty taskHandlers object', () => {
      const emptyHandlersTool = {
        name: 'test',
        taskHandlers: {},
      };

      // Empty object is still an object, so this is true
      expect(isTaskToolDefinition(emptyHandlersTool)).toBe(true);
    });
  });
});

describe('TaskToolDefinition type structure', () => {
  const SampleInputSchema = z.object({
    seconds: z.number().describe('Number of seconds'),
  });
  const SampleOutputSchema = z.object({
    success: z.boolean().describe('Whether it succeeded'),
  });

  it('should enforce required properties', () => {
    // This is a compile-time check - the test just validates the structure
    const validTaskTool: TaskToolDefinition<
      typeof SampleInputSchema,
      typeof SampleOutputSchema
    > = {
      name: 'test_task',
      description: 'Test description',
      inputSchema: SampleInputSchema,
      outputSchema: SampleOutputSchema,
      execution: { taskSupport: 'required' },
      taskHandlers: {
        createTask: async (_args, extra) => {
          const task = await extra.taskStore.createTask({ ttl: 60000 });
          return { task };
        },
        getTask: async (_args, extra) => {
          return extra.taskStore.getTask(extra.taskId);
        },
        getTaskResult: async (_args, extra) => {
          // Cast to CallToolResult - SDK guarantees result exists when called
          return extra.taskStore.getTaskResult(extra.taskId) as Promise<{
            content: { type: 'text'; text: string }[];
          }>;
        },
      },
    };

    expect(validTaskTool.name).toBe('test_task');
    expect(validTaskTool.execution.taskSupport).toBe('required');
  });

  it('should allow optional properties', () => {
    const taskToolWithOptionals: TaskToolDefinition<
      typeof SampleInputSchema,
      typeof SampleOutputSchema
    > = {
      name: 'test_task',
      title: 'Test Task Tool',
      description: 'Test description',
      inputSchema: SampleInputSchema,
      outputSchema: SampleOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      execution: { taskSupport: 'optional' },
      taskHandlers: {
        createTask: async () => ({ task: {} as never }),
        getTask: async () => null as never,
        getTaskResult: async () => ({ content: [] }),
      },
    };

    expect(taskToolWithOptionals.title).toBe('Test Task Tool');
    expect(taskToolWithOptionals.annotations?.readOnlyHint).toBe(true);
    expect(taskToolWithOptionals.execution.taskSupport).toBe('optional');
  });
});
