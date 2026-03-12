/**
 * @fileoverview Provides cross-platform encoding utilities.
 * @module src/utils/internal/encoding
 */
import { runtimeCaps } from './runtime.js';

/**
 * Encodes an ArrayBuffer into a base64 string in a cross-platform manner.
 * Prefers Node.js Buffer for performance if available, otherwise uses a
 * chunked `btoa` fallback to avoid stack overflow on large buffers.
 *
 * @param buffer - The ArrayBuffer to encode.
 * @returns The base64-encoded string.
 * @example
 * ```typescript
 * const buf = new TextEncoder().encode('hello').buffer;
 * arrayBufferToBase64(buf); // 'aGVsbG8='
 * ```
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (runtimeCaps.hasBuffer) {
    // Node.js environment
    return Buffer.from(buffer).toString('base64');
  } else {
    // Browser/Worker environment — chunked to avoid stack overflow on large buffers
    const bytes = new Uint8Array(buffer);
    const chunks: string[] = [];
    const CHUNK_SIZE = 0x8000; // 32KB
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      chunks.push(
        String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE) as unknown as number[]),
      );
    }
    return btoa(chunks.join(''));
  }
}

/**
 * Encodes a UTF-8 string to base64 in a cross-platform manner.
 * Prefers Node.js Buffer for performance if available, otherwise uses
 * TextEncoder + {@link arrayBufferToBase64} for Cloudflare Workers compatibility.
 *
 * @param str - The UTF-8 string to encode.
 * @returns The base64-encoded string.
 * @example
 * ```typescript
 * stringToBase64('hello'); // 'aGVsbG8='
 * ```
 */
export function stringToBase64(str: string): string {
  if (runtimeCaps.hasBuffer) {
    // Node.js environment - most performant
    return Buffer.from(str, 'utf-8').toString('base64');
  } else {
    // Worker/Browser environment - use Web APIs
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    return arrayBufferToBase64(bytes.buffer as ArrayBuffer);
  }
}

/**
 * Decodes a base64-encoded string to UTF-8 in a cross-platform manner.
 * Prefers Node.js Buffer for performance if available, otherwise uses
 * `atob` + TextDecoder for Cloudflare Workers compatibility.
 *
 * @param base64 - The base64-encoded string to decode.
 * @returns The decoded UTF-8 string.
 * @throws {Error} If the input is not valid base64 (thrown by `Buffer` or `atob`).
 * @example
 * ```typescript
 * base64ToString('aGVsbG8='); // 'hello'
 * ```
 */
export function base64ToString(base64: string): string {
  if (runtimeCaps.hasBuffer) {
    // Node.js environment - most performant
    return Buffer.from(base64, 'base64').toString('utf-8');
  } else {
    // Worker/Browser environment - use Web APIs
    const decoded = atob(base64);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
}
