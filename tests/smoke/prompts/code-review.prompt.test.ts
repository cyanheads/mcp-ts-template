/**
 * @fileoverview Tests for the code review prompt.
 * @module tests/examples/prompts/code-review.prompt.test
 */
import { describe, expect, it } from 'vitest';
import { codeReviewPrompt } from '../../../examples/mcp-server/prompts/definitions/code-review.prompt.js';

describe('codeReviewPrompt', () => {
  it('generates a user message with default focus', async () => {
    const args = codeReviewPrompt.args!.parse({});
    const messages = await codeReviewPrompt.generate(args);
    expect(messages).toHaveLength(1);
    expect(messages[0]!.role).toBe('user');
    expect((messages[0]!.content as { text: string }).text).toContain('general');
  });

  it('includes language specialization', async () => {
    const args = codeReviewPrompt.args!.parse({ language: 'rust' });
    const messages = await codeReviewPrompt.generate(args);
    expect((messages[0]!.content as { text: string }).text).toContain('rust');
  });

  it('applies security focus', async () => {
    const args = codeReviewPrompt.args!.parse({ focus: 'security' });
    const messages = await codeReviewPrompt.generate(args);
    const text = (messages[0]!.content as { text: string }).text;
    expect(text).toContain('security');
    expect(text).toContain('vulnerabilities');
  });

  it('includes example instructions when requested', async () => {
    const args = codeReviewPrompt.args!.parse({ includeExamples: 'true' });
    const messages = await codeReviewPrompt.generate(args);
    const text = (messages[0]!.content as { text: string }).text;
    expect(text).toContain('example');
  });

  it('excludes example instructions by default', async () => {
    const args = codeReviewPrompt.args!.parse({});
    const messages = await codeReviewPrompt.generate(args);
    const text = (messages[0]!.content as { text: string }).text;
    expect(text).not.toContain('concrete example of how to improve');
  });
});
