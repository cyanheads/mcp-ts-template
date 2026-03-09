/**
 * @fileoverview Type-satisfaction tests for the LLM provider interface.
 * Verifies that ILlmProvider and OpenRouterChatParams are well-formed
 * and usable as type constraints at runtime.
 * @module tests/services/llm/core/ILlmProvider.test
 */

import { describe, expect, it } from 'vitest';
import type { ILlmProvider, OpenRouterChatParams } from '@/services/llm/core/ILlmProvider.js';

describe('ILlmProvider', () => {
  it('should be satisfiable as a type constraint', () => {
    // Verify the interface shape is well-formed by checking a mock satisfies it
    const provider: ILlmProvider = {
      chatCompletion: async () => ({
        id: '',
        choices: [],
        created: 0,
        model: '',
        object: 'chat.completion' as const,
      }),
      chatCompletionStream: async () =>
        (async function* () {
          // Returns Promise<AsyncIterable>
        })(),
    };

    expect(typeof provider.chatCompletion).toBe('function');
    expect(typeof provider.chatCompletionStream).toBe('function');
  });

  it('should accept OpenRouterChatParams as a union type', () => {
    const nonStreaming: OpenRouterChatParams = {
      model: 'test-model',
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    };

    expect(nonStreaming.model).toBe('test-model');
    expect(nonStreaming.stream).toBe(false);
  });
});
