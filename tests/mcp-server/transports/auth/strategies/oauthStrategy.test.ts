/**
 * @fileoverview Tests for the OauthStrategy class.
 * @module tests/mcp-server/transports/auth/strategies/oauthStrategy.test
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { OauthStrategy } from "../../../../../src/mcp-server/transports/auth/strategies/oauthStrategy.js";
import { BaseErrorCode, McpError } from "../../../../../src/types-global/errors.js";
import * as jose from "jose";
import { logger } from "../../../../../src/utils/internal/logger.js";

// Mock config and logger with a mutable state object
const mockState = {
  config: {
    mcpAuthMode: "oauth",
    oauthIssuerUrl: "https://test-issuer.com/",
    oauthAudience: "test-audience",
    oauthJwksUri: "",
  },
};

vi.mock("../../../../../src/config/index.js", () => ({
  get config() {
    return mockState.config;
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
  createRemoteJWKSet: vi.fn(),
  jwtVerify: vi.fn(),
}));

describe("OauthStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset config for each test
    mockState.config = {
      mcpAuthMode: "oauth",
      oauthIssuerUrl: "https://test-issuer.com/",
      oauthAudience: "test-audience",
      oauthJwksUri: "",
    };
    // Mock the JWKS client to return a dummy function
    vi.mocked(jose.createRemoteJWKSet).mockReturnValue(
      vi.fn() as unknown as ReturnType<typeof jose.createRemoteJWKSet>,
    );
  });

  describe("constructor", () => {
    it("should throw an error if not in oauth mode", () => {
      mockState.config.mcpAuthMode = "jwt";
      expect(() => new OauthStrategy()).toThrow("OauthStrategy instantiated for non-oauth auth mode.");
    });

    it("should throw an error if issuer URL is missing", () => {
      mockState.config.oauthIssuerUrl = "";
      expect(() => new OauthStrategy()).toThrow("OAUTH_ISSUER_URL and OAUTH_AUDIENCE must be set for OAuth mode.");
    });

    it("should throw an error if audience is missing", () => {
      mockState.config.oauthAudience = "";
      expect(() => new OauthStrategy()).toThrow("OAUTH_ISSUER_URL and OAUTH_AUDIENCE must be set for OAuth mode.");
    });

    it("should construct the JWKS URI from the issuer URL if not provided", () => {
      new OauthStrategy();
      const expectedUrl = new URL("https://test-issuer.com/.well-known/jwks.json");
      expect(jose.createRemoteJWKSet).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });

    it("should use the provided JWKS URI if available", () => {
      mockState.config.oauthJwksUri = "https://custom-jwks.com/keys";
      new OauthStrategy();
      const expectedUrl = new URL("https://custom-jwks.com/keys");
      expect(jose.createRemoteJWKSet).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });

    it("should throw a fatal error if JWKS client initialization fails", () => {
      vi.mocked(jose.createRemoteJWKSet).mockImplementation(() => {
        throw new Error("JWKS client failed");
      });
      expect(() => new OauthStrategy()).toThrow("Could not initialize JWKS client for OAuth strategy.");
      expect(vi.mocked(logger).fatal).toHaveBeenCalledWith("Failed to initialize JWKS client.", expect.any(Error));
    });
  });

  describe("verify", () => {
    it("should successfully verify a valid token", async () => {
      const strategy = new OauthStrategy();
      const mockDecoded = {
        payload: {
          client_id: "client-1",
          scope: "read write",
          sub: "user-123",
        },
        protectedHeader: { alg: "RS256" },
        key: new Uint8Array(),
      };
      vi.mocked(jose.jwtVerify).mockResolvedValue(mockDecoded);

      const result = await strategy.verify("valid-token");

      expect(result).toEqual({
        token: "valid-token",
        clientId: "client-1",
        scopes: ["read", "write"],
        subject: "user-123",
      });
      expect(jose.jwtVerify).toHaveBeenCalledWith("valid-token", expect.any(Function), {
        issuer: "https://test-issuer.com/",
        audience: "test-audience",
      });
    });

    it("should throw UNAUTHORIZED McpError if client_id claim is missing", async () => {
      const strategy = new OauthStrategy();
      const mockDecoded = {
        payload: { scope: "read" },
        protectedHeader: { alg: "RS256" },
        key: new Uint8Array(),
      };
      vi.mocked(jose.jwtVerify).mockResolvedValue(mockDecoded);

      await expect(strategy.verify("invalid-token")).rejects.toThrow(McpError);
      await expect(strategy.verify("invalid-token")).rejects.toMatchObject({
        code: BaseErrorCode.UNAUTHORIZED,
        message: "Token must contain a 'client_id' claim.",
      });
    });

    it("should throw UNAUTHORIZED McpError if scopes are missing", async () => {
      const strategy = new OauthStrategy();
      const mockDecoded = {
        payload: { client_id: "client-1" },
        protectedHeader: { alg: "RS256" },
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
      const strategy = new OauthStrategy();
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
      const strategy = new OauthStrategy();
      vi.mocked(jose.jwtVerify).mockRejectedValue(new Error("Verification failed"));

      await expect(strategy.verify("generic-error-token")).rejects.toThrow(McpError);
      await expect(strategy.verify("generic-error-token")).rejects.toMatchObject({
        code: BaseErrorCode.UNAUTHORIZED,
        message: "OAuth token verification failed.",
      });
    });
  });
});
