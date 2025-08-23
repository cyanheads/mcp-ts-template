/**
 * @fileoverview Implements the OAuth 2.1 authentication strategy.
 * This module provides a concrete implementation of the AuthStrategy for validating
 * JWTs against a remote JSON Web Key Set (JWKS), as is common in OAuth 2.1 flows.
 * @module src/mcp-server/transports/auth/strategies/OauthStrategy
 */
import { createRemoteJWKSet, jwtVerify, JWTVerifyResult } from "jose";
import { config } from "@/config/index.js";
import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import { ErrorHandler, logger, requestContextService } from "@/utils/index.js";
import type { AuthInfo } from "../lib/authTypes.js";
import type { AuthStrategy } from "./authStrategy.js";

export class OauthStrategy implements AuthStrategy {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor() {
    const context = requestContextService.createRequestContext({
      operation: "OauthStrategy.constructor",
    });
    logger.debug(context, "Initializing OauthStrategy...");

    if (config.mcpAuthMode !== "oauth") {
      // This check is for internal consistency, so a standard Error is acceptable here.
      throw new Error("OauthStrategy instantiated for non-oauth auth mode.");
    }
    if (!config.oauthIssuerUrl || !config.oauthAudience) {
      logger.fatal(
        context,
        "CRITICAL: OAUTH_ISSUER_URL and OAUTH_AUDIENCE must be set for OAuth mode.",
      );
      // This is a user-facing configuration error, so McpError is appropriate.
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        "OAUTH_ISSUER_URL and OAUTH_AUDIENCE must be set for OAuth mode.",
        context,
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
      logger.info(context, `JWKS client initialized for URL: ${jwksUrl.href}`);
    } catch (error) {
      logger.fatal(
        {
          ...context,
          error: error as Error,
        },
        "Failed to initialize JWKS client.",
      );
      // This is a critical startup failure, so a specific McpError is warranted.
      throw new McpError(
        JsonRpcErrorCode.ServiceUnavailable,
        "Could not initialize JWKS client for OAuth strategy.",
        {
          ...context,
          originalError: error instanceof Error ? error.message : "Unknown",
        },
      );
    }
  }

  async verify(token: string): Promise<AuthInfo> {
    const context = requestContextService.createRequestContext({
      operation: "OauthStrategy.verify",
    });
    logger.debug(context, "Attempting to verify OAuth token via JWKS.");

    try {
      const { payload }: JWTVerifyResult = await jwtVerify(token, this.jwks, {
        issuer: config.oauthIssuerUrl!,
        audience: config.oauthAudience!,
      });
      logger.debug(
        {
          ...context,
          claims: payload,
        },
        "OAuth token signature verified successfully.",
      );

      // Robust scope parsing (mirroring JwtStrategy):
      let scopes: string[] = [];
      // Check for 'scp' claim (array format)
      if (
        Array.isArray(payload.scp) &&
        (payload.scp as unknown[]).every((s) => typeof s === "string")
      ) {
        scopes = payload.scp as string[];
        // Check for 'scope' claim (space-delimited string format)
      } else if (typeof payload.scope === "string" && payload.scope.trim()) {
        scopes = payload.scope.split(" ").filter(Boolean);
      }
      if (scopes.length === 0) {
        logger.warning(
          context,
          "Invalid token: missing or empty 'scope' claim.",
        );
        throw new McpError(
          JsonRpcErrorCode.Unauthorized,
          "Token must contain valid, non-empty scopes.",
          context,
        );
      }

      const clientId =
        typeof payload.client_id === "string" ? payload.client_id : undefined;
      if (!clientId) {
        logger.warning(context, "Invalid token: missing 'client_id' claim.");
        throw new McpError(
          JsonRpcErrorCode.Unauthorized,
          "Token must contain a 'client_id' claim.",
          context,
        );
      }

      const authInfo: AuthInfo = {
        token,
        clientId,
        scopes,
        subject: typeof payload.sub === "string" ? payload.sub : undefined,
      };
      logger.info(
        {
          ...context,
          clientId,
          scopes,
        },
        "OAuth token verification successful.",
      );
      return authInfo;
    } catch (error) {
      // If the error is already a structured McpError, re-throw it directly.
      if (error instanceof McpError) {
        throw error;
      }

      const message =
        error instanceof Error && error.name === "JWTExpired"
          ? "Token has expired."
          : "OAuth token verification failed.";

      logger.warning(
        {
          ...context,
          errorName: error instanceof Error ? error.name : "Unknown",
        },
        `OAuth token verification failed: ${message}`,
      );

      // For all other errors, use the ErrorHandler to wrap them.
      throw ErrorHandler.handleError(error, {
        operation: "OauthStrategy.verify",
        context,
        rethrow: true,
        errorCode: JsonRpcErrorCode.Unauthorized,
        errorMapper: () =>
          new McpError(JsonRpcErrorCode.Unauthorized, message, context),
      });
    }
  }
}
