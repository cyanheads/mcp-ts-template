/**
 * @fileoverview Tests for the StatelessTransportManager.
 * @module tests/mcp-server/transports/core/statelessTransportManager.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { StatelessTransportManager } from "../../../../src/mcp-server/transports/core/statelessTransportManager.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requestContextService } from "../../../../src/utils/index.js";
import type { IncomingMessage, ServerResponse } from "http";

vi.mock("@modelcontextprotocol/sdk/server/mcp.js");

const mockTransportInstance = {
  handleRequest: vi.fn(),
  close: vi.fn(),
  connect: vi.fn(),
  onclose: vi.fn(),
  options: {},
};
vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => ({
  StreamableHTTPServerTransport: vi
    .fn()
    .mockImplementation(() => mockTransportInstance),
}));

describe("StatelessTransportManager", () => {
  let manager: StatelessTransportManager;
  let mockCreateServer: () => Promise<McpServer>;
  let mockServer: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = new (vi.mocked(McpServer))({ name: "test", version: "1" });
    mockCreateServer = vi.fn().mockResolvedValue(mockServer);
    manager = new StatelessTransportManager(mockCreateServer);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockReq = {} as IncomingMessage;
  const mockRes = {
    writeHead: vi.fn(),
    end: vi.fn(),
  } as unknown as ServerResponse;
  const context = requestContextService.createRequestContext({
    toolName: "test",
  });

  describe("handleRequest", () => {
    it("should create, use, and clean up resources for each request", async () => {
      await manager.handleRequest(mockReq, mockRes, {}, context);

      expect(mockCreateServer).toHaveBeenCalledOnce();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransportInstance);
      expect(mockTransportInstance.handleRequest).toHaveBeenCalledWith(
        mockReq,
        mockRes,
        {},
      );

      // Cleanup is async, so we need to wait for promises to resolve
      await new Promise(process.nextTick);

      expect(mockTransportInstance.close).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
    });

    it("should clean up resources even if handleRequest throws an error", async () => {
      const testError = new Error("Test error");
      mockTransportInstance.handleRequest.mockRejectedValue(testError);

      await expect(
        manager.handleRequest(mockReq, mockRes, {}, context),
      ).rejects.toThrow(testError);

      // Cleanup is async
      await new Promise(process.nextTick);

      expect(mockTransportInstance.close).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
    });
  });

  describe("shutdown", () => {
    it("should log a debug message and do nothing else", async () => {
      const loggerSpy = vi.spyOn(
        (await import("../../../../src/utils/index.js")).logger,
        "debug",
      );
      await manager.shutdown();
      expect(loggerSpy).toHaveBeenCalledWith(
        "Stateless transport manager shutdown - no action needed",
      );
    });
  });
});
