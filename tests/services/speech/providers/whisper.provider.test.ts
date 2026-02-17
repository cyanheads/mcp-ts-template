/**
 * @fileoverview Test suite for Whisper speech-to-text provider.
 * @module tests/services/speech/providers/whisper.provider.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WhisperProvider } from '@/services/speech/providers/whisper.provider.js';
import { McpError } from '@/types-global/errors.js';

// Mock fetchWithTimeout
vi.mock('@/utils/index.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    fetchWithTimeout: vi.fn(),
  };
});

import { fetchWithTimeout } from '@/utils/index.js';

const mockFetch = vi.mocked(fetchWithTimeout);

describe('WhisperProvider', () => {
  let provider: WhisperProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new WhisperProvider({
      provider: 'openai-whisper',
      apiKey: 'test-api-key',
      baseUrl: 'https://api.openai.test/v1',
      defaultModelId: 'whisper-1',
      timeout: 10000,
    });
  });

  describe('constructor', () => {
    it('should throw when API key is missing', () => {
      expect(() => new WhisperProvider({ provider: 'openai-whisper' })).toThrow(
        McpError,
      );
      expect(() => new WhisperProvider({ provider: 'openai-whisper' })).toThrow(
        'OpenAI API key is required',
      );
    });

    it('should set correct capabilities', () => {
      expect(provider.name).toBe('openai-whisper');
      expect(provider.supportsTTS).toBe(false);
      expect(provider.supportsSTT).toBe(true);
    });

    it('should use default values when not specified', () => {
      const p = new WhisperProvider({
        provider: 'openai-whisper',
        apiKey: 'key',
      });

      expect(p.name).toBe('openai-whisper');
    });
  });

  describe('textToSpeech', () => {
    it('should throw not supported error', () => {
      expect(() => provider.textToSpeech({ text: 'Hello' })).toThrow(
        'Text-to-speech is not supported by Whisper provider',
      );
    });
  });

  describe('speechToText', () => {
    it('should transcribe audio from Buffer', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            text: 'Hello world',
            language: 'en',
            duration: 2.5,
            task: 'transcribe',
          }),
      } as unknown as Response);

      const result = await provider.speechToText({
        audio: audioBuffer,
        format: 'mp3',
      });

      expect(result.text).toBe('Hello world');
      expect(result.language).toBe('en');
      expect(result.duration).toBe(2.5);
      expect(result.metadata?.provider).toBe('openai-whisper');
      expect(result.metadata?.task).toBe('transcribe');
    });

    it('should transcribe audio from base64 string', async () => {
      const base64Audio = Buffer.from('fake-audio').toString('base64');

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            text: 'Decoded audio',
          }),
      } as unknown as Response);

      const result = await provider.speechToText({
        audio: base64Audio,
      });

      expect(result.text).toBe('Decoded audio');
    });

    it('should throw when audio is missing', async () => {
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider.speechToText({ audio: undefined as any }),
      ).rejects.toThrow('Audio data is required');
    });

    it('should throw when audio exceeds 25MB', async () => {
      const largeBuffer = Buffer.alloc(26 * 1024 * 1024);

      await expect(
        provider.speechToText({ audio: largeBuffer }),
      ).rejects.toThrow('Audio file exceeds maximum size of 25MB');
    });

    it('should include word timestamps when requested', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            text: 'Hello world',
            words: [
              { word: 'Hello', start: 0.0, end: 0.5 },
              { word: 'world', start: 0.6, end: 1.0 },
            ],
          }),
      } as unknown as Response);

      const result = await provider.speechToText({
        audio: Buffer.from('audio'),
        timestamps: true,
      });

      expect(result.words).toHaveLength(2);
      expect(result.words?.[0]).toEqual({
        word: 'Hello',
        start: 0.0,
        end: 0.5,
      });
    });

    it('should pass language and temperature options', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ text: 'Hola' }),
      } as unknown as Response);

      await provider.speechToText({
        audio: Buffer.from('audio'),
        language: 'es',
        temperature: 0.3,
        prompt: 'Spanish transcript',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      // Verify FormData was passed (body is a FormData object)
      const callArgs = mockFetch.mock.calls[0];
      const requestInit = callArgs?.[3] as RequestInit;
      expect(requestInit.method).toBe('POST');
      expect(requestInit.body).toBeInstanceOf(FormData);
    });

    it('should throw on API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      } as unknown as Response);

      await expect(
        provider.speechToText({ audio: Buffer.from('audio') }),
      ).rejects.toThrow('Whisper API error: 400');
    });

    it('should wrap network errors in McpError', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      await expect(
        provider.speechToText({ audio: Buffer.from('audio') }),
      ).rejects.toThrow(McpError);
    });
  });

  describe('getVoices', () => {
    it('should throw not supported error', () => {
      expect(() => provider.getVoices()).toThrow(
        'Voice listing is not supported by Whisper provider',
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when models endpoint is reachable', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
      } as unknown as Response);

      const result = await provider.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when API is unreachable', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await provider.healthCheck();
      expect(result).toBe(false);
    });

    it('should return false when API returns error status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      } as unknown as Response);

      const result = await provider.healthCheck();
      expect(result).toBe(false);
    });
  });
});
