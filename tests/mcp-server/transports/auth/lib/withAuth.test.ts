/**
 * @fileoverview Test suite for auth wrapper utilities
 * @module tests/mcp-server/transports/auth/lib/withAuth.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  withToolAuth,
  withResourceAuth,
} from '@/mcp-server/transports/auth/lib/withAuth.js';
import { authContext } from '@/mcp-server/transports/auth/lib/authContext.js';
import type { AuthInfo } from '@/mcp-server/transports/auth/lib/authTypes.js';
import type { RequestContext } from '@/utils/index.js';
import type { SdkContext } from '@/mcp-server/tools/utils/index.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

describe('withAuth Utilities', () => {
  let mockRequestContext: RequestContext;
  let mockSdkContext: SdkContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequestContext = {
      requestId: 'test-request-id',
      timestamp: new Date().toISOString(),
      operation: 'test-operation',
    } as RequestContext;

    mockSdkContext = {
      elicitInput: vi.fn(),
      createMessage: vi.fn(),
      createResource: vi.fn(),
    } as unknown as SdkContext;
  });

  describe('withToolAuth', () => {
    it('should wrap a tool logic function with auth check', () => {
      const mockLogic = vi.fn(async (input: string) => `processed: ${input}`);
      const wrappedLogic = withToolAuth(['tool:read'], mockLogic);

      expect(wrappedLogic).toBeDefined();
      expect(typeof wrappedLogic).toBe('function');
    });

    it('should allow execution when auth context is not set (auth disabled)', async () => {
      const mockLogic = vi.fn(async (input: string) => `processed: ${input}`);
      const wrappedLogic = withToolAuth(['tool:read'], mockLogic);

      const result = await wrappedLogic(
        'test-input',
        mockRequestContext,
        mockSdkContext,
      );

      expect(result).toBe('processed: test-input');
      expect(mockLogic).toHaveBeenCalledWith(
        'test-input',
        mockRequestContext,
        mockSdkContext,
      );
    });

    it('should allow execution when user has required scope', async () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client',
        scopes: ['tool:read', 'tool:write'],
        token: 'test-token',
      };

      const mockLogic = vi.fn(async (input: string) => `processed: ${input}`);
      const wrappedLogic = withToolAuth(['tool:read'], mockLogic);

      await authContext.run({ authInfo }, async () => {
        const result = await wrappedLogic(
          'authorized-input',
          mockRequestContext,
          mockSdkContext,
        );

        expect(result).toBe('processed: authorized-input');
        expect(mockLogic).toHaveBeenCalledWith(
          'authorized-input',
          mockRequestContext,
          mockSdkContext,
        );
      });
    });

    it('should throw McpError when user lacks required scope', async () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client',
        scopes: ['tool:read'],
        token: 'test-token',
      };

      const mockLogic = vi.fn(async (input: string) => `processed: ${input}`);
      const wrappedLogic = withToolAuth(['tool:write'], mockLogic);

      await authContext.run({ authInfo }, async () => {
        await expect(
          wrappedLogic(
            'unauthorized-input',
            mockRequestContext,
            mockSdkContext,
          ),
        ).rejects.toThrow(McpError);

        await expect(
          wrappedLogic(
            'unauthorized-input',
            mockRequestContext,
            mockSdkContext,
          ),
        ).rejects.toThrow('Insufficient permissions');

        expect(mockLogic).not.toHaveBeenCalled();
      });
    });

    it('should throw McpError with Forbidden code', async () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client',
        scopes: ['tool:read'],
        token: 'test-token',
      };

      const mockLogic = vi.fn();
      const wrappedLogic = withToolAuth(['tool:admin'], mockLogic);

      await authContext.run({ authInfo }, async () => {
        try {
          await wrappedLogic('test', mockRequestContext, mockSdkContext);
        } catch (error) {
          expect(error).toBeInstanceOf(McpError);
          expect((error as McpError).code).toBe(JsonRpcErrorCode.Forbidden);
        }
      });
    });

    it('should support synchronous logic functions', async () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client',
        scopes: ['tool:read'],
        token: 'test-token',
      };

      const mockLogic = vi.fn((input: string) => `sync: ${input}`);
      const wrappedLogic = withToolAuth(['tool:read'], mockLogic);

      await authContext.run({ authInfo }, async () => {
        const result = await wrappedLogic(
          'sync-input',
          mockRequestContext,
          mockSdkContext,
        );

        expect(result).toBe('sync: sync-input');
        expect(mockLogic).toHaveBeenCalled();
      });
    });
  });

  describe('withResourceAuth', () => {
    it('should wrap a resource logic function with auth check', () => {
      const mockLogic = vi.fn(
        async (_uri: URL, _params: unknown) => 'resource',
      );
      const wrappedLogic = withResourceAuth(['resource:read'], mockLogic);

      expect(wrappedLogic).toBeDefined();
      expect(typeof wrappedLogic).toBe('function');
    });

    it('should allow execution when auth context is not set (auth disabled)', async () => {
      const mockLogic = vi.fn(
        async (_uri: URL, _params: unknown) => 'resource-data',
      );
      const wrappedLogic = withResourceAuth(['resource:read'], mockLogic);

      const testUri = new URL('resource://test');
      const result = await wrappedLogic(testUri, {}, mockRequestContext);

      expect(result).toBe('resource-data');
      expect(mockLogic).toHaveBeenCalledWith(testUri, {}, mockRequestContext);
    });

    it('should allow execution when user has required scope', async () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client',
        scopes: ['resource:read', 'resource:list'],
        token: 'test-token',
      };

      const mockLogic = vi.fn(
        async (_uri: URL, _params: unknown) => 'authorized-resource',
      );
      const wrappedLogic = withResourceAuth(['resource:read'], mockLogic);

      await authContext.run({ authInfo }, async () => {
        const testUri = new URL('resource://authorized');
        const result = await wrappedLogic(
          testUri,
          { filter: 'active' },
          mockRequestContext,
        );

        expect(result).toBe('authorized-resource');
        expect(mockLogic).toHaveBeenCalled();
      });
    });

    it('should throw McpError when user lacks required scope', async () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client',
        scopes: ['resource:read'],
        token: 'test-token',
      };

      const mockLogic = vi.fn(async (_uri: URL, _params: unknown) => 'data');
      const wrappedLogic = withResourceAuth(['resource:write'], mockLogic);

      await authContext.run({ authInfo }, async () => {
        const testUri = new URL('resource://unauthorized');
        await expect(
          wrappedLogic(testUri, {}, mockRequestContext),
        ).rejects.toThrow(McpError);

        expect(mockLogic).not.toHaveBeenCalled();
      });
    });

    it('should throw McpError with Forbidden code', async () => {
      const authInfo: AuthInfo = {
        clientId: 'test-client',
        scopes: ['resource:read'],
        token: 'test-token',
      };

      const mockLogic = vi.fn();
      const wrappedLogic = withResourceAuth(['resource:admin'], mockLogic);

      await authContext.run({ authInfo }, async () => {
        try {
          await wrappedLogic(
            new URL('resource://test'),
            {},
            mockRequestContext,
          );
        } catch (error) {
          expect(error).toBeInstanceOf(McpError);
          expect((error as McpError).code).toBe(JsonRpcErrorCode.Forbidden);
        }
      });
    });
  });
});
