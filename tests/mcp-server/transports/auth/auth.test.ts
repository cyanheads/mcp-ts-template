/**
 * @fileoverview Integration tests for the auth factory and middleware.
 * @module tests/mcp-server/transports/auth/auth.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { createAuthStrategy } from "../../../../src/mcp-server/transports/auth/authFactory.js";
import { createAuthMiddleware } from "../../../../src/mcp-server/transports/auth/authMiddleware.js";
import { JwtStrategy } from "../../../../src/mcp-server/transports/auth/strategies/jwtStrategy.js";
import { OauthStrategy } from "../../../../src/mcp-server/transports/auth/strategies/oauthStrategy.js";
import { authContext } from "../../../../src/mcp-server/transports/auth/lib/authContext.js";
import {
  BaseErrorCode,
  McpError,
} from "../../../../src/types-global/errors.js";
import type { AuthStrategy } from "../../../../src/mcp-server/transports/auth/strategies/authStrategy.js";
import type { AuthInfo } from "../../../../src/mcp-server/transports/auth/lib/authTypes.js";

// Mock the strategies to prevent actual auth logic
vi.mock("../../../../src/mcp-server/transports/auth/strategies/jwtStrategy.js");
vi.mock(
  "../../../../src/mcp-server/transports/auth/strategies/oauthStrategy.js",
);

// Mock config
const mockState = {
  config: { mcpAuthMode: "none" },
};
vi.mock("../../../../src/config/index.js", () => ({
  get config() {
    return mockState.config;
  },
}));

describe("Auth Integration: Factory and Middleware", () => {
  describe("createAuthFactory", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return a JwtStrategy instance when auth mode is 'jwt'", () => {
      mockState.config.mcpAuthMode = "jwt";
      const strategy = createAuthStrategy();
      expect(strategy).toBeInstanceOf(JwtStrategy);
    });

    it("should return an OauthStrategy instance when auth mode is 'oauth'", () => {
      mockState.config.mcpAuthMode = "oauth";
      const strategy = createAuthStrategy();
      expect(strategy).toBeInstanceOf(OauthStrategy);
    });

    it("should return null when auth mode is 'none'", () => {
      mockState.config.mcpAuthMode = "none";
      const strategy = createAuthStrategy();
      expect(strategy).toBeNull();
    });

    it("should throw an error for an unknown auth mode", () => {
      mockState.config.mcpAuthMode = "unknown";
      expect(() => createAuthStrategy()).toThrow(
        "Unknown authentication mode: unknown",
      );
    });
  });

  describe("createAuthMiddleware", () => {
    let app: Hono;
    let mockStrategy: AuthStrategy;

    beforeEach(() => {
      const mockAuthInfo: AuthInfo = {
        token: "verified-token",
        clientId: "test-client",
        scopes: ["read"],
      };

      mockStrategy = {
        verify: vi.fn().mockResolvedValue(mockAuthInfo),
      };

      app = new Hono();
      app.use("/protected/*", createAuthMiddleware(mockStrategy));
      app.get("/protected/data", (c) => {
        const store = authContext.getStore();
        return c.json({ authInfo: store?.authInfo });
      });
      // Add a global error handler to catch thrown McpErrors
      app.onError((err, c) => {
        if (err instanceof McpError) {
          const status = err.code === BaseErrorCode.UNAUTHORIZED ? 401 : 500;
          return c.json({ code: err.code, message: err.message }, status);
        }
        return c.json({ message: "Internal Server Error" }, 500);
      });
    });

    it("should successfully authenticate a request with a valid Bearer token", async () => {
      const req = new Request("http://localhost/protected/data", {
        headers: { Authorization: "Bearer valid-token" },
      });
      const res = await app.request(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.authInfo.clientId).toBe("test-client");
      expect(mockStrategy.verify).toHaveBeenCalledWith("valid-token");
    });

    it("should reject a request with no Authorization header", async () => {
      const req = new Request("http://localhost/protected/data");
      const res = await app.request(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe(BaseErrorCode.UNAUTHORIZED);
      expect(body.message).toContain("Missing or invalid Authorization header");
    });

    it("should reject a request with a malformed Authorization header", async () => {
      const req = new Request("http://localhost/protected/data", {
        headers: { Authorization: "Basic some-token" },
      });
      const res = await app.request(req);
      expect(res.status).toBe(401);
    });

    it("should reject a request with an empty token", async () => {
      const req = new Request("http://localhost/protected/data", {
        headers: { Authorization: "Bearer " },
      });
      const res = await app.request(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toContain("Missing or invalid Authorization header");
    });

    it("should pass the error from the strategy to the global error handler", async () => {
      vi.mocked(mockStrategy.verify).mockRejectedValue(
        new McpError(BaseErrorCode.UNAUTHORIZED, "Invalid token"),
      );
      const req = new Request("http://localhost/protected/data", {
        headers: { Authorization: "Bearer invalid-token" },
      });
      const res = await app.request(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Invalid token");
    });
  });
});
