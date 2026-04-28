/**
 * @fileoverview Tests for the partial-result schema and runtime helpers.
 * @module tests/utils/formatting/partialResult.test
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  failureEntrySchema,
  partialResult,
  partialResultSchema,
} from '@/utils/formatting/partialResult.js';

describe('failureEntrySchema', () => {
  it('builds an entry with the requested id key, reason, and optional detail', () => {
    const reason = z.enum(['no_oa', 'fetch_failed']);
    const schema = failureEntrySchema({
      idKey: 'pmid',
      idDescription: 'PMID',
      reason,
    });

    const valid = schema.parse({ pmid: '12345', reason: 'no_oa' });
    expect(valid).toEqual({ pmid: '12345', reason: 'no_oa' });

    const withDetail = schema.parse({ pmid: '12345', reason: 'fetch_failed', detail: '404' });
    expect(withDetail.detail).toBe('404');

    expect(() => schema.parse({ pmid: '12345', reason: 'wrong' })).toThrow();
  });

  it('respects the dynamic idKey in the schema shape', () => {
    const schema = failureEntrySchema({
      idKey: 'doi',
      reason: z.enum(['x', 'y']),
    });

    const result = schema.parse({ doi: '10.1/abc', reason: 'x' });
    expect(result.doi).toBe('10.1/abc');

    expect(() => schema.parse({ pmid: '1', reason: 'x' })).toThrow();
  });
});

describe('partialResultSchema', () => {
  const itemSchema = z.object({ id: z.string().describe('Item ID') });
  const reason = z.enum(['not_found', 'withdrawn']);

  it('produces a schema with succeeded array, total, and optional failed', () => {
    const schema = partialResultSchema({
      succeededKey: 'articles',
      succeededSchema: itemSchema,
      failedKey: 'unavailable',
      idKey: 'pmid',
      reason,
    });

    const result = schema.parse({
      articles: [{ id: 'a' }, { id: 'b' }],
      totalSucceeded: 2,
    });
    expect(result).toMatchObject({
      articles: [{ id: 'a' }, { id: 'b' }],
      totalSucceeded: 2,
    });
    expect((result as Record<string, unknown>).unavailable).toBeUndefined();

    const withFailures = schema.parse({
      articles: [{ id: 'a' }],
      totalSucceeded: 1,
      unavailable: [{ pmid: '999', reason: 'not_found' }],
    });
    expect((withFailures as { unavailable: unknown[] }).unavailable).toHaveLength(1);
  });

  it('rejects unknown reason enums', () => {
    const schema = partialResultSchema({
      succeededKey: 'articles',
      succeededSchema: itemSchema,
      failedKey: 'unavailable',
      idKey: 'pmid',
      reason,
    });

    expect(() =>
      schema.parse({
        articles: [],
        totalSucceeded: 0,
        unavailable: [{ pmid: '1', reason: 'bogus' }],
      }),
    ).toThrow();
  });

  it('serializes to JSON Schema for tools/list compatibility', () => {
    const schema = partialResultSchema({
      succeededKey: 'articles',
      succeededSchema: itemSchema,
      failedKey: 'unavailable',
      idKey: 'pmid',
      reason,
    });

    // Sanity check — must be json-schema-serializable (no z.custom, z.transform, etc.)
    const jsonSchema = z.toJSONSchema(schema);
    expect(jsonSchema).toBeDefined();
    expect(jsonSchema).toMatchObject({ type: 'object' });
  });
});

describe('partialResult', () => {
  it('omits the failed key when no failures occurred', () => {
    const result = partialResult({
      succeededKey: 'items',
      succeeded: [{ id: 1 }, { id: 2 }],
      failedKey: 'failed',
      failed: [],
    });
    expect(result).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      totalSucceeded: 2,
    });
    expect(result).not.toHaveProperty('failed');
  });

  it('includes the failed key when failures exist', () => {
    const result = partialResult({
      succeededKey: 'items',
      succeeded: [{ id: 1 }],
      failedKey: 'failed',
      failed: [{ id: 'x', reason: 'bad' }],
    });
    expect(result).toEqual({
      items: [{ id: 1 }],
      totalSucceeded: 1,
      failed: [{ id: 'x', reason: 'bad' }],
    });
  });

  it('always includes totalFailed when includeTotalFailed is true', () => {
    const empty = partialResult({
      succeededKey: 'items',
      succeeded: [],
      failedKey: 'failed',
      failed: [],
      includeTotalFailed: true,
    });
    expect(empty).toMatchObject({ totalSucceeded: 0, totalFailed: 0 });

    const some = partialResult({
      succeededKey: 'items',
      succeeded: [{ id: 1 }],
      failedKey: 'failed',
      failed: [{ id: 'x', reason: 'r' }],
      includeTotalFailed: true,
    });
    expect(some).toMatchObject({ totalSucceeded: 1, totalFailed: 1 });
  });
});
