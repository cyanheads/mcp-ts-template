/**
 * @fileoverview Test suite for SurrealDB transaction manager.
 * @module tests/storage/providers/surrealdb/core/transactionManager.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TransactionManager } from '@/storage/providers/surrealdb/core/transactionManager.js';
import { requestContextService } from '@/utils/index.js';

describe('TransactionManager', () => {
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
  };
  let transactionManager: TransactionManager;
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactionManager = new TransactionManager(mockClient as any);
    context = requestContextService.createRequestContext({
      operation: 'test-transaction-manager',
    });
  });

  describe('executeInTransaction', () => {
    it('should execute callback and commit on success', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const callback = vi.fn().mockResolvedValue('success');

      const result = await transactionManager.executeInTransaction(
        callback,
        context,
      );

      expect(result).toBe('success');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT TRANSACTION');
      expect(callback).toHaveBeenCalledWith(mockClient);
    });

    it('should cancel transaction on callback error', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const testError = new Error('Callback failed');
      const callback = vi.fn().mockRejectedValue(testError);

      await expect(
        transactionManager.executeInTransaction(callback, context),
      ).rejects.toThrow('Callback failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockClient.query).toHaveBeenCalledWith('CANCEL TRANSACTION');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT TRANSACTION');
    });

    it('should handle multiple operations in transaction', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const callback = vi.fn().mockImplementation(async (client) => {
        await client.query(
          'UPDATE account SET balance -= 100 WHERE id = $from',
          {
            from: 'alice',
          },
        );
        await client.query('UPDATE account SET balance += 100 WHERE id = $to', {
          to: 'bob',
        });
        return 'transfer complete';
      });

      const result = await transactionManager.executeInTransaction(
        callback,
        context,
      );

      expect(result).toBe('transfer complete');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT TRANSACTION');
      expect(callback).toHaveBeenCalledWith(mockClient);
    });

    it('should respect timeout option', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const callback = vi.fn().mockImplementation(async () => {
        // Simulate long operation
        await new Promise((resolve) => setTimeout(resolve, 200));
        return 'completed';
      });

      await expect(
        transactionManager.executeInTransaction(callback, context, {
          timeout: 50,
        }),
      ).rejects.toThrow('Transaction timeout after 50ms');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockClient.query).toHaveBeenCalledWith('CANCEL TRANSACTION');
    }, 10000); // Increase test timeout

    it('should not timeout when no timeout specified', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const callback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'completed';
      });

      const result = await transactionManager.executeInTransaction(
        callback,
        context,
      );

      expect(result).toBe('completed');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT TRANSACTION');
    }, 10000);

    it('should handle callback returning different types', async () => {
      mockClient.query.mockResolvedValue(undefined);

      // Number
      const numCallback = vi.fn().mockResolvedValue(42);
      const numResult = await transactionManager.executeInTransaction(
        numCallback,
        context,
      );
      expect(numResult).toBe(42);

      // Object
      const objCallback = vi.fn().mockResolvedValue({ id: 1, name: 'test' });
      const objResult = await transactionManager.executeInTransaction(
        objCallback,
        context,
      );
      expect(objResult).toEqual({ id: 1, name: 'test' });

      // Array
      const arrCallback = vi.fn().mockResolvedValue([1, 2, 3]);
      const arrResult = await transactionManager.executeInTransaction(
        arrCallback,
        context,
      );
      expect(arrResult).toEqual([1, 2, 3]);

      // Boolean
      const boolCallback = vi.fn().mockResolvedValue(true);
      const boolResult = await transactionManager.executeInTransaction(
        boolCallback,
        context,
      );
      expect(boolResult).toBe(true);
    });

    it('should handle nested errors properly', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const nestedError = new Error('Database constraint violation');
      const callback = vi.fn().mockImplementation(async (client) => {
        await client.query('INSERT INTO users ...');
        throw nestedError;
      });

      await expect(
        transactionManager.executeInTransaction(callback, context),
      ).rejects.toThrow('Database constraint violation');

      expect(mockClient.query).toHaveBeenCalledWith('CANCEL TRANSACTION');
    });

    it('should handle transaction BEGIN failure', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Connection lost'));

      const callback = vi.fn();

      await expect(
        transactionManager.executeInTransaction(callback, context),
      ).rejects.toThrow();

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle transaction COMMIT failure', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Commit failed')); // COMMIT

      const callback = vi.fn().mockResolvedValue('result');

      await expect(
        transactionManager.executeInTransaction(callback, context),
      ).rejects.toThrow();
    });
  });

  describe('executeBatch', () => {
    it('should execute multiple queries successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce([{ result: { id: 1 } }]) // Query 1
        .mockResolvedValueOnce([{ result: { id: 2 } }]) // Query 2
        .mockResolvedValueOnce([{ result: { id: 3 } }]) // Query 3
        .mockResolvedValueOnce(undefined); // COMMIT

      const queries = [
        {
          query: 'INSERT INTO users SET name = $name',
          params: { name: 'Alice' },
        },
        {
          query: 'INSERT INTO users SET name = $name',
          params: { name: 'Bob' },
        },
        {
          query: 'INSERT INTO users SET name = $name',
          params: { name: 'Charlie' },
        },
      ];

      const results = await transactionManager.executeBatch(queries, context);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ id: 1 });
      expect(results[1]).toEqual({ id: 2 });
      expect(results[2]).toEqual({ id: 3 });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT TRANSACTION');
    });

    it('should execute queries with parameters', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce([{ result: 'updated' }])
        .mockResolvedValueOnce(undefined); // COMMIT

      const queries = [
        {
          query: 'UPDATE users SET status = $status WHERE id = $id',
          params: { status: 'active', id: 1 },
        },
      ];

      const results = await transactionManager.executeBatch(queries, context);

      expect(results).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET status = $status WHERE id = $id',
        { status: 'active', id: 1 },
      );
    });

    it('should handle queries without parameters', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce([{ result: 'done' }])
        .mockResolvedValueOnce(undefined); // COMMIT

      const queries = [{ query: 'SELECT * FROM users' }];

      const results = await transactionManager.executeBatch(queries, context);

      expect(results).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users', {});
    });

    it('should handle empty query array', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined); // COMMIT

      const results = await transactionManager.executeBatch([], context);

      expect(results).toEqual([]);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT TRANSACTION');
    });

    it('should cancel transaction on query failure', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce([{ result: 'ok' }]) // Query 1
        .mockRejectedValueOnce(new Error('Query failed')) // Query 2 fails
        .mockResolvedValueOnce(undefined); // CANCEL

      const queries = [
        {
          query: 'INSERT INTO users SET name = $name',
          params: { name: 'Alice' },
        },
        { query: 'INSERT INTO users SET invalid', params: {} }, // This will fail
      ];

      await expect(
        transactionManager.executeBatch(queries, context),
      ).rejects.toThrow('Query failed');

      expect(mockClient.query).toHaveBeenCalledWith('CANCEL TRANSACTION');
    });

    it('should return results in correct order', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce([{ result: 'first' }])
        .mockResolvedValueOnce([{ result: 'second' }])
        .mockResolvedValueOnce([{ result: 'third' }])
        .mockResolvedValueOnce(undefined); // COMMIT

      const queries = [
        { query: 'SELECT 1' },
        { query: 'SELECT 2' },
        { query: 'SELECT 3' },
      ];

      const results = await transactionManager.executeBatch(queries, context);

      expect(results[0]).toBe('first');
      expect(results[1]).toBe('second');
      expect(results[2]).toBe('third');
    });

    it('should handle mixed query types', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce([{ result: { id: 1 } }]) // INSERT
        .mockResolvedValueOnce([{ result: { updated: true } }]) // UPDATE
        .mockResolvedValueOnce([{ result: [{ id: 1 }] }]) // SELECT
        .mockResolvedValueOnce([{ result: { deleted: true } }]) // DELETE
        .mockResolvedValueOnce(undefined); // COMMIT

      const queries = [
        {
          query: 'INSERT INTO users SET name = $name',
          params: { name: 'Test' },
        },
        {
          query: 'UPDATE users SET active = true WHERE id = $id',
          params: { id: 1 },
        },
        { query: 'SELECT * FROM users WHERE id = $id', params: { id: 1 } },
        { query: 'DELETE users WHERE id = $id', params: { id: 999 } },
      ];

      const results = await transactionManager.executeBatch(queries, context);

      expect(results).toHaveLength(4);
      expect(results[0]).toEqual({ id: 1 });
      expect(results[1]).toEqual({ updated: true });
      expect(results[2]).toEqual([{ id: 1 }]);
      expect(results[3]).toEqual({ deleted: true });
    });
  });

  describe('Timeout handling', () => {
    it('should handle timeout with value specified', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const slowCallback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return 'too slow';
      });

      await expect(
        transactionManager.executeInTransaction(slowCallback, context, {
          timeout: 100,
        }),
      ).rejects.toThrow('Transaction timeout after 100ms');
    }, 10000);

    it('should complete fast operations before timeout', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const fastCallback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'fast enough';
      });

      const result = await transactionManager.executeInTransaction(
        fastCallback,
        context,
        { timeout: 200 },
      );

      expect(result).toBe('fast enough');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT TRANSACTION');
    }, 10000);

    it('should handle no timeout (never times out)', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const callback = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'completed';
      });

      const result = await transactionManager.executeInTransaction(
        callback,
        context,
        {}, // No timeout specified
      );

      expect(result).toBe('completed');
    }, 10000);
  });

  describe('Error propagation', () => {
    it('should propagate transaction errors correctly', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const callback = vi
        .fn()
        .mockRejectedValue(new Error('Transaction error'));

      await expect(
        transactionManager.executeInTransaction(callback, context),
      ).rejects.toThrow('Transaction error');
    });

    it('should handle non-Error exceptions', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const callback = vi.fn().mockRejectedValue('string error');

      // ErrorHandler.tryCatch wraps the string error in an McpError
      await expect(
        transactionManager.executeInTransaction(callback, context),
      ).rejects.toThrow();
    });

    it('should handle callback throwing synchronously', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const callback = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });

      await expect(
        transactionManager.executeInTransaction(callback, context),
      ).rejects.toThrow('Sync error');

      expect(mockClient.query).toHaveBeenCalledWith('CANCEL TRANSACTION');
    });
  });

  describe('Transaction isolation', () => {
    it('should support concurrent transactions', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const callback1 = vi.fn().mockResolvedValue('tx1');
      const callback2 = vi.fn().mockResolvedValue('tx2');

      const [result1, result2] = await Promise.all([
        transactionManager.executeInTransaction(callback1, context),
        transactionManager.executeInTransaction(callback2, context),
      ]);

      expect(result1).toBe('tx1');
      expect(result2).toBe('tx2');
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should handle one transaction failing while others succeed', async () => {
      mockClient.query.mockResolvedValue(undefined);

      const successCallback = vi.fn().mockResolvedValue('success');
      const failCallback = vi.fn().mockRejectedValue(new Error('Failed'));

      const results = await Promise.allSettled([
        transactionManager.executeInTransaction(successCallback, context),
        transactionManager.executeInTransaction(failCallback, context),
      ]);

      expect(results[0]?.status).toBe('fulfilled');
      expect(results[1]?.status).toBe('rejected');
    });
  });
});
