/**
 * @fileoverview Tests for the template-async-countdown task tool.
 * @module tests/mcp-server/tools/definitions/template-async-countdown.task-tool.test
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncCountdownTaskTool } from '@/mcp-server/tools/definitions/template-async-countdown.task-tool.js';
import { isTaskToolDefinition } from '@/mcp-server/tasks/utils/taskToolDefinition.js';
import {
  InMemoryTaskStore,
  type CreateTaskOptions,
  type Task,
} from '@/mcp-server/tasks/core/taskTypes.js';
import type {
  CreateTaskRequestHandlerExtra,
  TaskRequestHandlerExtra,
} from '@/mcp-server/tasks/core/taskTypes.js';
import type { Request, RequestId } from '@modelcontextprotocol/sdk/types.js';
import type { RequestTaskStore } from '@modelcontextprotocol/sdk/shared/protocol.js';

/**
 * Creates a RequestTaskStore adapter for testing.
 * Wraps InMemoryTaskStore methods to match the RequestTaskStore interface.
 */
function createTestTaskStore(
  taskStore: InMemoryTaskStore,
  testRequestId: RequestId,
  testRequest: Request,
  overrides?: Partial<{
    createTask: (options: CreateTaskOptions) => Promise<Task>;
    updateTaskStatus: (
      taskId: string,
      status: Task['status'],
      message?: string,
    ) => Promise<void>;
  }>,
): RequestTaskStore {
  const getTaskWrapper = async (taskId: string): Promise<Task> => {
    const task = await taskStore.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    return task;
  };

  return {
    createTask:
      overrides?.createTask ??
      ((options: CreateTaskOptions) =>
        taskStore.createTask(options, testRequestId, testRequest)),
    getTask: getTaskWrapper,
    storeTaskResult: (taskId, status, result) =>
      taskStore.storeTaskResult(taskId, status, result),
    getTaskResult: (taskId) => taskStore.getTaskResult(taskId),
    updateTaskStatus:
      overrides?.updateTaskStatus ??
      ((taskId, status, message) =>
        taskStore.updateTaskStatus(taskId, status, message)),
    listTasks: (cursor) => taskStore.listTasks(cursor),
  };
}

