Review this code base file by file , line by line, to fully understand the code base - identify all features, functions, utilities, etc.
Identify any issues, gaps, inconsistencies, etc. 
Additionally identify potential enhancements, including architectural changes, refactoring, etc.
Skip adding unit/integration tests - that is handled externally.
Identify the modern, best approach for what we're trying to accomplish; prefer using the latest stable versions of libraries and frameworks.
After you have properly reviewed the code base and mapped out the necessary changes, write out a detailed plan for my developer on exactly what to change in our current code base.

# Full project repository tree

# mcp-ts-template - Directory Structure

Generated on: 2025-08-23 17:06:17

```
mcp-ts-template
├── .clinerules
│   └── clinerules.md
├── .github
│   ├── workflows
│   │   └── publish.yml
│   └── FUNDING.yml
├── .vscode
│   └── settings.json
├── changelogs
│   └── CHANGELOG-v1.0.6-1.7.9.md
├── coverage
├── docs
│   ├── api-references
│   │   ├── duckDB.md
│   │   ├── jsdoc-standard-tags.md
│   │   └── typedoc-reference.md
│   ├── migrations
│   │   └── v1.9.0.md
│   ├── best-practices.md
│   └── tree.md
├── scripts
│   ├── clean.ts
│   ├── devdocs.ts
│   ├── fetch-openapi-spec.ts
│   ├── lint.ts
│   ├── make-executable.ts
│   ├── README.md
│   └── tree.ts
├── src
│   ├── config
│   │   └── index.ts
│   ├── mcp-server
│   │   ├── resources
│   │   │   ├── echoResource
│   │   │   │   ├── index.ts
│   │   │   │   ├── logic.ts
│   │   │   │   └── registration.ts
│   │   │   ├── utils
│   │   │   │   └── resource-utils.ts
│   │   │   └── index.ts
│   │   ├── tools
│   │   │   ├── catFactFetcher
│   │   │   │   ├── index.ts
│   │   │   │   ├── logic.ts
│   │   │   │   └── registration.ts
│   │   │   ├── echoTool
│   │   │   │   ├── index.ts
│   │   │   │   ├── logic.ts
│   │   │   │   └── registration.ts
│   │   │   ├── imageTest
│   │   │   │   ├── index.ts
│   │   │   │   ├── logic.ts
│   │   │   │   └── registration.ts
│   │   │   ├── utils
│   │   │   │   └── tool-utils.ts
│   │   │   └── index.ts
│   │   ├── transports
│   │   │   ├── auth
│   │   │   │   ├── lib
│   │   │   │   │   ├── authContext.ts
│   │   │   │   │   ├── authTypes.ts
│   │   │   │   │   └── authUtils.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── authStrategy.ts
│   │   │   │   │   ├── jwtStrategy.ts
│   │   │   │   │   └── oauthStrategy.ts
│   │   │   │   ├── authFactory.ts
│   │   │   │   ├── authMiddleware.ts
│   │   │   │   └── index.ts
│   │   │   ├── core
│   │   │   │   ├── autoTransportManager.ts
│   │   │   │   ├── baseTransportManager.ts
│   │   │   │   ├── headerUtils.ts
│   │   │   │   ├── honoNodeBridge.ts
│   │   │   │   ├── statefulTransportManager.ts
│   │   │   │   ├── statelessTransportManager.ts
│   │   │   │   ├── transportRequest.ts
│   │   │   │   └── transportTypes.ts
│   │   │   ├── http
│   │   │   │   ├── httpErrorHandler.ts
│   │   │   │   ├── httpTransport.ts
│   │   │   │   ├── httpTypes.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── mcpTransportMiddleware.ts
│   │   │   └── stdio
│   │   │       ├── index.ts
│   │   │       └── stdioTransport.ts
│   │   └── server.ts
│   ├── services
│   │   ├── duck-db
│   │   │   ├── duckDBConnectionManager.ts
│   │   │   ├── duckDBQueryExecutor.ts
│   │   │   ├── duckDBService.ts
│   │   │   └── types.ts
│   │   ├── llm-providers
│   │   │   └── openRouterProvider.ts
│   │   └── supabase
│   │       └── supabaseClient.ts
│   ├── storage
│   │   └── duckdbExample.ts
│   ├── types-global
│   │   └── errors.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── asyncContext.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── logging-helpers.ts
│   │   │   ├── performance.ts
│   │   │   └── requestContext.ts
│   │   ├── metrics
│   │   │   ├── index.ts
│   │   │   └── tokenCounter.ts
│   │   ├── network
│   │   │   ├── fetchWithTimeout.ts
│   │   │   └── index.ts
│   │   ├── parsing
│   │   │   ├── dateParser.ts
│   │   │   ├── index.ts
│   │   │   └── jsonParser.ts
│   │   ├── scheduling
│   │   │   ├── index.ts
│   │   │   └── scheduler.ts
│   │   ├── security
│   │   │   ├── idGenerator.ts
│   │   │   ├── index.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── sanitization.ts
│   │   ├── telemetry
│   │   │   ├── instrumentation.ts
│   │   │   └── semconv.ts
│   │   └── index.ts
│   ├── index.ts
│   └── README.md
├── tests
│   ├── mcp-server
│   │   ├── tools
│   │   │   ├── catFactFetcher
│   │   │   │   ├── logic.test.ts
│   │   │   │   └── registration.test.ts
│   │   │   ├── echoTool
│   │   │   │   ├── logic.test.ts
│   │   │   │   └── registration.test.ts
│   │   │   └── imageTest
│   │   │       └── registration.test.ts
│   │   └── transports
│   │       ├── auth
│   │       │   ├── lib
│   │       │   │   └── authUtils.test.ts
│   │       │   └── strategies
│   │       └── stdio
│   │           └── stdioTransport.test.ts
│   ├── mocks
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── services
│   │   ├── duck-db
│   │   │   ├── duckDBConnectionManager.test.ts
│   │   │   ├── duckDBQueryExecutor.test.ts
│   │   │   └── duckDBService.test.ts
│   │   ├── llm-providers
│   │   └── supabase
│   ├── utils
│   │   ├── internal
│   │   │   └── requestContext.test.ts
│   │   ├── metrics
│   │   │   └── tokenCounter.test.ts
│   │   ├── network
│   │   │   └── fetchWithTimeout.test.ts
│   │   ├── parsing
│   │   │   ├── dateParser.test.ts
│   │   │   └── jsonParser.test.ts
│   │   ├── scheduling
│   │   │   └── scheduler.test.ts
│   │   ├── security
│   │   │   ├── idGenerator.test.ts
│   │   │   ├── rateLimiter.test.ts
│   │   │   └── sanitization.test.ts
│   │   └── telemetry
│   │       └── instrumentation.test.ts
│   └── setup.ts
├── .dockerignore
├── .env.example
├── .gitignore
├── .ncurc.json
├── CHANGELOG.md
├── Dockerfile
├── eslint.config.js
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── repomix.config.json
├── smithery.yaml
├── tsconfig.json
├── tsconfig.typedoc.json
├── tsconfig.vitest.json
├── tsdoc.json
├── typedoc.json
└── vitest.config.ts
```

_Note: This tree excludes files and directories matched by .gitignore and default patterns._


---

# Let's focus on the following section of our code base.

This file is a merged representation of the entire codebase, combining all repository files into a single document.
Generated by Repomix on: 2025-08-23T17:06:17.995Z

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Repository structure
4. Repository files, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's
  configuration.
- Binary files are not included in this packed representation. Please refer to
  the Repository Structure section for a complete list of file paths, including
  binary files.
</notes>

<additional_info>

For more information about Repomix, visit: https://github.com/yamadashy/repomix
</additional_info>

</file_summary>

<repository_structure>
auth/
  lib/
    authContext.ts
    authTypes.ts
    authUtils.ts
  strategies/
    authStrategy.ts
    jwtStrategy.ts
    oauthStrategy.ts
  authFactory.ts
  authMiddleware.ts
  index.ts
core/
  autoTransportManager.ts
  baseTransportManager.ts
  headerUtils.ts
  honoNodeBridge.ts
  statefulTransportManager.ts
  statelessTransportManager.ts
  transportRequest.ts
  transportTypes.ts
http/
  httpErrorHandler.ts
  httpTransport.ts
  httpTypes.ts
  index.ts
  mcpTransportMiddleware.ts
stdio/
  index.ts
  stdioTransport.ts
</repository_structure>

<repository_files>
This section contains the contents of the repository's files.

<file path="auth/lib/authContext.ts">
/**
 * @fileoverview Defines the AsyncLocalStorage context for authentication information.
 * This module provides a mechanism to store and retrieve authentication details
 * (like scopes and client ID) across asynchronous operations, making it available
 * from the middleware layer down to the tool and resource handlers without
 * drilling props.
 *
 * @module src/mcp-server/transports/auth/core/authContext
 */

import { AsyncLocalStorage } from "async_hooks";
import type { AuthInfo } from "./authTypes.js";

/**
 * Defines the structure of the store used within the AsyncLocalStorage.
 * It holds the authentication information for the current request context.
 */
interface AuthStore {
  authInfo: AuthInfo;
}

/**
 * An instance of AsyncLocalStorage to hold the authentication context (`AuthStore`).
 * This allows `authInfo` to be accessible throughout the async call chain of a request
 * after being set in the authentication middleware.
 *
 * @example
 * // In middleware:
 * await authContext.run({ authInfo }, next);
 *
 * // In a deeper handler:
 * const store = authContext.getStore();
 * const scopes = store?.authInfo.scopes;
 */
export const authContext = new AsyncLocalStorage<AuthStore>();
</file>

<file path="auth/lib/authTypes.ts">
/**
 * @fileoverview Shared types for authentication middleware.
 * @module src/mcp-server/transports/auth/core/auth.types
 */

