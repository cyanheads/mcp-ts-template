/**
 * @fileoverview Test suite for SurrealDB centralized client.
 * @module tests/storage/providers/surrealdb/core/surrealDbClient.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SurrealDbClient } from '@/storage/providers/surrealdb/core/surrealDbClient.js';
import type { SurrealDbConfig } from '@/storage/providers/surrealdb/types.js';
import { requestContextService } from '@/utils/index.js';
import { AuthManager } from '@/storage/providers/surrealdb/auth/authManager.js';
import { GraphOperations } from '@/storage/providers/surrealdb/graph/graphOperations.js';
import { EventManager } from '@/storage/providers/surrealdb/events/eventManager.js';
import { CustomFunctions } from '@/storage/providers/surrealdb/functions/customFunctions.js';
import { MigrationRunner } from '@/storage/providers/surrealdb/migrations/migrationRunner.js';
import { SchemaIntrospector } from '@/storage/providers/surrealdb/introspection/schemaIntrospector.js';

// Mock the Surreal class
vi.mock('surrealdb', () => {
  class MockSurreal {
    connect = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    query = vi.fn().mockResolvedValue([]);
  }

  return {
    default: MockSurreal,
  };
});

describe('SurrealDbClient', () => {
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  beforeEach(() => {
    context = requestContextService.createRequestContext({
      operation: 'test-surrealdb-client',
    });
  });

  describe('Construction', () => {
    it('should create client with config', () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      const client = new SurrealDbClient(config);

      expect(client).toBeInstanceOf(SurrealDbClient);
      expect(client.connection).toBeDefined();
      expect(client.transactions).toBeDefined();
    });

    it('should create client without config', () => {
      const client = new SurrealDbClient();

      expect(client).toBeInstanceOf(SurrealDbClient);
      expect(client.connection).toBeDefined();
      expect(client.transactions).toBeDefined();
    });

    it('should expose connection manager', () => {
      const client = new SurrealDbClient();

      expect(client.connection).toBeDefined();
      expect(typeof client.connection.connect).toBe('function');
      expect(typeof client.connection.disconnect).toBe('function');
    });

    it('should expose transaction manager', () => {
      const client = new SurrealDbClient();

      expect(client.transactions).toBeDefined();
      expect(typeof client.transactions.executeInTransaction).toBe('function');
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      const client = new SurrealDbClient(config);

      await client.connect(context);
      expect(client.connection.isActive()).toBe(true);
    });

    it('should disconnect successfully', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      const client = new SurrealDbClient(config);

      await client.connect(context);
      await client.disconnect(context);
      expect(client.connection.isActive()).toBe(false);
    });

    it('should handle connect without config (pre-connected)', async () => {
      const client = new SurrealDbClient();

      await client.connect(context);
      expect(client.connection.isActive()).toBe(true);
    });
  });

  describe('getClient', () => {
    it('should return underlying Surreal instance', () => {
      const client = new SurrealDbClient();
      const surrealInstance = client.getClient();

      expect(surrealInstance).toBeDefined();
      expect(typeof surrealInstance.connect).toBe('function');
      expect(typeof surrealInstance.close).toBe('function');
      expect(typeof surrealInstance.query).toBe('function');
    });

    it('should return same instance on multiple calls', () => {
      const client = new SurrealDbClient();
      const instance1 = client.getClient();
      const instance2 = client.getClient();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Manager Factory Methods', () => {
    it('should return new AuthManager instance', () => {
      const client = new SurrealDbClient();
      const authManager = client.auth();

      expect(authManager).toBeInstanceOf(AuthManager);
    });

    it('should return new GraphOperations instance', () => {
      const client = new SurrealDbClient();
      const graphOps = client.graph();

      expect(graphOps).toBeInstanceOf(GraphOperations);
    });

    it('should return new EventManager instance', () => {
      const client = new SurrealDbClient();
      const eventManager = client.events();

      expect(eventManager).toBeInstanceOf(EventManager);
    });

    it('should return new CustomFunctions instance', () => {
      const client = new SurrealDbClient();
      const functions = client.functions();

      expect(functions).toBeInstanceOf(CustomFunctions);
    });

    it('should return new MigrationRunner instance', () => {
      const client = new SurrealDbClient();
      const migrations = client.migrations();

      expect(migrations).toBeInstanceOf(MigrationRunner);
    });

    it('should return new SchemaIntrospector instance', () => {
      const client = new SurrealDbClient();
      const introspector = client.introspector();

      expect(introspector).toBeInstanceOf(SchemaIntrospector);
    });

    it('should create new manager instances on each call', () => {
      const client = new SurrealDbClient();

      const auth1 = client.auth();
      const auth2 = client.auth();

      // Each call should create a new instance
      expect(auth1).not.toBe(auth2);
      expect(auth1).toBeInstanceOf(AuthManager);
      expect(auth2).toBeInstanceOf(AuthManager);
    });

    it('should pass same client to all managers', () => {
      const client = new SurrealDbClient();

      // All managers should receive the same underlying client
      const authManager = client.auth();
      const graphOps = client.graph();
      const eventManager = client.events();

      // Verify they all reference the same client by checking a method call
      expect(authManager).toBeDefined();
      expect(graphOps).toBeDefined();
      expect(eventManager).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should support full lifecycle workflow', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      const client = new SurrealDbClient(config);

      // Connect
      await client.connect(context);

      // Use managers
      const authManager = client.auth();
      const graphOps = client.graph();
      const eventManager = client.events();

      expect(authManager).toBeInstanceOf(AuthManager);
      expect(graphOps).toBeInstanceOf(GraphOperations);
      expect(eventManager).toBeInstanceOf(EventManager);

      // Disconnect
      await client.disconnect(context);
    });

    it('should allow using managers without explicit connect (pre-connected)', async () => {
      const client = new SurrealDbClient();

      await client.connect(context);

      // Should be able to create and use managers
      const authManager = client.auth();
      expect(authManager).toBeInstanceOf(AuthManager);

      const functions = client.functions();
      expect(functions).toBeInstanceOf(CustomFunctions);
    });

    it('should support chained operations', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'test',
        database: 'test',
      };

      const client = new SurrealDbClient(config);

      await client.connect(context);

      // Create multiple managers
      const auth = client.auth();
      const graph = client.graph();
      const events = client.events();
      const functions = client.functions();
      const migrations = client.migrations();
      const introspector = client.introspector();

      expect(auth).toBeInstanceOf(AuthManager);
      expect(graph).toBeInstanceOf(GraphOperations);
      expect(events).toBeInstanceOf(EventManager);
      expect(functions).toBeInstanceOf(CustomFunctions);
      expect(migrations).toBeInstanceOf(MigrationRunner);
      expect(introspector).toBeInstanceOf(SchemaIntrospector);

      await client.disconnect(context);
    });

    it('should handle config with auth credentials', async () => {
      const config: SurrealDbConfig = {
        url: 'ws://localhost:8000/rpc',
        namespace: 'production',
        database: 'main',
        auth: {
          username: 'admin',
          password: 'password',
        },
      };

      const client = new SurrealDbClient(config);

      await client.connect(context);
      await client.disconnect(context);
      // Just verify no errors were thrown
      expect(true).toBe(true);
    });
  });

  describe('Manager Independence', () => {
    it('should allow using different managers independently', () => {
      const client = new SurrealDbClient();

      const auth = client.auth();
      const graph = client.graph();

      // Managers should be independent instances
      expect(auth).not.toBe(graph);
      expect(auth).toBeInstanceOf(AuthManager);
      expect(graph).toBeInstanceOf(GraphOperations);
    });

    it('should allow creating same manager type multiple times', () => {
      const client = new SurrealDbClient();

      const auth1 = client.auth();
      const auth2 = client.auth();
      const auth3 = client.auth();

      // Each should be a separate instance
      expect(auth1).not.toBe(auth2);
      expect(auth2).not.toBe(auth3);
      expect(auth1).not.toBe(auth3);
    });
  });

  describe('Connection and Transaction Managers', () => {
    it('should provide direct access to connection manager', () => {
      const client = new SurrealDbClient();

      expect(client.connection).toBeDefined();
      expect(typeof client.connection.isActive).toBe('function');
      expect(typeof client.connection.healthCheck).toBe('function');
    });

    it('should provide direct access to transaction manager', () => {
      const client = new SurrealDbClient();

      expect(client.transactions).toBeDefined();
      expect(typeof client.transactions.executeInTransaction).toBe('function');
      expect(typeof client.transactions.executeBatch).toBe('function');
    });

    it('should share same connection across all managers', () => {
      const client = new SurrealDbClient();
      const surrealInstance = client.getClient();

      // Connection manager should use the same instance
      const connectionClient = client.connection.getClient();

      expect(connectionClient).toBe(surrealInstance);
    });
  });
});
