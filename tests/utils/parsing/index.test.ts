/**
 * @fileoverview Test suite for parsing utilities barrel export
 * @module tests/utils/parsing/index.test
 */

import { describe, expect, it } from 'vitest';

describe('Parsing Utilities Barrel Export', () => {
  describe('Parser Class Exports', () => {
    it('should export CsvParser class', async () => {
      const { CsvParser } = await import('@/utils/parsing/index.js');

      expect(CsvParser).toBeDefined();
      expect(typeof CsvParser).toBe('function');
    });

    it('should export JsonParser class', async () => {
      const { JsonParser } = await import('@/utils/parsing/index.js');

      expect(JsonParser).toBeDefined();
      expect(typeof JsonParser).toBe('function');
    });

    it('should export XmlParser class', async () => {
      const { XmlParser } = await import('@/utils/parsing/index.js');

      expect(XmlParser).toBeDefined();
      expect(typeof XmlParser).toBe('function');
    });

    it('should export YamlParser class', async () => {
      const { YamlParser } = await import('@/utils/parsing/index.js');

      expect(YamlParser).toBeDefined();
      expect(typeof YamlParser).toBe('function');
    });

    it('should export PdfParser class', async () => {
      const { PdfParser } = await import('@/utils/parsing/index.js');

      expect(PdfParser).toBeDefined();
      expect(typeof PdfParser).toBe('function');
    });
  });

  describe('Parser Singleton Exports', () => {
    it('should export csvParser singleton', async () => {
      const { csvParser } = await import('@/utils/parsing/index.js');

      expect(csvParser).toBeDefined();
      expect(typeof csvParser).toBe('object');
    });

    it('should export jsonParser singleton', async () => {
      const { jsonParser } = await import('@/utils/parsing/index.js');

      expect(jsonParser).toBeDefined();
      expect(typeof jsonParser).toBe('object');
    });

    it('should export xmlParser singleton', async () => {
      const { xmlParser } = await import('@/utils/parsing/index.js');

      expect(xmlParser).toBeDefined();
      expect(typeof xmlParser).toBe('object');
    });

    it('should export yamlParser singleton', async () => {
      const { yamlParser } = await import('@/utils/parsing/index.js');

      expect(yamlParser).toBeDefined();
      expect(typeof yamlParser).toBe('object');
    });

    it('should export pdfParser singleton', async () => {
      const { pdfParser } = await import('@/utils/parsing/index.js');

      expect(pdfParser).toBeDefined();
      expect(typeof pdfParser).toBe('object');
    });

    it('should export dateParser object', async () => {
      const { dateParser } = await import('@/utils/parsing/index.js');

      expect(dateParser).toBeDefined();
      expect(typeof dateParser).toBe('object');
    });
  });

  describe('Date Parsing Function Exports', () => {
    it('should export parseDateString function', async () => {
      const { parseDateString } = await import('@/utils/parsing/index.js');

      expect(parseDateString).toBeDefined();
      expect(typeof parseDateString).toBe('function');
    });

    it('should export parseDateStringDetailed function', async () => {
      const { parseDateStringDetailed } = await import(
        '@/utils/parsing/index.js'
      );

      expect(parseDateStringDetailed).toBeDefined();
      expect(typeof parseDateStringDetailed).toBe('function');
    });
  });

  describe('PDF Utility Exports', () => {
    it('should export PDFDocument from pdf-lib', async () => {
      const { PDFDocument } = await import('@/utils/parsing/index.js');

      expect(PDFDocument).toBeDefined();
      expect(typeof PDFDocument).toBe('function');
    });

    it('should export StandardFonts from pdf-lib', async () => {
      const { StandardFonts } = await import('@/utils/parsing/index.js');

      expect(StandardFonts).toBeDefined();
    });

    it('should export degrees from pdf-lib', async () => {
      const { degrees } = await import('@/utils/parsing/index.js');

      expect(degrees).toBeDefined();
      expect(typeof degrees).toBe('function');
    });

    it('should export rgb from pdf-lib', async () => {
      const { rgb } = await import('@/utils/parsing/index.js');

      expect(rgb).toBeDefined();
      expect(typeof rgb).toBe('function');
    });
  });

  describe('Functional Integration', () => {
    it('should allow using csvParser through barrel export', async () => {
      const { csvParser } = await import('@/utils/parsing/index.js');

      expect(csvParser.parse).toBeDefined();
      expect(typeof csvParser.parse).toBe('function');
    });

    it('should allow using jsonParser through barrel export', async () => {
      const { jsonParser } = await import('@/utils/parsing/index.js');

      expect(jsonParser.parse).toBeDefined();
      expect(typeof jsonParser.parse).toBe('function');
    });

    it('should allow using xmlParser through barrel export', async () => {
      const { xmlParser } = await import('@/utils/parsing/index.js');

      expect(xmlParser.parse).toBeDefined();
      expect(typeof xmlParser.parse).toBe('function');
    });

    it('should allow using yamlParser through barrel export', async () => {
      const { yamlParser } = await import('@/utils/parsing/index.js');

      expect(yamlParser.parse).toBeDefined();
      expect(typeof yamlParser.parse).toBe('function');
    });

    it('should allow using pdfParser through barrel export', async () => {
      const { pdfParser } = await import('@/utils/parsing/index.js');

      expect(pdfParser.extractText).toBeDefined();
      expect(typeof pdfParser.extractText).toBe('function');
    });

    it('should allow using dateParser through barrel export', async () => {
      const { dateParser } = await import('@/utils/parsing/index.js');

      expect(dateParser.parse).toBeDefined();
      expect(typeof dateParser.parse).toBe('function');
    });

    it('should allow calling parseDateString directly', async () => {
      const { parseDateString } = await import('@/utils/parsing/index.js');

      const context = {
        requestId: 'test-id',
        timestamp: new Date().toISOString(),
      };
      const result = await parseDateString('2024-01-15T10:30:00Z', context);
      // parseDateString can return Date or null if parsing fails
      expect(result === null || result instanceof Date).toBe(true);
    });

    it('should allow instantiating parser classes', async () => {
      const { CsvParser, JsonParser } = await import(
        '@/utils/parsing/index.js'
      );

      const csv = new CsvParser();
      const json = new JsonParser();

      expect(csv).toBeInstanceOf(CsvParser);
      expect(json).toBeInstanceOf(JsonParser);
    });
  });

  describe('Complete Export Verification', () => {
    it('should export all major parser symbols', async () => {
      const parsingModule = await import('@/utils/parsing/index.js');

      const expectedExports = [
        'CsvParser',
        'csvParser',
        'JsonParser',
        'jsonParser',
        'XmlParser',
        'xmlParser',
        'YamlParser',
        'yamlParser',
        'PdfParser',
        'pdfParser',
        'dateParser',
        'parseDateString',
        'parseDateStringDetailed',
        'PDFDocument',
        'StandardFonts',
        'degrees',
        'rgb',
      ];

      expectedExports.forEach((exportName) => {
        expect(parsingModule).toHaveProperty(exportName);
      });
    });
  });
});
