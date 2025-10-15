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
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock utilities
vi.mock('@/utils/index.js', async () => {
  const actual = await vi.importActual('@/utils/index.js');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
    logStartupBanner: vi.fn(),
    ErrorHandler: {
      handleError: vi.fn((err) => err),
    },
  };
});

describe('Stdio Transport', () => {
  let mockServer: Partial<McpServer>;
  let mockContext: RequestContext;

  beforeEach(() => {
    mockServer = {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockContext = {
      requestId: 'test-stdio',
      timestamp: Date.now() as any,
      operation: 'test-stdio-transport',
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startStdioTransport', () => {
    it('should successfully start stdio transport', async () => {
      const { startStdioTransport } = await import(
        '@/mcp-server/transports/stdio/stdioTransport.js'
      );
      const { logger, logStartupBanner } = await import('@/utils/index.js');

      const result = await startStdioTransport(
        mockServer as McpServer,
        mockContext,
      );

      expect(result).toBe(mockServer);
      expect(mockServer.connect).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'Attempting to connect stdio transport...',
        expect.objectContaining({
          operation: 'connectStdioTransport',
          transportType: 'Stdio',
        }),
      );
      expect(logStartupBanner).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const { startStdioTransport } = await import(
        '@/mcp-server/transports/stdio/stdioTransport.js'
      );
      const { ErrorHandler } = await import('@/utils/index.js');

      const connectionError = new Error('Connection failed');
      mockServer.connect = vi.fn().mockRejectedValue(connectionError);

      await expect(
        startStdioTransport(mockServer as McpServer, mockContext),
      ).rejects.toThrow('Connection failed');

      expect(ErrorHandler.handleError).toHaveBeenCalledWith(
        connectionError,
        expect.objectContaining({
          operation: 'connectStdioTransport',
          critical: true,
          rethrow: true,
        }),
      );
    });

    it('should create StdioServerTransport and connect server', async () => {
      const { StdioServerTransport } = await import(
        '@modelcontextprotocol/sdk/server/stdio.js'
      );
      const { startStdioTransport } = await import(
        '@/mcp-server/transports/stdio/stdioTransport.js'
      );

      await startStdioTransport(mockServer as McpServer, mockContext);

      expect(StdioServerTransport).toHaveBeenCalledTimes(1);
      expect(mockServer.connect).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('stopStdioTransport', () => {
    it('should successfully stop stdio transport', async () => {
      const { stopStdioTransport } = await import(
        '@/mcp-server/transports/stdio/stdioTransport.js'
      );
      const { logger } = await import('@/utils/index.js');

      await stopStdioTransport(mockServer as McpServer, mockContext);

      expect(mockServer.close).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'Attempting to stop stdio transport...',
        expect.objectContaining({
          operation: 'stopStdioTransport',
          transportType: 'Stdio',
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Stdio transport stopped successfully.',
        expect.any(Object),
      );
    });

    it('should handle null server gracefully', async () => {
      const { stopStdioTransport } = await import(
        '@/mcp-server/transports/stdio/stdioTransport.js'
      );

      // Should not throw
      await expect(
        stopStdioTransport(null as any, mockContext),
      ).resolves.toBeUndefined();
    });

    it('should log context with correct operation', async () => {
      const { stopStdioTransport } = await import(
        '@/mcp-server/transports/stdio/stdioTransport.js'
      );
      const { logger } = await import('@/utils/index.js');

      await stopStdioTransport(mockServer as McpServer, mockContext);

      expect(logger.info).toHaveBeenCalledWith(
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
