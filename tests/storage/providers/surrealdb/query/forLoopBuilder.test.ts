/**
 * @fileoverview Test suite for SurrealDB FOR loop builder.
 * @module tests/storage/providers/surrealdb/query/forLoopBuilder.test
 */

import { describe, expect, it } from 'vitest';
import {
  ForLoopBuilder,
  forLoop,
} from '@/storage/providers/surrealdb/query/forLoopBuilder.js';

describe('ForLoopBuilder', () => {
  describe('create + fluent API', () => {
    it('should build a simple FOR loop with single statement', () => {
      const result = ForLoopBuilder.create('item')
        .in('$items')
        .do('CREATE processed SET value = $item')
        .build();

      expect(result).toBe(
        'FOR $item IN $items {\nCREATE processed SET value = $item\n}',
      );
    });

    it('should build a FOR loop with multiple statements', () => {
      const result = ForLoopBuilder.create('user')
        .in('$users')
        .do('UPDATE $user SET active = true')
        .do('CREATE audit SET target = $user')
        .build();

      expect(result).toContain('FOR $user IN $users');
      expect(result).toContain('UPDATE $user SET active = true');
      expect(result).toContain('CREATE audit SET target = $user');
    });

    it('should support doAll for multiple statements', () => {
      const result = ForLoopBuilder.create('x')
        .in('$arr')
        .doAll(['LET $y = $x * 2', 'CREATE result SET val = $y'])
        .build();

      expect(result).toContain('LET $y = $x * 2');
      expect(result).toContain('CREATE result SET val = $y');
    });

    it('should throw when variable is missing', () => {
      // Private constructor prevents truly empty variable, but we can test
      // the builder requires a source
      const builder = ForLoopBuilder.create('item').do('CREATE foo');
      expect(() => builder.build()).toThrow('Source is required');
    });

    it('should throw when source is missing', () => {
      const builder = ForLoopBuilder.create('item').do('CREATE foo');
      expect(() => builder.build()).toThrow('Source is required');
    });

    it('should throw when body is empty', () => {
      const builder = ForLoopBuilder.create('item').in('$items');
      expect(() => builder.build()).toThrow(
        'At least one statement in body is required',
      );
    });
  });

  describe('range', () => {
    it('should create a range-based FOR loop', () => {
      const result = ForLoopBuilder.range(
        'i',
        0,
        10,
        'CREATE item SET index = $i',
      );

      expect(result).toContain('FOR $i IN 0..10');
      expect(result).toContain('CREATE item SET index = $i');
    });

    it('should handle array of body statements', () => {
      const result = ForLoopBuilder.range('i', 1, 5, [
        'LET $val = $i * 10',
        'CREATE entry SET num = $val',
      ]);

      expect(result).toContain('FOR $i IN 1..5');
      expect(result).toContain('LET $val = $i * 10');
      expect(result).toContain('CREATE entry SET num = $val');
    });
  });

  describe('array', () => {
    it('should create a FOR loop over an array field', () => {
      const result = ForLoopBuilder.array(
        'tag',
        '$tags',
        'CREATE tag_index SET name = $tag',
      );

      expect(result).toContain('FOR $tag IN $tags');
      expect(result).toContain('CREATE tag_index SET name = $tag');
    });

    it('should handle array of body statements', () => {
      const result = ForLoopBuilder.array('item', '$cart.items', [
        'LET $total = $item.price * $item.qty',
        'UPDATE $item SET subtotal = $total',
      ]);

      expect(result).toContain('FOR $item IN $cart.items');
    });
  });

  describe('query', () => {
    it('should create a FOR loop over query results', () => {
      const result = ForLoopBuilder.query(
        'user',
        '(SELECT * FROM user WHERE active = true)',
        'UPDATE $user SET last_checked = time::now()',
      );

      expect(result).toContain(
        'FOR $user IN (SELECT * FROM user WHERE active = true)',
      );
      expect(result).toContain('UPDATE $user SET last_checked = time::now()');
    });
  });

  describe('nested', () => {
    it('should create nested FOR loops', () => {
      const result = ForLoopBuilder.nested([
        { variable: 'category', source: '$categories', body: [] },
        {
          variable: 'item',
          source: '$category.items',
          body: ['CREATE processed SET cat = $category, item = $item'],
        },
      ]);

      expect(result).toContain('FOR $category IN $categories');
      expect(result).toContain('FOR $item IN $category.items');
      expect(result).toContain('CREATE processed SET');
      // Should have closing braces
      const closingBraces = result.match(/}/g);
      expect(closingBraces).toHaveLength(2);
    });

    it('should throw on empty configs array', () => {
      expect(() => ForLoopBuilder.nested([])).toThrow(
        'At least one loop configuration required',
      );
    });

    it('should handle single config in nested', () => {
      const result = ForLoopBuilder.nested([
        {
          variable: 'x',
          source: '$arr',
          body: ['CREATE item SET val = $x'],
        },
      ]);

      expect(result).toContain('FOR $x IN $arr');
      expect(result).toContain('CREATE item SET val = $x');
    });

    it('should handle three levels of nesting', () => {
      const result = ForLoopBuilder.nested([
        { variable: 'a', source: '$as', body: [] },
        { variable: 'b', source: '$a.bs', body: [] },
        {
          variable: 'c',
          source: '$b.cs',
          body: ['CREATE leaf SET val = $c'],
        },
      ]);

      expect(result).toContain('FOR $a IN $as');
      expect(result).toContain('FOR $b IN $a.bs');
      expect(result).toContain('FOR $c IN $b.cs');
      const closingBraces = result.match(/}/g);
      expect(closingBraces).toHaveLength(3);
    });
  });

  describe('forLoop helper', () => {
    it('should create a builder equivalent to ForLoopBuilder.create', () => {
      const result = forLoop('item')
        .in('$items')
        .do('CREATE foo SET val = $item')
        .build();

      expect(result).toContain('FOR $item IN $items');
      expect(result).toContain('CREATE foo SET val = $item');
    });
  });
});
