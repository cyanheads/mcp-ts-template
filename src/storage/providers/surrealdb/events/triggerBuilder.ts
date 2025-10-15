/**
 * @fileoverview Fluent API for building SurrealDB event triggers.
 * @module src/storage/providers/surrealdb/events/triggerBuilder
 */

import type { EventConfig } from './eventTypes.js';

/**
 * Fluent builder for table event triggers.
 *
 * @example
 * ```ts
 * const auditEvent = TriggerBuilder.for('user')
 *   .onUpdate()
 *   .when('$before.email != $after.email')
 *   .then(`
 *     CREATE audit_log SET
 *       table = 'user',
 *       record_id = $value,
 *       old_value = $before.email,
 *       new_value = $after.email
 *   `)
 *   .build();
 * ```
 */
export class TriggerBuilder {
  private config: Partial<EventConfig> = {
    triggers: [],
    then: '',
  };

  private constructor(table: string) {
    this.config.table = table;
  }

  /**
   * Create a new trigger builder for a table.
   */
  static for(table: string): TriggerBuilder {
    return new TriggerBuilder(table);
  }

  /**
   * Set the event name.
   */
  named(name: string): this {
    this.config.name = name;
    return this;
  }

  /**
   * Trigger on CREATE operations.
   */
  onCreate(): this {
    if (!this.config.triggers?.includes('CREATE')) {
      this.config.triggers?.push('CREATE');
    }
    return this;
  }

  /**
   * Trigger on UPDATE operations.
   */
  onUpdate(): this {
    if (!this.config.triggers?.includes('UPDATE')) {
      this.config.triggers?.push('UPDATE');
    }
    return this;
  }

  /**
   * Trigger on DELETE operations.
   */
  onDelete(): this {
    if (!this.config.triggers?.includes('DELETE')) {
      this.config.triggers?.push('DELETE');
    }
    return this;
  }

  /**
   * Trigger on any operation.
   */
  onAny(): this {
    this.config.triggers = ['CREATE', 'UPDATE', 'DELETE'];
    return this;
  }

  /**
   * Add a WHEN condition.
   *
   * @param condition - SurrealQL condition expression
   */
  when(condition: string): this {
    this.config.when = condition;
    return this;
  }

  /**
   * Add THEN actions.
   *
   * @param actions - SurrealQL statements to execute
   */
  then(actions: string): this {
    this.config.then = actions;
    return this;
  }

  /**
   * Build the final event configuration.
   *
   * @throws {Error} If required fields are missing
   */
  build(): EventConfig {
    if (!this.config.table) {
      throw new Error('Table name is required');
    }

    if (!this.config.name) {
      throw new Error('Event name is required');
    }

    if (!this.config.triggers || this.config.triggers.length === 0) {
      throw new Error('At least one trigger type is required');
    }

    if (!this.config.then) {
      throw new Error('THEN clause is required');
    }

    return this.config as EventConfig;
  }

  /**
   * Create an audit log event (common pattern).
   *
   * @param table - Table to audit
   * @param eventName - Event name
   * @param auditTable - Audit log table (default: 'audit_log')
   */
  static auditLog(
    table: string,
    eventName: string = 'audit_changes',
    auditTable: string = 'audit_log',
  ): EventConfig {
    return TriggerBuilder.for(table)
      .named(eventName)
      .onUpdate()
      .then(
        `CREATE ${auditTable} SET
          table = '${table}',
          record_id = $value,
          event_type = $event,
          before_state = $before,
          after_state = $after,
          changed_at = time::now()`,
      )
      .build();
  }

  /**
   * Create an auto-cleanup event for expired records.
   *
   * @param table - Table to clean up
   * @param eventName - Event name
   */
  static autoCleanup(
    table: string,
    eventName: string = 'cleanup_expired',
  ): EventConfig {
    return TriggerBuilder.for(table)
      .named(eventName)
      .onCreate()
      .onUpdate()
      .then(
        `DELETE FROM ${table}
          WHERE expires_at != NONE
          AND expires_at < time::now()`,
      )
      .build();
  }

  /**
   * Create a cascade delete event.
   *
   * @param table - Parent table
   * @param eventName - Event name
   * @param childTable - Child table to cascade delete
   * @param foreignKey - Foreign key field in child table
   */
  static cascadeDelete(
    table: string,
    eventName: string,
    childTable: string,
    foreignKey: string,
  ): EventConfig {
    return TriggerBuilder.for(table)
      .named(eventName)
      .onDelete()
      .then(
        `DELETE FROM ${childTable}
          WHERE ${foreignKey} = $before.id`,
      )
      .build();
  }

  /**
   * Create a notification event (e.g., webhook).
   *
   * @param table - Table to watch
   * @param eventName - Event name
   * @param webhookUrl - Webhook URL to call
   */
  static webhook(
    table: string,
    eventName: string,
    webhookUrl: string,
  ): EventConfig {
    return TriggerBuilder.for(table)
      .named(eventName)
      .onAny()
      .then(
        `http::post('${webhookUrl}', {
          event: $event,
          table: '${table}',
          record_id: $value,
          before: $before,
          after: $after,
          timestamp: time::now()
        })`,
      )
      .build();
  }
}