describe('asyncCountdownTaskTool', () => {
  describe('tool definition structure', () => {
    it('should be identified as a task tool', () => {
      expect(isTaskToolDefinition(asyncCountdownTaskTool)).toBe(true);
    });

    it('should have correct name', () => {
      expect(asyncCountdownTaskTool.name).toBe('template_async_countdown');
    });

    it('should have a title', () => {
      expect(asyncCountdownTaskTool.title).toBe('Async Countdown (Task Demo)');
    });

    it('should have a description', () => {
      expect(asyncCountdownTaskTool.description).toContain('Tasks API');
      expect(asyncCountdownTaskTool.description).toContain('countdown');
    });

    it('should have execution with taskSupport required', () => {
      expect(asyncCountdownTaskTool.execution.taskSupport).toBe('required');
    });

    it('should have annotations', () => {
      expect(asyncCountdownTaskTool.annotations).toBeDefined();
      expect(asyncCountdownTaskTool.annotations?.readOnlyHint).toBe(true);
      expect(asyncCountdownTaskTool.annotations?.openWorldHint).toBe(false);
    });

    it('should have taskHandlers', () => {
      expect(asyncCountdownTaskTool.taskHandlers).toBeDefined();
      expect(asyncCountdownTaskTool.taskHandlers.createTask).toBeDefined();
      expect(asyncCountdownTaskTool.taskHandlers.getTask).toBeDefined();
      expect(asyncCountdownTaskTool.taskHandlers.getTaskResult).toBeDefined();
    });
  });

  describe('inputSchema', () => {
    it('should validate valid input with required fields', () => {
      const validInput = { seconds: 5 };
      const result = asyncCountdownTaskTool.inputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate input with all optional fields', () => {
      const fullInput = {
        seconds: 10,
        message: 'Custom message',
        simulateFailure: false,
      };
      const result = asyncCountdownTaskTool.inputSchema.safeParse(fullInput);
      expect(result.success).toBe(true);
    });

    it('should reject seconds below minimum (1)', () => {
      const invalidInput = { seconds: 0 };
      const result = asyncCountdownTaskTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject seconds above maximum (60)', () => {
      const invalidInput = { seconds: 61 };
      const result = asyncCountdownTaskTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer seconds', () => {
      const invalidInput = { seconds: 5.5 };
      const result = asyncCountdownTaskTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject missing seconds', () => {
      const invalidInput = { message: 'test' };
      const result = asyncCountdownTaskTool.inputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });

  describe('outputSchema', () => {
    it('should be defined', () => {
      expect(asyncCountdownTaskTool.outputSchema).toBeDefined();
    });

    it('should validate successful output', () => {
      const validOutput = {
        success: true,
        message: 'Countdown complete!',
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-01T00:00:05.000Z',
        duration: 5000,
        progress: 100,
        wasCancelled: false,
      };
      const result =
        asyncCountdownTaskTool.outputSchema!.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should validate cancelled output', () => {
      const cancelledOutput = {
        success: false,
        message: 'Countdown was cancelled',
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-01T00:00:02.500Z',
        duration: 2500,
        progress: 50,
        wasCancelled: true,
      };
      const result =
        asyncCountdownTaskTool.outputSchema!.safeParse(cancelledOutput);
      expect(result.success).toBe(true);
    });

    it('should validate failed output', () => {
      const failedOutput = {
        success: false,
        message: 'Countdown failed: Simulated error',
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-01T00:00:02.500Z',
        duration: 2500,
        progress: 50,
        wasCancelled: false,
      };
      const result =
        asyncCountdownTaskTool.outputSchema!.safeParse(failedOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('taskHandlers', () => {
    let taskStore: InMemoryTaskStore;
    const testRequest: Request = {
      method: 'tools/call',
      params: { name: 'template_async_countdown', arguments: { seconds: 2 } },
    };
    const testRequestId: RequestId = 1;

    beforeEach(() => {
      taskStore = new InMemoryTaskStore();
    });

    describe('createTask', () => {
      it('should create a task with correct TTL', async () => {
        const args = { seconds: 5 };
        const extra: CreateTaskRequestHandlerExtra = {
          taskStore: createTestTaskStore(
            taskStore,
            testRequestId,
            testRequest,
            {
              createTask: async (options) => {
                // TTL should be (seconds + 60) * 1000
                expect(options.ttl).toBe((5 + 60) * 1000);
                expect(options.pollInterval).toBe(1000);
                return taskStore.createTask(
                  options,
                  testRequestId,
                  testRequest,
                );
              },
            },
          ),
          signal: new AbortController().signal,
          requestId: 'test-req',
          sendNotification: vi.fn(),
          sendRequest: vi.fn(),
        };

        const result = await asyncCountdownTaskTool.taskHandlers.createTask(
          args,
          extra,
        );

        expect(result.task).toBeDefined();
        expect(result.task.taskId).toBeDefined();
        expect(result.task.status).toBe('working');
      });

      it('should set initial status message with progress', async () => {
        let statusUpdated = false;
        const args = { seconds: 10 };
        const extra: CreateTaskRequestHandlerExtra = {
          taskStore: createTestTaskStore(
            taskStore,
            testRequestId,
            testRequest,
            {
              updateTaskStatus: async (taskId, status, message) => {
                statusUpdated = true;
                expect(message).toContain('0%');
                expect(message).toContain('10s remaining');
                return taskStore.updateTaskStatus(taskId, status, message);
              },
            },
          ),
          signal: new AbortController().signal,
          requestId: 'test-req',
          sendNotification: vi.fn(),
          sendRequest: vi.fn(),
        };

        await asyncCountdownTaskTool.taskHandlers.createTask(args, extra);
        expect(statusUpdated).toBe(true);
      });
    });

    describe('getTask', () => {
      it('should retrieve task status', async () => {
        // First create a task
        const task = await taskStore.createTask(
          { ttl: 60000, pollInterval: 1000 },
          testRequestId,
          testRequest,
        );

        const extra: TaskRequestHandlerExtra = {
          taskStore: createTestTaskStore(taskStore, testRequestId, testRequest),
          taskId: task.taskId,
          signal: new AbortController().signal,
          requestId: 'test-req',
          sendNotification: vi.fn(),
          sendRequest: vi.fn(),
        };

        const result = await asyncCountdownTaskTool.taskHandlers.getTask(
          {},
          extra,
        );

        expect(result).toBeDefined();
        expect(result?.taskId).toBe(task.taskId);
        expect(result?.status).toBe('working');
      });
    });

    describe('getTaskResult', () => {
      it('should retrieve task result after completion', async () => {
        // Create and complete a task
        const task = await taskStore.createTask(
          { ttl: 60000, pollInterval: 1000 },
          testRequestId,
          testRequest,
        );

        const expectedResult = {
          content: [{ type: 'text' as const, text: 'Done!' }],
          structuredContent: { success: true },
        };

        await taskStore.storeTaskResult(
          task.taskId,
          'completed',
          expectedResult,
        );

        const extra: TaskRequestHandlerExtra = {
          taskStore: createTestTaskStore(taskStore, testRequestId, testRequest),
          taskId: task.taskId,
          signal: new AbortController().signal,
          requestId: 'test-req',
          sendNotification: vi.fn(),
          sendRequest: vi.fn(),
        };

        const result = await asyncCountdownTaskTool.taskHandlers.getTaskResult(
          {},
          extra,
        );

        expect(result).toBeDefined();
        expect(result.content).toEqual(expectedResult.content);
      });
    });
  });

  describe('countdown behavior (integration)', () => {
    let taskStore: InMemoryTaskStore;
    const testRequest: Request = {
      method: 'tools/call',
      params: { name: 'template_async_countdown' },
    };
    const testRequestId: RequestId = 1;

    beforeEach(() => {
      taskStore = new InMemoryTaskStore();
    });

    it('should complete countdown and store success result', async () => {
      // Use 1-second countdown for fast test
      const args = { seconds: 1, message: 'Test complete!' };

      const extra: CreateTaskRequestHandlerExtra = {
        taskStore: createTestTaskStore(taskStore, testRequestId, testRequest),
        signal: new AbortController().signal,
        requestId: 'test-req',
        sendNotification: vi.fn(),
        sendRequest: vi.fn(),
      };

      const { task } = await asyncCountdownTaskTool.taskHandlers.createTask(
        args,
        extra,
      );

      // Wait for countdown to complete (1 second + buffer)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check task is completed
      const completedTask = await taskStore.getTask(task.taskId);
      expect(completedTask?.status).toBe('completed');

      // Check result
      const result = await taskStore.getTaskResult(task.taskId);
      expect(result.structuredContent).toBeDefined();

      const structured = result.structuredContent as {
        success: boolean;
        message: string;
        wasCancelled: boolean;
        progress: number;
      };
      expect(structured.success).toBe(true);
      expect(structured.message).toBe('Test complete!');
      expect(structured.wasCancelled).toBe(false);
      expect(structured.progress).toBe(100);
    }, 5000); // 5 second timeout

    it('should handle external cancellation', async () => {
      const args = { seconds: 3 }; // 3-second countdown

      const extra: CreateTaskRequestHandlerExtra = {
        taskStore: createTestTaskStore(taskStore, testRequestId, testRequest),
        signal: new AbortController().signal,
        requestId: 'test-req',
        sendNotification: vi.fn(),
        sendRequest: vi.fn(),
      };

      const { task } = await asyncCountdownTaskTool.taskHandlers.createTask(
        args,
        extra,
      );

      // Verify task is created and in working state
      const createdTask = await taskStore.getTask(task.taskId);
      expect(createdTask?.status).toBe('working');
      expect(createdTask?.taskId).toBe(task.taskId);

      // Cancel externally (this simulates what SDK does when client calls tasks/cancel)
      await taskStore.updateTaskStatus(
        task.taskId,
        'cancelled',
        'User cancelled',
      );

      const cancelledTask = await taskStore.getTask(task.taskId);
      expect(cancelledTask?.status).toBe('cancelled');
      expect(cancelledTask?.statusMessage).toBe('User cancelled');
    }, 5000);

    it('should fail at 50% when simulateFailure is true', async () => {
      const args = { seconds: 2, simulateFailure: true };

      const extra: CreateTaskRequestHandlerExtra = {
        taskStore: createTestTaskStore(taskStore, testRequestId, testRequest),
        signal: new AbortController().signal,
        requestId: 'test-req',
        sendNotification: vi.fn(),
        sendRequest: vi.fn(),
      };

      const { task } = await asyncCountdownTaskTool.taskHandlers.createTask(
        args,
        extra,
      );

      // Wait for failure to occur (after ~1 second at 50%)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check task failed
      const failedTask = await taskStore.getTask(task.taskId);
      expect(failedTask?.status).toBe('failed');

      // Check error result
      const result = await taskStore.getTaskResult(task.taskId);
      expect(result.isError).toBe(true);

      const structured = result.structuredContent as {
        success: boolean;
        message: string;
      };
      expect(structured.success).toBe(false);
      expect(structured.message).toContain('Simulated failure');
    }, 5000);
  });
});
