# 07 — Migration

> Migration path for existing servers, `create-mcp-server` CLI.

---

## Migration Path for Existing Servers

For each downstream server already forked from the template:

### Steps (automated via Claude)

1. Add `@cyanheads/mcp-ts-core` as a dependency
2. Delete all infrastructure files that now come from the package (everything in the core boundary — see [01-architecture.md](01-architecture.md))
3. Rewrite imports: `@/` paths to `@cyanheads/mcp-ts-core/` subpaths (~10 mechanical patterns)
4. Replace `index.ts` with the `createApp()` call
5. Replace `worker.ts` with the `createWorkerHandler()` call
6. Move any server-specific service initialization into the `setup()` callback
7. Keep all `definitions/` files, domain `services/`, and server-specific config
8. Run `devcheck`, fix any breakage
9. Update `CLAUDE.md` to reference core's protocol instead of duplicating

### Import rewrite mapping

| Before (`@/` internal) | After (subpath export) |
|:------------------------|:-----------------------|
| `@/mcp-server/tools/utils/toolDefinition.js` | `@cyanheads/mcp-ts-core/tools` |
| `@/mcp-server/resources/utils/resourceDefinition.js` | `@cyanheads/mcp-ts-core/resources` |
| `@/mcp-server/prompts/utils/promptDefinition.js` | `@cyanheads/mcp-ts-core/prompts` |
| `@/mcp-server/tasks/utils/taskToolDefinition.js` | `@cyanheads/mcp-ts-core/tasks` |
| `@/mcp-server/transports/auth/lib/withAuth.js` | `@cyanheads/mcp-ts-core/auth` |
| `@/types-global/errors.js` | `@cyanheads/mcp-ts-core/errors` |
| `@/utils/internal/logger.js` | `@cyanheads/mcp-ts-core/utils/logger` |
| `@/utils/internal/requestContext.js` | `@cyanheads/mcp-ts-core/utils/requestContext` |
| `@/utils/formatting/markdownBuilder.js` | `@cyanheads/mcp-ts-core/utils/formatting` |
| `@/utils/network/fetchWithTimeout.js` | `@cyanheads/mcp-ts-core/utils/network` |
| `@/utils/security/sanitization.js` | `@cyanheads/mcp-ts-core/utils/security` |
| `@/utils/pagination/pagination.js` | `@cyanheads/mcp-ts-core/utils/pagination` |
| `@/container/core/container.js` | **Delete** — no DI container in core. Use `setup()` callback + lazy accessors. |
| `@/container/core/tokens.js` | **Delete** — no DI tokens in core. Services accessed via `CoreServices` or lazy accessors. |

### What makes this tractable

- The infra/app boundary is already clean — `definitions/` files only import from `utils/` and `types-global/`, never from each other's internals
- DI tokens are centralized — downstream just registers its own definitions via `definitions` option
- Servers that trimmed unused utils don't need migration for those — they simply don't import them
- The `ToolDefinition` / `ResourceDefinition` / `PromptDefinition` contracts are stable
- Import rewriting is mechanical: ~10 `@/` prefix patterns → subpaths

### Migration order

Start with the least-diverged server as proof of concept. Each subsequent migration validates and refines the pattern.

---

## `create-mcp-server` CLI (deferred milestone)

> Not required for initial extraction. Steps 1-5 of [09-execution.md](09-execution.md) deliver all architectural value. The CLI is a DX improvement that ships independently once core is stable. Servers can be scaffolded manually or cloned from the reference template repo in the interim.

```bash
bunx create-mcp-server my-server
# or
npx create-mcp-server my-server
```

### What it generates

1. `package.json` with `@cyanheads/mcp-ts-core` dependency, build scripts, bin entry
2. `tsconfig.json` extending core's base config
3. `src/index.ts` — the bootstrap call
4. `src/worker.ts` — the worker factory call
5. `src/mcp-server/tools/definitions/` — one example tool + `index.ts` barrel
6. `src/mcp-server/resources/definitions/` — one example resource + `index.ts` barrel
7. `src/mcp-server/prompts/definitions/` — one example prompt + `index.ts` barrel
8. `CLAUDE.md` — agent protocol extending core's reference
9. `vitest.config.ts`, `.eslintrc`, `wrangler.toml` (from core's shared configs)
10. Runs `bun install`

### Interactive prompts (optional)

- Server name, description
- Which transports to enable (stdio, http, both)
- Auth mode (none, jwt, oauth)

The template repo (`mcp-ts-template`) continues as the source for CLI templates and as a reference/example server that itself depends on `@cyanheads/mcp-ts-core`. See [01-architecture.md](01-architecture.md) (Repo Strategy) for how these relate.

---

## Checklist

### Per-server migration
- [ ] `@cyanheads/mcp-ts-core` added as dependency
- [ ] Infrastructure files deleted (config, container, utils, types-global, storage, transports, etc.)
- [ ] Imports rewritten from `@/` to `@cyanheads/mcp-ts-core/` subpaths
- [ ] `index.ts` replaced with `createApp()` call
- [ ] `worker.ts` replaced with `createWorkerHandler()` call
- [ ] Server-specific services moved to `setup()` callback (init/accessor pattern)
- [ ] `CLAUDE.md` updated to reference core
- [ ] `devcheck` passes
- [ ] All tests pass
- [ ] Smoke-tested with `dev:stdio` and `dev:http`

### `create-mcp-server` CLI (deferred)
- [ ] Scaffolding generates valid project structure
- [ ] Generated project builds and passes `devcheck`
- [ ] Interactive prompts work for transport and auth selection
- [ ] Published to npm as `create-mcp-server`
