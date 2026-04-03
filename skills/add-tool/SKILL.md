---
name: add-tool
description: >
  Scaffold a new MCP tool definition. Use when the user asks to add a tool, create a new tool, or implement a new capability for the server.
metadata:
  author: cyanheads
  version: "1.1"
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

  // format() populates MCP content[] — the only field most LLM clients forward
  // to the model. structuredContent (from output) is for programmatic use only.
  // Render ALL data the LLM needs to reason about the result.
  format: (result) => {
    const lines: string[] = [];
    // Render each item with all relevant fields — not just a count or title.
    // A thin one-liner (e.g., "Found 5 items") leaves the model blind to the data.
    for (const item of result.items) {
      lines.push(`## ${item.name}`);
      lines.push(`**ID:** ${item.id} | **Status:** ${item.status}`);
      if (item.description) lines.push(item.description);
    }
    return [{ type: 'text', text: lines.join('\n') }];
  },
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

### Batch input and partial success

When a tool accepts an array of items, some may succeed while others fail. Report both — don't silently return successes and swallow failures.

```typescript
// Output schema — design for per-item results
output: z.object({
  succeeded: z.array(ItemResultSchema).describe('Items that completed successfully.'),
  failed: z.array(z.object({
    id: z.string().describe('Item ID that failed.'),
    error: z.string().describe('What went wrong and how to resolve it.'),
  })).describe('Items that failed with per-item error details.'),
}),

// Handler — collect results, don't throw on individual failures
async handler(input, ctx) {
  const succeeded: ItemResult[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const id of input.ids) {
    try {
      succeeded.push(await processItem(id));
    } catch (err) {
      failed.push({ id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return { succeeded, failed };
},
```

Single-item tools don't need this — they either succeed or throw. The partial success question only arises with array inputs.

**Telemetry:** The framework automatically detects this pattern — when a handler result contains a non-empty `failed` array, the span gets `mcp.tool.partial_success`, `mcp.tool.batch.succeeded_count`, and `mcp.tool.batch.failed_count` attributes. No manual instrumentation needed.

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

### Error classification and messaging

The framework auto-classifies many errors at runtime (HTTP status codes, JS error types, common patterns). Use explicit error factories when you want a specific code and clear recovery guidance; plain `throw new Error()` when auto-classification is sufficient.

**Classify by origin** — different sources need different codes:

```typescript
// Client input error — agent can fix and retry
import { validationError, notFound } from '@cyanheads/mcp-ts-core/errors';
throw validationError(`Invalid date format: "${input.date}". Expected YYYY-MM-DD.`);

// Not found — valid input but entity doesn't exist
throw notFound(
  `Project "${input.slug}" not found. Check the slug or use project_list to see available projects.`
);

// Upstream API — transient, may resolve on retry
import { serviceUnavailable } from '@cyanheads/mcp-ts-core/errors';
throw serviceUnavailable(`arXiv API returned HTTP ${status}. Retry in a few seconds.`);

// Structured hint for programmatic recovery
throw new McpError(JsonRpcErrorCode.InvalidParams,
  `Date range exceeds 90-day API limit. Narrow the range or split into multiple queries.`,
  { maxDays: 90, requestedDays: daysBetween },
);
```

**Error messages are recovery instructions.** Name what went wrong, why, and what action to take. The message is the agent's only signal — a bare "Not found" is a dead end.

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

### Defend against empty values from form-based clients

LLM clients (Claude, Cursor, etc.) only send populated fields. **Form-based clients** (MCP Inspector, web UIs) submit the full schema shape — optional object fields arrive with empty-string inner values instead of `undefined`. Zod's `.optional()` only rejects `undefined`, so `{ minDate: "", maxDate: "" }` passes validation and reaches the handler.

**Don't reject empty strings on optional fields** — that punishes form clients for valid MCP behavior. Instead, guard for meaningful values in the handler:

```typescript
// Schema: keep permissive — accepts empty strings from form clients
input: z.object({
  query: z.string().describe('Search terms'),
  dateRange: z.object({
    minDate: z.string().describe('Start date (YYYY-MM-DD)'),
    maxDate: z.string().describe('End date (YYYY-MM-DD)'),
  }).optional().describe('Restrict results to a date range.'),
}),

// Handler: check for meaningful values, not just object presence
async handler(input, ctx) {
  const params: Record<string, string> = { query: input.query };
  if (input.dateRange?.minDate && input.dateRange?.maxDate) {
    params.minDate = input.dateRange.minDate;
    params.maxDate = input.dateRange.maxDate;
  }
  // ...
},
```

The same applies to optional arrays — use `?.length` guards so empty arrays are skipped, not passed through.

**Required fields are different.** If a string field is required and must be non-empty to be meaningful, `.min(1)` is correct — the client shouldn't have submitted the form without filling it in.

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
- [ ] Optional nested objects guarded for empty inner values from form-based clients (check `?.field` truthiness, not just object presence)
- [ ] `handler(input, ctx)` is pure — throws on failure, no try/catch
- [ ] `format()` renders all data the LLM needs (not just a count or title) — `content[]` is the only field most clients forward to the model
- [ ] `auth` scopes declared if the tool needs authorization
- [ ] `task: true` added if the tool is long-running
- [ ] Registered in `definitions/index.ts` barrel and `allToolDefinitions`
- [ ] `bun run devcheck` passes
- [ ] Smoke-tested with `bun run dev:stdio` or `dev:http`
