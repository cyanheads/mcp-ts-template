/**
 * @fileoverview Tests for the OpenRouter LLM provider.
 * @module tests/services/llm-providers/openRouterProvider.test
 */
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { OpenRouterProvider } from "../../../src/services/llm-providers/openRouterProvider";
import { BaseErrorCode } from "../../../src/types-global/errors";
import { requestContextService } from "../../../src/utils";

// Create a separate MSW server for OpenRouter tests only
const openRouterTestServer = setupServer();

describe("OpenRouterProvider", () => {
  const context = requestContextService.createRequestContext({
    toolName: "testTool",
  });

  beforeAll(() => {
    // Start the OpenRouter-specific test server
    openRouterTestServer.listen({
      onUnhandledRequest: "bypass", // Don't interfere with other requests
    });
  });

  afterEach(() => openRouterTestServer.resetHandlers());
  afterAll(() => openRouterTestServer.close());

  it("should throw a SERVICE_UNAVAILABLE error if chatCompletion is called without initialization", async () => {
    const provider = new OpenRouterProvider(); // Fresh instance
    const params = {
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user" as const, content: "Hello!" }],
    };
    await expect(provider.chatCompletion(params, context)).rejects.toThrow(
      expect.objectContaining({ code: BaseErrorCode.SERVICE_UNAVAILABLE }),
    );
  });

  it('should have status "unconfigured" if initialized without an API key', () => {
    const provider = new OpenRouterProvider();
    provider.initialize({ apiKey: "" }); // Force initialization without a key
    expect(provider.status).toBe("unconfigured");
  });

  it("should successfully make a chat completion request", async () => {
    // Mock successful response
    openRouterTestServer.use(
      http.post("https://openrouter.ai/api/v1/chat/completions", () => {
        return HttpResponse.json({
          id: "chatcmpl-123",
          object: "chat.completion",
          created: 1677652288,
          model: "google/gemini-2.5-flash",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Hello!",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 9,
            completion_tokens: 12,
            total_tokens: 21,
          },
        });
      }),
    );

    const provider = new OpenRouterProvider();
    provider.initialize({ apiKey: "test-key" });
    const params = {
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user" as const, content: "Hello!" }],
    };
    const response = await provider.chatCompletion(params, context);
    expect(response).toHaveProperty("id");
    expect(response).toHaveProperty("choices");
  });

  it("should throw an UNAUTHORIZED McpError on a 401 response", async () => {
    openRouterTestServer.use(
      http.post("https://openrouter.ai/api/v1/chat/completions", () => {
        return new HttpResponse(
          JSON.stringify({ error: { message: "Incorrect API key provided" } }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const provider = new OpenRouterProvider();
    provider.initialize({ apiKey: "invalid-key" });
    const params = {
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user" as const, content: "Hello!" }],
    };
    await expect(
      provider.chatCompletion(params, context),
    ).rejects.toHaveProperty("code", BaseErrorCode.UNAUTHORIZED);
  });

  it("should throw a RATE_LIMITED McpError on a 429 response", async () => {
    openRouterTestServer.use(
      http.post("https://openrouter.ai/api/v1/chat/completions", () => {
        return new HttpResponse(
          JSON.stringify({ error: { message: "Rate limit exceeded" } }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const provider = new OpenRouterProvider();
    provider.initialize({ apiKey: "test-key" });
    const params = {
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user" as const, content: "Hello!" }],
    };
    await expect(
      provider.chatCompletion(params, context),
    ).rejects.toHaveProperty("code", BaseErrorCode.RATE_LIMITED);
  });

  it("should throw an INTERNAL_ERROR McpError on a 500 response", async () => {
    openRouterTestServer.use(
      http.post("https://openrouter.ai/api/v1/chat/completions", () => {
        return new HttpResponse(
          JSON.stringify({ error: { message: "Internal server error" } }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );

    const provider = new OpenRouterProvider();
    provider.initialize({ apiKey: "test-key" });
    const params = {
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user" as const, content: "Hello!" }],
    };
    await expect(
      provider.chatCompletion(params, context),
    ).rejects.toHaveProperty("code", BaseErrorCode.INTERNAL_ERROR);
  });
});
