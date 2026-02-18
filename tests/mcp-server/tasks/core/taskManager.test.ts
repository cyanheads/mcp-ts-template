/**
 * @fileoverview Tests for the TaskManager service.
 * @module tests/mcp-server/tasks/core/taskManager.test
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { container } from '@/container/core/container.js';

import { TaskManager } from '@/mcp-server/tasks/core/taskManager.js';
import { StorageBackedTaskStore } from '@/mcp-server/tasks/core/storageBackedTaskStore.js';
import { StorageService } from '@/storage/core/StorageService.js';
import { InMemoryProvider } from '@/storage/providers/inMemory/inMemoryProvider.js';
import {
  AppConfig,
  StorageProvider,
  StorageService as StorageServiceToken,
} from '@/container/core/tokens.js';
import type { config as configType } from '@/config/index.js';

/** Helper to set up storage dependencies in the new container. */
function registerStorageDeps() {
  container.registerSingleton(StorageProvider, () => new InMemoryProvider());
  container.registerSingleton(
    StorageServiceToken,
    (c) => new StorageService(c.resolve(StorageProvider)),
  );
}

describe('TaskManager', () => {
  beforeEach(() => {
    container.reset();
    // Register base dependencies
    registerStorageDeps();
  });

  describe('with in-memory store (default)', () => {
    let taskManager: TaskManager;
    let mockConfig: typeof configType;

    beforeEach(() => {
      mockConfig = {
        tasks: {
          storeType: 'in-memory',
          tenantId: 'test-tenant',
          defaultTtlMs: null,
        },
      } as typeof configType;

      container.registerValue(AppConfig, mockConfig);
      const storageService = container.resolve(StorageServiceToken);
      taskManager = new TaskManager(mockConfig, storageService);
    });

    it('should initialize with in-memory task store', () => {
      expect(taskManager.getStoreType()).toBe('in-memory');
    });

    it('should return a TaskStore instance', () => {
      const store = taskManager.getTaskStore();
      expect(store).toBeDefined();
      expect(typeof store.createTask).toBe('function');
      expect(typeof store.getTask).toBe('function');
    });

    it('should return a TaskMessageQueue instance', () => {
      const queue = taskManager.getMessageQueue();
      expect(queue).toBeDefined();
      expect(typeof queue.enqueue).toBe('function');
      expect(typeof queue.dequeue).toBe('function');
    });

    it('should return task count for in-memory store', async () => {
      const store = taskManager.getTaskStore();

      // Initial count should be 0
      expect(taskManager.getTaskCount()).toBe(0);

      // Create a task
      await store.createTask({ ttl: 60000, pollInterval: 1000 }, 1, {
        method: 'tools/call',
        params: {},
      });

      // Count should now be 1
      expect(taskManager.getTaskCount()).toBe(1);
    });

    it('should cleanup resources', () => {
      expect(taskManager.isCleaningUp()).toBe(false);

      taskManager.cleanup();

      expect(taskManager.isCleaningUp()).toBe(true);
    });

    it('should only cleanup once', () => {
      taskManager.cleanup();
      taskManager.cleanup(); // Second call should be no-op

      expect(taskManager.isCleaningUp()).toBe(true);
    });
  });

  describe('with storage-backed store', () => {
    let taskManager: TaskManager;
    let mockConfig: typeof configType;

    beforeEach(() => {
      mockConfig = {
        tasks: {
          storeType: 'storage',
          tenantId: 'storage-test-tenant',
          defaultTtlMs: 3600000,
        },
      } as typeof configType;

      container.registerValue(AppConfig, mockConfig);
      const storageService = container.resolve(StorageServiceToken);
      taskManager = new TaskManager(mockConfig, storageService);
    });

    it('should initialize with storage-backed task store', () => {
      expect(taskManager.getStoreType()).toBe('storage');
    });

    it('should return null for task count (not available for storage store)', () => {
      expect(taskManager.getTaskCount()).toBeNull();
    });

    it('should return a TaskStore that is StorageBackedTaskStore', () => {
      const store = taskManager.getTaskStore();
      expect(store).toBeDefined();
      // StorageBackedTaskStore has deleteTask method that InMemoryTaskStore doesn't
      expect(typeof (store as StorageBackedTaskStore).deleteTask).toBe(
        'function',
      );
    });
  });

  describe('configuration edge cases', () => {
    it('should use default tenant ID when not specified', () => {
      const mockConfig = {
        tasks: {
          storeType: 'in-memory' as const,
          tenantId: 'system-tasks', // default value
          defaultTtlMs: null,
        },
      } as typeof configType;

      container.registerValue(AppConfig, mockConfig);
      const storageService = container.resolve(StorageServiceToken);
      const tm = new TaskManager(mockConfig, storageService);

      expect(tm.getStoreType()).toBe('in-memory');
    });

    it('should handle null defaultTtlMs for storage store', () => {
      const mockConfig = {
        tasks: {
          storeType: 'storage' as const,
          tenantId: 'test-tenant',
          defaultTtlMs: null,
        },
      } as typeof configType;

      container.registerValue(AppConfig, mockConfig);
      const storageService = container.resolve(StorageServiceToken);
      const tm = new TaskManager(mockConfig, storageService);

      expect(tm.getStoreType()).toBe('storage');
    });
  });
});
