/**
 * @fileoverview Test suite for SurrealDB query builder utilities.
 * @module tests/storage/providers/surrealdb/core/queryBuilder.test
 */

import { describe, expect, it } from 'vitest';
import {
  WhereBuilder,
  SelectQueryBuilder,
  select,
  where,
} from '@/storage/providers/surrealdb/core/queryBuilder.js';

describe('WhereBuilder', () => {
  describe('equals', () => {
    it('should create equals condition', () => {
      const builder = new WhereBuilder();
      const result = builder.equals('status', 'active').build();

      expect(result.clause).toBe('WHERE status = $where_0');
      expect(result.params.where_0).toBe('active');
    });

    it('should handle numeric values', () => {
      const builder = new WhereBuilder();
      const result = builder.equals('count', 42).build();

      expect(result.clause).toBe('WHERE count = $where_0');
      expect(result.params.where_0).toBe(42);
    });

    it('should handle boolean values', () => {
      const builder = new WhereBuilder();
      const result = builder.equals('active', true).build();

      expect(result.params.where_0).toBe(true);
    });
  });

  describe('greaterThan', () => {
    it('should create greater-than condition', () => {
      const builder = new WhereBuilder();
      const result = builder.greaterThan('age', 18).build();

      expect(result.clause).toBe('WHERE age > $where_0');
      expect(result.params.where_0).toBe(18);
    });

    it('should handle date values', () => {
      const date = new Date('2024-01-01');
      const builder = new WhereBuilder();
      const result = builder.greaterThan('created_at', date).build();

      expect(result.params.where_0).toBe(date);
    });
  });

  describe('in', () => {
    it('should create IN (INSIDE) condition', () => {
      const builder = new WhereBuilder();
      const result = builder.in('status', ['active', 'pending']).build();

      expect(result.clause).toBe('WHERE status INSIDE $where_0');
      expect(result.params.where_0).toEqual(['active', 'pending']);
    });

    it('should handle numeric arrays', () => {
      const builder = new WhereBuilder();
      const result = builder.in('id', [1, 2, 3]).build();

      expect(result.params.where_0).toEqual([1, 2, 3]);
    });

    it('should handle empty arrays', () => {
      const builder = new WhereBuilder();
      const result = builder.in('tags', []).build();

      expect(result.params.where_0).toEqual([]);
    });
  });

  describe('startsWith', () => {
    it('should create starts_with condition', () => {
      const builder = new WhereBuilder();
      const result = builder.startsWith('name', 'John').build();

      expect(result.clause).toBe('WHERE string::starts_with(name, $where_0)');
      expect(result.params.where_0).toBe('John');
    });

    it('should handle prefix with special characters', () => {
      const builder = new WhereBuilder();
      const result = builder.startsWith('key', 'prefix:').build();

      expect(result.params.where_0).toBe('prefix:');
    });
  });

  describe('isNull', () => {
    it('should create IS NONE condition', () => {
      const builder = new WhereBuilder();
      const result = builder.isNull('deleted_at').build();

      expect(result.clause).toBe('WHERE deleted_at IS NONE');
      expect(result.params).toEqual({});
    });
  });

  describe('isNotNull', () => {
    it('should create IS NOT NONE condition', () => {
      const builder = new WhereBuilder();
      const result = builder.isNotNull('created_at').build();

      expect(result.clause).toBe('WHERE created_at IS NOT NONE');
      expect(result.params).toEqual({});
    });
  });

  describe('raw', () => {
    it('should add raw condition without params', () => {
      const builder = new WhereBuilder();
      const result = builder.raw('meta.score > 100').build();

      expect(result.clause).toBe('WHERE meta.score > 100');
      expect(result.params).toEqual({});
    });

    it('should add raw condition with params', () => {
      const builder = new WhereBuilder();
      const result = builder
        .raw('custom_field = $custom', { custom: 'value' })
        .build();

      expect(result.clause).toBe('WHERE custom_field = $custom');
      expect(result.params.custom).toBe('value');
    });
  });

  describe('Chaining conditions', () => {
    it('should combine multiple conditions with AND', () => {
      const builder = new WhereBuilder();
      const result = builder
        .equals('tenant_id', 'abc')
        .equals('status', 'active')
        .greaterThan('score', 50)
        .build();

      expect(result.clause).toBe(
        'WHERE tenant_id = $where_0 AND status = $where_1 AND score > $where_2',
      );
      expect(result.params.where_0).toBe('abc');
      expect(result.params.where_1).toBe('active');
      expect(result.params.where_2).toBe(50);
    });

    it('should handle mix of all condition types', () => {
      const builder = new WhereBuilder();
      const result = builder
        .equals('type', 'user')
        .greaterThan('age', 18)
        .in('role', ['admin', 'moderator'])
        .startsWith('email', 'test')
        .isNotNull('verified_at')
        .build();

      expect(result.clause).toContain('AND');
      expect(Object.keys(result.params)).toHaveLength(4);
    });
  });

  describe('Empty builder', () => {
    it('should return empty clause when no conditions', () => {
      const builder = new WhereBuilder();
      const result = builder.build();

      expect(result.clause).toBe('');
      expect(result.params).toEqual({});
    });
  });

  describe('Parameter naming', () => {
    it('should use sequential parameter names', () => {
      const builder = new WhereBuilder();
      builder.equals('a', 1);
      builder.equals('b', 2);
      builder.equals('c', 3);
      const result = builder.build();

      expect(result.params).toHaveProperty('where_0', 1);
      expect(result.params).toHaveProperty('where_1', 2);
      expect(result.params).toHaveProperty('where_2', 3);
    });
  });
});

