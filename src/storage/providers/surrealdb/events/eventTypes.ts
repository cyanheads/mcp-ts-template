/**
 * @fileoverview Type definitions for SurrealDB table events.
 * @module src/storage/providers/surrealdb/events/eventTypes
 */

/**
 * Event trigger type - when the event fires.
 */
export type EventTrigger = 'CREATE' | 'UPDATE' | 'DELETE';

/**
 * Configuration for defining a table event.
 */
export interface EventConfig {
  /** Table the event is attached to */
  table: string;
  /** Event name (unique per table) */
  name: string;
  /** When to trigger the event */
  triggers: EventTrigger[];
  /** Optional WHEN condition (SurrealQL expression) */
  when?: string;
  /** THEN clause - actions to execute (SurrealQL) */
  then: string;
}

/**
 * Event context available in THEN clause.
 */
export interface EventContext {
  /** Event type (CREATE, UPDATE, DELETE) */
  $event: EventTrigger;
  /** Record state before the change */
  $before?: Record<string, unknown>;
  /** Record state after the change */
  $after?: Record<string, unknown>;
  /** Record ID being modified */
  $value: string;
}

/**
 * Result of defining an event.
 */
export interface DefineEventResult {
  /** Event name */
  name: string;
  /** Table name */
  table: string;
  /** Whether the event was created successfully */
  success: boolean;
}

/**
 * Information about an existing event.
 */
export interface EventInfo {
  /** Event name */
  name: string;
  /** Trigger conditions */
  triggers: EventTrigger[];
  /** WHEN condition (if any) */
  when?: string;
  /** THEN actions */
  then: string;
}
