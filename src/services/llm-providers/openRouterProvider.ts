/**
 * @fileoverview Provides a service class (`OpenRouterProvider`) for interacting with the
 * OpenRouter API. This file implements the "handler" pattern internally, where the
 * OpenRouterProvider class manages state and error handling, while private logic functions
 * execute the core API interactions and throw structured errors.
 * @module src/services/llm-providers/openRouterProvider
 */
import OpenAI from 'openai';
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'openai/resources/chat/completions';
import { Stream } from 'openai/streaming';

import { config } from '../../config/index.js';
import { JsonRpcErrorCode, McpError } from '../../types-global/errors.js';
import { ErrorHandler } from '../../utils/internal/errorHandler.js';
import { logger } from '../../utils/internal/logger.js';
import {
  RequestContext,
  requestContextService,
} from '../../utils/internal/requestContext.js';
import { rateLimiter } from '../../utils/security/rateLimiter.js';
import { sanitization } from '../../utils/security/sanitization.js';

// Note: OpenRouter recommends setting HTTP-Referer (e.g., config.openrouterAppUrl)
// and X-Title (e.g., config.openrouterAppName) headers.

/**
 * Options for configuring the OpenRouter client.
 */
export interface OpenRouterClientOptions {
  apiKey: string;
  baseURL?: string;
  siteUrl: string;
  siteName: string;
}

/**
 * Defines the parameters for an OpenRouter chat completion request.
 */
export type OpenRouterChatParams = (
  | ChatCompletionCreateParamsNonStreaming
  | ChatCompletionCreateParamsStreaming
) & {
  top_k?: number;
  min_p?: number;
  transforms?: string[];
  models?: string[];
  route?: 'fallback';
  provider?: Record<string, unknown>;
};

// #region Internal Logic Functions (Throwing Errors)

async function _openRouterChatCompletionLogic(
  client: OpenAI,
  params: OpenRouterChatParams,
  context: RequestContext,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
  logger.logInteraction('OpenRouterRequest', {
    context,
    request: params,
  });

  try {
    const isStreaming = params.stream === true;
    if (isStreaming) {
      return await client.chat.completions.create(
        params as unknown as ChatCompletionCreateParamsStreaming,
      );
    }
    const response = await client.chat.completions.create(
      params as unknown as ChatCompletionCreateParamsNonStreaming,
    );

    logger.logInteraction('OpenRouterResponse', {
      context,
      response,
      streaming: false,
    });

    return response;
  } catch (e: unknown) {
    const error = e as Error & { status?: number; cause?: unknown };
    logger.logInteraction('OpenRouterError', {
      context,
      error: {
        message: error.message,
        stack: error.stack,
        status: error.status,
        cause: error.cause,
      },
    });
    const errorDetails = {
      providerStatus: error.status,
      providerMessage: error.message,
      cause: error?.cause,
    };
    if (error.status === 401) {
      throw new McpError(
        JsonRpcErrorCode.Unauthorized,
        `OpenRouter authentication failed: ${error.message}`,
        errorDetails,
      );
    } else if (error.status === 429) {
      throw new McpError(
        JsonRpcErrorCode.RateLimited,
        `OpenRouter rate limit exceeded: ${error.message}`,
        errorDetails,
      );
    } else if (error.status === 402) {
      throw new McpError(
        JsonRpcErrorCode.Forbidden,
        `OpenRouter insufficient credits or payment required: ${error.message}`,
        errorDetails,
      );
    }
    throw new McpError(
      JsonRpcErrorCode.InternalError,
      `OpenRouter API error (${error.status || 'unknown status'}): ${
        error.message
      }`,
      errorDetails,
    );
  }
}

// #endregion

export class OpenRouterProvider {
  private readonly client: OpenAI;
  private readonly defaultParams: {
    model: string;
    temperature: number | undefined;
    topP: number | undefined;
    maxTokens: number | undefined;
    topK: number | undefined;
    minP: number | undefined;
  };

