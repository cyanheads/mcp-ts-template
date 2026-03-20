/**
 * @fileoverview Tests for the data explorer app tool.
 * @module tests/examples/tools/template-data-explorer.app-tool.test
 */

import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
import { describe, expect, it } from 'vitest';
import { dataExplorerAppTool } from '../../../examples/mcp-server/tools/definitions/template-data-explorer.app-tool.js';

describe('dataExplorerAppTool', () => {
  it('generates the requested number of rows', async () => {
    const ctx = createMockContext();
    const input = dataExplorerAppTool.input.parse({ rowCount: 10 });
    const result = await dataExplorerAppTool.handler(input, ctx);
    expect(result.rows).toHaveLength(10);
    expect(result.summary.totalRows).toBe(10);
  });

  it('uses default row count', async () => {
    const ctx = createMockContext();
    const input = dataExplorerAppTool.input.parse({});
    const result = await dataExplorerAppTool.handler(input, ctx);
    expect(result.rows).toHaveLength(20);
  });

  it('generates valid row structure', async () => {
    const ctx = createMockContext();
    const input = dataExplorerAppTool.input.parse({ rowCount: 5 });
    const result = await dataExplorerAppTool.handler(input, ctx);
    for (const row of result.rows) {
      expect(row.id).toBeGreaterThan(0);
      expect(row.region).toBeTruthy();
      expect(row.product).toBeTruthy();
      expect(row.units).toBeGreaterThan(0);
      expect(row.revenue).toBeGreaterThan(0);
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('computes summary correctly', async () => {
    const ctx = createMockContext();
    const input = dataExplorerAppTool.input.parse({ rowCount: 5 });
    const result = await dataExplorerAppTool.handler(input, ctx);
    const expectedUnits = result.rows.reduce((sum, r) => sum + r.units, 0);
    const expectedRevenue = result.rows.reduce((sum, r) => sum + r.revenue, 0);
    expect(result.summary.totalUnits).toBe(expectedUnits);
    expect(result.summary.totalRevenue).toBe(expectedRevenue);
  });

  it('includes generatedAt timestamp', async () => {
    const ctx = createMockContext();
    const input = dataExplorerAppTool.input.parse({ rowCount: 5 });
    const result = await dataExplorerAppTool.handler(input, ctx);
    expect(() => new Date(result.generatedAt).toISOString()).not.toThrow();
  });

  it('formats as JSON block + text table', () => {
    const result = {
      rows: [
        {
          id: 1,
          region: 'North America',
          product: 'Widget Pro',
          units: 100,
          revenue: 5000,
          date: '2026-01-15',
        },
      ],
      generatedAt: '2026-01-15T00:00:00.000Z',
      summary: { totalRows: 1, totalRevenue: 5000, totalUnits: 100 },
    };
    const blocks = dataExplorerAppTool.format!(result);
    expect(blocks).toHaveLength(2);
    expect(() => JSON.parse((blocks[0] as { text: string }).text)).not.toThrow();
    expect((blocks[1] as { text: string }).text).toContain('Widget Pro');
  });
});
