/**
 * @fileoverview Test suite for createMcpServerInstance — server initialization,
 * registry wiring, capability registration, and error handling.
 * @module tests/mcp-server/server.test
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock logger and requestContextService
vi.mock('@/utils/internal/logger.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock('@/utils/internal/requestContext.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    requestContextService: {
      createRequestContext: vi.fn(() => ({
        requestId: 'test-req-id',
        timestamp: new Date().toISOString(),
        operation: 'createMcpServerInstance',
      })),
    },
  };
});

import { createMcpServerInstance, type McpServerDeps } from '@/mcp-server/server.js';
import { logger } from '@/utils/internal/logger.js';

describe('createMcpServerInstance', () => {
  let mockToolRegistry: { registerAll: ReturnType<typeof vi.fn> };
  let mockResourceRegistry: { registerAll: ReturnType<typeof vi.fn> };
  let mockPromptRegistry: { registerAll: ReturnType<typeof vi.fn> };
  let mockRootsRegistry: { registerAll: ReturnType<typeof vi.fn> };
  let deps: McpServerDeps;

  beforeEach(() => {
    vi.clearAllMocks();

    mockToolRegistry = { registerAll: vi.fn().mockResolvedValue(undefined) };
    mockResourceRegistry = { registerAll: vi.fn().mockResolvedValue(undefined) };
    mockPromptRegistry = { registerAll: vi.fn() };
    mockRootsRegistry = { registerAll: vi.fn() };

    deps = {
      config: {
        mcpServerName: 'test-server',
        mcpServerVersion: '1.0.0',
      } as McpServerDeps['config'],
      toolRegistry: mockToolRegistry as unknown as McpServerDeps['toolRegistry'],
      resourceRegistry: mockResourceRegistry as unknown as McpServerDeps['resourceRegistry'],
      promptRegistry: mockPromptRegistry as unknown as McpServerDeps['promptRegistry'],
      rootsRegistry: mockRootsRegistry as unknown as McpServerDeps['rootsRegistry'],
    };
  });

  it('should return an McpServer instance', async () => {
    const server = await createMcpServerInstance(deps);
    expect(server).toBeInstanceOf(McpServer);
  });

  it('should call ToolRegistry.registerAll', async () => {
    await createMcpServerInstance(deps);
    expect(mockToolRegistry.registerAll).toHaveBeenCalledTimes(1);
    expect(mockToolRegistry.registerAll).toHaveBeenCalledWith(expect.any(McpServer));
  });

  it('should call ResourceRegistry.registerAll', async () => {
    await createMcpServerInstance(deps);
    expect(mockResourceRegistry.registerAll).toHaveBeenCalledTimes(1);
  });

  it('should call PromptRegistry.registerAll', async () => {
    await createMcpServerInstance(deps);
    expect(mockPromptRegistry.registerAll).toHaveBeenCalledTimes(1);
  });

  it('should call RootsRegistry.registerAll', async () => {
    await createMcpServerInstance(deps);
    expect(mockRootsRegistry.registerAll).toHaveBeenCalledTimes(1);
  });

  it('should log initialization and success messages', async () => {
    await createMcpServerInstance(deps);
    expect(logger.debug).toHaveBeenCalledWith(
      'Initializing MCP server instance',
      expect.any(Object),
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'All MCP capabilities registered successfully',
      expect.any(Object),
    );
  });

  it('should rethrow and log when tool registration fails', async () => {
    const regError = new Error('tool registration failed');
    mockToolRegistry.registerAll.mockRejectedValue(regError);

    await expect(createMcpServerInstance(deps)).rejects.toThrow('tool registration failed');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to register MCP capabilities',
      expect.objectContaining({ message: 'tool registration failed' }),
      expect.any(Object),
    );
  });

  it('should rethrow and log when resource registration fails', async () => {
    const regError = new Error('resource registration failed');
    mockResourceRegistry.registerAll.mockRejectedValue(regError);

    await expect(createMcpServerInstance(deps)).rejects.toThrow('resource registration failed');
    expect(logger.error).toHaveBeenCalled();
  });

  it('should handle non-Error throws during registration', async () => {
    mockToolRegistry.registerAll.mockRejectedValue('string error');

    await expect(createMcpServerInstance(deps)).rejects.toBe('string error');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to register MCP capabilities',
      expect.objectContaining({ message: 'string error' }),
      expect.any(Object),
    );
  });
});
