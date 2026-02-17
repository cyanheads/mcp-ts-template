/**
 * @fileoverview Test suite for SurrealDB subquery builder.
 * @module tests/storage/providers/surrealdb/query/subqueryBuilder.test
 */

import { describe, expect, it } from 'vitest';
import {
  SubqueryBuilder,
  subquery,
} from '@/storage/providers/surrealdb/query/subqueryBuilder.js';

describe('SubqueryBuilder', () => {
  describe('buildSubquery', () => {
    it('should wrap query in parentheses by default', () => {
      const sq = new SubqueryBuilder();
      sq.select('id').from('user');
      const result = sq.buildSubquery();

      expect(result).toMatch(/^\(SELECT id FROM/);
      expect(result).toMatch(/\)$/);
    });

    it('should add alias when provided', () => {
      const sq = new SubqueryBuilder();
      sq.select('count()').from('post');
      const result = sq.buildSubquery({ alias: 'post_count' });

      expect(result).toContain(') as post_count');
    });

    it('should skip wrapping when wrapped is false', () => {
      const sq = new SubqueryBuilder();
      sq.select('*').from('user');
      const result = sq.buildSubquery({ wrapped: false });

      expect(result).not.toMatch(/^\(/);
    });
  });

  describe('withParentAlias', () => {
    it('should return this for chaining (reserved for future use)', () => {
      const sq = new SubqueryBuilder();
      const result = sq.withParentAlias('parent');
      expect(result).toBe(sq);
    });
  });

  describe('static where', () => {
    it('should create a wrapped subquery for WHERE clauses', () => {
      const result = SubqueryBuilder.where((sq) =>
        sq
          .select('id')
          .from('post')
          .where((w) => w.equals('author', 'user:alice')),
      );

      expect(result).toMatch(/^\(SELECT id FROM/);
      expect(result).toContain('WHERE author = $where_0');
      expect(result).toMatch(/\)$/);
    });
  });

  describe('static field', () => {
    it('should create a subquery with alias for computed fields', () => {
      const result = SubqueryBuilder.field(
        (sq) => sq.select('count()').from('post'),
        'post_count',
      );

      expect(result).toMatch(/^\(SELECT count\(\) FROM/);
      expect(result).toContain(') as post_count');
    });
  });

  describe('static exists', () => {
    it('should create an EXISTS subquery', () => {
      const result = SubqueryBuilder.exists((sq) =>
        sq
          .select('*')
          .from('post')
          .where((w) => w.raw('author = parent.id')),
      );

      expect(result).toMatch(/^EXISTS \(SELECT/);
      expect(result).toContain('author = parent.id');
    });
  });

  describe('static in', () => {
    it('should create a field IN subquery', () => {
      const result = SubqueryBuilder.in('id', (sq) =>
        sq
          .select('out')
          .from('follows')
          .where((w) => w.equals('in', 'user:alice')),
      );

      expect(result).toMatch(/^id IN \(SELECT out FROM/);
    });
  });

  describe('static notIn', () => {
    it('should create a field NOT IN subquery', () => {
      const result = SubqueryBuilder.notIn('id', (sq) =>
        sq.select('target').from('blocked'),
      );

      expect(result).toMatch(/^id NOT IN \(SELECT target FROM/);
    });
  });

  describe('static arrayAccess', () => {
    it('should create a subquery with array index access', () => {
      const result = SubqueryBuilder.arrayAccess(
        (sq) =>
          sq.select('*').from('post').orderBy('created_at', 'DESC').limit(1),
        0,
      );

      expect(result).toMatch(/\)\[0\]$/);
      expect(result).toContain('ORDER BY created_at DESC');
      expect(result).toContain('LIMIT 1');
    });

    it('should default to index 0', () => {
      const result = SubqueryBuilder.arrayAccess((sq) =>
        sq.select('*').from('item'),
      );

      expect(result).toMatch(/\)\[0\]$/);
    });

    it('should support non-zero index', () => {
      const result = SubqueryBuilder.arrayAccess(
        (sq) => sq.select('*').from('item'),
        2,
      );

      expect(result).toMatch(/\)\[2\]$/);
    });
  });

  describe('subquery helper', () => {
    it('should create a new SubqueryBuilder instance', () => {
      const sq = subquery();
      expect(sq).toBeInstanceOf(SubqueryBuilder);
    });

    it('should be usable for building subqueries', () => {
      const sq = subquery();
      sq.select('name').from('user').limit(5);
      const result = sq.buildSubquery();

      expect(result).toContain('SELECT name FROM');
      expect(result).toContain('LIMIT 5');
    });
  });
});
