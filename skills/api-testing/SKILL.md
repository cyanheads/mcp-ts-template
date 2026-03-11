---
name: api-testing
description: >
  Testing patterns for MCP tool/resource handlers using `createMockContext` and Vitest. Covers mock context options, handler testing, McpError assertions, format testing, Vitest config setup, and test isolation conventions.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Overview

Tests target handler behavior directly — call `handler(input, ctx)`, assert on the return value or thrown error. The framework's handler factory (try/catch, formatting, telemetry) is not involved. Use `createMockContext` from `@cyanheads/mcp-ts-core/testing` to construct the `ctx` argument.

**Philosophy:** Test behavior, not implementation. Refactors should not break tests. Colocate test files with source (`foo.tool.ts` → `foo.tool.test.ts`). Integration tests at I/O boundaries over unit tests of internals.

---

## `createMockContext` options

```ts
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';

createMockContext()                                           // minimal — no state, no optional capabilities
createMockContext({ tenantId: 'test-tenant' })               // enables ctx.state (tenant-scoped storage)
createMockContext({ sample: vi.fn().mockResolvedValue(...) }) // with MCP sampling
createMockContext({ elicit: vi.fn().mockResolvedValue(...) }) // with elicitation
createMockContext({ progress: true })                        // with task progress (ctx.progress populated)
```

| Option | Effect |
|:-------|:-------|
| _(none)_ | Minimal context — `ctx.state` throws, `ctx.elicit`/`ctx.sample`/`ctx.progress` are `undefined` |
| `tenantId` | Enables `ctx.state` with in-memory storage scoped to that tenant |
| `sample` | Assigns a mock function to `ctx.sample` for testing sampling calls |
| `elicit` | Assigns a mock function to `ctx.elicit` for testing elicitation calls |
| `progress` | Populates `ctx.progress` with `{ setTotal, increment, update }` spy functions |

---

## Full test example

```ts
// src/mcp-server/tools/definitions/my-tool.tool.test.ts
import { describe, expect, it, vi } from 'vitest';
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
import { McpError } from '@cyanheads/mcp-ts-core/errors';
import { myTool } from '@/mcp-server/tools/definitions/my-tool.tool.js';

describe('myTool', () => {
  it('returns expected output', async () => {
    const ctx = createMockContext();
    const input = myTool.input.parse({ query: 'hello' });
    const result = await myTool.handler(input, ctx);
    expect(result.result).toBe('Found: hello');
  });

  it('throws McpError on invalid state', async () => {
    const ctx = createMockContext();
    const input = myTool.input.parse({ query: 'TRIGGER_ERROR' });
    await expect(myTool.handler(input, ctx)).rejects.toThrow(McpError);
  });

  it('formats response correctly', () => {
    const result = { result: 'test' };
    const blocks = myTool.format!(result);
    expect(blocks[0].type).toBe('text');
  });
});
```

Key points:

- Parse input through `myTool.input.parse(...)` — validates against the Zod schema and produces the typed input the handler expects.
- Call `myTool.handler(input, ctx)` directly — not through the MCP SDK or any framework wrapper.
- Assert on the return value for happy paths; use `.rejects.toThrow(McpError)` for error paths.
- Test `format` separately if the tool defines one — it is a pure function and needs no `ctx`.

---

## Testing with optional capabilities

```ts
it('uses elicitation when available', async () => {
  const elicit = vi.fn().mockResolvedValue({
    action: 'accept',
    data: { format: 'json' },
  });
  const ctx = createMockContext({ elicit });
  const input = myTool.input.parse({ query: 'hello' });
  await myTool.handler(input, ctx);
  expect(elicit).toHaveBeenCalledOnce();
});

it('uses sampling when available', async () => {
  const sample = vi.fn().mockResolvedValue({
    role: 'assistant',
    content: { type: 'text', text: 'Summary text' },
  });
  const ctx = createMockContext({ sample });
  const input = myTool.input.parse({ query: 'summarize this' });
  const result = await myTool.handler(input, ctx);
  expect(result.summary).toBeDefined();
});

it('handles missing elicitation gracefully', async () => {
  // ctx.elicit is undefined — handler must check before calling
  const ctx = createMockContext();
  const input = myTool.input.parse({ query: 'hello' });
  // Should not throw even when ctx.elicit is absent
  await expect(myTool.handler(input, ctx)).resolves.toBeDefined();
});
```

---

## Vitest config

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import coreConfig from '@cyanheads/mcp-ts-core/vitest.config';

export default defineConfig({
  ...coreConfig,
  resolve: {
    alias: { '@/': new URL('./src/', import.meta.url).pathname },
  },
});
```

The core config sets up ESM, TypeScript, coverage defaults, and test environment. The only server-specific addition is the `@/` path alias pointing to `src/`.

---

## Test isolation

**Construct dependencies fresh in `beforeEach`.** Never share mutable state across tests.

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { initMyService } from '@/services/my-domain/my-service.js';

describe('myTool with service', () => {
  beforeEach(() => {
    // Re-initialize with a fresh instance before each test
    initMyService(mockConfig, mockStorage);
  });

  it('calls service correctly', async () => {
    const ctx = createMockContext({ tenantId: 'test-tenant' });
    // ...
  });
});
```

- Re-init services with `initMyService()` (or equivalent) per test suite — the module-level singleton must be reset so tests don't share state.
- Vitest runs test files in separate worker threads — parallel file execution is safe by default.
- Use `createMockContext({ tenantId })` whenever the handler accesses `ctx.state` — omitting `tenantId` causes `ctx.state` to throw.

---

## McpError assertions

```ts
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

it('throws NotFound for missing resource', async () => {
  const ctx = createMockContext();
  const input = myTool.input.parse({ id: 'nonexistent' });
  await expect(myTool.handler(input, ctx)).rejects.toMatchObject({
    code: JsonRpcErrorCode.NotFound,
  });
});
```

Use `.rejects.toThrow(McpError)` to assert type only. Use `.rejects.toMatchObject({ code: ... })` when the specific error code matters.
