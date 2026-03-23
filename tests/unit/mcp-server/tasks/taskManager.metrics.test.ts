/**
 * @fileoverview Unit tests for OTel metrics emitted by the TaskManager and its
 * InstrumentedTaskStore wrapper. Verifies that `mcp.tasks.created`,
 * `mcp.tasks.status_changes`, and `mcp.tasks.active` metrics are recorded
 * with the correct attributes during task lifecycle operations.
 * @module tests/unit/mcp-server/tasks/taskManager.metrics.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCounterAdd = vi.fn();

const mockObservableGaugeCallback = vi.fn();
let lastGaugeCallback: (() => number) | undefined;

vi.mock('@/utils/telemetry/metrics.js', () => ({
  createCounter: vi.fn(() => {
    // Return a fresh counter mock so each call site gets its own counter.
    // The shared `mockCounterAdd` captures all `.add()` calls.
    return { add: mockCounterAdd };
  }),
  createHistogram: vi.fn(() => ({ record: vi.fn() })),
  createObservableGauge: vi.fn(
    (_name: string, _desc: string, callback: () => number, _unit?: string) => {
      lastGaugeCallback = callback;
      mockObservableGaugeCallback();
      return {};
    },
  ),
}));

vi.mock('@/utils/internal/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

vi.mock('@/utils/security/idGenerator.js', () => ({
  idGenerator: {
    generate: vi.fn(() => 'mock-id-001'),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import type { config as configType } from '@/config/index.js';
import { TaskManager } from '@/mcp-server/tasks/core/taskManager.js';
import { StorageService } from '@/storage/core/StorageService.js';
import { InMemoryProvider } from '@/storage/providers/inMemory/inMemoryProvider.js';
import { createObservableGauge } from '@/utils/telemetry/metrics.js';

function createStorageService(): StorageService {
  return new StorageService(new InMemoryProvider());
}

describe('TaskManager metrics', () => {
  let storageService: StorageService;

  const inMemoryConfig = {
    tasks: {
      storeType: 'in-memory' as const,
      tenantId: 'test-tenant',
      defaultTtlMs: null,
    },
  } as typeof configType;

  const storageConfig = {
    tasks: {
      storeType: 'storage' as const,
      tenantId: 'storage-tenant',
      defaultTtlMs: 3600_000,
    },
  } as typeof configType;

  beforeEach(() => {
    vi.clearAllMocks();
    lastGaugeCallback = undefined;
    storageService = createStorageService();
  });

  describe('mcp.tasks.created counter', () => {
    it('records on createTask with in-memory store type', async () => {
      const tm = new TaskManager(inMemoryConfig, storageService);
      const store = tm.getTaskStore();

      await store.createTask({ ttl: 60_000, pollInterval: 1_000 }, 1, {
        method: 'tools/call',
        params: {},
      });

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.task.store_type': 'in-memory',
      });
    });

    it('records on createTask with storage store type', async () => {
      const tm = new TaskManager(storageConfig, storageService);
      const store = tm.getTaskStore();

      await store.createTask({ ttl: 60_000, pollInterval: 1_000 }, 1, {
        method: 'tools/call',
        params: {},
      });

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.task.store_type': 'storage',
      });
    });
  });

  describe('mcp.tasks.status_changes counter', () => {
    it('records on storeTaskResult with status and store type', async () => {
      const tm = new TaskManager(inMemoryConfig, storageService);
      const store = tm.getTaskStore();

      const task = await store.createTask({ ttl: 60_000, pollInterval: 1_000 }, 1, {
        method: 'tools/call',
        params: {},
      });

      // Clear the createTask metric call
      mockCounterAdd.mockClear();

      await store.storeTaskResult(task.taskId, 'completed', {
        content: [{ type: 'text', text: 'done' }],
      });

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.task.status': 'completed',
        'mcp.task.store_type': 'in-memory',
      });
    });

    it('records failed status on storeTaskResult', async () => {
      const tm = new TaskManager(inMemoryConfig, storageService);
      const store = tm.getTaskStore();

      const task = await store.createTask({ ttl: 60_000, pollInterval: 1_000 }, 1, {
        method: 'tools/call',
        params: {},
      });
      mockCounterAdd.mockClear();

      await store.storeTaskResult(task.taskId, 'failed', {
        content: [{ type: 'text', text: 'error' }],
        isError: true,
      });

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.task.status': 'failed',
        'mcp.task.store_type': 'in-memory',
      });
    });

    it('records on updateTaskStatus with status and store type', async () => {
      const tm = new TaskManager(inMemoryConfig, storageService);
      const store = tm.getTaskStore();

      const task = await store.createTask({ ttl: 60_000, pollInterval: 1_000 }, 1, {
        method: 'tools/call',
        params: {},
      });
      mockCounterAdd.mockClear();

      await store.updateTaskStatus(task.taskId, 'working', 'Processing...');

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'mcp.task.status': 'working',
        'mcp.task.store_type': 'in-memory',
      });
    });
  });

  describe('mcp.tasks.active observable gauge', () => {
    it('creates observable gauge for in-memory store', () => {
      new TaskManager(inMemoryConfig, storageService);

      expect(createObservableGauge).toHaveBeenCalledWith(
        'mcp.tasks.active',
        'Number of active tasks in the in-memory store',
        expect.any(Function),
        '{tasks}',
      );
    });

    it('does not create observable gauge for storage-backed store', () => {
      mockObservableGaugeCallback.mockClear();

      new TaskManager(storageConfig, storageService);

      expect(mockObservableGaugeCallback).not.toHaveBeenCalled();
    });

    it('gauge callback returns current task count', async () => {
      const tm = new TaskManager(inMemoryConfig, storageService);
      const store = tm.getTaskStore();

      // Gauge callback should have been captured
      expect(lastGaugeCallback).toBeDefined();
      expect(lastGaugeCallback!()).toBe(0);

      await store.createTask({ ttl: 60_000, pollInterval: 1_000 }, 1, {
        method: 'tools/call',
        params: {},
      });

      expect(lastGaugeCallback!()).toBe(1);
    });
  });
});
