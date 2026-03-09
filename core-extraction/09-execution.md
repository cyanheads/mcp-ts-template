# 09 — Execution Sequence

> Phased execution with per-phase checklists and acceptance criteria.

---

## Phase Overview

| Phase | Description | Depends on | Risk | Status |
|:------|:------------|:-----------|:-----|:-------|
| 1 | Pre-extraction cleanup (DI/wiring) | — | Low (non-breaking) | Not started |
| 2 | Lazy dependency conversion | Phase 1 | Low (backwards-compatible) | Not started |
| 3 | Repo transformation (the extraction) | Phase 2 | Medium (breaking rename) | Not started |
| 4 | Validate with examples | Phase 3 | Low | Not started |
| 5 | Publish `@cyanheads/mcp-ts-core@0.1.0` | Phase 4 | Medium (public API) | Not started |
| 6 | Create thin `mcp-ts-template` reference repo | Phase 5 | Low | Not started |
| 7 | Migrate downstream servers | Phase 5 | Medium (per-server) | Not started |
| 8 | Cut 1.0 | Phase 7 (2-3 servers migrated) | Low | Not started |
| 9 | Build `create-mcp-server` (deferred) | Phase 8 | Low | Not started |

---

## Phase 1: Pre-extraction Cleanup

Replace DI container with `createApp()`, fix coupling, and fix dependency placement bugs. Aligns the code with the extraction boundary.

**Detail doc:** [08-pre-extraction.md](08-pre-extraction.md) (items 1-6, 3a-3b, T1-T6), [03-config-container.md](03-config-container.md), [06-testing.md](06-testing.md)

