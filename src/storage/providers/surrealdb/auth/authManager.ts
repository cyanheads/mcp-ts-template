/**
 * @fileoverview Authentication manager for SurrealDB with DEFINE ACCESS support.
 * Manages JWT-based and record-based authentication strategies.
 * @module src/storage/providers/surrealdb/auth/authManager
 */

import type Surreal from 'surrealdb';
import { ErrorHandler, logger, type RequestContext } from '@/utils/index.js';

/**
 * Authentication strategy types for SurrealDB.
 */
export type AuthStrategy = 'jwt' | 'record' | 'none';

/**
 * JWT algorithm options supported by SurrealDB.
 */
export type JwtAlgorithm =
  | 'HS256'
  | 'HS384'
  | 'HS512'
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'PS256'
  | 'PS384'
  | 'PS512';

/**
 * Configuration for JWT-based authentication.
 */
export interface JwtAccessConfig {
  /** Name of the access method */
  name: string;
  /** JWT signing algorithm */
  algorithm: JwtAlgorithm;
  /** Secret key or public key for verification */
  key: string;
  /** JWKS URL for dynamic key retrieval (optional) */
  jwksUrl?: string;
  /** Token issuer for validation (optional) */
  issuer?: string;
  /** Token audience for validation (optional) */
  audience?: string;
}

/**
 * Configuration for record-based authentication (user accounts).
 */
export interface RecordAccessConfig {
  /** Name of the access method */
  name: string;
  /** Table where user records are stored */
  table: string;
  /** Field containing username/identifier */
  usernameField: string;
  /** Field containing hashed password */
  passwordField: string;
  /** Custom signin query (optional) */
  signinQuery?: string;
  /** Custom signup query (optional) */
  signupQuery?: string;
  /** JWT configuration for record access tokens */
  jwt?: {
    algorithm: JwtAlgorithm;
    key: string;
    duration?: string; // e.g., '1h', '30m', '7d'
  };
}

/**
 * Result of authentication verification.
 */
export interface AuthResult {
  /** Whether authentication succeeded */
  success: boolean;
  /** User/subject identifier if successful */
  userId?: string;
  /** Error message if failed */
  error?: string;
  /** Additional claims from token/session */
  claims?: Record<string, unknown>;
}

/**
 * Manages authentication for SurrealDB.
 *
 * @remarks
 * Supports modern DEFINE ACCESS patterns including:
 * - JWT-based authentication with various algorithms
 * - Record-based authentication with custom tables
 * - JWKS for third-party identity providers
 * - Token validation and claim extraction
 */
export class AuthManager {
  private strategy: AuthStrategy = 'none';
  private jwtConfig?: JwtAccessConfig;
  private recordConfig?: RecordAccessConfig;

  constructor(private readonly client: Surreal) {}

  /**
   * Configure JWT-based authentication.
   *
   * @param config - JWT access configuration
   * @param context - Request context for logging
   *
   * @example
   * ```ts
   * await authManager.configureJwt({
   *   name: 'api_access',
   *   algorithm: 'HS512',
   *   key: process.env.JWT_SECRET!,
   *   issuer: 'https://myapp.com',
   *   audience: 'api'
   * }, context);
   * ```
   */
  async configureJwt(
    config: JwtAccessConfig,
    context: RequestContext,
  ): Promise<void> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.info(
          `[AuthManager] Configuring JWT access: ${config.name}`,
          context,
        );

        const query = this.buildJwtAccessQuery(config);
        await this.client.query(query);

        this.jwtConfig = config;
        this.strategy = 'jwt';

        logger.info('[AuthManager] JWT access configured', context);
      },
      {
        operation: 'AuthManager.configureJwt',
        context,
        input: { name: config.name, algorithm: config.algorithm },
      },
    );
  }

  /**
   * Configure record-based authentication (user accounts).
   *
   * @param config - Record access configuration
   * @param context - Request context for logging
   */
  async configureRecord(
    config: RecordAccessConfig,
    context: RequestContext,
  ): Promise<void> {
    return ErrorHandler.tryCatch(
      async () => {
        logger.info(
          `[AuthManager] Configuring record access: ${config.name}`,
          context,
        );

        const query = this.buildRecordAccessQuery(config);
        await this.client.query(query);

        this.recordConfig = config;
        this.strategy = 'record';

        logger.info('[AuthManager] Record access configured', context);
      },
      {
        operation: 'AuthManager.configureRecord',
        context,
        input: { name: config.name, table: config.table },
      },
    );
  }

  /**
   * Build DEFINE ACCESS query for JWT.
   */
  private buildJwtAccessQuery(config: JwtAccessConfig): string {
    const parts = [
      `DEFINE ACCESS ${config.name}`,
      'ON DATABASE',
      'TYPE JWT',
      `ALGORITHM ${config.algorithm}`,
    ];

    if (config.jwksUrl) {
      parts.push(`URL '${config.jwksUrl}'`);
    } else {
      parts.push(`KEY '${config.key}'`);
    }

    if (config.issuer) {
      parts.push(`WITH ISSUER '${config.issuer}'`);
    }

    if (config.audience) {
      parts.push(`WITH AUDIENCE '${config.audience}'`);
    }

    return parts.join(' ');
  }

  /**
   * Build DEFINE ACCESS query for record-based auth.
   */
  private buildRecordAccessQuery(config: RecordAccessConfig): string {
    const parts = [
      `DEFINE ACCESS ${config.name}`,
      'ON DATABASE',
      'TYPE RECORD',
    ];

    if (config.signinQuery) {
      parts.push(`SIGNIN (${config.signinQuery})`);
    } else {
      // Default signin query
      parts.push(
        `SIGNIN (SELECT * FROM ${config.table} WHERE ${config.usernameField} = $username AND crypto::argon2::compare(${config.passwordField}, $password))`,
      );
    }

    if (config.signupQuery) {
      parts.push(`SIGNUP (${config.signupQuery})`);
    }

    if (config.jwt) {
      parts.push(
        `WITH JWT ALGORITHM ${config.jwt.algorithm} KEY '${config.jwt.key}'`,
      );
      if (config.jwt.duration) {
        parts.push(`DURATION FOR TOKEN ${config.jwt.duration}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Get current authentication strategy.
   */
  getStrategy(): AuthStrategy {
    return this.strategy;
  }

  /**
   * Get JWT configuration if available.
   */
  getJwtConfig(): JwtAccessConfig | undefined {
    return this.jwtConfig;
  }

  /**
   * Get record configuration if available.
   */
  getRecordConfig(): RecordAccessConfig | undefined {
    return this.recordConfig;
  }
}
