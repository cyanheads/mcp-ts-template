/**
 * @fileoverview Runtime-specific tests for session ID generation.
 * @module tests/mcp-server/transports/http/sessionIdUtils.runtime.test
 */

import { describe, expect, it, vi } from 'vitest';

const mockRuntimeCaps = {
  hasBuffer: false,
  hasPerformanceNow: true,
  hasProcess: false,
  hasTextEncoder: true,
  isBrowserLike: false,
  isBun: false,
  isNode: false,
  isWorkerLike: true,
};

vi.mock('@/utils/internal/runtime.js', () => ({
  runtimeCaps: mockRuntimeCaps,
}));

const { generateSecureSessionId, validateSessionIdFormat } = await import(
  '@/mcp-server/transports/http/sessionIdUtils.js'
);

describe('sessionIdUtils runtime branches', () => {
  it('uses Web Crypto when Node Buffer support is unavailable', () => {
    const globalWithCrypto = globalThis as typeof globalThis & {
      crypto?: { getRandomValues: (array: Uint8Array) => Uint8Array };
    };
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = i;
      }
      return bytes;
    });

    const originalCrypto = globalWithCrypto.crypto;
    Object.defineProperty(globalWithCrypto, 'crypto', {
      configurable: true,
      value: { getRandomValues },
    });

    try {
      const id = generateSecureSessionId();

      expect(getRandomValues).toHaveBeenCalledOnce();
      expect(id).toHaveLength(64);
      expect(id).toBe('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');
      expect(validateSessionIdFormat(id)).toBe(true);
    } finally {
      Object.defineProperty(globalWithCrypto, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }
  });
});