  constructor(
    options: OpenRouterClientOptions,
    defaultParams: OpenRouterProvider['defaultParams'],
  ) {
    const context = requestContextService.createRequestContext({
      operation: 'OpenRouterProvider.constructor',
    });

    try {
      this.client = new OpenAI({
        baseURL: options.baseURL || 'https://openrouter.ai/api/v1',
        apiKey: options.apiKey,
        defaultHeaders: {
          'HTTP-Referer': options.siteUrl,
          'X-Title': options.siteName,
        },
        maxRetries: 0,
      });
      this.defaultParams = defaultParams;
      logger.info('OpenRouter provider instance created and ready.', context);
    } catch (e: unknown) {
      const error = e as Error;
      logger.error('Failed to construct OpenRouter client', {
        ...context,
        error: error.message,
      });
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'Failed to construct OpenRouter client. Please check the configuration.',
        { cause: error },
      );
    }
  }

  private _prepareApiParameters(params: OpenRouterChatParams) {
    const {
      model = this.defaultParams.model,
      messages,
      temperature = this.defaultParams.temperature,
      top_p = this.defaultParams.topP,
      stream = false,
      max_tokens = this.defaultParams.maxTokens,
      tools,
      tool_choice,
      response_format,
      stop,
      seed,
      frequency_penalty,
      presence_penalty,
      logit_bias,
      ...extraParams
    } = params;

    const standardParams = {
      model,
      messages,
      temperature,
      top_p,
      stream,
      max_tokens,
      tools,
      tool_choice,
      response_format,
      stop,
      seed,
      frequency_penalty,
      presence_penalty,
      logit_bias,
    };

    // Filter out undefined values from standardParams
    Object.keys(standardParams).forEach(
      (key) =>
        (standardParams as Record<string, unknown>)[key] === undefined &&
        delete (standardParams as Record<string, unknown>)[key],
    );

    // Add default OpenRouter-specific params if not provided
    if (
      extraParams.top_k === undefined &&
      this.defaultParams.topK !== undefined
    ) {
      extraParams.top_k = this.defaultParams.topK;
    }
    if (
      extraParams.min_p === undefined &&
      this.defaultParams.minP !== undefined
    ) {
      extraParams.min_p = this.defaultParams.minP;
    }

    return { ...standardParams, ...extraParams };
  }

  public async chatCompletion(
    params: OpenRouterChatParams,
    context: RequestContext,
  ): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
    const operation = 'OpenRouterProvider.chatCompletion';
    const sanitizedParams = sanitization.sanitizeForLogging(params);

    return await ErrorHandler.tryCatch(
      async () => {
        const rateLimitKey = context.requestId || 'openrouter_default_key';
        rateLimiter.check(rateLimitKey, context);

        const finalApiParams = this._prepareApiParameters(
          params,
        ) as OpenRouterChatParams;

        return await _openRouterChatCompletionLogic(
          this.client,
          finalApiParams,
          context,
        );
      },
      { operation, context, input: sanitizedParams },
    );
  }

  public async chatCompletionStream(
    params: OpenRouterChatParams,
    context: RequestContext,
  ): Promise<AsyncIterable<ChatCompletionChunk>> {
    const streamParams = { ...params, stream: true };
    const response = await this.chatCompletion(streamParams, context);
    const responseStream = response as Stream<ChatCompletionChunk>;

    async function* loggingStream(): AsyncGenerator<ChatCompletionChunk> {
      const chunks: ChatCompletionChunk[] = [];
      try {
        for await (const chunk of responseStream) {
          chunks.push(chunk);
          yield chunk;
        }
      } finally {
        logger.logInteraction('OpenRouterResponse', {
          context,
          response: chunks,
          streaming: true,
        });
      }
    }

    return loggingStream();
  }
}

/**
 * Factory function to create and configure an OpenRouterProvider instance.
 * @returns A configured instance of OpenRouterProvider.
 * @throws {McpError} if required configuration is missing.
 */
function createOpenRouterProvider(): OpenRouterProvider {
  const opContext = requestContextService.createRequestContext({
    operation: 'createOpenRouterProvider',
  });
  if (!config.openrouterApiKey) {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'OpenRouter API key (OPENROUTER_API_KEY) is not configured.',
      opContext,
    );
  }

  const options: OpenRouterClientOptions = {
    apiKey: config.openrouterApiKey,
    siteUrl: config.openrouterAppUrl,
    siteName: config.openrouterAppName,
  };

  const defaultParams = {
    model: config.llmDefaultModel,
    temperature: config.llmDefaultTemperature,
    topP: config.llmDefaultTopP,
    maxTokens: config.llmDefaultMaxTokens,
    topK: config.llmDefaultTopK,
    minP: config.llmDefaultMinP,
  };

  return new OpenRouterProvider(options, defaultParams);
}

// Create and export the singleton instance
export const openRouterProvider = createOpenRouterProvider();
