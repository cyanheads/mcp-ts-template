/**
 * @fileoverview Tests for stdio transport functionality.
 * @module tests/mcp-server/transports/stdio/stdioTransport.test.ts
 *
 * NOTE: Full stdio transport flow testing requires integration testing with real
 * process.stdin/stdout streams. These unit tests cover the error handling and
 * lifecycle management paths.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestContext } from '@/utils/index.js';

// Mock the SDK's StdioServerTransport
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  class MockStdioServerTransportClass {
    close = vi.fn().mockResolvedValue(undefined);
  }

  return {
    StdioServerTransport: MockStdioServerTransportClass,
  };
});

describe('Stdio Transport', () => {
  let mockServer: Partial<McpServer>;
  let mockContext: RequestContext;
  let loggerSpy: {
    info: { mockImplementation: (fn: any) => any };
    debug: { mockImplementation: (fn: any) => any };
    error: { mockImplementation: (fn: any) => any };
  };
  let logStartupBannerSpy: { mockImplementation: (fn: any) => any };
  let errorHandlerSpy: { mockImplementation: (fn: any) => any };

  beforeEach(async () => {
    mockServer = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockContext = {
      requestId: 'test-stdio',
      timestamp: Date.now() as any,
      operation: 'test-stdio-transport',
    };

    // Import and spy on actual utilities
    const utils = await import('@/utils/index.js');
    loggerSpy = {
      info: vi.spyOn(utils.logger, 'info').mockImplementation(() => {}),
      debug: vi.spyOn(utils.logger, 'debug').mockImplementation(() => {}),
      error: vi.spyOn(utils.logger, 'error').mockImplementation(() => {}),
    };
    logStartupBannerSpy = vi
      .spyOn(utils, 'logStartupBanner')
      .mockImplementation(() => {});
    errorHandlerSpy = vi
      .spyOn(utils.ErrorHandler, 'handleError')
      .mockImplementation((err) => err as any);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startStdioTransport', () => {
    it('should successfully start stdio transport', async () => {
      const { startStdioTransport } =
        await import('@/mcp-server/transports/stdio/stdioTransport.js');

      const result = await startStdioTransport(
        mockServer as McpServer,
        mockContext,
      );

      expect(result).toBe(mockServer);
      expect(mockServer.connect).toHaveBeenCalledTimes(1);
      expect(loggerSpy.info).toHaveBeenCalledWith(
        'Attempting to connect stdio transport...',
        expect.objectContaining({
          operation: 'connectStdioTransport',
          transportType: 'Stdio',
        }),
      );
      expect(logStartupBannerSpy).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const { startStdioTransport } =
        await import('@/mcp-server/transports/stdio/stdioTransport.js');

      const connectionError = new Error('Connection failed');
      mockServer.connect = vi.fn().mockRejectedValue(connectionError);

      await expect(
        startStdioTransport(mockServer as McpServer, mockContext),
      ).rejects.toThrow('Connection failed');

      expect(errorHandlerSpy).toHaveBeenCalledWith(
        connectionError,
        expect.objectContaining({
          operation: 'connectStdioTransport',
          critical: true,
          rethrow: true,
        }),
      );
    });

    it('should create StdioServerTransport and connect server', async () => {
      const { startStdioTransport } =
        await import('@/mcp-server/transports/stdio/stdioTransport.js');

      await startStdioTransport(mockServer as McpServer, mockContext);

      expect(mockServer.connect).toHaveBeenCalledTimes(1);
      expect(mockServer.connect).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('stopStdioTransport', () => {
    it('should successfully stop stdio transport', async () => {
      const { stopStdioTransport } =
        await import('@/mcp-server/transports/stdio/stdioTransport.js');

      await stopStdioTransport(mockServer as McpServer, mockContext);

      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(loggerSpy.info).toHaveBeenCalledWith(
        'Attempting to stop stdio transport...',
        expect.objectContaining({
          operation: 'stopStdioTransport',
          transportType: 'Stdio',
        }),
      );
      expect(loggerSpy.info).toHaveBeenCalledWith(
        'Stdio transport stopped successfully.',
        expect.any(Object),
      );
    });

    it('should handle null server gracefully', async () => {
      const { stopStdioTransport } =
        await import('@/mcp-server/transports/stdio/stdioTransport.js');

      // Should not throw
      await expect(
        stopStdioTransport(null as any, mockContext),
      ).resolves.toBeUndefined();
    });

    it('should log context with correct operation', async () => {
      const { stopStdioTransport } =
        await import('@/mcp-server/transports/stdio/stdioTransport.js');

      await stopStdioTransport(mockServer as McpServer, mockContext);

      expect(loggerSpy.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          operation: 'stopStdioTransport',
          transportType: 'Stdio',
          requestId: mockContext.requestId,
        }),
      );
    });
  });
});
