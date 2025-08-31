/**
 * @fileoverview Implements the JWT authentication strategy.
 * This module provides a concrete implementation of the AuthStrategy for validating
 * JSON Web Tokens (JWTs). It encapsulates all logic related to JWT verification,
 * including secret key management and payload validation.
 * @module src/mcp-server/transports/auth/strategies/JwtStrategy
 */
import { jwtVerify } from "jose";
import { config } from "../../../../config/index.js";
import { JsonRpcErrorCode, McpError } from "../../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  requestContextService,
} from "../../../../utils/index.js";
import type { AuthInfo } from "../lib/authTypes.js";
import type { AuthStrategy } from "./authStrategy.js";

export class JwtStrategy implements AuthStrategy {
  private readonly secretKey: Uint8Array | null;
  private readonly env: string;

  constructor(
    env: string = config.environment,
    secretKey: string | undefined = config.mcpAuthSecretKey,
  ) {
    const context = requestContextService.createRequestContext({
      operation: "JwtStrategy.constructor",
    });
    logger.debug("Initializing JwtStrategy...", context);
    this.env = env;

    if (this.env === "production" && !secretKey) {
      logger.fatal(
        "CRITICAL: MCP_AUTH_SECRET_KEY is not set in production for JWT auth.",
        context,
      );
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        "MCP_AUTH_SECRET_KEY must be set for JWT auth in production.",
        context,
      );
    } else if (!secretKey) {
      logger.warning(
        "MCP_AUTH_SECRET_KEY is not set. JWT auth will be bypassed (DEV ONLY).",
        context,
      );
      this.secretKey = null;
    } else {
      logger.info("JWT secret key loaded successfully.", context);
      this.secretKey = new TextEncoder().encode(secretKey);
    }
  }

  async verify(token: string): Promise<AuthInfo> {
    const context = requestContextService.createRequestContext({
      operation: "JwtStrategy.verify",
    });
    logger.debug("Attempting to verify JWT.", context);

    // Handle development mode bypass
    if (!this.secretKey) {
      if (this.env !== "production") {
        logger.warning(
          "Bypassing JWT verification: No secret key (DEV ONLY).",
          context,
        );
        return {
          token: "dev-mode-placeholder-token",
          clientId: config.devMcpClientId || "dev-client-id",
          scopes: config.devMcpScopes || ["dev-scope"],
        };
      }
      // This path is defensive. The constructor should prevent this state in production.
      logger.crit("Auth secret key is missing in production.", context);
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        "Auth secret key is missing in production. This indicates a server configuration error.",
        context,
      );
    }

    try {
      const { payload: decoded } = await jwtVerify(token, this.secretKey);
      logger.debug("JWT signature verified successfully.", {
        ...context,
        claims: decoded,
      });

      const clientId =
        typeof decoded.cid === "string"
          ? decoded.cid
          : typeof decoded.client_id === "string"
            ? decoded.client_id
            : undefined;

      if (!clientId) {
        logger.warning(
          "Invalid token: missing 'cid' or 'client_id' claim.",
          context,
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
        scopes = decoded.scp;
      } else if (typeof decoded.scope === "string" && decoded.scope.trim()) {
        scopes = decoded.scope.split(" ").filter(Boolean);
      }

      if (scopes.length === 0) {
        logger.warning(
          "Invalid token: missing or empty 'scp' or 'scope' claim.",
          context,
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
        ...(decoded.sub && { subject: decoded.sub }),
      };
      logger.info("JWT verification successful.", {
        ...context,
        clientId,
        scopes,
      });
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

      logger.warning(`JWT verification failed: ${message}`, {
        ...context,
        errorName: error instanceof Error ? error.name : "Unknown",
      });

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
