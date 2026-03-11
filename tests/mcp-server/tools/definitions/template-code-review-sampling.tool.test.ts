/**
 * @fileoverview Tests for the template-code-review-sampling tool (new-style API).
 * @module tests/mcp-server/tools/definitions/template-code-review-sampling.tool.test
 */
import { describe, expect, it, vi } from 'vitest';
import { createMockContext } from '@/testing/index.js';
import { codeReviewSamplingTool } from '../../../../src/mcp-server/tools/definitions/template-code-review-sampling.tool.js';
import { JsonRpcErrorCode, McpError } from '../../../../src/types-global/errors.js';

describe('codeReviewSamplingTool', () => {
  it('should throw an error if sampling capability is not available', async () => {
    const ctx = createMockContext(); // no sample capability
    const input = codeReviewSamplingTool.input.parse({
      code: 'function test() { return 42; }',
      language: 'javascript',
      focus: 'general',
    });

    await expect(codeReviewSamplingTool.handler(input, ctx)).rejects.toThrow(McpError);
    await expect(codeReviewSamplingTool.handler(input, ctx)).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.InvalidRequest,
    );
  });

  it('should successfully request a code review via sampling', async () => {
    const mockSample = vi.fn().mockResolvedValue({
      role: 'assistant',
      content: { type: 'text', text: 'This is a simple function that looks good.' },
      model: 'claude-3-5-sonnet',
      stopReason: 'end_turn',
    });
    const ctx = createMockContext({ sample: mockSample });
    const input = codeReviewSamplingTool.input.parse({
      code: 'function add(a, b) { return a + b; }',
      language: 'javascript',
      focus: 'general',
      maxTokens: 500,
    });

    const result = await codeReviewSamplingTool.handler(input, ctx);

    expect(result.code).toBe('function add(a, b) { return a + b; }');
    expect(result.language).toBe('javascript');
    expect(result.focus).toBe('general');
    expect(result.review).toBe('This is a simple function that looks good.');
    expect(result.tokenUsage?.requested).toBe(500);
    expect(mockSample).toHaveBeenCalledWith(
      [{ role: 'user', content: { type: 'text', text: expect.stringContaining('add(a, b)') } }],
      expect.objectContaining({
        maxTokens: 500,
        temperature: 0.3,
        modelPreferences: expect.objectContaining({
          hints: [{ name: 'claude-3-5-sonnet-20241022' }],
        }),
      }),
    );
  });

  it('should handle different focus areas', async () => {
    const focuses = ['security', 'performance', 'style', 'general'] as const;

    for (const focus of focuses) {
      const mockSample = vi.fn().mockResolvedValue({
        role: 'assistant',
        content: { type: 'text', text: `Review for ${focus}` },
        model: 'test-model',
        stopReason: 'end_turn',
      });
      const ctx = createMockContext({ sample: mockSample });
      const input = codeReviewSamplingTool.input.parse({
        code: 'const x = 1;',
        language: 'javascript',
        focus,
      });

      const result = await codeReviewSamplingTool.handler(input, ctx);

      expect(result.focus).toBe(focus);
      expect(result.review).toContain(focus);
    }
  });

  it('should propagate error if sampling request fails', async () => {
    const mockSample = vi.fn().mockRejectedValue(new Error('Sampling failed'));
    const ctx = createMockContext({ sample: mockSample });
    const input = codeReviewSamplingTool.input.parse({
      code: 'function broken() {}',
      language: 'javascript',
    });

    await expect(codeReviewSamplingTool.handler(input, ctx)).rejects.toThrow('Sampling failed');
  });

  it('should format response correctly', () => {
    const result = {
      code: 'test code',
      language: 'javascript',
      focus: 'security',
      review: 'This code is secure.',
      tokenUsage: { requested: 500 },
    };

    const formatted = codeReviewSamplingTool.format?.(result);

    expect(formatted).toHaveLength(1);
    const block = formatted![0];
    expect(block).toBeDefined();
    if (!block || block.type !== 'text') throw new Error('Expected text content block');
    expect(block.text).toContain('# Code Review (security)');
    expect(block.text).toContain('This code is secure.');
  });

  it('should handle optional language parameter', async () => {
    const mockSample = vi.fn().mockResolvedValue({
      role: 'assistant',
      content: { type: 'text', text: 'Code looks good.' },
      model: 'test-model',
      stopReason: 'end_turn',
    });
    const ctx = createMockContext({ sample: mockSample });
    const input = codeReviewSamplingTool.input.parse({ code: 'print("hello")' });

    const result = await codeReviewSamplingTool.handler(input, ctx);

    expect(result.language).toBeUndefined();
    expect(result.code).toBe('print("hello")');
  });

  it('should validate code length constraints', () => {
    const tooLongCode = 'x'.repeat(10001);
    expect(() => codeReviewSamplingTool.input.parse({ code: tooLongCode })).toThrow();
    expect(() => codeReviewSamplingTool.input.parse({ code: '' })).toThrow();
  });

  it('should validate maxTokens constraints', () => {
    expect(() => codeReviewSamplingTool.input.parse({ code: 'test', maxTokens: 50 })).toThrow();
    expect(() => codeReviewSamplingTool.input.parse({ code: 'test', maxTokens: 3000 })).toThrow();

    const validInput = codeReviewSamplingTool.input.parse({ code: 'test', maxTokens: 1000 });
    expect(validInput.maxTokens).toBe(1000);
  });
});
