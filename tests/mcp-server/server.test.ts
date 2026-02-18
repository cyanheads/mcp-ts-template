/**
 * @fileoverview Test suite for createMcpServerInstance — server initialization,
 * registry resolution, capability registration, and error handling.
 * @module tests/mcp-server/server.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the container module to intercept resolve() calls.
// Must preserve the `token` factory since tokens.ts calls it at import time.
const mockResolve = vi.fn();
vi.mock('@/container/core/container.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    container: {
      resolve: (...args: unknown[]) => mockResolve(...args),
    },
  };
});

// Mock logger and requestContextService
vi.mock('@/utils/index.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    },
    requestContextService: {
      createRequestContext: vi.fn(() => ({
        requestId: 'test-req-id',
        timestamp: new Date().toISOString(),
        operation: 'createMcpServerInstance',
      })),
      configure: vi.fn(),
    },
  };
});

// Mock config
vi.mock('@/config/index.js', () => ({
  config: {
    mcpServerName: 'test-server',
    mcpServerVersion: '1.0.0',
    environment: 'test',
  },
}));

import { createMcpServerInstance } from '@/mcp-server/server.js';
import { logger, requestContextService } from '@/utils/index.js';
import {
  ToolRegistryToken,
  ResourceRegistryToken,
  PromptRegistryToken,
  RootsRegistryToken,
} from '@/container/core/tokens.js';

describe('createMcpServerInstance', () => {
  let mockToolRegistry: { registerAll: ReturnType<typeof vi.fn> };
  let mockResourceRegistry: { registerAll: ReturnType<typeof vi.fn> };
  let mockPromptRegistry: { registerAll: ReturnType<typeof vi.fn> };
  let mockRootsRegistry: { registerAll: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockToolRegistry = { registerAll: vi.fn().mockResolvedValue(undefined) };
    mockResourceRegistry = {
      registerAll: vi.fn().mockResolvedValue(undefined),
    };
    mockPromptRegistry = { registerAll: vi.fn() };
    mockRootsRegistry = { registerAll: vi.fn() };

    mockResolve.mockImplementation((token: unknown) => {
      if (token === ToolRegistryToken) return mockToolRegistry;
      if (token === ResourceRegistryToken) return mockResourceRegistry;
      if (token === PromptRegistryToken) return mockPromptRegistry;
      if (token === RootsRegistryToken) return mockRootsRegistry;
      throw new Error(`Unexpected token: ${String(token)}`);
    });
  });

  it('should return an McpServer instance', async () => {
    const server = await createMcpServerInstance();
    expect(server).toBeInstanceOf(McpServer);
  });

  it('should configure requestContextService with app identity', async () => {
    await createMcpServerInstance();
    expect(requestContextService.configure).toHaveBeenCalledWith({
      appName: 'test-server',
      appVersion: '1.0.0',
      environment: 'test',
    });
  });

  it('should resolve and call ToolRegistry.registerAll', async () => {
    await createMcpServerInstance();
    expect(mockResolve).toHaveBeenCalledWith(ToolRegistryToken);
    expect(mockToolRegistry.registerAll).toHaveBeenCalledTimes(1);
    expect(mockToolRegistry.registerAll).toHaveBeenCalledWith(
      expect.any(McpServer),
    );
  });

  it('should resolve and call ResourceRegistry.registerAll', async () => {
    await createMcpServerInstance();
    expect(mockResolve).toHaveBeenCalledWith(ResourceRegistryToken);
    expect(mockResourceRegistry.registerAll).toHaveBeenCalledTimes(1);
  });

  it('should resolve and call PromptRegistry.registerAll', async () => {
    await createMcpServerInstance();
    expect(mockResolve).toHaveBeenCalledWith(PromptRegistryToken);
    expect(mockPromptRegistry.registerAll).toHaveBeenCalledTimes(1);
  });

  it('should resolve and call RootsRegistry.registerAll', async () => {
    await createMcpServerInstance();
    expect(mockResolve).toHaveBeenCalledWith(RootsRegistryToken);
    expect(mockRootsRegistry.registerAll).toHaveBeenCalledTimes(1);
  });

  it('should log initialization and success messages', async () => {
    await createMcpServerInstance();
    expect(logger.info).toHaveBeenCalledWith(
      'Initializing MCP server instance',
      expect.any(Object),
    );
    expect(logger.info).toHaveBeenCalledWith(
      'All MCP capabilities registered successfully',
      expect.any(Object),
    );
  });

  it('should rethrow and log when tool registration fails', async () => {
    const regError = new Error('tool registration failed');
    mockToolRegistry.registerAll.mockRejectedValue(regError);

    await expect(createMcpServerInstance()).rejects.toThrow(
      'tool registration failed',
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to register MCP capabilities',
      expect.objectContaining({
        error: 'tool registration failed',
      }),
    );
  });

  it('should rethrow and log when resource registration fails', async () => {
    const regError = new Error('resource registration failed');
    mockResourceRegistry.registerAll.mockRejectedValue(regError);

    await expect(createMcpServerInstance()).rejects.toThrow(
      'resource registration failed',
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('should handle non-Error throws during registration', async () => {
    mockToolRegistry.registerAll.mockRejectedValue('string error');

    await expect(createMcpServerInstance()).rejects.toBe('string error');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to register MCP capabilities',
      expect.objectContaining({
        error: 'string error',
      }),
    );
  });
});
