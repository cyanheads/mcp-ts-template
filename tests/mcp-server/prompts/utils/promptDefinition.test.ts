/**
 * @fileoverview Tests for prompt definition interface and builder.
 * @module tests/mcp-server/prompts/utils/promptDefinition.test
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { PromptDefinition } from '@/mcp-server/prompts/utils/promptDefinition.js';
import { prompt } from '@/mcp-server/prompts/utils/promptDefinition.js';

describe('PromptDefinition', () => {
  it('should be satisfiable without an arguments schema', () => {
    const definition: PromptDefinition = {
      name: 'test_prompt',
      description: 'A test prompt',
      generate: () => [{ role: 'user', content: { type: 'text', text: 'Hello' } }],
    };

    expect(definition.name).toBe('test_prompt');
    expect(typeof definition.generate).toBe('function');
  });

  it('should be satisfiable with an arguments schema', () => {
    const argsSchema = z.object({ topic: z.string().describe('The topic') });

    const definition: PromptDefinition<typeof argsSchema> = {
      name: 'review_prompt',
      description: 'A review prompt',
      args: argsSchema,
      generate: (args) => [
        { role: 'user', content: { type: 'text', text: `Review: ${args.topic}` } },
      ],
    };

    expect(definition.args).toBe(argsSchema);
    expect(definition.name).toBe('review_prompt');
  });
});

describe('prompt() builder', () => {
  it('creates a prompt definition with name extracted', () => {
    const def = prompt('my_prompt', {
      description: 'Test prompt',
      generate: () => [{ role: 'user', content: { type: 'text', text: 'Hi' } }],
    });

    expect(def.name).toBe('my_prompt');
    expect(def.description).toBe('Test prompt');
    expect(typeof def.generate).toBe('function');
  });

  it('creates a prompt definition with args schema', () => {
    const def = prompt('review', {
      description: 'Code review',
      args: z.object({ code: z.string().describe('Code to review') }),
      generate: (args) => [
        { role: 'user', content: { type: 'text', text: `Review: ${args.code}` } },
      ],
    });

    expect(def.name).toBe('review');
    expect(def.args).toBeDefined();
    const parsed = def.args!.parse({ code: 'const x = 1;' });
    expect(parsed.code).toBe('const x = 1;');
  });
});
