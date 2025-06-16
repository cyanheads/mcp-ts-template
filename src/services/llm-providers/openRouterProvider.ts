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
  OperationContext,
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
  provider?: Record<string, any>;
};

// #region Internal Logic Functions (Throwing Errors)

/**
 * Prepares parameters for the OpenRouter API call, separating standard
 * and extra parameters and applying defaults.
 * @internal
 */
function _prepareApiParameters(
  params: OpenRouterChatParams,
  context: RequestContext,
) {
  const operation = "openRouterLogic.prepareApiParameters";
  const effectiveModelId = params.model || config.llmDefaultModel;

  const standardParams: Partial<
    | ChatCompletionCreateParamsStreaming
    | ChatCompletionCreateParamsNonStreaming
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

  const extraBody: Record<string, any> = {};
  const standardKeys = new Set(Object.keys(standardParams));
  standardKeys.add("messages");

  for (const key in params) {
    if (
      Object.prototype.hasOwnProperty.call(params, key) &&
      !standardKeys.has(key) &&
      key !== "max_tokens"
    ) {
      extraBody[key] = (params as any)[key];
    }
  }

  if (extraBody.top_k === undefined && config.llmDefaultTopK !== undefined) {
    extraBody.top_k = config.llmDefaultTopK;
  }
  if (extraBody.min_p === undefined && config.llmDefaultMinP !== undefined) {
    extraBody.min_p = config.llmDefaultMinP;
  }
  if (extraBody.provider && typeof extraBody.provider === "object") {
    if (!extraBody.provider.sort) extraBody.provider.sort = "throughput";
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
      logger.info(
        `[${operation}] Using 'max_completion_tokens: ${effectiveMaxTokensValue}' for model ${effectiveModelId}.`,
        context,
      );
    } else {
      standardParams.max_tokens = effectiveMaxTokensValue;
      logger.info(
        `[${operation}] Using 'max_tokens: ${effectiveMaxTokensValue}' for model ${effectiveModelId}.`,
        context,
      );
    }
  }

  return { standardParams, extraBody };
}

/**
 * Core logic for making a chat completion request. Throws McpError on failure.
 * @internal
 */
async function _openRouterChatCompletionLogic(
  client: OpenAI,
  params: OpenRouterChatParams,
  context: RequestContext,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
  const operation = "openRouterLogic.chatCompletion";
  const isStreaming = params.stream === true;

  const { standardParams, extraBody } = _prepareApiParameters(params, context);

  const apiParams: any = { ...standardParams };
  if (Object.keys(extraBody).length > 0) {
    apiParams.extra_body = extraBody;
  }

  try {
    if (isStreaming) {
      return await client.chat.completions.create(
        apiParams as ChatCompletionCreateParamsStreaming,
      );
    }
    return await client.chat.completions.create(
      apiParams as ChatCompletionCreateParamsNonStreaming,
    );
  } catch (error: any) {
    logger.error(`[${operation}] API call failed`, {
      ...context,
      error: error.message,
      status: error.status,
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
      `OpenRouter API error (${error.status || "unknown status"}): ${error.message}`,
      errorDetails,
    );
  }
}

/**
 * Core logic for fetching the list of available models. Throws McpError on failure.
 * @internal
 */
async function _listModelsLogic(context: RequestContext): Promise<any> {
  const operation = "openRouterLogic.listModels";
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new McpError(
        BaseErrorCode.INTERNAL_ERROR,
        `OpenRouter list models API request failed with status ${response.status}.`,
        { providerStatus: response.status, providerMessage: errorBody },
      );
    }
    return await response.json();
  } catch (error: any) {
    logger.error(`[${operation}] Error listing models`, {
      ...context,
      error: error.message,
    });
    if (error instanceof McpError) throw error;
    throw new McpError(
      BaseErrorCode.SERVICE_UNAVAILABLE,
      `Network or unexpected error listing OpenRouter models: ${error.message}`,
      { cause: error },
    );
  }
}

// #endregion

/**
 * Service class for interacting with the OpenRouter API.
 * Acts as a "handler" that manages state, configuration, and error handling,
 * wrapping calls to the internal core logic functions.
 */
class OpenRouterProvider {
  private client?: OpenAI;
  public status: "unconfigured" | "initializing" | "ready" | "error";
  private initializationError: Error | null = null;

  constructor(
    options?: OpenRouterClientOptions,
    parentOpContext?: OperationContext,
  ) {
    const opContext = requestContextService.createRequestContext({
      operation: "OpenRouterProvider.constructor",
      parentRequestId: parentOpContext?.requestId,
    });
    this.status = "initializing";

    const apiKey = options?.apiKey || config.openrouterApiKey;
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
      });
      this.status = "ready";
      logger.info("OpenRouter Service Initialized and Ready", opContext);
    } catch (error: any) {
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
      logger.error(`[${operation}] ${message}`, { ...context, status: this.status });
      throw new McpError(BaseErrorCode.SERVICE_UNAVAILABLE, message, {
        cause: this.initializationError,
      });
    }
  }

  async chatCompletion(
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

        const result = await _openRouterChatCompletionLogic(
          this.client!,
          params,
          context,
        );

        logger.info(`[${operation}] Request successful`, {
          ...context,
          model: params.model,
          streaming: params.stream,
        });
        return result;
      },
      { operation, context, input: sanitizedParams },
    );
  }

  async listModels(context: RequestContext): Promise<any> {
    const operation = "OpenRouterProvider.listModels";
    return await ErrorHandler.tryCatch(
      async () => {
        this.checkReady(operation, context);
        const models = await _listModelsLogic(context);
        logger.info(`[${operation}] Successfully listed models`, context);
        return models;
      },
      { operation, context },
    );
  }
}

const openRouterProviderInstance = new OpenRouterProvider();

export { openRouterProviderInstance as openRouterProvider };
export type { OpenRouterProvider };
