/**
 * @fileoverview A TaskStore wrapper that enforces session ownership on top of
 * the SDK's InMemoryTaskStore (which ignores sessionId parameters).
 *
 * This ensures that in HTTP mode, tasks created by one session cannot be
 * accessed by another session, even when using the in-memory store.
 *
 * @experimental These APIs are experimental and may change without notice.
 * @module src/mcp-server/tasks/core/sessionAwareTaskStore
 */
import type { Request, RequestId, Result } from '@modelcontextprotocol/sdk/types.js';

import { forbidden } from '@/types-global/errors.js';
import type { CreateTaskOptions, Task, TaskStore } from './taskTypes.js';

/**
 * Wraps an InMemoryTaskStore to add session ownership enforcement.
 *
 * Tracks which session created each task and rejects access from
 * non-owning sessions. Tasks created without a sessionId are accessible
 * by any session (backwards-compatible with stdio/unauth flows).
 *
 * @experimental
 */
export class SessionAwareTaskStore implements TaskStore {
  /** Maps taskId -> sessionId that created it */
  private readonly ownership = new Map<string, string>();

  constructor(private readonly inner: TaskStore) {}

  async createTask(
    taskParams: CreateTaskOptions,
    requestId: RequestId,
    request: Request,
    sessionId?: string,
  ): Promise<Task> {
    const task = await this.inner.createTask(taskParams, requestId, request, sessionId);
    if (sessionId) {
      this.ownership.set(task.taskId, sessionId);
    }
    return task;
  }

  async getTask(taskId: string, sessionId?: string): Promise<Task | null> {
    this.assertOwnership(taskId, sessionId);
    return await this.inner.getTask(taskId, sessionId);
  }

  async storeTaskResult(
    taskId: string,
    status: 'completed' | 'failed',
    result: Result,
    sessionId?: string,
  ): Promise<void> {
    this.assertOwnership(taskId, sessionId);
    await this.inner.storeTaskResult(taskId, status, result, sessionId);
  }

  async getTaskResult(taskId: string, sessionId?: string): Promise<Result> {
    this.assertOwnership(taskId, sessionId);
    return await this.inner.getTaskResult(taskId, sessionId);
  }

  async updateTaskStatus(
    taskId: string,
    status: Task['status'],
    statusMessage?: string,
    sessionId?: string,
  ): Promise<void> {
    this.assertOwnership(taskId, sessionId);
    await this.inner.updateTaskStatus(taskId, status, statusMessage, sessionId);
  }

  async listTasks(
    cursor?: string,
    sessionId?: string,
  ): Promise<{ tasks: Task[]; nextCursor?: string }> {
    const result = await this.inner.listTasks(cursor, sessionId);
    // Filter: session-bound tasks are only visible to their owning session.
    // Sessionless callers see only unowned tasks (consistent with StorageBackedTaskStore).
    const filtered = result.tasks.filter((task) => {
      const owner = this.ownership.get(task.taskId);
      if (!owner) return true; // Unowned — visible to everyone
      return owner === sessionId; // Session-bound — visible only to owner
    });
    const out: { tasks: Task[]; nextCursor?: string } = { tasks: filtered };
    if (result.nextCursor) out.nextCursor = result.nextCursor;
    return out;
  }

  /**
   * Validates that the caller's session matches the task's owner.
   * Tasks created without a sessionId are accessible by any session.
   */
  private assertOwnership(taskId: string, callerSessionId: string | undefined): void {
    const owner = this.ownership.get(taskId);
    if (!owner) return; // No owner recorded — accessible by anyone
    if (owner !== callerSessionId) {
      throw forbidden(`Access denied to task ${taskId}`);
    }
  }
}
