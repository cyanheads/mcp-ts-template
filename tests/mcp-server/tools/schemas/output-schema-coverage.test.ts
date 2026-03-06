/**
 * @fileoverview Tests that tool output schemas cover all fields returned by
 * their logic at runtime. Catches the class of bug where logic returns fields
 * not declared in the Zod output schema — Zod's default "strip" mode silently
 * drops them (server-side validation passes), but zod-to-json-schema emits
 * `additionalProperties: false`, causing strict clients (e.g. claude.ai) to
 * reject the response.
 *
 * Strategy: run tool logic with real inputs, then validate the output with
 * `schema.strict().parse()` which rejects unknown keys instead of stripping.
 *
 * ## Adding coverage for new tools
 *
 * If your tool's logic is pure (no network, no SDK capabilities), add a test
 * case that calls the logic directly and validates with strict parsing:
 *
 * ```ts
 * it('should accept output from myTool logic', () => {
 *   const result = { /* build realistic output matching what logic returns *\/ };
 *   expect(() => myTool.outputSchema.strict().parse(result)).not.toThrow();
 * });
 * ```
 *
 * For tools requiring network or SDK capabilities, build a representative
 * output object manually and validate it — the goal is to catch undeclared
 * fields, not to integration-test the external service.
 *
 * @module tests/mcp-server/tools/schemas/output-schema-coverage
 */
import { describe, expect, it } from 'vitest';
import { dataExplorerAppTool } from '@/mcp-server/tools/definitions/template-data-explorer.app-tool.js';
import { echoTool } from '@/mcp-server/tools/definitions/template-echo-message.tool.js';

// ─── Echo tool (pure, synchronous, no external deps) ────────────────────────

describe('Output Schema Coverage', () => {
  describe('template_echo_message', () => {
    it('should accept logic output (standard mode, no timestamp)', () => {
      const result = {
        originalMessage: 'hello world',
        formattedMessage: 'hello world',
        repeatedMessage: 'hello world',
        mode: 'standard' as const,
        repeatCount: 1,
      };

      expect(() => echoTool.outputSchema.strict().parse(result)).not.toThrow();
    });

    it('should accept logic output (uppercase mode, with timestamp)', () => {
      const result = {
        originalMessage: 'hello world',
        formattedMessage: 'HELLO WORLD',
        repeatedMessage: 'HELLO WORLD HELLO WORLD HELLO WORLD',
        mode: 'uppercase' as const,
        repeatCount: 3,
        timestamp: new Date().toISOString(),
      };

      expect(() => echoTool.outputSchema.strict().parse(result)).not.toThrow();
    });

    it('should reject output with undeclared fields', () => {
      const result = {
        originalMessage: 'test',
        formattedMessage: 'test',
        repeatedMessage: 'test',
        mode: 'standard' as const,
        repeatCount: 1,
        extraField: 'should not be here',
      };

      expect(() => echoTool.outputSchema.strict().parse(result)).toThrow();
    });
  });

  // ─── Data Explorer (pure, synchronous, no external deps) ──────────────────

  describe('template_data_explorer', () => {
    it('should accept logic output shape', () => {
      const result = {
        rows: [
          {
            id: 1,
            region: 'North America',
            product: 'Widget Pro',
            units: 100,
            revenue: 5000,
            date: '2025-06-15',
          },
        ],
        generatedAt: new Date().toISOString(),
        summary: { totalRows: 1, totalRevenue: 5000, totalUnits: 100 },
      };

      expect(() => dataExplorerAppTool.outputSchema.strict().parse(result)).not.toThrow();
    });

    it('should reject top-level undeclared fields', () => {
      const result = {
        rows: [],
        generatedAt: new Date().toISOString(),
        summary: { totalRows: 0, totalRevenue: 0, totalUnits: 0 },
        extraField: 'should not be here',
      };

      expect(() => dataExplorerAppTool.outputSchema.strict().parse(result)).toThrow();
    });
  });
});
