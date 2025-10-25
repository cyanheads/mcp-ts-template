/**
 * @fileoverview Test suite for SurrealDB event trigger builder.
 * @module tests/storage/providers/surrealdb/events/triggerBuilder.test
 */

import { describe, expect, it } from 'vitest';
import { TriggerBuilder } from '@/storage/providers/surrealdb/events/triggerBuilder.js';

describe('TriggerBuilder', () => {
  describe('Static factory method', () => {
    it('should create a builder for a table', () => {
      const builder = TriggerBuilder.for('user');
      expect(builder).toBeInstanceOf(TriggerBuilder);
    });
  });

  describe('Builder pattern', () => {
    it('should build a basic CREATE trigger', () => {
      const event = TriggerBuilder.for('user')
        .named('user_created')
        .onCreate()
        .then('CREATE audit_log SET table = "user"')
        .build();

      expect(event).toEqual({
        table: 'user',
        name: 'user_created',
        triggers: ['CREATE'],
        then: 'CREATE audit_log SET table = "user"',
      });
    });

    it('should build an UPDATE trigger', () => {
      const event = TriggerBuilder.for('user')
        .named('user_updated')
        .onUpdate()
        .then('CREATE audit_log SET event = "update"')
        .build();

      expect(event.triggers).toContain('UPDATE');
    });

    it('should build a DELETE trigger', () => {
      const event = TriggerBuilder.for('user')
        .named('user_deleted')
        .onDelete()
        .then('CREATE audit_log SET event = "delete"')
        .build();

      expect(event.triggers).toContain('DELETE');
    });

    it('should build with multiple trigger types', () => {
      const event = TriggerBuilder.for('user')
        .named('user_changes')
        .onCreate()
        .onUpdate()
        .onDelete()
        .then('CREATE audit_log')
        .build();

      expect(event.triggers).toEqual(['CREATE', 'UPDATE', 'DELETE']);
    });

    it('should support onAny() for all trigger types', () => {
      const event = TriggerBuilder.for('user')
        .named('user_any')
        .onAny()
        .then('CREATE audit_log')
        .build();

      expect(event.triggers).toEqual(['CREATE', 'UPDATE', 'DELETE']);
    });

    it('should replace triggers when onAny() is called', () => {
      const event = TriggerBuilder.for('user')
        .named('user_event')
        .onCreate()
        .onAny()
        .then('CREATE audit_log')
        .build();

      expect(event.triggers).toEqual(['CREATE', 'UPDATE', 'DELETE']);
    });

    it('should not add duplicate triggers', () => {
      const event = TriggerBuilder.for('user')
        .named('user_event')
        .onCreate()
        .onCreate()
        .then('CREATE audit_log')
        .build();

      expect(event.triggers).toEqual(['CREATE']);
    });

    it('should add WHEN condition', () => {
      const event = TriggerBuilder.for('user')
        .named('email_changed')
        .onUpdate()
        .when('$before.email != $after.email')
        .then('CREATE notification')
        .build();

      expect(event.when).toBe('$before.email != $after.email');
    });

    it('should build without WHEN condition', () => {
      const event = TriggerBuilder.for('user')
        .named('user_created')
        .onCreate()
        .then('CREATE audit_log')
        .build();

      expect(event.when).toBeUndefined();
    });

    it('should support method chaining', () => {
      const event = TriggerBuilder.for('user')
        .named('user_audit')
        .onCreate()
        .onUpdate()
        .when('$value != NONE')
        .then('CREATE audit_log')
        .build();

      expect(event.table).toBe('user');
      expect(event.name).toBe('user_audit');
      expect(event.triggers).toContain('CREATE');
      expect(event.triggers).toContain('UPDATE');
      expect(event.when).toBe('$value != NONE');
      expect(event.then).toBe('CREATE audit_log');
    });
  });

  describe('Build validation', () => {
    it('should throw error when table is missing', () => {
      const builder = TriggerBuilder.for('user');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (builder as any).config.table = undefined;

      expect(() =>
        builder.named('test').onCreate().then('CREATE log').build(),
      ).toThrow('Table name is required');
    });

    it('should throw error when name is missing', () => {
      expect(() =>
        TriggerBuilder.for('user').onCreate().then('CREATE log').build(),
      ).toThrow('Event name is required');
    });

    it('should throw error when no triggers are specified', () => {
      expect(() =>
        TriggerBuilder.for('user').named('test').then('CREATE log').build(),
      ).toThrow('At least one trigger type is required');
    });

    it('should throw error when THEN clause is missing', () => {
      expect(() =>
        TriggerBuilder.for('user').named('test').onCreate().build(),
      ).toThrow('THEN clause is required');
    });

    it('should throw error when THEN clause is empty', () => {
      expect(() =>
        TriggerBuilder.for('user').named('test').onCreate().then('').build(),
      ).toThrow('THEN clause is required');
    });
  });

  describe('Static convenience methods', () => {
    describe('auditLog', () => {
      it('should create audit log event with defaults', () => {
        const event = TriggerBuilder.auditLog('user');

        expect(event.table).toBe('user');
        expect(event.name).toBe('audit_changes');
        expect(event.triggers).toEqual(['UPDATE']);
        expect(event.then).toContain('CREATE audit_log');
        expect(event.then).toContain("table = 'user'");
      });

      it('should create audit log event with custom name', () => {
        const event = TriggerBuilder.auditLog('user', 'custom_audit');

        expect(event.name).toBe('custom_audit');
      });

      it('should create audit log event with custom audit table', () => {
        const event = TriggerBuilder.auditLog(
          'user',
          'audit_changes',
          'custom_audit_log',
        );

        expect(event.then).toContain('CREATE custom_audit_log');
      });

      it('should include all audit fields', () => {
        const event = TriggerBuilder.auditLog('user');

        expect(event.then).toContain('record_id = $value');
        expect(event.then).toContain('event_type = $event');
        expect(event.then).toContain('before_state = $before');
        expect(event.then).toContain('after_state = $after');
        expect(event.then).toContain('changed_at = time::now()');
      });
    });

    describe('autoCleanup', () => {
      it('should create cleanup event with defaults', () => {
        const event = TriggerBuilder.autoCleanup('session');

        expect(event.table).toBe('session');
        expect(event.name).toBe('cleanup_expired');
        expect(event.triggers).toContain('CREATE');
        expect(event.triggers).toContain('UPDATE');
        expect(event.then).toContain('DELETE FROM session');
        expect(event.then).toContain('expires_at != NONE');
        expect(event.then).toContain('expires_at < time::now()');
      });

      it('should create cleanup event with custom name', () => {
        const event = TriggerBuilder.autoCleanup('session', 'custom_cleanup');

        expect(event.name).toBe('custom_cleanup');
      });
    });

    describe('cascadeDelete', () => {
      it('should create cascade delete event', () => {
        const event = TriggerBuilder.cascadeDelete(
          'user',
          'delete_posts',
          'post',
          'user_id',
        );

        expect(event.table).toBe('user');
        expect(event.name).toBe('delete_posts');
        expect(event.triggers).toEqual(['DELETE']);
        expect(event.then).toContain('DELETE FROM post');
        expect(event.then).toContain('user_id = $before.id');
      });
    });

    describe('webhook', () => {
      it('should create webhook event', () => {
        const webhookUrl = 'https://example.com/webhook';
        const event = TriggerBuilder.webhook(
          'user',
          'notify_changes',
          webhookUrl,
        );

        expect(event.table).toBe('user');
        expect(event.name).toBe('notify_changes');
        expect(event.triggers).toEqual(['CREATE', 'UPDATE', 'DELETE']);
        expect(event.then).toContain(`http::post('${webhookUrl}'`);
        expect(event.then).toContain('event: $event');
        expect(event.then).toContain("table: 'user'");
        expect(event.then).toContain('record_id: $value');
        expect(event.then).toContain('before: $before');
        expect(event.then).toContain('after: $after');
        expect(event.then).toContain('timestamp: time::now()');
      });
    });
  });

  describe('Complex scenarios', () => {
    it('should build event with all optional features', () => {
      const event = TriggerBuilder.for('user')
        .named('comprehensive_event')
        .onCreate()
        .onUpdate()
        .onDelete()
        .when('$value.active = true')
        .then(
          `
          CREATE audit_log SET
            table = 'user',
            event = $event,
            record = $value
        `,
        )
        .build();

      expect(event).toEqual({
        table: 'user',
        name: 'comprehensive_event',
        triggers: ['CREATE', 'UPDATE', 'DELETE'],
        when: '$value.active = true',
        then: expect.stringContaining('CREATE audit_log'),
      });
    });

    it('should handle multi-line THEN clause', () => {
      const actions = `
        CREATE audit_log SET
          table = 'user',
          action = $event;
        UPDATE stats SET count += 1;
      `;

      const event = TriggerBuilder.for('user')
        .named('multi_action')
        .onCreate()
        .then(actions)
        .build();

      expect(event.then).toBe(actions);
    });
  });
});
