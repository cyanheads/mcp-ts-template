/**
 * @fileoverview Tests for the async countdown task tool.
 * @module tests/examples/tools/template-async-countdown.tool.test
 */

import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
import { describe, expect, it } from 'vitest';
import { asyncCountdownTool } from '../../../examples/mcp-server/tools/definitions/template-async-countdown.tool.js';

describe('asyncCountdownTool', () => {
  it('counts down successfully', async () => {
    const ctx = createMockContext({ progress: true });
    const input = asyncCountdownTool.input.parse({ seconds: 1 });
    const result = await asyncCountdownTool.handler(input, ctx);
    expect(result.success).toBe(true);
    expect(result.wasCancelled).toBe(false);
    expect(result.progress).toBe(100);
  });

  it('respects cancellation signal', async () => {
    const controller = new AbortController();
    controller.abort();
    const ctx = createMockContext({ progress: true, signal: controller.signal });
    const input = asyncCountdownTool.input.parse({ seconds: 5 });
    const result = await asyncCountdownTool.handler(input, ctx);
    expect(result.success).toBe(false);
    expect(result.wasCancelled).toBe(true);
  });

  it('simulates failure at 50%', async () => {
    const ctx = createMockContext({ progress: true });
    const input = asyncCountdownTool.input.parse({ seconds: 2, simulateFailure: true });
    await expect(asyncCountdownTool.handler(input, ctx)).rejects.toThrow('Simulated failure');
  });

  it('includes custom message in result', async () => {
    const ctx = createMockContext({ progress: true });
    const input = asyncCountdownTool.input.parse({ seconds: 1, message: 'Done!' });
    const result = await asyncCountdownTool.handler(input, ctx);
    expect(result.message).toBe('Done!');
  });

  it('has task flag set', () => {
    expect(asyncCountdownTool.task).toBe(true);
  });

  it('formats success result', () => {
    const result = {
      success: true,
      message: 'Complete',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:01.000Z',
      duration: 1000,
      progress: 100,
      wasCancelled: false,
    };
    const blocks = asyncCountdownTool.format!(result);
    expect(blocks[0]!.type).toBe('text');
    expect((blocks[0] as { text: string }).text).toContain('Complete');
  });

  it('formats failure result', () => {
    const result = {
      success: false,
      message: 'Cancelled',
      startedAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-01-01T00:00:00.500Z',
      duration: 500,
      progress: 50,
      wasCancelled: true,
    };
    const blocks = asyncCountdownTool.format!(result);
    expect((blocks[0] as { text: string }).text).toContain('Cancelled');
  });
});
