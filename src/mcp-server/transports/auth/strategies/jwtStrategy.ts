/**
 * @fileoverview Implements the JWT authentication strategy.
 * This module provides a concrete implementation of the AuthStrategy for validating
 * JSON Web Tokens (JWTs). It encapsulates all logic related to JWT verification,
 * including secret key management and payload validation.
 * @module src/mcp-server/transports/auth/strategies/JwtStrategy
 */
import { jwtVerify } from 'jose';

import type { config as ConfigType } from '@/config/index.js';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';
import {
  buildAuthInfoFromClaims,
  handleJoseVerifyError,
} from '@/mcp-server/transports/auth/lib/claimParser.js';
import type { AuthStrategy } from '@/mcp-server/transports/auth/strategies/authStrategy.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type { logger as LoggerType } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

export class JwtStrategy implements AuthStrategy {
  private readonly secretKey: Uint8Array | null;
  private readonly devMcpClientId: string;
  private readonly devMcpScopes: string[];

  constructor(
    private config: typeof ConfigType,
    private logger: typeof LoggerType,
  ) {
    const context = requestContextService.createRequestContext({
      operation: 'JwtStrategy.constructor',
    });
    this.logger.debug('Initializing JwtStrategy...', context);
    this.devMcpClientId = this.config.devMcpClientId || 'dev-client-id';
    this.devMcpScopes = this.config.devMcpScopes || ['dev-scope'];
    const secretKey = this.config.mcpAuthSecretKey;

    if (!secretKey && !this.config.devMcpAuthBypass) {
      this.logger.fatal(
        'CRITICAL: MCP_AUTH_SECRET_KEY is not set for JWT auth. Set the key or enable DEV_MCP_AUTH_BYPASS=true for development.',
        context,
      );
      throw new McpError(
        JsonRpcErrorCode.ConfigurationError,
        'MCP_AUTH_SECRET_KEY must be set for JWT auth (or set DEV_MCP_AUTH_BYPASS=true).',
        context,
      );
    } else if (!secretKey) {
      // devMcpAuthBypass is explicitly true — opt-in dev bypass
      this.logger.warning(
        'MCP_AUTH_SECRET_KEY is not set. JWT auth bypassed via DEV_MCP_AUTH_BYPASS=true.',
        context,
      );
      this.secretKey = null;
    } else {
      this.logger.info('JWT secret key loaded successfully.', context);
      this.secretKey = new TextEncoder().encode(secretKey);
    }
  }

  async verify(token: string): Promise<AuthInfo> {
    const context = requestContextService.createRequestContext({
      operation: 'JwtStrategy.verify',
    });
    this.logger.debug('Attempting to verify JWT.', context);

    // Handle development mode bypass (constructor prevents null key in production)
    if (!this.secretKey) {
      this.logger.warning('Bypassing JWT verification: No secret key (DEV ONLY).', context);
      return {
        token: 'dev-mode-placeholder-token',
        clientId: this.devMcpClientId,
        scopes: this.devMcpScopes,
      };
    }

    try {
      const { payload: decoded } = await jwtVerify(token, this.secretKey);
      this.logger.debug('JWT signature verified successfully.', {
        ...context,
        claims: {
          iss: decoded.iss,
          aud: decoded.aud,
          exp: decoded.exp,
          iat: decoded.iat,
          jti: decoded.jti,
        },
      });

      const authInfo = buildAuthInfoFromClaims(token, decoded);

      this.logger.info('JWT verification successful.', {
        ...context,
        clientId: authInfo.clientId,
        scopes: authInfo.scopes,
        ...(authInfo.tenantId ? { tenantId: authInfo.tenantId } : {}),
      });
      return authInfo;
    } catch (error: unknown) {
      this.logger.warning('JWT verification failed.', {
        ...context,
        errorName: error instanceof Error ? error.name : 'Unknown',
      });
      handleJoseVerifyError(error, 'Token verification failed.');
    }
  }
}
