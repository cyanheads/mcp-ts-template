/**
 * @fileoverview Tests for the JwtStrategy class.
 * @module tests/mcp-server/transports/auth/strategies/jwtStrategy.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { JwtStrategy } from "../../../../../src/mcp-server/transports/auth/strategies/jwtStrategy.js";
import {
  BaseErrorCode,
  McpError,
} from "../../../../../src/types-global/errors.js";
import * as jose from "jose";
import { logger } from "../../../../../src/utils/internal/logger.js";

// Mock config and logger with a mutable state object
const mockState = {
  config: {
    mcpAuthMode: "jwt",
    mcpAuthSecretKey: "default-secret-key-for-testing",
  },
  environment: "development",
};

vi.mock("../../../../../src/config/index.js", () => ({
  get config() {
    return mockState.config;
  },
  get environment() {
    return mockState.environment;
  },
}));

vi.mock("../../../../../src/utils/internal/logger.js", () => ({
  logger: {
    fatal: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock jose library
vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));

describe("JwtStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset config/environment mocks for each test
    mockState.config = {
      mcpAuthMode: "jwt",
      mcpAuthSecretKey: "default-secret-key-for-testing",
    };
    mockState.environment = "development";
  });

  describe("constructor", () => {
    it("should throw a CONFIGURATION_ERROR if in production and secret key is missing", () => {
      mockState.environment = "production";
      mockState.config.mcpAuthSecretKey = "";
      const constructor = () => new JwtStrategy();
      expect(constructor).toThrow(McpError);
      expect(constructor).toThrow(
        expect.objectContaining({
          code: BaseErrorCode.CONFIGURATION_ERROR,
          message:
            "MCP_AUTH_SECRET_KEY must be set for JWT auth in production.",
        }),
      );
      expect(vi.mocked(logger).fatal).toHaveBeenCalledWith(
        "CRITICAL: MCP_AUTH_SECRET_KEY is not set in production for JWT auth.",
      );
    });

    it("should log a warning in development if secret key is missing", () => {
      mockState.config.mcpAuthSecretKey = "";
      new JwtStrategy();
      expect(vi.mocked(logger).warning).toHaveBeenCalledWith(
        "MCP_AUTH_SECRET_KEY is not set. JWT auth will be bypassed (DEV ONLY).",
      );
    });
  });

  describe("verify", () => {
    it("should successfully verify a valid token with cid and scp claims", async () => {
      const strategy = new JwtStrategy();
      const mockDecoded = {
        payload: { cid: "client-1", scp: ["read", "write"] },
        protectedHeader: { alg: "HS256" },
        key: new Uint8Array(),
      };
      vi.mocked(jose.jwtVerify).mockResolvedValue(mockDecoded);

      const result = await strategy.verify("valid-token");

      expect(result).toEqual({
        token: "valid-token",
        clientId: "client-1",
        scopes: ["read", "write"],
      });
      expect(jose.jwtVerify).toHaveBeenCalledWith(
        "valid-token",
        expect.any(Uint8Array),
      );
    });

    it("should successfully verify a valid token with client_id and space-delimited scope", async () => {
      const strategy = new JwtStrategy();
      const mockDecoded = {
        payload: { client_id: "client-2", scope: "read write" },
        protectedHeader: { alg: "HS256" },
        key: new Uint8Array(),
      };
      vi.mocked(jose.jwtVerify).mockResolvedValue(mockDecoded);

      const result = await strategy.verify("valid-token-2");

      expect(result).toEqual({
        token: "valid-token-2",
        clientId: "client-2",
        scopes: ["read", "write"],
      });
    });

    it("should throw UNAUTHORIZED McpError for a token with a missing client_id/cid claim", async () => {
      const strategy = new JwtStrategy();
      const mockDecoded = {
        payload: { scp: ["read"] },
        protectedHeader: { alg: "HS256" },
        key: new Uint8Array(),
      };
      vi.mocked(jose.jwtVerify).mockResolvedValue(mockDecoded);

      await expect(strategy.verify("invalid-token")).rejects.toThrow(McpError);
      await expect(strategy.verify("invalid-token")).rejects.toMatchObject({
        code: BaseErrorCode.UNAUTHORIZED,
        message: "Invalid token: missing 'cid' or 'client_id' claim.",
      });
    });

    it("should throw UNAUTHORIZED McpError for a token with empty scopes", async () => {
      const strategy = new JwtStrategy();
      const mockDecoded = {
        payload: { cid: "client-1", scope: " " },
        protectedHeader: { alg: "HS256" },
        key: new Uint8Array(),
      };
      vi.mocked(jose.jwtVerify).mockResolvedValue(mockDecoded);

      await expect(strategy.verify("invalid-token")).rejects.toThrow(McpError);
      await expect(strategy.verify("invalid-token")).rejects.toMatchObject({
        code: BaseErrorCode.UNAUTHORIZED,
        message: "Token must contain valid, non-empty scopes.",
      });
    });

    it("should throw UNAUTHORIZED McpError if jose.jwtVerify throws JWTExpired", async () => {
      const strategy = new JwtStrategy();
      const error = new Error("Token has expired.");
      error.name = "JWTExpired";
      vi.mocked(jose.jwtVerify).mockRejectedValue(error);

      await expect(strategy.verify("expired-token")).rejects.toThrow(McpError);
      await expect(strategy.verify("expired-token")).rejects.toMatchObject({
        code: BaseErrorCode.UNAUTHORIZED,
        message: "Token has expired.",
      });
    });

    it("should throw UNAUTHORIZED McpError if jose.jwtVerify throws a generic error", async () => {
      const strategy = new JwtStrategy();
      vi.mocked(jose.jwtVerify).mockRejectedValue(
        new Error("Verification failed"),
      );

      await expect(strategy.verify("generic-error-token")).rejects.toThrow(
        McpError,
      );
      await expect(
        strategy.verify("generic-error-token"),
      ).rejects.toMatchObject({
        code: BaseErrorCode.UNAUTHORIZED,
        message: "Token verification failed.",
      });
    });

    it("should return a placeholder auth info in development when no secret key is provided", async () => {
      mockState.config.mcpAuthSecretKey = "";
      const strategy = new JwtStrategy();

      const result = await strategy.verify("any-token");
      expect(result).toEqual({
        token: "dev-mode-placeholder-token",
        clientId: "dev-client-id",
        scopes: ["dev-scope"],
      });
      expect(vi.mocked(logger).warning).toHaveBeenCalledWith(
        "Bypassing JWT verification: No secret key (DEV ONLY).",
      );
    });
  });
});
