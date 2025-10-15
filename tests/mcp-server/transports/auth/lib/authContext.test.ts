/**
 * @fileoverview Test suite for authentication context utilities
 * @module tests/mcp-server/transports/auth/lib/authContext.test
 */

import { describe, expect, it } from 'vitest';
import { authContext } from '@/mcp-server/transports/auth/lib/authContext.js';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';

describe('Auth Context', () => {
  describe('authContext AsyncLocalStorage', () => {
    it('should be an instance of AsyncLocalStorage', () => {
      expect(authContext).toBeDefined();
      expect(typeof authContext.run).toBe('function');
      expect(typeof authContext.getStore).toBe('function');
    });

    it('should store and retrieve auth info within context', async () => {
      const testAuthInfo: AuthInfo = {
        clientId: 'test-client',
        scopes: ['test:read', 'test:write'],
        token: 'test-token',
      };

      await authContext.run({ authInfo: testAuthInfo }, () => {
        const store = authContext.getStore();
        expect(store).toBeDefined();
        expect(store?.authInfo).toEqual(testAuthInfo);
        expect(store?.authInfo.clientId).toBe('test-client');
        expect(store?.authInfo.scopes).toEqual(['test:read', 'test:write']);
      });
    });

    it('should return undefined when accessed outside of context', () => {
      const store = authContext.getStore();
      expect(store).toBeUndefined();
    });

    it('should isolate contexts between concurrent runs', async () => {
      const authInfo1: AuthInfo = {
        clientId: 'client-1',
        scopes: ['scope-1'],
        token: 'token-1',
      };

      const authInfo2: AuthInfo = {
        clientId: 'client-2',
        scopes: ['scope-2'],
        token: 'token-2',
      };

      const promises = [
        authContext.run({ authInfo: authInfo1 }, async () => {
          // Simulate async work
          await new Promise((resolve) => setTimeout(resolve, 10));
          const store = authContext.getStore();
          expect(store?.authInfo.clientId).toBe('client-1');
          return store?.authInfo;
        }),
        authContext.run({ authInfo: authInfo2 }, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          const store = authContext.getStore();
          expect(store?.authInfo.clientId).toBe('client-2');
          return store?.authInfo;
        }),
      ];

      const results = await Promise.all(promises);
      expect(results[0]?.clientId).toBe('client-1');
      expect(results[1]?.clientId).toBe('client-2');
    });

    it('should propagate context through nested async calls', async () => {
      const testAuthInfo: AuthInfo = {
        clientId: 'nested-client',
        scopes: ['nested:scope'],
        token: 'nested-token',
      };

      await authContext.run({ authInfo: testAuthInfo }, async () => {
        const outerStore = authContext.getStore();
        expect(outerStore?.authInfo.clientId).toBe('nested-client');

        await (async () => {
          const innerStore = authContext.getStore();
          expect(innerStore?.authInfo.clientId).toBe('nested-client');
          expect(innerStore?.authInfo).toEqual(testAuthInfo);
        })();
      });
    });

    it('should support optional tenantId in auth info', async () => {
      const authInfoWithTenant: AuthInfo = {
        clientId: 'tenant-client',
        scopes: ['tenant:read'],
        token: 'tenant-token',
        tenantId: 'tenant-123',
      };

      await authContext.run({ authInfo: authInfoWithTenant }, () => {
        const store = authContext.getStore();
        expect(store?.authInfo.tenantId).toBe('tenant-123');
      });
    });

    it('should support optional subject in auth info', async () => {
      const authInfoWithSubject: AuthInfo = {
        clientId: 'subject-client',
        scopes: ['subject:read'],
        token: 'subject-token',
        subject: 'user@example.com',
      };

      await authContext.run({ authInfo: authInfoWithSubject }, () => {
        const store = authContext.getStore();
        expect(store?.authInfo.subject).toBe('user@example.com');
      });
    });

    it('should allow synchronous callback execution', () => {
      const testAuthInfo: AuthInfo = {
        clientId: 'sync-client',
        scopes: ['sync:scope'],
        token: 'sync-token',
      };

      const result = authContext.run({ authInfo: testAuthInfo }, () => {
        const store = authContext.getStore();
        return store?.authInfo.clientId;
      });

      expect(result).toBe('sync-client');
    });

    it('should handle empty scopes array', async () => {
      const authInfoNoScopes: AuthInfo = {
        clientId: 'no-scopes-client',
        scopes: [],
        token: 'no-scopes-token',
      };

      await authContext.run({ authInfo: authInfoNoScopes }, () => {
        const store = authContext.getStore();
        expect(store?.authInfo.scopes).toEqual([]);
        expect(store?.authInfo.scopes).toHaveLength(0);
      });
    });

    it('should handle multiple scopes', async () => {
      const authInfoMultiScopes: AuthInfo = {
        clientId: 'multi-client',
        scopes: ['tool:read', 'tool:write', 'resource:list', 'resource:read'],
        token: 'multi-token',
      };

      await authContext.run({ authInfo: authInfoMultiScopes }, () => {
        const store = authContext.getStore();
        expect(store?.authInfo.scopes).toHaveLength(4);
        expect(store?.authInfo.scopes).toContain('tool:read');
        expect(store?.authInfo.scopes).toContain('resource:list');
      });
    });

    it('should preserve auth info through promise chains', async () => {
      const testAuthInfo: AuthInfo = {
        clientId: 'promise-chain-client',
        scopes: ['chain:scope'],
        token: 'chain-token',
      };

      await authContext.run({ authInfo: testAuthInfo }, async () => {
        const result = await Promise.resolve()
          .then(() => authContext.getStore()?.authInfo.clientId)
          .then((clientId) => {
            expect(clientId).toBe('promise-chain-client');
            return authContext.getStore()?.authInfo.scopes;
          })
          .then((scopes) => {
            expect(scopes).toEqual(['chain:scope']);
            return authContext.getStore()?.authInfo.token;
          });

        expect(result).toBe('chain-token');
      });
    });

    it('should handle errors within context', async () => {
      const testAuthInfo: AuthInfo = {
        clientId: 'error-client',
        scopes: ['error:scope'],
        token: 'error-token',
      };

      await expect(
        authContext.run({ authInfo: testAuthInfo }, async () => {
          const store = authContext.getStore();
          expect(store?.authInfo.clientId).toBe('error-client');
          throw new Error('Test error within context');
        }),
      ).rejects.toThrow('Test error within context');

      // Context should be cleaned up after error
      const storeAfterError = authContext.getStore();
      expect(storeAfterError).toBeUndefined();
    });

    it('should support nested context runs with different auth info', async () => {
      const outerAuth: AuthInfo = {
        clientId: 'outer-client',
        scopes: ['outer:scope'],
        token: 'outer-token',
      };

      const innerAuth: AuthInfo = {
        clientId: 'inner-client',
        scopes: ['inner:scope'],
        token: 'inner-token',
      };

      await authContext.run({ authInfo: outerAuth }, async () => {
        const outerStore = authContext.getStore();
        expect(outerStore?.authInfo.clientId).toBe('outer-client');

        await authContext.run({ authInfo: innerAuth }, async () => {
          const innerStore = authContext.getStore();
          expect(innerStore?.authInfo.clientId).toBe('inner-client');
        });

        // After inner context completes, outer context should be restored
        const restoredStore = authContext.getStore();
        expect(restoredStore?.authInfo.clientId).toBe('outer-client');
      });
    });

    it('should work with setTimeout inside context', async () => {
      const testAuthInfo: AuthInfo = {
        clientId: 'timeout-client',
        scopes: ['timeout:scope'],
        token: 'timeout-token',
      };

      await authContext.run({ authInfo: testAuthInfo }, async () => {
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            const store = authContext.getStore();
            expect(store?.authInfo.clientId).toBe('timeout-client');
            resolve();
          }, 10);
        });
      });
    });

    it('should support usage in middleware pattern', async () => {
      const testAuthInfo: AuthInfo = {
        clientId: 'middleware-client',
        scopes: ['middleware:read', 'middleware:write'],
        token: 'middleware-token',
      };

      // Simulate middleware setting context
      const middlewareResult = await authContext.run(
        { authInfo: testAuthInfo },
        async () => {
          // Simulate handler accessing context
          const handler = () => {
            const store = authContext.getStore();
            return {
              authenticated: !!store,
              clientId: store?.authInfo.clientId,
              hasReadScope: store?.authInfo.scopes.includes('middleware:read'),
            };
          };

          return handler();
        },
      );

      expect(middlewareResult.authenticated).toBe(true);
      expect(middlewareResult.clientId).toBe('middleware-client');
      expect(middlewareResult.hasReadScope).toBe(true);
    });

    it('should support scope checking helper', async () => {
      const testAuthInfo: AuthInfo = {
        clientId: 'scope-check-client',
        scopes: ['tool:read', 'tool:write', 'resource:list'],
        token: 'scope-check-token',
      };

      await authContext.run({ authInfo: testAuthInfo }, () => {
        const hasScope = (requiredScope: string): boolean => {
          const store = authContext.getStore();
          return store?.authInfo.scopes.includes(requiredScope) ?? false;
        };

        expect(hasScope('tool:read')).toBe(true);
        expect(hasScope('tool:write')).toBe(true);
        expect(hasScope('resource:list')).toBe(true);
        expect(hasScope('tool:delete')).toBe(false);
      });
    });

    it('should support multiple scope checking', async () => {
      const testAuthInfo: AuthInfo = {
        clientId: 'multi-scope-check',
        scopes: ['read', 'write', 'delete'],
        token: 'multi-scope-token',
      };

      await authContext.run({ authInfo: testAuthInfo }, () => {
        const hasAllScopes = (requiredScopes: string[]): boolean => {
          const store = authContext.getStore();
          if (!store) return false;
          return requiredScopes.every((scope) =>
            store.authInfo.scopes.includes(scope),
          );
        };

        expect(hasAllScopes(['read', 'write'])).toBe(true);
        expect(hasAllScopes(['read', 'write', 'delete'])).toBe(true);
        expect(hasAllScopes(['read', 'execute'])).toBe(false);
      });
    });
  });
});
