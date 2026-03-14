# 09 — Execution Sequence

> Phased execution with per-phase checklists and acceptance criteria.

---

## Phase Overview

| Phase | Description | Depends on | Risk | Status |
|:------|:------------|:-----------|:-----|:-------|
| 1a | Fixes & hardening (deps, coupling, tests) | — | Low (additive, non-breaking) | **Complete** (`3cd85b1` on main) |
| 1b | DI removal & `createApp()` | Phase 1a | Medium (central wiring) | **Complete** (`708bd16` on feat/core-extraction) |
| 2 | Lazy dependency conversion | Phase 1b | Low (backwards-compatible) | **Complete** |
| 3 | Repo transformation (the extraction) | Phase 2 | Medium (breaking rename) | **In progress** |
| 4 | Validate with examples | Phase 3 | Low | Not started |
| 5 | Publish `@cyanheads/mcp-ts-core@0.1.0` | Phase 4 | Medium (public API) | Not started |

---

## Phase 1a: Fixes & Hardening

Dependency placement fixes, coupling fixes, worker prep, and test cleanup. All additive or corrective — no architectural changes. The project continues working as a standalone server throughout.

**Detail doc:** [08-pre-extraction.md](08-pre-extraction.md) (items 2-6, 3a-3c, T1-T6), [06-testing.md](06-testing.md)

