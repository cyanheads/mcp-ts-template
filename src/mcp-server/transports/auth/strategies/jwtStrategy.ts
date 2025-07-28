/**
 * @fileoverview Implements the JWT authentication strategy.
 * This module provides a concrete implementation of the AuthStrategy for validating
 * JSON Web Tokens (JWTs). It encapsulates all logic related to JWT verification,
 * including secret key management and payload validation.
 * @module src/mcp-server/transports/auth/strategies/JwtStrategy
 */
import { jwtVerify } from "jose";
import { config, environment } from "../../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../../types-global/errors.js";
import { logger } from "../../../../utils/index.js";
import type { AuthInfo } from "../lib/authTypes.js";
import type { AuthStrategy } from "./authStrategy.js";

export class JwtStrategy implements AuthStrategy {
  private readonly secretKey: Uint8Array | null;

  constructor() {
    if (config.mcpAuthMode === "jwt") {
      if (environment === "production" && !config.mcpAuthSecretKey) {
        logger.fatal(
          "CRITICAL: MCP_AUTH_SECRET_KEY is not set in production for JWT auth.",
        );
        throw new Error("MCP_AUTH_SECRET_KEY must be set for JWT auth.");
      } else if (!config.mcpAuthSecretKey) {
        logger.warning(
          "MCP_AUTH_SECRET_KEY is not set. JWT auth will be bypassed (DEV ONLY).",
        );
        this.secretKey = null;
      } else {
        this.secretKey = new TextEncoder().encode(config.mcpAuthSecretKey);
      }
    } else {
      this.secretKey = null;
    }
  }

  async verify(token: string): Promise<AuthInfo> {
    // Handle development mode bypass
    if (!this.secretKey) {
      if (environment !== "production") {
        logger.warning("Bypassing JWT verification: No secret key (DEV ONLY).");
        return {
          token: "dev-mode-placeholder-token",
          clientId: "dev-client-id",
          scopes: ["dev-scope"],
        };
      }
      throw new McpError(
        BaseErrorCode.CONFIGURATION_ERROR,
        "Auth secret key is missing in production.",
      );
    }

    try {
      const { payload: decoded } = await jwtVerify(token, this.secretKey);

      const clientId =
        typeof decoded.cid === "string"
          ? decoded.cid
          : typeof decoded.client_id === "string"
            ? decoded.client_id
            : undefined;

      if (!clientId) {
        throw new McpError(
          BaseErrorCode.UNAUTHORIZED,
          "Invalid token: missing 'cid' or 'client_id' claim.",
        );
      }

      let scopes: string[] = [];
      if (
        Array.isArray(decoded.scp) &&
        decoded.scp.every((s) => typeof s === "string")
      ) {
        scopes = decoded.scp as string[];
      } else if (typeof decoded.scope === "string" && decoded.scope.trim()) {
        scopes = decoded.scope.split(" ").filter(Boolean);
      }

      if (scopes.length === 0) {
        throw new McpError(
          BaseErrorCode.UNAUTHORIZED,
          "Token must contain valid, non-empty scopes.",
        );
      }

      return { token, clientId, scopes };
    } catch (error) {
      if (error instanceof McpError) throw error;

      const message =
        error instanceof Error && error.name === "JWTExpired"
          ? "Token has expired."
          : "Token verification failed.";

      throw new McpError(BaseErrorCode.UNAUTHORIZED, message, {
        originalError: error instanceof Error ? error.name : "Unknown",
      });
    }
  }
}
