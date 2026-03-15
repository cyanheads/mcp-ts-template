/**
 * @fileoverview Public type surface for the LLM service layer.
 * Re-exports shared types from provider interfaces so consumers can import
 * from a single stable path (`@/services/llm/types`) without coupling to
 * internal provider modules.
 * @module src/services/llm/types
 */

/**
 * Parameters accepted by the OpenRouter chat completion endpoint.
 * Union of streaming and non-streaming variants from the OpenAI SDK
 * (OpenRouter exposes an OpenAI-compatible API).
 *
 * Re-exported from `ILlmProvider` so callers import from one stable location.
 */
export type { OpenRouterChatParams } from './core/ILlmProvider.js';
