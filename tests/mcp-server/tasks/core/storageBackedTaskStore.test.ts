/**
 * @fileoverview Tests for the StorageBackedTaskStore.
 * @module tests/mcp-server/tasks/core/storageBackedTaskStore.test
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { container } from '@/container/core/container.js';

import { StorageBackedTaskStore } from '@/mcp-server/tasks/core/storageBackedTaskStore.js';
import { StorageService } from '@/storage/core/StorageService.js';
import { InMemoryProvider } from '@/storage/providers/inMemory/inMemoryProvider.js';
import {
  StorageProvider,
  StorageService as StorageServiceToken,
} from '@/container/core/tokens.js';
import type { Request, RequestId } from '@modelcontextprotocol/sdk/types.js';

describe('StorageBackedTaskStore', () => {
  let taskStore: StorageBackedTaskStore;
  let storageService: StorageService;

  // Test fixtures
  const testRequest: Request = {
    method: 'tools/call',
    params: { name: 'test_tool', arguments: { foo: 'bar' } },
  };
  const testRequestId: RequestId = 1;

  beforeEach(() => {
    container.reset();
    container.registerSingleton(StorageProvider, () => new InMemoryProvider());
    container.registerSingleton(
      StorageServiceToken,
      (c) => new StorageService(c.resolve(StorageProvider)),
    );
    storageService = container.resolve(StorageServiceToken);

    taskStore = new StorageBackedTaskStore(storageService, {
      tenantId: 'test-tasks',
      keyPrefix: 'tasks',
      defaultTtl: 60000,
      pageSize: 10,
    });
  });

  describe('createTask', () => {
    it('should create a task with generated ID', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000, pollInterval: 1000 },
        testRequestId,
        testRequest,
      );

      expect(task.taskId).toBeDefined();
      expect(task.taskId).toMatch(/^task_/);
      expect(task.status).toBe('working');
      expect(task.ttl).toBe(30000);
      expect(task.pollInterval).toBe(1000);
      expect(task.createdAt).toBeDefined();
      expect(task.lastUpdatedAt).toBeDefined();
    });

    it('should use default TTL when not provided', async () => {
      const task = await taskStore.createTask(
        { pollInterval: 1000 },
        testRequestId,
        testRequest,
      );

      expect(task.ttl).toBe(60000); // default from options
    });

    it('should use default poll interval when not provided', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      expect(task.pollInterval).toBe(1000); // default
    });

    it('should generate unique task IDs', async () => {
      const task1 = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );
      const task2 = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      expect(task1.taskId).not.toBe(task2.taskId);
    });
  });

  describe('getTask', () => {
    it('should retrieve an existing task', async () => {
      const created = await taskStore.createTask(
        { ttl: 30000, pollInterval: 2000 },
        testRequestId,
        testRequest,
      );

      const retrieved = await taskStore.getTask(created.taskId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.taskId).toBe(created.taskId);
      expect(retrieved?.status).toBe('working');
      expect(retrieved?.pollInterval).toBe(2000);
    });

    it('should return null for non-existent task', async () => {
      const result = await taskStore.getTask('nonexistent-task-id');
      expect(result).toBeNull();
    });

    it('should return a copy of the task (not a reference)', async () => {
      const created = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      const retrieved1 = await taskStore.getTask(created.taskId);
      const retrieved2 = await taskStore.getTask(created.taskId);

      expect(retrieved1).not.toBe(retrieved2);
      expect(retrieved1).toEqual(retrieved2);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      await taskStore.updateTaskStatus(task.taskId, 'working', 'Processing...');

      const updated = await taskStore.getTask(task.taskId);
      expect(updated?.status).toBe('working');
      expect(updated?.statusMessage).toBe('Processing...');
    });

    it('should update lastUpdatedAt timestamp', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );
      const originalUpdatedAt = task.lastUpdatedAt;

      // Small delay to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));
      await taskStore.updateTaskStatus(task.taskId, 'working', 'Updated');

      const updated = await taskStore.getTask(task.taskId);
      expect(updated?.lastUpdatedAt).not.toBe(originalUpdatedAt);
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        taskStore.updateTaskStatus('nonexistent', 'completed'),
      ).rejects.toThrow('not found');
    });

    it('should throw error when transitioning from terminal state', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      // Complete the task
      await taskStore.storeTaskResult(task.taskId, 'completed', {
        content: [{ type: 'text', text: 'Done' }],
      });

      // Try to update status - should fail
      await expect(
        taskStore.updateTaskStatus(task.taskId, 'working', 'Retry'),
      ).rejects.toThrow(/terminal status/i);
    });
  });

  describe('storeTaskResult', () => {
    it('should store result and update status to completed', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      await taskStore.storeTaskResult(task.taskId, 'completed', {
        content: [{ type: 'text', text: 'Success!' }],
      });

      const updated = await taskStore.getTask(task.taskId);
      expect(updated?.status).toBe('completed');
    });

    it('should store result and update status to failed', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      await taskStore.storeTaskResult(task.taskId, 'failed', {
        content: [{ type: 'text', text: 'Error occurred' }],
        isError: true,
      });

      const updated = await taskStore.getTask(task.taskId);
      expect(updated?.status).toBe('failed');
    });

    it('should throw error for non-existent task', async () => {
      await expect(
        taskStore.storeTaskResult('nonexistent', 'completed', {
          content: [{ type: 'text', text: 'Done' }],
        }),
      ).rejects.toThrow('not found');
    });

    it('should throw error when storing result for task in terminal state', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      // Store first result
      await taskStore.storeTaskResult(task.taskId, 'completed', {
        content: [{ type: 'text', text: 'First result' }],
      });

      // Try to store another result - should fail
      await expect(
        taskStore.storeTaskResult(task.taskId, 'failed', {
          content: [{ type: 'text', text: 'Second result' }],
        }),
      ).rejects.toThrow(/terminal status|stored once/i);
    });
  });

  describe('getTaskResult', () => {
    it('should retrieve stored result', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      const expectedResult = {
        content: [{ type: 'text' as const, text: 'Success!' }],
        structuredContent: { success: true, data: 'test' },
      };
      await taskStore.storeTaskResult(task.taskId, 'completed', expectedResult);

      const result = await taskStore.getTaskResult(task.taskId);
      expect(result.content).toEqual(expectedResult.content);
      expect(result.structuredContent).toEqual(
        expectedResult.structuredContent,
      );
    });

    it('should throw error for non-existent task', async () => {
      await expect(taskStore.getTaskResult('nonexistent')).rejects.toThrow(
        'not found',
      );
    });

    it('should throw error when no result stored', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      await expect(taskStore.getTaskResult(task.taskId)).rejects.toThrow(
        'no result stored',
      );
    });
  });

  describe('listTasks', () => {
    it('should list all tasks', async () => {
      // Create a few tasks
      await taskStore.createTask({ ttl: 30000 }, 1, testRequest);
      await taskStore.createTask({ ttl: 30000 }, 2, testRequest);
      await taskStore.createTask({ ttl: 30000 }, 3, testRequest);

      const result = await taskStore.listTasks();
      expect(result.tasks.length).toBe(3);
    });

    it('should return empty list when no tasks exist', async () => {
      const result = await taskStore.listTasks();
      expect(result.tasks).toEqual([]);
    });

    it('should support pagination', async () => {
      // Create more tasks than page size (10)
      const storeWithSmallPage = new StorageBackedTaskStore(storageService, {
        tenantId: 'test-pagination',
        pageSize: 2,
      });

      await storeWithSmallPage.createTask({ ttl: 30000 }, 1, testRequest);
      await storeWithSmallPage.createTask({ ttl: 30000 }, 2, testRequest);
      await storeWithSmallPage.createTask({ ttl: 30000 }, 3, testRequest);

      // First page
      const page1 = await storeWithSmallPage.listTasks();
      expect(page1.tasks.length).toBeLessThanOrEqual(2);

      if (page1.nextCursor) {
        // Second page
        const page2 = await storeWithSmallPage.listTasks(page1.nextCursor);
        expect(page2.tasks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('deleteTask', () => {
    it('should delete an existing task', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      await taskStore.deleteTask(task.taskId);

      const result = await taskStore.getTask(task.taskId);
      expect(result).toBeNull();
    });

    it('should not throw error when deleting non-existent task', async () => {
      // Should not throw
      await expect(
        taskStore.deleteTask('nonexistent'),
      ).resolves.toBeUndefined();
    });
  });

  describe('clearAllTasks', () => {
    it('should clear all tasks', async () => {
      // Create a few tasks
      await taskStore.createTask({ ttl: 30000 }, 1, testRequest);
      await taskStore.createTask({ ttl: 30000 }, 2, testRequest);
      await taskStore.createTask({ ttl: 30000 }, 3, testRequest);

      await taskStore.clearAllTasks();

      const result = await taskStore.listTasks();
      expect(result.tasks).toEqual([]);
    });

    it('should handle empty store', async () => {
      // Should not throw on empty store
      await expect(taskStore.clearAllTasks()).resolves.toBeUndefined();
    });
  });

  describe('task state machine', () => {
    it('should allow working -> completed transition', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      await taskStore.storeTaskResult(task.taskId, 'completed', {
        content: [{ type: 'text', text: 'Done' }],
      });

      const updated = await taskStore.getTask(task.taskId);
      expect(updated?.status).toBe('completed');
    });

    it('should allow working -> failed transition', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      await taskStore.storeTaskResult(task.taskId, 'failed', {
        content: [{ type: 'text', text: 'Error' }],
        isError: true,
      });

      const updated = await taskStore.getTask(task.taskId);
      expect(updated?.status).toBe('failed');
    });

    it('should allow working -> cancelled transition via updateTaskStatus', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      await taskStore.updateTaskStatus(
        task.taskId,
        'cancelled',
        'User cancelled',
      );

      const updated = await taskStore.getTask(task.taskId);
      expect(updated?.status).toBe('cancelled');
    });

    it('should allow multiple working status updates', async () => {
      const task = await taskStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      await taskStore.updateTaskStatus(task.taskId, 'working', '25% complete');
      await taskStore.updateTaskStatus(task.taskId, 'working', '50% complete');
      await taskStore.updateTaskStatus(task.taskId, 'working', '75% complete');

      const updated = await taskStore.getTask(task.taskId);
      expect(updated?.status).toBe('working');
      expect(updated?.statusMessage).toBe('75% complete');
    });
  });

  describe('configuration options', () => {
    it('should use custom tenant ID', async () => {
      const customStore = new StorageBackedTaskStore(storageService, {
        tenantId: 'custom-tenant',
      });

      const task = await customStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      // Task should be retrievable
      const retrieved = await customStore.getTask(task.taskId);
      expect(retrieved).not.toBeNull();
    });

    it('should use custom key prefix', async () => {
      const customStore = new StorageBackedTaskStore(storageService, {
        tenantId: 'test-prefix',
        keyPrefix: 'custom-prefix',
      });

      const task = await customStore.createTask(
        { ttl: 30000 },
        testRequestId,
        testRequest,
      );

      // Task should be retrievable
      const retrieved = await customStore.getTask(task.taskId);
      expect(retrieved).not.toBeNull();
    });

    it('should handle null default TTL', async () => {
      const customStore = new StorageBackedTaskStore(storageService, {
        tenantId: 'test-null-ttl',
        defaultTtl: null,
      });

      const task = await customStore.createTask(
        { pollInterval: 1000 },
        testRequestId,
        testRequest,
      );

      expect(task.ttl).toBeNull();
    });
  });
});