import type { AuthInfo as SdkAuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

/**
 * Defines the structure for authentication information derived from a token.
 * It extends the base SDK type to include common optional claims.
 */
export type AuthInfo = SdkAuthInfo & {
  subject?: string;
};

// The declaration for `http.IncomingMessage` is no longer needed here,
// as the new architecture avoids direct mutation where possible and handles
// the attachment within the Hono context.
</file>

<file path="auth/lib/authUtils.ts">
/**
 * @fileoverview Provides utility functions for authorization, specifically for
 * checking token scopes against required permissions for a given operation.
 * @module src/mcp-server/transports/auth/core/authUtils
 */

import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import { logger, requestContextService } from "@/utils/index.js";
import { authContext } from "./authContext.js";

/**
 * Checks if the current authentication context contains all the specified scopes.
 * This function is designed to be called within tool or resource handlers to
 * enforce scope-based access control. It retrieves the authentication information
 * from `authContext` (AsyncLocalStorage).
 *
 * @param requiredScopes - An array of scope strings that are mandatory for the operation.
 * @throws {McpError} Throws an error with `BaseErrorCode.INTERNAL_ERROR` if the
 *   authentication context is missing, which indicates a server configuration issue.
 * @throws {McpError} Throws an error with `BaseErrorCode.FORBIDDEN` if one or
 *   more required scopes are not present in the validated token.
 */
export function withRequiredScopes(requiredScopes: string[]): void {
  const operationName = "withRequiredScopesCheck";
  const initialContext = requestContextService.createRequestContext({
    operation: operationName,
    requiredScopes,
  });

  logger.debug(initialContext, "Performing scope authorization check.");

  const store = authContext.getStore();

  if (!store || !store.authInfo) {
    logger.crit(
      initialContext,
      "Authentication context is missing in withRequiredScopes. This is a server configuration error.",
    );
    // This is a server-side logic error; the auth middleware should always populate this.
    throw new McpError(
      JsonRpcErrorCode.InternalError,
      "Authentication context is missing. This indicates a server configuration error.",
      {
        ...initialContext,
        error: "AuthStore not found in AsyncLocalStorage.",
      },
    );
  }

  const { scopes: grantedScopes, clientId, subject } = store.authInfo;
  const grantedScopeSet = new Set(grantedScopes);

  const missingScopes = requiredScopes.filter(
    (scope) => !grantedScopeSet.has(scope),
  );

  const finalContext = {
    ...initialContext,
    grantedScopes,
    clientId,
    subject,
  };

  if (missingScopes.length > 0) {
    const errorContext = { ...finalContext, missingScopes };
    logger.warning(
      errorContext,
      "Authorization failed: Missing required scopes.",
    );
    throw new McpError(
      JsonRpcErrorCode.Forbidden,
      `Insufficient permissions. Missing required scopes: ${missingScopes.join(", ")}`,
      errorContext,
    );
  }

  logger.debug(finalContext, "Scope authorization successful.");
}
</file>

<file path="auth/strategies/authStrategy.ts">
/**
 * @fileoverview Defines the interface for all authentication strategies.
 * This interface establishes a contract for verifying authentication tokens,
 * ensuring that any authentication method (JWT, OAuth, etc.) can be used
 * interchangeably by the core authentication middleware.
 * @module src/mcp-server/transports/auth/strategies/AuthStrategy
 */
import type { AuthInfo } from "../lib/authTypes.js";

export interface AuthStrategy {
  /**
   * Verifies an authentication token.
   * @param token The raw token string extracted from the request.
   * @returns A promise that resolves with the AuthInfo on successful verification.
   * @throws {McpError} if the token is invalid, expired, or fails verification for any reason.
   */
  verify(token: string): Promise<AuthInfo>;
}
</file>

<file path="auth/strategies/jwtStrategy.ts">
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
</file>

<file path="auth/strategies/oauthStrategy.ts">
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
</file>

<file path="auth/authFactory.ts">
/**
 * @fileoverview Factory for creating an authentication strategy based on configuration.
 * This module centralizes the logic for selecting and instantiating the correct
 * authentication strategy, promoting loose coupling and easy extensibility.
 * @module src/mcp-server/transports/auth/authFactory
 */
import { config } from "@/config/index.js";
import { logger, requestContextService } from "@/utils/index.js";
import { AuthStrategy } from "./strategies/authStrategy.js";
import { JwtStrategy } from "./strategies/jwtStrategy.js";
import { OauthStrategy } from "./strategies/oauthStrategy.js";

/**
 * Creates and returns an authentication strategy instance based on the
 * application's configuration (`config.mcpAuthMode`).
 *
 * @returns An instance of a class that implements the `AuthStrategy` interface,
 *          or `null` if authentication is disabled (`none`).
 * @throws {Error} If the auth mode is unknown or misconfigured.
 */
export function createAuthStrategy(): AuthStrategy | null {
  const context = requestContextService.createRequestContext({
    operation: "createAuthStrategy",
    authMode: config.mcpAuthMode,
  });
  logger.info(context, "Creating authentication strategy...");

  switch (config.mcpAuthMode) {
    case "jwt":
      logger.debug(context, "Instantiating JWT authentication strategy.");
      return new JwtStrategy();
    case "oauth":
      logger.debug(context, "Instantiating OAuth authentication strategy.");
      return new OauthStrategy();
    case "none":
      logger.info(context, "Authentication is disabled ('none' mode).");
      return null; // No authentication
    default:
      // This ensures that if a new auth mode is added to the config type
      // but not to this factory, we get a compile-time or runtime error.
      logger.error(
        context,
        `Unknown authentication mode: ${config.mcpAuthMode}`,
      );
      throw new Error(`Unknown authentication mode: ${config.mcpAuthMode}`);
  }
}
</file>

<file path="auth/authMiddleware.ts">
/**
 * @fileoverview Defines a unified Hono middleware for authentication.
 * This middleware is strategy-agnostic. It extracts a Bearer token,
 * delegates verification to the provided authentication strategy, and
 * populates the async-local storage context with the resulting auth info.
 * @module src/mcp-server/transports/auth/authMiddleware
 */
import type { Context, Next } from "hono";
import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import type { HonoNodeBindings } from "@/mcp-server/transports/http/httpTypes.js";
import { ErrorHandler, logger, requestContextService } from "@/utils/index.js";
import { authContext } from "./lib/authContext.js";
import type { AuthStrategy } from "./strategies/authStrategy.js";

/**
 * Creates a Hono middleware function that enforces authentication using a given strategy.
 *
 * @param strategy - An instance of a class that implements the `AuthStrategy` interface.
 * @returns A Hono middleware function.
 */
export function createAuthMiddleware(strategy: AuthStrategy) {
  return async function authMiddleware(
    c: Context<{ Bindings: HonoNodeBindings }>,
    next: Next,
  ) {
    const context = requestContextService.createRequestContext({
      operation: "authMiddleware",
      method: c.req.method,
      path: c.req.path,
    });

    logger.debug(context, "Initiating authentication check.");

    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warning(context, "Authorization header missing or invalid.");
      throw new McpError(
        JsonRpcErrorCode.Unauthorized,
        "Missing or invalid Authorization header. Bearer scheme required.",
        context,
      );
    }

    const token = authHeader.substring(7);
    if (!token) {
      logger.warning(
        context,
        "Bearer token is missing from Authorization header.",
      );
      throw new McpError(
        JsonRpcErrorCode.Unauthorized,
        "Authentication token is missing.",
        context,
      );
    }

    logger.debug(
      context,
      "Extracted Bearer token, proceeding to verification.",
    );

    try {
      const authInfo = await strategy.verify(token);

      const authLogContext = {
        ...context,
        clientId: authInfo.clientId,
        subject: authInfo.subject,
        scopes: authInfo.scopes,
      };
      logger.info(
        authLogContext,
        "Authentication successful. Auth context populated.",
      );

      // Run the next middleware in the chain within the populated auth context.
      await authContext.run({ authInfo }, next);
    } catch (error) {
      // The strategy is expected to throw an McpError.
      // We re-throw it here to be caught by the global httpErrorHandler.
      logger.warning(
        {
          ...context,
          error: error as Error,
        },
        "Authentication verification failed.",
      );

      // Ensure consistent error handling
      throw ErrorHandler.handleError(error, {
        operation: "authMiddlewareVerification",
        context,
        rethrow: true, // Rethrow to be caught by Hono's global error handler
        errorCode: JsonRpcErrorCode.Unauthorized, // Default to unauthorized if not more specific
      });
    }
  };
}
</file>

<file path="auth/index.ts">
/**
 * @fileoverview Barrel file for the auth module.
 * Exports core utilities and middleware strategies for easier imports.
 * @module src/mcp-server/transports/auth/index
 */

export { authContext } from "./lib/authContext.js";
export { withRequiredScopes } from "./lib/authUtils.js";
export type { AuthInfo } from "./lib/authTypes.js";

export { createAuthStrategy } from "./authFactory.js";
export { createAuthMiddleware } from "./authMiddleware.js";
export type { AuthStrategy } from "./strategies/authStrategy.js";
export { JwtStrategy } from "./strategies/jwtStrategy.js";
export { OauthStrategy } from "./strategies/oauthStrategy.js";
</file>

<file path="core/autoTransportManager.ts">
/**
 * @fileoverview Implements the "auto" mode transport manager.
 * This manager acts as a router, delegating requests to either a stateful or a
 * stateless manager based on the request's characteristics. It encapsulates the
 * logic for providing a hybrid session model.
 * @module src/mcp-server/transports/core/autoTransportManager
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { RequestContext } from "../../../utils/index.js";
import { McpTransportRequest } from "./transportRequest.js";
import {
  StatefulTransportManager,
  StatefulTransportOptions,
} from "./statefulTransportManager.js";
import { StatelessTransportManager } from "./statelessTransportManager.js";
import { TransportManager, TransportResponse } from "./transportTypes.js";

/**
 * A transport manager that dynamically handles both stateful and stateless requests.
 * It inspects each request and routes it to an underlying stateful manager if it
 * contains a session ID or is an initialization request. Otherwise, it handles
* the request ephemerally using a temporary stateless manager.
 */
