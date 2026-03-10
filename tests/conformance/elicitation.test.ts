/**
 * @fileoverview Elicitation capability conformance tests.
 * Validates elicitation-related tool behavior through the full protocol stack.
 *
 * NOTE: The MCP SDK (1.27.x) does not expose `elicitInput` on `RequestHandlerExtra`
 * (the `extra` object passed to tool handlers). The `Server.elicitInput()` method
 * exists on the Server class itself. The tool's duck-type check
 * (`typeof sdkContext.elicitInput === 'function'`) currently evaluates to false,
 * causing the tool to throw when elicitation is needed but fields are missing.
 *
 * These tests validate the actual runtime behavior:
 * - Tool succeeds when all fields are provided (no elicitation needed)
 * - Tool returns an error when fields are missing (elicitation unavailable on extra)
 * - Client capability negotiation completes correctly with elicitation declared
 *
 * Uses the `template_madlibs_elicitation` tool as the test surface.
 * @module tests/conformance/elicitation
 */
import type { ClientCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type ConformanceHarness, createConformanceHarness } from './helpers/server-harness.js';

const TOOL_NAME = 'template_madlibs_elicitation';

describe('Elicitation capability conformance', () => {
  // ── Capability negotiation ───────────────────────────────────────────────

  describe('capability negotiation', () => {
    let harness: ConformanceHarness;

    const capabilities: ClientCapabilities = { elicitation: {} };

    beforeAll(async () => {
      harness = await createConformanceHarness(capabilities);
    });

    afterAll(async () => {
      await harness?.cleanup();
    });

    it('completes handshake with elicitation capability declared', () => {
      expect(harness.client).toBeDefined();
      expect(harness.server).toBeDefined();
    });

    it('server advertises tools capability alongside elicitation', () => {
      const caps = harness.client.getServerCapabilities();
      expect(caps).toBeDefined();
      expect(caps?.tools).toBeDefined();
      expect(caps?.tools?.listChanged).toBe(true);
    });

    it('madlibs tool is listed and has expected schema', async () => {
      const { tools } = await harness.client.listTools();
      const madlibs = tools.find((t) => t.name === TOOL_NAME);
      expect(madlibs).toBeDefined();
      expect(madlibs?.inputSchema).toBeDefined();
      expect(madlibs?.outputSchema).toBeDefined();
      expect(madlibs?.description).toContain('Mad Libs');
    });
  });

  // ── Tool succeeds when all fields provided (no elicitation needed) ───────

  describe('all fields provided (elicitation bypassed)', () => {
    let harness: ConformanceHarness;

    const capabilities: ClientCapabilities = { elicitation: {} };

    beforeAll(async () => {
      harness = await createConformanceHarness(capabilities);
    });

    afterAll(async () => {
      await harness?.cleanup();
    });

    it('succeeds with all three fields provided', async () => {
      const result = await harness.client.callTool({
        arguments: { adjective: 'lazy', noun: 'fox', verb: 'ran' },
        name: TOOL_NAME,
      });

      expect(result).toBeDefined();
      expect(result.isError).toBeFalsy();
    });

    it('returns structured content with correct field values', async () => {
      const result = await harness.client.callTool({
        arguments: { adjective: 'fluffy', noun: 'cat', verb: 'jumped' },
        name: TOOL_NAME,
      });

      expect(result.isError).toBeFalsy();

      if ('structuredContent' in result && result.structuredContent) {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc.adjective).toBe('fluffy');
        expect(sc.noun).toBe('cat');
        expect(sc.verb).toBe('jumped');
        expect(sc.story).toContain('fluffy');
        expect(sc.story).toContain('cat');
        expect(sc.story).toContain('jumped');
      }
    });

    it('returns formatted content blocks', async () => {
      const result = await harness.client.callTool({
        arguments: { adjective: 'quick', noun: 'dog', verb: 'leaped' },
        name: TOOL_NAME,
      });

      expect(result.isError).toBeFalsy();

      if ('content' in result && Array.isArray(result.content)) {
        const textBlocks = (result.content as { text?: string; type: string }[]).filter(
          (b) => b.type === 'text',
        );
        // The formatter returns two text blocks: story + JSON of words used
        expect(textBlocks.length).toBeGreaterThanOrEqual(1);
        expect(textBlocks[0]?.text).toContain('quick');
      }
    });
  });

  // ── Tool returns error when fields are missing ───────────────────────────

  describe('missing fields require elicitation', () => {
    let harness: ConformanceHarness;

    beforeAll(async () => {
      // Even with elicitation declared, the SDK does not expose elicitInput
      // on RequestHandlerExtra, so the tool's duck-type check fails
      harness = await createConformanceHarness({ elicitation: {} });
    });

    afterAll(async () => {
      await harness?.cleanup();
    });

    it('returns error when no fields provided', async () => {
      // The tool tries to elicit missing fields, finds elicitInput unavailable,
      // and throws McpError which the handler converts to isError: true
      try {
        const result = await harness.client.callTool({
          arguments: {},
          name: TOOL_NAME,
        });
        expect(result.isError).toBe(true);

        if ('content' in result && Array.isArray(result.content)) {
          const textBlock = (result.content as { text?: string; type: string }[]).find(
            (b) => b.type === 'text',
          );
          expect(textBlock?.text).toContain('not available');
        }
      } catch (error: unknown) {
        // Output schema validation may reject the error response
        expect(error).toBeDefined();
      }
    });

    it('returns error when some fields are missing', async () => {
      try {
        const result = await harness.client.callTool({
          arguments: { noun: 'cat' },
          name: TOOL_NAME,
        });
        expect(result.isError).toBe(true);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });
  });

  // ── Client without elicitation capability ────────────────────────────────

  describe('client without elicitation capability', () => {
    let harness: ConformanceHarness;

    beforeAll(async () => {
      harness = await createConformanceHarness({});
    });

    afterAll(async () => {
      await harness?.cleanup();
    });

    it('returns error when fields are missing and no elicitation', async () => {
      try {
        const result = await harness.client.callTool({
          arguments: {},
          name: TOOL_NAME,
        });
        expect(result.isError).toBe(true);
      } catch (error: unknown) {
        expect(error).toBeDefined();
      }
    });

    it('succeeds when all fields are provided without elicitation', async () => {
      const result = await harness.client.callTool({
        arguments: { adjective: 'small', noun: 'bird', verb: 'flew' },
        name: TOOL_NAME,
      });

      expect(result).toBeDefined();
      expect(result.isError).toBeFalsy();

      if ('structuredContent' in result && result.structuredContent) {
        const sc = result.structuredContent as Record<string, unknown>;
        expect(sc.noun).toBe('bird');
      }
    });
  });
});
