/**
 * @fileoverview Test suite for HTTP transport types
 * @module tests/mcp-server/transports/http/httpTypes.test
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, test } from 'vitest';
import type { HonoNodeBindings } from '@/mcp-server/transports/http/httpTypes.js';

describe('HTTP Transport Types', () => {
  describe('HonoNodeBindings', () => {
    test('should define incoming and outgoing properties', () => {
      const mockBindings: HonoNodeBindings = {
        incoming: {} as IncomingMessage,
        outgoing: {} as ServerResponse,
      };

      expect(mockBindings).toHaveProperty('incoming');
      expect(mockBindings).toHaveProperty('outgoing');
    });

    test('should accept valid IncomingMessage for incoming', () => {
      const mockIncoming = {
        headers: {},
        method: 'GET',
        url: '/test',
      } as IncomingMessage;

      const bindings: HonoNodeBindings = {
        incoming: mockIncoming,
        outgoing: {} as ServerResponse,
      };

      expect(bindings.incoming).toBe(mockIncoming);
    });

    test('should accept valid ServerResponse for outgoing', () => {
      const mockOutgoing = {
        writeHead: () => {},
        end: () => {},
      } as unknown as ServerResponse;

      const bindings: HonoNodeBindings = {
        incoming: {} as IncomingMessage,
        outgoing: mockOutgoing,
      };

      expect(bindings.outgoing).toBe(mockOutgoing);
    });
  });

  describe('Type compatibility', () => {
    test('HonoNodeBindings should integrate with Hono context bindings', () => {
      type HonoContextLike = {
        Bindings: HonoNodeBindings;
      };

      const mockContext: HonoContextLike = {
        Bindings: {
          incoming: {} as IncomingMessage,
          outgoing: {} as ServerResponse,
        },
      };

      expect(mockContext.Bindings).toHaveProperty('incoming');
      expect(mockContext.Bindings).toHaveProperty('outgoing');
    });
  });
});
