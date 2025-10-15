/**
 * @fileoverview Test suite for authentication types
 * @module tests/mcp-server/transports/auth/lib/authTypes.test
 */

import { describe, expect, it } from 'vitest';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';

describe('Auth Types', () => {
  describe('AuthInfo type', () => {
    it('should allow valid AuthInfo objects with all SDK fields', () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client-id',
        scopes: ['tool:read', 'tool:write'],
        token: 'test-token',
      };

      expect(authInfo.clientId).toBe('test-client-id');
      expect(authInfo.scopes).toEqual(['tool:read', 'tool:write']);
      expect(authInfo.token).toBe('test-token');
    });

    it('should allow AuthInfo with optional subject field', () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client-id',
        scopes: ['tool:read'],
        token: 'test-token',
        subject: 'user-123',
      };

      expect(authInfo.subject).toBe('user-123');
    });

    it('should allow AuthInfo with optional tenantId field', () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client-id',
        scopes: ['tool:read'],
        token: 'test-token',
        tenantId: 'tenant-456',
      };

      expect(authInfo.tenantId).toBe('tenant-456');
    });

    it('should allow AuthInfo with all optional fields', () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client-id',
        scopes: ['tool:read', 'tool:write', 'tool:delete'],
        token: 'test-token',
        subject: 'user-123',
        tenantId: 'tenant-456',
      };

      expect(authInfo.clientId).toBe('test-client-id');
      expect(authInfo.scopes).toHaveLength(3);
      expect(authInfo.token).toBe('test-token');
      expect(authInfo.subject).toBe('user-123');
      expect(authInfo.tenantId).toBe('tenant-456');
    });

    it('should allow AuthInfo without optional fields', () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client-id',
        scopes: [],
        token: 'test-token',
      };

      expect(authInfo.subject).toBeUndefined();
      expect(authInfo.tenantId).toBeUndefined();
    });

    it('should support empty scopes array', () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client-id',
        scopes: [],
        token: 'test-token',
      };

      expect(authInfo.scopes).toEqual([]);
      expect(authInfo.scopes).toHaveLength(0);
    });

    it('should support multiple scopes', () => {
      const scopes = [
        'tool:read',
        'tool:write',
        'tool:delete',
        'resource:read',
        'resource:list',
      ];
      const authInfo: AuthInfo = {
        clientId: 'test-client-id',
        scopes,
        token: 'test-token',
      };

      expect(authInfo.scopes).toEqual(scopes);
      expect(authInfo.scopes).toHaveLength(5);
    });

    it('should maintain type safety for required fields', () => {
      // This is a compile-time test - if it compiles, the test passes
      const authInfo: AuthInfo = {
        clientId: 'test-client-id',
        scopes: ['tool:read'],
        token: 'test-token',
      };

      // Verify required fields are present
      expect(authInfo.clientId).toBeDefined();
      expect(authInfo.scopes).toBeDefined();
      expect(authInfo.token).toBeDefined();
    });

    it('should allow AuthInfo to be used in function parameters', () => {
      function processAuth(auth: AuthInfo): string {
        return `${auth.clientId}:${auth.scopes.join(',')}`;
      }

      const authInfo: AuthInfo = {
        clientId: 'client-1',
        scopes: ['read', 'write'],
        token: 'token',
      };

      const result = processAuth(authInfo);
      expect(result).toBe('client-1:read,write');
    });

    it('should allow AuthInfo to be used as return type', () => {
      function createAuth(): AuthInfo {
        return {
          clientId: 'client-1',
          scopes: ['read'],
          token: 'token',
          subject: 'user-1',
          tenantId: 'tenant-1',
        };
      }

      const auth = createAuth();
      expect(auth.clientId).toBe('client-1');
      expect(auth.subject).toBe('user-1');
      expect(auth.tenantId).toBe('tenant-1');
    });

    it('should support readonly arrays for scopes', () => {
      const scopes: readonly string[] = ['tool:read', 'tool:write'];
      const authInfo: AuthInfo = {
        clientId: 'test-client-id',
        scopes: scopes as string[],
        token: 'test-token',
      };

      expect(authInfo.scopes).toEqual(scopes);
    });

    it('should allow partial AuthInfo for testing purposes', () => {
      const partial: Partial<AuthInfo> = {
        clientId: 'test-client',
      };

      expect(partial.clientId).toBe('test-client');
      expect(partial.scopes).toBeUndefined();
      expect(partial.token).toBeUndefined();
    });

    it('should support object spread operations', () => {
      const base: AuthInfo = {
        clientId: 'client-1',
        scopes: ['read'],
        token: 'token',
      };

      const extended: AuthInfo = {
        ...base,
        subject: 'user-1',
        tenantId: 'tenant-1',
      };

      expect(extended.clientId).toBe('client-1');
      expect(extended.scopes).toEqual(['read']);
      expect(extended.subject).toBe('user-1');
      expect(extended.tenantId).toBe('tenant-1');
    });

    it('should support object destructuring', () => {
      const authInfo: AuthInfo = {
        clientId: 'client-1',
        scopes: ['read', 'write'],
        token: 'token',
        subject: 'user-1',
        tenantId: 'tenant-1',
      };

      const { clientId, scopes, token, subject, tenantId } = authInfo;

      expect(clientId).toBe('client-1');
      expect(scopes).toEqual(['read', 'write']);
      expect(token).toBe('token');
      expect(subject).toBe('user-1');
      expect(tenantId).toBe('tenant-1');
    });
  });

  describe('Type compatibility', () => {
    it('should be compatible with SDK AuthInfo', () => {
      // This tests that our AuthInfo extends SDK's AuthInfo properly
      const authInfo: AuthInfo = {
        clientId: 'test-client',
        scopes: ['test:scope'],
        token: 'test-token',
      };

      // Should have all SDK fields
      expect(authInfo.clientId).toBeDefined();
      expect(authInfo.scopes).toBeDefined();
      expect(authInfo.token).toBeDefined();
    });

    it('should support additional fields beyond SDK type', () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client',
        scopes: ['test:scope'],
        token: 'test-token',
        subject: 'additional-field-1',
        tenantId: 'additional-field-2',
      };

      // Our extended fields
      expect(authInfo.subject).toBeDefined();
      expect(authInfo.tenantId).toBeDefined();
    });
  });

  describe('Real-world usage patterns', () => {
    it('should support JWT-derived auth info', () => {
      const jwtAuth: AuthInfo = {
        clientId: 'jwt-client',
        scopes: ['tool:execute'],
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        subject: 'user@example.com',
        tenantId: 'tenant-123',
      };

      expect(jwtAuth.token).toContain('eyJ');
      expect(jwtAuth.subject).toContain('@');
    });

    it('should support OAuth-derived auth info', () => {
      const oauthAuth: AuthInfo = {
        clientId: 'oauth-client-id',
        scopes: ['openid', 'profile', 'email', 'tool:read', 'resource:list'],
        token: 'oauth-access-token',
        subject: 'oauth|user-id-123',
        tenantId: 'org-456',
      };

      expect(oauthAuth.scopes).toContain('openid');
      expect(oauthAuth.subject).toContain('oauth|');
    });

    it('should support multi-tenant scenarios', () => {
      const tenant1Auth: AuthInfo = {
        clientId: 'client-1',
        scopes: ['tenant:read'],
        token: 'token-1',
        tenantId: 'tenant-1',
      };

      const tenant2Auth: AuthInfo = {
        clientId: 'client-1',
        scopes: ['tenant:read'],
        token: 'token-2',
        tenantId: 'tenant-2',
      };

      expect(tenant1Auth.tenantId).not.toBe(tenant2Auth.tenantId);
      expect(tenant1Auth.clientId).toBe(tenant2Auth.clientId);
    });

    it('should support service account auth info', () => {
      const serviceAuth: AuthInfo = {
        clientId: 'service-account-id',
        scopes: ['service:admin', 'tool:*', 'resource:*'],
        token: 'service-token',
        subject: 'service-account@system',
      };

      expect(serviceAuth.scopes).toContain('service:admin');
      expect(serviceAuth.subject).toContain('service-account');
    });
  });
});
