/**
 * @fileoverview A TaskStore implementation backed by the template's StorageService.
 * This provides persistent task storage that survives server restarts, using
 * whatever storage backend is configured (filesystem, Supabase, SurrealDB, etc.).
 *
 * Use this instead of InMemoryTaskStore when you need task durability.
 *
 * @experimental These APIs are experimental and may change without notice.
 * @module src/mcp-server/tasks/core/storageBackedTaskStore
 */
import type {
  Request,
  RequestId,
  Result,
} from '@modelcontextprotocol/sdk/types.js';

import type { StorageService } from '@/storage/core/StorageService.js';
import { idGenerator, type RequestContext } from '@/utils/index.js';
import type { Task, TaskStore, CreateTaskOptions } from './taskTypes.js';
import { isTerminal } from './taskTypes.js';

/**
 * Internal structure for storing task data in the storage backend.
 */
interface StoredTask {
  task: Task;
  request: Request;
  requestId: RequestId;
  result?: Result;
}

/**
 * Configuration options for StorageBackedTaskStore.
 */
export interface StorageBackedTaskStoreOptions {
  /**
   * The tenant ID to use for storage operations.
   * Tasks are stored under this tenant for isolation.
   * @default 'system-tasks'
   */
  tenantId?: string;

  /**
   * Prefix for storage keys.
   * @default 'tasks'
   */
  keyPrefix?: string;

  /**
   * Default TTL in milliseconds if not specified in task creation.
   * Set to null for unlimited lifetime.
   * @default null
   */
  defaultTtl?: number | null;

  /**
   * Page size for listTasks pagination.
   * @default 10
   */
  pageSize?: number;
}

/**
 * A TaskStore implementation backed by StorageService for persistent task storage.
 *
 * Unlike InMemoryTaskStore, this implementation:
 * - Persists tasks across server restarts
 * - Works with any configured storage backend (filesystem, Supabase, SurrealDB, etc.)
 * - Supports TTL via storage provider options
 *
 * @example
 * ```typescript
 * const taskStore = new StorageBackedTaskStore(storageService, {
 *   tenantId: 'my-app-tasks',
 *   defaultTtl: 3600000, // 1 hour
 * });
 * ```
 *
 * @experimental
 */
export class StorageBackedTaskStore implements TaskStore {
  private readonly tenantId: string;
  private readonly keyPrefix: string;
  private readonly defaultTtl: number | null;
  private readonly pageSize: number;

  constructor(
    private readonly storage: StorageService,
    options: StorageBackedTaskStoreOptions = {},
  ) {
    this.tenantId = options.tenantId ?? 'system-tasks';
    this.keyPrefix = options.keyPrefix ?? 'tasks';
    this.defaultTtl = options.defaultTtl ?? null;
    this.pageSize = options.pageSize ?? 10;
  }

  /**
   * Creates a request context for storage operations.
   */
  private createContext(operation: string): RequestContext {
    return {
      operation: `StorageBackedTaskStore.${operation}`,
      requestId: idGenerator.generate('req'),
      timestamp: new Date().toISOString(),
      tenantId: this.tenantId,
    };
  }

  /**
   * Generates the storage key for a task.
   */
  private getTaskKey(taskId: string): string {
    return `${this.keyPrefix}/${taskId}`;
  }

  /**
   * Generates a unique task ID.
   * Uses the template's idGenerator for consistent ID format.
   */
  private generateTaskId(): string {
    // Generate a longer ID for global uniqueness (16 chars)
    return idGenerator.generate('task', { length: 16 });
  }

  async createTask(
    taskParams: CreateTaskOptions,
    requestId: RequestId,
    request: Request,
    _sessionId?: string,
  ): Promise<Task> {
    const context = this.createContext('createTask');
    const taskId = this.generateTaskId();

    const actualTtl = taskParams.ttl ?? this.defaultTtl;
    const createdAt = new Date().toISOString();

    const task: Task = {
      taskId,
      status: 'working',
      ttl: actualTtl,
      createdAt,
      lastUpdatedAt: createdAt,
      pollInterval: taskParams.pollInterval ?? 1000,
    };

    const storedTask: StoredTask = {
      task,
      request,
      requestId,
    };

    // Store with TTL if specified (convert ms to seconds for StorageService)
    await this.storage.set(
      this.getTaskKey(taskId),
      storedTask,
      context,
      actualTtl ? { ttl: Math.ceil(actualTtl / 1000) } : undefined,
    );

    return task;
  }

