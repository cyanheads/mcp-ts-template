/**
 * @fileoverview Implements the JWT authentication strategy.
 * This module provides a concrete implementation of the AuthStrategy for validating
 * JSON Web Tokens (JWTs). It encapsulates all logic related to JWT verification,
 * including secret key management and payload validation.
 * @module src/mcp-server/transports/auth/strategies/JwtStrategy
 */
import { jwtVerify } from "jose";
import { config, environment } from "@/config/index.js";
import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import { ErrorHandler, logger, requestContextService } from "@/utils/index.js";
import type { AuthInfo } from "../lib/authTypes.js";
import type { AuthStrategy } from "./authStrategy.js";

export class JwtStrategy implements AuthStrategy {
  private readonly secretKey: Uint8Array | null;

  constructor() {
    const context = requestContextService.createRequestContext({
      operation: "JwtStrategy.constructor",
    });
    logger.debug(context, "Initializing JwtStrategy...");

    if (config.mcpAuthMode === "jwt") {
      if (environment === "production" && !config.mcpAuthSecretKey) {
        logger.fatal(
          context,
          "CRITICAL: MCP_AUTH_SECRET_KEY is not set in production for JWT auth.",
        );
        throw new McpError(
          JsonRpcErrorCode.ConfigurationError,
          "MCP_AUTH_SECRET_KEY must be set for JWT auth in production.",
          context,
        );
      } else if (!config.mcpAuthSecretKey) {
        logger.warning(
          context,
          "MCP_AUTH_SECRET_KEY is not set. JWT auth will be bypassed (DEV ONLY).",
        );
        this.secretKey = null;
      } else {
        logger.info(context, "JWT secret key loaded successfully.");
        this.secretKey = new TextEncoder().encode(config.mcpAuthSecretKey);
      }
    } else {
      this.secretKey = null;
    }
  }

  async verify(token: string): Promise<AuthInfo> {
    const context = requestContextService.createRequestContext({
      operation: "JwtStrategy.verify",
    });
    logger.debug(context, "Attempting to verify JWT.");

    // Handle development mode bypass
    if (!this.secretKey) {
      if (environment !== "production") {
        logger.warning(
          context,
          "Bypassing JWT verification: No secret key (DEV ONLY).",
        );
        return {
          token: "dev-mode-placeholder-token",
          clientId: config.devMcpClientId || "dev-client-id",
          scopes: config.devMcpScopes || ["dev-scope"],
        };
      }
      // This path is defensive. The constructor should prevent this state in production.
      logger.crit(context, "Auth secret key is missing in production.");
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        "Auth secret key is missing in production. This indicates a server configuration error.",
        context,
      );
    }

    try {
      const { payload: decoded } = await jwtVerify(token, this.secretKey);
      logger.debug(
        {
          ...context,
          claims: decoded,
        },
        "JWT signature verified successfully.",
      );

      const clientId =
        typeof decoded.cid === "string"
          ? decoded.cid
          : typeof decoded.client_id === "string"
            ? decoded.client_id
            : undefined;

      if (!clientId) {
        logger.warning(
          context,
          "Invalid token: missing 'cid' or 'client_id' claim.",
        );
        throw new McpError(
          JsonRpcErrorCode.Unauthorized,
          "Invalid token: missing 'cid' or 'client_id' claim.",
          context,
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
        logger.warning(
          context,
          "Invalid token: missing or empty 'scp' or 'scope' claim.",
        );
        throw new McpError(
          JsonRpcErrorCode.Unauthorized,
          "Token must contain valid, non-empty scopes.",
          context,
        );
      }

      const authInfo: AuthInfo = {
        token,
        clientId,
        scopes,
        subject: decoded.sub,
      };
      logger.info(
        {
          ...context,
          clientId,
          scopes,
        },
        "JWT verification successful.",
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
          : "Token verification failed.";

      logger.warning(
        {
          ...context,
          errorName: error instanceof Error ? error.name : "Unknown",
        },
        `JWT verification failed: ${message}`,
      );

      throw ErrorHandler.handleError(error, {
        operation: "JwtStrategy.verify",
        context,
        rethrow: true,
        errorCode: JsonRpcErrorCode.Unauthorized,
        errorMapper: () =>
          new McpError(JsonRpcErrorCode.Unauthorized, message, context),
      });
    }
  }
}
