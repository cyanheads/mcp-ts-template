/**
 * @fileoverview Test suite for SurrealDB migration runner.
 * @module tests/storage/providers/surrealdb/migrations/migrationRunner.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MigrationRunner } from '@/storage/providers/surrealdb/migrations/migrationRunner.js';
import type {
  Migration,
  MigrationHistory,
} from '@/storage/providers/surrealdb/migrations/migrationTypes.js';
import { requestContextService } from '@/utils/index.js';

describe('MigrationRunner', () => {
  let mockClient: { query: ReturnType<typeof vi.fn> };
  let runner: MigrationRunner;
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  const migration1: Migration = {
    id: '001_create_users',
    name: 'Create users table',
    up: 'DEFINE TABLE user SCHEMAFULL;',
    down: 'REMOVE TABLE user;',
  };

  const migration2: Migration = {
    id: '002_add_email',
    name: 'Add email field',
    up: 'DEFINE FIELD email ON TABLE user TYPE string;',
    down: 'REMOVE FIELD email ON TABLE user;',
  };

  beforeEach(() => {
    mockClient = { query: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    runner = new MigrationRunner(mockClient as any);
    context = requestContextService.createRequestContext({
      operation: 'test',
    });
  });

  describe('initialize', () => {
    it('should create the migration history table', async () => {
      mockClient.query.mockResolvedValue(undefined);

      await runner.initialize(context);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('DEFINE TABLE migration_history');
      expect(queryStr).toContain('SCHEMAFULL');
      expect(queryStr).toContain('migration_id');
      expect(queryStr).toContain('status');
      expect(queryStr).toContain('applied_at');
      expect(queryStr).toContain('rolled_back_at');
      expect(queryStr).toContain('UNIQUE');
    });

    it('should propagate client errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Permission denied'));

      await expect(runner.initialize(context)).rejects.toThrow();
    });
  });

  describe('migrate (up)', () => {
    it('should execute migrations in order', async () => {
      // Each migration: BEGIN + SQL + record + COMMIT = multiple queries
      mockClient.query.mockResolvedValue(undefined);

      const results = await runner.migrate(
        [migration1, migration2],
        'up',
        context,
      );

      expect(results).toHaveLength(2);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.id).toBe('001_create_users');
      expect(results[1]?.success).toBe(true);
      expect(results[1]?.id).toBe('002_add_email');
    });

    it('should include duration in results', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const results = await runner.migrate([migration1], 'up', context);

      expect(results[0]?.duration).toBeDefined();
      expect(typeof results[0]?.duration).toBe('number');
    });

    it('should stop on first failure', async () => {
      // First migration: BEGIN succeeds, SQL fails
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Syntax error')) // SQL
        .mockResolvedValueOnce(undefined) // CANCEL
        .mockResolvedValueOnce(undefined); // record error

      const results = await runner.migrate(
        [migration1, migration2],
        'up',
        context,
      );

      // Should only have one result (stopped after failure)
      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(false);
      expect(results[0]?.error).toContain('Syntax error');
    });

    it('should handle empty migration list', async () => {
      const results = await runner.migrate([], 'up', context);
      expect(results).toEqual([]);
    });
  });

  describe('migrate (down)', () => {
    it('should execute down SQL for rollback', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const results = await runner.migrate([migration1], 'down', context);

      expect(results).toHaveLength(1);
      expect(results[0]?.success).toBe(true);

      // Should have called query with the down SQL
      const allQueries = mockClient.query.mock.calls.map((c) => c[0] as string);
      const downQuery = allQueries.find((q) => q.includes('REMOVE TABLE'));
      expect(downQuery).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should return migration history records', async () => {
      const history: MigrationHistory[] = [
        {
          migration_id: '001_create_users',
          name: 'Create users table',
          status: 'applied',
          applied_at: '2025-01-01T00:00:00Z',
        },
      ];
      mockClient.query.mockResolvedValue([{ result: history }]);

      const result = await runner.getHistory(context);

      expect(result).toEqual(history);
      const queryStr = mockClient.query.mock.calls[0]![0] as string;
      expect(queryStr).toContain('SELECT * FROM migration_history');
      expect(queryStr).toContain('ORDER BY applied_at ASC');
    });

    it('should return empty array when no history', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const result = await runner.getHistory(context);
      expect(result).toEqual([]);
    });

    it('should handle missing result', async () => {
      mockClient.query.mockResolvedValue([{}]);

      const result = await runner.getHistory(context);
      expect(result).toEqual([]);
    });
  });

  describe('createPlan', () => {
    it('should plan only unapplied migrations for up direction', async () => {
      // getHistory returns migration1 as applied
      mockClient.query.mockResolvedValue([
        {
          result: [
            {
              migration_id: '001_create_users',
              name: 'Create users table',
              status: 'applied',
            },
          ] satisfies MigrationHistory[],
        },
      ]);

      const plan = await runner.createPlan(
        [migration1, migration2],
        'up',
        context,
      );

      expect(plan.count).toBe(1);
      expect(plan.direction).toBe('up');
      expect(plan.migrations[0]?.id).toBe('002_add_email');
    });

    it('should plan all migrations when none applied (up)', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const plan = await runner.createPlan(
        [migration1, migration2],
        'up',
        context,
      );

      expect(plan.count).toBe(2);
      expect(plan.migrations[0]?.id).toBe('001_create_users');
      expect(plan.migrations[1]?.id).toBe('002_add_email');
    });

    it('should plan applied migrations in reverse for down direction', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: [
            {
              migration_id: '001_create_users',
              name: 'Create users table',
              status: 'applied',
            },
            {
              migration_id: '002_add_email',
              name: 'Add email field',
              status: 'applied',
            },
          ] satisfies MigrationHistory[],
        },
      ]);

      const plan = await runner.createPlan(
        [migration1, migration2],
        'down',
        context,
      );

      expect(plan.count).toBe(2);
      expect(plan.direction).toBe('down');
      // Should be reversed
      expect(plan.migrations[0]?.id).toBe('002_add_email');
      expect(plan.migrations[1]?.id).toBe('001_create_users');
    });

    it('should return empty plan when nothing to do (up, all applied)', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: [
            { migration_id: '001_create_users', name: 'a', status: 'applied' },
            { migration_id: '002_add_email', name: 'b', status: 'applied' },
          ] satisfies MigrationHistory[],
        },
      ]);

      const plan = await runner.createPlan(
        [migration1, migration2],
        'up',
        context,
      );

      expect(plan.count).toBe(0);
      expect(plan.migrations).toEqual([]);
    });

    it('should return empty plan when nothing to rollback (down, none applied)', async () => {
      mockClient.query.mockResolvedValue([{ result: [] }]);

      const plan = await runner.createPlan(
        [migration1, migration2],
        'down',
        context,
      );

      expect(plan.count).toBe(0);
    });

    it('should exclude failed migrations from applied set', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: [
            { migration_id: '001_create_users', name: 'a', status: 'failed' },
          ] satisfies MigrationHistory[],
        },
      ]);

      const plan = await runner.createPlan(
        [migration1, migration2],
        'up',
        context,
      );

      // migration1 failed, so both should be in the plan
      expect(plan.count).toBe(2);
    });
  });
});
