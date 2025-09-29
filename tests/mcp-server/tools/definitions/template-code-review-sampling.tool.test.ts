/**
 * @fileoverview Tests for the template-code-review-sampling tool.
 * @module tests/mcp-server/tools/definitions/template-code-review-sampling.tool.test
 */
import { describe, it, expect, vi } from 'vitest';

import { codeReviewSamplingTool } from '../../../../src/mcp-server/tools/definitions/template-code-review-sampling.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';
import {
  McpError,
  JsonRpcErrorCode,
} from '../../../../src/types-global/errors.js';

describe('codeReviewSamplingTool', () => {
  const mockSdkContextWithSampling = {
    signal: new AbortController().signal,
    requestId: 'test-request-id',
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
    createMessage: vi.fn(),
  };

  const mockSdkContextWithoutSampling = {
    signal: new AbortController().signal,
    requestId: 'test-request-id',
    sendNotification: vi.fn(),
    sendRequest: vi.fn(),
  };

  it('should throw an error if sampling capability is not available', async () => {
    const context = requestContextService.createRequestContext();
    const rawInput = {
      code: 'function test() { return 42; }',
      language: 'javascript',
      focus: 'general',
    };
    const parsedInput = codeReviewSamplingTool.inputSchema.parse(rawInput);

    await expect(
      codeReviewSamplingTool.logic(
        parsedInput,
        context,
        mockSdkContextWithoutSampling,
      ),
    ).rejects.toThrow(McpError);

    await expect(
      codeReviewSamplingTool.logic(
        parsedInput,
        context,
        mockSdkContextWithoutSampling,
      ),
    ).rejects.toHaveProperty('code', JsonRpcErrorCode.InvalidRequest);
  });

  it('should successfully request a code review via sampling', async () => {
    const context = requestContextService.createRequestContext();
    const rawInput = {
      code: 'function add(a, b) { return a + b; }',
      language: 'javascript',
      focus: 'general',
      maxTokens: 500,
    };
    const parsedInput = codeReviewSamplingTool.inputSchema.parse(rawInput);

    mockSdkContextWithSampling.createMessage.mockResolvedValue({
      role: 'assistant',
      content: {
        type: 'text',
        text: 'This is a simple function that looks good.',
      },
      model: 'claude-3-5-sonnet',
      stopReason: 'end_turn',
    });

    const result = await codeReviewSamplingTool.logic(
      parsedInput,
      context,
      mockSdkContextWithSampling,
    );

    expect(result.code).toBe('function add(a, b) { return a + b; }');
    expect(result.language).toBe('javascript');
    expect(result.focus).toBe('general');
    expect(result.review).toBe('This is a simple function that looks good.');
    expect(result.tokenUsage?.requested).toBe(500);
    expect(mockSdkContextWithSampling.createMessage).toHaveBeenCalledWith(
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
    const context = requestContextService.createRequestContext();
    const focuses = ['security', 'performance', 'style', 'general'] as const;

    for (const focus of focuses) {
      const rawInput = {
        code: 'const x = 1;',
        language: 'javascript',
        focus,
      };
      const parsedInput = codeReviewSamplingTool.inputSchema.parse(rawInput);

      mockSdkContextWithSampling.createMessage.mockResolvedValue({
        role: 'assistant',
        content: {
          type: 'text',
          text: `Review for ${focus}`,
        },
        model: 'test-model',
        stopReason: 'end_turn',
      });

      const result = await codeReviewSamplingTool.logic(
        parsedInput,
        context,
        mockSdkContextWithSampling,
      );

      expect(result.focus).toBe(focus);
      expect(result.review).toContain(focus);
    }
  });

  it('should throw an error if sampling request fails', async () => {
    const context = requestContextService.createRequestContext();
    const rawInput = {
      code: 'function broken() {}',
      language: 'javascript',
    };
    const parsedInput = codeReviewSamplingTool.inputSchema.parse(rawInput);

    mockSdkContextWithSampling.createMessage.mockRejectedValue(
      new Error('Sampling failed'),
    );

    await expect(
      codeReviewSamplingTool.logic(
        parsedInput,
        context,
        mockSdkContextWithSampling,
      ),
    ).rejects.toThrow(McpError);

    await expect(
      codeReviewSamplingTool.logic(
        parsedInput,
        context,
        mockSdkContextWithSampling,
      ),
    ).rejects.toHaveProperty('code', JsonRpcErrorCode.InternalError);
  });

  it('should format response correctly', () => {
    const formatter = codeReviewSamplingTool.responseFormatter;
    expect(formatter).toBeDefined();

    const result = {
      code: 'test code',
      language: 'javascript',
      focus: 'security',
      review: 'This code is secure.',
      tokenUsage: { requested: 500 },
    };

    const formatted = formatter!(result);

    expect(formatted).toHaveLength(1);
    const block = formatted[0];
    expect(block).toBeDefined();
    if (!block || block.type !== 'text') {
      throw new Error('Expected text content block');
    }
    expect(block.text).toContain('# Code Review (security)');
    expect(block.text).toContain('This code is secure.');
  });

  it('should handle optional language parameter', async () => {
    const context = requestContextService.createRequestContext();
    const rawInput = {
      code: 'print("hello")',
    };
    const parsedInput = codeReviewSamplingTool.inputSchema.parse(rawInput);

    mockSdkContextWithSampling.createMessage.mockResolvedValue({
      role: 'assistant',
      content: {
        type: 'text',
        text: 'Code looks good.',
      },
      model: 'test-model',
      stopReason: 'end_turn',
    });

    const result = await codeReviewSamplingTool.logic(
      parsedInput,
      context,
      mockSdkContextWithSampling,
    );

    expect(result.language).toBeUndefined();
    expect(result.code).toBe('print("hello")');
  });

  it('should validate code length constraints', () => {
    const tooLongCode = 'x'.repeat(10001);
    expect(() =>
      codeReviewSamplingTool.inputSchema.parse({
        code: tooLongCode,
      }),
    ).toThrow();

    expect(() =>
      codeReviewSamplingTool.inputSchema.parse({
        code: '',
      }),
    ).toThrow();
  });

  it('should validate maxTokens constraints', () => {
    expect(() =>
      codeReviewSamplingTool.inputSchema.parse({
        code: 'test',
        maxTokens: 50,
      }),
    ).toThrow();

    expect(() =>
      codeReviewSamplingTool.inputSchema.parse({
        code: 'test',
        maxTokens: 3000,
      }),
    ).toThrow();

    const validInput = codeReviewSamplingTool.inputSchema.parse({
      code: 'test',
      maxTokens: 1000,
    });
    expect(validInput.maxTokens).toBe(1000);
  });
});
