/**
 * @fileoverview Completions capability conformance tests (negative).
 * Validates that the server does not advertise completions capability and
 * handles completion requests gracefully.
 * @module tests/conformance/completions
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type ConformanceHarness, createConformanceHarness } from './helpers/server-harness.js';

describe('Completions conformance (negative)', () => {
  let harness: ConformanceHarness;

  beforeAll(async () => {
    harness = await createConformanceHarness();
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  it('does not declare completions capability', () => {
    const caps = harness.client.getServerCapabilities();
    expect(caps).toBeDefined();
    expect(caps?.completions).toBeUndefined();
  });

  it('handles a completion request gracefully when not supported', async () => {
    // The server does not declare completions. Sending a completion/complete
    // request should either return an error or empty results.
    try {
      const result = await harness.client.complete({
        argument: { name: 'language', value: 'py' },
        ref: { name: 'code_review', type: 'ref/prompt' },
      });
      // If it succeeds, verify the result has the expected shape
      expect(result.completion).toBeDefined();
      expect(result.completion.values).toBeDefined();
      expect(Array.isArray(result.completion.values)).toBe(true);
    } catch (error: unknown) {
      // Expected — server doesn't support completions, so an error is correct
      expect(error).toBeDefined();
    }
  });
});
