import { generateMock } from "@anatine/zod-mock";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import {
  CatFactFetcherInputSchema,
  catFactFetcherLogic,
  CatFactFetcherResponseSchema,
} from "../../../../src/mcp-server/tools/catFactFetcher/logic";
import * as networkUtils from "../../../../src/utils/network";

// Mock the fetchWithTimeout utility
vi.mock("../../../../src/utils/network", () => ({
  fetchWithTimeout: vi.fn(),
}));

describe("catFactFetcherLogic", () => {
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

    const result = await catFactFetcherLogic(mockInput);
    const validation = CatFactFetcherResponseSchema.safeParse(result);

    expect(validation.success).toBe(true);
    if (validation.success) {
      expect(result.fact).toBe(mockApiResponse.fact);
      expect(result.length).toBe(mockApiResponse.length);
    }
  });
});
