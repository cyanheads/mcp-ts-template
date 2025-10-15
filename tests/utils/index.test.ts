/**
 * @fileoverview Test suite for utils barrel export
 * @module tests/utils/index.test
 */

import { describe, expect, it } from 'vitest';
import * as utilsIndex from '@/utils/index.js';

describe('Utils Barrel Export', () => {
  describe('Core Exports', () => {
    it('should export logger', () => {
      expect(utilsIndex.logger).toBeDefined();
      expect(typeof utilsIndex.logger).toBe('object');
    });

    it('should export requestContextService', () => {
      expect(utilsIndex.requestContextService).toBeDefined();
      expect(typeof utilsIndex.requestContextService).toBe('object');
    });

    it('should export ErrorHandler', () => {
      expect(utilsIndex.ErrorHandler).toBeDefined();
    });

    it('should export performance utilities', () => {
      expect(utilsIndex.initializePerformance_Hrt).toBeDefined();
      expect(typeof utilsIndex.initializePerformance_Hrt).toBe('function');
    });

    it('should export runtime capabilities', () => {
      expect(utilsIndex.runtimeCaps).toBeDefined();
      expect(typeof utilsIndex.runtimeCaps).toBe('object');
    });

    it('should export health utilities', () => {
      expect(utilsIndex.getHealthSnapshot).toBeDefined();
      expect(typeof utilsIndex.getHealthSnapshot).toBe('function');
    });

    // Note: encoding utilities (stringToBase64, base64ToString) are not currently exported
    // from the utils barrel. If needed, they should be added to the appropriate submodule.
  });

  describe('Parsing Utilities', () => {
    it('should export parsers', () => {
      expect(utilsIndex.jsonParser).toBeDefined();
      expect(utilsIndex.csvParser).toBeDefined();
      expect(utilsIndex.yamlParser).toBeDefined();
      expect(utilsIndex.xmlParser).toBeDefined();
      expect(utilsIndex.pdfParser).toBeDefined();
      expect(utilsIndex.dateParser).toBeDefined();
    });
  });

  describe('Security Utilities', () => {
    it('should export security modules', () => {
      expect(utilsIndex.sanitization).toBeDefined();
      expect(utilsIndex.RateLimiter).toBeDefined();
      expect(utilsIndex.idGenerator).toBeDefined();
    });
  });

  describe('Network & Formatting', () => {
    it('should export fetchWithTimeout', () => {
      expect(utilsIndex.fetchWithTimeout).toBeDefined();
      expect(typeof utilsIndex.fetchWithTimeout).toBe('function');
    });

    it('should export markdown utilities', () => {
      expect(utilsIndex.MarkdownBuilder).toBeDefined();
      expect(utilsIndex.markdown).toBeDefined();
    });
  });

  describe('Scheduling & Metrics', () => {
    // Note: Scheduler class is not exported from the barrel, only scheduler instance
    // estimateTokenCount is part of tokenCounter module, not exported from barrel

    it('should export metrics utilities', () => {
      expect(utilsIndex.measureToolExecution).toBeDefined();
    });
  });

  describe('Pagination', () => {
    it('should export pagination functions', () => {
      expect(utilsIndex.paginateArray).toBeDefined();
      expect(typeof utilsIndex.paginateArray).toBe('function');
      expect(utilsIndex.extractCursor).toBeDefined();
      expect(typeof utilsIndex.extractCursor).toBe('function');
    });
  });

  describe('Module Completeness', () => {
    it('should have a reasonable number of exports', () => {
      const exportCount = Object.keys(utilsIndex).length;
      // Should have at least 20 major exports
      expect(exportCount).toBeGreaterThan(20);
    });

    it('should re-export from multiple subdirectories', () => {
      // Verify we have exports from various categories
      const hasInternal = utilsIndex.logger !== undefined;
      const hasParsing = utilsIndex.jsonParser !== undefined;
      const hasSecurity = utilsIndex.sanitization !== undefined;
      const hasNetwork = utilsIndex.fetchWithTimeout !== undefined;
      const hasFormatting = utilsIndex.markdown !== undefined;
      const hasPagination = utilsIndex.paginateArray !== undefined;

      expect(hasInternal).toBe(true);
      expect(hasParsing).toBe(true);
      expect(hasSecurity).toBe(true);
      expect(hasNetwork).toBe(true);
      expect(hasFormatting).toBe(true);
      expect(hasPagination).toBe(true);
    });
  });
});
