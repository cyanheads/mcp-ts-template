/**
 * @fileoverview Tests for the fetchWithTimeout utility using real HTTP endpoints.
 * @module tests/utils/network/fetchWithTimeout.test
 */
import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { fetchWithTimeout } from "../../../src/utils/network/fetchWithTimeout";
import { requestContextService } from "../../../src/utils";
import { McpError } from "../../../src/types-global/errors";
import { server } from "../../mocks/server";

// Using httpbin.org for real HTTP testing
const HTTPBIN_BASE = "https://httpbin.org";

describe("fetchWithTimeout", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  const parentRequestContext = requestContextService.createRequestContext({
    toolName: "test-parent",
  });

  it("should successfully fetch data within the timeout", async () => {
    const response = await fetchWithTimeout(
      `${HTTPBIN_BASE}/json`,
      10000,
      parentRequestContext,
    );
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data).toHaveProperty("slideshow");
  });

  it("should handle HTTP error status codes gracefully", async () => {
    await expect(
      fetchWithTimeout(
        `${HTTPBIN_BASE}/status/500`,
        5000,
        parentRequestContext,
      ),
    ).rejects.toThrow(McpError);
  });

  it("should handle POST requests correctly", async () => {
    const requestBody = { key: "value", test: true };

    const response = await fetchWithTimeout(
      `${HTTPBIN_BASE}/post`,
      10000,
      parentRequestContext,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      },
    );

    const responseData = await response.json();

    expect(response.ok).toBe(true);
    expect(responseData.json).toEqual(requestBody);
    expect(responseData.headers["Content-Type"]).toBe("application/json");
  });
});
