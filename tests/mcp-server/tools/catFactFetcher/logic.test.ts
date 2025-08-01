import { generateMock } from "@anatine/zod-mock";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  CatFactFetcherInputSchema,
  catFactFetcherLogic,
  CatFactFetcherResponseSchema,
} from "../../../../src/mcp-server/tools/catFactFetcher/logic";
import { BaseErrorCode, McpError } from "../../../../src/types-global/errors";
import { requestContextService } from "../../../../src/utils";
import * as networkUtils from "../../../../src/utils/network";

// Mock the fetchWithTimeout utility
vi.mock("../../../../src/utils/network", () => ({
  fetchWithTimeout: vi.fn(),
}));

describe("catFactFetcherLogic", () => {
  const context = requestContextService.createRequestContext({
    toolName: "get_random_cat_fact",
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return a valid cat fact on successful API call", async () => {
    const mockInput = generateMock(CatFactFetcherInputSchema);
    const mockApiResponse = {
      fact: "Cats are cool.",
      length: 14,
    };

    (networkUtils.fetchWithTimeout as Mock).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await catFactFetcherLogic(mockInput, context);
    const validation = CatFactFetcherResponseSchema.safeParse(result);

    expect(validation.success).toBe(true);
    if (validation.success) {
      expect(result.fact).toBe(mockApiResponse.fact);
      expect(result.length).toBe(mockApiResponse.length);
    }
  });

  it("should throw an McpError on failed API call", async () => {
    const mockInput = generateMock(CatFactFetcherInputSchema);

    (networkUtils.fetchWithTimeout as Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => "Server error",
    });

    await expect(catFactFetcherLogic(mockInput, context)).rejects.toThrow(
      McpError,
    );
    await expect(
      catFactFetcherLogic(mockInput, context),
    ).rejects.toHaveProperty("code", BaseErrorCode.SERVICE_UNAVAILABLE);
  });

  it("should construct the correct URL with maxLength parameter", async () => {
    const mockInput = { maxLength: 50 };
    const mockApiResponse = {
      fact: "Short fact.",
      length: 11,
    };

    (networkUtils.fetchWithTimeout as Mock).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    await catFactFetcherLogic(mockInput, context);

    expect(networkUtils.fetchWithTimeout).toHaveBeenCalledWith(
      "https://catfact.ninja/fact?max_length=50",
      expect.any(Number),
      context,
    );
  });
});
