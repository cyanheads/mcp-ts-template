/**
 * @fileoverview Test suite for base authentication strategy
 * @module tests/mcp-server/transports/auth/strategies/authStrategy.test
 */

import { describe, expect, it } from 'vitest';
import type { AuthStrategy } from '@/mcp-server/transports/auth/strategies/authStrategy.js';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';

describe('Auth Strategy', () => {
  describe('AuthStrategy interface', () => {
    it('should define a verify method signature', () => {
      // This is a compile-time test - we verify the interface structure exists
      const mockStrategy: AuthStrategy = {
        verify: async (_token: string): Promise<AuthInfo> => {
          return {
            clientId: 'test-client',
            scopes: ['test:scope'],
            token: 'test-token',
          };
        },
      };

      expect(mockStrategy.verify).toBeDefined();
      expect(typeof mockStrategy.verify).toBe('function');
    });

    it('should require verify method to accept a token string', async () => {
      const mockStrategy: AuthStrategy = {
        verify: async (token: string): Promise<AuthInfo> => {
          expect(typeof token).toBe('string');
          return {
            clientId: 'test-client',
            scopes: [],
            token,
          };
        },
      };

      const result = await mockStrategy.verify('test-token');
      expect(result.token).toBe('test-token');
    });

    it('should require verify method to return Promise<AuthInfo>', async () => {
      const mockStrategy: AuthStrategy = {
        verify: async (token: string): Promise<AuthInfo> => {
          return {
            clientId: 'mock-client',
            scopes: ['mock:scope'],
            token,
          };
        },
      };

      const result = await mockStrategy.verify('jwt-token');
      expect(result).toBeDefined();
      expect(result.clientId).toBe('mock-client');
      expect(result.scopes).toEqual(['mock:scope']);
      expect(result.token).toBe('jwt-token');
    });

    it('should allow implementations to throw errors', async () => {
      const mockStrategy: AuthStrategy = {
        verify: async (_token: string): Promise<AuthInfo> => {
          throw new Error('Invalid token');
        },
      };

      await expect(mockStrategy.verify('invalid')).rejects.toThrow(
        'Invalid token',
      );
    });

    it('should support implementations with additional optional fields', async () => {
      const mockStrategy: AuthStrategy = {
        verify: async (token: string): Promise<AuthInfo> => {
          return {
            clientId: 'client-123',
            scopes: ['read', 'write'],
            token,
            subject: 'user-456',
            tenantId: 'tenant-789',
          };
        },
      };

      const result = await mockStrategy.verify('complete-token');
      expect(result.subject).toBe('user-456');
      expect(result.tenantId).toBe('tenant-789');
    });

    it('should support implementations with empty scopes', async () => {
      const mockStrategy: AuthStrategy = {
        verify: async (token: string): Promise<AuthInfo> => {
          return {
            clientId: 'client-no-scopes',
            scopes: [],
            token,
          };
        },
      };

      const result = await mockStrategy.verify('no-scopes-token');
      expect(result.scopes).toEqual([]);
      expect(result.scopes).toHaveLength(0);
    });

    it('should support implementations with multiple scopes', async () => {
      const mockStrategy: AuthStrategy = {
        verify: async (token: string): Promise<AuthInfo> => {
          return {
            clientId: 'multi-scope-client',
            scopes: [
              'tool:read',
              'tool:write',
              'resource:list',
              'resource:read',
            ],
            token,
          };
        },
      };

      const result = await mockStrategy.verify('multi-scope-token');
      expect(result.scopes).toHaveLength(4);
      expect(result.scopes).toContain('tool:read');
      expect(result.scopes).toContain('resource:list');
    });

    it('should be usable in dependency injection patterns', () => {
      class MockAuthService {
        constructor(private strategy: AuthStrategy) {}

        async authenticate(token: string): Promise<AuthInfo> {
          return this.strategy.verify(token);
        }
      }

      const strategy: AuthStrategy = {
        verify: async (token: string) => ({
          clientId: 'di-client',
          scopes: ['di:scope'],
          token,
        }),
      };

      const service = new MockAuthService(strategy);
      expect(service).toBeDefined();
      expect(service.authenticate).toBeDefined();
    });

    it('should support async token validation workflows', async () => {
      const mockStrategy: AuthStrategy = {
        verify: async (token: string): Promise<AuthInfo> => {
          // Simulate async validation
          await new Promise((resolve) => setTimeout(resolve, 10));

          if (token === 'valid-token') {
            return {
              clientId: 'validated-client',
              scopes: ['validated:scope'],
              token,
            };
          }
          throw new Error('Token validation failed');
        },
      };

      const validResult = await mockStrategy.verify('valid-token');
      expect(validResult.clientId).toBe('validated-client');

      await expect(mockStrategy.verify('invalid-token')).rejects.toThrow(
        'Token validation failed',
      );
    });

    it('should allow strategy implementations to be swappable', async () => {
      const jwtStrategy: AuthStrategy = {
        verify: async (token: string) => ({
          clientId: 'jwt-client',
          scopes: ['jwt:scope'],
          token,
        }),
      };

      const oauthStrategy: AuthStrategy = {
        verify: async (token: string) => ({
          clientId: 'oauth-client',
          scopes: ['oauth:scope'],
          token,
          subject: 'oauth|user',
        }),
      };

      let currentStrategy: AuthStrategy = jwtStrategy;
      let result = await currentStrategy.verify('token1');
      expect(result.clientId).toBe('jwt-client');

      currentStrategy = oauthStrategy;
      result = await currentStrategy.verify('token2');
      expect(result.clientId).toBe('oauth-client');
      expect(result.subject).toBe('oauth|user');
    });

    it('should support strategy pattern for multiple auth methods', async () => {
      const strategies: Record<string, AuthStrategy> = {
        jwt: {
          verify: async (token: string) => ({
            clientId: 'jwt-client',
            scopes: ['jwt:read'],
            token,
          }),
        },
        oauth: {
          verify: async (token: string) => ({
            clientId: 'oauth-client',
            scopes: ['oauth:read', 'oauth:write'],
            token,
          }),
        },
        apikey: {
          verify: async (token: string) => ({
            clientId: 'apikey-client',
            scopes: ['api:access'],
            token,
          }),
        },
      };

      const jwtResult = await strategies['jwt']!.verify('jwt-token');
      expect(jwtResult.clientId).toBe('jwt-client');

      const oauthResult = await strategies['oauth']!.verify('oauth-token');
      expect(oauthResult.scopes).toContain('oauth:write');

      const apikeyResult = await strategies['apikey']!.verify('api-key');
      expect(apikeyResult.clientId).toBe('apikey-client');
    });

    it('should enforce return type includes all required AuthInfo fields', async () => {
      const mockStrategy: AuthStrategy = {
        verify: async (token: string): Promise<AuthInfo> => {
          const authInfo: AuthInfo = {
            clientId: 'test-client',
            scopes: ['test:scope'],
            token,
          };

          // Verify all required fields are present
          expect(authInfo.clientId).toBeDefined();
          expect(authInfo.scopes).toBeDefined();
          expect(authInfo.token).toBeDefined();

          return authInfo;
        },
      };

      await mockStrategy.verify('test-token');
    });

    it('should allow implementations to perform complex token parsing', async () => {
      const mockStrategy: AuthStrategy = {
        verify: async (token: string): Promise<AuthInfo> => {
          // Simulate JWT-like token parsing
          const parts = token.split('.');
          if (parts.length !== 3) {
            throw new Error('Invalid token format');
          }

          return {
            clientId: `client-from-${parts[1]}`,
            scopes: ['parsed:scope'],
            token,
          };
        },
      };

      const result = await mockStrategy.verify('header.payload.signature');
      expect(result.clientId).toContain('client-from-payload');

      await expect(mockStrategy.verify('invalid')).rejects.toThrow(
        'Invalid token format',
      );
    });

    it('should support strategies with different error handling', async () => {
      const strictStrategy: AuthStrategy = {
        verify: async (token: string): Promise<AuthInfo> => {
          if (!token || token.length < 10) {
            throw new Error('Token too short');
          }
          return {
            clientId: 'strict-client',
            scopes: ['strict:scope'],
            token,
          };
        },
      };

      const lenientStrategy: AuthStrategy = {
        verify: async (token: string): Promise<AuthInfo> => {
          return {
            clientId: 'lenient-client',
            scopes: token.length > 0 ? ['lenient:scope'] : [],
            token: token || 'default-token',
          };
        },
      };

      await expect(strictStrategy.verify('short')).rejects.toThrow(
        'Token too short',
      );

      const lenientResult = await lenientStrategy.verify('short');
      expect(lenientResult.clientId).toBe('lenient-client');
    });
  });
});
