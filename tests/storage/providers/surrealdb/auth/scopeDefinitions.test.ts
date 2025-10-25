/**
 * @fileoverview Test suite for SurrealDB scope definitions and permission patterns.
 * @module tests/storage/providers/surrealdb/auth/scopeDefinitions.test
 */

import { describe, expect, it } from 'vitest';
import {
  ScopeDefinitions,
  PermissionPatterns,
} from '@/storage/providers/surrealdb/auth/scopeDefinitions.js';
import type {
  JwtAccessConfig,
  RecordAccessConfig,
} from '@/storage/providers/surrealdb/auth/authManager.js';

describe('ScopeDefinitions', () => {
  describe('apiJwt', () => {
    it('should create JWT config with default algorithm', () => {
      const config: JwtAccessConfig = ScopeDefinitions.apiJwt(
        'api_access',
        'my-secret',
      );

      expect(config).toEqual({
        name: 'api_access',
        algorithm: 'HS512',
        key: 'my-secret',
      });
    });

    it('should create JWT config with custom algorithm', () => {
      const config: JwtAccessConfig = ScopeDefinitions.apiJwt(
        'api_access',
        'my-secret',
        'HS256',
      );

      expect(config.algorithm).toBe('HS256');
    });

    it('should use default name when not provided', () => {
      const config: JwtAccessConfig = ScopeDefinitions.apiJwt(
        undefined as unknown as string,
        'secret',
      );

      expect(config.name).toBeDefined();
    });

    it('should support all JWT algorithms', () => {
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
        const config = ScopeDefinitions.apiJwt('test', 'secret', algorithm);
        expect(config.algorithm).toBe(algorithm);
      }
    });
  });

  describe('validatedJwt', () => {
    it('should create JWT config with issuer and audience', () => {
      const config: JwtAccessConfig = ScopeDefinitions.validatedJwt(
        'validated_api',
        'my-secret',
        'https://myapp.com',
        'api',
      );

      expect(config).toEqual({
        name: 'validated_api',
        algorithm: 'HS512',
        key: 'my-secret',
        issuer: 'https://myapp.com',
        audience: 'api',
      });
    });

    it('should support custom algorithm', () => {
      const config: JwtAccessConfig = ScopeDefinitions.validatedJwt(
        'validated_api',
        'secret',
        'https://issuer.com',
        'api',
        'HS256',
      );

      expect(config.algorithm).toBe('HS256');
    });

    it('should include all validation fields', () => {
      const config = ScopeDefinitions.validatedJwt(
        'test',
        'secret',
        'https://issuer.com',
        'my-audience',
      );

      expect(config.issuer).toBe('https://issuer.com');
      expect(config.audience).toBe('my-audience');
    });
  });

  describe('jwksAuth', () => {
    it('should create JWT config with JWKS URL', () => {
      const config: JwtAccessConfig = ScopeDefinitions.jwksAuth(
        'auth0_access',
        'https://myapp.auth0.com/.well-known/jwks.json',
        'https://myapp.auth0.com/',
        'api',
      );

      expect(config).toEqual({
        name: 'auth0_access',
        algorithm: 'RS256',
        key: '',
        jwksUrl: 'https://myapp.auth0.com/.well-known/jwks.json',
        issuer: 'https://myapp.auth0.com/',
        audience: 'api',
      });
    });

    it('should use RS256 as default algorithm for JWKS', () => {
      const config = ScopeDefinitions.jwksAuth(
        'test',
        'https://example.com/jwks',
        'https://example.com',
        'api',
      );

      expect(config.algorithm).toBe('RS256');
    });

    it('should support custom algorithm', () => {
      const config: JwtAccessConfig = ScopeDefinitions.jwksAuth(
        'test',
        'https://example.com/jwks',
        'https://example.com',
        'api',
        'RS512',
      );

      expect(config.algorithm).toBe('RS512');
    });

    it('should set empty key for JWKS', () => {
      const config = ScopeDefinitions.jwksAuth(
        'test',
        'https://example.com/jwks',
        'https://example.com',
        'api',
      );

      expect(config.key).toBe('');
    });
  });

  describe('userAuth', () => {
    it('should create record config with defaults', () => {
      const config: RecordAccessConfig = ScopeDefinitions.userAuth(
        undefined,
        undefined,
        'jwt-secret',
      );

      expect(config).toEqual({
        name: 'user_access',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
        jwt: {
          algorithm: 'HS512',
          key: 'jwt-secret',
          duration: '24h',
        },
      });
    });

    it('should create record config with custom name and table', () => {
      const config: RecordAccessConfig = ScopeDefinitions.userAuth(
        'custom_user',
        'users',
        'secret',
      );

      expect(config.name).toBe('custom_user');
      expect(config.table).toBe('users');
    });

    it('should support custom duration', () => {
      const config: RecordAccessConfig = ScopeDefinitions.userAuth(
        'user_access',
        'user',
        'secret',
        '7d',
      );

      expect(config.jwt?.duration).toBe('7d');
    });

    it('should support custom algorithm', () => {
      const config: RecordAccessConfig = ScopeDefinitions.userAuth(
        'user_access',
        'user',
        'secret',
        '24h',
        'HS256',
      );

      expect(config.jwt?.algorithm).toBe('HS256');
    });

    it('should use email and password as default fields', () => {
      const config = ScopeDefinitions.userAuth('user_access', 'user', 'secret');

      expect(config.usernameField).toBe('email');
      expect(config.passwordField).toBe('password');
    });
  });

  describe('customRecordAuth', () => {
    it('should create record config with custom queries', () => {
      const signinQuery =
        'SELECT * FROM user WHERE email = $email AND active = true';
      const signupQuery = 'CREATE user SET email = $email, active = true';

      const config: RecordAccessConfig = ScopeDefinitions.customRecordAuth(
        'custom_user',
        'user',
        signinQuery,
        signupQuery,
        'jwt-secret',
      );

      expect(config).toEqual({
        name: 'custom_user',
        table: 'user',
        usernameField: 'email',
        passwordField: 'password',
        signinQuery,
        signupQuery,
        jwt: {
          algorithm: 'HS512',
          key: 'jwt-secret',
          duration: '24h',
        },
      });
    });

    it('should include custom signin and signup queries', () => {
      const signinQuery = 'SELECT * FROM user WHERE username = $username';
      const signupQuery = 'CREATE user SET username = $username';

      const config = ScopeDefinitions.customRecordAuth(
        'test',
        'user',
        signinQuery,
        signupQuery,
        'secret',
      );

      expect(config.signinQuery).toBe(signinQuery);
      expect(config.signupQuery).toBe(signupQuery);
    });

    it('should use HS512 and 24h as defaults for JWT', () => {
      const config = ScopeDefinitions.customRecordAuth(
        'test',
        'user',
        'SELECT *',
        'CREATE',
        'secret',
      );

      expect(config.jwt?.algorithm).toBe('HS512');
      expect(config.jwt?.duration).toBe('24h');
    });
  });

  describe('adminAuth', () => {
    it('should create admin record config with defaults', () => {
      const config: RecordAccessConfig = ScopeDefinitions.adminAuth(
        undefined,
        undefined,
        'admin-secret',
      );

      expect(config).toEqual({
        name: 'admin_access',
        table: 'admin',
        usernameField: 'username',
        passwordField: 'password',
        jwt: {
          algorithm: 'HS512',
          key: 'admin-secret',
          duration: '7d',
        },
      });
    });

    it('should use 7d duration by default', () => {
      const config = ScopeDefinitions.adminAuth(
        'admin_access',
        'admin',
        'secret',
      );

      expect(config.jwt?.duration).toBe('7d');
    });

    it('should use username field instead of email', () => {
      const config = ScopeDefinitions.adminAuth(
        'admin_access',
        'admin',
        'secret',
      );

      expect(config.usernameField).toBe('username');
    });

    it('should support custom duration', () => {
      const config: RecordAccessConfig = ScopeDefinitions.adminAuth(
        'admin_access',
        'admin',
        'secret',
        '30d',
      );

      expect(config.jwt?.duration).toBe('30d');
    });

    it('should support custom name and table', () => {
      const config: RecordAccessConfig = ScopeDefinitions.adminAuth(
        'superuser',
        'administrators',
        'secret',
        '14d',
      );

      expect(config.name).toBe('superuser');
      expect(config.table).toBe('administrators');
    });
  });
});

