/**
 * @fileoverview Integration test for the type-driven error contract end-to-end:
 * `tool()` infers the reason union from the const `errors` tuple, the typed
 * `ctx.fail` works at runtime via `createFail`, and codes flow through correctly.
 * @module tests/unit/mcp-server/tools/typed-error-contract.test
 */

import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { createFail } from '@/core/context.js';
import { tool } from '@/mcp-server/tools/utils/toolDefinition.js';
import { JsonRpcErrorCode } from '@/types-global/errors.js';

describe('tool() with typed error contract', () => {
  it('infers the reason union from the const tuple', () => {
    const myTool = tool('demo', {
      description: 'demo',
      input: z.object({ q: z.string().describe('q') }),
      output: z.object({ r: z.string().describe('r') }),
      errors: [
        {
          reason: 'no_match',
          code: JsonRpcErrorCode.NotFound,
          when: 'No match',
          recovery: 'Broaden the query and try again with looser filters.',
        },
        {
          reason: 'queue_full',
          code: JsonRpcErrorCode.RateLimited,
          when: 'Full',
          recovery: 'Wait a few seconds before retrying.',
        },
      ],
      async handler(_input, ctx) {
        // ctx.fail typed against 'no_match' | 'queue_full'
        expectTypeOf(ctx.fail).parameter(0).toEqualTypeOf<'no_match' | 'queue_full'>();
        // @ts-expect-error — 'typo' is not in the contract
        ctx.fail('typo');
        return { r: 'ok' };
      },
    });

    expect(myTool.name).toBe('demo');
    expect(myTool.errors).toHaveLength(2);
  });

  it('omits fail from ctx when no contract is declared', () => {
    const myTool = tool('demo', {
      description: 'demo',
      input: z.object({ q: z.string().describe('q') }),
      output: z.object({ r: z.string().describe('r') }),
      async handler(_input, ctx) {
        // ctx is plain Context — no fail method
        expectTypeOf(ctx).not.toHaveProperty('fail');
        return { r: 'ok' };
      },
    });
    expect(myTool.errors).toBeUndefined();
  });

  it('runs end-to-end: handler throws via ctx.fail, error has contract code + reason', async () => {
    const myTool = tool('demo', {
      description: 'demo',
      input: z.object({ q: z.string().describe('q') }),
      output: z.object({ r: z.string().describe('r') }),
      errors: [
        {
          reason: 'always_fail',
          code: JsonRpcErrorCode.NotFound,
          when: 'Always fails',
          recovery: 'This test always fails by design.',
        },
      ],
      async handler(_input, ctx) {
        throw ctx.fail('always_fail', 'demo failure', { extra: 'context' });
      },
    });

    // Simulate what the handler factory does at runtime
    const fail = createFail(myTool.errors!);
    const ctx = { fail } as never;
    let caught: unknown;
    try {
      await myTool.handler({ q: 'x' }, ctx);
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: JsonRpcErrorCode.NotFound,
      message: 'demo failure',
      data: { reason: 'always_fail', extra: 'context' },
    });
  });
});
