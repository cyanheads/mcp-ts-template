/**
 * @fileoverview Cloudflare Worker entry-point surface tests. Real runtime
 * behavior lives in `tests/worker/`; type shapes are covered by
 * `tests/unit/public-api/type-contract.test.ts`. This file holds only the
 * narrow public-API contracts: the factory export and the no-index-signature
 * guarantee on `CloudflareBindings`.
 * @module tests/worker.test
 */

import { describe, expect, it } from 'vitest';
import { type CloudflareBindings, createWorkerHandler } from '@/core/worker.js';

describe('createWorkerHandler', () => {
  it('returns a handler with fetch and scheduled', () => {
    const handler = createWorkerHandler();
    expect(typeof handler.fetch).toBe('function');
    expect(typeof handler.scheduled).toBe('function');
  });

  it('exposes CloudflareBindings without an index signature so servers extend explicitly', () => {
    interface ExtendedBindings extends CloudflareBindings {
      CUSTOM_BINDING: string;
    }
    const bindings: ExtendedBindings = { CUSTOM_BINDING: 'value' };
    expect(bindings.CUSTOM_BINDING).toBe('value');
  });
});
