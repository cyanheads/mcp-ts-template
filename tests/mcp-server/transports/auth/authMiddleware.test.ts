/**
 * @fileoverview Tests for authentication middleware.
 * @module tests/mcp-server/transports/auth/authMiddleware.test.ts
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Context, Next } from 'hono';
import { createAuthMiddleware } from '@/mcp-server/transports/auth/authMiddleware.js';
import type { AuthStrategy } from '@/mcp-server/transports/auth/strategies/authStrategy.js';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

describe('Auth Middleware', () => {
  let mockStrategy: AuthStrategy;
  let mockContext: Context;
  let mockNext: Next;

  beforeEach(() => {
    // Create mock authentication strategy
    mockStrategy = {
      verify: vi.fn(
        async (token: string): Promise<AuthInfo> => ({
          token,
          clientId: 'test-client',
          subject: 'test-user',
          scopes: ['read', 'write'],
          tenantId: 'test-tenant',
        }),
      ),
    };

    // Create mock Hono context
    mockContext = {
      req: {
        header: vi.fn((name?: string) => {
          if (name === 'Authorization') {
            return 'Bearer valid-token';
          }
          if (name === undefined) {
            return { Authorization: 'Bearer valid-token' };
          }
          return undefined;
        }) as any,
        method: 'POST',
        path: '/mcp',
      },
    } as unknown as Context;

    // Create mock next function
    mockNext = vi.fn(async () => {});
  });

  describe('createAuthMiddleware', () => {
    it('should create a valid middleware function', () => {
      const middleware = createAuthMiddleware(mockStrategy);

      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should successfully authenticate with valid Bearer token', async () => {
      const middleware = createAuthMiddleware(mockStrategy);

      await middleware(mockContext, mockNext);

      expect(mockStrategy.verify).toHaveBeenCalledTimes(1);
      expect(mockStrategy.verify).toHaveBeenCalledWith('valid-token');
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should extract token from Authorization header', async () => {
      const middleware = createAuthMiddleware(mockStrategy);

      await middleware(mockContext, mockNext);

      expect(mockContext.req.header).toHaveBeenCalledWith('Authorization');
      expect(mockStrategy.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should call next middleware after successful authentication', async () => {
      const middleware = createAuthMiddleware(mockStrategy);

      await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authorization Header Validation', () => {
    it('should reject missing Authorization header', async () => {
      mockContext.req.header = vi.fn((name?: string) => {
        if (name === undefined) {
          return {};
        }
        return undefined;
      }) as any;

      const middleware = createAuthMiddleware(mockStrategy);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(McpError);
      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Missing or invalid Authorization header',
      );

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject Authorization header without Bearer scheme', async () => {
      mockContext.req.header = vi.fn((name?: string) => {
        if (name === 'Authorization') {
          return 'Basic dGVzdDp0ZXN0';
        }
        if (name === undefined) {
          return { Authorization: 'Basic dGVzdDp0ZXN0' };
        }
        return undefined;
      }) as any;

      const middleware = createAuthMiddleware(mockStrategy);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(McpError);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject empty Bearer token', async () => {
      mockContext.req.header = vi.fn((name?: string) => {
        if (name === 'Authorization') {
          return 'Bearer ';
        }
        if (name === undefined) {
          return { Authorization: 'Bearer ' };
        }
        return undefined;
      }) as any;

      const middleware = createAuthMiddleware(mockStrategy);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(McpError);
      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'token is missing',
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed Authorization header', async () => {
      mockContext.req.header = vi.fn((name?: string) => {
        if (name === 'Authorization') {
          return 'InvalidFormat';
        }
        if (name === undefined) {
          return { Authorization: 'InvalidFormat' };
        }
        return undefined;
      }) as any;

      const middleware = createAuthMiddleware(mockStrategy);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(McpError);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Token Verification', () => {
    it('should pass token to strategy verify method', async () => {
      const middleware = createAuthMiddleware(mockStrategy);

      await middleware(mockContext, mockNext);

      expect(mockStrategy.verify).toHaveBeenCalledWith('valid-token');
    });

    it('should handle verification success', async () => {
      mockStrategy.verify = vi.fn(async (token) => ({
        token,
        clientId: 'client-123',
        subject: 'user-456',
        scopes: ['admin'],
        tenantId: 'tenant-789',
      }));

      const middleware = createAuthMiddleware(mockStrategy);

      await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle verification failure', async () => {
      mockStrategy.verify = vi.fn(async () => {
        throw new McpError(JsonRpcErrorCode.Unauthorized, 'Invalid token');
      });

      const middleware = createAuthMiddleware(mockStrategy);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Invalid token',
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle expired token', async () => {
      mockStrategy.verify = vi.fn(async () => {
        throw new McpError(JsonRpcErrorCode.Unauthorized, 'Token has expired');
      });

      const middleware = createAuthMiddleware(mockStrategy);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Token has expired',
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('AuthInfo Propagation', () => {
    it('should propagate auth info with all fields', async () => {
      const authInfo: AuthInfo = {
        token: 'test-token',
        clientId: 'test-client',
        subject: 'test-user',
        scopes: ['read', 'write', 'admin'],
        tenantId: 'tenant-123',
      };

      mockStrategy.verify = vi.fn(async () => authInfo);

      const middleware = createAuthMiddleware(mockStrategy);

      await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle auth info without optional tenantId', async () => {
      const authInfo: AuthInfo = {
        token: 'test-token',
        clientId: 'test-client',
        subject: 'test-user',
        scopes: ['read'],
      };

      mockStrategy.verify = vi.fn(async () => authInfo);

      const middleware = createAuthMiddleware(mockStrategy);

      await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle auth info with empty scopes', async () => {
      const authInfo: AuthInfo = {
        token: 'test-token',
        clientId: 'test-client',
        subject: 'test-user',
        scopes: [],
      };

      mockStrategy.verify = vi.fn(async () => authInfo);

      const middleware = createAuthMiddleware(mockStrategy);

      await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should propagate McpError from strategy', async () => {
      const customError = new McpError(
        JsonRpcErrorCode.Unauthorized,
        'Custom auth error',
      );

      mockStrategy.verify = vi.fn(async () => {
        throw customError;
      });

      const middleware = createAuthMiddleware(mockStrategy);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow(
        'Custom auth error',
      );
    });

    it('should wrap non-McpError exceptions', async () => {
      mockStrategy.verify = vi.fn(async () => {
        throw new Error('Unexpected error');
      });

      const middleware = createAuthMiddleware(mockStrategy);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow();
    });

    it('should not call next on authentication failure', async () => {
      mockStrategy.verify = vi.fn(async () => {
        throw new McpError(JsonRpcErrorCode.Unauthorized, 'Auth failed');
      });

      const middleware = createAuthMiddleware(mockStrategy);

      try {
        await middleware(mockContext, mockNext);
      } catch (error) {
        // Expected
      }

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Request Context', () => {
    it('should create request context with method and path', async () => {
      // Create context with specific method and path
      const customMockContext = {
        req: {
          header: vi.fn((name?: string) => {
            if (name === 'Authorization') {
              return 'Bearer valid-token';
            }
            if (name === undefined) {
              return { Authorization: 'Bearer valid-token' };
            }
            return undefined;
          }) as any,
          method: 'GET',
          path: '/api/test',
        },
      } as unknown as Context;

      const middleware = createAuthMiddleware(mockStrategy);

      await middleware(customMockContext, mockNext);

      // Middleware should have processed successfully
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        const customContext = {
          req: {
            header: vi.fn((name?: string) => {
              if (name === 'Authorization') {
                return 'Bearer valid-token';
              }
              if (name === undefined) {
                return { Authorization: 'Bearer valid-token' };
              }
              return undefined;
            }) as any,
            method,
            path: '/mcp',
          },
        } as unknown as Context;
        const customNext = vi.fn(async () => {});

        const middleware = createAuthMiddleware(mockStrategy);
        await middleware(customContext, customNext);

        expect(customNext).toHaveBeenCalled();
      }
    });
  });
});