### Checklist
- [ ] `@hono/mcp` moved from `devDependencies` to `dependencies` (#3a)
- [ ] `diff` moved from `devDependencies` to `dependencies` (#3b)
- [ ] `pino-pretty` moved from `dependencies` to `devDependencies` (#3c)
- [ ] `src/container/` deleted; `createApp()` implemented in `src/app.ts`
- [ ] `createMcpServerInstance` receives registries as params (not via container)
- [ ] `TransportManager` receives deps as constructor params (not via container)
- [ ] Container tests deleted or rewritten as `createApp()` integration tests
- [ ] Worker binding keys extracted to `CoreBindingMappings` const
- [ ] `CloudflareBindings` index signature removed
- [ ] Logger's `sanitization` import inlined
- [ ] `openrouter.provider.ts` sanitization import resolved
- [ ] `pdf-lib` moved to optional peer
- [ ] `tests/index.test.ts` deleted (noise tests)
- [ ] Type-existence-only tests deleted
- [ ] Storage TTL test uncommented and working
- [ ] `fakeTimers` removed from `vitest.config.ts` global config
- [ ] Handler factory execution tests added
- [ ] HTTP transport integration test added
- [ ] `bun run devcheck` passes
- [ ] All tests pass
- [ ] Committed

---

## Phase 2: Lazy Dependency Conversion

Convert all Tier 3 static imports to lazy dynamic `import()`. Backwards-compatible.

**Detail doc:** [08-pre-extraction.md](08-pre-extraction.md) (items 7-17), [04-dependencies.md](04-dependencies.md)

### Checklist
- [ ] All 11 files converted to lazy imports (see conversion table)
- [ ] Each lazy import throws `McpError(ConfigurationError)` with install instruction
- [ ] `bun run devcheck` passes
- [ ] Full test suite passes
- [ ] Committed

---

## Phase 3: Repo Transformation

The core of the extraction. Transform the repo in-place.

**Detail docs:** [01-architecture.md](01-architecture.md), [02-public-api.md](02-public-api.md), [03-config-container.md](03-config-container.md), [03a-build.md](03a-build.md), [12-developer-api.md](12-developer-api.md)

### Checklist
- [ ] `package.json` renamed to `@cyanheads/mcp-ts-core`
- [ ] Template definitions moved to `examples/`
- [ ] `createApp()` implemented as public entry point (returns `ServerHandle` with `shutdown()` and `services`)
- [ ] `createWorkerHandler()` implemented as public entry point
- [ ] Current `index.ts` and `worker.ts` converted to example entry points in `examples/`
- [ ] Build pipeline: `build` script changed to `tsc && tsc-alias`, `tsc-alias` added to devDeps (see [03a-build.md](03a-build.md))
- [ ] `tsconfig.base.json` created for downstream server extension
- [ ] `exports` field added with all subpath exports, each with `types` + `import` conditions (see [02-public-api.md](02-public-api.md))
- [ ] Export verification script added to CI
- [ ] `peerDependencies` / `peerDependenciesMeta` configured for tiered deps (`"zod": "^4.3.0"`)
- [ ] Consumer-facing `CLAUDE.md` written with exports catalog (no DI/container references)
- [ ] `CONTRIBUTING.md` written (repo-only, excluded from package)
- [ ] External skill definitions written in `skills/` with `audience: external` (see [05-agent-dx.md](05-agent-dx.md))
- [ ] Internal skill definitions written in `skills-internal/` with `audience: internal`
- [ ] `files` array includes `dist/`, `skills/`, `CLAUDE.md`, `tsconfig.base.json`, `vitest.config.js`, `biome.json`
- [ ] Test helpers implemented in `src/testing/index.ts` (`createMockContext`)
- [ ] `Context` interface defined and exported from `./context`
- [ ] `createContext()` factory constructs `Context` from `RequestContext` + `SdkContext` + services
- [ ] `ContextLogger` delegates to Pino with auto-correlated request metadata
- [ ] `ContextState` delegates to `StorageService` with tenant scoping
- [ ] `ContextProgress` wraps `TaskStore` status updates
- [ ] `tool()` builder exported from `./tools` and `.`
- [ ] `resource()` builder exported from `./resources` and `.`
- [ ] `prompt()` builder exported from `./prompts` and `.`
- [ ] `ToolDefinition` uses new field names (`handler`, `input`, `output`, `format`, `auth`, `task`)
- [ ] `ResourceDefinition` uses new field names, handler receives `(params, ctx)` not `(uri, params, context)`
- [ ] `PromptDefinition` uses `args` instead of `argumentsSchema`
- [ ] `task: true` tools auto-managed by framework (create task, background run, store result)
- [ ] `TaskToolDefinition` with manual `taskHandlers` preserved as escape hatch in `./tasks`
- [ ] Inline `auth` property checked by handler factory before calling `handler`
- [ ] `checkScopes(ctx, scopes)` exported from `./auth`; `withToolAuth`/`withResourceAuth` removed
- [ ] Stdio mode defaults `tenantId` to `'default'` so `ctx.state` works without auth
- [ ] All existing template tools (`echo`, `cat_fact`, `countdown`, etc.) updated to new API
- [ ] Conformance harness updated to use `createApp()` instead of `composeContainer()`
- [ ] `files` array excludes `skills-internal/`, `core-extraction/`, `CONTRIBUTING.md`
- [ ] `prepublishOnly` script added
- [ ] Package compiles cleanly (`tsc && tsc-alias`)
- [ ] `npm pack --dry-run` produces expected file set
- [ ] Examples build against the exports

---

## Phase 4: Validate with Examples

The `examples/` directory acts as an integration test — a thin server consuming core through public exports, not internal paths.

### Checklist
- [ ] Examples use only subpath exports (no `@/` or `dist/` internal paths)
- [ ] Examples build successfully
- [ ] Examples' tests pass
- [ ] `devcheck` passes on examples
- [ ] If examples can't cleanly use the API, the boundary is wrong — go back to Phase 3

---

## Phase 5: Publish `@cyanheads/mcp-ts-core@0.1.0`

First public release for external iteration.

### Checklist
- [ ] Version set to `0.1.0` in `package.json`
- [ ] `CHANGELOG.md` has `0.1.0` entry
- [ ] `README.md` updated for core package identity
- [ ] `bun publish --access public` succeeds
- [ ] Package installable: `bun add @cyanheads/mcp-ts-core`
- [ ] Subpath imports resolve correctly from a clean consumer
- [ ] Docker image published to GHCR (if applicable)

---

## Phase 6: Create Reference Template Repo

A new thin `mcp-ts-template` repo that depends on `@cyanheads/mcp-ts-core`.

**Detail doc:** [01-architecture.md](01-architecture.md) (Repo Strategy)

### Checklist
- [ ] New `cyanheads/mcp-ts-template` repo created
- [ ] Depends on published `@cyanheads/mcp-ts-core`
- [ ] Demonstrates the scaffold pattern (`createApp()` call, example tool/resource/prompt)
- [ ] CI runs against the published core package
- [ ] `devcheck` passes
- [ ] Old `mcp-ts-template` npm package gets final major version with deprecation notice
- [ ] GitHub repo renamed: `cyanheads/mcp-ts-template` → `cyanheads/mcp-ts-core` (with redirect)

---

## Phase 7: Migrate Downstream Servers

One at a time, starting with the least-diverged.

**Detail doc:** [07-migration.md](07-migration.md)

### Per-server checklist
- [ ] `@cyanheads/mcp-ts-core` added as dependency
- [ ] Infrastructure files deleted (including `src/container/`)
- [ ] Imports rewritten (`@/` → `@cyanheads/mcp-ts-core/`; logger/requestContext/withAuth deleted from tool files)
- [ ] Tool/resource definitions updated to new API (`handler`/`input`/`output`/`format`/`auth`, `(input, ctx)` signature)
- [ ] Task tools converted from `TaskToolDefinition` + `taskHandlers` to `task: true`
- [ ] `index.ts` replaced with `createApp()` call (flattened `tools`/`resources`/`prompts`)
- [ ] `worker.ts` replaced with `createWorkerHandler()` call
- [ ] Server-specific services moved to `setup()` callback (init/accessor pattern)
- [ ] Tests updated: `createMockContext()` replaces split mocks, `.handler()` replaces `.logic()`
- [ ] `CLAUDE.md` updated to reference core
- [ ] `devcheck` passes
- [ ] All tests pass
- [ ] Smoke-tested with `dev:stdio` and `dev:http`

### Servers to migrate (in order)

| Server | Divergence | Status |
|:-------|:-----------|:-------|
| TBD (least diverged) | Low | Not started |
| TBD | Medium | Not started |
| TBD | Medium | Not started |

---

## Phase 8: Cut 1.0

Once 2-3 servers are running on core without issues.

### Checklist
- [ ] At least 2 downstream servers successfully migrated
- [ ] No breaking API changes needed since 0.1.0 (or all resolved)
- [ ] Open questions resolved (see [10-decisions.md](10-decisions.md))
- [ ] Version bumped to `1.0.0`
- [ ] `CHANGELOG.md` updated
- [ ] Published to npm
- [ ] Docker image updated

---

## Phase 9: Build `create-mcp-server` (Deferred)

Not required for initial extraction. Implement the scaffolding CLI using the reference template as the source for generated files. Ship when core is stable.

**Detail doc:** [07-migration.md](07-migration.md) (CLI section)

### Checklist
- [ ] CLI scaffolds valid project structure (using reference template as source)
- [ ] Generated project builds and passes `devcheck`
- [ ] Interactive prompts for transport/auth selection
- [ ] Published to npm as `create-mcp-server`
