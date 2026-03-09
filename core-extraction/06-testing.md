# 06 — Testing

> Testing strategy post-extraction.

---

## Test Ownership

| What | Where | Tests |
|:-----|:------|:------|
| Infrastructure (container, storage, transports, utils, config) | `@cyanheads/mcp-ts-core` | Core's own test suite |
| Tool/resource/prompt logic | Each server repo | Server's test suite |
| Integration (definitions consuming core's public exports) | `examples/` in core | Core CI validates the contract |

## Server-side Vitest Config

```ts
// vitest.config.ts (in the server repo)
import { defineConfig } from 'vitest/config';
import coreConfig from '@cyanheads/mcp-ts-core/vitest.config';

export default defineConfig({
  ...coreConfig,
  resolve: {
    alias: {
      '@/': new URL('./src/', import.meta.url).pathname,
    },
  },
});
```

The `@/` alias in server config points to the server's `src/`, not core's internals. Servers test their own code; core's tests live in core.

## Test Helpers from Core

Core exports a minimal set of test utilities:

```ts
import { createMockSdkContext, createMockAppContext } from '@cyanheads/mcp-ts-core/testing';
```

These replace the boilerplate mock setup currently duplicated in every server's test files.

### Mock SDK context

```ts
// Minimal — add optional capabilities only when testing them
const mockSdkContext = createMockSdkContext();

// With sampling capability
const mockSdkContext = createMockSdkContext({
  createMessage: vi.fn().mockResolvedValue({
    role: 'assistant',
    content: { type: 'text', text: 'LLM response' },
    model: 'test-model',
  }),
});

// Without capability — test graceful degradation
const mockSdkContext = createMockSdkContext(); // no createMessage
```

### Testing tool logic

Test the `logic` function directly — not via transport. Parse input through the schema first.

```ts
import { describe, expect, it, vi } from 'vitest';
import { createMockSdkContext, createMockAppContext } from '@cyanheads/mcp-ts-core/testing';
import { JsonRpcErrorCode, McpError } from '@cyanheads/mcp-ts-core/errors';
import { myTool } from '@/mcp-server/tools/definitions/my-tool.tool.js';

describe('myTool', () => {
  it('returns expected output', async () => {
    const appContext = createMockAppContext();
    const sdkContext = createMockSdkContext();
    const input = myTool.inputSchema.parse({ message: 'hello' });
    const result = await myTool.logic(input, appContext, sdkContext);
    expect(result.someField).toBe('expected');
  });

  it('throws McpError on invalid state', async () => {
    const appContext = createMockAppContext();
    const sdkContext = createMockSdkContext();
    const input = myTool.inputSchema.parse({ message: 'TRIGGER_ERROR' });
    await expect(myTool.logic(input, appContext, sdkContext))
      .rejects.toThrow(McpError);
    await expect(myTool.logic(input, appContext, sdkContext))
      .rejects.toHaveProperty('code', JsonRpcErrorCode.ValidationError);
  });

  it('formats response correctly', () => {
    const result = { /* mock output matching OutputSchema */ };
    const blocks = myTool.responseFormatter?.(result);
    expect(blocks).toBeDefined();
    expect(blocks![0].type).toBe('text');
  });
});
```

### Test isolation

Create separate `createApp()` instances per test suite when tests need independent service state. For unit-testing tool logic directly, mock `CoreServices` and pass to `setup()`.

---

## Core's Own Tests

After extraction, core's test suite validates:

| Area | What to test |
|:-----|:-------------|
| App wiring | `createApp()` construction order, `setup()` callback, `ServerHandle` lifecycle |
| Storage | `StorageService` with in-memory provider, validation, pagination, batch ops |
| Config | `parseConfig` with various env combinations, override precedence |
| Transports | HTTP route registration, stdio message framing |
| Auth | JWT verification, scope checking, `withToolAuth`/`withResourceAuth` wrappers |
| Utils | Each utility module in isolation |
| App lifecycle | `createApp()` lifecycle (init, shutdown, double-shutdown guard) |
| Worker | `createWorkerHandler()` env injection, binding storage, singleton caching |

## Examples as Integration Tests

The `examples/` directory in core acts as an integration test — a thin server consuming core through its public exports (not internal paths). If the examples can't cleanly use the package API, the boundary is wrong.

CI runs:
1. Build core
2. Build examples against core's `dist/`
3. Run examples' tests
4. `devcheck` on examples

---

## Examples Local Resolution

During development and CI, examples resolve `@cyanheads/mcp-ts-core` imports against the local `dist/` output — not a published npm version. This avoids workspace tooling complexity.

**Mechanism:** Examples use `"@cyanheads/mcp-ts-core": "file:.."` in their `package.json`. This creates a symlink to the parent directory, so TypeScript resolves subpath exports through core's `package.json` `exports` field against `dist/`. No workspace linking, no `bun link`.

**CI sequence:**
1. `tsc && tsc-alias` (build core)
2. `cd examples && bun install` (resolves `file:..` symlink)
3. `tsc --noEmit` (type-check examples against core's `dist/`)
4. `bun test` (run example tests)

The published reference template repo (`mcp-ts-template`) uses the real npm version, not `file:`.

---

## Checklist

- [ ] Test helpers exported from `@cyanheads/mcp-ts-core/testing`
- [ ] `createMockSdkContext` supports optional capability injection
- [ ] `createMockAppContext` produces valid `RequestContext`
- [ ] Core test suite covers app wiring (`createApp`), storage, config, transports, auth, utils, worker
- [ ] `examples/` in core CI validates public export contract
- [ ] Server vitest config extends core's base config
