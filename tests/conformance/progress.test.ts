/**
 * @fileoverview Progress notification conformance tests.
 * Validates that server-side progress emissions reach the client via the
 * `onprogress` callback in `RequestOptions`, and that the progress values
 * conform to the MCP spec shape (progressToken, progress, total, message).
 *
 * Registers a test-only tool that emits a known sequence of progress updates.
 * @module tests/conformance/progress
 */

import type { Progress } from '@modelcontextprotocol/sdk/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { type ConformanceHarness, createConformanceHarness } from './helpers/server-harness.js';

describe('Progress notification conformance', () => {
  let harness: ConformanceHarness;

  beforeAll(async () => {
    harness = await createConformanceHarness();

    // Register a test-only tool that emits `steps` progress notifications.
    // Progress is sent via `extra.sendNotification` with the `notifications/progress` method.
    // The `progressToken` comes from `extra._meta?.progressToken`.
    harness.server.tool(
      'test_progress_tool',
      { steps: z.number().int().min(1).max(20).describe('Number of progress steps to emit') },
      async (args, extra) => {
        const steps = args.steps ?? 3;
        const progressToken = extra._meta?.progressToken;

        // Only emit progress if the client provided a progressToken
        if (progressToken !== undefined) {
          for (let i = 1; i <= steps; i++) {
            await extra.sendNotification({
              method: 'notifications/progress',
              params: {
                message: `Step ${i} of ${steps}`,
                progress: i,
                progressToken,
                total: steps,
              },
            });
          }
        }

        return {
          content: [{ text: `Completed ${steps} steps`, type: 'text' as const }],
        };
      },
    );
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  // ── Progress delivery ────────────────────────────────────────────────────

  it('delivers progress notifications when onprogress callback is provided', async () => {
    const collected: Progress[] = [];

    await harness.client.callTool(
      { arguments: { steps: 4 }, name: 'test_progress_tool' },
      undefined,
      {
        onprogress: (progress) => {
          collected.push(progress);
        },
      },
    );

    // The SDK auto-generates a progressToken when onprogress is provided,
    // which triggers the server-side notifications/progress path
    expect(collected.length).toBe(4);

    for (const p of collected) {
      expect(typeof p.progress).toBe('number');
      expect(typeof p.total).toBe('number');
    }
  });

  it('progress values increase monotonically', async () => {
    const collected: Progress[] = [];

    await harness.client.callTool(
      { arguments: { steps: 5 }, name: 'test_progress_tool' },
      undefined,
      {
        onprogress: (progress) => {
          collected.push(progress);
        },
      },
    );

    expect(collected.length).toBe(5);

    for (let i = 1; i < collected.length; i++) {
      expect(collected[i]!.progress).toBeGreaterThan(collected[i - 1]!.progress);
    }
  });

  it('progress includes message strings', async () => {
    const collected: Progress[] = [];

    await harness.client.callTool(
      { arguments: { steps: 3 }, name: 'test_progress_tool' },
      undefined,
      {
        onprogress: (progress) => {
          collected.push(progress);
        },
      },
    );

    expect(collected.length).toBe(3);

    for (let i = 0; i < collected.length; i++) {
      expect(collected[i]!.message).toBe(`Step ${i + 1} of 3`);
    }
  });

  it('total is consistent across all notifications', async () => {
    const collected: Progress[] = [];
    const steps = 6;

    await harness.client.callTool({ arguments: { steps }, name: 'test_progress_tool' }, undefined, {
      onprogress: (progress) => {
        collected.push(progress);
      },
    });

    expect(collected.length).toBe(steps);

    for (const p of collected) {
      expect(p.total).toBe(steps);
    }
  });

  // ── Without progress callback ────────────────────────────────────────────

  it('tool completes normally without onprogress callback', async () => {
    // No onprogress means no progressToken is sent, so the tool should
    // skip progress emissions and return the result directly.
    const result = await harness.client.callTool({
      arguments: { steps: 3 },
      name: 'test_progress_tool',
    });

    expect(result).toBeDefined();
    expect('content' in result).toBe(true);

    const textBlock = (result.content as Array<{ text?: string; type: string }>).find(
      (b) => b.type === 'text',
    );
    expect(textBlock?.text).toContain('Completed 3 steps');
  });

  // ── Single step edge case ────────────────────────────────────────────────

  it('handles a single progress step', async () => {
    const collected: Progress[] = [];

    await harness.client.callTool(
      { arguments: { steps: 1 }, name: 'test_progress_tool' },
      undefined,
      {
        onprogress: (progress) => {
          collected.push(progress);
        },
      },
    );

    expect(collected.length).toBe(1);
    expect(collected[0]!.progress).toBe(1);
    expect(collected[0]!.total).toBe(1);
  });
});