describe('SelectQueryBuilder', () => {
  describe('from', () => {
    it('should set table name', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.from('users').build();

      expect(query.query).toContain('FROM type::table($table)');
      expect(query.params.table).toBe('users');
    });
  });

  describe('select', () => {
    it('should select all fields by default', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.from('users').build();

      expect(query.query).toContain('SELECT *');
    });

    it('should select specific fields', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.select('id', 'name', 'email').from('users').build();

      expect(query.query).toContain('SELECT id, name, email');
    });

    it('should handle single field', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.select('count').from('stats').build();

      expect(query.query).toContain('SELECT count');
    });
  });

  describe('where', () => {
    it('should add WHERE clause via callback', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .from('users')
        .where((w) => w.equals('status', 'active'))
        .build();

      expect(query.query).toContain('WHERE status = $where_0');
      expect(query.params.where_0).toBe('active');
    });

    it('should support complex WHERE conditions', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .from('users')
        .where((w) =>
          w
            .equals('tenant_id', 'abc')
            .greaterThan('age', 18)
            .in('role', ['admin', 'user']),
        )
        .build();

      expect(query.query).toContain('WHERE');
      expect(query.query).toContain('AND');
    });
  });

  describe('orderBy', () => {
    it('should add ORDER BY with ASC by default', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.from('users').orderBy('created_at').build();

      expect(query.query).toContain('ORDER BY created_at ASC');
    });

    it('should support DESC ordering', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.from('users').orderBy('created_at', 'DESC').build();

      expect(query.query).toContain('ORDER BY created_at DESC');
    });

    it('should support ASC ordering explicitly', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.from('users').orderBy('name', 'ASC').build();

      expect(query.query).toContain('ORDER BY name ASC');
    });
  });

  describe('limit', () => {
    it('should add LIMIT clause', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.from('users').limit(10).build();

      expect(query.query).toContain('LIMIT 10');
    });

    it('should handle limit of 1', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.from('users').limit(1).build();

      expect(query.query).toContain('LIMIT 1');
    });

    it('should handle large limits', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.from('users').limit(1000).build();

      expect(query.query).toContain('LIMIT 1000');
    });
  });

  describe('withParams', () => {
    it('should add custom parameters', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .from('users')
        .withParams({ customParam: 'value' })
        .build();

      expect(query.params.customParam).toBe('value');
    });

    it('should merge with existing parameters', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .from('users')
        .where((w) => w.equals('status', 'active'))
        .withParams({ extra: 123 })
        .build();

      expect(query.params.where_0).toBe('active');
      expect(query.params.extra).toBe(123);
    });
  });

  describe('build', () => {
    it('should throw error if no table specified', () => {
      const builder = new SelectQueryBuilder();

      expect(() => builder.build()).toThrow('Table name is required');
    });

    it('should build minimal query', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.from('users').build();

      expect(query.query).toBe('SELECT * FROM type::table($table)');
      expect(query.params).toEqual({ table: 'users' });
    });

    it('should build complete query with all clauses', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .select('id', 'name')
        .from('users')
        .where((w) => w.equals('status', 'active'))
        .orderBy('name', 'ASC')
        .limit(10)
        .build();

      expect(query.query).toContain('SELECT id, name');
      expect(query.query).toContain('FROM type::table($table)');
      expect(query.query).toContain('WHERE status = $where_0');
      expect(query.query).toContain('ORDER BY name ASC');
      expect(query.query).toContain('LIMIT 10');
    });
  });

  describe('Fluent chaining', () => {
    it('should support method chaining in any order', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .limit(5)
        .orderBy('created_at', 'DESC')
        .where((w) => w.equals('active', true))
        .select('id', 'name')
        .from('users')
        .build();

      expect(query.query).toContain('SELECT id, name');
      expect(query.query).toContain('FROM type::table($table)');
      expect(query.query).toContain('WHERE');
      expect(query.query).toContain('ORDER BY created_at DESC');
      expect(query.query).toContain('LIMIT 5');
    });

    it('should return this for all builder methods', () => {
      const builder = new SelectQueryBuilder();

      expect(builder.from('test')).toBe(builder);
      expect(builder.select('id')).toBe(builder);
      expect(builder.where(() => {})).toBe(builder);
      expect(builder.orderBy('id')).toBe(builder);
      expect(builder.limit(10)).toBe(builder);
      expect(builder.withParams({})).toBe(builder);
    });
  });

  describe('Complex scenarios', () => {
    it('should build paginated query', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .from('articles')
        .where((w) => w.equals('published', true))
        .orderBy('created_at', 'DESC')
        .limit(20)
        .build();

      expect(query.query).toContain('WHERE published = $where_0');
      expect(query.query).toContain('ORDER BY created_at DESC');
      expect(query.query).toContain('LIMIT 20');
    });

    it('should build filtered query with multiple conditions', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .select('id', 'name', 'email')
        .from('users')
        .where((w) =>
          w
            .equals('tenant_id', 'org-123')
            .in('role', ['admin', 'editor'])
            .isNotNull('verified_at'),
        )
        .build();

      expect(query.params.table).toBe('users');
      expect(query.params.where_0).toBe('org-123');
      expect(query.params.where_1).toEqual(['admin', 'editor']);
    });

    it('should build search query with prefix matching', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .from('kv_store')
        .where((w) =>
          w.equals('tenant_id', 'tenant-a').startsWith('key', 'prefix:'),
        )
        .orderBy('key', 'ASC')
        .limit(100)
        .build();

      expect(query.query).toContain('string::starts_with');
      expect(query.params.where_1).toBe('prefix:');
    });

    it('should handle query without WHERE clause', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .select('*')
        .from('public_data')
        .orderBy('id')
        .limit(50)
        .build();

      expect(query.query).not.toContain('WHERE');
      expect(query.query).toContain('ORDER BY');
      expect(query.query).toContain('LIMIT');
    });

    it('should handle query without ORDER BY', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .from('logs')
        .where((w) => w.greaterThan('timestamp', Date.now()))
        .limit(100)
        .build();

      expect(query.query).toContain('WHERE');
      expect(query.query).not.toContain('ORDER BY');
      expect(query.query).toContain('LIMIT');
    });

    it('should handle query without LIMIT', () => {
      const builder = new SelectQueryBuilder();
      const query = builder
        .from('users')
        .where((w) => w.equals('active', true))
        .orderBy('name')
        .build();

      expect(query.query).toContain('WHERE');
      expect(query.query).toContain('ORDER BY');
      expect(query.query).not.toContain('LIMIT');
    });
  });
});

