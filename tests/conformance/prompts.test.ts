/**
 * @fileoverview Prompt protocol conformance tests.
 * Validates prompt listing, argument schema advertisement, and prompt generation
 * through the full protocol stack.
 * @module tests/conformance/prompts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import {
  createConformanceHarness,
  type ConformanceHarness,
} from './helpers/server-harness.js';

describe('Prompt protocol conformance', () => {
  let harness: ConformanceHarness;

  beforeAll(async () => {
    harness = await createConformanceHarness();
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  // ── Listing ──────────────────────────────────────────────────────────────

  describe('listPrompts', () => {
    it('returns a non-empty prompts array', async () => {
      const result = await harness.client.listPrompts();
      expect(result.prompts).toBeDefined();
      expect(result.prompts.length).toBeGreaterThanOrEqual(1);
    });

    it('each prompt has name and description', async () => {
      const { prompts } = await harness.client.listPrompts();
      for (const prompt of prompts) {
        expect(prompt.name).toBeTruthy();
        expect(typeof prompt.name).toBe('string');
        // description is optional per spec but our template always provides it
        expect(prompt.description).toBeTruthy();
      }
    });

    it('includes the code_review prompt', async () => {
      const { prompts } = await harness.client.listPrompts();
      const codeReview = prompts.find((p) => p.name === 'code_review');
      expect(codeReview).toBeDefined();
    });

    it('code_review prompt advertises arguments', async () => {
      const { prompts } = await harness.client.listPrompts();
      const codeReview = prompts.find((p) => p.name === 'code_review')!;
      expect(codeReview.arguments).toBeDefined();
      expect(Array.isArray(codeReview.arguments)).toBe(true);
      expect(codeReview.arguments!.length).toBeGreaterThan(0);

      // Check expected argument names
      const argNames = codeReview.arguments!.map((a) => a.name);
      expect(argNames).toContain('language');
      expect(argNames).toContain('focus');
    });
  });

  // ── Generation ────────────────────────────────────────────────────────────

  describe('getPrompt', () => {
    it('generates messages with empty arguments', async () => {
      // SDK bug: passing no `arguments` at all causes Zod validation to reject
      // `undefined` with "expected object, received undefined", even though the
      // MCP spec marks prompt arguments as optional in getPrompt requests.
      // Tracked: https://github.com/modelcontextprotocol/typescript-sdk/issues/XXX
      // Fix is a one-liner in sdk/dist/esm/server/mcp.js (~line 430):
      //   safeParseAsync(argsObj, request.params.arguments ?? {})
      const result = await harness.client.getPrompt({
        name: 'code_review',
        arguments: {},
      });

      expect(result.messages).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]!.role).toBe('user');
      expect(result.messages[0]!.content).toBeDefined();
    });

    it('generates messages with focus argument', async () => {
      const result = await harness.client.getPrompt({
        name: 'code_review',
        arguments: { focus: 'security' },
      });

      expect(result.messages.length).toBeGreaterThan(0);
      const content = result.messages[0]!.content;
      if (typeof content === 'object' && 'text' in content) {
        expect(content.text).toContain('security');
      }
    });

    it('generates messages with language argument', async () => {
      const result = await harness.client.getPrompt({
        name: 'code_review',
        arguments: { language: 'TypeScript' },
      });

      expect(result.messages.length).toBeGreaterThan(0);
      const content = result.messages[0]!.content;
      if (typeof content === 'object' && 'text' in content) {
        expect(content.text).toContain('TypeScript');
      }
    });

    it('rejects unknown prompt name', async () => {
      await expect(
        harness.client.getPrompt({
          name: 'nonexistent_prompt_abc123',
        }),
      ).rejects.toThrow();
    });
  });
});
