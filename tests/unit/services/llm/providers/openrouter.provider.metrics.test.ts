/**
 * @fileoverview Tests for OpenRouterProvider OTel metrics recording.
 * Verifies that mcp.llm.requests, mcp.llm.duration, mcp.llm.errors,
 * and mcp.llm.tokens counters/histograms fire with correct attributes
 * across success, error, and token-usage scenarios.
 * @module tests/unit/services/llm/providers/openrouter.provider.metrics.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCounterAdd = vi.fn();
const mockHistogramRecord = vi.fn();
const mockErrorAdd = vi.fn();
const mockTokenAdd = vi.fn();

vi.mock('@/utils/telemetry/metrics.js', () => ({
  createCounter: vi.fn((name: string) => {
    if (name === 'mcp.llm.errors') return { add: mockErrorAdd };
    if (name === 'mcp.llm.tokens') return { add: mockTokenAdd };
    return { add: mockCounterAdd };
  }),
  createHistogram: vi.fn(() => ({ record: mockHistogramRecord })),
}));

vi.mock('@/utils/telemetry/trace.js', () => ({
  withSpan: vi.fn(async (_name: string, fn: (span: any) => Promise<any>) =>
    fn({ setAttribute: vi.fn(), setAttributes: vi.fn() }),
  ),
}));

vi.mock('@/utils/internal/performance.js', () => ({
  nowMs: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(150),
}));

vi.mock('@/utils/internal/error-handler/errorHandler.js', () => ({
  ErrorHandler: {
    tryCatch: vi.fn(async (fn: () => Promise<any>) => fn()),
  },
}));

vi.mock('@/utils/internal/requestContext.js', () => ({
  requestContextService: {
    createRequestContext: vi.fn(() => ({
      requestId: 'mock-req',
      timestamp: new Date().toISOString(),
    })),
  },
}));

vi.mock('@/utils/security/sanitization.js', () => ({
  sanitization: {
    sanitizeForLogging: vi.fn((v: unknown) => v),
  },
}));

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } };
  },
}));

import { OpenRouterProvider } from '@/services/llm/providers/openrouter.provider.js';
import { nowMs } from '@/utils/internal/performance.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';

const mockConfig = {
  openrouterApiKey: 'test-key',
  openrouterAppUrl: 'http://test',
  openrouterAppName: 'test',
  llmDefaultModel: 'test/model',
  llmDefaultTemperature: 0.7,
  llmDefaultTopP: undefined,
  llmDefaultMaxTokens: undefined,
  llmDefaultTopK: undefined,
  llmDefaultMinP: undefined,
} as any;

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  logInteraction: vi.fn(),
} as any;

const mockRateLimiter = { check: vi.fn() } as any;

const ctx: RequestContext = {
  requestId: 'r1',
  timestamp: new Date().toISOString(),
  operation: 'test',
};

describe('OpenRouterProvider metrics', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    mockCounterAdd.mockClear();
    mockHistogramRecord.mockClear();
    mockErrorAdd.mockClear();
    mockTokenAdd.mockClear();
    mockCreate.mockReset();
    vi.mocked(nowMs).mockReset().mockReturnValueOnce(100).mockReturnValueOnce(150);
    provider = new OpenRouterProvider(mockRateLimiter, mockConfig, mockLogger);
  });

  describe('success – non-streaming', () => {
    it('records request counter and duration histogram', async () => {
      mockCreate.mockResolvedValue({
        id: 'chatcmpl-1',
        choices: [{ message: { content: 'hi' } }],
        model: 'test/model',
      });

      await provider.chatCompletion(
        { messages: [{ role: 'user', content: 'hello' }], model: 'test/model', stream: false },
        ctx,
      );

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'gen_ai.request.model': 'test/model',
        'gen_ai.system': 'openrouter',
      });
      expect(mockHistogramRecord).toHaveBeenCalledWith(50, {
        'gen_ai.request.model': 'test/model',
        'gen_ai.system': 'openrouter',
      });
      expect(mockErrorAdd).not.toHaveBeenCalled();
    });
  });

  describe('success – with token usage', () => {
    it('records token counter with input and output types', async () => {
      mockCreate.mockResolvedValue({
        id: 'chatcmpl-2',
        choices: [{ message: { content: 'response' } }],
        model: 'test/model',
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      });

      await provider.chatCompletion(
        {
          messages: [{ role: 'user', content: 'tell me a joke' }],
          model: 'test/model',
          stream: false,
        },
        ctx,
      );

      expect(mockTokenAdd).toHaveBeenCalledWith(10, {
        'gen_ai.request.model': 'test/model',
        'gen_ai.token.type': 'input',
      });
      expect(mockTokenAdd).toHaveBeenCalledWith(20, {
        'gen_ai.request.model': 'test/model',
        'gen_ai.token.type': 'output',
      });
    });
  });

  describe('error path', () => {
    it('records error counter when API call fails', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      await expect(
        provider.chatCompletion(
          { messages: [{ role: 'user', content: 'hi' }], model: 'test/model', stream: false },
          ctx,
        ),
      ).rejects.toThrow('API error');

      expect(mockCounterAdd).toHaveBeenCalledWith(1, {
        'gen_ai.request.model': 'test/model',
        'gen_ai.system': 'openrouter',
      });
      expect(mockErrorAdd).toHaveBeenCalledWith(1, {
        'gen_ai.request.model': 'test/model',
        'gen_ai.system': 'openrouter',
      });
    });

    it('does NOT record token counter on failure', async () => {
      mockCreate.mockRejectedValue(new Error('timeout'));

      await expect(
        provider.chatCompletion(
          { messages: [{ role: 'user', content: 'hi' }], model: 'test/model', stream: false },
          ctx,
        ),
      ).rejects.toThrow();

      expect(mockTokenAdd).not.toHaveBeenCalled();
    });
  });
});
