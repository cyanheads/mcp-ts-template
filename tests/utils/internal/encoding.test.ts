/**
 * @fileoverview Tests for the cross-platform encoding helper.
 * @module tests/utils/internal/encoding.test
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { arrayBufferToBase64 } from '../../../src/utils/internal/encoding.js';
import { runtimeCaps } from '../../../src/utils/internal/runtime.js';

describe('arrayBufferToBase64', () => {
  const originalHasBuffer = runtimeCaps.hasBuffer;
  const originalBtoa = globalThis.btoa;

  afterEach(() => {
    runtimeCaps.hasBuffer = originalHasBuffer;
    if (originalBtoa) {
      globalThis.btoa = originalBtoa;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (globalThis as { btoa?: typeof globalThis.btoa }).btoa;
    }
  });

  it('encodes using Buffer when available', () => {
    runtimeCaps.hasBuffer = true;
    const encoder = new TextEncoder();
    const buffer = encoder.encode('hello world');

    const result = arrayBufferToBase64(buffer.buffer as ArrayBuffer);

    expect(result).toBe(Buffer.from('hello world').toString('base64'));
  });

  it('falls back to btoa when Buffer is unavailable', () => {
    runtimeCaps.hasBuffer = false;
    const btoaSpy = vi.fn((value: string) =>
      Buffer.from(value, 'binary').toString('base64'),
    );
    globalThis.btoa = btoaSpy as typeof globalThis.btoa;

    const bytes = new Uint8Array([0, 1, 2, 3]);
    const result = arrayBufferToBase64(bytes.buffer);

    expect(btoaSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe(Buffer.from(bytes).toString('base64'));
  });
});
