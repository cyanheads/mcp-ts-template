# 06 — Testing

> Testing strategy post-extraction, plus pre-extraction cleanup of existing test gaps.

---

## Pre-extraction Test Cleanup

The current suite (125 files, 2135 tests, ~10s) is solid but has dead weight and gaps that should be fixed before extraction. These are Phase 1 tasks — they don't change the public API.

### Delete or replace noise tests

**`tests/index.test.ts`** — every test is `expect(true).toBe(true)` or `expect(typeof process.on).toBe('function')`. 80 lines that test nothing. Delete the file and replace with a real `createApp()` integration test after extraction (Phase 3).

**Type-existence tests** — files like `ILlmProvider.test.ts` (2 tests), `ISpeechProvider.test.ts` (4 tests) that just verify an interface or type exists. TypeScript compilation is the test for that. Delete tests that only assert `expect(SomeType).toBeDefined()` with no behavioral verification.

### Fix commented-out TTL test

[storageProviderCompliance.test.ts:209-229](../tests/storage/storageProviderCompliance.test.ts#L209-L229) — the TTL compliance test is commented out, and the `vi.useFakeTimers()` / `vi.useRealTimers()` calls in `beforeEach`/`afterEach` are also commented out. TTL behavior is completely untested across all storage providers.

**Fix:** Uncomment the TTL test. Use per-test `vi.useFakeTimers()` instead of global config (see below).

### Move fake timers to per-test opt-in

`vitest.config.ts` configures `fakeTimers.toFake` globally, but the only test that needs fake timers (storage TTL) has it commented out. Global fake `Date` is a footgun — tests that don't expect it can get subtle failures.

**Fix:** Remove `fakeTimers` from vitest.config.ts. Tests that need fake timers call `vi.useFakeTimers()` in their own `beforeEach` and `vi.useRealTimers()` in `afterEach`.

### Add handler factory execution tests

The handler factory (the "logic throws, handlers catch" contract) is the core framework mechanism, but no test calls the produced handler function end-to-end. [tool-registration.test.ts:237](../tests/mcp-server/tools/tool-registration.test.ts#L237) checks `typeof handler === 'function'` but never invokes it. Only the conformance suite exercises it, and that's coarse.

**Fix:** Add a dedicated test suite for handler factory behavior:
- Valid input → handler returns formatted output
- Logic throws `McpError` → handler returns `isError: true` with error content
- Logic throws unknown error → handler normalizes to `InternalError`
- Definition has `auth` → handler checks scopes before calling `handler`
- Definition has `format` → handler applies formatter to result

### Add HTTP transport integration test

The conformance suite only uses `InMemoryTransport`. No test sends real HTTP to the Hono server. HTTP-specific behavior (CORS, auth middleware pipeline, `/healthz`, session lifecycle) is only unit-tested in isolation.

**Fix:** Add at least one integration test that:
- Boots the Hono server on a random port
- Verifies `/healthz` returns 200
- Sends a tool call via HTTP and verifies the response
- Verifies auth rejection when auth is enabled

### Update conformance harness for `createApp()`

The current harness ([server-harness.ts](../tests/conformance/helpers/server-harness.ts)) calls `composeContainer()` + `createMcpServerInstance()` directly. After extraction, it should use `createApp()` or the underlying building blocks.

---

## Test Ownership

| What | Where | Tests |
|:-----|:------|:------|
| Infrastructure (app wiring, storage, transports, utils, config) | `@cyanheads/mcp-ts-core` | Core's own test suite |
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

Core exports a unified mock factory:

```ts
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
```

This replaces the separate `createMockAppContext()` + `createMockSdkContext()` boilerplate currently duplicated in every server's test files. See [12-developer-api.md](12-developer-api.md) for the full `Context` interface.

### Mock context

```ts
// Minimal — works for most tests
const ctx = createMockContext();

// With tenant (for tools that use ctx.state)
const ctx = createMockContext({ tenantId: 'test-tenant' });

// With sampling capability
const ctx = createMockContext({
  sample: vi.fn().mockResolvedValue({
    role: 'assistant',
    content: { type: 'text', text: 'LLM response' },
    model: 'test-model',
  }),
});

// With elicitation
const ctx = createMockContext({
  elicit: vi.fn().mockResolvedValue({ action: 'accept', data: { format: 'json' } }),
});

// Without capability — test graceful degradation
const ctx = createMockContext(); // no sample, no elicit — undefined by default
```

### Testing tool handlers

Test the `handler` function directly — not via transport. Parse input through the schema first.

```ts
import { describe, expect, it, vi } from 'vitest';
import { createMockContext } from '@cyanheads/mcp-ts-core/testing';
import { JsonRpcErrorCode, McpError } from '@cyanheads/mcp-ts-core/errors';
import { myTool } from '@/mcp-server/tools/definitions/my-tool.tool.js';

describe('myTool', () => {
  it('returns expected output', async () => {
    const ctx = createMockContext();
    const input = myTool.input.parse({ message: 'hello' });
    const result = await myTool.handler(input, ctx);
    expect(result.someField).toBe('expected');
  });

  it('throws McpError on invalid state', async () => {
    const ctx = createMockContext();
    const input = myTool.input.parse({ message: 'TRIGGER_ERROR' });
    await expect(myTool.handler(input, ctx))
      .rejects.toThrow(McpError);
    await expect(myTool.handler(input, ctx))
      .rejects.toHaveProperty('code', JsonRpcErrorCode.ValidationError);
  });

  it('formats response correctly', () => {
    const result = { /* mock output matching OutputSchema */ };
    const blocks = myTool.format?.(result);
    expect(blocks).toBeDefined();
    expect(blocks![0].type).toBe('text');
  });
});
```

### Test isolation

Create separate `createApp()` instances per test suite when tests need independent service state. For unit-testing tool handlers directly, mock `CoreServices` and pass to `setup()`.

---

## Core's Own Tests

After extraction, core's test suite validates:

| Area | What to test |
|:-----|:-------------|
| App wiring | `createApp()` construction order, `setup()` callback, `ServerHandle` lifecycle |
| Handler factory | Input validation → handler → format pipeline; `McpError` propagation; unknown error normalization; inline `auth` enforcement. This is the core "logic throws, handlers catch" contract. |
| Storage | `StorageService` with in-memory provider, validation, pagination, batch ops, TTL |
| Config | `parseConfig` with various env combinations, override precedence |
| Transports | HTTP route registration, stdio message framing |
| HTTP integration | Real HTTP requests to Hono server: `/healthz`, tool call, auth rejection, CORS |
| Auth | JWT verification, scope checking, inline `auth` property enforcement, `checkScopes()` |
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

### Pre-extraction cleanup (Phase 1)
- [ ] `tests/index.test.ts` deleted (all `expect(true).toBe(true)` noise)
- [ ] Type-existence-only tests deleted (verify behavior, not type identity)
- [ ] Storage TTL test uncommented and working in `storageProviderCompliance.test.ts`
- [ ] `fakeTimers` removed from `vitest.config.ts` global config; per-test opt-in instead
- [ ] Handler factory execution tests added (input → handler → format pipeline, error normalization, auth checking)
- [ ] HTTP transport integration test added (real Hono server, `/healthz`, tool call, auth)

### Post-extraction (Phase 3)
- [ ] `createMockContext()` exported from `@cyanheads/mcp-ts-core/testing`
- [ ] `createMockContext` supports optional capability injection (`sample`, `elicit`, `progress`)
- [ ] `createMockContext({ tenantId })` produces context with working `ctx.state`
- [ ] Conformance harness updated to use `createApp()` instead of `composeContainer()`
- [ ] Core test suite covers app wiring, handler factory, storage, config, transports, HTTP integration, auth, utils, worker
- [ ] `examples/` in core CI validates public export contract
- [ ] Server vitest config extends core's base config
