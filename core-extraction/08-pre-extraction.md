# 08 — Pre-extraction Cleanup

> DI/wiring fixes, lazy dependency conversion, coupling fixes. All changes are backwards-compatible — the project still works as a standalone server throughout.

---

## DI / Wiring Fixes

### Already resolved

`PromptDefinitions` multi-token exists ([tokens.ts:60-61](../src/container/core/tokens.ts#L60-L61)). `PromptRegistry` takes definitions via constructor injection ([prompt-registration.ts:19](../src/mcp-server/prompts/prompt-registration.ts#L19)). Prompts are multi-registered and resolved via DI in [mcp.ts:49-52,67](../src/container/registrations/mcp.ts#L49-L52).

### Remaining fixes

| # | Issue | Location | Fix | Status |
|:--|:------|:---------|:----|:-------|
| 1 | `src/container/` exists — entire DI system replaced by `createApp()` | [src/container/](../src/container/) | Delete `src/container/` entirely. Implement `createApp()` with direct construction in a new `src/app.ts`. `createMcpServerInstance` and `TransportManager` receive deps as constructor params instead of resolving from container. See [03-config-container.md](03-config-container.md). | **Done** (Phase 1b) |
| 2 | `worker.ts` has hardcoded binding keys | [worker.ts:86-106](../src/worker.ts#L86-L106) | Extract `CoreBindingMappings` as a const; `createWorkerHandler` merges with `extraEnvBindings` (strings -> process.env) and `extraObjectBindings` (KV/R2/D1 -> globalThis) | **Done** (Phase 1a) |
| 3 | `worker.ts` `CloudflareBindings` has index signature | [worker.ts:62](../src/worker.ts#L62) | Remove `[key: string]: unknown` so servers must declare extra bindings via `extends` | **Done** (Phase 1a) |

### `package.json` dep placement bugs

These are misplacements in the current `package.json` that must be fixed before extraction. They don't affect template development (where all deps are installed) but would cause runtime failures in production installs.

| # | Issue | Location | Fix | Status |
|:--|:------|:---------|:----|:-------|
| 3a | `@hono/mcp` in `devDependencies` | [package.json:83](../package.json#L83) | Move to `dependencies` — required at runtime by the HTTP transport (`httpTransport.ts` imports `StreamableHTTPTransport` from it) | **Done** |
| 3b | `diff` only in `devDependencies` and `resolutions` — missing from `dependencies` | [package.json:99](../package.json#L99) (devDeps), [package.json:68](../package.json#L68) (resolutions) | Move `diff` from `devDependencies` to `dependencies`. `resolutions` only pins versions — it doesn't install packages. Without this fix, `diffFormatter.ts` has no runtime install path in production. During extraction it becomes an optional peer (Tier 3). | **Done** |
| 3c | `pino-pretty` in `dependencies` instead of `devDependencies` | [package.json:186](../package.json#L186) | Move to `devDependencies`. The logger already loads it via dynamic `require.resolve()` with try/catch fallback to JSON output ([logger.ts:107-112](../src/utils/internal/logger.ts#L107-L112)). Consumers that want pretty dev output install it themselves. | **Done** |

---

## Coupling Fixes

| # | Issue | Detail | Resolution | Status |
|:--|:------|:-------|:-----------|:-------|
| 4 | `logger.ts` imports `sanitization.ts` | [logger.ts:13](../src/utils/internal/logger.ts#L13) pulls `sanitize-html` + `validator` into startup critical path. Logger only calls `sanitization.getSensitivePinoFields()` ([logger.ts:82,173](../src/utils/internal/logger.ts#L82)) — a static `string[]` for Pino's `redact.paths`. | Inline the field list as a `const` array in `logger.ts`. Remove the import. This fully eliminates the coupling. | **Done** |
| 5 | `openrouter.provider.ts` imports `sanitization.ts` | [openrouter.provider.ts:17](../src/services/llm/providers/openrouter.provider.ts#L17). LLM provider is already Tier 3, so this doesn't change tiering. | Convert to lazy import alongside the `openai` dep, or inline the specific calls. | **Done** (lazy) |
| 6 | `pdf-lib` in `dependencies` | Used by `pdfParser.ts` (PDF creation/modification alongside `unpdf` for extraction). | Both become Tier 3 optional peers — only needed if the server imports `pdfParser`. | Deferred to Phase 3 |

---

## Test Cleanup

Existing test gaps that should be fixed before extraction. These don't change the public API — they improve confidence in the code being extracted.

| # | Issue | Detail | Resolution | Status |
|:--|:------|:-------|:-----------|:-------|
| T1 | `tests/index.test.ts` is noise | Every test is `expect(true).toBe(true)`. Tests nothing, inflates count. | Delete the file. Replace with real `createApp()` integration test in Phase 3. | **Done** |
| T2 | Type-existence-only tests | Files like `ILlmProvider.test.ts` (2 tests), `ISpeechProvider.test.ts` (4 tests) just verify an interface exists. TypeScript compilation is the test. | Delete tests that only assert `expect(SomeType).toBeDefined()` with no behavior. | **Done** |
| T3 | Storage TTL test commented out | [storageProviderCompliance.test.ts:209-229](../tests/storage/storageProviderCompliance.test.ts#L209-L229). `vi.useFakeTimers()` calls also commented out. TTL untested across all providers. | Uncomment TTL test. Use per-test `vi.useFakeTimers()`. | **Done** |
| T4 | Global fake timers in vitest.config.ts | `fakeTimers.toFake` configured globally but only consumer (TTL test) has it commented out. Global fake `Date` is a footgun. | Remove `fakeTimers` from vitest.config.ts. Tests that need it opt in per-test. | **Done** |
| T5 | Handler factory never executed in tests | [tool-registration.test.ts](../tests/mcp-server/tools/tool-registration.test.ts) checks `typeof handler === 'function'` but never calls it. The core "logic throws, handlers catch" contract has no unit test. | Add handler factory execution tests: valid input → output, McpError propagation, unknown error normalization, auth checking, format application. | **Done** (5 tests) |
| T6 | No HTTP transport integration test | Conformance suite only uses `InMemoryTransport`. HTTP-specific behavior (CORS, auth middleware, `/healthz`, session lifecycle) only unit-tested in isolation. | Add integration test: boot Hono server, verify `/healthz`, send tool call via HTTP, verify auth rejection. | **Done** (4 tests) |

---

## Lazy Dependency Conversion

All Tier 3 deps that currently use static `import` need conversion to lazy dynamic `import()` with cached module reference and actionable error on missing dep.

### Already lazy (no work needed)

- `node-cron` (scheduler)
- OTEL SDK packages (instrumentation.ts)

### Conversion table

| # | File | Static dep | Status |
|:--|:-----|:-----------|:-------|
| 7 | [yamlParser.ts](../src/utils/parsing/yamlParser.ts) | `js-yaml` | Not started |
| 8 | [xmlParser.ts](../src/utils/parsing/xmlParser.ts) | `fast-xml-parser` | Not started |
| 9 | [csvParser.ts](../src/utils/parsing/csvParser.ts) | `papaparse` | Not started |
| 10 | [jsonParser.ts](../src/utils/parsing/jsonParser.ts) | `partial-json` | Not started |
| 11 | [pdfParser.ts](../src/utils/parsing/pdfParser.ts) | `unpdf`, `pdf-lib` | Not started |
| 12 | [dateParser.ts](../src/utils/parsing/dateParser.ts) | `chrono-node` | Not started |
| 13 | [diffFormatter.ts](../src/utils/formatting/diffFormatter.ts) | `diff` | Not started |
| 14 | [sanitization.ts](../src/utils/security/sanitization.ts) | `sanitize-html`, `validator` | Not started |
| 15 | [httpTransport.ts](../src/mcp-server/transports/http/httpTransport.ts) | `@hono/otel` — static import at line 14, but only used inside `if (config.openTelemetry.enabled)` at line 90-96. Lazy conversion requires moving the `import()` inside the `if` block, not just swapping the top-level import. The middleware registration becomes async. | Not started |
| 16 | [openrouter.provider.ts](../src/services/llm/providers/openrouter.provider.ts) | `openai` | Not started |
| 17 | [core.ts](../src/container/registrations/core.ts) | `@supabase/supabase-js` (runtime import) | Not started |

### Lazy import template

```ts
let mod: typeof import('some-package') | undefined;

export async function doSomething(input: string) {
  mod ??= await import('some-package').catch(() => {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'Install "some-package" to use this feature: bun add some-package',
    );
  });
  return mod.someFunction(input);
}
```

---

## Execution Order

These cleanup tasks form **Phase 1a**, **Phase 1b**, and **Phase 2** of the [execution sequence](09-execution.md).

**Phase 1a — Fixes & hardening (items 2-6, 3a-3c, T1-T6):**
Dep placement, coupling fixes, worker prep, test cleanup. All additive or corrective — no architectural changes. Low risk, independent items that can be done in any order. Run `devcheck`, commit.

**Phase 1b — DI removal & `createApp()` (item 1):**
Replace the DI container with direct construction. Medium risk, central wiring change. Isolated from 1a to contain blast radius. Run `devcheck`, commit.

**Phase 2 — Lazy dependency conversion (items 7-17):**
Convert all Tier 3 static imports. Run `devcheck` + full test suite, commit. Backwards-compatible.

---

## Master Checklist

### Phase 1a: Fixes & hardening (deps, coupling, worker prep, tests) — **Complete**

**Dep placement fixes:**
- [x] `@hono/mcp` moved from `devDependencies` to `dependencies` (#3a)
- [x] `diff` moved from `devDependencies` to `dependencies` (#3b)
- [x] `pino-pretty` moved from `dependencies` to `devDependencies` (#3c)
- [ ] `pdf-lib` moved to optional peer (#6) — deferred to Phase 3

**Coupling fixes:**
- [x] Logger's `sanitization` import inlined (#4)
- [x] `openrouter.provider.ts` sanitization import made lazy (#5)

**Worker prep:**
- [x] Worker binding keys extracted to `CORE_ENV_BINDINGS` / `CORE_OBJECT_BINDINGS` consts (#2)
- [x] `CloudflareBindings` index signature removed (#3)

**Test cleanup:**
- [x] `tests/index.test.ts` deleted — noise tests (#T1)
- [x] Type-existence-only tests deleted (#T2)
- [x] Storage TTL test uncommented and working (#T3)
- [x] `fakeTimers` removed from `vitest.config.ts` global config (#T4)
- [x] Handler factory execution tests added (#T5)
- [x] HTTP transport integration test added (#T6)

**Gate:**
- [x] `devcheck` passes
- [x] All tests pass

### Phase 1b: DI removal & `createApp()` — **Complete**
- [x] `src/container/` deleted; `createApp()` implemented in `src/app.ts` with direct construction (#1)
- [x] `createMcpServerInstance` receives `McpServerDeps` (registries as params)
- [x] `TransportManager` receives `TaskManager` as 4th constructor param
- [x] Container tests deleted; server/task/transport tests rewritten
- [x] `index.ts` and `worker.ts` updated to use `createApp()`
- [x] `devcheck` passes
- [x] All tests pass (117 files, 2030 tests)

### Phase 2: Lazy dependency conversion
- [ ] `yamlParser.ts` — `js-yaml` lazy (#7)
- [ ] `xmlParser.ts` — `fast-xml-parser` lazy (#8)
- [ ] `csvParser.ts` — `papaparse` lazy (#9)
- [ ] `jsonParser.ts` — `partial-json` lazy (#10)
- [ ] `pdfParser.ts` — `unpdf`, `pdf-lib` lazy (#11)
- [ ] `dateParser.ts` — `chrono-node` lazy (#12)
- [ ] `diffFormatter.ts` — `diff` lazy (#13)
- [ ] `sanitization.ts` — `sanitize-html`, `validator` lazy (#14)
- [ ] `httpTransport.ts` — `@hono/otel` lazy inside OTEL-enabled guard (#15)
- [ ] `openrouter.provider.ts` — `openai` lazy (#16)
- [ ] `core.ts` — `@supabase/supabase-js` lazy (#17)
- [ ] All lazy imports throw `McpError(ConfigurationError)` with install instruction
- [ ] `devcheck` passes
- [ ] Full test suite passes