export class AutoTransportManager implements TransportManager {
  private readonly statefulManager: StatefulTransportManager;
  private readonly statelessManager: StatelessTransportManager;

  /**
   * @param createServerInstanceFn A factory function to create new McpServer instances.
   * @param options Configuration options, primarily for the underlying stateful manager.
   */
  constructor(
    createServerInstanceFn: () => Promise<McpServer>,
    options: StatefulTransportOptions,
  ) {
    this.statefulManager = new StatefulTransportManager(
      createServerInstanceFn,
      options,
    );
    this.statelessManager = new StatelessTransportManager(
      createServerInstanceFn,
    );
  }

  /**
   * Handles an incoming request by routing it to the appropriate manager.
   * If the request is an `initialize` request or includes a session ID, it is
   * delegated to the stateful manager. Otherwise, a new stateless manager is
   * created to handle the single request.
   * @param request The standardized transport request object.
   * @returns A promise that resolves to a TransportResponse object.
   */
  async handleRequest(
    request: McpTransportRequest,
  ): Promise<TransportResponse> {
    const { body, sessionId } = request;

    // Route to stateful manager if it's an initialize request or has a session ID
    if (isInitializeRequest(body) || sessionId) {
      // The plan describes an intermediate state for StatefulTransportManager's handleRequest,
      // but for consistency with the new TransportManager interface, we will pass the whole request object.
      // This anticipates the final state of the refactoring.
      return this.statefulManager.handleRequest(request);
    }

    // Otherwise, handle as a one-off stateless request
    return this.statelessManager.handleRequest(request);
  }

  /**
   * Delegates a session deletion request to the underlying stateful manager.
   * @param sessionId The ID of the session to delete.
   * @param context The request context.
   * @returns A promise resolving to a TransportResponse confirming closure.
   */
  async handleDeleteRequest(
    sessionId: string,
    context: RequestContext,
  ): Promise<TransportResponse> {
    return this.statefulManager.handleDeleteRequest(sessionId, context);
  }

  /**
   * Shuts down the underlying stateful manager, cleaning up all its resources.
   */
  async shutdown(): Promise<void> {
    await this.statefulManager.shutdown();
  }
}
</file>

<file path="core/baseTransportManager.ts">
/**
 * @fileoverview Abstract base class for transport managers.
 * @module src/mcp-server/transports/core/baseTransportManager
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger, requestContextService } from "@/utils/index.js";
import { McpTransportRequest } from "./transportRequest.js";
import { TransportManager, TransportResponse } from "./transportTypes.js";

/**
 * Abstract base class for transport managers, providing common functionality.
 */
export abstract class BaseTransportManager implements TransportManager {
  protected readonly createServerInstanceFn: () => Promise<McpServer>;

  constructor(createServerInstanceFn: () => Promise<McpServer>) {
    const context = requestContextService.createRequestContext({
      operation: "BaseTransportManager.constructor",
      managerType: this.constructor.name,
    });
    logger.debug(context, "Initializing transport manager.");
    this.createServerInstanceFn = createServerInstanceFn;
  }

  abstract handleRequest(
    request: McpTransportRequest,
  ): Promise<TransportResponse>;

  abstract shutdown(): Promise<void>;
}
</file>

<file path="core/headerUtils.ts">
/**
 * @fileoverview Provides a utility for converting HTTP headers between Node.js
 * and Web Standards formats, ensuring compliance and correctness.
 * @module src/mcp-server/transports/core/headerUtils
 */

import type { OutgoingHttpHeaders, IncomingHttpHeaders } from "http";

/**
 * Converts Node.js-style OutgoingHttpHeaders to a Web-standard Headers object.
 *
 * This function is critical for interoperability between Node.js's `http` module
 * and Web APIs like Fetch and Hono. It correctly handles multi-value headers
 * (e.g., `Set-Cookie`), which Node.js represents as an array of strings, by
 * using the `Headers.append()` method. Standard single-value headers are set
 * using `Headers.set()`.
 *
 * @param nodeHeaders - The Node.js-style headers object to convert.
 * @returns A Web-standard Headers object.
 */
export function convertNodeHeadersToWebHeaders(
  nodeHeaders: OutgoingHttpHeaders,
): Headers {
  const webHeaders = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    // Skip undefined headers, which are valid in Node.js but not in Web Headers.
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      // For arrays, append each value to support multi-value headers.
      for (const v of value) {
        webHeaders.append(key, String(v));
      }
    } else {
      // For single values, set the header, overwriting any existing value.
      webHeaders.set(key, String(value));
    }
  }
  return webHeaders;
}

/**
 * Converts a Web-standard Headers object (used by Hono) to Node.js-style IncomingHttpHeaders.
 *
 * @param webHeaders - The Web-standard Headers object to convert.
 * @returns A Node.js-style IncomingHttpHeaders object.
 */
export function convertWebHeadersToNodeHeaders(
  webHeaders: Headers,
): IncomingHttpHeaders {
  const nodeHeaders: IncomingHttpHeaders = {};
  // The Headers.forEach provides the comma-separated string if multiple headers existed.
  webHeaders.forEach((value, key) => {
    // Node.js lowercases incoming header keys.
    nodeHeaders[key.toLowerCase()] = value;
  });
  return nodeHeaders;
}
</file>

<file path="core/honoNodeBridge.ts">
/**
 * @fileoverview Provides a high-fidelity bridge between the MCP SDK's Node.js-style
 * streamable HTTP transport and Hono's Web Standards-based streaming response.
 * This class is essential for adapting the Node.js `http.ServerResponse` API
 * to a format consumable by modern web frameworks.
 * @module src/mcp-server/transports/core/honoNodeBridge
 */

import { PassThrough } from "stream";
import type { OutgoingHttpHeaders } from "http";
import { logger, requestContextService } from "../../../utils/index.js";

/**
 * A mock `http.ServerResponse` that pipes all written data to a `PassThrough` stream.
 *
 * This class serves as a critical compatibility layer, emulating the behavior of a
 * Node.js `ServerResponse` to capture status codes, headers, and the response body.
 * The captured data can then be used to construct a Web-standard `Response` object,
 * for instance in a Hono application. It pays close attention to the timing of when
 * headers are considered "sent" to mimic Node.js behavior accurately.
 */
export class HonoStreamResponse extends PassThrough {
  public statusCode = 200;
  public headers: OutgoingHttpHeaders = {};
  private _headersSent = false;

  constructor() {
    super();
  }

  /**
   * A getter that reports whether the headers have been sent.
   * In this emulation, headers are considered sent the first time `write()` or `end()` is called.
   */
  get headersSent(): boolean {
    return this._headersSent;
  }

  /**
   * Sets the status code and headers for the response, mimicking `http.ServerResponse.writeHead`.
   *
   * @param statusCode - The HTTP status code.
   * @param statusMessageOrHeaders - An optional status message (string) or headers object.
   * @param headers - An optional headers object, used if the second argument is a status message.
   * @returns The instance of the class for chaining.
   */
  writeHead(
    statusCode: number,
    statusMessageOrHeaders?: string | OutgoingHttpHeaders,
    headers?: OutgoingHttpHeaders,
  ): this {
    if (this._headersSent) {
      // Per Node.js spec, do nothing if headers are already sent.
      return this;
    }
    this.statusCode = statusCode;

    const headersArg =
      typeof statusMessageOrHeaders === "string"
        ? headers
        : statusMessageOrHeaders;

    if (headersArg) {
      for (const [key, value] of Object.entries(headersArg)) {
        if (value !== undefined) {
          this.setHeader(key, value);
        }
      }
    }
    return this;
  }