describe('Helper functions', () => {
  describe('select', () => {
    it('should create SelectQueryBuilder with fields', () => {
      const builder = select('id', 'name');
      const query = builder.from('users').build();

      expect(query.query).toContain('SELECT id, name');
    });

    it('should work without fields (defaults to *)', () => {
      const builder = new SelectQueryBuilder();
      const query = builder.from('users').build();

      expect(query.query).toContain('SELECT *');
    });

    it('should be chainable', () => {
      const query = select('id', 'name')
        .from('users')
        .where((w) => w.equals('active', true))
        .build();

      expect(query.query).toContain('SELECT id, name');
      expect(query.query).toContain('WHERE active = $where_0');
    });
  });

  describe('where', () => {
    it('should create WhereBuilder via callback', () => {
      const whereBuilder = where((w) => w.equals('status', 'active'));
      const result = whereBuilder.build();

      expect(result.clause).toBe('WHERE status = $where_0');
      expect(result.params.where_0).toBe('active');
    });

    it('should support multiple conditions', () => {
      const whereBuilder = where((w) =>
        w.equals('a', 1).equals('b', 2).greaterThan('c', 3),
      );
      const result = whereBuilder.build();

      expect(result.clause).toContain('AND');
      expect(Object.keys(result.params)).toHaveLength(3);
    });
  });
});

describe('Integration scenarios', () => {
  it('should build tenant-scoped query', () => {
    const query = select('*')
      .from('kv_store')
      .where((w) => w.equals('tenant_id', 'tenant-123').equals('key', 'my-key'))
      .build();

    expect(query.query).toContain('SELECT *');
    expect(query.query).toContain('FROM type::table($table)');
    expect(query.query).toContain(
      'WHERE tenant_id = $where_0 AND key = $where_1',
    );
    expect(query.params.table).toBe('kv_store');
    expect(query.params.where_0).toBe('tenant-123');
    expect(query.params.where_1).toBe('my-key');
  });

  it('should build list query with prefix', () => {
    const query = select('key')
      .from('kv_store')
      .where((w) =>
        w
          .equals('tenant_id', 'tenant-a')
          .startsWith('key', 'prefix:')
          .isNotNull('expires_at'),
      )
      .orderBy('key', 'ASC')
      .limit(50)
      .build();

    expect(query.query).toContain('string::starts_with(key, $where_1)');
    expect(query.query).toContain('expires_at IS NOT NONE');
    expect(query.query).toContain('ORDER BY key ASC');
    expect(query.query).toContain('LIMIT 50');
  });

  it('should build admin query without tenant restriction', () => {
    const query = select('id', 'email', 'role')
      .from('users')
      .where((w) => w.in('role', ['admin', 'superadmin']))
      .orderBy('email')
      .build();

    expect(query.query).toContain('role INSIDE $where_0');
    expect(query.params.where_0).toEqual(['admin', 'superadmin']);
  });
});
