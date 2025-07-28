/**
 * @fileoverview Tests for the HTTP transport layer.
 * @module tests/mcp-server/transports/http/http.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHttpApp } from "../../../../src/mcp-server/transports/http/httpTransport.js";
import { McpTransportManager } from "../../../../src/mcp-server/transports/core/mcpTransportManager.js";
import { Hono } from "hono";
import { HonoNodeBindings } from "../../../../src/mcp-server/transports/http/httpTypes.js";
import { serve, ServerType } from "@hono/node-server";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

vi.mock("../../../../src/mcp-server/transports/core/mcpTransportManager.js");
vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  isInitializeRequest: vi.fn(),
}));

// Mock config and utils to isolate the transport logic
vi.mock("../../../../src/config/index.js", async () => ({
  config: {
    mcpAuthMode: "none",
    mcpAllowedOrigins: [],
    mcpHttpPort: 3000,
    mcpHttpHost: "localhost",
  },
}));

vi.mock("../../../../src/utils/index.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../../src/utils/index.js")>();
  return {
    ...original,
    logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warning: vi.fn() },
    rateLimiter: { check: vi.fn() }, // Mock rate limiter to prevent interference
    requestContextService: {
      createRequestContext: vi.fn((ctx) => ({ ...ctx, id: "test-request-id" })),
      configure: vi.fn(),
    },
  };
});

describe("HTTP Transport Layer", () => {
  let mockTransportManager: McpTransportManager;
  let app: Hono<{ Bindings: HonoNodeBindings }>;
  let server: ServerType;
  let port: number;

  beforeEach(async () => {
    mockTransportManager = new McpTransportManager(vi.fn());
    app = createHttpApp(mockTransportManager, {
      requestId: "test-id",
      timestamp: new Date().toISOString(),
    });

    await new Promise<void>((resolve) => {
      server = serve({ fetch: app.fetch, port: 0 }, (info) => {
        port = info.port;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  describe("createHttpApp", () => {
    it("should create a Hono app", () => {
      expect(app).toBeInstanceOf(Hono);
    });

    it("should handle POST /mcp for initialization", async () => {
      vi.mocked(isInitializeRequest).mockReturnValue(true);
      mockTransportManager.initializeSession = vi.fn().mockResolvedValue({
        headers: new Headers(),
        statusCode: 200,
        body: { status: "initialized" },
      });

      const res = await fetch(`http://localhost:${port}/mcp`, {
        method: "POST",
        body: JSON.stringify({ jsonrpc: "2.0", method: "initialize" }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(200);
      expect(mockTransportManager.initializeSession).toHaveBeenCalled();
    });

    it("should handle POST /mcp for session requests", async () => {
      vi.mocked(isInitializeRequest).mockReturnValue(false);
      mockTransportManager.handleRequest = vi.fn().mockResolvedValue(undefined);

      const res = await fetch(`http://localhost:${port}/mcp`, {
        method: "POST",
        headers: { "mcp-session-id": "test-session", 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: "2.0", method: "echo" }),
      });
      expect(mockTransportManager.handleRequest).toHaveBeenCalled();
      expect(res.status).toBe(204);
    });

    it("should handle GET /mcp for session requests", async () => {
      mockTransportManager.handleRequest = vi.fn();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);

      try {
        await fetch(`http://localhost:${port}/mcp`, {
          method: "GET",
          headers: { "mcp-session-id": "test-session" },
          signal: controller.signal,
        });
      } catch (_error) {
        // Expected
      } finally {
        clearTimeout(timeout);
      }

      expect(mockTransportManager.handleRequest).toHaveBeenCalled();
    });

    it("should handle DELETE /mcp for session requests", async () => {
      mockTransportManager.handleDeleteRequest = vi.fn().mockResolvedValue({
        headers: new Headers(),
        statusCode: 200,
        body: { status: "session_closed" },
      });
      const res = await fetch(`http://localhost:${port}/mcp`, {
        method: "DELETE",
        headers: { "mcp-session-id": "test-session" },
      });
      expect(res.status).toBe(200);
      expect(mockTransportManager.handleDeleteRequest).toHaveBeenCalled();
    });
  });
});