  /**
   * Sets a single header value.
   *
   * @param name - The name of the header.
   * @param value - The value of the header.
   * @returns The instance of the class for chaining.
   */
  setHeader(name: string, value: string | number | string[]): this {
    if (this._headersSent) {
      // Retrieve context if available, otherwise create a basic one
      const context = requestContextService.createRequestContext({
        operation: "HonoStreamResponse.setHeader",
        component: "HonoNodeBridge",
      });

      // Replace console.warn with logger.warning
      logger.warning(
        { ...context, headerName: name },
        `[HonoBridge] Warning: Cannot set header "${name}" after headers are sent.`,
      );
      return this;
    }
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  /**
   * Gets a header that has been queued for the response.
   * @param name - The name of the header.
   * @returns The value of the header, or undefined if not set.
   */
  getHeader(name: string): string | number | string[] | undefined {
    return this.headers[name.toLowerCase()];
  }

  /**
   * Returns a copy of the current outgoing headers.
   */
  getHeaders(): OutgoingHttpHeaders {
    return { ...this.headers };
  }

  /**
   * Removes a header that has been queued for the response.
   * @param name - The name of the header to remove.
   */
  removeHeader(name: string): void {
    if (this._headersSent) {
      // Retrieve context if available
      const context = requestContextService.createRequestContext({
        operation: "HonoStreamResponse.removeHeader",
        component: "HonoNodeBridge",
      });

      // Replace console.warn with logger.warning
      logger.warning(
        { ...context, headerName: name },
        `[HonoBridge] Warning: Cannot remove header "${name}" after headers are sent.`,
      );
      return;
    }
    delete this.headers[name.toLowerCase()];
  }

  /**
   * A private helper to mark headers as sent. This is called implicitly
   * before any part of the body is written.
   */
  private ensureHeadersSent(): void {
    if (!this._headersSent) {
      this._headersSent = true;
    }
  }

  /**
   * Writes a chunk of the response body, mimicking `http.ServerResponse.write`.
   * This is the first point where headers are implicitly flushed.
   */
  write(
    chunk: unknown,
    encodingOrCallback?:
      | BufferEncoding
      | ((error: Error | null | undefined) => void),
    callback?: (error: Error | null | undefined) => void,
  ): boolean {
    this.ensureHeadersSent();

    const encoding =
      typeof encodingOrCallback === "string" ? encodingOrCallback : undefined;
    const cb =
      typeof encodingOrCallback === "function" ? encodingOrCallback : callback;

    if (encoding) {
      return super.write(chunk, encoding, cb);
    }
    return super.write(chunk, cb);
  }

  /**
   * Finishes sending the response, mimicking `http.ServerResponse.end`.
   * This also implicitly flushes headers if they haven't been sent yet.
   */
  end(
    chunk?: unknown,
    encodingOrCallback?: BufferEncoding | (() => void),
    callback?: () => void,
  ): this {
    this.ensureHeadersSent();

    const encoding =
      typeof encodingOrCallback === "string" ? encodingOrCallback : undefined;
    const cb =
      typeof encodingOrCallback === "function" ? encodingOrCallback : callback;

    if (encoding) {
      super.end(chunk, encoding, cb);
    } else {
      super.end(chunk, cb);
    }
    return this;
  }
}
</file>

<file path="core/statefulTransportManager.ts">
/**
 * @fileoverview Implements a stateful transport manager for the MCP SDK.
 *
 * This manager handles multiple, persistent MCP sessions. It creates and maintains
 * a dedicated McpServer and StreamableHTTPServerTransport instance for each session,
 * allowing for stateful, multi-turn interactions. It includes robust mechanisms for
 * session lifecycle management, including garbage collection of stale sessions and
 * concurrency controls to prevent race conditions.
 *
 * SCALABILITY NOTE: This manager maintains all session state in local process memory.
 * For horizontal scaling across multiple server instances, a load balancer with
 * sticky sessions (session affinity) is required to ensure that all requests for a
 * given session are routed to the same process instance that holds that session's state.
 *
 * @module src/mcp-server/transports/core/statefulTransportManager
 */

import { JsonRpcErrorCode, McpError } from "@/types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "@/utils/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { IncomingHttpHeaders, ServerResponse } from "http";
import { randomUUID } from "node:crypto";
import { Readable } from "stream";
import { BaseTransportManager } from "./baseTransportManager.js";
import { convertNodeHeadersToWebHeaders } from "./headerUtils.js";
import { HonoStreamResponse } from "./honoNodeBridge.js";
import { McpTransportRequest } from "./transportRequest.js";
import {
  HttpStatusCode,
  SessionState, // Import SessionState
  StatefulTransportManager as IStatefulTransportManager,
  TransportResponse,
  TransportSession,
} from "./transportTypes.js";

/**
 * Defines the configuration options for the StatefulTransportManager.
 */
export interface StatefulTransportOptions {
  staleSessionTimeoutMs: number;
  mcpHttpEndpointPath: string;
}

/**
 * Manages persistent, stateful MCP sessions.
 */
export class StatefulTransportManager
  extends BaseTransportManager
  implements IStatefulTransportManager
{
  private readonly transports = new Map<
    string,
    StreamableHTTPServerTransport
  >();
  private readonly servers = new Map<string, McpServer>();
  private readonly sessions = new Map<string, TransportSession>();
  private readonly garbageCollector: NodeJS.Timeout;
  private readonly options: StatefulTransportOptions;

  /**
   * @param createServerInstanceFn - A factory function to create new McpServer instances.
   * @param options - Configuration options for the manager.
   */
  constructor(
    createServerInstanceFn: () => Promise<McpServer>,
    options: StatefulTransportOptions,
  ) {
    super(createServerInstanceFn);
    this.options = options;
    const context = requestContextService.createRequestContext({
      operation: "StatefulTransportManager.constructor",
    });
    logger.info(context, "Starting session garbage collector.");
    const intervalMs = Math.max(
      10_000,
      Math.floor(this.options.staleSessionTimeoutMs / 2),
    );
    this.garbageCollector = setInterval(
      () => this.cleanupStaleSessions(),
      intervalMs,
    );
  }

  /**
   * Initializes a new stateful session and handles the first request.
   *
   * @param headers - The incoming request headers.
   * @param body - The parsed body of the request.
   * @param context - The request context.
   * @returns A promise resolving to a streaming TransportResponse with a session ID.
   * @private
   */
  private async initializeAndHandle(
    headers: IncomingHttpHeaders,
    body: unknown,
    context: RequestContext,
  ): Promise<TransportResponse> {
    const opContext = {
      ...context,
      operation: "StatefulTransportManager.initializeAndHandle",
    };
    logger.debug(opContext, "Initializing new stateful session.");

    let server: McpServer | undefined;
    let transport: StreamableHTTPServerTransport | undefined;

    try {
      server = await this.createServerInstanceFn();
      const mockRes = new HonoStreamResponse() as unknown as ServerResponse;
      const currentServer = server;

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          const sessionContext = { ...opContext, sessionId };
          this.transports.set(sessionId, transport!);
          this.servers.set(sessionId, currentServer);
          this.sessions.set(sessionId, {
            id: sessionId,
            state: SessionState.ACTIVE, // Set initial state
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            activeRequests: 0,
          });
          logger.info(sessionContext, `MCP Session created: ${sessionId}`);
        },
      });

      transport.onclose = () => {
        const sessionId = transport!.sessionId;
        if (sessionId) {
          const closeContext = { ...opContext, sessionId };
          this.closeSession(sessionId, closeContext).catch((err) =>
            logger.error(
              { error: err, ...closeContext },
              `Error during transport.onclose cleanup for session ${sessionId}`,
            ),
          );
        }
      };

      await server.connect(transport);
      logger.debug(opContext, "Server connected, handling initial request.");

      const mockReq = {
        headers,
        method: "POST",
        url: this.options.mcpHttpEndpointPath,
      } as import("http").IncomingMessage;
      await transport.handleRequest(mockReq, mockRes, body);

      const responseHeaders = convertNodeHeadersToWebHeaders(
        mockRes.getHeaders(),
      );
      if (transport.sessionId) {
        responseHeaders.set("Mcp-Session-Id", transport.sessionId);
      }

      const webStream = Readable.toWeb(
        mockRes as unknown as HonoStreamResponse,
      ) as ReadableStream<Uint8Array>;

