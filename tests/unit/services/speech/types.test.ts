/**
 * @fileoverview Type-satisfaction tests for speech service type definitions.
 * Verifies that speech service interfaces and types are well-formed
 * and usable as type constraints at runtime.
 * @module tests/services/speech/types.test
 */

import { describe, expect, it } from 'vitest';
import type {
  AudioFormat,
  SpeechProviderConfig,
  SpeechToTextOptions,
  SpeechToTextResult,
  TextToSpeechOptions,
  TextToSpeechResult,
  Voice,
  VoiceSettings,
  WordTimestamp,
} from '@/services/speech/types.js';

describe('Speech Service Types', () => {
  it('should satisfy AudioFormat as a string literal union', () => {
    const formats: AudioFormat[] = ['mp3', 'wav', 'ogg', 'flac', 'pcm', 'webm'];
    expect(formats).toHaveLength(6);
  });

  it('should satisfy VoiceSettings with optional fields', () => {
    const settings: VoiceSettings = {
      voiceId: 'voice-1',
      speed: 1.0,
      pitch: 0,
    };

    expect(settings.voiceId).toBe('voice-1');
    expect(settings.speed).toBe(1.0);
  });

  it('should satisfy TextToSpeechOptions with required text', () => {
    const opts: TextToSpeechOptions = { text: 'Hello world' };
    expect(opts.text).toBe('Hello world');
  });

  it('should satisfy TextToSpeechResult', () => {
    const result: TextToSpeechResult = {
      audio: 'base64data',
      format: 'mp3',
      characterCount: 11,
    };

    expect(result.format).toBe('mp3');
    expect(result.characterCount).toBe(11);
  });

  it('should satisfy SpeechToTextOptions with required audio', () => {
    const opts: SpeechToTextOptions = { audio: 'base64data' };
    expect(opts.audio).toBe('base64data');
  });

  it('should satisfy SpeechToTextResult with required text', () => {
    const result: SpeechToTextResult = { text: 'transcribed text' };
    expect(result.text).toBe('transcribed text');
  });

  it('should satisfy WordTimestamp', () => {
    const ts: WordTimestamp = { word: 'hello', start: 0.0, end: 0.5 };
    expect(ts.word).toBe('hello');
  });

  it('should satisfy Voice with required fields', () => {
    const voice: Voice = { id: 'v1', name: 'Test Voice' };
    expect(voice.id).toBe('v1');
  });

  it('should satisfy SpeechProviderConfig with required provider', () => {
    const config: SpeechProviderConfig = { provider: 'mock' };
    expect(config.provider).toBe('mock');
  });
});
