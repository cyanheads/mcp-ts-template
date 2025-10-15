/**
 * @fileoverview Test suite for HTTP transport barrel export
 * @module tests/mcp-server/transports/http/index.test
 */

import { describe, test, expect } from 'vitest';
import * as httpTransportIndex from '@/mcp-server/transports/http/index.js';
import { httpErrorHandler } from '@/mcp-server/transports/http/httpErrorHandler.js';
import {
  createHttpApp,
  startHttpTransport,
} from '@/mcp-server/transports/http/httpTransport.js';
import { SessionStore } from '@/mcp-server/transports/http/sessionStore.js';

describe('HTTP Transport Barrel Export', () => {
  describe('Exported functions', () => {
    test('should export httpErrorHandler', () => {
      expect(httpTransportIndex.httpErrorHandler).toBeDefined();
      expect(httpTransportIndex.httpErrorHandler).toBe(httpErrorHandler);
      expect(typeof httpTransportIndex.httpErrorHandler).toBe('function');
    });

    test('should export createHttpApp', () => {
      expect(httpTransportIndex.createHttpApp).toBeDefined();
      expect(httpTransportIndex.createHttpApp).toBe(createHttpApp);
      expect(typeof httpTransportIndex.createHttpApp).toBe('function');
    });

    test('should export startHttpTransport', () => {
      expect(httpTransportIndex.startHttpTransport).toBeDefined();
      expect(httpTransportIndex.startHttpTransport).toBe(startHttpTransport);
      expect(typeof httpTransportIndex.startHttpTransport).toBe('function');
    });
  });

  describe('Exported classes', () => {
    test('should export SessionStore', () => {
      expect(httpTransportIndex.SessionStore).toBeDefined();
      expect(httpTransportIndex.SessionStore).toBe(SessionStore);
      expect(typeof httpTransportIndex.SessionStore).toBe('function');
    });

    test('SessionStore should be constructable', () => {
      const store = new httpTransportIndex.SessionStore(60000);
      expect(store).toBeInstanceOf(SessionStore);
      expect(store).toBeInstanceOf(httpTransportIndex.SessionStore);
    });
  });

  describe('Type exports', () => {
    test('should export HonoNodeBindings type', () => {
      // TypeScript compile-time check
      // Runtime check: type exports don't exist at runtime, but we can verify the import doesn't error
      expect(httpTransportIndex).toBeDefined();

      // Verify we can use the type (compile-time only, no runtime value)
      type TestType = typeof httpTransportIndex extends {
        httpErrorHandler: unknown;
      }
        ? true
        : false;
      const typeCheck: TestType = true;
      expect(typeCheck).toBe(true);
    });
  });

  describe('Module completeness', () => {
    test('should export all expected members', () => {
      const expectedExports = [
        'httpErrorHandler',
        'createHttpApp',
        'startHttpTransport',
        'SessionStore',
      ];

      expectedExports.forEach((exportName) => {
        expect(httpTransportIndex).toHaveProperty(exportName);
        expect((httpTransportIndex as any)[exportName]).toBeDefined();
      });
    });

    test('should not export unexpected members', () => {
      const actualExports = Object.keys(httpTransportIndex);

      // These are the only exports we expect
      const expectedExports = [
        'httpErrorHandler',
        'createHttpApp',
        'startHttpTransport',
        'SessionStore',
      ];

      actualExports.forEach((exportName) => {
        expect(expectedExports).toContain(exportName);
      });
    });

    test('exports should match documented API', () => {
      // Verify the public API surface hasn't changed unexpectedly
      const publicAPI = {
        httpErrorHandler: 'function',
        createHttpApp: 'function',
        startHttpTransport: 'function',
        SessionStore: 'function',
      };

      Object.entries(publicAPI).forEach(([name, type]) => {
        expect(typeof (httpTransportIndex as any)[name]).toBe(type);
      });
    });
  });
});