      return {
        type: "stream",
        headers: responseHeaders,
        statusCode: mockRes.statusCode as HttpStatusCode,
        stream: webStream,
        sessionId: transport.sessionId,
      };
    } catch (error) {
      logger.error(
        { ...opContext, error: error as Error },
        "Failed to initialize stateful session. Cleaning up orphaned resources.",
      );

      const sessionInitialized =
        transport?.sessionId && this.transports.has(transport.sessionId);
      if (!sessionInitialized) {
        (async () => {
          await ErrorHandler.tryCatch(
            async () => {
              if (transport) await transport.close();
              if (server) await server.close();
            },
            {
              operation: "initializeAndHandle.cleanupOrphaned",
              context: opContext,
            },
          );
        })();
      }
      throw ErrorHandler.handleError(error, {
        operation: opContext.operation,
        context: opContext,
        rethrow: true,
      });
    }
  }

  /**
   * The new public entry point that conforms to the TransportManager interface.
   * It routes the request to the appropriate handler based on whether it's an
   * initialization request or a subsequent request for an existing session.
   */
  async handleRequest(
    request: McpTransportRequest,
  ): Promise<TransportResponse> {
    const { headers, body, context, sessionId } = request;

    if (sessionId) {
      const sessionContext = {
        ...context,
        sessionId,
        operation: "StatefulTransportManager.handleRequest",
      };

      const transport = this.transports.get(sessionId);
      const session = this.sessions.get(sessionId);

      if (!transport || !session) {
        logger.warning(
          sessionContext,
          `Request for non-existent session: ${sessionId}`,
        );
        return {
          type: "buffered",
          headers: new Headers({ "Content-Type": "application/json" }),
          statusCode: 404,
          body: {
            jsonrpc: "2.0",
            error: { code: -32601, message: "Session not found" },
          },
        };
      }

      // Check session state before accepting the request
      if (session.state === SessionState.CLOSING) {
        logger.warning(
          sessionContext,
          `Request received for session in CLOSING state: ${sessionId}`,
        );
        throw new McpError(
          JsonRpcErrorCode.Conflict, // Use Conflict status
          "Session is currently closing. Please start a new session.",
          sessionContext,
        );
      }

      session.lastAccessedAt = new Date();
      session.activeRequests += 1;
      logger.debug(
        sessionContext,
        `Incremented activeRequests for session ${sessionId}. Count: ${session.activeRequests}`,
      );

      try {
        const mockReq = {
          headers,
          method: "POST",
          url: this.options.mcpHttpEndpointPath,
        } as import("http").IncomingMessage;
        const mockRes = new HonoStreamResponse() as unknown as ServerResponse;

        await transport.handleRequest(mockReq, mockRes, body);

        const responseHeaders = convertNodeHeadersToWebHeaders(
          mockRes.getHeaders(),
        );
        const webStream = Readable.toWeb(
          mockRes as unknown as HonoStreamResponse,
        ) as ReadableStream<Uint8Array>;

        return {
          type: "stream",
          headers: responseHeaders,
          statusCode: mockRes.statusCode as HttpStatusCode,
          stream: webStream,
          sessionId: transport.sessionId,
        };
      } catch (error) {
        throw ErrorHandler.handleError(error, {
          operation: sessionContext.operation,
          context: sessionContext,
          rethrow: true,
        });
      } finally {
        session.activeRequests -= 1;
        session.lastAccessedAt = new Date();
        logger.debug(
          sessionContext,
          `Decremented activeRequests for session ${sessionId}. Count: ${session.activeRequests}`,
        );
      }
    }

    if (isInitializeRequest(body)) {
      return this.initializeAndHandle(headers, body, context);
    }

    throw new McpError(
      JsonRpcErrorCode.InvalidRequest,
      "A session ID or an initialize request is required for stateful mode.",
      context,
    );
  }

  /**
   * Handles a request to explicitly delete a session.
   */
  async handleDeleteRequest(
    sessionId: string,
    context: RequestContext,
  ): Promise<TransportResponse> {
    const sessionContext = {
      ...context,
      sessionId,
      operation: "StatefulTransportManager.handleDeleteRequest",
    };
    logger.info(sessionContext, `Attempting to delete session: ${sessionId}`);

    if (!this.transports.has(sessionId)) {
      logger.warning(
        sessionContext,
        `Attempted to delete non-existent session: ${sessionId}`,
      );
      throw new McpError(
        JsonRpcErrorCode.NotFound,
        "Session not found or expired.",
        sessionContext,
      );
    }

    await this.closeSession(sessionId, sessionContext);

    return {
      type: "buffered",
      headers: new Headers({ "Content-Type": "application/json" }),
      statusCode: 200 as HttpStatusCode,
      body: { status: "session_closed", sessionId },
    };
  }

  /**
   * Retrieves information about a specific session.
   */
  getSession(sessionId: string): TransportSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Gracefully shuts down the manager, closing all active sessions.
   */
  async shutdown(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "StatefulTransportManager.shutdown",
    });
    logger.info(context, "Shutting down stateful transport manager...");
    clearInterval(this.garbageCollector);
    logger.debug(context, "Garbage collector stopped.");

    const sessionIds = Array.from(this.transports.keys());
    if (sessionIds.length > 0) {
      logger.info(context, `Closing ${sessionIds.length} active sessions.`);
      const closePromises = sessionIds.map((sessionId) =>
        this.closeSession(sessionId, context),
      );
      await Promise.all(closePromises);
    }

    this.transports.clear();
    this.sessions.clear();
    this.servers.clear();
    logger.info(context, "All active sessions closed and manager shut down.");
  }

  /**
   * Closes a single session and releases its associated resources.
   */
  private async closeSession(
    sessionId: string,
    context: RequestContext,
  ): Promise<void> {
    const sessionContext = {
      ...context,
      sessionId,
      operation: "StatefulTransportManager.closeSession",
    };
    logger.debug(sessionContext, `Closing session: ${sessionId}`);

    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    if (session.state === SessionState.CLOSING) {
      logger.debug(sessionContext, `Session is already in CLOSING state.`);
      return;
    }

    session.state = SessionState.CLOSING;
    logger.debug(sessionContext, `Marking session ${sessionId} as CLOSING.`);

    const transport = this.transports.get(sessionId);
    const server = this.servers.get(sessionId);

    await ErrorHandler.tryCatch(
      async () => {
        if (transport) await transport.close();
        if (server) await server.close();
      },
      { operation: "closeSession.cleanup", context: sessionContext },
    );

    this.transports.delete(sessionId);
    this.servers.delete(sessionId);
    this.sessions.delete(sessionId);

    logger.info(
      sessionContext,
      `MCP Session closed and resources released: ${sessionId}`,
    );
  }

  /**
   * Periodically runs to find and clean up stale, inactive sessions.
   */
  private async cleanupStaleSessions(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "StatefulTransportManager.cleanupStaleSessions",
    });
    logger.debug(context, "Running stale session cleanup...");

    const now = Date.now();
    const STALE_TIMEOUT_MS = this.options.staleSessionTimeoutMs;
    const staleSessionIds: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt.getTime() > STALE_TIMEOUT_MS) {
        if (session.activeRequests > 0) {
          logger.info(
            { ...context, sessionId },
            `Session ${sessionId} is stale but has ${session.activeRequests} active requests. Skipping cleanup.`,
          );
          continue;
        }
        staleSessionIds.push(sessionId);
      }
    }

    if (staleSessionIds.length > 0) {
      logger.info(
        context,
        `Found ${staleSessionIds.length} stale sessions. Closing concurrently.`,
      );
      const closePromises = staleSessionIds.map((sessionId) =>
        this.closeSession(sessionId, context).catch((err) => {
          logger.error(
            { error: err, ...context, sessionId },
            `Error during concurrent stale session cleanup for ${sessionId}`,
          );
        }),
      );
      await Promise.all(closePromises);
      logger.info(
        context,
        `Stale session cleanup complete. Closed ${staleSessionIds.length} sessions.`,
      );
    } else {
      logger.debug(context, "No stale sessions found.");
    }
  }
}
</file>

<file path="core/statelessTransportManager.ts">
/**
 * @fileoverview Implements a stateless transport manager for the MCP SDK.
 *
 * This manager handles single, ephemeral MCP operations. For each incoming request,
 * it dynamically creates a temporary McpServer and transport instance, processes the
 * request, and then immediately schedules the resources for cleanup. This approach
 * is ideal for simple, one-off tool calls that do not require persistent session state.
 *
 * The key challenge addressed here is bridging the Node.js-centric MCP SDK with
 * modern, Web Standards-based frameworks like Hono. This is achieved by deferring
 * resource cleanup until the response stream has been fully consumed by the web
 * framework, preventing premature closure and truncated responses.
 *
 * @module src/mcp-server/transports/core/statelessTransportManager
 */

import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "@/utils/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { ServerResponse } from "http";
import { Readable } from "stream";
import { BaseTransportManager } from "./baseTransportManager.js";
import { convertNodeHeadersToWebHeaders } from "./headerUtils.js";
import { HonoStreamResponse } from "./honoNodeBridge.js";
import { McpTransportRequest } from "./transportRequest.js";
import { HttpStatusCode, TransportResponse } from "./transportTypes.js";

/**
 * Manages ephemeral, single-request MCP operations.
 */
export class StatelessTransportManager extends BaseTransportManager {
  /**
   * Handles a single, stateless MCP request.
   *
   * This method orchestrates the creation of temporary server and transport instances,
   * handles the request, and ensures resources are cleaned up only after the
   * response stream is closed.
   *
   * @param headers - The incoming request headers.
   * @param body - The parsed body of the request.
   * @param context - The request context for logging and tracing.
   * @returns A promise resolving to a streaming TransportResponse.
   */
  async handleRequest({
    headers,
    body,
    context,
  }: McpTransportRequest): Promise<TransportResponse> {
    const opContext = {
      ...context,
      operation: "StatelessTransportManager.handleRequest",
    };
    logger.debug(
      opContext,
      "Creating ephemeral server instance for stateless request.",
    );

    let server: McpServer | undefined;
    let transport: StreamableHTTPServerTransport | undefined;

    try {
      // 1. Create ephemeral instances for this request.
      server = await this.createServerInstanceFn();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        onsessioninitialized: undefined,
      });

      await server.connect(transport);
      logger.debug(opContext, "Ephemeral server connected to transport.");

      // 2. Set up the Node.js-to-Web stream bridge.
      const mockReq = {
        headers,
        method: "POST",
      } as import("http").IncomingMessage;
      const mockResBridge = new HonoStreamResponse();

      // 3. Defer cleanup until the stream is fully processed.
      // This is the critical fix to prevent premature resource release.
      this.setupDeferredCleanup(mockResBridge, server, transport, opContext);

      // 4. Process the request using the MCP transport.
      const mockRes = mockResBridge as unknown as ServerResponse;
      await transport.handleRequest(mockReq, mockRes, body);

      logger.info(opContext, "Stateless request handled successfully.");

      // 5. Convert headers and create the final streaming response.
      const responseHeaders = convertNodeHeadersToWebHeaders(
        mockRes.getHeaders(),
      );
      const webStream = Readable.toWeb(
        mockResBridge,
      ) as ReadableStream<Uint8Array>;

      return {
        type: "stream",
        headers: responseHeaders,
        statusCode: mockRes.statusCode as HttpStatusCode,
        stream: webStream,
      };
    } catch (error) {
      // If an error occurs before the stream is returned, we must clean up immediately.
      if (server || transport) {
        this.cleanup(server, transport, opContext);
      }
      throw ErrorHandler.handleError(error, {
        operation: "StatelessTransportManager.handleRequest",
        context: opContext,
        rethrow: true,
      });
    }
  }

  /**
   * Attaches listeners to the response stream to trigger resource cleanup
   * only after the stream has been fully consumed or has errored.
   *
   * @param stream - The response stream bridge.
   * @param server - The ephemeral McpServer instance.
   * @param transport - The ephemeral transport instance.
   * @param context - The request context for logging.
   */
  private setupDeferredCleanup(
    stream: HonoStreamResponse,
    server: McpServer,
    transport: StreamableHTTPServerTransport,
    context: RequestContext,
  ): void {
    let cleanedUp = false;
    const cleanupFn = (error?: Error) => {
      if (cleanedUp) return;
      cleanedUp = true;

      if (error) {
        logger.warning(
          {
            ...context,
            error,
          },
          "Stream ended with an error, proceeding to cleanup.",
        );
      }
      // Cleanup is fire-and-forget.
      this.cleanup(server, transport, context);
    };

    // 'close' is the most reliable event, firing on both normal completion and abrupt termination.
    stream.on("close", () => cleanupFn());
    stream.on("error", (err) => cleanupFn(err));
  }

  /**
   * Performs the actual cleanup of ephemeral resources.
   * This method is designed to be "fire-and-forget".
   */
  private cleanup(
    server: McpServer | undefined,
    transport: StreamableHTTPServerTransport | undefined,
    context: RequestContext,
  ): void {
    const opContext = {
      ...context,
      operation: "StatelessTransportManager.cleanup",
    };
    logger.debug(opContext, "Scheduling cleanup for ephemeral resources.");

    Promise.all([transport?.close(), server?.close()])
      .then(() => {
        logger.debug(opContext, "Ephemeral resources cleaned up successfully.");
      })
      .catch((cleanupError) => {
        logger.warning(
          {
            ...opContext,
            error: cleanupError as Error,
          },
          "Error during stateless resource cleanup.",
        );
      });
  }

  /**
   * Shuts down the manager. For the stateless manager, this is a no-op
   * as there are no persistent resources to manage.
   */
  async shutdown(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: "StatelessTransportManager.shutdown",
    });
    logger.info(
      context,
      "Stateless transport manager shutdown - no persistent resources to clean up.",
    );
    return Promise.resolve();
  }
}
</file>