describe('PermissionPatterns', () => {
  describe('tenantScoped', () => {
    it('should generate tenant-scoped WHERE clause with defaults', () => {
      const where = PermissionPatterns.tenantScoped();

      expect(where).toBe('tenant_id = $token.tid');
    });

    it('should support custom token variable', () => {
      const where = PermissionPatterns.tenantScoped('$auth');

      expect(where).toBe('tenant_id = $auth.tid');
    });

    it('should support custom tenant field', () => {
      const where = PermissionPatterns.tenantScoped('$token', 'org_id');

      expect(where).toBe('org_id = $token.tid');
    });

    it('should support both custom token and field', () => {
      const where = PermissionPatterns.tenantScoped('$session', 'company_id');

      expect(where).toBe('company_id = $session.tid');
    });
  });

  describe('ownerOnly', () => {
    it('should generate owner-only WHERE clause with defaults', () => {
      const where = PermissionPatterns.ownerOnly();

      expect(where).toBe('owner = $token.sub');
    });

    it('should support custom token variable', () => {
      const where = PermissionPatterns.ownerOnly('$auth');

      expect(where).toBe('owner = $auth.sub');
    });

    it('should support custom owner field', () => {
      const where = PermissionPatterns.ownerOnly('$token', 'created_by');

      expect(where).toBe('created_by = $token.sub');
    });

    it('should support both custom token and field', () => {
      const where = PermissionPatterns.ownerOnly('$session', 'author');

      expect(where).toBe('author = $session.sub');
    });
  });

  describe('roleBasedAccess', () => {
    it('should generate role-based WHERE clause for single role', () => {
      const where = PermissionPatterns.roleBasedAccess(['admin']);

      expect(where).toBe("$token.role INSIDE ['admin']");
    });

    it('should generate role-based WHERE clause for multiple roles', () => {
      const where = PermissionPatterns.roleBasedAccess(['admin', 'moderator']);

      expect(where).toBe("$token.role INSIDE ['admin', 'moderator']");
    });

    it('should support custom token variable', () => {
      const where = PermissionPatterns.roleBasedAccess(
        ['admin', 'user'],
        '$auth',
      );

      expect(where).toBe("$auth.role INSIDE ['admin', 'user']");
    });

    it('should handle many roles', () => {
      const roles = ['admin', 'moderator', 'editor', 'viewer', 'guest'];
      const where = PermissionPatterns.roleBasedAccess(roles);

      expect(where).toBe(
        "$token.role INSIDE ['admin', 'moderator', 'editor', 'viewer', 'guest']",
      );
    });

    it('should properly quote role names', () => {
      const where = PermissionPatterns.roleBasedAccess(['super-admin', 'user']);

      expect(where).toContain("'super-admin'");
      expect(where).toContain("'user'");
    });
  });

  describe('tenantAndOwner', () => {
    it('should combine tenant and owner clauses with defaults', () => {
      const where = PermissionPatterns.tenantAndOwner();

      expect(where).toBe('tenant_id = $token.tid AND owner = $token.sub');
    });

    it('should support custom token variable', () => {
      const where = PermissionPatterns.tenantAndOwner('$auth');

      expect(where).toBe('tenant_id = $auth.tid AND owner = $auth.sub');
    });

    it('should support custom tenant field', () => {
      const where = PermissionPatterns.tenantAndOwner(
        '$token',
        'org_id',
        'owner',
      );

      expect(where).toBe('org_id = $token.tid AND owner = $token.sub');
    });

    it('should support custom owner field', () => {
      const where = PermissionPatterns.tenantAndOwner(
        '$token',
        'tenant_id',
        'created_by',
      );

      expect(where).toBe('tenant_id = $token.tid AND created_by = $token.sub');
    });

    it('should support all custom parameters', () => {
      const where = PermissionPatterns.tenantAndOwner(
        '$session',
        'company_id',
        'author',
      );

      expect(where).toBe('company_id = $session.tid AND author = $session.sub');
    });
  });

  describe('Pattern integration', () => {
    it('should work with permission helpers', () => {
      const tenantWhere = PermissionPatterns.tenantScoped();
      const ownerWhere = PermissionPatterns.ownerOnly();
      const roleWhere = PermissionPatterns.roleBasedAccess(['admin']);

      expect(tenantWhere).toContain('tenant_id');
      expect(ownerWhere).toContain('owner');
      expect(roleWhere).toContain('INSIDE');
    });

    it('should be composable for complex scenarios', () => {
      const tenantPart = PermissionPatterns.tenantScoped();
      const rolePart = PermissionPatterns.roleBasedAccess(['admin', 'editor']);
      const combined = `${tenantPart} AND ${rolePart}`;

      expect(combined).toBe(
        "tenant_id = $token.tid AND $token.role INSIDE ['admin', 'editor']",
      );
    });
  });
});
