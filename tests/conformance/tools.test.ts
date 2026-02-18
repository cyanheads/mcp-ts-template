/**
 * @fileoverview Tool protocol conformance tests.
 * Validates tool listing, invocation, error handling, and content block formatting
 * through the full protocol stack (Client → InMemoryTransport → McpServer).
 *
 * Tools that require external APIs or LLM sampling are skipped.
 * @module tests/conformance/tools
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  createConformanceHarness,
  type ConformanceHarness,
} from './helpers/server-harness.js';
import {
  assertValidContentBlocks,
  assertValidToolEntry,
} from './helpers/assertions.js';

/** Tools that hit external APIs or need LLM — skip in conformance suite. */
const EXTERNAL_TOOLS = new Set([
  'template_cat_fact', // fetches from catfact.ninja
  'template_image_test', // fetches random cat image
  'template_code_review_sampling', // requires LLM via sampling
  'template_madlibs_elicitation', // requires client elicitation support
]);

describe('Tool protocol conformance', () => {
  let harness: ConformanceHarness;

  beforeAll(async () => {
    harness = await createConformanceHarness();
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  // ── Listing ──────────────────────────────────────────────────────────────

  describe('listTools', () => {
    it('returns a non-empty tool list', async () => {
      const result = await harness.client.listTools();
      expect(result.tools.length).toBeGreaterThanOrEqual(5);
    });

    it('every tool has valid protocol fields', async () => {
      const { tools } = await harness.client.listTools();
      for (const tool of tools) {
        assertValidToolEntry(tool);
      }
    });

    it('includes expected self-contained tools', async () => {
      const { tools } = await harness.client.listTools();
      const names = new Set(tools.map((t) => t.name));

      expect(names.has('template_echo_message')).toBe(true);
      expect(names.has('template_data_explorer')).toBe(true);
    });

    it('tools have outputSchema when declared', async () => {
      const { tools } = await harness.client.listTools();
      const echoTool = tools.find((t) => t.name === 'template_echo_message');
      expect(echoTool).toBeDefined();
      expect(echoTool!.outputSchema).toBeDefined();
      expect(echoTool!.outputSchema!.type).toBe('object');
    });

    it('tools include annotations when declared', async () => {
      const { tools } = await harness.client.listTools();
      const echoTool = tools.find((t) => t.name === 'template_echo_message');
      expect(echoTool!.annotations).toBeDefined();
      expect(echoTool!.annotations!.readOnlyHint).toBe(true);
    });
  });

  // ── Echo tool invocation ─────────────────────────────────────────────────

  describe('template_echo_message', () => {
    it('echoes a simple message with correct content blocks', async () => {
      const result = await harness.client.callTool({
        name: 'template_echo_message',
        arguments: { message: 'conformance-test' },
      });

      expect(result).toBeDefined();
      expect('content' in result).toBe(true);

      if ('content' in result) {
        assertValidContentBlocks(result.content as { type: string }[]);

        const textBlock = (
          result.content as { type: string; text?: string }[]
        ).find((b) => b.type === 'text');
        expect(textBlock).toBeDefined();
        expect(textBlock!.text).toContain('conformance-test');
      }
    });

    it('applies uppercase formatting', async () => {
      const result = await harness.client.callTool({
        name: 'template_echo_message',
        arguments: { message: 'hello', mode: 'uppercase' },
      });

      if ('content' in result) {
        const textBlock = (
          result.content as { type: string; text?: string }[]
        ).find((b) => b.type === 'text');
        expect(textBlock!.text).toContain('HELLO');
      }
    });

    it('applies lowercase formatting', async () => {
      const result = await harness.client.callTool({
        name: 'template_echo_message',
        arguments: { message: 'HELLO', mode: 'lowercase' },
      });

      if ('content' in result) {
        const textBlock = (
          result.content as { type: string; text?: string }[]
        ).find((b) => b.type === 'text');
        expect(textBlock!.text).toContain('hello');
      }
    });

    it('repeats the message the requested number of times', async () => {
      const result = await harness.client.callTool({
        name: 'template_echo_message',
        arguments: { message: 'abc', repeat: 3 },
      });

      if ('content' in result) {
        const textBlock = (
          result.content as { type: string; text?: string }[]
        ).find((b) => b.type === 'text');
        expect(textBlock!.text).toContain('abc abc abc');
      }
    });

    it('returns structuredContent with output schema fields', async () => {
      const result = await harness.client.callTool({
        name: 'template_echo_message',
        arguments: { message: 'structured-test' },
      });

      if ('structuredContent' in result && result.structuredContent) {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc.originalMessage).toBe('structured-test');
        expect(sc.formattedMessage).toBe('structured-test');
        expect(sc.mode).toBe('standard');
        expect(sc.repeatCount).toBe(1);
      }
    });

    it('returns isError for deliberate error trigger', async () => {
      // When a tool with outputSchema throws, the SDK client may throw
      // because the error response doesn't conform to the output schema.
      // This is correct protocol behavior — client validates structured content.
      try {
        const result = await harness.client.callTool({
          name: 'template_echo_message',
          arguments: { message: 'TRIGGER_ERROR' },
        });
        // If the SDK returns instead of throwing, isError should be true
        if ('isError' in result) {
          expect(result.isError).toBe(true);
        }
      } catch (error: unknown) {
        // Client-side output schema validation rejects the error response —
        // this confirms the error propagated through the protocol layer
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('output schema');
      }
    });
  });

  // ── Data explorer tool ────────────────────────────────────────────────────

  describe('template_data_explorer', () => {
    it('generates sales data with default row count', async () => {
      const result = await harness.client.callTool({
        name: 'template_data_explorer',
        arguments: {},
      });

      expect('content' in result).toBe(true);
      if ('content' in result) {
        assertValidContentBlocks(result.content as { type: string }[]);
      }
    });

    it('generates requested number of rows', async () => {
      const result = await harness.client.callTool({
        name: 'template_data_explorer',
        arguments: { rowCount: 10 },
      });

      if ('structuredContent' in result && result.structuredContent) {
        const sc = result.structuredContent as {
          rows?: unknown[];
          summary?: { totalRows?: number };
        };
        expect(sc.rows).toHaveLength(10);
        expect(sc.summary?.totalRows).toBe(10);
      }
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns isError for unknown tool', async () => {
      // SDK returns isError: true rather than throwing for unknown tools
      const result = await harness.client.callTool({
        name: 'nonexistent_tool_abc123',
        arguments: {},
      });

      expect('isError' in result).toBe(true);
      expect(result.isError).toBe(true);
      if ('content' in result) {
        const textBlock = (
          result.content as { type: string; text?: string }[]
        ).find((b) => b.type === 'text');
        expect(textBlock!.text).toContain('not found');
      }
    });
  });

  // ── Smoke test for all self-contained tools ───────────────────────────────

  describe('self-contained tool smoke tests', () => {
    it('every non-external tool is callable with minimal input', async () => {
      const { tools } = await harness.client.listTools();

      const minimalInputs: Record<string, Record<string, unknown>> = {
        template_echo_message: { message: 'smoke-test' },
        template_data_explorer: { rowCount: 5 },
      };

      for (const tool of tools) {
        if (EXTERNAL_TOOLS.has(tool.name)) continue;
        // Skip task tools — they have different invocation semantics
        if (tool.execution?.taskSupport === 'required') continue;

        const args = minimalInputs[tool.name] ?? {};
        const result = await harness.client.callTool({
          name: tool.name,
          arguments: args,
        });

        expect(result).toBeDefined();
        if ('content' in result) {
          expect(Array.isArray(result.content)).toBe(true);
        }
      }
    });
  });
});
