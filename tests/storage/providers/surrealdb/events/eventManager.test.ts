/**
 * @fileoverview Test suite for SurrealDB event manager.
 * @module tests/storage/providers/surrealdb/events/eventManager.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EventManager } from '@/storage/providers/surrealdb/events/eventManager.js';
import type { EventConfig } from '@/storage/providers/surrealdb/events/eventTypes.js';
import { requestContextService } from '@/utils/index.js';

describe('EventManager', () => {
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
  };
  let eventManager: EventManager;
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventManager = new EventManager(mockClient as any);
    context = requestContextService.createRequestContext({
      operation: 'test',
    });
  });

  describe('defineEvent', () => {
    it('should define a basic event', async () => {
      const config: EventConfig = {
        table: 'user',
        name: 'audit_changes',
        triggers: ['UPDATE'],
        then: 'CREATE audit_log',
      };

      mockClient.query.mockResolvedValue(undefined);

      const result = await eventManager.defineEvent(config, context);

      expect(result).toEqual({
        name: 'audit_changes',
        table: 'user',
        success: true,
      });
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should define event with WHEN condition', async () => {
      const config: EventConfig = {
        table: 'user',
        name: 'email_changed',
        triggers: ['UPDATE'],
        when: '$before.email != $after.email',
        then: 'CREATE notification',
      };

      mockClient.query.mockResolvedValue(undefined);

      await eventManager.defineEvent(config, context);

      expect(mockClient.query).toHaveBeenCalled();
      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('WHEN');
      expect(query).toContain('$before.email != $after.email');
    });

    it('should define event with multiple triggers', async () => {
      const config: EventConfig = {
        table: 'user',
        name: 'user_changes',
        triggers: ['CREATE', 'UPDATE'],
        then: 'CREATE audit_log',
      };

      mockClient.query.mockResolvedValue(undefined);

      await eventManager.defineEvent(config, context);

      expect(mockClient.query).toHaveBeenCalled();
      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('$event = "CREATE"');
      expect(query).toContain('$event = "UPDATE"');
    });

    it('should define event with all trigger types (no event filter)', async () => {
      const config: EventConfig = {
        table: 'user',
        name: 'all_changes',
        triggers: ['CREATE', 'UPDATE', 'DELETE'],
        then: 'CREATE audit_log',
      };

      mockClient.query.mockResolvedValue(undefined);

      await eventManager.defineEvent(config, context);

      expect(mockClient.query).toHaveBeenCalled();
      const query = mockClient.query.mock.calls[0]?.[0] as string;
      // When all 3 trigger types, no event filter is added
      expect(query).toContain('DEFINE EVENT');
      expect(query).toContain('THEN');
    });

    it('should include THEN clause in query', async () => {
      const config: EventConfig = {
        table: 'user',
        name: 'test_event',
        triggers: ['CREATE'],
        then: 'CREATE audit_log SET table = "user"',
      };

      mockClient.query.mockResolvedValue(undefined);

      await eventManager.defineEvent(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('THEN');
      expect(query).toContain('CREATE audit_log SET table = "user"');
    });
  });

  describe('removeEvent', () => {
    it('should remove an event', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const result = await eventManager.removeEvent(
        'user',
        'audit_changes',
        context,
      );

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        'REMOVE EVENT audit_changes ON TABLE user',
      );
    });

    it('should return true on successful removal', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const result = await eventManager.removeEvent('user', 'test', context);

      expect(result).toBe(true);
    });
  });

  describe('listEvents', () => {
    it('should list events for a table', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            events: {
              audit_changes: { when: '...', then: '...' },
              email_notification: { when: '...', then: '...' },
            },
          },
        },
      ]);

      const events = await eventManager.listEvents('user', context);

      expect(events).toHaveLength(2);
      expect(events[0]?.name).toBe('audit_changes');
      expect(events[1]?.name).toBe('email_notification');
      expect(mockClient.query).toHaveBeenCalledWith('INFO FOR TABLE user');
    });

    it('should return empty array when no events exist', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            events: {},
          },
        },
      ]);

      const events = await eventManager.listEvents('user', context);

      expect(events).toEqual([]);
    });

    it('should handle missing events object gracefully', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {},
        },
      ]);

      const events = await eventManager.listEvents('user', context);

      expect(events).toEqual([]);
    });

    it('should handle empty result array', async () => {
      mockClient.query.mockResolvedValue([]);

      const events = await eventManager.listEvents('user', context);

      expect(events).toEqual([]);
    });
  });

  describe('Query building', () => {
    it('should build query with single trigger', async () => {
      const config: EventConfig = {
        table: 'user',
        name: 'test',
        triggers: ['CREATE'],
        then: 'CREATE log',
      };

      mockClient.query.mockResolvedValue(undefined);

      await eventManager.defineEvent(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('DEFINE EVENT test ON TABLE user');
      expect(query).toContain('WHEN ($event = "CREATE")');
      expect(query).toContain('THEN');
    });

    it('should combine event filter with custom WHEN condition', async () => {
      const config: EventConfig = {
        table: 'user',
        name: 'test',
        triggers: ['UPDATE'],
        when: '$value.active = true',
        then: 'CREATE log',
      };

      mockClient.query.mockResolvedValue(undefined);

      await eventManager.defineEvent(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('$event = "UPDATE"');
      expect(query).toContain('$value.active = true');
      expect(query).toContain('AND');
    });

    it('should only include custom WHEN when all triggers specified', async () => {
      const config: EventConfig = {
        table: 'user',
        name: 'test',
        triggers: ['CREATE', 'UPDATE', 'DELETE'],
        when: '$value != NONE',
        then: 'CREATE log',
      };

      mockClient.query.mockResolvedValue(undefined);

      await eventManager.defineEvent(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('WHEN ($value != NONE)');
      expect(query).not.toContain('$event');
    });
  });
});
