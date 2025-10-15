/**
 * @fileoverview Test suite for transport interface
 * @module tests/mcp-server/transports/ITransport.test
 */

import { describe, expect, it } from 'vitest';
import type { ServerType } from '@hono/node-server';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type {
  ITransport,
  TransportServer,
} from '@/mcp-server/transports/ITransport.js';

describe('ITransport Interface', () => {
  describe('Interface Contract', () => {
    it('should allow implementations with start() returning Promise<TransportServer>', () => {
      // Mock implementation returning ServerType
      const httpTransport: ITransport = {
        start: async (): Promise<ServerType> => ({}) as ServerType,
        stop: async (): Promise<void> => {},
      };

      expect(httpTransport.start).toBeDefined();
      expect(httpTransport.stop).toBeDefined();
    });

    it('should allow implementations with start() returning Promise<McpServer>', () => {
      // Mock implementation returning McpServer
      const stdioTransport: ITransport = {
        start: async (): Promise<McpServer> => ({}) as McpServer,
        stop: async (): Promise<void> => {},
      };

      expect(stdioTransport.start).toBeDefined();
      expect(stdioTransport.stop).toBeDefined();
    });

    it('should allow implementations with stop() returning Promise<void>', () => {
      const transport: ITransport = {
        start: async (): Promise<ServerType> => ({}) as ServerType,
        stop: async (): Promise<void> => {
          // Stop logic here
        },
      };

      expect(transport.stop).toBeDefined();
      expect(typeof transport.stop).toBe('function');
    });
  });

  describe('Type Checking', () => {
    it('should accept ITransport type for objects with correct signature', () => {
      const mockTransport = {
        start: async () => ({}) as ServerType,
        stop: async () => {},
      };

      // This should compile without errors
      const transport: ITransport = mockTransport;

      expect(transport).toBeDefined();
    });

    it('should have TransportServer as union type of ServerType | McpServer', () => {
      // Type test: TransportServer should accept both types
      const serverType: TransportServer = {} as ServerType;
      const mcpServer: TransportServer = {} as McpServer;

      expect(serverType).toBeDefined();
      expect(mcpServer).toBeDefined();
    });
  });

  describe('Method Signatures', () => {
    it('should define start() method returning Promise<TransportServer>', async () => {
      const transport: ITransport = {
        start: async () => ({}) as TransportServer,
        stop: async () => {},
      };

      const result = await transport.start();
      expect(result).toBeDefined();
    });

    it('should define stop() method returning Promise<void>', async () => {
      const transport: ITransport = {
        start: async () => ({}) as TransportServer,
        stop: async () => {},
      };

      const result = await transport.stop();
      expect(result).toBeUndefined();
    });

    it('should allow async implementations', async () => {
      let started = false;
      let stopped = false;

      const transport: ITransport = {
        start: async () => {
          started = true;
          return {} as TransportServer;
        },
        stop: async () => {
          stopped = true;
        },
      };

      await transport.start();
      expect(started).toBe(true);

      await transport.stop();
      expect(stopped).toBe(true);
    });
  });

  describe('Interface Documentation', () => {
    it('should document that ITransport defines transport lifecycle', () => {
      // This test documents the purpose of ITransport
      const transport: ITransport = {
        start: async () => ({}) as TransportServer,
        stop: async () => {},
      };

      // ITransport defines the contract for:
      // 1. Starting a transport (HTTP or stdio)
      // 2. Stopping a transport gracefully
      expect(transport).toHaveProperty('start');
      expect(transport).toHaveProperty('stop');
    });

    it('should document that start() can return either HTTP server or MCP server', () => {
      // HTTP transport returns ServerType (from @hono/node-server)
      const httpTransport: ITransport = {
        start: async () => ({}) as ServerType,
        stop: async () => {},
      };

      // Stdio transport returns McpServer
      const stdioTransport: ITransport = {
        start: async () => ({}) as McpServer,
        stop: async () => {},
      };

      expect(httpTransport.start).toBeDefined();
      expect(stdioTransport.start).toBeDefined();
    });
  });
});
