/**
 * @fileoverview Defines the `ILlmProvider` interface — the contract all LLM provider
 * implementations must satisfy. Also exports `OpenRouterChatParams`, the union type
 * representing valid parameters for OpenRouter chat completion requests (both streaming
 * and non-streaming), derived from the OpenAI SDK types since OpenRouter exposes an
 * OpenAI-compatible API surface.
 * @module src/services/llm/core/ILlmProvider
 */
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'openai/resources/chat/completions';
import type { Stream } from 'openai/streaming';

import type { RequestContext } from '@/utils/internal/requestContext.js';

/**
 * Union of the OpenAI SDK's non-streaming and streaming chat completion parameter
 * shapes. OpenRouter accepts the same request structure, so this type covers all
 * valid call forms. The `stream` discriminant field determines which branch applies
 * at runtime.
 *
 * @example
 * ```ts
 * const params: OpenRouterChatParams = {
 *   model: 'openai/gpt-4o',
 *   messages: [{ role: 'user', content: 'Hello' }],
 *   stream: false,
 * };
 * ```
 */
export type OpenRouterChatParams =
  | ChatCompletionCreateParamsNonStreaming
  | ChatCompletionCreateParamsStreaming;

/**
 * Provider-agnostic interface for interacting with a Large Language Model.
 * Implementations must support both one-shot and streaming chat completions.
 * Coding against this interface (rather than a concrete provider) allows the
 * application to swap providers without changing call sites.
 */
export interface ILlmProvider {
  /**
   * Sends a chat completion request. Supports both streaming and non-streaming
   * modes determined by `params.stream`.
   *
   * @param params - Chat completion parameters. Set `params.stream = true` to
   *   receive a `Stream<ChatCompletionChunk>` in return; omit or set `false` for
   *   a resolved `ChatCompletion` object.
   * @param context - Request context used for correlated logging and tracing.
   * @returns A `ChatCompletion` for non-streaming calls, or a
   *   `Stream<ChatCompletionChunk>` for streaming calls.
   * @throws {McpError} `ServiceUnavailable` if the upstream provider is
   *   unreachable, `ConfigurationError` if the client is misconfigured, or
   *   `RateLimited` if the rate limit is exceeded.
   *
   * @example
   * ```ts
   * const completion = await provider.chatCompletion(
   *   { model: 'openai/gpt-4o', messages: [{ role: 'user', content: 'Hi' }] },
   *   ctx,
   * ) as ChatCompletion;
   * console.log(completion.choices[0].message.content);
   * ```
   */
  chatCompletion(
    params: OpenRouterChatParams,
    context: RequestContext,
  ): Promise<ChatCompletion | Stream<ChatCompletionChunk>>;

  /**
   * Sends a streaming chat completion request and returns an async iterable of
   * chunks. Internally forces `params.stream = true` and logs the full collected
   * response after the stream is exhausted.
   *
   * @param params - Chat completion parameters. The `stream` flag is overridden
   *   to `true` regardless of what is passed.
   * @param context - Request context used for correlated logging and tracing.
   * @returns An async iterable that yields `ChatCompletionChunk` objects as they
   *   arrive from the provider.
   * @throws {McpError} `ServiceUnavailable` if the upstream provider is
   *   unreachable, `ConfigurationError` if the client is misconfigured, or
   *   `RateLimited` if the rate limit is exceeded.
   *
   * @example
   * ```ts
   * const stream = await provider.chatCompletionStream(
   *   { model: 'openai/gpt-4o', messages: [{ role: 'user', content: 'Hi' }] },
   *   ctx,
   * );
   * for await (const chunk of stream) {
   *   process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
   * }
   * ```
   */
  chatCompletionStream(
    params: OpenRouterChatParams,
    context: RequestContext,
  ): Promise<AsyncIterable<ChatCompletionChunk>>;
}
