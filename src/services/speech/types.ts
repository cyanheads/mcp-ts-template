/**
 * @fileoverview Type definitions for the Speech service.
 * Provides interfaces for Text-to-Speech (TTS) and Speech-to-Text (STT) operations.
 * @module src/services/speech/types
 */

/**
 * Supported audio formats for speech operations.
 */
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'pcm' | 'webm';

/**
 * Voice settings for text-to-speech synthesis.
 */
export interface VoiceSettings {
  /** Voice pitch (-20.0 to 20.0, where 0 is normal) */
  pitch?: number;
  /** Similarity boost (0.0 to 1.0, provider-specific) */
  similarityBoost?: number;
  /** Speech rate/speed (0.5 to 2.0, where 1.0 is normal) */
  speed?: number;
  /** Stability setting (0.0 to 1.0, provider-specific) */
  stability?: number;
  /** Style exaggeration (0.0 to 1.0, provider-specific) */
  style?: number;
  /** Voice ID or name (provider-specific) */
  voiceId?: string;
  /** Volume level (0.0 to 1.0) */
  volume?: number;
}

/**
 * Options for text-to-speech synthesis.
 */
export interface TextToSpeechOptions {
  /** Optional context for request tracing */
  context?: {
    requestId?: string;
    traceId?: string;
    tenantId?: string;
  };
  /** Output audio format */
  format?: AudioFormat;
  /** Language code (e.g., 'en-US', 'es-ES') */
  language?: string;
  /** Model ID (provider-specific) */
  modelId?: string;
  /** Text to convert to speech */
  text: string;
  /** Voice settings */
  voice?: VoiceSettings;
}

/**
 * Result from text-to-speech synthesis.
 */
export interface TextToSpeechResult {
  /** Audio data as Buffer or base64 string */
  audio: Buffer | string;
  /** Character count of input text */
  characterCount: number;
  /** Duration in seconds (if available) */
  duration?: number;
  /** Audio format */
  format: AudioFormat;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for speech-to-text transcription.
 */
export interface SpeechToTextOptions {
  /** Audio data as Buffer or base64 string */
  audio: Buffer | string;
  /** Optional context for request tracing */
  context?: {
    requestId?: string;
    traceId?: string;
    tenantId?: string;
  };
  /** Audio format */
  format?: AudioFormat;
  /** Language code hint (e.g., 'en', 'es') */
  language?: string;
  /** Model ID (provider-specific) */
  modelId?: string;
  /** Prompt to guide transcription style */
  prompt?: string;
  /** Temperature for sampling (0.0 to 1.0) */
  temperature?: number;
  /** Enable word-level timestamps */
  timestamps?: boolean;
}

/**
 * Word-level timestamp information.
 */
export interface WordTimestamp {
  /** Confidence score (0.0 to 1.0) */
  confidence?: number;
  /** End time in seconds */
  end: number;
  /** Start time in seconds */
  start: number;
  /** The word or token */
  word: string;
}

/**
 * Result from speech-to-text transcription.
 */
export interface SpeechToTextResult {
  /** Overall confidence score (0.0 to 1.0) */
  confidence?: number;
  /** Duration in seconds */
  duration?: number;
  /** Detected language code */
  language?: string;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
  /** Transcribed text */
  text: string;
  /** Word-level timestamps (if requested) */
  words?: WordTimestamp[];
}

/**
 * Available voices from a provider.
 */
export interface Voice {
  /** Voice category (e.g., 'premade', 'cloned', 'professional') */
  category?: string;
  /** Voice description */
  description?: string;
  /** Gender (if applicable) */
  gender?: 'male' | 'female' | 'neutral';
  /** Voice ID */
  id: string;
  /** Language codes supported */
  languages?: string[];
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
  /** Voice name */
  name: string;
  /** Preview URL (if available) */
  previewUrl?: string;
}

/**
 * Configuration for speech service providers.
 */
export interface SpeechProviderConfig {
  /** API key */
  apiKey?: string;
  /** API base URL (optional override) */
  baseUrl?: string;
  /** Default model ID */
  defaultModelId?: string;
  /** Default voice ID for TTS */
  defaultVoiceId?: string;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
  /** Provider type */
  provider: 'elevenlabs' | 'openai-whisper' | 'mock';
  /** Request timeout in milliseconds */
  timeout?: number;
}
