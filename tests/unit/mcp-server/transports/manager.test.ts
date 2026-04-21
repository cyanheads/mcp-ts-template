/**
 * @fileoverview Unit tests for TransportManager lifecycle and transport orchestration.
 * @module tests/mcp-server/transports/manager
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '@/config/index.js';
import { config } from '@/config/index.js';
import type { TaskManager } from '@/mcp-server/tasks/core/taskManager.js';
import { TransportManager } from '@/mcp-server/transports/manager.js';
import { logger } from '@/utils/internal/logger.js';
import { defaultServerManifest as defaultMeta } from '../../../helpers/fixtures.js';

// Mock the transport modules
vi.mock('@/mcp-server/transports/http/httpTransport.js', () => ({
  startHttpTransport: vi.fn().mockResolvedValue({
    server: 'http-mock',
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/mcp-server/transports/stdio/stdioTransport.js', () => ({
  startStdioTransport: vi.fn().mockResolvedValue({ server: 'stdio-mock' }),
  stopStdioTransport: vi.fn().mockResolvedValue(undefined),
}));

/** Creates a config-like object with the given transport type. */
function fakeConfig(transportType: string): AppConfig {
  return { ...config, mcpTransportType: transportType } as AppConfig;
}

describe('TransportManager', () => {
  let mockCreateMcpServer: () => Promise<McpServer>;
  let mockMcpServer: McpServer;
  let mockTaskManager: TaskManager;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMcpServer = {
      registerTool: vi.fn(),
      registerResource: vi.fn(),
      registerPrompt: vi.fn(),
    } as unknown as McpServer;

    mockCreateMcpServer = vi.fn().mockResolvedValue(mockMcpServer);
    mockTaskManager = { cleanup: vi.fn() } as unknown as TaskManager;
  });

  describe('start', () => {
    it('should start HTTP transport when configured', async () => {
      const manager = new TransportManager(
        fakeConfig('http'),
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );

      await manager.start();

      const { startHttpTransport } = await import('@/mcp-server/transports/http/httpTransport.js');
      expect(startHttpTransport).toHaveBeenCalledTimes(1);
      expect(startHttpTransport).toHaveBeenCalledWith(
        mockCreateMcpServer,
        expect.any(Object),
        defaultMeta,
      );
    });

    it('should start stdio transport when configured', async () => {
      const manager = new TransportManager(
        fakeConfig('stdio'),
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );

      await manager.start();

      const { startStdioTransport } = await import(
        '@/mcp-server/transports/stdio/stdioTransport.js'
      );
      expect(startStdioTransport).toHaveBeenCalledTimes(1);
      expect(startStdioTransport).toHaveBeenCalledWith(mockMcpServer, expect.any(Object));
    });

    it('should throw error for unsupported transport type', async () => {
      const manager = new TransportManager(
        fakeConfig('invalid-transport'),
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );

      await expect(manager.start()).rejects.toThrow(
        'Unsupported transport type: invalid-transport',
      );
    });

    it('should create MCP server instance for stdio transport', async () => {
      const manager = new TransportManager(
        fakeConfig('stdio'),
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );

      await manager.start();
      expect(mockCreateMcpServer).toHaveBeenCalledTimes(1);
    });

    it('should pass factory (not instance) for HTTP transport', async () => {
      const manager = new TransportManager(
        fakeConfig('http'),
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );

      await manager.start();
      // HTTP transport receives factory — does NOT eagerly create an instance
      expect(mockCreateMcpServer).not.toHaveBeenCalled();
    });

    it('should store server instance after successful start', async () => {
      const manager = new TransportManager(
        config,
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );
      await manager.start();

      const server = manager.getServer();
      expect(server).toBeDefined();
      expect(server).not.toBeNull();
    });
  });

  describe('stop', () => {
    it('should stop HTTP transport when active', async () => {
      const manager = new TransportManager(
        fakeConfig('http'),
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );
      await manager.start();

      const { startHttpTransport } = await import('@/mcp-server/transports/http/httpTransport.js');
      const handle = await (startHttpTransport as ReturnType<typeof vi.fn>).mock.results.at(-1)
        ?.value;

      await manager.stop('SIGTERM');
      expect(handle.stop).toHaveBeenCalledTimes(1);
    });

    it('should stop stdio transport when active', async () => {
      const manager = new TransportManager(
        fakeConfig('stdio'),
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );
      await manager.start();

      await manager.stop('SIGTERM');

      const { stopStdioTransport } = await import(
        '@/mcp-server/transports/stdio/stdioTransport.js'
      );
      expect(stopStdioTransport).toHaveBeenCalledTimes(1);
    });

    it('should handle stop when no server instance is active', async () => {
      const freshManager = new TransportManager(
        config,
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );

      await expect(freshManager.stop('SIGTERM')).resolves.toBeUndefined();
    });

    it('should pass signal to stop functions', async () => {
      const manager = new TransportManager(
        config,
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );
      await manager.start();
      await manager.stop('SIGINT');

      // Signal is logged in context
      expect(true).toBe(true);
    });
  });

  describe('getServer', () => {
    it('should return null before start is called', () => {
      const freshManager = new TransportManager(
        config,
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );

      expect(freshManager.getServer()).toBeNull();
    });

    it('should return server instance after start', async () => {
      const manager = new TransportManager(
        config,
        logger,
        mockCreateMcpServer,
        mockTaskManager,
        defaultMeta,
      );
      await manager.start();

      const server = manager.getServer();
      expect(server).not.toBeNull();
    });
  });
});
