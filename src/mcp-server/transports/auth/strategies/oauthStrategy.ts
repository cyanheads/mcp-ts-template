/**
 * @fileoverview Implements the OAuth 2.1 authentication strategy.
 * This module provides a concrete implementation of the AuthStrategy for validating
 * JWTs against a remote JSON Web Key Set (JWKS), as is common in OAuth 2.1 flows.
 * @module src/mcp-server/transports/auth/strategies/OauthStrategy
 */
import { createRemoteJWKSet, jwtVerify, JWTVerifyResult } from "jose";
import { config } from "../../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../../types-global/errors.js";
import { logger } from "../../../../utils/index.js";
import type { AuthInfo } from "../lib/authTypes.js";
import type { AuthStrategy } from "./authStrategy.js";

export class OauthStrategy implements AuthStrategy {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    if (config.mcpAuthMode !== "oauth") {
      throw new Error("OauthStrategy instantiated for non-oauth auth mode.");
    }
    if (!config.oauthIssuerUrl || !config.oauthAudience) {
      throw new Error(
        "OAUTH_ISSUER_URL and OAUTH_AUDIENCE must be set for OAuth mode.",
      );
    }

    try {
      const jwksUrl = new URL(
        config.oauthJwksUri ||
          `${config.oauthIssuerUrl.replace(/\/$/, "")}/.well-known/jwks.json`,
      );
      this.jwks = createRemoteJWKSet(jwksUrl, {
        cooldownDuration: 300000, // 5 minutes
        timeoutDuration: 5000, // 5 seconds
      });
      logger.info(`JWKS client initialized for URL: ${jwksUrl.href}`);
    } catch (error) {
      logger.fatal("Failed to initialize JWKS client.", error as Error);
      throw new Error("Could not initialize JWKS client for OAuth strategy.");
    }
  }

  async verify(token: string): Promise<AuthInfo> {
    try {
      const { payload }: JWTVerifyResult = await jwtVerify(token, this.jwks, {
        issuer: config.oauthIssuerUrl!,
        audience: config.oauthAudience!,
      });

      const scopes =
        typeof payload.scope === "string" ? payload.scope.split(" ") : [];
      if (scopes.length === 0) {
        throw new McpError(
          BaseErrorCode.UNAUTHORIZED,
          "Token must contain valid, non-empty scopes.",
        );
      }

      const clientId =
        typeof payload.client_id === "string" ? payload.client_id : undefined;
      if (!clientId) {
        throw new McpError(
          BaseErrorCode.UNAUTHORIZED,
          "Token must contain a 'client_id' claim.",
        );
      }

      return {
        token,
        clientId,
        scopes,
        subject: typeof payload.sub === "string" ? payload.sub : undefined,
      };
    } catch (error) {
      if (error instanceof McpError) throw error;

      const message =
        error instanceof Error && error.name === "JWTExpired"
          ? "Token has expired."
          : "OAuth token verification failed.";

      throw new McpError(BaseErrorCode.UNAUTHORIZED, message, {
        originalError: error instanceof Error ? error.name : "Unknown",
      });
    }
  }
}
