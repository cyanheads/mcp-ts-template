/**
 * @fileoverview Tests for createResourceHandler — the production handler factory
 * for all `resource()` builder definitions. Verifies context creation with uri,
 * param validation, error re-throwing, response formatting, and capability wrapping.
 * @module tests/mcp-server/resources/utils/resourceHandlerFactory.test
 */

import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';

// ---------------------------------------------------------------------------
// Module mocks — vi.hoisted ensures variables are available during vi.mock hoisting
// ---------------------------------------------------------------------------

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    notice: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    crit: vi.fn(),
    emerg: vi.fn(),
    child: vi.fn(),
  },
}));

vi.mock('@/config/index.js', () => ({
  config: {
    environment: 'testing',
    mcpServerVersion: '1.0.0-test',
    mcpAuthMode: 'none',
    openTelemetry: { serviceName: 'test', serviceVersion: '0.0.0' },
  },
}));

vi.mock('@/utils/internal/logger.js', () => ({
  logger: mockLogger,
  Logger: { getInstance: () => mockLogger },
}));

vi.mock('@/utils/internal/requestContext.js', () => ({
  requestContextService: {
    createRequestContext: vi.fn((opts: any) => ({
      requestId: 'test-req-id',
      timestamp: new Date().toISOString(),
      operation: opts?.operation ?? 'test',
      ...(opts?.additionalContext ?? {}),
    })),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import type { AnyResourceDefinition } from '@/mcp-server/resources/utils/resourceDefinition.js';
import { resource } from '@/mcp-server/resources/utils/resourceDefinition.js';
import {
  createResourceHandler,
  type ResourceHandlerFactoryServices,
} from '@/mcp-server/resources/utils/resourceHandlerFactory.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type MockSdkContext = RequestHandlerExtra<ServerRequest, ServerNotification>;

function createMockSdkContext(overrides: Record<string, unknown> = {}): MockSdkContext {
  return {
    signal: new AbortController().signal,
    requestId: 'sdk-request-id',
    sendNotification: () => Promise.resolve(),
    sendRequest: () => Promise.resolve({}) as never,
    ...overrides,
  } as MockSdkContext;
}

const mockStorage = {
  get: vi.fn(async () => null),
  set: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
  list: vi.fn(async () => ({ keys: [] })),
  getMany: vi.fn(async () => new Map()),
};

const services: ResourceHandlerFactoryServices = {
  logger: mockLogger as any,
  storage: mockStorage as any,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createResourceHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Basic execution
  // -----------------------------------------------------------------------

  describe('Basic execution', () => {
    it('should call handler with validated params and Context, return formatted response', async () => {
      let capturedCtx: any;
      let capturedParams: any;

      const def = resource('items://{itemId}/data', {
        description: 'Get item data.',
        params: z.object({ itemId: z.string().describe('Item ID') }),
        async handler(params, ctx) {
          capturedParams = params;
          capturedCtx = ctx;
          return { id: params.itemId, status: 'active' };
        },
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);
      const uri = new URL('items://item-42/data');
      const result = await handler(uri, { itemId: 'item-42' }, createMockSdkContext());

      // Response
      expect(result.contents).toHaveLength(1);
      const content = result.contents[0]!;
      expect(content.uri).toBe('items://item-42/data');
      expect(content.mimeType).toBe('application/json');
      const parsed = JSON.parse((content as { text: string }).text);
      expect(parsed).toEqual({ id: 'item-42', status: 'active' });

      // Context
      expect(capturedCtx.requestId).toBe('test-req-id');
      expect(capturedCtx.uri).toBe(uri);
      expect(typeof capturedCtx.log.info).toBe('function');

      // Params
      expect(capturedParams).toEqual({ itemId: 'item-42' });
    });

    it('should use custom format function when provided', async () => {
      const def = resource('custom://{id}', {
        description: 'Custom format.',
        params: z.object({ id: z.string().describe('ID') }),
        handler: (params) => ({ value: params.id }),
        format: (result, meta) => [
          { uri: meta.uri.href, text: `Custom: ${(result as any).value}`, mimeType: meta.mimeType },
        ],
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);
      const result = await handler(new URL('custom://abc'), { id: 'abc' }, createMockSdkContext());

      expect((result.contents[0] as { text: string }).text).toBe('Custom: abc');
    });

    it('should default mimeType to application/json', async () => {
      const def = resource('plain://{id}', {
        description: 'No mimeType specified.',
        handler: () => ({ ok: true }),
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);
      const result = await handler(new URL('plain://x'), { id: 'x' }, createMockSdkContext());

      expect(result.contents[0]!.mimeType).toBe('application/json');
    });

    it('should pass string handler results through without JSON quote wrapping', async () => {
      const html = '<!DOCTYPE html><html><body>Hello</body></html>';
      const def = resource('ui://app/app.html', {
        description: 'Static app UI.',
        mimeType: 'text/html;profile=mcp-app',
        handler: () => html,
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);
      const result = await handler(new URL('ui://app/app.html'), {}, createMockSdkContext());

      expect(result.contents[0]).toMatchObject({
        uri: 'ui://app/app.html',
        mimeType: 'text/html;profile=mcp-app',
        text: html,
      });
    });

    it('should JSON-encode string handler results for JSON mime types', async () => {
      const def = resource('json://app/data', {
        description: 'String JSON payload.',
        mimeType: 'application/json',
        handler: () => 'hello',
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);
      const result = await handler(new URL('json://app/data'), {}, createMockSdkContext());

      expect(result.contents[0]).toMatchObject({
        uri: 'json://app/data',
        mimeType: 'application/json',
        text: '"hello"',
      });
    });
  });

  // -----------------------------------------------------------------------
  // Context construction
  // -----------------------------------------------------------------------

  describe('Context construction', () => {
    it('should set ctx.uri to the resource URI', async () => {
      let capturedUri: URL | undefined;

      const def = resource('scheme://{id}', {
        description: 'URI test.',
        handler: (_params, ctx) => {
          capturedUri = ctx.uri;
          return {};
        },
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);
      const uri = new URL('scheme://test-123');
      await handler(uri, { id: 'test-123' }, createMockSdkContext());

      expect(capturedUri).toBe(uri);
    });

    it('should default tenantId to "default" (no auth)', async () => {
      let capturedTenant: string | undefined;

      const def = resource('t://{id}', {
        description: 'Tenant test.',
        handler: (_params, ctx) => {
          capturedTenant = ctx.tenantId;
          return {};
        },
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);
      await handler(new URL('t://x'), { id: 'x' }, createMockSdkContext());

      expect(capturedTenant).toBe('default');
    });

    it('should wire elicit/sample from SDK context when available', async () => {
      let capturedCtx: any;
      const mockElicit = vi.fn();
      const mockCreate = vi.fn();

      const def = resource('cap://{id}', {
        description: 'Capability test.',
        handler: (_params, ctx) => {
          capturedCtx = ctx;
          return {};
        },
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);
      await handler(
        new URL('cap://x'),
        { id: 'x' },
        createMockSdkContext({ elicitInput: mockElicit, createMessage: mockCreate }),
      );

      expect(capturedCtx.elicit).toBeDefined();
      expect(capturedCtx.sample).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Param validation
  // -----------------------------------------------------------------------

  describe('Param validation', () => {
    it('should reject invalid params by throwing (re-thrown for SDK)', async () => {
      const def = resource('strict://{count}', {
        description: 'Strict params.',
        params: z.object({ count: z.coerce.number().int().positive().describe('cnt') }),
        handler: () => ({ ok: true }),
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);

      await expect(
        handler(new URL('strict://abc'), { count: 'not-a-number' } as any, createMockSdkContext()),
      ).rejects.toThrow();
    });

    it('should pass variables through when no params schema is defined', async () => {
      let capturedParams: any;

      const def = resource('loose://{id}', {
        description: 'No schema.',
        handler: (params) => {
          capturedParams = params;
          return {};
        },
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);
      await handler(new URL('loose://x'), { id: 'x', extra: 'field' }, createMockSdkContext());

      expect(capturedParams).toEqual({ id: 'x', extra: 'field' });
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe('Error handling', () => {
    it('should re-throw errors (unlike tool handler which returns isError)', async () => {
      const def = resource('err://{id}', {
        description: 'Throws.',
        handler: () => {
          throw new Error('resource broke');
        },
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);

      await expect(
        handler(new URL('err://x'), { id: 'x' }, createMockSdkContext()),
      ).rejects.toThrow();
    });

    it('should re-throw McpError with code preserved', async () => {
      const def = resource('mcperr://{id}', {
        description: 'Throws McpError.',
        handler: () => {
          throw new McpError(JsonRpcErrorCode.NotFound, 'Resource not found');
        },
      });

      const handler = createResourceHandler(def as AnyResourceDefinition, services);

      try {
        await handler(new URL('mcperr://x'), { id: 'x' }, createMockSdkContext());
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(McpError);
        expect((err as McpError).code).toBe(JsonRpcErrorCode.NotFound);
      }
    });
  });
});
