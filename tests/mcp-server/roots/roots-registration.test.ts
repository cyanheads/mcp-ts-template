/**
 * @fileoverview Test suite for roots registration
 * @module tests/mcp-server/roots/roots-registration.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { container } from 'tsyringe';

import { RootsRegistry } from '@/mcp-server/roots/roots-registration.js';
import { Logger } from '@/container/tokens.js';
import { logger } from '@/utils/index.js';

describe('Roots Registration', () => {
  let rootsRegistry: RootsRegistry;
  let mockLogger: typeof logger;
  let mockMcpServer: McpServer;

  beforeEach(() => {
    // Clear any existing container registrations
    container.clearInstances();

    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      notice: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      crit: vi.fn(),
      alert: vi.fn(),
      emerg: vi.fn(),
    } as unknown as typeof logger;

    // Register mock logger in container
    container.registerInstance(Logger, mockLogger);

    // Create instance of RootsRegistry with mocked dependencies
    rootsRegistry = container.resolve(RootsRegistry);

    // Create mock MCP server
    mockMcpServer = {
      registerTool: vi.fn(),
      registerResource: vi.fn(),
      registerPrompt: vi.fn(),
    } as unknown as McpServer;
  });

  describe('constructor', () => {
    it('should be instantiable via DI', () => {
      expect(rootsRegistry).toBeInstanceOf(RootsRegistry);
    });

    it('should receive injected logger', () => {
      expect(rootsRegistry).toBeDefined();
    });
  });

  describe('registerAll', () => {
    it('should create request context with correct operation', () => {
      rootsRegistry.registerAll(mockMcpServer);

      // Verify debug log was called with context
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Roots capability enabled (client-provided roots)',
        expect.objectContaining({
          requestId: expect.any(String),
          timestamp: expect.any(String),
          operation: 'RootsRegistry.registerAll',
        }),
      );
    });

    it('should log info message about successful registration', () => {
      rootsRegistry.registerAll(mockMcpServer);

      // Verify info log was called
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Roots capability registered successfully',
        expect.objectContaining({
          requestId: expect.any(String),
          timestamp: expect.any(String),
          operation: 'RootsRegistry.registerAll',
        }),
      );
    });

    it('should not throw when called with valid MCP server', () => {
      expect(() => rootsRegistry.registerAll(mockMcpServer)).not.toThrow();
    });

    it('should call logger debug and info exactly once each', () => {
      rootsRegistry.registerAll(mockMcpServer);

      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
    });

    it('should not call error logging methods', () => {
      rootsRegistry.registerAll(mockMcpServer);

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.warning).not.toHaveBeenCalled();
      expect(mockLogger.crit).not.toHaveBeenCalled();
    });

    it('should handle the server parameter without accessing it', () => {
      // The implementation accepts _server parameter but doesn't use it
      // This test verifies it doesn't throw with any valid server object
      const minimalServer = {} as McpServer;

      expect(() => rootsRegistry.registerAll(minimalServer)).not.toThrow();
    });

    it('should generate unique request IDs for each call', () => {
      rootsRegistry.registerAll(mockMcpServer);
      const firstCallContext = (mockLogger.debug as any).mock.calls[0][1];
      const firstRequestId = firstCallContext.requestId;

      // Clear mocks and call again
      vi.clearAllMocks();

      rootsRegistry.registerAll(mockMcpServer);
      const secondCallContext = (mockLogger.debug as any).mock.calls[0][1];
      const secondRequestId = secondCallContext.requestId;

      // Request IDs should be different
      expect(firstRequestId).not.toBe(secondRequestId);
    });
  });
});
