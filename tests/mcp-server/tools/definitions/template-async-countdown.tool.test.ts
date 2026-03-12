/**
 * @fileoverview Tests for the template-async-countdown tool (new-style, task: true).
 * Tests the handler directly via createMockContext with progress support.
 * @module tests/mcp-server/tools/definitions/template-async-countdown.tool.test
 */

import { describe, expect, it } from 'vitest';
import { asyncCountdownTool } from '@/mcp-server/tools/definitions/template-async-countdown.tool.js';
import { isNewToolDefinition } from '@/mcp-server/tools/utils/newToolDefinition.js';
import { createMockContext } from '@/testing/index.js';

describe('asyncCountdownTool', () => {
  describe('tool definition structure', () => {
    it('should be a new-style tool definition', () => {
      expect(isNewToolDefinition(asyncCountdownTool)).toBe(true);
    });

    it('should have task: true', () => {
      expect(asyncCountdownTool.task).toBe(true);
    });

    it('should have correct name', () => {
      expect(asyncCountdownTool.name).toBe('template_async_countdown');
    });

    it('should have a title', () => {
      expect(asyncCountdownTool.title).toBe('Async Countdown (Task Demo)');
    });

    it('should have a description mentioning Tasks API', () => {
      expect(asyncCountdownTool.description).toContain('Tasks API');
      expect(asyncCountdownTool.description).toContain('countdown');
    });

    it('should have annotations', () => {
      expect(asyncCountdownTool.annotations?.readOnlyHint).toBe(true);
      expect(asyncCountdownTool.annotations?.openWorldHint).toBe(false);
    });

    it('should have a format function', () => {
      expect(asyncCountdownTool.format).toBeDefined();
    });
  });

  describe('input schema', () => {
    it('should validate valid input with required fields', () => {
      const result = asyncCountdownTool.input.safeParse({ seconds: 5 });
      expect(result.success).toBe(true);
    });

    it('should validate input with all optional fields', () => {
      const result = asyncCountdownTool.input.safeParse({
        seconds: 10,
        message: 'Custom message',
        simulateFailure: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject seconds below minimum (1)', () => {
      const result = asyncCountdownTool.input.safeParse({ seconds: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject seconds above maximum (60)', () => {
      const result = asyncCountdownTool.input.safeParse({ seconds: 61 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer seconds', () => {
      const result = asyncCountdownTool.input.safeParse({ seconds: 5.5 });
      expect(result.success).toBe(false);
    });

    it('should reject missing seconds', () => {
      const result = asyncCountdownTool.input.safeParse({ message: 'test' });
      expect(result.success).toBe(false);
    });
  });

  describe('output schema', () => {
    it('should validate successful output', () => {
      const result = asyncCountdownTool.output?.safeParse({
        success: true,
        message: 'Countdown complete!',
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-01T00:00:05.000Z',
        duration: 5000,
        progress: 100,
        wasCancelled: false,
      });
      expect(result?.success).toBe(true);
    });

    it('should validate cancelled output', () => {
      const result = asyncCountdownTool.output?.safeParse({
        success: false,
        message: 'Countdown was cancelled',
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-01T00:00:02.500Z',
        duration: 2500,
        progress: 50,
        wasCancelled: true,
      });
      expect(result?.success).toBe(true);
    });
  });

  describe('handler', () => {
    it('should complete a 1-second countdown', async () => {
      const ctx = createMockContext({ progress: true });
      const input = asyncCountdownTool.input.parse({ seconds: 1 });

      const result = await asyncCountdownTool.handler(input, ctx);

      expect(result.success).toBe(true);
      expect(result.progress).toBe(100);
      expect(result.wasCancelled).toBe(false);
      expect(result.duration).toBeGreaterThan(0);
    }, 5000);

    it('should use custom message', async () => {
      const ctx = createMockContext({ progress: true });
      const input = asyncCountdownTool.input.parse({ seconds: 1, message: 'Done!' });

      const result = await asyncCountdownTool.handler(input, ctx);

      expect(result.message).toBe('Done!');
    }, 5000);

    it('should respect cancellation via signal', async () => {
      const controller = new AbortController();
      const ctx = createMockContext({ progress: true, signal: controller.signal });
      const input = asyncCountdownTool.input.parse({ seconds: 10 });

      // Cancel almost immediately
      setTimeout(() => controller.abort(), 50);

      const result = await asyncCountdownTool.handler(input, ctx);

      expect(result.wasCancelled).toBe(true);
      expect(result.success).toBe(false);
      expect(result.progress).toBeLessThan(100);
    }, 5000);

    it('should fail at 50% when simulateFailure is true', async () => {
      const ctx = createMockContext({ progress: true });
      const input = asyncCountdownTool.input.parse({ seconds: 2, simulateFailure: true });

      await expect(asyncCountdownTool.handler(input, ctx)).rejects.toThrow(
        'Simulated failure at 50%',
      );
    }, 5000);

    it('should report progress via ctx.progress', async () => {
      const ctx = createMockContext({ progress: true });
      const input = asyncCountdownTool.input.parse({ seconds: 1 });

      await asyncCountdownTool.handler(input, ctx);

      // Progress should have been set and incremented
      const progress = ctx.progress as unknown as {
        _total: number;
        _completed: number;
        _messages: string[];
      };
      expect(progress._total).toBe(1);
      expect(progress._completed).toBe(1);
      expect(progress._messages.length).toBeGreaterThan(0);
    }, 5000);
  });

  describe('format', () => {
    it('should format successful result', () => {
      const result = {
        success: true,
        message: 'Done!',
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-01T00:00:01.000Z',
        duration: 1000,
        progress: 100,
        wasCancelled: false,
      };

      const blocks = asyncCountdownTool.format?.(result) ?? [];

      expect(blocks).toHaveLength(1);
      expect(blocks[0]!.type).toBe('text');
      expect((blocks[0] as { text: string }).text).toContain('✓ Done!');
    });

    it('should format failed result', () => {
      const result = {
        success: false,
        message: 'Failed!',
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-01T00:00:01.000Z',
        duration: 1000,
        progress: 50,
        wasCancelled: false,
      };

      const blocks = asyncCountdownTool.format?.(result) ?? [];

      expect(blocks).toHaveLength(1);
      expect((blocks[0] as { text: string }).text).toContain('✗ Failed!');
    });
  });
});
