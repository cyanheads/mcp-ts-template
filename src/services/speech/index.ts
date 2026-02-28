/**
 * @fileoverview Speech service barrel export.
 * Provides unified access to TTS and STT capabilities.
 * @module src/services/speech
 */

// Export core interfaces and service
export type { ISpeechProvider } from './core/ISpeechProvider.js';
export { supportsSTT, supportsTTS } from './core/ISpeechProvider.js';
export { createSpeechProvider, SpeechService } from './core/SpeechService.js';

// Export provider implementations
export { ElevenLabsProvider } from './providers/elevenlabs.provider.js';
export { WhisperProvider } from './providers/whisper.provider.js';

// Export types
export type {
  AudioFormat,
  SpeechProviderConfig,
  SpeechToTextOptions,
  SpeechToTextResult,
  TextToSpeechOptions,
  TextToSpeechResult,
  Voice,
  VoiceSettings,
  WordTimestamp,
} from './types.js';