  async getTask(taskId: string, _sessionId?: string): Promise<Task | null> {
    const context = this.createContext('getTask');
    const stored = await this.storage.get<StoredTask>(
      this.getTaskKey(taskId),
      context,
    );

    return stored ? { ...stored.task } : null;
  }

  async storeTaskResult(
    taskId: string,
    status: 'completed' | 'failed',
    result: Result,
    _sessionId?: string,
  ): Promise<void> {
    const context = this.createContext('storeTaskResult');
    const key = this.getTaskKey(taskId);

    const stored = await this.storage.get<StoredTask>(key, context);
    if (!stored) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Don't allow storing results for tasks already in terminal state
    if (isTerminal(stored.task.status)) {
      throw new Error(
        `Cannot store result for task ${taskId} in terminal status '${stored.task.status}'. Task results can only be stored once.`,
      );
    }

    stored.result = result;
    stored.task.status = status;
    stored.task.lastUpdatedAt = new Date().toISOString();

    // Re-store with TTL reset (if ttl is set, convert ms to seconds)
    await this.storage.set(
      key,
      stored,
      context,
      stored.task.ttl ? { ttl: Math.ceil(stored.task.ttl / 1000) } : undefined,
    );
  }

  async getTaskResult(taskId: string, _sessionId?: string): Promise<Result> {
    const context = this.createContext('getTaskResult');
    const stored = await this.storage.get<StoredTask>(
      this.getTaskKey(taskId),
      context,
    );

    if (!stored) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    if (!stored.result) {
      throw new Error(`Task ${taskId} has no result stored`);
    }

    return stored.result;
  }

  async updateTaskStatus(
    taskId: string,
    status: Task['status'],
    statusMessage?: string,
    _sessionId?: string,
  ): Promise<void> {
    const context = this.createContext('updateTaskStatus');
    const key = this.getTaskKey(taskId);

    const stored = await this.storage.get<StoredTask>(key, context);
    if (!stored) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Don't allow transitions from terminal states
    if (isTerminal(stored.task.status)) {
      throw new Error(
        `Cannot update task ${taskId} from terminal status '${stored.task.status}' to '${status}'. Terminal states (completed, failed, cancelled) cannot transition to other states.`,
      );
    }

    stored.task.status = status;
    if (statusMessage) {
      stored.task.statusMessage = statusMessage;
    }
    stored.task.lastUpdatedAt = new Date().toISOString();

    // Re-store, reset TTL if transitioning to terminal state (convert ms to seconds)
    const shouldResetTtl = isTerminal(status) && stored.task.ttl;
    await this.storage.set(
      key,
      stored,
      context,
      shouldResetTtl ? { ttl: Math.ceil(stored.task.ttl! / 1000) } : undefined,
    );
  }

  async listTasks(
    cursor?: string,
    _sessionId?: string,
  ): Promise<{ tasks: Task[]; nextCursor?: string }> {
    const context = this.createContext('listTasks');

    // List all task keys with pagination
    const listResult = await this.storage.list(
      this.keyPrefix,
      context,
      cursor ? { cursor, limit: this.pageSize } : { limit: this.pageSize },
    );

    // Fetch all tasks in parallel
    const taskPromises = listResult.keys.map(async (key) => {
      const stored = await this.storage.get<StoredTask>(key, context);
      return stored ? { ...stored.task } : null;
    });

    const tasksOrNull = await Promise.all(taskPromises);
    const tasks = tasksOrNull.filter((t): t is Task => t !== null);

    // Handle exactOptionalPropertyTypes - only include nextCursor if defined
    if (listResult.nextCursor !== undefined) {
      return { tasks, nextCursor: listResult.nextCursor };
    }
    return { tasks };
  }

  /**
   * Deletes a task from storage.
   * Useful for manual cleanup or testing.
   *
   * @param taskId - The task ID to delete
   */
  async deleteTask(taskId: string): Promise<void> {
    const context = this.createContext('deleteTask');
    await this.storage.delete(this.getTaskKey(taskId), context);
  }

  /**
   * Clears all tasks from storage.
   * Useful for testing or administrative purposes.
   *
   * WARNING: This deletes ALL tasks for the configured tenant.
   */
  async clearAllTasks(): Promise<void> {
    const context = this.createContext('clearAllTasks');

    // List and delete all tasks
    let cursor: string | undefined;
    do {
      const result = await this.storage.list(
        this.keyPrefix,
        context,
        cursor ? { cursor, limit: 100 } : { limit: 100 },
      );

      await Promise.all(
        result.keys.map((key) => this.storage.delete(key, context)),
      );

      cursor = result.nextCursor;
    } while (cursor);
  }
}
