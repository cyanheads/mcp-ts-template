/**
 * @fileoverview Singleton service for managing MCP task state and message queues.
 * Supports both in-memory and storage-backed task stores based on configuration.
 *
 * Configure via environment variables:
 * - TASK_STORE_TYPE: 'in-memory' (default) or 'storage'
 * - TASK_STORE_TENANT_ID: Tenant ID for storage isolation (default: 'system-tasks')
 * - TASK_STORE_DEFAULT_TTL_MS: Default TTL in milliseconds (optional)
 *
 * @experimental These APIs are experimental and may change without notice.
 * @module src/mcp-server/tasks/core/taskManager
 */
import { type config as configType } from '@/config/index.js';
import { StorageService } from '@/storage/core/StorageService.js';
import { logger, type RequestContext } from '@/utils/index.js';
import {
  InMemoryTaskStore,
  InMemoryTaskMessageQueue,
  type TaskStore,
  type TaskMessageQueue,
} from './taskTypes.js';
import { StorageBackedTaskStore } from './storageBackedTaskStore.js';

/**
 * Singleton service that manages task state and message queues for the MCP server.
 *
 * The TaskManager provides:
 * - A shared TaskStore for creating, tracking, and completing tasks
 * - A shared TaskMessageQueue for side-channel message delivery
 * - Cleanup methods for graceful shutdown
 *
 * The store type is determined by configuration:
 * - `in-memory`: Fast, suitable for development (data lost on restart)
 * - `storage`: Persistent, uses configured StorageService backend
 *
 * @example
 * ```typescript
 * // Inject via DI
 * constructor(@inject(TaskManagerToken) private taskManager: TaskManager) {}
 *
 * // Access stores
 * const taskStore = this.taskManager.getTaskStore();
 * const messageQueue = this.taskManager.getMessageQueue();
 * ```
 *
 * @experimental
 */
export class TaskManager {
  private readonly taskStore: TaskStore;
  private readonly inMemoryTaskStore: InMemoryTaskStore | null = null;
  private readonly messageQueue: InMemoryTaskMessageQueue;
  private readonly storeType: 'in-memory' | 'storage';
  private isShuttingDown = false;

  constructor(config: typeof configType, storageService: StorageService) {
    this.storeType = config.tasks.storeType;
    this.messageQueue = new InMemoryTaskMessageQueue();

    if (this.storeType === 'storage') {
      this.taskStore = new StorageBackedTaskStore(storageService, {
        tenantId: config.tasks.tenantId,
        defaultTtl: config.tasks.defaultTtlMs ?? null,
      });
    } else {
      this.inMemoryTaskStore = new InMemoryTaskStore();
      this.taskStore = this.inMemoryTaskStore;
    }

    logger.info(`TaskManager initialized with ${this.storeType} task store`, {
      operation: 'TaskManager.constructor',
      requestId: 'init',
      timestamp: new Date().toISOString(),
      storeType: this.storeType,
      ...(this.storeType === 'storage' && { tenantId: config.tasks.tenantId }),
    });
  }

  /**
   * Returns the TaskStore instance for managing task lifecycle.
   *
   * The TaskStore handles:
   * - Task creation with TTL and poll intervals
   * - Status updates (working, input_required, completed, failed, cancelled)
   * - Result storage and retrieval
   * - Task listing with pagination
   *
   * @returns The singleton TaskStore instance
   */
  public getTaskStore(): TaskStore {
    return this.taskStore;
  }

  /**
   * Returns the TaskMessageQueue instance for side-channel messaging.
   *
   * The message queue enables:
   * - Queuing requests/notifications for delivery via tasks/result
   * - FIFO ordering per task
   * - Atomic enqueue with size limits
   *
   * @returns The singleton TaskMessageQueue instance
   */
  public getMessageQueue(): TaskMessageQueue {
    return this.messageQueue;
  }

  /**
   * Returns the store type currently in use.
   *
   * @returns 'in-memory' or 'storage'
   */
  public getStoreType(): 'in-memory' | 'storage' {
    return this.storeType;
  }

  /**
   * Performs cleanup of task resources.
   *
   * Should be called during graceful server shutdown to:
   * - Cancel cleanup timers in the in-memory task store
   * - Clear any pending message queues
   *
   * Note: Storage-backed task stores don't require cleanup as data persists.
   *
   * @param context - Request context for logging
   */
  public cleanup(context?: RequestContext): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    const logContext = context ?? {
      operation: 'TaskManager.cleanup',
      requestId: 'shutdown',
      timestamp: new Date().toISOString(),
    };

    logger.info('Cleaning up TaskManager resources...', logContext);

    // Only InMemoryTaskStore has cleanup timers
    if (this.inMemoryTaskStore) {
      this.inMemoryTaskStore.cleanup();
    }

    logger.info('TaskManager cleanup complete', logContext);
  }

  /**
   * Returns the current task count (for debugging/monitoring).
   * Only available for in-memory store; returns `null` for storage-backed store.
   *
   * @returns The number of tasks currently tracked, or `null` if unavailable
   */
  public getTaskCount(): number | null {
    if (this.inMemoryTaskStore) {
      return this.inMemoryTaskStore.getAllTasks().length;
    }
    // Storage-backed store doesn't have getAllTasks - would require listing
    return null;
  }

  /**
   * Checks if the TaskManager is shutting down.
   *
   * @returns True if cleanup has been initiated
   */
  public isCleaningUp(): boolean {
    return this.isShuttingDown;
  }
}