<file path="core/transportRequest.ts">
// src/mcp-server/transports/core/transportRequest.ts
import type { IncomingHttpHeaders } from "http";
import type { RequestContext } from "../../../utils/index.js";

export interface McpTransportRequest {
  headers: IncomingHttpHeaders;
  body: unknown;
  context: RequestContext;
  sessionId?: string;
}
</file>

<file path="core/transportTypes.ts">
/**
 * @fileoverview Defines the core types and interfaces for the transport layer abstraction.
 * This module establishes the data contracts and abstract interfaces that decouple
 * the MCP server's core logic from specific transport implementations like HTTP or stdio.
 * @module src/mcp-server/transports/core/transportTypes
 */

import { RequestContext } from "../../../utils/index.js";
import { McpTransportRequest } from "./transportRequest.js";

/**
 * Defines the set of valid HTTP status codes that the transport layer can return.
 * This ensures type safety and consistency in response handling.
 */
export type HttpStatusCode =
  | 200 // OK
  | 201 // Created
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 409 // Conflict
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 502 // Bad Gateway
  | 503; // Service Unavailable

/**
 * A base interface for all transport responses, containing common properties.
 */
interface BaseTransportResponse {
  sessionId?: string;
  headers: Headers;
  statusCode: HttpStatusCode;
}

/**
 * Represents a transport response where the entire body is buffered in memory.
 * Suitable for small, non-streamed responses.
 */
export interface BufferedTransportResponse extends BaseTransportResponse {
  type: "buffered";
  body: unknown;
}

/**
 * Represents a transport response that streams its body.
 * Essential for handling large or chunked responses efficiently without high memory usage.
 */
export interface StreamingTransportResponse extends BaseTransportResponse {
  type: "stream";
  stream: ReadableStream<Uint8Array>;
}

/**
 * A discriminated union representing the possible types of a transport response.
 * Using a discriminated union on the `type` property allows for type-safe handling
 * of different response formats (buffered vs. streamed).
 */
export type TransportResponse =
  | BufferedTransportResponse
  | StreamingTransportResponse;

/**
 * Defines the lifecycle states of a transport session.
 */
export enum SessionState {
  ACTIVE = "ACTIVE",
  CLOSING = "CLOSING",
}

/**
 * Represents the state of an active, persistent transport session.
 */
export interface TransportSession {
  id: string;
  state: SessionState; // Add state property
  createdAt: Date;
  lastAccessedAt: Date;
  /**
   * A counter for requests currently being processed for this session.
   * This is a critical mechanism to prevent race conditions where a session
   * might be garbage-collected while a long-running request is still in flight.
   * It is incremented when a request begins and decremented when it finishes.
   */
  activeRequests: number;
}

/**
 * Defines the abstract interface for a transport manager.
 * This contract ensures that any transport manager, regardless of its statefulness,
 * provides a consistent way to handle requests and manage its lifecycle.
 */
export interface TransportManager {
  /**
   * Handles an incoming request.
   * @param request The standardized transport request object.
   * @returns A promise that resolves to a TransportResponse object.
   */
  handleRequest(request: McpTransportRequest): Promise<TransportResponse>;

  /**
   * Gracefully shuts down the transport manager, cleaning up any resources.
   */
  shutdown(): Promise<void>;

  /**
   * Handles a request to explicitly delete a session.
   * This is optional as it only applies to stateful managers.
   * @param sessionId The ID of the session to delete.
   * @param context The request context.
   * @returns A promise resolving to a TransportResponse confirming closure.
   */
  handleDeleteRequest?(
    sessionId: string,
    context: RequestContext,
  ): Promise<TransportResponse>;
}

/**
 * Extends the base TransportManager with operations specific to stateful sessions.
 */
export interface StatefulTransportManager extends TransportManager {
  /**
   * Handles a request to explicitly delete a session.
   * This is a required implementation for stateful managers.
   * @param sessionId The ID of the session to delete.
   * @param context The request context.
   * @returns A promise resolving to a TransportResponse confirming closure.
   */
  handleDeleteRequest(
    sessionId: string,
    context: RequestContext,
  ): Promise<TransportResponse>;

  /**
   * Retrieves information about a specific session.
   * @param sessionId The ID of the session to retrieve.
   * @returns A TransportSession object if the session exists, otherwise undefined.
   */
  getSession(sessionId: string): TransportSession | undefined;
}
</file>

<file path="http/httpErrorHandler.ts">
/**
 * @fileoverview Centralized error handler for the Hono HTTP transport.
 * This middleware intercepts errors that occur during request processing,
 * standardizes them using the application's ErrorHandler utility, and
 * formats them into a consistent JSON-RPC error response.
 * @module src/mcp-server/transports/httpErrorHandler
 */

import { Context } from "hono";
import { StatusCode } from "hono/utils/http-status";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import { ErrorHandler, requestContextService } from "../../../utils/index.js";
import { logOperationStart } from "../../../utils/internal/logging-helpers.js";
import { HonoNodeBindings } from "./httpTypes.js";

function toHttpCode(errorCode: JsonRpcErrorCode): StatusCode {
  switch (errorCode) {
    case JsonRpcErrorCode.ParseError:
    case JsonRpcErrorCode.InvalidRequest:
    case JsonRpcErrorCode.InvalidParams:
    case JsonRpcErrorCode.ValidationError:
      return 400;
    case JsonRpcErrorCode.MethodNotFound:
    case JsonRpcErrorCode.NotFound:
      return 404;
    case JsonRpcErrorCode.Unauthorized:
      return 401;
    case JsonRpcErrorCode.Forbidden:
      return 403;
    case JsonRpcErrorCode.Conflict:
      return 409;
    case JsonRpcErrorCode.RateLimited:
      return 429;
    case JsonRpcErrorCode.Timeout:
      return 504;
    case JsonRpcErrorCode.ServiceUnavailable:
      return 503;
    default:
      return 500;
  }
}

/**
 * A centralized error handling middleware for Hono.
 * This function is registered with `app.onError()` and will catch any errors
 * thrown from preceding middleware or route handlers.
 *
 * @param err - The error that was thrown.
 * @param c - The Hono context object for the request.
 * @returns A Response object containing the formatted JSON-RPC error.
 */
export const httpErrorHandler = async (
  err: Error,
  c: Context<{
    Bindings: HonoNodeBindings;
    Variables: { requestId?: string | number | null };
  }>,
): Promise<Response> => {
  const context = requestContextService.createRequestContext({
    operation: "httpErrorHandler",
    path: c.req.path,
    method: c.req.method,
  });
  logOperationStart(context, "HTTP error handler invoked.");

  const handledError = ErrorHandler.handleError(err, {
    operation: "httpTransport",
    context,
  });

  const errorCode =
    handledError instanceof McpError
      ? handledError.code
      : JsonRpcErrorCode.InternalError;
  const status = toHttpCode(errorCode);

  logOperationStart(context, `Mapping error to HTTP status ${status}.`, {
    status,
    errorCode,
  });

  // Retrieve the request ID from the Hono context
  let requestId: string | number | null = null;
  try {
    // Use c.get() which handles the retrieval safely
    requestId = c.get("requestId") ?? null;
  } catch (_e) {
    // Log if retrieval fails, though unlikely
    logOperationStart(
      context,
      "Could not retrieve requestId from Hono context in error handler.",
    );
  }

  c.status(status);
  const errorResponse = {
    jsonrpc: "2.0",
    error: {
      code: errorCode,
      message: handledError.message,
    },
    id: requestId,
  };
  return c.json(errorResponse);
};
</file>

<file path="http/httpTransport.ts">
/**
 * @fileoverview Configures and starts the HTTP MCP transport using Hono.
 * This file has been refactored to correctly integrate Hono's streaming
 * capabilities with the Model Context Protocol SDK's transport layer.
 * @module src/mcp-server/transports/http/httpTransport
 */

import { serve, ServerType } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Context, Hono, Next } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { stream } from "hono/streaming";
import http from "http";
import { config } from "@/config/index.js";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import {
  logger,
  rateLimiter,
  RequestContext,
  requestContextService,
} from "@/utils/index.js";
import {
  authContext,
  createAuthMiddleware,
  createAuthStrategy,
} from "../auth/index.js";
import { AutoTransportManager } from "../core/autoTransportManager.js";
import { StatelessTransportManager } from "../core/statelessTransportManager.js";
import {
  TransportManager,
  TransportResponse,
} from "../core/transportTypes.js";
import { StatefulTransportManager } from "./../core/statefulTransportManager.js";
import { httpErrorHandler } from "./httpErrorHandler.js";
import { HonoNodeBindings } from "./httpTypes.js";
import { mcpTransportMiddleware } from "./mcpTransportMiddleware.js";

const HTTP_PORT = config.mcpHttpPort;
const HTTP_HOST = config.mcpHttpHost;
const MCP_ENDPOINT_PATH = config.mcpHttpEndpointPath;

/**
 * Extracts the client IP address from the request, prioritizing common proxy headers.
 * @param c - The Hono context object.
 * @returns The client's IP address or a default string if not found.
 */
