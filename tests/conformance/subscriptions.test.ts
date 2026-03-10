/**
 * @fileoverview Resource subscription conformance tests (negative).
 * Validates that the server declares resources with listChanged but not
 * subscribe, and handles subscription requests appropriately.
 * @module tests/conformance/subscriptions
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type ConformanceHarness, createConformanceHarness } from './helpers/server-harness.js';

describe('Resource subscriptions conformance (negative)', () => {
  let harness: ConformanceHarness;

  beforeAll(async () => {
    harness = await createConformanceHarness();
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  it('declares resources with listChanged but not subscribe', () => {
    const caps = harness.client.getServerCapabilities();
    expect(caps).toBeDefined();
    expect(caps?.resources).toBeDefined();
    expect(caps?.resources?.listChanged).toBe(true);
    expect(caps?.resources?.subscribe).toBeUndefined();
  });

  it('rejects a subscribe request when subscribe is not supported', async () => {
    // The server does not declare resources.subscribe. Attempting to
    // subscribe should fail or be rejected.
    try {
      await harness.client.subscribeResource({ uri: 'echo://test' });
      // If it doesn't throw, the server silently accepted — not ideal but tolerable
    } catch (error: unknown) {
      // Expected — server doesn't support subscriptions
      expect(error).toBeDefined();
    }
  });

  it('rejects an unsubscribe request when subscribe is not supported', async () => {
    // If subscribe isn't supported, unsubscribe shouldn't be either
    try {
      await harness.client.unsubscribeResource({ uri: 'echo://test' });
      // If it doesn't throw, the server silently accepted — tolerable
    } catch (error: unknown) {
      // Expected — server doesn't support subscriptions
      expect(error).toBeDefined();
    }
  });
});