### Dep placement fixes
- [x] `@hono/mcp` moved from `devDependencies` to `dependencies` (#3a)
- [x] `diff` moved from `devDependencies` to `dependencies` (#3b)
- [x] `pino-pretty` moved from `dependencies` to `devDependencies` (#3c)
- [ ] `pdf-lib` moved to optional peer (#6) — deferred to Phase 3 (tiering)

### Coupling fixes
- [x] Logger's `sanitization` import inlined as `const` array (#4)
- [x] `openrouter.provider.ts` sanitization import made lazy or inlined (#5)

### Worker prep
- [x] Worker binding keys extracted to `CORE_ENV_BINDINGS` / `CORE_OBJECT_BINDINGS` consts (#2)
- [x] `CloudflareBindings` index signature removed (#3)

### Test cleanup
- [x] `tests/index.test.ts` deleted — noise tests (#T1)
- [x] Type-existence-only tests deleted (#T2)
- [x] Storage TTL test uncommented and working (#T3)
- [x] `fakeTimers` removed from `vitest.config.ts` global config; per-test opt-in (#T4)
- [x] Handler factory execution tests added (#T5)
- [x] HTTP transport integration test added (#T6)

### Gate
- [x] `bun run devcheck` passes
- [x] All tests pass
- [x] Committed (`3cd85b1` on main)

---

## Phase 1b: DI Removal & `createApp()`

Replace the DI container with direct construction in `createApp()`. This is the central wiring change — isolated from the fixes in 1a to contain blast radius.

**Detail doc:** [08-pre-extraction.md](08-pre-extraction.md) (item 1), [03-config-container.md](03-config-container.md)

### Checklist
- [x] `src/container/` deleted entirely (container, tokens, registrations, barrel)
- [x] `createApp()` implemented in `src/app.ts` with direct service construction
- [x] `createMcpServerInstance` receives `McpServerDeps` (registries as params, not via container)
- [x] `TransportManager` receives `TaskManager` as 4th constructor param (not via container)
- [x] Container tests deleted; server/task/transport tests rewritten with direct construction
- [x] `index.ts` and `worker.ts` updated to use `createApp()`
- [x] `bun run devcheck` passes
- [x] All tests pass (117 files, 2030 tests)
- [x] Committed (`708bd16` on feat/core-extraction)

---

## Phase 2: Lazy Dependency Conversion

Convert all Tier 3 static imports to lazy dynamic `import()`. Backwards-compatible.

**Depends on Phase 1b.** Lazy conversion touches files that may have changed during DI removal.

**Detail doc:** [08-pre-extraction.md](08-pre-extraction.md) (items 7-17), [04-dependencies.md](04-dependencies.md)

### Checklist
- [x] All 11 files converted to lazy imports (see conversion table)
- [x] Each lazy import throws `McpError(ConfigurationError)` with install instruction
- [x] `bun run devcheck` passes
- [x] Full test suite passes (236 tests across 10 modified files)
- [x] Committed (`83e50ac` on feat/core-extraction)

---

## Phase 3: Repo Transformation

The core of the extraction. Transform the repo in-place.

**Detail docs:** [01-architecture.md](01-architecture.md), [02-public-api.md](02-public-api.md), [03-config-container.md](03-config-container.md), [03a-build.md](03a-build.md), [12-developer-api.md](12-developer-api.md)

### Checklist

#### Foundation (Context, builders, testing)
- [x] `Context` interface defined and exported from `./context`
- [x] `createContext()` factory constructs `Context` from `RequestContext` + `SdkContext` + services
- [x] `ContextLogger` delegates to Logger (Pino wrapper) with auto-correlated request metadata
- [x] `ContextState` delegates to `StorageService` with tenant scoping
- [x] `ContextProgress` wraps `TaskStore` status updates
- [x] Test helpers implemented in `src/testing/index.ts` (`createMockContext`)
- [x] `tool()` builder exported from `./tools` and `.`
- [x] `ToolDefinition` uses new field names (`handler`, `input`, `output`, `format`, `auth`, `task`)
- [x] `TaskToolDefinition` with manual `taskHandlers` preserved as escape hatch in `./tasks`
- [x] Inline `auth` property checked by handler factory before calling `handler`
- [x] All existing template tools (`echo`, `cat_fact`, `countdown`, etc.) updated to new API

#### Remaining builders & API
- [x] `resource()` builder implemented in `newResourceDefinition.ts` with `NewResourceDefinition` type and type guard
- [x] `prompt()` builder implemented in `newPromptDefinition.ts` with `NewPromptDefinition` type and type guard
- [x] `ResourceDefinition` uses new field names, handler receives `(params, ctx)` with `ctx.uri`
- [x] `PromptDefinition` uses `args` instead of `argumentsSchema`, `generate` function
- [x] `resource()` / `prompt()` builders wired into registries (`ResourceRegistry` and `PromptRegistry` detect new-style definitions via type guards)
- [x] `resource()` / `prompt()` exported from `./resources`, `./prompts`, and `.` (packaging — requires `exports` field in `package.json`)
- [x] `task: true` tools auto-managed by framework (`registerAutoTaskTool` in `ToolRegistry` — create task, background run, store result, cancellation polling)
- [x] `checkScopes(ctx, scopes)` implemented in `checkScopes.ts`; `withToolAuth`/`withResourceAuth` retained as legacy compat (`echo.resource` and `data-explorer-ui.app-resource` migrated to `resource()` builder with inline `auth`)
- [x] Stdio mode defaults `tenantId` to `'default'` so `ctx.state` works without auth (in `createContext()`)

#### Packaging & repo transformation
- [x] `package.json` renamed to `@cyanheads/mcp-ts-core`
- [x] Template definitions moved to `examples/` (imports rewritten to `@cyanheads/mcp-ts-core` public subpath exports)
- [x] `createApp()` updated to return `ServerHandle` with `shutdown()` and `services` (was `AppHandle` with `createServer` + `transportManager`)
- [x] `createWorkerHandler()` implemented as public entry point (extraEnvBindings, extraObjectBindings, onScheduled)
- [x] Current `index.ts` and `worker.ts` converted to example entry points in `examples/`
- [x] Build pipeline: `build` script changed to `tsc && tsc-alias`, `tsc-alias` added to devDeps (see [03a-build.md](03a-build.md))
- [x] `tsconfig.base.json` created for downstream server extension
- [x] `exports` field added with all subpath exports, each with `types` + `import` conditions, plus `./package.json` (see [02-public-api.md](02-public-api.md))
- [x] Export verification script added (`scripts/verify-exports.ts`)
- [x] `peerDependencies` / `peerDependenciesMeta` configured for tiered deps (`"zod": "^4.3.6"`)

#### Documentation & skills
- [x] Consumer-facing `CLAUDE.md` written with exports catalog (no DI/container references)
- [~] `CONTRIBUTING.md` — skipped (not adding a contributing file)
- [x] All skill definitions written in `skills/` with `metadata.audience` set (see [05-agent-dx.md](05-agent-dx.md))
- [x] `templates/` directory created with all scaffold templates for `init` CLI (see [13-init-cli.md](13-init-cli.md))

#### Utils & Services API reference (decision #31)
- [x] JSDoc audit completed on all `utils/` exports (`@fileoverview`, `@module`, `@param`, `@returns`, `@example` on every exported symbol)
- [x] JSDoc audit completed on all `services/` exports (LLM, Speech, Graph)
- [x] "Utils API Quick Reference" section added to consumer-facing `CLAUDE.md` — per-subpath method tables
- [x] "Services API Quick Reference" section added to consumer-facing `CLAUDE.md` — per-service interface tables
- [ ] JSDoc accuracy verified against implementation (no stale descriptions, correct param names/types) — agents running

#### Final gates
- [ ] Conformance harness rewritten against stable `composeServices()` API (post-extraction)
- [x] `files` array includes `dist/`, `skills/`, `CLAUDE.md`, `tsconfig.base.json`, `biome.json`
- [x] `files` array excludes `core-extraction/` (by omission — not listed in `files`)
- [x] `prepublishOnly` script added
- [x] Package compiles cleanly (`tsc && tsc-alias`) — clean rebuild verified, 436 files, 1.5 MB
- [x] `npm pack --dry-run` produces expected file set — 463 files, 1.77 MB (stale dist/ definitions cleaned)
- [x] Examples build against the exports — self-referential `@cyanheads/mcp-ts-core` subpath imports verified at runtime

---

## Phase 4: Validate with Examples

The `examples/` directory acts as an integration test — a thin server consuming core through public exports, not internal paths.

### Checklist
- [x] Examples use only subpath exports (no `@/` or `dist/` internal paths) — all imports verified as `@cyanheads/mcp-ts-core/*`
- [x] Examples build successfully — `tsc -p examples/tsconfig.json --noEmit` clean
- [x] Examples' tests pass — 7 test files, 39 tests (tools, resources, prompts), `bun run test:examples`
- [x] `devcheck` passes on examples — all checks green (except transitive dep audit, upstream)
- [x] If examples can't cleanly use the API, the boundary is wrong — API boundary is clean; no issues found

---

## Phase 5: Publish `@cyanheads/mcp-ts-core@0.1.0`

First public release for external iteration.

> **⚠️ USER ACTION REQUIRED — This phase contains public-facing actions that must not be performed autonomously by an agent. The user must explicitly invoke or confirm each action marked with ⚠️.**

### Pre-publish gate
- [ ] `@modelcontextprotocol/ext-apps` stability assessed — if still experimental/pre-stable, demote to Tier 3 optional peer before publishing (see [10-decisions.md](10-decisions.md) open question #4)

### Checklist
- [ ] Version set to `0.1.0` in `package.json`
- [ ] `CHANGELOG.md` has `0.1.0` entry
- [ ] `README.md` updated for core package identity
- [ ] ⚠️ `bun publish --access public` succeeds — **user must run or explicitly approve**
- [ ] Package installable: `bun add @cyanheads/mcp-ts-core`
- [ ] Subpath imports resolve correctly from a clean consumer
- [ ] ⚠️ Docker image published to GHCR (if applicable) — **user must run or explicitly approve**

