/**
 * @fileoverview Event manager for SurrealDB table events.
 * Manages DEFINE EVENT creation, deletion, and inspection.
 * @module src/storage/providers/surrealdb/events/eventManager
 */

import type Surreal from 'surrealdb';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';
import type {
  EventConfig,
  EventTrigger,
  DefineEventResult,
  EventInfo,
} from './eventTypes.js';

/**
 * Manages table events in SurrealDB.
 *
 * @remarks
 * Events are triggered automatically within the current transaction after
 * data modifications, providing access to $event, $before, and $after.
 *
 * @example
 * ```ts
 * const eventMgr = new EventManager(client);
 *
 * // Create audit log on updates
 * await eventMgr.defineEvent({
 *   table: 'user',
 *   name: 'audit_user_changes',
 *   triggers: ['UPDATE'],
 *   when: '$before.email != $after.email',
 *   then: `CREATE audit_log SET
 *     table = 'user',
 *     record_id = $value,
 *     field = 'email',
 *     old_value = $before.email,
 *     new_value = $after.email,
 *     timestamp = time::now()`
 * }, context);
 * ```
 */
export class EventManager {
  constructor(private readonly client: Surreal) {}

  /**
   * Define a new table event.
   *
   * @param config - Event configuration
   * @param context - Request context for logging
   * @returns Result with event details
   */
  async defineEvent(
    config: EventConfig,
    context: RequestContext,
  ): Promise<DefineEventResult> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.info(
          `[EventManager] Defining event: ${config.table}.${config.name}`,
          context,
        );

        const query = this.buildDefineEventQuery(config);

        await this.client.query(query);

        logger.info(
          `[EventManager] Event defined successfully: ${config.name}`,
          context,
        );

        return {
          name: config.name,
          table: config.table,
          success: true,
        };
      },
      {
        operation: 'EventManager.defineEvent',
        context,
        input: { table: config.table, name: config.name },
      },
    );
  }

  /**
   * Remove an event from a table.
   *
   * @param table - Table name
   * @param eventName - Event name
   * @param context - Request context
   * @returns True if removed
   */
  async removeEvent(
    table: string,
    eventName: string,
    context: RequestContext,
  ): Promise<boolean> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.info(
          `[EventManager] Removing event: ${table}.${eventName}`,
          context,
        );

        const query = `REMOVE EVENT ${eventName} ON TABLE ${table}`;

        await this.client.query(query);

        logger.info(`[EventManager] Event removed: ${eventName}`, context);

        return true;
      },
      {
        operation: 'EventManager.removeEvent',
        context,
        input: { table, eventName },
      },
    );
  }

  /**
   * List all events on a table.
   *
   * @param table - Table name
   * @param context - Request context
   * @returns Array of event information
   */
  async listEvents(
    table: string,
    context: RequestContext,
  ): Promise<EventInfo[]> {
    return ErrorHandler.tryCatch(
      async () => {
        const query = `INFO FOR TABLE ${table}`;

        const result =
          await this.client.query<
            [{ result: { events: Record<string, unknown> } }]
          >(query);

        const eventsObj = result[0]?.result?.events || {};

        // Parse events from INFO result
        const events: EventInfo[] = Object.entries(eventsObj).map(
          ([name, _details]) => ({
            name,
            triggers: [] as EventTrigger[], // Would parse from details
            then: '', // Would parse from details
          }),
        );

        return events;
      },
      {
        operation: 'EventManager.listEvents',
        context,
        input: { table },
      },
    );
  }

  /**
   * Build DEFINE EVENT query from configuration.
   */
  private buildDefineEventQuery(config: EventConfig): string {
    const parts = [`DEFINE EVENT ${config.name} ON TABLE ${config.table}`];

    // Build WHEN clause
    const whenConditions: string[] = [];

    // Add event type conditions
    if (config.triggers.length > 0 && config.triggers.length < 3) {
      const eventConditions = config.triggers
        .map((t) => `$event = "${t}"`)
        .join(' OR ');
      whenConditions.push(`(${eventConditions})`);
    }

    // Add custom WHEN condition
    if (config.when) {
      whenConditions.push(`(${config.when})`);
    }

    if (whenConditions.length > 0) {
      parts.push(`WHEN ${whenConditions.join(' AND ')}`);
    }

    // Add THEN clause
    parts.push(`THEN {`);
    parts.push(`  ${config.then}`);
    parts.push(`}`);

    return parts.join('\n');
  }
}
