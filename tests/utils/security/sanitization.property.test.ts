/**
 * @fileoverview Property-based tests for the Sanitization module.
 * Uses fast-check to generate arbitrary inputs and verify invariants
 * that must hold for ALL inputs, catching edge cases hand-written tests miss.
 * @module tests/utils/security/sanitization.property
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { sanitization } from '@/utils/security/sanitization.js';
import { McpError } from '@/types-global/errors.js';

describe('Sanitization Property-Based Tests', () => {
  describe('sanitizeHtml', () => {
    it('output should never contain <script> tags', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitization.sanitizeHtml(input);
          expect(result.toLowerCase()).not.toContain('<script');
        }),
        { numRuns: 200 },
      );
    });

    it('should be idempotent — sanitizing twice gives same result', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const once = sanitization.sanitizeHtml(input);
          const twice = sanitization.sanitizeHtml(once);
          expect(twice).toBe(once);
        }),
        { numRuns: 200 },
      );
    });

    it('output should never contain event handler attributes', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitization.sanitizeHtml(input);
          expect(result.toLowerCase()).not.toMatch(/\bon\w+\s*=/);
        }),
        { numRuns: 200 },
      );
    });

    it('should return string for any input', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitization.sanitizeHtml(input);
          expect(typeof result).toBe('string');
        }),
        { numRuns: 200 },
      );
    });
  });

  describe('sanitizeString (text context)', () => {
    it('output should contain no HTML tags in text mode', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = sanitization.sanitizeString(input, {
            context: 'text',
          });
          expect(result).not.toMatch(/<[a-z][^>]*>/i);
        }),
        { numRuns: 200 },
      );
    });

    it('should be idempotent in text mode', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const once = sanitization.sanitizeString(input, { context: 'text' });
          const twice = sanitization.sanitizeString(once, { context: 'text' });
          expect(twice).toBe(once);
        }),
        { numRuns: 200 },
      );
    });
  });

  describe('sanitizeUrl', () => {
    it('should throw McpError for javascript: URLs', () => {
      fc.assert(
        fc.property(fc.string(), (suffix) => {
          const input = `javascript:${suffix}`;
          expect(() => sanitization.sanitizeUrl(input)).toThrow(McpError);
        }),
        { numRuns: 100 },
      );
    });

    it('should throw McpError for invalid/empty URLs', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => {
            // Keep only strings that are clearly not valid http(s) URLs
            const t = s.trim().toLowerCase();
            return !t.startsWith('http://') && !t.startsWith('https://');
          }),
          (input) => {
            expect(() => sanitization.sanitizeUrl(input)).toThrow(McpError);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve valid https URLs', () => {
      fc.assert(
        fc.property(
          fc.webUrl({ withFragments: true, withQueryParameters: true }),
          (url) => {
            const result = sanitization.sanitizeUrl(url);
            expect(result.length).toBeGreaterThan(0);
            expect(typeof result).toBe('string');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('sanitizeJson', () => {
    it('should round-trip valid JSON objects', () => {
      fc.assert(
        fc.property(
          fc.record({
            key: fc.string(),
            value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          }),
          (obj) => {
            const json = JSON.stringify(obj);
            const result = sanitization.sanitizeJson(json);
            expect(result).toEqual(obj);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should throw on invalid JSON strings', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => {
            try {
              JSON.parse(s);
              return false;
            } catch {
              return true;
            }
          }),
          (invalid) => {
            expect(() => sanitization.sanitizeJson(invalid)).toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('sanitizeNumber', () => {
    it('should clamp numbers to min/max range', () => {
      fc.assert(
        fc.property(
          // Use integer range to avoid subnormal float edge cases
          fc.integer({ min: -1_000_000, max: 1_000_000 }),
          fc.integer({ min: -1_000_000, max: 1_000_000 }),
          fc.integer({ min: -1_000_000, max: 1_000_000 }),
          (value, a, b) => {
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            if (min === max) return;

            const result = sanitization.sanitizeNumber(value, min, max);
            expect(result).toBeGreaterThanOrEqual(min);
            expect(result).toBeLessThanOrEqual(max);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should throw for NaN and Infinity', () => {
      fc.assert(
        fc.property(fc.constantFrom(NaN, Infinity, -Infinity), (value) => {
          expect(() => sanitization.sanitizeNumber(value)).toThrow(McpError);
        }),
        { numRuns: 10 },
      );
    });

    it('should accept any finite number without min/max', () => {
      fc.assert(
        fc.property(
          fc.double({ noNaN: true, noDefaultInfinity: true }),
          (value) => {
            const result = sanitization.sanitizeNumber(value);
            expect(typeof result).toBe('number');
            expect(result).toBe(value);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('should parse valid numeric strings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1_000_000, max: 1_000_000 }),
          (value) => {
            const result = sanitization.sanitizeNumber(String(value));
            expect(result).toBe(value);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('sanitizeForLogging', () => {
    it('should redact sensitive fields in objects', () => {
      const sensitiveKeys = ['password', 'token', 'secret', 'authorization'];

      fc.assert(
        fc.property(
          fc.constantFrom(...sensitiveKeys),
          fc.string(),
          (key, value) => {
            const obj = { [key]: value, safe: 'visible' };
            const result = sanitization.sanitizeForLogging(obj) as Record<
              string,
              unknown
            >;

            expect(result[key]).toBe('[REDACTED]');
            expect(result.safe).toBe('visible');
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should handle primitive values without throwing', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
          ),
          (value) => {
            expect(() => sanitization.sanitizeForLogging(value)).not.toThrow();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should return primitive values unchanged', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          (value) => {
            const result = sanitization.sanitizeForLogging(value);
            expect(result).toBe(value);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
