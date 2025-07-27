/**
 * @fileoverview Tests for the registration of the get_random_cat_fact tool.
 * @module tests/mcp-server/tools/catFactFetcher/registration.test
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCatFactFetcherTool } from "../../../../src/mcp-server/tools/catFactFetcher/registration";
import * as logic from "../../../../src/mcp-server/tools/catFactFetcher/logic";
import { BaseErrorCode, McpError } from "../../../../src/types-global/errors";

// Mock the logic module
vi.mock("../../../../src/mcp-server/tools/catFactFetcher/logic");

describe("registerCatFactFetcherTool", () => {
  const mockMcpServer = {
    registerTool: vi.fn(),
  } as unknown as McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call server.registerTool with the correct parameters", async () => {
    await registerCatFactFetcherTool(mockMcpServer);

    expect(mockMcpServer.registerTool).toHaveBeenCalledOnce();
    const [name, metadata, handler] = (
      mockMcpServer.registerTool as Mock
    ).mock.calls[0];

    expect(name).toBe("get_random_cat_fact");
    expect(metadata.title).toBe("Get Random Cat Fact");
    expect(typeof handler).toBe("function");
  });

  it("handler should correctly format a successful response", async () => {
    const mockLogicResponse = {
      fact: "Cats are awesome",
      length: 17,
      timestamp: new Date().toISOString(),
    };
    vi.spyOn(logic, "catFactFetcherLogic").mockResolvedValue(
      mockLogicResponse
    );

    await registerCatFactFetcherTool(mockMcpServer);
    const handler = (mockMcpServer.registerTool as Mock).mock.calls[0][2];
    const result = await handler({ maxLength: 140 });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual(mockLogicResponse);
    expect(result.content[0].text).toContain("Cats are awesome");
  });

  it("handler should return an error structure when the logic function throws", async () => {
    const errorMessage = "API is down";
    vi.spyOn(logic, "catFactFetcherLogic").mockRejectedValue(
      new McpError(BaseErrorCode.SERVICE_UNAVAILABLE, errorMessage)
    );

    await registerCatFactFetcherTool(mockMcpServer);
    const handler = (mockMcpServer.registerTool as Mock).mock.calls[0][2];
    const result = await handler({ maxLength: 140 });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(errorMessage);
    expect(result.structuredContent).toHaveProperty("code", BaseErrorCode.SERVICE_UNAVAILABLE);
  });
});
