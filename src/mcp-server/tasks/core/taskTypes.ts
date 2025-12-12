/**
 * @fileoverview Re-exports task-related types from the MCP SDK experimental module.
 * These types are used for implementing task-based tools that support long-running
 * async operations with the "call-now, fetch-later" pattern.
 *
 * @experimental These APIs are experimental and may change without notice.
 * @module src/mcp-server/tasks/core/taskTypes
 */

// Core task types from SDK
export type {
  Task,
  TaskCreationParams,
  RelatedTaskMetadata,
  CreateTaskResult,
  TaskStatusNotificationParams,
  TaskStatusNotification,
  GetTaskRequest,
  GetTaskResult,
  GetTaskPayloadRequest,
  ListTasksRequest,
  ListTasksResult,
  CancelTaskRequest,
  CancelTaskResult,
} from '@modelcontextprotocol/sdk/experimental/tasks';

// Task store and queue interfaces
export type {
  TaskStore,
  TaskMessageQueue,
  QueuedMessage,
  CreateTaskOptions,
} from '@modelcontextprotocol/sdk/experimental/tasks';

// Handler types for task-based tools
export type {
  ToolTaskHandler,
  CreateTaskRequestHandlerExtra,
  TaskRequestHandlerExtra,
  TaskToolExecution,
} from '@modelcontextprotocol/sdk/experimental/tasks';

// In-memory implementations (reference implementations)
export {
  InMemoryTaskStore,
  InMemoryTaskMessageQueue,
} from '@modelcontextprotocol/sdk/experimental/tasks';

// Utility functions
export { isTerminal } from '@modelcontextprotocol/sdk/experimental/tasks';

// Response message types for streaming task results
export type {
  ResponseMessage,
  TaskStatusMessage,
  TaskCreatedMessage,
  ResultMessage,
  ErrorMessage,
} from '@modelcontextprotocol/sdk/experimental/tasks';

// Helper functions for processing task responses
export {
  takeResult,
  toArrayAsync,
} from '@modelcontextprotocol/sdk/experimental/tasks';
