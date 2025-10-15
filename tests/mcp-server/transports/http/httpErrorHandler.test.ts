/**
 * @fileoverview Test suite for HTTP error handler
 * @module tests/mcp-server/transports/http/httpErrorHandler.test
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Context } from 'hono';
import { httpErrorHandler } from '@/mcp-server/transports/http/httpErrorHandler.js';
import type { HonoNodeBindings } from '@/mcp-server/transports/http/httpTypes.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

// Mock config
vi.mock('@/config/index.js', () => ({
  config: {
    oauthIssuerUrl: '',
    mcpServerName: 'test-server',
  },
}));

describe('HTTP Error Handler', () => {
  let mockContext: Partial<Context<{ Bindings: HonoNodeBindings }>>;
  let statusValue: number;
  let headers: Map<string, string>;
  let jsonResponseData: unknown;

  beforeEach(() => {
    statusValue = 200;
    headers = new Map();
    jsonResponseData = null;

    mockContext = {
      req: {
        path: '/test',
        method: 'POST',
        url: 'http://localhost:3000/test',
        header: vi.fn((name: string) => headers.get(name.toLowerCase())),
        raw: {
          bodyUsed: false,
        } as Request,
        json: vi.fn(async () => ({ id: 'test-request-123' })),
      } as any,
      status: vi.fn((code: number) => {
        statusValue = code;
      }),
      header: vi.fn((name: string, value: string | undefined) => {
        if (value) headers.set(name.toLowerCase(), value);
      }) as any,
      json: vi.fn((data: unknown) => {
        jsonResponseData = data;
        return new Response(JSON.stringify(data), {
          status: statusValue,
          headers: { 'content-type': 'application/json' },
        });
      }) as any,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic error handling', () => {
    test('should handle generic Error and return 500', async () => {
      const error = new Error('Something went wrong');

      const response = await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(statusValue).toBe(500);
      expect(jsonResponseData).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: expect.stringContaining('Something went wrong'),
        },
        id: 'test-request-123',
      });
      expect(response).toBeInstanceOf(Response);
    });

    test('should extract request ID from body', async () => {
      const error = new Error('Test error');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(mockContext.req?.json).toHaveBeenCalled();
      expect((jsonResponseData as any).id).toBe('test-request-123');
    });

    test('should handle numeric request ID', async () => {
      mockContext.req!.json = vi.fn(async () => ({ id: 42 })) as any;
      const error = new Error('Test error');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect((jsonResponseData as any).id).toBe(42);
    });

    test('should use null id when body has no id', async () => {
      mockContext.req!.json = vi.fn(async () => ({ data: 'test' })) as any;
      const error = new Error('Test error');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect((jsonResponseData as any).id).toBeNull();
    });

    test('should use null id when body parsing fails', async () => {
      mockContext.req!.json = vi.fn(async () => {
        throw new Error('Invalid JSON');
      });
      const error = new Error('Test error');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect((jsonResponseData as any).id).toBeNull();
    });

    test('should use null id when body already consumed', async () => {
      mockContext.req!.raw = {
        bodyUsed: true,
      } as Request;
      const error = new Error('Test error');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(mockContext.req?.json).not.toHaveBeenCalled();
      expect((jsonResponseData as any).id).toBeNull();
    });
  });

  describe('McpError status code mapping', () => {
    test('should map NotFound to 404', async () => {
      const error = new McpError(JsonRpcErrorCode.NotFound, 'Not found');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(statusValue).toBe(404);
      expect((jsonResponseData as any).error.code).toBe(
        JsonRpcErrorCode.NotFound,
      );
    });

    test('should map Unauthorized to 401', async () => {
      const error = new McpError(JsonRpcErrorCode.Unauthorized, 'Unauthorized');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(statusValue).toBe(401);
      expect((jsonResponseData as any).error.code).toBe(
        JsonRpcErrorCode.Unauthorized,
      );
    });

    test('should map Forbidden to 403', async () => {
      const error = new McpError(JsonRpcErrorCode.Forbidden, 'Forbidden');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(statusValue).toBe(403);
      expect((jsonResponseData as any).error.code).toBe(
        JsonRpcErrorCode.Forbidden,
      );
    });

    test('should map ValidationError to 400', async () => {
      const error = new McpError(
        JsonRpcErrorCode.ValidationError,
        'Validation failed',
      );

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(statusValue).toBe(400);
      expect((jsonResponseData as any).error.code).toBe(
        JsonRpcErrorCode.ValidationError,
      );
    });

    test('should map InvalidRequest to 400', async () => {
      const error = new McpError(
        JsonRpcErrorCode.InvalidRequest,
        'Invalid request',
      );

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(statusValue).toBe(400);
      expect((jsonResponseData as any).error.code).toBe(
        JsonRpcErrorCode.InvalidRequest,
      );
    });

    test('should map Conflict to 409', async () => {
      const error = new McpError(JsonRpcErrorCode.Conflict, 'Conflict');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(statusValue).toBe(409);
      expect((jsonResponseData as any).error.code).toBe(
        JsonRpcErrorCode.Conflict,
      );
    });

    test('should map RateLimited to 429', async () => {
      const error = new McpError(JsonRpcErrorCode.RateLimited, 'Rate limited');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(statusValue).toBe(429);
      expect((jsonResponseData as any).error.code).toBe(
        JsonRpcErrorCode.RateLimited,
      );
    });

    test('should default to 500 for unknown error codes', async () => {
      const error = new McpError(-99999 as JsonRpcErrorCode, 'Unknown error');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect(statusValue).toBe(500);
      expect((jsonResponseData as any).error.code).toBe(-99999);
    });
  });

  describe('WWW-Authenticate header for 401', () => {
    test('should add WWW-Authenticate header when OAuth configured', async () => {
      // Mock config with OAuth
      const configModule = await import('@/config/index.js');
      vi.spyOn(configModule.config, 'oauthIssuerUrl', 'get').mockReturnValue(
        'https://auth.example.com',
      );

      const error = new McpError(JsonRpcErrorCode.Unauthorized, 'Unauthorized');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      const wwwAuthHeader = headers.get('www-authenticate');
      expect(wwwAuthHeader).toBeDefined();
      expect(wwwAuthHeader).toContain('Bearer realm="test-server"');
      expect(wwwAuthHeader).toContain('resource_metadata=');
      expect(wwwAuthHeader).toContain('.well-known/oauth-protected-resource');
    });

    test('should not add WWW-Authenticate header when OAuth not configured', async () => {
      // Mock config without OAuth
      const configModule = await import('@/config/index.js');
      vi.spyOn(configModule.config, 'oauthIssuerUrl', 'get').mockReturnValue(
        '',
      );

      const error = new McpError(JsonRpcErrorCode.Unauthorized, 'Unauthorized');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      const wwwAuthHeader = headers.get('www-authenticate');
      expect(wwwAuthHeader).toBeUndefined();
    });

    test('should not add WWW-Authenticate header for non-401 errors', async () => {
      const configModule = await import('@/config/index.js');
      vi.spyOn(configModule.config, 'oauthIssuerUrl', 'get').mockReturnValue(
        'https://auth.example.com',
      );

      const error = new McpError(JsonRpcErrorCode.Forbidden, 'Forbidden');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      const wwwAuthHeader = headers.get('www-authenticate');
      expect(wwwAuthHeader).toBeUndefined();
    });
  });

  describe('JSON-RPC response format', () => {
    test('should include jsonrpc version 2.0', async () => {
      const error = new Error('Test error');

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect((jsonResponseData as any).jsonrpc).toBe('2.0');
    });

    test('should include error object with code and message', async () => {
      const error = new McpError(
        JsonRpcErrorCode.InvalidParams,
        'Invalid params',
      );

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect((jsonResponseData as any).error).toMatchObject({
        code: JsonRpcErrorCode.InvalidParams,
        message: 'Invalid params',
      });
    });

    test('should preserve error message from McpError', async () => {
      const error = new McpError(
        JsonRpcErrorCode.MethodNotFound,
        'Custom error message',
      );

      await httpErrorHandler(
        error,
        mockContext as Context<{ Bindings: HonoNodeBindings }>,
      );

      expect((jsonResponseData as any).error.message).toBe(
        'Custom error message',
      );
    });
  });
});
