/**
 * @fileoverview Test suite for SurrealDB authentication manager.
 * @module tests/storage/providers/surrealdb/auth/authManager.test
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  AuthManager,
  type JwtAccessConfig,
  type RecordAccessConfig,
  type AuthStrategy,
} from '@/storage/providers/surrealdb/auth/authManager.js';
import { requestContextService } from '@/utils/index.js';

describe('AuthManager', () => {
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
  };
  let authManager: AuthManager;
  let context: ReturnType<typeof requestContextService.createRequestContext>;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authManager = new AuthManager(mockClient as any);
    context = requestContextService.createRequestContext({
      operation: 'test-auth-manager',
    });
  });

  describe('JWT Configuration', () => {
    it('should configure JWT with basic settings', async () => {
      const config: JwtAccessConfig = {
        name: 'api_access',
        algorithm: 'HS512',
        key: 'test-secret-key',
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureJwt(config, context);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('DEFINE ACCESS api_access');
      expect(query).toContain('ON DATABASE');
      expect(query).toContain('TYPE JWT');
      expect(query).toContain('ALGORITHM HS512');
      expect(query).toContain("KEY 'test-secret-key'");
    });

    it('should configure JWT with issuer and audience validation', async () => {
      const config: JwtAccessConfig = {
        name: 'validated_api',
        algorithm: 'HS256',
        key: 'secret',
        issuer: 'https://myapp.com',
        audience: 'api',
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureJwt(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain("WITH ISSUER 'https://myapp.com'");
      expect(query).toContain("WITH AUDIENCE 'api'");
    });

    it('should configure JWT with JWKS URL for third-party providers', async () => {
      const config: JwtAccessConfig = {
        name: 'auth0_access',
        algorithm: 'RS256',
        key: '', // Not used with JWKS
        jwksUrl: 'https://myapp.auth0.com/.well-known/jwks.json',
        issuer: 'https://myapp.auth0.com/',
        audience: 'api',
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureJwt(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain(
        "URL 'https://myapp.auth0.com/.well-known/jwks.json'",
      );
      expect(query).not.toContain('KEY');
    });

    it('should support different JWT algorithms', async () => {
      const algorithms = [
        'HS256',
        'HS384',
        'HS512',
        'RS256',
        'RS384',
        'RS512',
        'ES256',
        'ES384',
        'ES512',
        'PS256',
        'PS384',
        'PS512',
      ] as const;

      for (const algorithm of algorithms) {
        mockClient.query.mockClear();
        mockClient.query.mockResolvedValue(undefined);

        const config: JwtAccessConfig = {
          name: `test_${algorithm}`,
          algorithm,
          key: 'secret',
        };

        await authManager.configureJwt(config, context);

        const query = mockClient.query.mock.calls[0]?.[0] as string;
        expect(query).toContain(`ALGORITHM ${algorithm}`);
      }
    });

    it('should update strategy to jwt after configuration', async () => {
      const config: JwtAccessConfig = {
        name: 'api_access',
        algorithm: 'HS512',
        key: 'secret',
      };

      mockClient.query.mockResolvedValue(undefined);

      expect(authManager.getStrategy()).toBe('none');

      await authManager.configureJwt(config, context);

      expect(authManager.getStrategy()).toBe('jwt');
    });

    it('should store JWT config for later retrieval', async () => {
      const config: JwtAccessConfig = {
        name: 'api_access',
        algorithm: 'HS512',
        key: 'secret',
      };

      mockClient.query.mockResolvedValue(undefined);

      expect(authManager.getJwtConfig()).toBeUndefined();

      await authManager.configureJwt(config, context);

      const storedConfig = authManager.getJwtConfig();
      expect(storedConfig).toEqual(config);
    });
  });

  describe('Record Configuration', () => {
    it('should configure record-based auth with default signin/signup', async () => {
      const config: RecordAccessConfig = {
        name: 'user_access',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureRecord(config, context);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('DEFINE ACCESS user_access');
      expect(query).toContain('ON DATABASE');
      expect(query).toContain('TYPE RECORD');
      expect(query).toContain('SIGNIN');
      expect(query).toContain('SELECT * FROM user');
      expect(query).toContain('WHERE email = $username');
      expect(query).toContain('crypto::argon2::compare(password, $password)');
    });

    it('should configure with custom signin query', async () => {
      const config: RecordAccessConfig = {
        name: 'custom_user',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
        signinQuery:
          'SELECT * FROM user WHERE email = $email AND active = true AND crypto::argon2::compare(password, $password)',
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureRecord(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain(
        'SIGNIN (SELECT * FROM user WHERE email = $email',
      );
      expect(query).toContain('active = true');
    });

    it('should configure with custom signup query', async () => {
      const config: RecordAccessConfig = {
        name: 'user_access',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
        signupQuery:
          'CREATE user SET email = $email, password = crypto::argon2::generate($password), created_at = time::now()',
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureRecord(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('SIGNUP (CREATE user SET email = $email');
      expect(query).toContain('password = crypto::argon2::generate($password)');
      expect(query).toContain('created_at = time::now()');
    });

    it('should configure with JWT token settings', async () => {
      const config: RecordAccessConfig = {
        name: 'user_access',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
        jwt: {
          algorithm: 'HS512',
          key: 'jwt-secret',
          duration: '24h',
        },
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureRecord(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain("WITH JWT ALGORITHM HS512 KEY 'jwt-secret'");
      expect(query).toContain('DURATION FOR TOKEN 24h');
    });

    it('should support different JWT duration formats', async () => {
      const durations = ['1h', '30m', '7d', '12h', '90s'];

      for (const duration of durations) {
        mockClient.query.mockClear();
        mockClient.query.mockResolvedValue(undefined);

        const config: RecordAccessConfig = {
          name: 'user_access',
          table: 'user',
          usernameField: 'email',
          passwordField: 'password',
          jwt: {
            algorithm: 'HS256',
            key: 'secret',
            duration,
          },
        };

        await authManager.configureRecord(config, context);

        const query = mockClient.query.mock.calls[0]?.[0] as string;
        expect(query).toContain(`DURATION FOR TOKEN ${duration}`);
      }
    });

    it('should update strategy to record after configuration', async () => {
      const config: RecordAccessConfig = {
        name: 'user_access',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
      };

      mockClient.query.mockResolvedValue(undefined);

      expect(authManager.getStrategy()).toBe('none');

      await authManager.configureRecord(config, context);

      expect(authManager.getStrategy()).toBe('record');
    });

    it('should store record config for later retrieval', async () => {
      const config: RecordAccessConfig = {
        name: 'user_access',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
      };

      mockClient.query.mockResolvedValue(undefined);

      expect(authManager.getRecordConfig()).toBeUndefined();

      await authManager.configureRecord(config, context);

      const storedConfig = authManager.getRecordConfig();
      expect(storedConfig).toEqual(config);
    });

    it('should handle JWT without duration', async () => {
      const config: RecordAccessConfig = {
        name: 'user_access',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
        jwt: {
          algorithm: 'HS256',
          key: 'secret',
          // No duration specified
        },
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureRecord(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain("WITH JWT ALGORITHM HS256 KEY 'secret'");
      expect(query).not.toContain('DURATION FOR TOKEN');
    });
  });

  describe('Getters', () => {
    it('should return none strategy by default', () => {
      expect(authManager.getStrategy()).toBe('none');
    });

    it('should return undefined for JWT config when not configured', () => {
      expect(authManager.getJwtConfig()).toBeUndefined();
    });

    it('should return undefined for record config when not configured', () => {
      expect(authManager.getRecordConfig()).toBeUndefined();
    });

    it('should return correct strategy after JWT configuration', async () => {
      const config: JwtAccessConfig = {
        name: 'api',
        algorithm: 'HS512',
        key: 'secret',
      };

      mockClient.query.mockResolvedValue(undefined);
      await authManager.configureJwt(config, context);

      const strategy: AuthStrategy = authManager.getStrategy();
      expect(strategy).toBe('jwt');
    });

    it('should return correct strategy after record configuration', async () => {
      const config: RecordAccessConfig = {
        name: 'user',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
      };

      mockClient.query.mockResolvedValue(undefined);
      await authManager.configureRecord(config, context);

      const strategy: AuthStrategy = authManager.getStrategy();
      expect(strategy).toBe('record');
    });

    it('should overwrite strategy when reconfiguring', async () => {
      const jwtConfig: JwtAccessConfig = {
        name: 'api',
        algorithm: 'HS512',
        key: 'secret',
      };

      const recordConfig: RecordAccessConfig = {
        name: 'user',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureJwt(jwtConfig, context);
      expect(authManager.getStrategy()).toBe('jwt');

      await authManager.configureRecord(recordConfig, context);
      expect(authManager.getStrategy()).toBe('record');
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from query execution', async () => {
      const config: JwtAccessConfig = {
        name: 'api',
        algorithm: 'HS512',
        key: 'secret',
      };

      const testError = new Error('Database connection failed');
      mockClient.query.mockRejectedValue(testError);

      await expect(authManager.configureJwt(config, context)).rejects.toThrow();
    });

    it('should handle record configuration errors', async () => {
      const config: RecordAccessConfig = {
        name: 'user',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
      };

      const testError = new Error('Invalid table name');
      mockClient.query.mockRejectedValue(testError);

      await expect(
        authManager.configureRecord(config, context),
      ).rejects.toThrow();
    });
  });

  describe('Query Building Edge Cases', () => {
    it('should handle special characters in keys safely', async () => {
      const config: JwtAccessConfig = {
        name: 'api_access',
        algorithm: 'HS512',
        key: 'secret\'with"quotes',
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureJwt(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain("KEY 'secret'with\"quotes'");
    });

    it('should handle issuer with special characters', async () => {
      const config: JwtAccessConfig = {
        name: 'api',
        algorithm: 'HS512',
        key: 'secret',
        issuer: 'https://myapp.com/auth?tenant=test',
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureJwt(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain(
        "WITH ISSUER 'https://myapp.com/auth?tenant=test'",
      );
    });

    it('should build complete query with all JWT options', async () => {
      const config: JwtAccessConfig = {
        name: 'complete_jwt',
        algorithm: 'RS256',
        key: 'public-key-content',
        issuer: 'https://issuer.com',
        audience: 'my-api',
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureJwt(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('DEFINE ACCESS complete_jwt');
      expect(query).toContain('ON DATABASE');
      expect(query).toContain('TYPE JWT');
      expect(query).toContain('ALGORITHM RS256');
      expect(query).toContain("KEY 'public-key-content'");
      expect(query).toContain("WITH ISSUER 'https://issuer.com'");
      expect(query).toContain("WITH AUDIENCE 'my-api'");
    });

    it('should build complete query with all record options', async () => {
      const config: RecordAccessConfig = {
        name: 'complete_record',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
        signinQuery: 'SELECT * FROM user WHERE email = $email',
        signupQuery: 'CREATE user SET email = $email',
        jwt: {
          algorithm: 'HS512',
          key: 'jwt-secret',
          duration: '24h',
        },
      };

      mockClient.query.mockResolvedValue(undefined);

      await authManager.configureRecord(config, context);

      const query = mockClient.query.mock.calls[0]?.[0] as string;
      expect(query).toContain('DEFINE ACCESS complete_record');
      expect(query).toContain('ON DATABASE');
      expect(query).toContain('TYPE RECORD');
      expect(query).toContain(
        'SIGNIN (SELECT * FROM user WHERE email = $email)',
      );
      expect(query).toContain('SIGNUP (CREATE user SET email = $email)');
      expect(query).toContain("WITH JWT ALGORITHM HS512 KEY 'jwt-secret'");
      expect(query).toContain('DURATION FOR TOKEN 24h');
    });
  });
});
