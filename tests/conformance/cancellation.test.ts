/**
 * @fileoverview Cancellation protocol conformance tests.
 * Validates that AbortSignal-based cancellation propagates through the
 * full protocol stack (Client -> InMemoryTransport -> McpServer -> tool handler).
 *
 * Registers test-only blocking tools directly on the server to control timing.
 * @module tests/conformance/cancellation
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { type ConformanceHarness, createConformanceHarness } from './helpers/server-harness.js';

describe('Cancellation conformance', () => {
  let harness: ConformanceHarness;

  /** Flipped to true when the blocking tool observes its abort signal. */
  let blockingToolWasAborted = false;
  /** Resolves once the blocking tool's handler has entered its wait phase. */
  let toolStarted: PromiseWithResolvers<void>;

  beforeAll(async () => {
    harness = await createConformanceHarness();
    toolStarted = Promise.withResolvers<void>();

    // Register a test-only tool that blocks until its signal is aborted or 30s elapses.
    // Using the 3-arg overload: server.tool(name, paramsSchema, handler)
    harness.server.tool(
      'test_blocking_tool',
      { dummy: z.string().optional().describe('Unused placeholder parameter') },
      async (_args, extra) => {
        toolStarted.resolve();

        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve({ content: [{ type: 'text' as const, text: 'completed-without-abort' }] });
          }, 30_000);

          extra.signal.addEventListener('abort', () => {
            clearTimeout(timer);
            blockingToolWasAborted = true;
            reject(new Error('Aborted'));
          });
        });
      },
    );
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  // ── Core cancellation ────────────────────────────────────────────────────

  it('cancels an in-progress tool call via AbortController', async () => {
    blockingToolWasAborted = false;

    const ac = new AbortController();
    const toolPromise = harness.client.callTool(
      { arguments: {}, name: 'test_blocking_tool' },
      undefined,
      { signal: ac.signal },
    );

    // Wait for the handler to actually start before aborting
    await toolStarted.promise;
    ac.abort();

    // The client-side promise should reject with an abort-related error
    await expect(toolPromise).rejects.toThrow();

    // The server-side handler should have observed the abort signal
    expect(blockingToolWasAborted).toBe(true);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  it('aborting after a fast tool completes does not throw', async () => {
    const ac = new AbortController();
    const result = await harness.client.callTool(
      { arguments: { message: 'fast-call' }, name: 'template_echo_message' },
      undefined,
      { signal: ac.signal },
    );

    // Tool already returned — aborting now should be a no-op
    ac.abort();

    expect(result).toBeDefined();
    expect('content' in result).toBe(true);
  });

  it('aborting an unused AbortController does not crash the client', () => {
    const ac = new AbortController();
    // Never passed to any request — just abort it
    expect(() => ac.abort()).not.toThrow();
  });

  it('pre-aborted signal rejects immediately without invoking the tool', async () => {
    const ac = new AbortController();
    ac.abort(); // Abort before making the request

    await expect(
      harness.client.callTool(
        { arguments: { message: 'should-not-run' }, name: 'template_echo_message' },
        undefined,
        { signal: ac.signal },
      ),
    ).rejects.toThrow();
  });
});
