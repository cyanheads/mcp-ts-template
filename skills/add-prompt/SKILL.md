---
name: add-prompt
description: >
  Scaffold a new MCP prompt template. Use when the user asks to add a prompt, create a reusable message template, or define a prompt for LLM interactions.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: reference
---

## Context

Prompts use the `prompt()` builder from `@cyanheads/mcp-ts-core`. Each prompt lives in `src/mcp-server/prompts/definitions/` with a `.prompt.ts` suffix and is registered in the barrel `index.ts`.

Prompts are pure message templates — no `Context`, no auth, no side effects.

For the full `prompt()` API, read:

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

## Steps

1. **Ask the user** for the prompt's name, purpose, and arguments
2. **Create the file** at `src/mcp-server/prompts/definitions/{{prompt-name}}.prompt.ts`
3. **Register** the prompt in `src/mcp-server/prompts/definitions/index.ts`
4. **Run `bun run devcheck`** to verify

## Template

```typescript
/**
 * @fileoverview {{PROMPT_DESCRIPTION}}
 * @module mcp-server/prompts/definitions/{{PROMPT_NAME}}
 */

import { z } from 'zod';
import { prompt } from '@cyanheads/mcp-ts-core';

export const {{PROMPT_EXPORT}} = prompt('{{prompt_name}}', {
  description: '{{PROMPT_DESCRIPTION}}',
  args: z.object({
    // All fields need .describe()
  }),
  generate: (args) => [
    {
      role: 'user',
      content: {
        type: 'text',
        text: `{{PROMPT_TEMPLATE_TEXT}}`,
      },
    },
  ],
});
```

### Multi-message prompt

```typescript
generate: (args) => [
  {
    role: 'user',
    content: {
      type: 'text',
      text: `Here is the ${args.type} to review:\n\n${args.content}`,
    },
  },
  {
    role: 'assistant',
    content: {
      type: 'text',
      text: 'I will analyze this carefully. Let me start with...',
    },
  },
],
```

### Barrel registration

```typescript
// src/mcp-server/prompts/definitions/index.ts
import { {{PROMPT_EXPORT}} } from './{{prompt-name}}.prompt.js';
export const allPromptDefinitions = [
  // ... existing prompts
  {{PROMPT_EXPORT}},
];
```

## Checklist

- [ ] File created at `src/mcp-server/prompts/definitions/{{prompt-name}}.prompt.ts`
- [ ] All Zod `args` fields have `.describe()` annotations
- [ ] JSDoc `@fileoverview` and `@module` header present
- [ ] `generate` function returns valid message array
- [ ] No side effects — prompts are pure templates
- [ ] Registered in `definitions/index.ts` barrel and `allPromptDefinitions`
- [ ] `bun run devcheck` passes
