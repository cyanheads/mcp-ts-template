/**
 * @fileoverview Type-satisfaction tests for prompt definition interfaces.
 * Verifies that PromptDefinition is well-formed and usable as a type constraint at runtime.
 * @module tests/mcp-server/prompts/utils/promptDefinition.test
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { PromptDefinition } from '@/mcp-server/prompts/utils/promptDefinition.js';

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
      argumentsSchema: argsSchema,
      generate: (args) => [
        { role: 'user', content: { type: 'text', text: `Review: ${args.topic}` } },
      ],
    };

    expect(definition.argumentsSchema).toBe(argsSchema);
    expect(definition.name).toBe('review_prompt');
  });
});
