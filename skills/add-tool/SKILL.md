---
name: add-tool
description: >
  Scaffold a new MCP tool definition. Use when the user asks to add a tool, create a new tool, or implement a new capability for the server.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: reference
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

import { tool, z } from '@cyanheads/mcp-ts-core';

export const {{TOOL_EXPORT}} = tool('{{tool_name}}', {
  title: '{{TOOL_TITLE}}',
  description: '{{TOOL_DESCRIPTION}}',
  annotations: { readOnlyHint: true },
  input: z.object({
    // All fields need .describe(). Only JSON-Schema-serializable Zod types allowed.
  }),
  output: z.object({
    // All fields need .describe(). Only JSON-Schema-serializable Zod types allowed.
  }),
  // auth: ['tool:{{tool_name}}:read'],

  async handler(input, ctx) {
    ctx.log.info('Processing', { /* relevant input fields */ });
    // Pure logic — throw on failure, no try/catch
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
  output: z.object({ /* ... */ }),

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
import { existingTool } from './existing-tool.tool.js';
import { {{TOOL_EXPORT}} } from './{{tool-name}}.tool.js';

export const allToolDefinitions = [
  existingTool,
  {{TOOL_EXPORT}},
];
```

## Tool Response Design

Tool responses are the LLM's only window into what happened. Every response should leave the agent informed about outcome, current state, and what to do next. This applies to success, partial success, empty results, and errors alike.

### Communicate filtering and exclusions

If the tool omitted, truncated, or filtered anything, say what and how to get it back. Silent omission is invisible to the agent — it can't act on what it doesn't know about.

```typescript
output: z.object({
  items: z.array(ItemSchema).describe('Matching items (up to limit).'),
  totalCount: z.number().describe('Total matches before pagination.'),
  excludedCategories: z.array(z.string()).optional()
    .describe('Categories filtered out by default. Use includeCategories to override.'),
}),
```

### Partial success is not silent success

When an operation affects multiple items and some fail, report both. Don't silently return the successes and swallow the failures.

```typescript
return {
  updated: successfulIds,
  failed: failedItems.map(f => ({ id: f.id, reason: f.error.message })),
  message: `Updated ${successfulIds.length} of ${total}. ${failedItems.length} failed.`,
};
```

### Empty results need context

An empty array with no explanation is a dead end. Echo back the criteria that produced zero results and, where possible, suggest how to broaden the search.

```typescript
// In handler — after getting zero results:
if (results.length === 0) {
  return {
    items: [],
    totalCount: 0,
    message: `No items matched status="${input.status}" in project "${input.project}". `
      + `Try a broader status filter or verify the project name.`,
  };
}
```

### Error messages are recovery instructions

When a tool throws, the error message is the agent's only signal for what to do next. Name what went wrong, why, and what action to take.

```typescript
// Bad — dead end
throw new Error('Not found');

// Good — names resolution options
throw new Error(
  `Project "${input.slug}" not found. Check the slug or use project_list to see available projects.`
);

// Good — structured hint for programmatic recovery
throw new McpError(JsonRpcErrorCode.InvalidParams,
  `Date range exceeds 90-day API limit. Narrow the range or split into multiple queries.`,
  { maxDays: 90, requestedDays: daysBetween },
);
```

### Include operational metadata

Counts, applied filters, truncation notices, and chaining IDs help the agent decide its next action without extra round trips.

```typescript
return {
  commits: formattedCommits,
  total: allCommits.length,
  shown: formattedCommits.length,
  fromRef: input.from,
  toRef: input.to,
  // Post-write state — saves a follow-up status call
  ...(input.operation === 'commit' && { currentStatus: await getStatus() }),
};
```

### Match response density to context budget

Large payloads burn the agent's context window. Default to curated summaries; offer full data via opt-in parameters.

- **Lists**: Return top N with a total count and pagination cursor, not unbounded arrays
- **Large objects**: Return key fields by default; accept a `fields` or `verbose` parameter for full data
- **Binary/blob content**: Return metadata and a reference, not the raw content

## Checklist

- [ ] File created at `src/mcp-server/tools/definitions/{{tool-name}}.tool.ts`
- [ ] All Zod schema fields have `.describe()` annotations
- [ ] Schemas use only JSON-Schema-serializable types (no `z.custom()`, `z.date()`, `z.transform()`, `z.bigint()`, `z.symbol()`, `z.void()`, `z.map()`, `z.set()`)
- [ ] JSDoc `@fileoverview` and `@module` header present
- [ ] `handler(input, ctx)` is pure — throws on failure, no try/catch
- [ ] `auth` scopes declared if the tool needs authorization
- [ ] `task: true` added if the tool is long-running
- [ ] Registered in `definitions/index.ts` barrel and `allToolDefinitions`
- [ ] `bun run devcheck` passes
- [ ] Smoke-tested with `bun run dev:stdio` or `dev:http`
