/**
 * @fileoverview Tests for the OAuth 2.1 authentication strategy.
 * @module tests/mcp-server/transports/auth/strategies/oauthStrategy.test
 */

import { generateKeyPair, SignJWT } from "jose";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as configModule from "../../../../../src/config/index.js";
import { OauthStrategy } from "../../../../../src/mcp-server/transports/auth/strategies/oauthStrategy.js";
import { McpError, BaseErrorCode } from "../../../../../src/types-global/errors.js";

vi.mock("../../../../../src/config/index.js");

const mockConfig = (issuer: string, audience: string, jwksUri?: string) => {
  vi.mocked(configModule).config = {
    pkg: { name: "test-server", version: "1.0.0" },
    mcpServerName: "test-server",
    mcpServerVersion: "1.0.0",
    logLevel: "silent",
    logsPath: null,
    environment: "test",
    mcpTransportType: "http",
    mcpHttpPort: 3010,
    mcpHttpHost: "127.0.0.1",
    mcpAllowedOrigins: ["http://localhost:3000"],
    mcpAuthMode: "oauth",
    mcpAuthSecretKey: undefined,
    oauthIssuerUrl: issuer,
    oauthJwksUri: jwksUri,
    oauthAudience: audience,
    openrouterAppUrl: "http://localhost:3000",
    openrouterAppName: "test-server",
    openrouterApiKey: undefined,
    llmDefaultModel: "google/gemini-2.5-flash",
    llmDefaultTemperature: undefined,
    llmDefaultTopP: undefined,
    llmDefaultMaxTokens: undefined,
    llmDefaultTopK: undefined,
    llmDefaultMinP: undefined,
    oauthProxy: undefined,
    supabase: undefined,
  };
  vi.mocked(configModule).environment = "test";
};

const alg = "RS256";
let keyPair: { publicKey: CryptoKey; privateKey: CryptoKey };
const mswServer = setupServer();

describe("OauthStrategy", () => {
  beforeAll(async () => {
    keyPair = await generateKeyPair(alg);
    mswServer.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => mswServer.resetHandlers());
  afterAll(() => mswServer.close());

  const createToken = async (
    payload: Record<string, unknown>,
    issuer: string,
    audience: string,
    expiresIn = "1h",
  ) => {
    return new SignJWT(payload)
      .setProtectedHeader({ alg, kid: "test-kid" })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime(expiresIn)
      .sign(keyPair.privateKey);
  };

  const setupJwksHandler = (jwksUri: string) => {
    mswServer.use(
      http.get(jwksUri, async () => {
        // Export the public key as JWK format
        const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
        const jwk = {
          ...publicKeyJwk,
          kid: "test-kid",
          alg,
          use: "sig",
        };
        return HttpResponse.json({ keys: [jwk] });
      }),
    );
  };

  describe("Constructor Logic", () => {
    it("should throw if instantiated for non-oauth auth mode", () => {
      mockConfig("issuer", "audience");
      vi.mocked(configModule).config.mcpAuthMode = "jwt";
      expect(() => new OauthStrategy()).toThrow("OauthStrategy instantiated for non-oauth auth mode.");
    });

    it("should throw if OAUTH_ISSUER_URL is missing", () => {
      mockConfig("", "audience");
      expect(() => new OauthStrategy()).toThrow("OAUTH_ISSUER_URL and OAUTH_AUDIENCE must be set for OAuth mode.");
    });

    it("should throw if OAUTH_AUDIENCE is missing", () => {
      mockConfig("issuer", "");
      expect(() => new OauthStrategy()).toThrow("OAUTH_ISSUER_URL and OAUTH_AUDIENCE must be set for OAuth mode.");
    });

    it("should throw if the JWKS URI is an invalid URL", () => {
      mockConfig("issuer", "audience", "invalid-url");
      expect(() => new OauthStrategy()).toThrow("Could not initialize JWKS client for OAuth strategy.");
    });
  });

  describe("Verification Logic", () => {
    const issuer = "https://accounts.google.com";
    const audience = "test-audience";
    const jwksUri = `${issuer}/.well-known/jwks.json`;

    beforeEach(() => {
      mockConfig(issuer, audience, jwksUri);
      setupJwksHandler(jwksUri);
    });

    it("should successfully verify a valid token", async () => {
      const strategy = new OauthStrategy();
      const token = await createToken({ scope: "read write", client_id: "test-client" }, issuer, audience);
      const authInfo = await strategy.verify(token);
      expect(authInfo).toEqual(expect.objectContaining({ clientId: "test-client", scopes: ["read", "write"] }));
    });

    it("should throw UNAUTHORIZED if token is expired", async () => {
      const strategy = new OauthStrategy();
      const token = await createToken({ scope: "read", client_id: "test-client" }, issuer, audience, "-1s");
      try {
        await strategy.verify(token);
        expect.fail("Expected verify to throw an error");
      } catch (e) {
        const err = e as McpError;
        expect(err.code).toBe(BaseErrorCode.UNAUTHORIZED);
        expect(err.message).toBe("Token has expired.");
        expect(err.details?.originalError).toBe("JWTExpired");
      }
    });

    it("should throw UNAUTHORIZED for invalid issuer", async () => {
      const strategy = new OauthStrategy();
      const token = await createToken({ scope: "read", client_id: "test-client" }, "invalid-issuer", audience);
      await expect(strategy.verify(token)).rejects.toThrow("OAuth token verification failed.");
    });

    it("should throw UNAUTHORIZED for invalid audience", async () => {
      const strategy = new OauthStrategy();
      const token = await createToken({ scope: "read", client_id: "test-client" }, issuer, "invalid-audience");
      await expect(strategy.verify(token)).rejects.toThrow("OAuth token verification failed.");
    });

    it("should throw UNAUTHORIZED if scope claim is missing", async () => {
      const strategy = new OauthStrategy();
      const token = await createToken({ client_id: "test-client" }, issuer, audience);
      try {
        await strategy.verify(token);
        expect.fail("Expected verify to throw an error");
      } catch (e) {
        const err = e as McpError;
        expect(err.code).toBe(BaseErrorCode.UNAUTHORIZED);
        expect(err.message).toBe("Token must contain valid, non-empty scopes.");
      }
    });

    it("should throw UNAUTHORIZED if client_id claim is missing", async () => {
      const strategy = new OauthStrategy();
      const token = await createToken({ scope: "read" }, issuer, audience);
      try {
        await strategy.verify(token);
        expect.fail("Expected verify to throw an error");
      } catch (e) {
        const err = e as McpError;
        expect(err.code).toBe(BaseErrorCode.UNAUTHORIZED);
        expect(err.message).toBe("Token must contain a 'client_id' claim.");
      }
    });

    it("should throw UNAUTHORIZED if JWKS endpoint is unreachable", async () => {
      mswServer.use(http.get(jwksUri, () => new HttpResponse(null, { status: 500 })));
      const strategy = new OauthStrategy();
      const token = await createToken({ scope: "read", client_id: "test-client" }, issuer, audience);
      await expect(strategy.verify(token)).rejects.toThrow("OAuth token verification failed.");
    });
  });
});
