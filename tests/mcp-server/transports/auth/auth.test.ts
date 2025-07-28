/**
 * @fileoverview Tests for the refactored authentication layer.
 * @module tests/mcp-server/transports/auth/auth.test
 */

import type { Context } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { config } from "../../../../src/config/index.js";
import { createAuthStrategy } from "../../../../src/mcp-server/transports/auth/authFactory.js";
import { createAuthMiddleware } from "../../../../src/mcp-server/transports/auth/authMiddleware.js";
import { authContext } from "../../../../src/mcp-server/transports/auth/lib/authContext.js";
import type { AuthStrategy } from "../../../../src/mcp-server/transports/auth/strategies/authStrategy.js";
import { JwtStrategy } from "../../../../src/mcp-server/transports/auth/strategies/jwtStrategy.js";
import { OauthStrategy } from "../../../../src/mcp-server/transports/auth/strategies/oauthStrategy.js";
import { McpError } from "../../../../src/types-global/errors.js";

// Mock dependencies
vi.mock('jose', async () => ({
  jwtVerify: vi.fn(),
  createRemoteJWKSet: vi.fn(),
}));

const { jwtVerify } = await import('jose');

describe("Authentication Layer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset config to defaults before each test
    config.mcpAuthMode = "none";
    config.mcpAuthSecretKey = "test-secret-key-that-is-long-enough";
    config.oauthIssuerUrl = undefined;
    config.oauthAudience = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe("authFactory", () => {
    it("should create JwtStrategy when auth mode is jwt", () => {
      config.mcpAuthMode = "jwt";
      const strategy = createAuthStrategy();
      expect(strategy).toBeInstanceOf(JwtStrategy);
    });

    it("should create OauthStrategy when auth mode is oauth", () => {
      config.mcpAuthMode = "oauth";
      // Mock necessary oauth config
      config.oauthIssuerUrl = "https://issuer.com";
      config.oauthAudience = "audience";
      const strategy = createAuthStrategy();
      expect(strategy).toBeInstanceOf(OauthStrategy);
    });

    it("should return null when auth mode is none", () => {
      config.mcpAuthMode = "none";
      const strategy = createAuthStrategy();
      expect(strategy).toBeNull();
    });

    it("should throw for unknown auth mode", () => {
      (config as { mcpAuthMode: string }).mcpAuthMode = "unknown";
      expect(() => createAuthStrategy()).toThrow("Unknown authentication mode: unknown");
    });
  });

  describe("JwtStrategy", () => {
    it("should successfully verify a valid JWT", async () => {
      config.mcpAuthMode = "jwt";
      const strategy = new JwtStrategy();
      const mockPayload = { cid: "test-client", scp: ["read", "write"] };
      vi.mocked(jwtVerify).mockResolvedValue({ payload: mockPayload, protectedHeader: { alg: 'HS256' }, key: new Uint8Array() });

      const authInfo = await strategy.verify("valid-token");
      expect(authInfo).toEqual({
        token: "valid-token",
        clientId: "test-client",
        scopes: ["read", "write"],
      });
      expect(jwtVerify).toHaveBeenCalledWith("valid-token", expect.any(Uint8Array));
    });

    it("should throw McpError for an invalid JWT", async () => {
      config.mcpAuthMode = "jwt";
      const strategy = new JwtStrategy();
      vi.mocked(jwtVerify).mockRejectedValue(new Error("Invalid signature"));

      await expect(strategy.verify("invalid-token")).rejects.toThrow(McpError);
    });
  });

  describe("OauthStrategy", () => {
    it("should successfully verify a valid OAuth token", async () => {
      config.mcpAuthMode = "oauth";
      config.oauthIssuerUrl = "https://issuer.com";
      config.oauthAudience = "audience";
      const strategy = new OauthStrategy();
      const mockPayload = { client_id: "oauth-client", scope: "read write" };
      vi.mocked(jwtVerify).mockResolvedValue({ payload: mockPayload, protectedHeader: { alg: 'RS256' }, key: new Uint8Array() });

      const authInfo = await strategy.verify("valid-oauth-token");
      expect(authInfo).toEqual({
        token: "valid-oauth-token",
        clientId: "oauth-client",
        scopes: ["read", "write"],
        subject: undefined,
      });
    });
  });

  describe("authMiddleware", () => {
    it("should call next middleware within authContext on success", async () => {
      const mockStrategy: AuthStrategy = {
        verify: vi.fn().mockResolvedValue({ clientId: "test", scopes: ["test"] }),
      };
      const middleware = createAuthMiddleware(mockStrategy);
      const mockContext = {
        req: { header: vi.fn().mockReturnValue("Bearer test-token") },
        env: { incoming: {} },
      } as unknown as Context;
      const next = vi.fn();
      const authContextSpy = vi.spyOn(authContext, "run");

      await middleware(mockContext, next);

      expect(mockStrategy.verify).toHaveBeenCalledWith("test-token");
      expect(authContextSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should throw McpError if Authorization header is missing", async () => {
      const mockStrategy: AuthStrategy = { verify: vi.fn() };
      const middleware = createAuthMiddleware(mockStrategy);
      const mockContext = {
        req: { header: vi.fn().mockReturnValue(undefined) },
        env: {},
      } as unknown as Context;
      const next = vi.fn();

      await expect(middleware(mockContext, next)).rejects.toThrow(McpError);
    });
  });
});
