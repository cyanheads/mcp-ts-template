/**
 * @fileoverview Test suite for network utilities barrel export
 * @module tests/utils/network/index.test
 */

import { describe, expect, it, vi } from 'vitest';

describe('Network Utilities Barrel Export', () => {
  describe('Function Exports', () => {
    it('should export fetchWithTimeout function', async () => {
      const { fetchWithTimeout } = await import('@/utils/network/index.js');

      expect(fetchWithTimeout).toBeDefined();
      expect(typeof fetchWithTimeout).toBe('function');
    });
  });

  describe('Type Exports', () => {
    it('should export FetchWithTimeoutOptions type', async () => {
      const networkModule = await import('@/utils/network/index.js');

      // FetchWithTimeoutOptions is a type export - verify module loads
      expect(networkModule).toBeDefined();
    });
  });

  describe('Complete Export Verification', () => {
    it('should export all expected symbols', async () => {
      const networkModule = await import('@/utils/network/index.js');

      const expectedExports = ['fetchWithTimeout'];

      expectedExports.forEach((exportName) => {
        expect(networkModule).toHaveProperty(exportName);
      });
    });

    it('should only export expected symbols', async () => {
      const networkModule = await import('@/utils/network/index.js');

      const exports = Object.keys(networkModule);
      const knownExports = ['fetchWithTimeout'];

      exports.forEach((exportName) => {
        expect(knownExports).toContain(exportName);
      });
    });
  });

  describe('Functional Integration', () => {
    it('should allow using fetchWithTimeout through barrel export', async () => {
      const { fetchWithTimeout } = await import('@/utils/network/index.js');
      const { requestContextService } = await import('@/utils/index.js');

      // Mock fetch for testing
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'success',
      }) as any;

      try {
        const context = requestContextService.createRequestContext({
          operation: 'test',
        });
        const response = await fetchWithTimeout(
          'https://example.com',
          5000,
          context,
        );

        expect(response).toBeDefined();
        expect(response.ok).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should accept options parameter', async () => {
      const { fetchWithTimeout } = await import('@/utils/network/index.js');
      const { requestContextService } = await import('@/utils/index.js');

      // Mock fetch for testing
      const originalFetch = global.fetch;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'success',
      });
      global.fetch = mockFetch as any;

      try {
        const context = requestContextService.createRequestContext({
          operation: 'test',
        });
        await fetchWithTimeout('https://example.com', 5000, context, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://example.com',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