function getClientIp(c: Context<{ Bindings: HonoNodeBindings }>): string {
  const forwardedFor = c.req.header("x-forwarded-for");
  return (
    (forwardedFor?.split(",")[0] ?? "").trim() ||
    c.req.header("x-real-ip") ||
    "unknown_ip"
  );
}

/**
 * Converts a Fetch API Headers object to Node.js IncomingHttpHeaders.
 * Hono uses Fetch API Headers, but the underlying transport managers expect
 * Node's native IncomingHttpHeaders.
 * @param headers - The Headers object to convert.
 * @returns An object compatible with IncomingHttpHeaders.
 */

async function isPortInUse(
  port: number,
  host: string,
  parentContext: RequestContext,
): Promise<boolean> {
  const context = { ...parentContext, operation: "isPortInUse", port, host };
  logger.debug(context, `Checking if port ${port} is in use...`);
  return new Promise((resolve) => {
    const tempServer = http.createServer();
    tempServer
      .once("error", (err: NodeJS.ErrnoException) => {
        const inUse = err.code === "EADDRINUSE";
        logger.debug(
          context,
          `Port check resulted in error: ${err.code}. Port in use: ${inUse}`,
        );
        resolve(inUse);
      })
      .once("listening", () => {
        logger.debug(
          context,
          `Successfully bound to port ${port} temporarily. Port is not in use.`,
        );
        tempServer.close(() => resolve(false));
      })
      .listen(port, host);
  });
}

function startHttpServerWithRetry(
  app: Hono<HonoAppEnv>,
  initialPort: number,
  host: string,
  maxRetries: number,
  parentContext: RequestContext,
): Promise<ServerType> {
  const startContext = {
    ...parentContext,
    operation: "startHttpServerWithRetry",
  };
  logger.info(
    startContext,
    `Attempting to start HTTP server on port ${initialPort} with ${maxRetries} retries.`,
  );

  return new Promise((resolve, reject) => {
    const tryBind = (port: number, attempt: number) => {
      const attemptContext = { ...startContext, port, attempt };
      if (attempt > maxRetries + 1) {
        const error = new Error(
          `Failed to bind to any port after ${maxRetries} retries.`,
        );
        logger.fatal(attemptContext, error.message);
        return reject(error);
      }

      isPortInUse(port, host, attemptContext)
        .then((inUse) => {
          if (inUse) {
            logger.warning(
              attemptContext,
              `Port ${port} is in use, retrying on port ${port + 1}...`,
            );
            setTimeout(
              () => tryBind(port + 1, attempt + 1),
              config.mcpHttpPortRetryDelayMs,
            );
            return;
          }

          try {
            const serverInstance = serve(
              { fetch: app.fetch, port, hostname: host },
              (info: { address: string; port: number }) => {
                const serverAddress = `http://${info.address}:${info.port}${MCP_ENDPOINT_PATH}`;
                logger.info(
                  {
                    ...attemptContext,
                    address: serverAddress,
                    sessionMode: config.mcpSessionMode,
                  },
                  `HTTP transport listening at ${serverAddress}`,
                );
                if (process.stdout.isTTY) {
                  console.log(`\n🚀 MCP Server running at: ${serverAddress}`);
                  console.log(`   Session Mode: ${config.mcpSessionMode}\n`);
                }
              },
            );
            resolve(serverInstance);
          } catch (err: unknown) {
            if (
              err &&
              typeof err === "object" &&
              "code" in err &&
              (err as { code: string }).code !== "EADDRINUSE"
            ) {
              const errorToLog =
                err instanceof Error ? err : new Error(String(err));
              logger.error(
                { error: errorToLog, ...attemptContext },
                "An unexpected error occurred while starting the server.",
              );
              return reject(err);
            }
            logger.warning(
              attemptContext,
              `Encountered EADDRINUSE race condition on port ${port}, retrying...`,
            );
            setTimeout(
              () => tryBind(port + 1, attempt + 1),
              config.mcpHttpPortRetryDelayMs,
            );
          }
        })
        .catch((err) => {
          const error = err instanceof Error ? err : new Error(String(err));
          logger.fatal(
            {
              error,
              ...attemptContext,
            },
            "Failed to check if port is in use.",
          );
          reject(err);
        });
    };

    tryBind(initialPort, 1);
  });
}

function createTransportManager(
  createServerInstanceFn: () => Promise<McpServer>,
  sessionMode: string,
  context: RequestContext,
): TransportManager {
  const opContext = {
    ...context,
    operation: "createTransportManager",
    sessionMode,
  };
  logger.info(
    opContext,
    `Creating transport manager for session mode: ${sessionMode}`,
  );

  const statefulOptions = {
    staleSessionTimeoutMs: config.mcpStatefulSessionStaleTimeoutMs,
    mcpHttpEndpointPath: config.mcpHttpEndpointPath,
  };

  switch (sessionMode) {
    case "stateless":
      return new StatelessTransportManager(createServerInstanceFn);
    case "stateful":
      return new StatefulTransportManager(
        createServerInstanceFn,
        statefulOptions,
      );
    case "auto":
    default:
      logger.info(opContext, "Using 'auto' mode manager.");
      return new AutoTransportManager(createServerInstanceFn, statefulOptions);
  }
}

/**
 * Middleware to enforce 'application/json' content type for POST requests.
 */
const enforceJsonContentType = async (c: Context, next: Next) => {
  if (c.req.method === "POST") {
    const contentType = c.req.header("content-type");
    if (!contentType || !contentType.startsWith("application/json")) {
      // Use the request context if available
      const context = requestContextService.createRequestContext({
        operation: "enforceJsonContentType",
      });
      throw new McpError(
        JsonRpcErrorCode.InvalidRequest,
        "Unsupported Media Type: Content-Type must be 'application/json'.",
        context,
      );
    }
  }
  await next();
};

// Define the Hono app's environment to include custom variables
type HonoAppEnv = {
  Bindings: HonoNodeBindings;
  Variables: {
    mcpResponse?: TransportResponse;
    requestId?: string | number | null;
  };
};

