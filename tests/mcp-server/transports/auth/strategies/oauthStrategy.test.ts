/**
 * @fileoverview Tests for the OauthStrategy class.
 * @module tests/mcp-server/transports/auth/strategies/oauthStrategy.test
 */

import * as jose from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OauthStrategy } from "../../../../../src/mcp-server/transports/auth/strategies/oauthStrategy.js";
import {
  BaseErrorCode,
  McpError,
} from "../../../../../src/types-global/errors.js";
import { logger } from "../../../../../src/utils/internal/logger.js";

// Mock config and logger with a mutable state object
const mockState = {
  config: {
    mcpAuthMode: "oauth",
    oauthIssuerUrl: "https://issuer.example.com/",
    oauthAudience: "api://my-audience",
    oauthJwksUri: "https://issuer.example.com/.well-known/jwks.json",
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

const mockCreateRemoteJWKSet = vi.fn();
vi.mock("jose", () => ({
  createRemoteJWKSet: (url: URL) => mockCreateRemoteJWKSet(url),
  jwtVerify: vi.fn(),
}));

describe("OauthStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.config = {
      mcpAuthMode: "oauth",
      oauthIssuerUrl: "https://issuer.example.com/",
      oauthAudience: "api://my-audience",
      oauthJwksUri: "https://issuer.example.com/.well-known/jwks.json",
    };
    mockCreateRemoteJWKSet.mockReturnValue(() => Promise.resolve());
  });

  describe("constructor", () => {
    it("should throw an error if not in oauth mode", () => {
      mockState.config.mcpAuthMode = "jwt";
      expect(() => new OauthStrategy()).toThrow(
        "OauthStrategy instantiated for non-oauth auth mode.",
      );
    });

    it("should throw an error if issuer URL is missing", () => {
      mockState.config.oauthIssuerUrl = "";
      expect(() => new OauthStrategy()).toThrow(McpError);
      expect(vi.mocked(logger).fatal).toHaveBeenCalledWith(
        "CRITICAL: OAUTH_ISSUER_URL and OAUTH_AUDIENCE must be set for OAuth mode.",
        expect.any(Object),
      );
    });

    it("should throw an error if audience is missing", () => {
      mockState.config.oauthAudience = "";
      expect(() => new OauthStrategy()).toThrow(McpError);
    });

    it("should construct the JWKS URI from the issuer URL if not provided", () => {
      mockState.config.oauthJwksUri = "";
      new OauthStrategy();
      expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
        new URL("https://issuer.example.com/.well-known/jwks.json"),
      );
    });

    it("should use the provided JWKS URI if available", () => {
      mockState.config.oauthJwksUri = "https://custom.com/jwks.json";
      new OauthStrategy();
      expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
        new URL("https://custom.com/jwks.json"),
      );
    });

    it("should throw a fatal error if JWKS client initialization fails", () => {
      const error = new Error("JWKS client failed");
      mockCreateRemoteJWKSet.mockImplementation(() => {
        throw error;
      });
      expect(() => new OauthStrategy()).toThrow(McpError);
      expect(vi.mocked(logger).fatal).toHaveBeenCalledWith(
        "Failed to initialize JWKS client.",
        expect.objectContaining({ error: "JWKS client failed" }),
      );
    });
  });

  describe("verify", () => {
    let strategy: OauthStrategy;

    beforeEach(() => {
      strategy = new OauthStrategy();
    });

    it("should successfully verify a valid token", async () => {
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
      expect(jose.jwtVerify).toHaveBeenCalledWith(
        "valid-token",
        expect.any(Function),
        {
          issuer: mockState.config.oauthIssuerUrl,
          audience: mockState.config.oauthAudience,
        },
      );
    });


    it("should throw UNAUTHORIZED McpError if jose.jwtVerify throws JWTExpired", async () => {
      const error = new Error("Token has expired.");
      error.name = "JWTExpired";
      vi.mocked(jose.jwtVerify).mockRejectedValue(error);

      await expect(strategy.verify("expired-token")).rejects.toMatchObject({
        code: BaseErrorCode.UNAUTHORIZED,
        message: "Token has expired.",
      });
    });

    it("should throw UNAUTHORIZED McpError if jose.jwtVerify throws a generic error", async () => {
      vi.mocked(jose.jwtVerify).mockRejectedValue(
        new Error("Verification failed"),
      );

      await expect(
        strategy.verify("generic-error-token"),
      ).rejects.toMatchObject({
        code: BaseErrorCode.UNAUTHORIZED,
        message: "OAuth token verification failed.",
      });
    });
  });
});
