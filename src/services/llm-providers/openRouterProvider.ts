/**
 * @fileoverview Provides a service class (`OpenRouterProvider`) for interacting with the
 * OpenRouter API. This file implements the "handler" pattern internally, where the
 * OpenRouterProvider class manages state and error handling, while private logic functions
 * execute the core API interactions and throw structured errors.
 * @module src/services/llm-providers/openRouterProvider
 */
import OpenAI from "openai";
import {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources/chat/completions";
import { Stream } from "openai/streaming";
import { config } from "../../config/index.js";
import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import { ErrorHandler } from "../../utils/internal/errorHandler.js";
import { logger } from "../../utils/internal/logger.js";
import {
  RequestContext,
  requestContextService,
} from "../../utils/internal/requestContext.js";
import { rateLimiter } from "../../utils/security/rateLimiter.js";
import { sanitization } from "../../utils/security/sanitization.js";

// Note: OpenRouter recommends setting HTTP-Referer (e.g., config.openrouterAppUrl)
// and X-Title (e.g., config.openrouterAppName) headers.

/**
 * Options for configuring the OpenRouter client.
 */
export interface OpenRouterClientOptions {
  apiKey?: string;
  baseURL?: string;
  siteUrl?: string;
  siteName?: string;
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
  route?: "fallback";
  provider?: Record<string, unknown>;
};

// #region Internal Logic Functions (Throwing Errors)

/**
 * Prepares parameters for the OpenRouter API call, separating standard
 * and extra parameters and applying defaults.
 * @internal
 */
function _prepareApiParameters(params: OpenRouterChatParams) {
  const effectiveModelId = params.model || config.llmDefaultModel;

  const standardParams: Partial<
    ChatCompletionCreateParamsStreaming | ChatCompletionCreateParamsNonStreaming
  > = {
    model: effectiveModelId,
    messages: params.messages,
    ...(params.temperature !== undefined ||
    config.llmDefaultTemperature !== undefined
      ? { temperature: params.temperature ?? config.llmDefaultTemperature }
      : {}),
    ...(params.top_p !== undefined || config.llmDefaultTopP !== undefined
      ? { top_p: params.top_p ?? config.llmDefaultTopP }
      : {}),
    ...(params.presence_penalty !== undefined
      ? { presence_penalty: params.presence_penalty }
      : {}),
    ...(params.stream !== undefined && { stream: params.stream }),
    ...(params.tools !== undefined && { tools: params.tools }),
    ...(params.tool_choice !== undefined && {
      tool_choice: params.tool_choice,
    }),
    ...(params.response_format !== undefined && {
      response_format: params.response_format,
    }),
    ...(params.stop !== undefined && { stop: params.stop }),
    ...(params.seed !== undefined && { seed: params.seed }),
    ...(params.frequency_penalty !== undefined
      ? { frequency_penalty: params.frequency_penalty }
      : {}),
    ...(params.logit_bias !== undefined && { logit_bias: params.logit_bias }),
  };

  const extraBody: Record<string, unknown> = {};
  const standardKeys = new Set(Object.keys(standardParams));
  standardKeys.add("messages");

  for (const key in params) {
    if (
      Object.prototype.hasOwnProperty.call(params, key) &&
      !standardKeys.has(key) &&
      key !== "max_tokens"
    ) {
      extraBody[key] = (params as unknown as Record<string, unknown>)[key];
    }
  }

  if (extraBody.top_k === undefined && config.llmDefaultTopK !== undefined) {
    extraBody.top_k = config.llmDefaultTopK;
  }
  if (extraBody.min_p === undefined && config.llmDefaultMinP !== undefined) {
    extraBody.min_p = config.llmDefaultMinP;
  }
  if (
    extraBody.provider &&
    typeof extraBody.provider === "object" &&
    extraBody.provider !== null
  ) {
    const provider = extraBody.provider as Record<string, unknown>;
    if (!provider.sort) {
      provider.sort = "throughput";
    }
  } else if (extraBody.provider === undefined) {
    extraBody.provider = { sort: "throughput" };
  }

  const modelsRequiringMaxCompletionTokens = ["openai/o1", "openai/gpt-4.1"];
  const needsMaxCompletionTokens = modelsRequiringMaxCompletionTokens.some(
    (modelPrefix) => effectiveModelId.startsWith(modelPrefix),
  );
  const effectiveMaxTokensValue =
    params.max_tokens ?? config.llmDefaultMaxTokens;

  if (effectiveMaxTokensValue !== undefined) {
    if (needsMaxCompletionTokens) {
      extraBody.max_completion_tokens = effectiveMaxTokensValue;
    } else {
      standardParams.max_tokens = effectiveMaxTokensValue;
    }
  }

  return { standardParams, extraBody };
}

async function _openRouterChatCompletionLogic(
  client: OpenAI,
  params: OpenRouterChatParams,
  context: RequestContext,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
  const isStreaming = params.stream === true;

  const { standardParams, extraBody } = _prepareApiParameters(params);

  const apiParams = { ...standardParams };
  if (Object.keys(extraBody).length > 0) {
    (apiParams as Record<string, unknown>).extra_body = extraBody;
  }

  logger.logInteraction("OpenRouterRequest", {
    context,
    request: apiParams,
  });

  try {
    if (isStreaming) {
      return await client.chat.completions.create(
        apiParams as unknown as ChatCompletionCreateParamsStreaming,
      );
    }
    const response = await client.chat.completions.create(
      apiParams as unknown as ChatCompletionCreateParamsNonStreaming,
    );

    logger.logInteraction("OpenRouterResponse", {
      context,
      response,
      streaming: false,
    });

    return response;
  } catch (e: unknown) {
    const error = e as Error & { status?: number; cause?: unknown };
    logger.logInteraction("OpenRouterError", {
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
        BaseErrorCode.UNAUTHORIZED,
        `OpenRouter authentication failed: ${error.message}`,
        errorDetails,
      );
    } else if (error.status === 429) {
      throw new McpError(
        BaseErrorCode.RATE_LIMITED,
        `OpenRouter rate limit exceeded: ${error.message}`,
        errorDetails,
      );
    } else if (error.status === 402) {
      throw new McpError(
        BaseErrorCode.FORBIDDEN,
        `OpenRouter insufficient credits or payment required: ${error.message}`,
        errorDetails,
      );
    }
    throw new McpError(
      BaseErrorCode.INTERNAL_ERROR,
      `OpenRouter API error (${error.status || "unknown status"}): ${
        error.message
      }`,
      errorDetails,
    );
  }
}

class OpenRouterProvider {
  private client?: OpenAI;
  public status: "unconfigured" | "initializing" | "ready" | "error";
  private initializationError: Error | null = null;

  constructor() {
    this.status = "unconfigured";
  }

  public initialize(options?: OpenRouterClientOptions): void {
    const opContext = requestContextService.createRequestContext({
      operation: "OpenRouterProvider.initialize",
    });
    this.status = "initializing";

    const apiKey =
      options?.apiKey !== undefined ? options.apiKey : config.openrouterApiKey;
    if (!apiKey) {
      this.status = "unconfigured";
      this.initializationError = new McpError(
        BaseErrorCode.CONFIGURATION_ERROR,
        "OpenRouter API key is not configured.",
      );
      logger.error(this.initializationError.message, opContext);
      return;
    }

    try {
      this.client = new OpenAI({
        baseURL: options?.baseURL || "https://openrouter.ai/api/v1",
        apiKey,
        defaultHeaders: {
          "HTTP-Referer": options?.siteUrl || config.openrouterAppUrl,
          "X-Title": options?.siteName || config.openrouterAppName,
        },
        maxRetries: 0,
      });
      this.status = "ready";
      logger.info("OpenRouter Service Initialized and Ready", opContext);
    } catch (e: unknown) {
      const error = e as Error;
      this.status = "error";
      this.initializationError = error;
      logger.error("Failed to initialize OpenRouter client", {
        ...opContext,
        error: error.message,
      });
    }
  }

  private checkReady(operation: string, context: RequestContext): void {
    if (this.status !== "ready" || !this.client) {
      const message = `OpenRouter service is not available (status: ${this.status}).`;
      logger.error(`[${operation}] ${message}`, {
        ...context,
        status: this.status,
      });
      throw new McpError(BaseErrorCode.SERVICE_UNAVAILABLE, message, {
        cause: this.initializationError,
      });
    }
  }

  public async chatCompletion(
    params: OpenRouterChatParams,
    context: RequestContext,
  ): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
    const operation = "OpenRouterProvider.chatCompletion";
    const sanitizedParams = sanitization.sanitizeForLogging(params);

    return await ErrorHandler.tryCatch(
      async () => {
        this.checkReady(operation, context);
        const rateLimitKey = context.requestId || "openrouter_default_key";
        rateLimiter.check(rateLimitKey, context);
        return await _openRouterChatCompletionLogic(
          this.client!,
          params,
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
        logger.logInteraction("OpenRouterResponse", {
          context,
          response: chunks,
          streaming: true,
        });
      }
    }

    return loggingStream();
  }
}

const openRouterProviderInstance = new OpenRouterProvider();

export { openRouterProviderInstance as openRouterProvider, OpenRouterProvider };
