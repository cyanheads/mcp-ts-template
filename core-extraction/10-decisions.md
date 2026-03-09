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
| 10 | `ServerHandle` surface area? | **Expose `container` (read-only).** | Downstream servers need container access for integration testing, health checks, and programmatic embedding. Deferring to 1.0 forces workarounds in every migrated server. `ServerHandle.container` is typed as `Container` (read-only access through the existing API — `resolve`/`has`/`resolveAll`). |
| 11 | `pino-pretty` placement? | **`devDependencies` only.** | Already dynamically resolved via `require.resolve()` with try/catch fallback to JSON output ([logger.ts:107-112](../src/utils/internal/logger.ts#L107-L112)). No code change needed — the current pattern is already correct. Servers that want pretty dev output install it themselves. |
| 12 | `hono` as peer dependency? | **Core dependency only, not peer.** | Core owns the Hono version. Servers extending the HTTP transport use the version core provides. If version conflicts arise in practice, promote to peer in a minor release. |
| 13 | Provider code in core without interfaces? | **Yes — intentional.** | Storage and service providers ship in core. Their heavy deps (`@supabase/supabase-js`, `openai`) are Tier 3 optional peers. The lazy import pattern means provider code is inert until activated by config. Service interfaces stay in downstream servers until shared by 2+ servers. |
| 14 | Zod peer dep version range? | **`"zod": "^4.3.0"`.** | `^4.0.0` is too broad — earlier Zod 4 releases had API churn. Pin minimum to `4.3.0`, the version the codebase is tested against. |
| 15 | DI container vs `createApp()`? | **Replace container with `createApp()` direct wiring.** | The container has 6 production `resolve()` calls. Zero tool/resource/prompt definitions use it — they receive context via function parameters. The dependency graph is static, linear, and small (~15 services). Direct construction in `createApp()` is explicit, debuggable with a stack trace, and eliminates the token/registration/resolve indirection. Server-specific services use module-level lazy accessors (already the established pattern). `setup()` callback replaces `services(container)`. |
| 16 | Internal vs external documentation/skills? | **Explicit audience tagging.** | Core-extraction docs are internal (building the core). Skills and CLAUDE.md shipped in the package are external (consumer-facing). Skill metadata gets an `audience` field (`internal` or `external`). Internal skills stay in the core repo; external skills ship in the package and get copied to consumer projects. |

---

## Open Questions

| # | Question | Leaning | Notes |
|:--|:---------|:--------|:------|
| 1 | Exports catalog format: hand-maintained or auto-generated? | **Hand-maintained initially.** Graduate to generation once exports stabilize. | Generated (via build step extracting JSDoc + export names) can't drift. But premature until the export surface is stable. |
| 2 | `examples/` in the published npm package? | **Exclude.** | Useful as runnable reference but adds package size. The reference template repo is the user-facing example; `examples/` exists for core's CI. |
| 3 | `extraEnvBindings`/`extraObjectBindings` typing? | **Defer to 1.0.** | Both are `Array<[string, string]>` which loses type info. Generic `createWorkerHandler<B extends CoreBindings>` could enforce at compile time. Possibly overengineered for 0.1. |

---

## Decision Log

Record significant decisions made during execution here. Include date, context, and reasoning.

| Date | Decision | Context | Reasoning |
|:-----|:---------|:--------|:----------|
| 2026-03-09 | Transform repo in-place (not create new repo) | Repo strategy | Preserves git history, avoids "did I copy everything?" risk, keeps CI running |
| 2026-03-09 | Tier 3 deps as optional peers with lazy imports | Dependency strategy | Minimal install footprint. Servers pay only for what they use. |
| 2026-03-09 | Agent Skills for workflow packaging | Agent DX | Progressive disclosure (~50 tokens/skill at startup). Portable across agent platforms. |
| 2026-03-09 | Decomposed monolithic design doc into `core-extraction/` | Planning | Modular docs are easier to maintain, reference, and update incrementally. |
| 2026-03-09 | Resolve `ServerHandle.container`, pino-pretty, hono peer, zod range, providers in core | Plan review | Moved from open questions to resolved decisions (#10-#14). Deferring these created risk for Phase 7 migrations. |
| 2026-03-09 | Added build pipeline doc ([03a-build.md](03a-build.md)) | Plan review | Build strategy for multi-entry subpath exports was unaddressed — `bun build` doesn't emit `.d.ts`. |

| 2026-03-09 | Fixed `@hono/mcp` and `diff` dep placement | Plan review | Both misplaced in current `package.json` — would cause runtime failures in production installs. |
| 2026-03-09 | Replace DI container with `createApp()` direct wiring | Architecture | Container adds indirection for a static, linear, small dependency graph that no application code (tools/resources/prompts) consumes. 6 production `resolve()` calls total. `createApp()` constructs directly, `setup()` callback replaces `services(container)` access, `ServerHandle.services` replaces `ServerHandle.container`. Entire `src/container/` deleted. |
| 2026-03-09 | Add internal/external audience distinction to docs and skills | Documentation | Core-extraction docs are internal (how we build the core). Package-shipped CLAUDE.md and skills are external (how consumers use the core). Skill SKILL.md gets `audience: internal \| external` metadata. Prevents confusion about which artifacts target which audience. |
