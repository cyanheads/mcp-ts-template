/**
 * @fileoverview Tests for the fetchWithTimeout utility.
 * @module tests/utils/network/fetchWithTimeout.test
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { fetchWithTimeout } from "../../../src/utils/network/fetchWithTimeout";
import { requestContextService } from "../../../src/utils";
import { McpError, BaseErrorCode } from "../../../src/types-global/errors";

const MOCK_API_URL = "https://api.example.com/data";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchWithTimeout", () => {
  const parentRequestContext = requestContextService.createRequestContext({
    toolName: "test-parent",
  });

  it("should successfully fetch data within the timeout", async () => {
    server.use(
      http.get(MOCK_API_URL, () => {
        return HttpResponse.json({ message: "Success" });
      }),
    );

    const response = await fetchWithTimeout(
      MOCK_API_URL,
      5000,
      parentRequestContext,
    );
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data).toEqual({ message: "Success" });
  });

  it("should throw a timeout error if the request takes too long", async () => {
    server.use(
      http.get(MOCK_API_URL, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json({ message: "Delayed success" });
      }),
    );

    await expect(
      fetchWithTimeout(MOCK_API_URL, 100, parentRequestContext),
    ).rejects.toThrow(McpError);

    try {
      await fetchWithTimeout(MOCK_API_URL, 100, parentRequestContext);
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.TIMEOUT);
      expect(mcpError.message).toContain("timed out");
    }
  });

  it("should handle network errors gracefully", async () => {
    server.use(
      http.get(MOCK_API_URL, () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    const response = await fetchWithTimeout(
      MOCK_API_URL,
      5000,
      parentRequestContext,
    );
    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });

  it("should throw an McpError for other fetch-related errors", async () => {
    server.use(
      http.get(MOCK_API_URL, () => {
        // Simulate a network error by not returning a valid response
        return new Response(null, { status: 0, statusText: "Network Error" });
      }),
    );

    // This test is a bit tricky with MSW, as it doesn't easily simulate
    // a full network failure. We'll check for the wrapping behavior.
    // A real network error would be caught and wrapped.
    // For the test, we'll mock the global fetch.
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      fetchWithTimeout(MOCK_API_URL, 100, parentRequestContext),
    ).rejects.toThrow(McpError);

    try {
      await fetchWithTimeout(MOCK_API_URL, 100, parentRequestContext);
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.SERVICE_UNAVAILABLE);
      expect(mcpError.message).toContain("Network error");
    }

    global.fetch = originalFetch; // Restore original fetch
  });

  it("should handle POST requests correctly", async () => {
    const requestBody = { key: "value" };
    let receivedBody;

    server.use(
      http.post(MOCK_API_URL, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ received: receivedBody });
      }),
    );

    const response = await fetchWithTimeout(
      MOCK_API_URL,
      5000,
      parentRequestContext,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    );

    const responseData = await response.json();

    expect(response.ok).toBe(true);
    expect(receivedBody).toEqual(requestBody);
    expect(responseData).toEqual({ received: requestBody });
  });
});
