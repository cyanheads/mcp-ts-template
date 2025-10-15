/**
 * @fileoverview Test suite for security utilities barrel export
 * @module tests/utils/security/index.test
 */

import { describe, expect, it } from 'vitest';

describe('Security Utilities Barrel Export', () => {
  describe('Exports from idGenerator.ts', () => {
    it('should export IdGenerator class', async () => {
      const { IdGenerator } = await import('@/utils/security/index.js');

      expect(IdGenerator).toBeDefined();
      expect(typeof IdGenerator).toBe('function');
    });

    it('should export generateUUID function', async () => {
      const { generateUUID } = await import('@/utils/security/index.js');

      expect(generateUUID).toBeDefined();
      expect(typeof generateUUID).toBe('function');
    });

    it('should export generateRequestContextId function', async () => {
      const { generateRequestContextId } = await import(
        '@/utils/security/index.js'
      );

      expect(generateRequestContextId).toBeDefined();
      expect(typeof generateRequestContextId).toBe('function');
    });

    it('should allow IdGenerator to be instantiated', async () => {
      const { IdGenerator } = await import('@/utils/security/index.js');

      const prefixes = { user: 'USR', project: 'PROJ' };
      const generator = new IdGenerator(prefixes);

      expect(generator).toBeInstanceOf(IdGenerator);
    });

    it('should allow generateUUID to be called', async () => {
      const { generateUUID } = await import('@/utils/security/index.js');

      const uuid = generateUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should allow generateRequestContextId to be called', async () => {
      const { generateRequestContextId } = await import(
        '@/utils/security/index.js'
      );

      const id = generateRequestContextId();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
    });
  });

  describe('Exports from rateLimiter.ts', () => {
    it('should export RateLimiter class', async () => {
      const { RateLimiter } = await import('@/utils/security/index.js');

      expect(RateLimiter).toBeDefined();
      expect(typeof RateLimiter).toBe('function');
    });

    it('should allow RateLimiter to be instantiated', async () => {
      const { RateLimiter } = await import('@/utils/security/index.js');
      const { config } = await import('@/config/index.js');
      const { logger } = await import('@/utils/index.js');

      const limiter = new RateLimiter(config, logger as never);
      expect(limiter).toBeInstanceOf(RateLimiter);
    });
  });

  describe('Exports from sanitization.ts', () => {
    it('should export sanitization singleton object', async () => {
      const { sanitization } = await import('@/utils/security/index.js');

      expect(sanitization).toBeDefined();
      expect(typeof sanitization).toBe('object');
    });

    it('should have sanitizeString method', async () => {
      const { sanitization } = await import('@/utils/security/index.js');

      expect(sanitization.sanitizeString).toBeDefined();
      expect(typeof sanitization.sanitizeString).toBe('function');
    });

    it('should have sanitizeHtml method', async () => {
      const { sanitization } = await import('@/utils/security/index.js');

      expect(sanitization.sanitizeHtml).toBeDefined();
      expect(typeof sanitization.sanitizeHtml).toBe('function');
    });

    it('should have sanitizePath method', async () => {
      const { sanitization } = await import('@/utils/security/index.js');

      expect(sanitization.sanitizePath).toBeDefined();
      expect(typeof sanitization.sanitizePath).toBe('function');
    });
  });

  describe('Complete Export Verification', () => {
    it('should export all expected symbols', async () => {
      const securityModule = await import('@/utils/security/index.js');

      const expectedExports = [
        'IdGenerator',
        'generateUUID',
        'generateRequestContextId',
        'RateLimiter',
        'sanitization',
      ];

      expectedExports.forEach((exportName) => {
        expect(securityModule).toHaveProperty(exportName);
      });
    });
  });

  describe('Functional Integration', () => {
    it('should allow using IdGenerator through barrel export', async () => {
      const { IdGenerator } = await import('@/utils/security/index.js');

      const prefixes = { test: 'TEST' };
      const generator = new IdGenerator(prefixes);
      const id = generator.generateForEntity('test');

      expect(id).toMatch(/^TEST_/);
    });

    it('should allow using generateUUID through barrel export', async () => {
      const { generateUUID } = await import('@/utils/security/index.js');

      const uuid1 = generateUUID();
      const uuid2 = generateUUID();

      expect(uuid1).not.toBe(uuid2);
      expect(uuid1.length).toBeGreaterThan(0);
    });

    it('should allow using RateLimiter through barrel export', async () => {
      const { RateLimiter } = await import('@/utils/security/index.js');
      const { config } = await import('@/config/index.js');
      const { logger } = await import('@/utils/index.js');

      const limiter = new RateLimiter(config, logger as never);

      // Verify the instance was created successfully
      expect(limiter).toBeDefined();
      expect(typeof limiter.check).toBe('function');
      expect(typeof limiter.getStatus).toBe('function');
    });

    it('should allow using sanitization through barrel export', async () => {
      const { sanitization } = await import('@/utils/security/index.js');

      const dirty = '<script>alert("xss")</script>Hello';
      const clean = sanitization.sanitizeString(dirty, { context: 'text' });

      expect(clean).toBeDefined();
      expect(typeof clean).toBe('string');
      expect(clean).not.toContain('<script>');
    });
  });
});
