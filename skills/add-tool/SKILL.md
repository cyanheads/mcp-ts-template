---
name: add-tool
description: >
  Scaffold a new MCP tool definition. Use when the user asks to add a tool, create a new tool, or implement a new capability for the server.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Context

Tools use the `tool()` builder from `@cyanheads/mcp-ts-core`. Each tool lives in `src/mcp-server/tools/definitions/` with a `.tool.ts` suffix and is registered in the barrel `index.ts`.

For the full `tool()` API, `Context` interface, and error codes, read:

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

## Steps

1. **Ask the user** for the tool's name, purpose, and input/output shape
2. **Determine if long-running** — if the tool involves streaming, polling, or
   multi-step async work, it should use `task: true`
3. **Create the file** at `src/mcp-server/tools/definitions/{{tool-name}}.tool.ts`
4. **Register** the tool in `src/mcp-server/tools/definitions/index.ts`
5. **Run `bun run devcheck`** to verify
6. **Smoke-test** with `bun run dev:stdio` or `dev:http`

## Template

```typescript
/**
 * @fileoverview {{TOOL_DESCRIPTION}}
 * @module mcp-server/tools/definitions/{{TOOL_NAME}}
 */

import { z } from 'zod';
import { tool } from '@cyanheads/mcp-ts-core';
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

export const {{TOOL_EXPORT}} = tool('{{tool_name}}', {
  description: '{{TOOL_DESCRIPTION}}',
  annotations: { readOnlyHint: true },
  input: z.object({
    // All fields need .describe()
  }),
  output: z.object({
    // All fields need .describe()
  }),
  // auth: ['tool:{{tool_name}}:read'],

  async handler(input, ctx) {
    ctx.log.info('Processing', { /* relevant input fields */ });
    // Pure logic — throw McpError on failure, no try/catch
    return { /* output */ };
  },

  format: (result) => [{ type: 'text', text: JSON.stringify(result, null, 2) }],
});
```

### Task tool variant

Add `task: true` and use `ctx.progress` for long-running operations:

```typescript
export const {{TOOL_EXPORT}} = tool('{{tool_name}}', {
  description: '{{TOOL_DESCRIPTION}}',
  task: true,
  input: z.object({ /* ... */ }),

  async handler(input, ctx) {
    await ctx.progress!.setTotal(totalSteps);
    for (const step of steps) {
      if (ctx.signal.aborted) break;
      await ctx.progress!.update(`Processing: ${step}`);
      // ... do work ...
      await ctx.progress!.increment();
    }
    return { /* output */ };
  },
});
```

### Barrel registration

```typescript
// src/mcp-server/tools/definitions/index.ts
export { {{TOOL_EXPORT}} } from './{{tool-name}}.tool.js';

// Add to allToolDefinitions array
import { {{TOOL_EXPORT}} } from './{{tool-name}}.tool.js';
export const allToolDefinitions = [
  // ... existing tools
  {{TOOL_EXPORT}},
];
```

## Checklist

- [ ] File created at `src/mcp-server/tools/definitions/{{tool-name}}.tool.ts`
- [ ] All Zod schema fields have `.describe()` annotations
- [ ] JSDoc `@fileoverview` and `@module` header present
- [ ] `handler(input, ctx)` is pure — throws `McpError`, no try/catch
- [ ] `auth` scopes declared if the tool needs authorization
- [ ] `task: true` added if the tool is long-running
- [ ] Registered in `definitions/index.ts` barrel and `allToolDefinitions`
- [ ] `bun run devcheck` passes
- [ ] Smoke-tested with `bun run dev:stdio` or `dev:http`
