/**
 * @fileoverview Test suite for resource handler factory
 * @module tests/mcp-server/resources/utils/resourceHandlerFactory.test
 */

import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerResource } from '@/mcp-server/resources/utils/resourceHandlerFactory.js';
import type { ResourceDefinition } from '@/mcp-server/resources/utils/resourceDefinition.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import type { RequestContext } from '@/utils/index.js';

describe('Resource Handler Factory', () => {
  let mockServer: MockedMcpServer;

  // Mock type for the MCP server
  interface MockedMcpServer {
    resource: Mock;
  }

  beforeEach(() => {
    mockServer = {
      resource: vi.fn(),
    };
  });

  describe('registerResource', () => {
    it('should register a basic resource successfully', async () => {
      const ParamsSchema = z.object({
        message: z.string().describe('Message parameter'),
      });

      const OutputSchema = z.object({
        result: z.string().describe('Result'),
      });

      const mockLogic = vi.fn((_uri: URL, params, _context: RequestContext) => {
        return { result: `Echo: ${params.message}` };
      });

      const resourceDef: ResourceDefinition<
        typeof ParamsSchema,
        typeof OutputSchema
      > = {
        name: 'test-resource',
        description: 'Test resource',
        uriTemplate: 'test://{message}',
        paramsSchema: ParamsSchema,
        outputSchema: OutputSchema,
        logic: mockLogic,
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      expect(mockServer.resource).toHaveBeenCalledTimes(1);
      expect(mockServer.resource).toHaveBeenCalledWith(
        'test-resource',
        expect.anything(), // ResourceTemplate
        expect.objectContaining({
          title: 'test-resource',
          description: 'Test resource',
          mimeType: 'application/json',
        }),
        expect.any(Function),
      );
    });

    it('should register resource with custom title and mimeType', async () => {
      const ParamsSchema = z.object({});
      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'custom-resource',
        title: 'Custom Resource Title',
        description: 'Custom resource',
        uriTemplate: 'custom://',
        paramsSchema: ParamsSchema,
        mimeType: 'text/plain',
        logic: async () => ({ data: 'test' }),
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      expect(mockServer.resource).toHaveBeenCalledWith(
        'custom-resource',
        expect.anything(),
        expect.objectContaining({
          title: 'Custom Resource Title',
          mimeType: 'text/plain',
        }),
        expect.any(Function),
      );
    });

    it('should register resource with examples', async () => {
      const ParamsSchema = z.object({});
      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'example-resource',
        description: 'Resource with examples',
        uriTemplate: 'example://',
        paramsSchema: ParamsSchema,
        examples: [
          { name: 'Example 1', uri: 'example://test1' },
          { name: 'Example 2', uri: 'example://test2' },
        ],
        logic: async () => ({ data: 'test' }),
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      expect(mockServer.resource).toHaveBeenCalledWith(
        'example-resource',
        expect.anything(),
        expect.objectContaining({
          examples: [
            { name: 'Example 1', uri: 'example://test1' },
            { name: 'Example 2', uri: 'example://test2' },
          ],
        }),
        expect.any(Function),
      );
    });

    it('should register resource with list capability', async () => {
      const ParamsSchema = z.object({});
      const mockList = vi.fn(() => ({
        resources: [{ uri: 'test://item1', name: 'Item 1' }],
      }));

      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'list-resource',
        description: 'Resource with list',
        uriTemplate: 'list://',
        paramsSchema: ParamsSchema,
        list: mockList,
        logic: async () => ({ data: 'test' }),
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      expect(mockServer.resource).toHaveBeenCalled();
      // Verify ResourceTemplate was created with list function
      const templateArg = mockServer.resource.mock.calls[0]?.[1];
      expect(templateArg).toBeDefined();
    });
  });

  describe('Resource Handler', () => {
    it('should invoke resource logic with correct parameters', async () => {
      const ParamsSchema = z.object({
        message: z.string(),
      });

      const mockLogic = vi.fn(
        async (_uri: URL, params, _context: RequestContext) => {
          return { result: `Processed: ${params.message}` };
        },
      );

      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'invoke-test',
        description: 'Test invocation',
        uriTemplate: 'test://{message}',
        paramsSchema: ParamsSchema,
        logic: mockLogic,
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      // Extract the handler function
      const handler = mockServer.resource.mock.calls[0]?.[3];
      if (!handler) throw new Error('Handler not registered');

      // Invoke the handler
      const testUri = new URL('test://hello-world');
      const testParams = { message: 'hello-world' };
      const result = await handler(testUri, testParams, {
        sessionId: 'test-session',
      });

      expect(mockLogic).toHaveBeenCalledWith(
        testUri,
        testParams,
        expect.objectContaining({
          requestId: expect.any(String),
        }),
      );

      expect(result).toEqual({
        contents: [
          {
            uri: testUri.href,
            text: JSON.stringify({ result: 'Processed: hello-world' }),
            mimeType: 'application/json',
          },
        ],
      });
    });

    it('should validate parameters using schema', async () => {
      const ParamsSchema = z.object({
        count: z.number().min(1).max(100),
      });

      const mockLogic = vi.fn(async () => ({ result: 'ok' }));

      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'validate-test',
        description: 'Test validation',
        uriTemplate: 'test://',
        paramsSchema: ParamsSchema,
        logic: mockLogic,
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      const handler = mockServer.resource.mock.calls[0]?.[3];
      if (!handler) throw new Error('Handler not registered');

      // Test with invalid parameters
      await expect(
        handler(new URL('test://test'), { count: 'invalid' }, {}),
      ).rejects.toThrow();

      await expect(
        handler(new URL('test://test'), { count: 0 }, {}),
      ).rejects.toThrow();

      await expect(
        handler(new URL('test://test'), { count: 101 }, {}),
      ).rejects.toThrow();

      // Test with valid parameters
      const result = await handler(new URL('test://test'), { count: 50 }, {});
      expect(result).toHaveProperty('contents');
      expect(mockLogic).toHaveBeenCalled();
    });

    it('should use custom response formatter', async () => {
      const ParamsSchema = z.object({});

      const mockLogic = vi.fn(async () => ({ data: 'test-data' }));

      const customFormatter = vi.fn(
        (result: unknown, meta: { uri: URL; mimeType: string }) => {
          return [
            {
              uri: meta.uri.href,
              text: `Custom: ${JSON.stringify(result)}`,
              mimeType: meta.mimeType,
            },
          ];
        },
      );

      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'formatter-test',
        description: 'Test custom formatter',
        uriTemplate: 'test://',
        paramsSchema: ParamsSchema,
        responseFormatter: customFormatter,
        logic: mockLogic,
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      const handler = mockServer.resource.mock.calls[0]?.[3];
      if (!handler) throw new Error('Handler not registered');
      const testUri = new URL('test://test');
      const result = await handler(testUri, {}, {});

      expect(customFormatter).toHaveBeenCalledWith(
        { data: 'test-data' },
        expect.objectContaining({
          uri: testUri,
          mimeType: 'application/json',
        }),
      );

      expect(result.contents[0].text).toBe('Custom: {"data":"test-data"}');
    });

    it('should handle errors from resource logic', async () => {
      const ParamsSchema = z.object({});

      const mockLogic = vi.fn(async () => {
        throw new McpError(JsonRpcErrorCode.InvalidRequest, 'Logic error', {
          detail: 'test',
        });
      });

      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'error-test',
        description: 'Test error handling',
        uriTemplate: 'test://',
        paramsSchema: ParamsSchema,
        logic: mockLogic,
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      const handler = mockServer.resource.mock.calls[0]?.[3];
      if (!handler) throw new Error('Handler not registered');

      await expect(handler(new URL('test://test'), {}, {})).rejects.toThrow(
        McpError,
      );
    });

    it('should validate response format', async () => {
      const ParamsSchema = z.object({});

      const mockLogic = vi.fn(async () => ({ data: 'test' }));

      // Formatter that returns invalid format (not an array)
      const invalidFormatter = vi.fn(() => {
        return { invalid: 'format' } as any;
      });

      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'invalid-format-test',
        description: 'Test invalid response format',
        uriTemplate: 'test://',
        paramsSchema: ParamsSchema,
        responseFormatter: invalidFormatter,
        logic: mockLogic,
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      const handler = mockServer.resource.mock.calls[0]?.[3];
      if (!handler) throw new Error('Handler not registered');

      await expect(handler(new URL('test://test'), {}, {})).rejects.toThrow(
        /must return an array/,
      );
    });

    it('should validate content blocks have required uri property', async () => {
      const ParamsSchema = z.object({});

      const mockLogic = vi.fn(async () => ({ data: 'test' }));

      // Formatter that returns array but without uri property
      const invalidFormatter = vi.fn(() => {
        return [
          { text: 'missing uri property', mimeType: 'text/plain' },
        ] as any;
      });

      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'missing-uri-test',
        description: 'Test missing uri in content',
        uriTemplate: 'test://',
        paramsSchema: ParamsSchema,
        responseFormatter: invalidFormatter,
        logic: mockLogic,
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      const handler = mockServer.resource.mock.calls[0]?.[3];
      if (!handler) throw new Error('Handler not registered');

      await expect(handler(new URL('test://test'), {}, {})).rejects.toThrow(
        /must be an object with a `uri` property/,
      );
    });

    it('should handle synchronous resource logic', async () => {
      const ParamsSchema = z.object({
        value: z.string(),
      });

      // Synchronous logic function (not async)
      const syncLogic = (
        _uri: URL,
        params: z.infer<typeof ParamsSchema>,
        _context: RequestContext,
      ) => {
        return { result: params.value.toUpperCase() };
      };

      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'sync-test',
        description: 'Test synchronous logic',
        uriTemplate: 'test://{value}',
        paramsSchema: ParamsSchema,
        logic: syncLogic,
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      const handler = mockServer.resource.mock.calls[0]?.[3];
      if (!handler) throw new Error('Handler not registered');
      const result = await handler(
        new URL('test://hello'),
        { value: 'hello' },
        {},
      );

      expect(result.contents[0].text).toBe(JSON.stringify({ result: 'HELLO' }));
    });

    it('should pass sessionId to handler context when available', async () => {
      const ParamsSchema = z.object({});

      const mockLogic = vi.fn(
        async (_uri, _params, context: RequestContext) => {
          return { sessionContext: context };
        },
      );

      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'session-test',
        description: 'Test session handling',
        uriTemplate: 'test://',
        paramsSchema: ParamsSchema,
        logic: mockLogic,
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      const handler = mockServer.resource.mock.calls[0]?.[3];
      if (!handler) throw new Error('Handler not registered');

      await handler(
        new URL('test://test'),
        {},
        { sessionId: 'test-session-123' },
      );

      expect(mockLogic).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          requestId: expect.any(String),
        }),
      );
    });

    it('should handle missing sessionId gracefully', async () => {
      const ParamsSchema = z.object({});

      const mockLogic = vi.fn(async () => ({ result: 'ok' }));

      const resourceDef: ResourceDefinition<typeof ParamsSchema, undefined> = {
        name: 'no-session-test',
        description: 'Test without session',
        uriTemplate: 'test://',
        paramsSchema: ParamsSchema,
        logic: mockLogic,
      };

      await registerResource(mockServer as unknown as McpServer, resourceDef);

      const handler = mockServer.resource.mock.calls[0]?.[3];
      if (!handler) throw new Error('Handler not registered');

      // Call without sessionId
      const result = await handler(new URL('test://test'), {}, {});

      expect(result).toHaveProperty('contents');
      expect(mockLogic).toHaveBeenCalled();
    });
  });
});
