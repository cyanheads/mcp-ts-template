/**
 * @fileoverview Tests for the McpTransportManager.
 * @module tests/mcp-server/transports/core/mcpTransportManager.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { StatefulTransportManager } from "../../../../src/mcp-server/transports/core/statefulTransportManager.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  BaseErrorCode,
  McpError,
} from "../../../../src/types-global/errors.js";
import { requestContextService } from "../../../../src/utils/index.js";
import type { IncomingMessage, ServerResponse } from "http";

// Mock SDK classes
vi.mock("@modelcontextprotocol/sdk/server/mcp.js");

// Custom mock for StreamableHTTPServerTransport to handle session initialization
const mockTransportInstance = {
  handleRequest: vi.fn(),
  close: vi.fn(),
  connect: vi.fn(),
  onclose: vi.fn(),
  options: {},
};
vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => {
  return {
    StreamableHTTPServerTransport: vi.fn().mockImplementation((options) => {
      mockTransportInstance.options = options;
      mockTransportInstance.handleRequest.mockImplementation(async () => {
        if (options.onsessioninitialized) {
          options.onsessioninitialized("test-session-id");
        }
      });
      return mockTransportInstance;
    }),
  };
});

describe("StatefulTransportManager", () => {
  let manager: StatefulTransportManager;
  let mockCreateServer: () => Promise<McpServer>;
  let mockServer: McpServer;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockServer = new (vi.mocked(McpServer))({ name: "test", version: "1" });
    mockCreateServer = vi.fn().mockResolvedValue(mockServer);
    manager = new StatefulTransportManager(mockCreateServer);
  });

  afterEach(() => {
    vi.useRealTimers();
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

  describe("initializeAndHandle", () => {
    it("should create a new server and transport for a new session", async () => {
      await manager.initializeAndHandle(mockReq, mockRes, {}, context);
      expect(mockCreateServer).toHaveBeenCalledOnce();
      expect(mockServer.connect).toHaveBeenCalledWith(mockTransportInstance);
      expect(manager.getSession("test-session-id")).toBeDefined();
    });
  });

  describe("handleRequest", () => {
    it("should delegate to the correct transport for a valid session", async () => {
      await manager.initializeAndHandle(mockReq, mockRes, {}, context);
      await manager.handleRequest(
        mockReq,
        mockRes,
        {},
        context,
        "test-session-id",
      );
      expect(mockTransportInstance.handleRequest).toHaveBeenCalledTimes(2);
    });

    it("should update the lastAccessedAt timestamp for the session", async () => {
      await manager.initializeAndHandle(mockReq, mockRes, {}, context);
      const initialSession = manager.getSession("test-session-id");
      const initialTime = initialSession?.lastAccessedAt.getTime();

      vi.advanceTimersByTime(1000);
      await manager.handleRequest(
        mockReq,
        mockRes,
        {},
        context,
        "test-session-id",
      );

      const updatedSession = manager.getSession("test-session-id");
      expect(updatedSession?.lastAccessedAt.getTime()).toBeGreaterThan(
        initialTime!,
      );
    });

    it("should return a 404 JSON-RPC error for a non-existent session", async () => {
      await manager.handleRequest(
        mockReq,
        mockRes,
        {},
        context,
        "non-existent-id",
      );
      expect(mockRes.writeHead).toHaveBeenCalledWith(404, {
        "Content-Type": "application/json",
      });
      expect(mockRes.end).toHaveBeenCalledWith(
        expect.stringContaining("Session not found"),
      );
    });
  });

  describe("handleDeleteRequest", () => {
    it("should close the session and return a 200 response", async () => {
      await manager.initializeAndHandle(mockReq, mockRes, {}, context);
      const response = await manager.handleDeleteRequest(
        "test-session-id",
        context,
      );
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        status: "session_closed",
        sessionId: "test-session-id",
      });
      expect(manager.getSession("test-session-id")).toBeUndefined();
    });

    it("should throw NOT_FOUND McpError for a non-existent session", async () => {
      await expect(
        manager.handleDeleteRequest("non-existent-id", context),
      ).rejects.toThrow(McpError);
      await expect(
        manager.handleDeleteRequest("non-existent-id", context),
      ).rejects.toMatchObject({
        code: BaseErrorCode.NOT_FOUND,
      });
    });
  });

  describe("cleanupStaleSessions", () => {
    it("should identify and close a session that has timed out", async () => {
      await manager.initializeAndHandle(mockReq, mockRes, {}, context);
      expect(manager.getSession("test-session-id")).toBeDefined();

      // Advance time past the stale timeout
      vi.advanceTimersByTime(31 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();

      expect(manager.getSession("test-session-id")).toBeUndefined();
      expect(mockServer.close).toHaveBeenCalled();
    });

    it("should not close an active session", async () => {
      await manager.initializeAndHandle(mockReq, mockRes, {}, context);
      expect(manager.getSession("test-session-id")).toBeDefined();

      // Advance time, but not enough to be stale
      vi.advanceTimersByTime(15 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();

      expect(manager.getSession("test-session-id")).toBeDefined();
    });
  });

  describe("shutdown", () => {
    it("should close all active sessions and clear the interval", async () => {
      await manager.initializeAndHandle(mockReq, mockRes, {}, context);
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      await manager.shutdown();

      expect(manager.getSession("test-session-id")).toBeUndefined();
      expect(clearIntervalSpy).toHaveBeenCalledWith(expect.any(Object)); // Timer
    });
  });
});
