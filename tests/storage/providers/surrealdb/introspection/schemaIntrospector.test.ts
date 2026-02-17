/**
 * @fileoverview Test suite for SurrealDB schema introspector.
 * @module tests/storage/providers/surrealdb/introspection/schemaIntrospector.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SchemaIntrospector } from '@/storage/providers/surrealdb/introspection/schemaIntrospector.js';
import { requestContextService } from '@/utils/index.js';

describe('SchemaIntrospector', () => {
  let mockClient: { query: ReturnType<typeof vi.fn> };
  let inspector: SchemaIntrospector;
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  beforeEach(() => {
    mockClient = { query: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inspector = new SchemaIntrospector(mockClient as any);
    context = requestContextService.createRequestContext({
      operation: 'test',
    });
  });

  describe('getTableInfo', () => {
    it('should return table info with fields, indexes, and events', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            fields: {
              name: 'string',
              email: 'string',
              age: 'option<int>',
            },
            indexes: {
              idx_email: 'DEFINE INDEX idx_email ON user COLUMNS email UNIQUE',
              idx_name: 'DEFINE INDEX idx_name ON user COLUMNS name',
            },
            events: {
              on_update: 'DEFINE EVENT on_update ON user ...',
            },
          },
        },
      ]);

      const result = await inspector.getTableInfo('user', context);

      expect(result.name).toBe('user');
      expect(result.schemafull).toBe(true);
      expect(result.fields).toHaveLength(3);
      expect(result.indexes).toHaveLength(2);
      expect(result.events).toHaveLength(1);
    });

    it('should detect required vs optional fields', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            fields: {
              name: 'string',
              bio: 'option<string>',
            },
            indexes: {},
            events: {},
          },
        },
      ]);

      const result = await inspector.getTableInfo('user', context);

      const nameField = result.fields.find((f) => f.name === 'name');
      const bioField = result.fields.find((f) => f.name === 'bio');

      expect(nameField?.required).toBe(true);
      expect(bioField?.required).toBe(false);
    });

    it('should detect unique indexes', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            fields: {},
            indexes: {
              idx_email: 'DEFINE INDEX idx_email ON user COLUMNS email UNIQUE',
              idx_created:
                'DEFINE INDEX idx_created ON user COLUMNS created_at',
            },
            events: {},
          },
        },
      ]);

      const result = await inspector.getTableInfo('user', context);

      const emailIdx = result.indexes.find((i) => i.name === 'idx_email');
      const createdIdx = result.indexes.find((i) => i.name === 'idx_created');

      expect(emailIdx?.unique).toBe(true);
      expect(createdIdx?.unique).toBe(false);
    });

    it('should handle empty table info', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            fields: {},
            indexes: {},
            events: {},
          },
        },
      ]);

      const result = await inspector.getTableInfo('empty_table', context);

      expect(result.name).toBe('empty_table');
      expect(result.fields).toEqual([]);
      expect(result.indexes).toEqual([]);
      expect(result.events).toEqual([]);
    });

    it('should handle missing result sections gracefully', async () => {
      mockClient.query.mockResolvedValue([{ result: {} }]);

      const result = await inspector.getTableInfo('user', context);

      expect(result.fields).toEqual([]);
      expect(result.indexes).toEqual([]);
      expect(result.events).toEqual([]);
    });
  });

  describe('getDatabaseSchema', () => {
    it('should return full database schema', async () => {
      // First call: INFO FOR DATABASE
      mockClient.query
        .mockResolvedValueOnce([
          {
            result: {
              tables: {
                user: 'DEFINE TABLE user ...',
                post: 'DEFINE TABLE post ...',
              },
              functions: { 'fn::validate': 'DEFINE FUNCTION fn::validate ...' },
              accesses: { admin: 'DEFINE ACCESS admin ...' },
            },
          },
        ])
        // Second call: INFO FOR TABLE user
        .mockResolvedValueOnce([
          { result: { fields: { name: 'string' }, indexes: {}, events: {} } },
        ])
        // Third call: INFO FOR TABLE post
        .mockResolvedValueOnce([
          { result: { fields: { title: 'string' }, indexes: {}, events: {} } },
        ]);

      const result = await inspector.getDatabaseSchema(context);

      expect(result.tables).toHaveLength(2);
      expect(result.functions).toEqual(['fn::validate']);
      expect(result.accessMethods).toEqual(['admin']);
      expect(result.tables[0]?.name).toBe('user');
      expect(result.tables[1]?.name).toBe('post');
    });

    it('should handle empty database', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            tables: {},
            functions: {},
            accesses: {},
          },
        },
      ]);

      const result = await inspector.getDatabaseSchema(context);

      expect(result.tables).toEqual([]);
      expect(result.functions).toEqual([]);
      expect(result.accessMethods).toEqual([]);
    });

    it('should handle missing INFO sections', async () => {
      mockClient.query.mockResolvedValue([{ result: {} }]);

      const result = await inspector.getDatabaseSchema(context);

      expect(result.tables).toEqual([]);
      expect(result.functions).toEqual([]);
      expect(result.accessMethods).toEqual([]);
    });
  });

  describe('listTables', () => {
    it('should return table names', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            tables: { user: '...', post: '...', comment: '...' },
          },
        },
      ]);

      const result = await inspector.listTables(context);

      expect(result).toEqual(['user', 'post', 'comment']);
    });

    it('should return empty array when no tables', async () => {
      mockClient.query.mockResolvedValue([{ result: { tables: {} } }]);

      const result = await inspector.listTables(context);
      expect(result).toEqual([]);
    });

    it('should handle missing tables key', async () => {
      mockClient.query.mockResolvedValue([{ result: {} }]);

      const result = await inspector.listTables(context);
      expect(result).toEqual([]);
    });
  });

  describe('listFunctions', () => {
    it('should return function names', async () => {
      mockClient.query.mockResolvedValue([
        {
          result: {
            functions: { 'fn::validate': '...', 'fn::transform': '...' },
          },
        },
      ]);

      const result = await inspector.listFunctions(context);

      expect(result).toEqual(['fn::validate', 'fn::transform']);
    });

    it('should return empty array when no functions', async () => {
      mockClient.query.mockResolvedValue([{ result: { functions: {} } }]);

      const result = await inspector.listFunctions(context);
      expect(result).toEqual([]);
    });

    it('should handle missing functions key', async () => {
      mockClient.query.mockResolvedValue([{ result: {} }]);

      const result = await inspector.listFunctions(context);
      expect(result).toEqual([]);
    });
  });
});
