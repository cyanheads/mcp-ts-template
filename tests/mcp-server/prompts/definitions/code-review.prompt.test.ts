/**
 * @fileoverview Test suite for code review prompt definition — metadata, schema,
 * generate function, focus areas, and message structure.
 * @module tests/mcp-server/prompts/definitions/code-review.prompt.test
 */

import { describe, it, expect } from 'vitest';
import { codeReviewPrompt } from '@/mcp-server/prompts/definitions/code-review.prompt.js';
import type { PromptMessage } from '@modelcontextprotocol/sdk/types.js';

// Helper to resolve generate result (handles sync or async return)
async function generate(
  args: Record<string, string> = {},
): Promise<PromptMessage[]> {
  return await codeReviewPrompt.generate(args);
}

function getText(msg: PromptMessage): string {
  return (msg.content as { text: string }).text;
}

describe('Code Review Prompt', () => {
  // ─── Metadata ────────────────────────────────────────────────────────────────

  describe('Metadata', () => {
    it('should have name "code_review"', () => {
      expect(codeReviewPrompt.name).toBe('code_review');
    });

    it('should have a description', () => {
      expect(codeReviewPrompt.description).toBeTruthy();
      expect(codeReviewPrompt.description).toContain('code review');
    });

    it('should have argumentsSchema defined', () => {
      expect(codeReviewPrompt.argumentsSchema).toBeDefined();
    });
  });

  // ─── Schema ──────────────────────────────────────────────────────────────────

  describe('Arguments Schema', () => {
    const schema = codeReviewPrompt.argumentsSchema!;

    it('should accept empty arguments', () => {
      expect(schema.parse({})).toEqual({});
    });

    it('should accept language argument', () => {
      const result = schema.parse({ language: 'TypeScript' });
      expect(result.language).toBe('TypeScript');
    });

    it('should accept focus argument', () => {
      const result = schema.parse({ focus: 'security' });
      expect(result.focus).toBe('security');
    });

    it('should accept includeExamples argument', () => {
      const result = schema.parse({ includeExamples: 'true' });
      expect(result.includeExamples).toBe('true');
    });

    it('should accept all arguments together', () => {
      const result = schema.parse({
        language: 'Python',
        focus: 'performance',
        includeExamples: 'false',
      });
      expect(result).toEqual({
        language: 'Python',
        focus: 'performance',
        includeExamples: 'false',
      });
    });
  });

  // ─── Generate ────────────────────────────────────────────────────────────────

  describe('generate', () => {
    it('should return an array of PromptMessage objects', async () => {
      const messages = await generate();
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should return messages with role and content', async () => {
      const messages = await generate();
      const msg = messages[0]!;
      expect(msg.role).toBe('user');
      expect(msg.content).toBeDefined();
    });

    it('should include "general" focus by default', async () => {
      const messages = await generate();
      const text = getText(messages[0]!);
      expect(text).toContain('general');
      expect(text).toContain('Overall code quality');
    });

    it('should include security guidance when focus is security', async () => {
      const messages = await generate({ focus: 'security' });
      const text = getText(messages[0]!);
      expect(text).toContain('security');
      expect(text).toContain('vulnerabilities');
    });

    it('should include performance guidance when focus is performance', async () => {
      const messages = await generate({ focus: 'performance' });
      const text = getText(messages[0]!);
      expect(text).toContain('performance');
      expect(text).toContain('bottlenecks');
    });

    it('should include style guidance when focus is style', async () => {
      const messages = await generate({ focus: 'style' });
      const text = getText(messages[0]!);
      expect(text).toContain('readability');
      expect(text).toContain('Naming conventions');
    });

    it('should include language specialization when provided', async () => {
      const messages = await generate({ language: 'Rust' });
      const text = getText(messages[0]!);
      expect(text).toContain('Rust');
    });

    it('should not mention language when not provided', async () => {
      const messages = await generate();
      const text = getText(messages[0]!);
      expect(text).not.toContain('specializing in');
    });

    it('should include examples instruction when includeExamples is "true"', async () => {
      const messages = await generate({ includeExamples: 'true' });
      const text = getText(messages[0]!);
      expect(text).toContain('concrete example');
    });

    it('should not include examples instruction when includeExamples is "false"', async () => {
      const messages = await generate({ includeExamples: 'false' });
      const text = getText(messages[0]!);
      expect(text).not.toContain('concrete example');
    });

    it('should include structured review sections', async () => {
      const messages = await generate();
      const text = getText(messages[0]!);
      expect(text).toContain('Summary');
      expect(text).toContain('Key Findings');
      expect(text).toContain('Critical Issues');
      expect(text).toContain('Recommendations');
    });
  });
});
