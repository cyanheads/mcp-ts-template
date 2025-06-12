/**
 * @fileoverview Hono middleware for OAuth 2.1 Bearer Token validation.
 * This middleware extracts a JWT from the Authorization header, validates it against
 * a remote JWKS (JSON Web Key Set), and checks its issuer and audience claims.
 * On success, it populates an AuthInfo object and stores it in an AsyncLocalStorage
 * context for use in downstream handlers.
 *
 * @module src/mcp-server/transports/authentication/oauthMiddleware
 */

import { HttpBindings } from "@hono/node-server";
import { Context, Next } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "../../../config/index.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import { ErrorHandler } from "../../../utils/internal/errorHandler.js";
import { logger, requestContextService } from "../../../utils/index.js";
import { authContext } from "./authContext.js";
import type { AuthInfo } from "./types.js";

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
  const context = requestContextService.createRequestContext({
    operation: "oauthMiddleware",
    httpMethod: c.req.method,
    httpPath: c.req.path,
  });

  if (!jwks) {
    // This should not happen if startup validation is correct, but it's a safeguard.
    const error = new McpError(
      BaseErrorCode.CONFIGURATION_ERROR,
      "OAuth middleware is active, but JWKS client is not initialized.",
      context,
    );
    ErrorHandler.handleError(error, { operation: "oauthMiddleware", context });
    return c.json({ error: "Server configuration error." }, 500);
  }

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "Unauthorized: Missing or invalid token format." },
      401,
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

    const clientId =
      typeof payload.client_id === "string" ? payload.client_id : undefined;

    if (!clientId) {
      logger.warning(
        "Authentication failed: OAuth token 'client_id' claim is missing or not a string.",
        { ...context, jwtPayloadKeys: Object.keys(payload) },
      );
      return c.json(
        { error: "Unauthorized: Invalid token, missing client identifier." },
        401,
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
  } catch (error: any) {
    logger.warning("OAuth token validation failed", {
      ...context,
      errorName: error.name,
      errorMessage: error.message,
    });
    // The `jose` library provides specific error codes like 'ERR_JWT_EXPIRED' or 'ERR_JWS_INVALID'
    const message = `Unauthorized: ${error.message || "Invalid token"}`;
    return c.json({ error: message }, 401);
  }
}
