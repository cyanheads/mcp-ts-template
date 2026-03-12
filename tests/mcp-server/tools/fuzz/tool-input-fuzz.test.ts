/**
 * @fileoverview Property-based fuzz tests for all registered MCP tool definitions.
 *
 * Automatically derives fast-check arbitraries from each tool's Zod input/output
 * schemas, then asserts universal invariants:
 *
 * - **Layer 1 (Schema Parsing):** Generated inputs always pass `input.safeParse`.
 * - **Layer 2 (Logic Invariants):** Tool handler/logic only throws `McpError`,
 *   and successful outputs validate against `output`/`outputSchema`.
 * - **Layer 3 (Formatter Safety):** `format`/`responseFormatter` never crashes on valid output.
 *
 * Handles both legacy (inputSchema/logic) and new-style (input/handler) definitions.
 *
 * Run via: `bun run test:fuzz`
 *
 * @module tests/mcp-server/tools/fuzz/tool-input-fuzz
 */

import { zxTest } from '@traversable/zod-test';
import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';
import type { ZodObject, ZodRawShape } from 'zod';
import { isTaskToolDefinition } from '@/mcp-server/tasks/utils/taskToolDefinition.js';
import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';
import { createMockContext } from '@/testing/index.js';
import { McpError } from '@/types-global/errors.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

// ---------------------------------------------------------------------------
// Normalization helpers for old/new definition shapes
// ---------------------------------------------------------------------------

interface NormalizedTool {
  call: (input: unknown) => Promise<unknown>;
  formatter?: ((output: unknown) => unknown) | undefined;
  inputSchema: ZodObject<ZodRawShape>;
  name: string;
  outputSchema?: ZodObject<ZodRawShape> | undefined;
}

function normalizeTool(def: Record<string, unknown>): NormalizedTool {
  const inputSchema = (def.inputSchema ?? def.input) as ZodObject<ZodRawShape>;
  const outputSchema = (def.outputSchema ?? def.output) as ZodObject<ZodRawShape> | undefined;

  // New-style: handler(input, ctx); Legacy: logic(input, appContext, sdkContext)
  const call =
    typeof def.handler === 'function'
      ? async (input: unknown) => {
          const ctx = createMockContext({ progress: !!def.task });
          return (def.handler as (...args: unknown[]) => unknown)(input, ctx);
        }
      : async (input: unknown) => {
          const appCtx = requestContextService.createRequestContext({
            operation: `fuzz:${def.name}`,
          });
          const sdkCtx = {
            signal: new AbortController().signal,
            requestId: 'fuzz-test',
            sendNotification: vi.fn(),
            sendRequest: vi.fn(),
          };
          return (def.logic as (...args: unknown[]) => unknown)(input, appCtx, sdkCtx);
        };

  const formatter = (def.format ?? def.responseFormatter) as ((o: unknown) => unknown) | undefined;

  return { name: def.name as string, inputSchema, outputSchema, call, formatter };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const NUM_RUNS = 200;

const LOGIC_SKIP = new Set([
  'template_async_countdown', // task tool with real delays
  'template_cat_fact',
  'template_image_test',
  'template_code_review_sampling',
  'template_madlibs_elicitation',
  'template_data_explorer',
]);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const fuzz = (schema: ZodObject<ZodRawShape>): fc.Arbitrary<Record<string, unknown>> =>
  zxTest.fuzz(schema as any) as any;

const regularDefs = allToolDefinitions.filter((t) => !isTaskToolDefinition(t));
const taskDefs = allToolDefinitions.filter(isTaskToolDefinition);

const regularTools = regularDefs.map((d) => normalizeTool(d as unknown as Record<string, unknown>));
const taskTools = taskDefs.map((d) => normalizeTool(d as unknown as Record<string, unknown>));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Tool Input Fuzz Tests', () => {
  describe('Layer 1: Schema Parsing', () => {
    describe.each(regularTools.map((t) => [t.name, t] as const))('%s', (_name, tool) => {
      it('input.safeParse succeeds for all generated inputs', () => {
        const arb = fuzz(tool.inputSchema);

        fc.assert(
          fc.property(arb, (input) => {
            const parsed = tool.inputSchema.safeParse(input);
            expect(parsed.success).toBe(true);
          }),
          { numRuns: NUM_RUNS },
        );
      });
    });

    describe.each(taskTools.map((t) => [t.name, t] as const))('%s (task tool)', (_name, tool) => {
      it('input.safeParse succeeds for all generated inputs', () => {
        const arb = fuzz(tool.inputSchema);

        fc.assert(
          fc.property(arb, (input) => {
            const parsed = tool.inputSchema.safeParse(input);
            expect(parsed.success).toBe(true);
          }),
          { numRuns: NUM_RUNS },
        );
      });
    });
  });

  describe('Layer 2: Logic Invariants', () => {
    const fuzzableTools = regularTools.filter((t) => !LOGIC_SKIP.has(t.name));

    describe.each(fuzzableTools.map((t) => [t.name, t] as const))('%s', (_name, tool) => {
      it('handler/logic never throws non-McpError exceptions', async () => {
        const arb = fuzz(tool.inputSchema);

        await fc.assert(
          fc.asyncProperty(arb, async (input) => {
            try {
              await tool.call(input);
            } catch (err) {
              expect(err).toBeInstanceOf(McpError);
            }
          }),
          { numRuns: NUM_RUNS },
        );
      });

      it('successful output validates against outputSchema', async () => {
        if (!tool.outputSchema) return;
        const arb = fuzz(tool.inputSchema);

        await fc.assert(
          fc.asyncProperty(arb, async (input) => {
            try {
              const result = await tool.call(input);
              const parsed = tool.outputSchema!.safeParse(result);
              if (!parsed.success) {
                expect.fail(
                  `outputSchema validation failed: ${JSON.stringify(parsed.error.issues, null, 2)}`,
                );
              }
            } catch (err) {
              if (!(err instanceof McpError)) {
                throw err;
              }
            }
          }),
          { numRuns: NUM_RUNS },
        );
      });
    });
  });

  describe('Layer 3: Response Formatter Safety', () => {
    const toolsWithFormatters = regularTools.filter((t) => t.formatter != null);

    describe.each(toolsWithFormatters.map((t) => [t.name, t] as const))('%s', (_name, tool) => {
      it('formatter never crashes on valid output shapes', () => {
        if (!tool.outputSchema) return;
        const arb = fuzz(tool.outputSchema);

        fc.assert(
          fc.property(arb, (output) => {
            const blocks = tool.formatter!(output);
            expect(Array.isArray(blocks)).toBe(true);
            for (const block of blocks as any[]) {
              expect(block).toHaveProperty('type');
            }
          }),
          { numRuns: NUM_RUNS },
        );
      });
    });
  });
});
