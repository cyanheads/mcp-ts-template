/**
 * @fileoverview Provides cross-platform encoding utilities.
 * @module src/utils/internal/encoding
 */
import { runtimeCaps } from './runtime.js';

/**
 * Encodes an ArrayBuffer into a base64 string in a cross-platform manner.
 * Prefers Node.js Buffer for performance if available, otherwise uses a
 * standard web API fallback.
 *
 * @param buffer - The ArrayBuffer to encode.
 * @returns The base64-encoded string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (runtimeCaps.hasBuffer) {
    // Node.js environment
    return Buffer.from(buffer).toString('base64');
  } else {
    // Browser/Worker environment
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }
}
