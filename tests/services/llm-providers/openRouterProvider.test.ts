import { describe, expect, it } from "vitest";
import { OpenRouterProvider } from "../../../src/services/llm-providers/openRouterProvider";
import { BaseErrorCode } from "../../../src/types-global/errors";
import { requestContextService } from "../../../src/utils";
import { errorHandlers } from "../../mocks/handlers";
import { server } from "../../mocks/server";

describe("OpenRouterProvider", () => {
  const context = requestContextService.createRequestContext({
    toolName: "testTool",
  });

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
    server.use(errorHandlers.unauthorized);
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
    server.use(errorHandlers.rateLimited);
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
    server.use(errorHandlers.internalError);
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
