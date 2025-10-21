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

/**
 * Encodes a string to base64 in a cross-platform manner.
 * Prefers Node.js Buffer for performance if available, otherwise uses
 * TextEncoder with Web APIs for compatibility with Cloudflare Workers.
 *
 * @param str - The string to encode.
 * @returns The base64-encoded string.
 */
export function stringToBase64(str: string): string {
  if (runtimeCaps.hasBuffer) {
    // Node.js environment - most performant
    return Buffer.from(str, 'utf-8').toString('base64');
  } else {
    // Worker/Browser environment - use Web APIs
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    return arrayBufferToBase64(bytes.buffer);
  }
}

/**
 * Decodes a base64 string to UTF-8 in a cross-platform manner.
 * Prefers Node.js Buffer for performance if available, otherwise uses
 * Web APIs (atob + TextDecoder) for compatibility with Cloudflare Workers.
 *
 * @param base64 - The base64 string to decode.
 * @returns The decoded UTF-8 string.
 * @throws {Error} If the input is not valid base64.
 */
export function base64ToString(base64: string): string {
  if (runtimeCaps.hasBuffer) {
    // Node.js environment - most performant
    return Buffer.from(base64, 'base64').toString('utf-8');
  } else {
    // Worker/Browser environment - use Web APIs
    const decoded = atob(base64);
    const decoder = new TextDecoder();
    const bytes = new Uint8Array(decoded.split('').map((c) => c.charCodeAt(0)));
    return decoder.decode(bytes);
  }
}

/**
 * Encodes an ArrayBuffer into a base64url string (URL-safe, no padding) in a cross-platform manner.
 * Base64URL encoding replaces '+' with '-', '/' with '_', and removes padding '='.
 * This format is safe for use in URLs and file names.
 *
 * @param buffer - The ArrayBuffer to encode.
 * @returns The base64url-encoded string.
 */
export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const base64 = arrayBufferToBase64(buffer);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Encodes a string to base64url (URL-safe, no padding) in a cross-platform manner.
 * Base64URL encoding replaces '+' with '-', '/' with '_', and removes padding '='.
 * This format is safe for use in URLs and file names.
 *
 * @param str - The string to encode.
 * @returns The base64url-encoded string.
 */
export function stringToBase64Url(str: string): string {
  if (runtimeCaps.hasBuffer) {
    // Node.js environment - use native base64url support
    return Buffer.from(str, 'utf-8').toString('base64url');
  } else {
    // Worker/Browser environment - convert standard base64 to base64url
    const base64 = stringToBase64(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

/**
 * Decodes a base64url string to UTF-8 in a cross-platform manner.
 * Base64URL encoding uses '-' instead of '+', '_' instead of '/', and has no padding.
 *
 * @param base64url - The base64url string to decode.
 * @returns The decoded UTF-8 string.
 * @throws {Error} If the input is not valid base64url.
 */
export function base64UrlToString(base64url: string): string {
  if (runtimeCaps.hasBuffer) {
    // Node.js environment - use native base64url support
    return Buffer.from(base64url, 'base64url').toString('utf-8');
  } else {
    // Worker/Browser environment - convert base64url to standard base64
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    return base64ToString(base64);
  }
}