export function createHttpApp(
  transportManager: TransportManager,
  createServerInstanceFn: () => Promise<McpServer>,
  parentContext: RequestContext,
): Hono<HonoAppEnv> {
  const app = new Hono<HonoAppEnv>();
  const transportContext = {
    ...parentContext,
    component: "HttpTransportSetup",
  };
  logger.info(transportContext, "Creating Hono HTTP application.");

  // 1. HTTP Access Logging
  app.use(honoLogger());

  // 2. Security Headers
  app.use(secureHeaders());

  // 3. CORS
  app.use(
    "*",
    cors({
      origin:
        config.mcpAllowedOrigins && config.mcpAllowedOrigins.length > 0
          ? config.mcpAllowedOrigins
          : config.environment === "production"
            ? []
            : "*",
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: [
        "Content-Type",
        "Mcp-Session-Id",
        "Last-Event-ID",
        "Authorization",
      ],
      credentials: true,
    }),
  );

  // 4. Content Type Enforcement (Specific to MCP endpoint)
  app.use(MCP_ENDPOINT_PATH, enforceJsonContentType);

  // 5. Authentication and Advanced Rate Limiting (Order Matters)

  const authStrategy = createAuthStrategy();

  // Define the rate limiting logic as a reusable middleware
  const rateLimitHandler = async (
    c: Context<{ Bindings: HonoNodeBindings }>,
    next: Next,
  ) => {
    const clientIp = getClientIp(c);
    let key: string;
    let clientId: string | undefined;

    if (authStrategy) {
      // If auth is enabled, authContext should be populated by the preceding authMiddleware.
      const store = authContext.getStore();
      clientId = store?.authInfo.clientId;
      // Key should be clientId if authenticated, otherwise fallback to IP.
      key = clientId || clientIp;
    } else {
      // If auth is disabled, key is always IP.
      key = clientIp;
    }

    const context = requestContextService.createRequestContext({
      operation: "httpRateLimitCheck",
      rateLimitKey: key,
      ipAddress: clientIp,
      clientId: clientId,
    });

    try {
      rateLimiter.check(key, context);
      logger.debug(context, "Rate limit check passed.");
    } catch (error) {
      logger.warning(
        { ...context, error: error as Error },
        "Rate limit check failed.",
      );
      throw error;
    }
    await next();
  };

  if (authStrategy) {
    logger.info(
      transportContext,
      "Authentication strategy found, enabling auth middleware.",
    );
    // Auth Middleware first
    app.use(MCP_ENDPOINT_PATH, createAuthMiddleware(authStrategy));
  } else {
    logger.info(
      transportContext,
      "No authentication strategy found, auth middleware disabled.",
    );
  }

  // Rate Limiting second (can now leverage auth context if available)
  app.use(MCP_ENDPOINT_PATH, rateLimitHandler);

  app.onError(httpErrorHandler);

  app.get("/healthz", (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.get(
    MCP_ENDPOINT_PATH,
    async (c: Context<{ Bindings: HonoNodeBindings }>) => {
      const sessionId = c.req.header("mcp-session-id");
      if (sessionId) {
        return c.text(
          "GET requests to existing sessions are not supported.",
          405,
        );
      }

      // Since this is a stateless endpoint, we create a temporary instance
      // to report on the server's configuration.
      const serverInstance = await createServerInstanceFn();
      await serverInstance.close(); // ensure cleanup
      return c.json({
        status: "ok",
        server: {
          name: config.mcpServerName,
          version: config.mcpServerVersion,
          description:
            (config.pkg as { description?: string })?.description ||
            "No description provided.",
          nodeVersion: process.version,
          environment: config.environment,
        },
        sessionMode: config.mcpSessionMode,
        message:
          "Server is running. POST to this endpoint to execute a tool call.",
      });
    },
  );

  app.post(
    MCP_ENDPOINT_PATH,
    mcpTransportMiddleware(transportManager),
    (c) => {
      const response = c.get("mcpResponse");

      if (!response) {
        // This case should ideally not be reached if middleware runs correctly
        return c.json(
          {
            jsonrpc: "2.0",
            error: {
              code: JsonRpcErrorCode.InternalError,
              message: "Middleware failed to produce a response.",
            },
            id: c.get("requestId") ?? null,
          },
          500,
        );
      }

      if (response.sessionId) {
        c.header("Mcp-Session-Id", response.sessionId);
      }
      response.headers.forEach((value: string, key: string) => {
        c.header(key, value);
      });

      c.status(response.statusCode);

      if (response.type === "stream") {
        return stream(c, async (s) => {
          await s.pipe(response.stream);
        });
      } else {
        const body =
          typeof response.body === "object" && response.body !== null
            ? response.body
            : { body: response.body };
        return c.json(body);
      }
    },
  );

  app.delete(
    MCP_ENDPOINT_PATH,
    async (c: Context<{ Bindings: HonoNodeBindings }>) => {
      const sessionId = c.req.header("mcp-session-id");
      const context = requestContextService.createRequestContext({
        ...transportContext,
        operation: "handleDeleteRequest",
        sessionId,
      });

      if (sessionId) {
        // Type-safe check for the optional method
        if (transportManager.handleDeleteRequest) {
          const response = await transportManager.handleDeleteRequest(
            sessionId,
            context,
          );
          if (response.type === "buffered") {
            const body =
              typeof response.body === "object" && response.body !== null
                ? response.body
                : { body: response.body };
            return c.json(body, response.statusCode);
          }
          // Fallback for unexpected stream response on DELETE
          return c.body(null, response.statusCode);
        } else {
          return c.json(
            {
              error: "Method Not Allowed",
              message: "DELETE operations are not supported in this mode.",
            },
            405,
          );
        }
      } else {
        return c.json({
          status: "stateless_mode",
          message: "No sessions to delete in stateless mode",
        });
      }
    },
  );

  logger.info(transportContext, "Hono application setup complete.");
  return app;
}

export async function startHttpTransport(
  createServerInstanceFn: () => Promise<McpServer>,
  parentContext: RequestContext,
): Promise<{
  app: Hono<HonoAppEnv>;
  server: ServerType;
  transportManager: TransportManager;
}> {
  const transportContext = {
    ...parentContext,
    component: "HttpTransportStart",
  };
  logger.info(transportContext, "Starting HTTP transport.");

  const transportManager = createTransportManager(
    createServerInstanceFn,
    config.mcpSessionMode,
    transportContext,
  );
  const app = createHttpApp(
    transportManager,
    createServerInstanceFn,
    transportContext,
  );

  const server = await startHttpServerWithRetry(
    app,
    HTTP_PORT,
    HTTP_HOST,
    config.mcpHttpMaxPortRetries,
    transportContext,
  );

  logger.info(transportContext, "HTTP transport started successfully.");
  return { app, server, transportManager };
}
</file>

<file path="http/httpTypes.ts">
/**
 * @fileoverview Defines custom types for the Hono HTTP transport layer.
 * @module src/mcp-server/transports/http/httpTypes
 */

import type { IncomingMessage, ServerResponse } from "http";

/**
 * Extends Hono's Bindings to include the raw Node.js request and response objects.
 * This is necessary for integrating with libraries like the MCP SDK that
 * need to write directly to the response stream.
 *
 * As per `@hono/node-server`, the response object is available on `c.env.outgoing`.
 */
export type HonoNodeBindings = {
  incoming: IncomingMessage;
  outgoing: ServerResponse;
};
</file>

<file path="http/index.ts">
/**
 * @fileoverview Barrel file for the HTTP transport module.
 * @module src/mcp-server/transports/http/index
 */

export { createHttpApp, startHttpTransport } from "./httpTransport.js";
export { httpErrorHandler } from "./httpErrorHandler.js";
export type { HonoNodeBindings } from "./httpTypes.js";
</file>

<file path="http/mcpTransportMiddleware.ts">
/**
 * @fileoverview Hono middleware for handling MCP transport logic.
 * This middleware is responsible for adapting an incoming Hono request into a
 * standardized McpTransportRequest object and delegating all further processing
 * to the provided TransportManager. It no longer contains any session logic itself.
 * @module src/mcp-server/transports/http/mcpTransportMiddleware
 */

import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";
import {
  requestContextService,
  withRequestContext,
} from "../../../utils/index.js";
import { convertWebHeadersToNodeHeaders } from "../core/headerUtils.js"; // Import the utility
import { McpTransportRequest } from "../core/transportRequest.js";
import { TransportManager, TransportResponse } from "../core/transportTypes.js";
import { HonoNodeBindings } from "./httpTypes.js";

type McpMiddlewareEnv = {
  Variables: {
    mcpResponse: TransportResponse;
    // Add requestId for use in the error handler
    requestId: string | number | null;
  };
};

export const mcpTransportMiddleware = (
  transportManager: TransportManager,
): MiddlewareHandler<McpMiddlewareEnv & { Bindings: HonoNodeBindings }> => {
  return createMiddleware<McpMiddlewareEnv & { Bindings: HonoNodeBindings }>(
    async (c, next) => {
      const sessionId = c.req.header("mcp-session-id");
      const context = requestContextService.createRequestContext({
        operation: "mcpTransportMiddleware",
        sessionId,
        transport: "http",
      });

      await withRequestContext(context, async () => {
        let body: unknown;
        let requestId: string | number | null = null;

        try {
          body = await c.req.json();

          // Safely extract ID
          if (body && typeof body === "object" && "id" in body) {
            const id = (body as { id: unknown }).id;
            if (
              typeof id === "string" ||
              typeof id === "number" ||
              id === null
            ) {
              requestId = id;
            }
          }
        } catch (_error) {
          // Ensure requestId is set even if parsing fails
          c.set("requestId", null);
          throw new McpError(
            ErrorCode.ParseError,
            "Failed to parse request body as JSON.",
          );
        }

        c.set("requestId", requestId); // Store in context

        const transportRequest: McpTransportRequest = {
          // Use the centralized utility
          headers: convertWebHeadersToNodeHeaders(c.req.raw.headers),
          body,
          context,
          sessionId: sessionId || undefined,
        };

        const response = await transportManager.handleRequest(transportRequest);

        c.set("mcpResponse", response);
        await next();
      });
    },
  );
};
</file>

<file path="stdio/index.ts">
/**
 * @fileoverview Barrel file for the Stdio transport module.
 * @module src/mcp-server/transports/stdio/index
 */

export { startStdioTransport } from "./stdioTransport.js";
</file>

<file path="stdio/stdioTransport.ts">
/**
 * @fileoverview Handles the setup and connection for the Stdio MCP transport.
 * Implements the MCP Specification 2025-03-26 for stdio transport.
 * This transport communicates directly over standard input (stdin) and
 * standard output (stdout), typically used when the MCP server is launched
 * as a child process by a host application.
 *
 * Specification Reference:
 * https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/transports.mdx#stdio
 *
 * --- Authentication Note ---
 * As per the MCP Authorization Specification (2025-03-26, Section 1.2),
 * STDIO transports SHOULD NOT implement HTTP-based authentication flows.
 * Authorization is typically handled implicitly by the host application
 * controlling the server process. This implementation follows that guideline.
 *
 * @see {@link https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/authorization.mdx | MCP Authorization Specification}
 * @module src/mcp-server/transports/stdioTransport
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ErrorHandler, RequestContext } from "../../../utils/index.js";
import {
  logOperationStart,
  logOperationSuccess,
} from "../../../utils/internal/logging-helpers.js";

/**
 * Connects a given `McpServer` instance to the Stdio transport.
 * This function initializes the SDK's `StdioServerTransport`, which manages
 * communication over `process.stdin` and `process.stdout` according to the
 * MCP stdio transport specification.
 *
 * MCP Spec Points Covered by SDK's `StdioServerTransport`:
 * - Reads JSON-RPC messages (requests, notifications, responses, batches) from stdin.
 * - Writes JSON-RPC messages to stdout.
 * - Handles newline delimiters and ensures no embedded newlines in output messages.
 * - Ensures only valid MCP messages are written to stdout.
 *
 * Logging via the `logger` utility MAY result in output to stderr, which is
 * permitted by the spec for logging purposes.
 *
 * @param server - The `McpServer` instance.
 * @param parentContext - The logging and tracing context from the calling function.
 * @returns A promise that resolves when the Stdio transport is successfully connected.
 * @throws {Error} If the connection fails during setup.
 */
export async function startStdioTransport(
  server: McpServer,
  parentContext: RequestContext,
): Promise<void> {
  const operationContext = {
    ...parentContext,
    operation: "connectStdioTransport",
    transportType: "Stdio",
  };
  logOperationStart(
    operationContext,
    "Attempting to connect stdio transport...",
  );

  try {
    logOperationStart(
      operationContext,
      "Creating StdioServerTransport instance...",
    );
    const transport = new StdioServerTransport();

    logOperationStart(
      operationContext,
      "Connecting McpServer instance to StdioServerTransport...",
    );
    await server.connect(transport);

    logOperationSuccess(
      operationContext,
      "MCP Server connected and listening via stdio transport.",
    );
    if (process.stdout.isTTY) {
      console.log(
        `\n🚀 MCP Server running in STDIO mode.\n   (MCP Spec: 2025-03-26 Stdio Transport)\n`,
      );
    }
  } catch (err) {
    // Let the ErrorHandler log the error with all context, then rethrow.
    throw ErrorHandler.handleError(err, {
      operation: "connectStdioTransport",
      context: operationContext,
      critical: true,
      rethrow: true,
    });
  }
}
</file>

</repository_files>


---