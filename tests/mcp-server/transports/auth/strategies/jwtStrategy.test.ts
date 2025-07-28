/**
 * @fileoverview Tests for the JWT authentication strategy.
 * @module tests/mcp-server/transports/auth/strategies/jwtStrategy.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import * as configModule from "../../../../../src/config/index.js";
import { McpError, BaseErrorCode } from "../../../../../src/types-global/errors.js";
import { JwtStrategy } from "../../../../../src/mcp-server/transports/auth/strategies/jwtStrategy.js";

// Mock the entire config module
vi.mock("../../../../../src/config/index.js");

const mockConfig = (
  mcpAuthSecretKey: string,
  environment: "test" | "development" | "production",
) => {
  vi.mocked(configModule).config = {
    pkg: { name: "test-server", version: "1.0.0" },
    mcpServerName: "test-server",
    mcpServerVersion: "1.0.0",
    logLevel: "silent",
    logsPath: null,
    environment,
    mcpTransportType: "http",
    mcpHttpPort: 3010,
    mcpHttpHost: "127.0.0.1",
    mcpAllowedOrigins: ["http://localhost:3000"],
    mcpAuthMode: "jwt",
    mcpAuthSecretKey,
    oauthIssuerUrl: undefined,
    oauthJwksUri: undefined,
    oauthAudience: undefined,
    openrouterAppUrl: "http://localhost:3000",
    openrouterAppName: "test-server",
    openrouterApiKey: undefined,
    llmDefaultModel: "google/gemini-2.5-flash-preview-05-20",
    llmDefaultTemperature: undefined,
    llmDefaultTopP: undefined,
    llmDefaultMaxTokens: undefined,
    llmDefaultTopK: undefined,
    llmDefaultMinP: undefined,
    oauthProxy: undefined,
    supabase: undefined,
  };
  vi.mocked(configModule).environment = environment;
};

describe("JwtStrategy", () => {
  const secretKey = "a-very-long-and-secure-test-secret-key";
  const alg = "HS256";

  const createToken = async (
    payload: Record<string, unknown>,
    key: string,
    expiresIn: string | number = "1h",
  ) => {
    const secret = new TextEncoder().encode(key);
    return new SignJWT(payload)
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secret);
  };

  describe("with standard config", () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
      mockConfig(secretKey, "test");
      strategy = new JwtStrategy();
    });

    it("should successfully verify a valid token", async () => {
      const token = await createToken({ cid: "test-client", scp: ["read"] }, secretKey);
      const authInfo = await strategy.verify(token);
      expect(authInfo).toEqual({
        token,
        clientId: "test-client",
        scopes: ["read"],
      });
    });

    it("should throw UNAUTHORIZED for an expired token", async () => {
      const token = await createToken({ cid: "test-client", scp: ["read"] }, secretKey, "-1s");
      await expect(strategy.verify(token)).rejects.toThrow(McpError);
      try {
        await strategy.verify(token);
      } catch (e) {
        const err = e as McpError;
        expect(err.code).toBe(BaseErrorCode.UNAUTHORIZED);
        expect(err.message).toBe("Token has expired.");
      }
    });

    it("should throw UNAUTHORIZED for an invalid signature", async () => {
      const token = await createToken({ cid: "test-client", scp: ["read"] }, "wrong-secret");
      await expect(strategy.verify(token)).rejects.toThrow(McpError);
    });

    it("should throw UNAUTHORIZED if cid claim is missing", async () => {
      const token = await createToken({ scp: ["read"] }, secretKey);
      await expect(strategy.verify(token)).rejects.toThrow(
        "Invalid token: missing 'cid' or 'client_id' claim.",
      );
    });

    it("should throw UNAUTHORIZED if scope claim is missing or empty", async () => {
      const token = await createToken({ cid: "test-client" }, secretKey);
      await expect(strategy.verify(token)).rejects.toThrow(
        "Token must contain valid, non-empty scopes.",
      );
    });

    it("should handle scope as a space-delimited string", async () => {
      const token = await createToken(
        { cid: "test-client", scope: "read write" },
        secretKey,
      );
      const authInfo = await strategy.verify(token);
      expect(authInfo.scopes).toEqual(["read", "write"]);
    });
  });

  describe("Development Mode Bypass", () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
      mockConfig("", "development"); // No key
      strategy = new JwtStrategy();
    });

    it("should bypass verification and return dev info", async () => {
      const authInfo = await strategy.verify("any-token");
      expect(authInfo).toEqual({
        token: "dev-mode-placeholder-token",
        clientId: "dev-client-id",
        scopes: ["dev-scope"],
      });
    });
  });

  describe("Production Mode No Secret", () => {
    beforeEach(() => {
      mockConfig("", "production"); // No key
    });

    it("should throw an error during construction", () => {
      expect(() => new JwtStrategy()).toThrow(
        "MCP_AUTH_SECRET_KEY must be set for JWT auth.",
      );
    });
  });
});
