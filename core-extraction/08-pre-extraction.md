# 08 — Pre-extraction Cleanup

> DI/wiring fixes, lazy dependency conversion, coupling fixes. All changes are backwards-compatible — the project still works as a standalone server throughout.

---

## DI / Wiring Fixes

### Already resolved

`PromptDefinitions` multi-token exists ([tokens.ts:60-61](../src/container/core/tokens.ts#L60-L61)). `PromptRegistry` takes definitions via constructor injection ([prompt-registration.ts:19](../src/mcp-server/prompts/prompt-registration.ts#L19)). Prompts are multi-registered and resolved via DI in [mcp.ts:49-52,67](../src/container/registrations/mcp.ts#L49-L52).

### Remaining fixes

| # | Issue | Location | Fix | Status |
|:--|:------|:---------|:----|:-------|
| 1 | `src/container/` exists — entire DI system replaced by `createApp()` | [src/container/](../src/container/) | Delete `src/container/` entirely. Implement `createApp()` with direct construction in a new `src/app.ts`. `createMcpServerInstance` and `TransportManager` receive deps as constructor params instead of resolving from container. See [03-config-container.md](03-config-container.md). | Not started |
| 2 | `worker.ts` has hardcoded binding keys | [worker.ts:86-106](../src/worker.ts#L86-L106) | Extract `CoreBindingMappings` as a const; `createWorkerHandler` merges with `extraEnvBindings` (strings -> process.env) and `extraObjectBindings` (KV/R2/D1 -> globalThis) | Not started |
| 3 | `worker.ts` `CloudflareBindings` has index signature | [worker.ts:62](../src/worker.ts#L62) | Remove `[key: string]: unknown` so servers must declare extra bindings via `extends` | Not started |

### `package.json` dep placement bugs

These are misplacements in the current `package.json` that must be fixed before extraction. They don't affect template development (where all deps are installed) but would cause runtime failures in production installs.

| # | Issue | Location | Fix | Status |
|:--|:------|:---------|:----|:-------|
| 3a | `@hono/mcp` in `devDependencies` | [package.json:83](../package.json#L83) | Move to `dependencies` — required at runtime by the HTTP transport (`httpTransport.ts` imports `StreamableHTTPTransport` from it) | Not started |
| 3b | `diff` duplicated in both `dependencies` and `devDependencies` | [package.json:68](../package.json#L68), [package.json:99](../package.json#L99) | Remove the `devDependencies` duplicate (pinned `8.0.3` already in `dependencies`). During extraction it becomes an optional peer (Tier 3). | Not started |

---

## Coupling Fixes

| # | Issue | Detail | Resolution | Status |
|:--|:------|:-------|:-----------|:-------|
| 4 | `logger.ts` imports `sanitization.ts` | [logger.ts:13](../src/utils/internal/logger.ts#L13) pulls `sanitize-html` + `validator` into startup critical path. Logger only calls `sanitization.getSensitivePinoFields()` ([logger.ts:82,173](../src/utils/internal/logger.ts#L82)) — a static `string[]` for Pino's `redact.paths`. | Inline the field list as a `const` array in `logger.ts`. Remove the import. This fully eliminates the coupling. | Not started |
| 5 | `openrouter.provider.ts` imports `sanitization.ts` | [openrouter.provider.ts:17](../src/services/llm/providers/openrouter.provider.ts#L17). LLM provider is already Tier 3, so this doesn't change tiering. | Convert to lazy import alongside the `openai` dep, or inline the specific calls. | Not started |
| 6 | `pdf-lib` in `dependencies` | Used by `pdfParser.ts` (PDF creation/modification alongside `unpdf` for extraction). | Both become Tier 3 optional peers — only needed if the server imports `pdfParser`. | Not started |

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

These cleanup tasks form **Phase 1** and **Phase 2** of the [execution sequence](09-execution.md).

**Phase 1 — DI/wiring + coupling (items 1-6):**
Small, non-breaking changes that align the code with the extraction boundary. Run `devcheck`, commit.

**Phase 2 — Lazy dependency conversion (items 7-17):**
Convert all Tier 3 static imports. Run `devcheck` + full test suite, commit. Backwards-compatible.

---

## Master Checklist

### Phase 1: DI removal + wiring + coupling + dep placement
- [ ] `@hono/mcp` moved from `devDependencies` to `dependencies` (#3a)
- [ ] `diff` duplicate removed from `devDependencies` (already in `dependencies`) (#3b)
- [ ] `src/container/` deleted; `createApp()` implemented in `src/app.ts` with direct construction (#1)
- [ ] `createMcpServerInstance` receives registries as params (not via container)
- [ ] `TransportManager` receives deps as constructor params (not via container)
- [ ] Container tests deleted or rewritten as `createApp()` integration tests
- [ ] Worker binding keys extracted to `CoreBindingMappings` const (#2)
- [ ] `CloudflareBindings` index signature removed (#3)
- [ ] Logger's `sanitization` import inlined (#4)
- [ ] `openrouter.provider.ts` sanitization import made lazy or inlined (#5)
- [ ] `pdf-lib` moved to optional peer (#6)
- [ ] `devcheck` passes
- [ ] All tests pass

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
