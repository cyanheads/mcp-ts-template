/**
 * @fileoverview Test suite for ISpeechProvider type guards.
 * @module tests/services/speech/core/ISpeechProvider.test
 */

import { describe, expect, it } from 'vitest';
import {
  supportsTTS,
  supportsSTT,
} from '@/services/speech/core/ISpeechProvider.js';
import type { ISpeechProvider } from '@/services/speech/core/ISpeechProvider.js';

function createMockProvider(
  overrides: Partial<ISpeechProvider>,
): ISpeechProvider {
  return {
    name: 'mock',
    supportsTTS: false,
    supportsSTT: false,
    textToSpeech: () => Promise.reject(new Error('Not implemented')),
    speechToText: () => Promise.reject(new Error('Not implemented')),
    getVoices: () => Promise.reject(new Error('Not implemented')),
    healthCheck: () => Promise.resolve(true),
    ...overrides,
  };
}

describe('ISpeechProvider type guards', () => {
  describe('supportsTTS', () => {
    it('should return true for TTS-capable provider', () => {
      const provider = createMockProvider({ supportsTTS: true });
      expect(supportsTTS(provider)).toBe(true);
    });

    it('should return false for non-TTS provider', () => {
      const provider = createMockProvider({ supportsTTS: false });
      expect(supportsTTS(provider)).toBe(false);
    });
  });

  describe('supportsSTT', () => {
    it('should return true for STT-capable provider', () => {
      const provider = createMockProvider({ supportsSTT: true });
      expect(supportsSTT(provider)).toBe(true);
    });

    it('should return false for non-STT provider', () => {
      const provider = createMockProvider({ supportsSTT: false });
      expect(supportsSTT(provider)).toBe(false);
    });
  });
});
