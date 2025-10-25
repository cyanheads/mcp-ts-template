/**
 * @fileoverview Test suite for SurrealDB connection manager.
 * @module tests/storage/providers/surrealdb/core/connectionManager.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConnectionManager } from '@/storage/providers/surrealdb/core/connectionManager.js';
import type { SurrealDbConfig } from '@/storage/providers/surrealdb/types.js';
import { requestContextService } from '@/utils/index.js';
import { McpError } from '@/types-global/errors.js';

describe('ConnectionManager', () => {
  let mockClient: {
    connect: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    query: ReturnType<typeof vi.fn>;
  };
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  beforeEach(() => {
    mockClient = {
      connect: vi.fn(),
      close: vi.fn(),
      query: vi.fn(),
    };
    context = requestContextService.createRequestContext({
      operation: 'test-connection-manager',
    });
  });

  describe('Constructor', () => {
    it('should create instance with client and config', () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      expect(manager).toBeInstanceOf(ConnectionManager);
    });

    it('should create instance with client only (no config)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any);

      expect(manager).toBeInstanceOf(ConnectionManager);
    });
  });

  describe('Connection Lifecycle', () => {
    it('should connect successfully with valid config', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.connect).toHaveBeenCalledWith(
        'ws://localhost:8000/rpc',
        {
          namespace: 'test',
          database: 'test',
        },
      );
      expect(manager.isActive()).toBe(true);
    });

    it('should connect with authentication credentials', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
        auth: {
          username: 'admin',
          password: 'password',
        },
      };

      mockClient.connect.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      expect(mockClient.connect).toHaveBeenCalledWith(
        'ws://localhost:8000/rpc',
        {
          namespace: 'test',
          database: 'test',
          auth: {
            username: 'admin',
            password: 'password',
          },
        },
      );
    });

    it('should not reconnect if already connected', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);
      await manager.connect(context); // Second call

      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle pre-connected client (no config)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any);

      await manager.connect(context);

      expect(mockClient.connect).not.toHaveBeenCalled();
      expect(manager.isActive()).toBe(true);
    });

    it('should disconnect gracefully', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);
      mockClient.close.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);
      expect(manager.isActive()).toBe(true);

      await manager.disconnect(context);

      expect(mockClient.close).toHaveBeenCalledTimes(1);
      expect(manager.isActive()).toBe(false);
    });

    it('should do nothing when disconnecting if not connected', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any);

      await manager.disconnect(context);

      expect(mockClient.close).not.toHaveBeenCalled();
    });
  });

  describe('Client Access', () => {
    it('should return client when connected', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      const client = manager.getClient();
      expect(client).toBe(mockClient);
    });

    it('should return client for pre-connected instance', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any);

      const client = manager.getClient();
      expect(client).toBe(mockClient);
    });

    it('should throw error when getting client before connection', () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      expect(() => manager.getClient()).toThrow(McpError);
      expect(() => manager.getClient()).toThrow(
        'SurrealDB connection not established',
      );
    });
  });

  describe('isActive', () => {
    it('should return false initially with config', () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      expect(manager.isActive()).toBe(false);
    });

    it('should return true after successful connection', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      expect(manager.isActive()).toBe(true);
    });

    it('should return false after disconnection', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);
      mockClient.close.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);
      await manager.disconnect(context);

      expect(manager.isActive()).toBe(false);
    });
  });

  describe('Health Checks', () => {
    it('should return healthy status when connection is active', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue([{ result: [{ ping: 1 }] }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      const result = await manager.healthCheck(context);

      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1 as ping');
    });

    it('should return unhealthy status when query fails', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockRejectedValue(new Error('Connection lost'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      const result = await manager.healthCheck(context);

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('Connection lost');
      expect(manager.isActive()).toBe(false);
    });

    it('should cache health check results for 30 seconds', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue([{ result: [{ ping: 1 }] }]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      // First health check
      const result1 = await manager.healthCheck(context);
      expect(result1.healthy).toBe(true);

      // Second health check immediately after
      const result2 = await manager.healthCheck(context);
      expect(result2.healthy).toBe(true);
      expect(result2.responseTime).toBe(0); // Cached result

      // Should only have called query once (first check)
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    it('should update isActive status based on health check', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockRejectedValue(new Error('Network error'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);
      expect(manager.isActive()).toBe(true);

      await manager.healthCheck(context);

      expect(manager.isActive()).toBe(false);
    });

    it('should handle non-Error exceptions in health check', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockRejectedValue('string error');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      const result = await manager.healthCheck(context);

      expect(result.healthy).toBe(false);
      expect(result.error).toBe('string error');
    });
  });

  describe('Error Handling', () => {
    it('should propagate connection errors', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://invalid:9999/rpc',
        namespace: 'test',
        database: 'test',
      };

      const connectionError = new Error('Connection refused');
      mockClient.connect.mockRejectedValue(connectionError);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await expect(manager.connect(context)).rejects.toThrow();
    });

    it('should handle disconnection errors gracefully', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      mockClient.connect.mockResolvedValue(undefined);
      mockClient.close.mockRejectedValue(new Error('Close error'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      await expect(manager.disconnect(context)).rejects.toThrow();
    });
  });

  describe('Configuration variations', () => {
    it('should handle minimal config', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'ns',
        database: 'db',
      };

      mockClient.connect.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      expect(mockClient.connect).toHaveBeenCalledWith(
        'ws://localhost:8000/rpc',
        {
          namespace: 'ns',
          database: 'db',
        },
      );
    });

    it('should handle config with all options', async () => {
      const config: SurrealDbConfig = {
        url: 'wss://remote.surrealdb.com/rpc',
        namespace: 'production',
        database: 'main',
        auth: {
          username: 'root',
          password: 'root',
        },
        timeout: 30000,
      };

      mockClient.connect.mockResolvedValue(undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager = new ConnectionManager(mockClient as any, config);

      await manager.connect(context);

      expect(mockClient.connect).toHaveBeenCalledWith(
        'wss://remote.surrealdb.com/rpc',
        {
          namespace: 'production',
          database: 'main',
          auth: {
            username: 'root',
            password: 'root',
          },
        },
      );
    });

    it('should handle different URL schemes', async () => {
      const schemes = [
        'ws://localhost:8000/rpc',
        'wss://remote.db.com/rpc',
        'http://localhost:8000/rpc',
        'https://remote.db.com/rpc',
      ];

      for (const url of schemes) {
        mockClient.connect.mockClear();
        mockClient.connect.mockResolvedValue(undefined);

        const config: SurrealDbConfig = {
          url,
          namespace: 'test',
          database: 'test',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const manager = new ConnectionManager(mockClient as any, config);

        await manager.connect(context);

        expect(mockClient.connect).toHaveBeenCalledWith(url, expect.anything());
      }
    });
  });
});
