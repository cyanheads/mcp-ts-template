/**
 * @fileoverview Hono middleware for OAuth 2.1 Bearer Token validation.
 * This middleware extracts a JWT from the Authorization header, validates it against
 * a remote JWKS (JSON Web Key Set), and checks its issuer and audience claims.
 * On success, it populates an AuthInfo object and stores it in an AsyncLocalStorage
 * context for use in downstream handlers.
 *
 * @module src/mcp-server/transports/auth/strategies/oauth/oauthMiddleware
 */

import { HttpBindings } from "@hono/node-server";
import { Context, Next } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../../../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../../../types-global/errors.js";
import { logger, requestContextService } from "../../../../../utils/index.js";
import { ErrorHandler } from "../../../../../utils/internal/errorHandler.js";
import { authContext } from "../../core/authContext.js";
import type { AuthInfo } from "../../core/authTypes.js";

// --- Startup Validation ---
// Ensures that necessary OAuth configuration is present when the mode is 'oauth'.
if (config.mcpAuthMode === "oauth") {
  if (!config.oauthIssuerUrl) {
    throw new Error(
      "OAUTH_ISSUER_URL must be set when MCP_AUTH_MODE is 'oauth'",
    );
  }
  if (!config.oauthAudience) {
    throw new Error("OAUTH_AUDIENCE must be set when MCP_AUTH_MODE is 'oauth'");
  }
  logger.info(
    "OAuth 2.1 mode enabled. Verifying tokens against issuer.",
    requestContextService.createRequestContext({
      issuer: config.oauthIssuerUrl,
      audience: config.oauthAudience,
    }),
  );
}

// --- JWKS Client Initialization ---
// The remote JWK set is fetched and cached to avoid network calls on every request.
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
if (config.mcpAuthMode === "oauth" && config.oauthIssuerUrl) {
  try {
    const jwksUrl = new URL(
      config.oauthJwksUri ||
        `${config.oauthIssuerUrl.replace(/\/$/, "")}/.well-known/jwks.json`,
    );
    jwks = createRemoteJWKSet(jwksUrl, {
      cooldownDuration: 300000, // 5 minutes
      timeoutDuration: 5000, // 5 seconds
    });
    logger.info(
      `JWKS client initialized for URL: ${jwksUrl.href}`,
      requestContextService.createRequestContext({
        operation: "oauthMiddlewareSetup",
      }),
    );
  } catch (error) {
    logger.fatal(
      "Failed to initialize JWKS client.",
      error as Error,
      requestContextService.createRequestContext({
        operation: "oauthMiddlewareSetup",
      }),
    );
    // Prevent server from starting if JWKS setup fails in oauth mode
    process.exit(1);
  }
}

/**
 * Hono middleware for verifying OAuth 2.1 JWT Bearer tokens.
 * It validates the token and uses AsyncLocalStorage to pass auth info.
 * @param c - The Hono context object.
 * @param next - The function to call to proceed to the next middleware.
 */
export async function oauthMiddleware(
  c: Context<{ Bindings: HttpBindings }>,
  next: Next,
) {
  // If OAuth is not the configured auth mode, skip this middleware.
  if (config.mcpAuthMode !== "oauth") {
    return await next();
  }

  const context = requestContextService.createRequestContext({
    operation: "oauthMiddleware",
    httpMethod: c.req.method,
    httpPath: c.req.path,
  });

  if (!jwks) {
    // This should not happen if startup validation is correct, but it's a safeguard.
    // This should not happen if startup validation is correct, but it's a safeguard.
    throw new McpError(
      BaseErrorCode.CONFIGURATION_ERROR,
      "OAuth middleware is active, but JWKS client is not initialized.",
      context,
    );
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new McpError(
      BaseErrorCode.UNAUTHORIZED,
      "Missing or invalid token format.",
    );
  }

  const token = authHeader.substring(7);

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.oauthIssuerUrl!,
      audience: config.oauthAudience!,
    });

    // The 'scope' claim is typically a space-delimited string in OAuth 2.1.
    const scopes =
      typeof payload.scope === "string" ? payload.scope.split(" ") : [];

    if (scopes.length === 0) {
      logger.warning(
        "Authentication failed: Token contains no scopes, but scopes are required.",
        { ...context, jwtPayloadKeys: Object.keys(payload) },
      );
      throw new McpError(
        BaseErrorCode.UNAUTHORIZED,
        "Token must contain valid, non-empty scopes.",
      );
    }

    const clientId =
      typeof payload.client_id === "string" ? payload.client_id : undefined;

    if (!clientId) {
      logger.warning(
        "Authentication failed: OAuth token 'client_id' claim is missing or not a string.",
        { ...context, jwtPayloadKeys: Object.keys(payload) },
      );
      throw new McpError(
        BaseErrorCode.UNAUTHORIZED,
        "Invalid token, missing client identifier.",
      );
    }

    const authInfo: AuthInfo = {
      token,
      clientId,
      scopes,
      subject: typeof payload.sub === "string" ? payload.sub : undefined,
    };

    // Attach to the raw request for potential legacy compatibility and
    // store in AsyncLocalStorage for modern, safe access in handlers.
    c.env.incoming.auth = authInfo;
    await authContext.run({ authInfo }, next);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "JWTExpired") {
      logger.warning("Authentication failed: OAuth token expired.", context);
      throw new McpError(BaseErrorCode.UNAUTHORIZED, "Token expired.");
    }

    const handledError = ErrorHandler.handleError(error, {
      operation: "oauthMiddleware",
      context,
      rethrow: false, // We will throw a new McpError below
    });

    // Ensure we always throw an McpError for consistency
    if (handledError instanceof McpError) {
      throw handledError;
    } else {
      throw new McpError(
        BaseErrorCode.UNAUTHORIZED,
        `Unauthorized: ${handledError.message || "Invalid token"}`,
        { originalError: handledError.name },
      );
    }
  }
}
