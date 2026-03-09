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

Fix DI/wiring issues and coupling. Small, non-breaking changes that align the code with the extraction boundary.

**Detail doc:** [08-pre-extraction.md](08-pre-extraction.md) (items 1-6)

### Checklist
- [ ] `registerMcpServices()` accepts `ServerDefinitions` parameter
- [ ] Worker binding keys extracted to `CoreBindingMappings` const
- [ ] `CloudflareBindings` index signature removed
- [ ] Logger's `sanitization` import inlined
- [ ] `openrouter.provider.ts` sanitization import resolved
- [ ] `pdf-lib` moved to optional peer
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

**Detail docs:** [01-architecture.md](01-architecture.md), [02-public-api.md](02-public-api.md), [03-config-container.md](03-config-container.md)

### Checklist
- [ ] `package.json` renamed to `@cyanheads/mcp-ts-core`
- [ ] Template definitions moved to `examples/`
- [ ] `bootstrap()` implemented as public entry point
- [ ] `createWorkerHandler()` implemented as public entry point
- [ ] Current `index.ts` and `worker.ts` converted to example entry points in `examples/`
- [ ] `exports` field added with all subpath exports (see [02-public-api.md](02-public-api.md))
- [ ] `peerDependencies` / `peerDependenciesMeta` configured for tiered deps
- [ ] Consumer-facing `CLAUDE.md` written with exports catalog
- [ ] `CONTRIBUTING.md` written (repo-only, excluded from package)
- [ ] Agent skill definitions written in `skills/` (see [05-agent-dx.md](05-agent-dx.md))
- [ ] `files` array includes `dist/`, build configs, `CLAUDE.md`, `skills/`
- [ ] Package compiles cleanly
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
- [ ] Demonstrates the scaffold pattern (bootstrap call, example tool/resource/prompt)
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
- [ ] Infrastructure files deleted
- [ ] Imports rewritten (`@/` → `@cyanheads/mcp-ts-core/`)
- [ ] `index.ts` replaced with bootstrap call
- [ ] `worker.ts` replaced with worker factory call
- [ ] Server-specific DI moved to `services` callback
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
