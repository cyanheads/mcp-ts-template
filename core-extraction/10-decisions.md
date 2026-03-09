# 10 — Decisions

> Resolved decisions, open questions, decision log.

---

## Resolved Decisions

| # | Question | Decision | Rationale |
|:--|:---------|:---------|:----------|
| 1 | Service interfaces in core? | **Deferred.** Zero interfaces initially. Promote when shared by 2+ servers. | Promoting = minor bump. Demoting = breaking. Start conservative. |
| 2 | All storage providers in core? | **Yes.** | Runtime serverless whitelist gates loading. Splitting into separate packages adds coordination overhead with no real benefit since heavy deps are optional. |
| 3 | Config extension pattern? | **Separate schemas, not merged.** | Core validates infrastructure. Servers validate domain. No `z.merge()` or `defineConfig()` needed. See [03-config-container.md](03-config-container.md). |
| 4 | CLAUDE.md management? | **Core ships `CLAUDE.md` in package.** Server references it. | Agent reads from `node_modules/`. See [05-agent-dx.md](05-agent-dx.md). |
| 5 | Core's `package.json` identity? | **`bootstrap()` accepts `name`/`version` overrides.** | Config module derives `mcpServerName`/`mcpServerVersion` from `package.json` via import assertion ([config/index.ts:16](../src/config/index.ts#L16)). Precedence: `bootstrap({ name })` > `MCP_SERVER_NAME` env var > core's `package.json`. Config module's `parseConfig` gains `overrides` parameter. |
| 6 | Scheduled worker handlers? | **Callback pattern via `onScheduled`.** | Signature includes `ExecutionContext` for `ctx.waitUntil()`. See [02-public-api.md](02-public-api.md). |
| 7 | `@/` alias in server code? | **Two import styles, self-documenting.** | `@/` = server's `src/`. `@cyanheads/mcp-ts-core/*` = framework. Clear which code is "mine" vs. "framework." |
| 8 | Template repo identity after extraction? | **`mcp-ts-template` npm gets final major with deprecation.** | GitHub repo transforms in-place. New thin template repo created as consumer. See [01-architecture.md](01-architecture.md). |
| 9 | `services` callback async support? | **`(container: Container) => void \| Promise<void>`.** | `bootstrap()` awaits the result. Supports async init (DB connections, API warm-up, remote config). |

---

## Open Questions

| # | Question | Leaning | Notes |
|:--|:---------|:--------|:------|
| 1 | Exports catalog format: hand-maintained or auto-generated? | **Hand-maintained initially.** Graduate to generation once exports stabilize. | Generated (via build step extracting JSDoc + export names) can't drift. But premature until the export surface is stable. |
| 2 | `examples/` in the published npm package? | **Exclude.** | Useful as runnable reference but adds package size. The reference template repo is the user-facing example; `examples/` exists for core's CI. |
| 3 | `ServerHandle` surface area? | **Consider exposing `container`.** | Downstream servers may need `container` access for integration testing, health checks, or programmatic embedding. `container: Container` (read-only) on `ServerHandle`. |
| 4 | `extraEnvBindings`/`extraObjectBindings` typing? | **Defer to 1.0.** | Both are `Array<[string, string]>` which loses type info. Generic `createWorkerHandler<B extends CoreBindings>` could enforce at compile time. Possibly overengineered for 0.1. |

---

## Decision Log

Record significant decisions made during execution here. Include date, context, and reasoning.

| Date | Decision | Context | Reasoning |
|:-----|:---------|:--------|:----------|
| 2026-03-09 | Transform repo in-place (not create new repo) | Repo strategy | Preserves git history, avoids "did I copy everything?" risk, keeps CI running |
| 2026-03-09 | Tier 3 deps as optional peers with lazy imports | Dependency strategy | Minimal install footprint. Servers pay only for what they use. |
| 2026-03-09 | Agent Skills for workflow packaging | Agent DX | Progressive disclosure (~50 tokens/skill at startup). Portable across agent platforms. |
| 2026-03-09 | Decomposed monolithic design doc into `core-extraction/` | Planning | Modular docs are easier to maintain, reference, and update incrementally. |
