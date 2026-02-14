/**
 * @fileoverview Test suite for the data explorer app tool — data generation,
 * aggregation, response formatting, schema validation, and metadata.
 * @module tests/mcp-server/tools/definitions/template-data-explorer.app-tool.test
 */

import { describe, it, expect, vi } from 'vitest';
import { dataExplorerAppTool } from '@/mcp-server/tools/definitions/template-data-explorer.app-tool.js';
import type { RequestContext } from '@/utils/index.js';

// Suppress logger output
vi.mock('@/utils/index.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe('Data Explorer App Tool', () => {
  const mockContext: RequestContext = {
    requestId: 'test-req',
    timestamp: new Date().toISOString(),
    operation: 'test',
  };
  const mockSdkContext = {} as never;

  // Helper to invoke the wrapped logic (withToolAuth makes it async)
  async function invokeLogic(rowCount: number) {
    return dataExplorerAppTool.logic({ rowCount }, mockContext, mockSdkContext);
  }

  // ─── Metadata ────────────────────────────────────────────────────────────────

  describe('Metadata', () => {
    it('should have correct tool name', () => {
      expect(dataExplorerAppTool.name).toBe('template_data_explorer');
    });

    it('should have a title', () => {
      expect(dataExplorerAppTool.title).toBe('Template Data Explorer');
    });

    it('should have a description', () => {
      expect(dataExplorerAppTool.description).toBeTruthy();
      expect(dataExplorerAppTool.description).toContain('sales data');
    });

    it('should have readOnlyHint annotation', () => {
      expect(dataExplorerAppTool.annotations?.readOnlyHint).toBe(true);
    });

    it('should have UI resource URI in _meta', () => {
      const meta = dataExplorerAppTool._meta as
        | { ui?: { resourceUri?: string } }
        | undefined;
      expect(meta?.ui?.resourceUri).toBe(
        'ui://template-data-explorer/app.html',
      );
    });
  });

  // ─── Schema ──────────────────────────────────────────────────────────────────

  describe('Input Schema', () => {
    const schema = dataExplorerAppTool.inputSchema;

    it('should accept valid rowCount', () => {
      expect(schema.parse({ rowCount: 20 })).toEqual({ rowCount: 20 });
    });

    it('should apply default rowCount of 20', () => {
      expect(schema.parse({})).toEqual({ rowCount: 20 });
    });

    it('should reject rowCount below 5', () => {
      expect(() => schema.parse({ rowCount: 2 })).toThrow();
    });

    it('should reject rowCount above 100', () => {
      expect(() => schema.parse({ rowCount: 200 })).toThrow();
    });

    it('should reject non-integer rowCount', () => {
      expect(() => schema.parse({ rowCount: 10.5 })).toThrow();
    });
  });

  // ─── Logic / Data Generation ─────────────────────────────────────────────────

  describe('Logic', () => {
    it('should generate requested number of rows', async () => {
      const result = await invokeLogic(10);
      expect(result.rows).toHaveLength(10);
    });

    it('should generate rows with correct structure', async () => {
      const result = await invokeLogic(5);
      const row = result.rows[0]!;
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('region');
      expect(row).toHaveProperty('product');
      expect(row).toHaveProperty('units');
      expect(row).toHaveProperty('revenue');
      expect(row).toHaveProperty('date');
    });

    it('should generate sequential IDs starting at 1', async () => {
      const result = await invokeLogic(5);
      expect(result.rows[0]!.id).toBe(1);
      expect(result.rows[4]!.id).toBe(5);
    });

    it('should generate valid date format (YYYY-MM-DD)', async () => {
      const result = await invokeLogic(5);
      for (const row of result.rows) {
        expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('should compute correct summary totalRows', async () => {
      const result = await invokeLogic(15);
      expect(result.summary.totalRows).toBe(15);
    });

    it('should compute correct summary totalRevenue', async () => {
      const result = await invokeLogic(10);
      const expectedRevenue = result.rows.reduce(
        (sum, r) => sum + r.revenue,
        0,
      );
      expect(result.summary.totalRevenue).toBe(expectedRevenue);
    });

    it('should compute correct summary totalUnits', async () => {
      const result = await invokeLogic(10);
      const expectedUnits = result.rows.reduce((sum, r) => sum + r.units, 0);
      expect(result.summary.totalUnits).toBe(expectedUnits);
    });

    it('should include generatedAt ISO timestamp', async () => {
      const result = await invokeLogic(5);
      expect(result.generatedAt).toBeTruthy();
      expect(new Date(result.generatedAt).toISOString()).toBe(
        result.generatedAt,
      );
    });

    it('should validate output against OutputSchema', async () => {
      const result = await invokeLogic(5);
      const parsed = dataExplorerAppTool.outputSchema!.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });

  // ─── Response Formatter ──────────────────────────────────────────────────────

  describe('Response Formatter', () => {
    it('should return ContentBlock array with type text', async () => {
      const result = await invokeLogic(5);
      const blocks = dataExplorerAppTool.responseFormatter!(result);
      expect(blocks).toHaveLength(1);
      expect(blocks[0]!.type).toBe('text');
    });

    it('should include table header and separator', async () => {
      const result = await invokeLogic(5);
      const blocks = dataExplorerAppTool.responseFormatter!(result);
      const text = (blocks[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('ID');
      expect(text).toContain('Region');
      expect(text).toContain('Product');
      expect(text).toContain('---');
    });

    it('should include summary line with totals', async () => {
      const result = await invokeLogic(5);
      const blocks = dataExplorerAppTool.responseFormatter!(result);
      const text = (blocks[0] as { type: 'text'; text: string }).text;
      expect(text).toContain('Total:');
      expect(text).toContain('5 rows');
    });
  });
});
