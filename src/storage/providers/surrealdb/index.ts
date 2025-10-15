/**
 * @fileoverview Barrel exports for SurrealDB storage provider.
 * @module src/storage/providers/surrealdb
 */

// Core exports
export { SurrealDbClient } from './core/surrealDbClient.js';
export { SurrealKvProvider } from './kv/surrealKvProvider.js';
export { ConnectionManager } from './core/connectionManager.js';
export { TransactionManager } from './core/transactionManager.js';
export {
  SelectQueryBuilder,
  WhereBuilder,
  select,
  where,
} from './core/queryBuilder.js';

// Authentication exports
export { AuthManager } from './auth/authManager.js';
export {
  ScopeDefinitions,
  PermissionPatterns,
} from './auth/scopeDefinitions.js';
export {
  PermissionHelper,
  PermissionBuilder,
} from './auth/permissionHelpers.js';

// Graph exports
export { GraphOperations } from './graph/graphOperations.js';
export { RelationshipManager } from './graph/relationshipManager.js';
export { PathFinder } from './graph/pathFinder.js';

// Event exports
export { EventManager } from './events/eventManager.js';
export { TriggerBuilder } from './events/triggerBuilder.js';

// Query exports
export { SubqueryBuilder, subquery } from './query/subqueryBuilder.js';
export { ForLoopBuilder, forLoop } from './query/forLoopBuilder.js';

// Function exports
export { CustomFunctions } from './functions/customFunctions.js';
export { FunctionRegistry } from './functions/functionRegistry.js';

// Migration exports
export { MigrationRunner } from './migrations/migrationRunner.js';

// Introspection exports
export { SchemaIntrospector } from './introspection/schemaIntrospector.js';

// Types
export type {
  SurrealDb,
  KvStoreRecord,
  KvStoreInput,
  SurrealDbConfig,
  QueryResult,
  TransactionOptions,
  HealthCheckResult,
} from './types.js';

export type {
  AuthStrategy,
  JwtAlgorithm,
  JwtAccessConfig,
  RecordAccessConfig,
  AuthResult,
} from './auth/authManager.js';

export type {
  PermissionOp,
  PermissionRule,
  TablePermissions,
} from './auth/permissionHelpers.js';

export type {
  Vertex,
  Edge,
  EdgeOptions,
  GraphQueryResult,
} from './graph/graphTypes.js';

export type { Path, PathFindingOptions } from './graph/pathFinder.js';

export type {
  EventTrigger,
  EventConfig,
  EventContext,
  DefineEventResult,
  EventInfo,
} from './events/eventTypes.js';

export type { SubqueryContext } from './query/subqueryBuilder.js';
export type { ForLoopConfig } from './query/forLoopBuilder.js';
export type {
  FunctionParameter,
  CustomFunctionConfig,
  DefineFunctionResult,
} from './functions/customFunctions.js';

export type {
  Migration,
  MigrationResult,
  MigrationHistory,
  MigrationPlan,
  MigrationDirection,
  MigrationStatus,
} from './migrations/migrationTypes.js';

export type {
  TableInfo,
  FieldInfo,
  IndexInfo,
  DatabaseSchema,
} from './introspection/schemaIntrospector.js';
