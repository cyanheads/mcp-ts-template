# 07 — Migration

> Migration path for existing servers, `create-mcp-server` CLI.

---

## Migration Path for Existing Servers

For each downstream server already forked from the template:

### Steps (automated via Claude)

1. Add `@cyanheads/mcp-ts-core` as a dependency
2. Delete all infrastructure files that now come from the package (everything in the core boundary — see [01-architecture.md](01-architecture.md))
3. Rewrite imports: `@/` paths to `@cyanheads/mcp-ts-core/` subpaths (~10 mechanical patterns)
4. Replace `index.ts` with the `createApp()` call (flattened `tools`/`resources`/`prompts`)
5. Replace `worker.ts` with the `createWorkerHandler()` call
6. Move any server-specific service initialization into the `setup()` callback
7. Update tool/resource definitions to new API: `handler` instead of `logic`, `input`/`output`/`format` instead of `inputSchema`/`outputSchema`/`responseFormatter`, `(input, ctx)` instead of `(input, appContext, sdkContext)`, inline `auth` instead of `withToolAuth`. See [12-developer-api.md](12-developer-api.md) for the full migration table.
8. Convert task tools: replace `TaskToolDefinition` + `taskHandlers` with `tool()` + `task: true`
9. Keep all `definitions/` files, domain `services/`, and server-specific config
10. Run `devcheck`, fix any breakage
11. Update `CLAUDE.md` to reference core's protocol instead of duplicating

### Import rewrite mapping

| Before (`@/` internal) | After (subpath export) | Notes |
|:------------------------|:-----------------------|:------|
| `@/mcp-server/tools/utils/toolDefinition.js` | `@cyanheads/mcp-ts-core/tools` or `@cyanheads/mcp-ts-core` | Use `tool()` builder for new definitions |
| `@/mcp-server/resources/utils/resourceDefinition.js` | `@cyanheads/mcp-ts-core/resources` or `@cyanheads/mcp-ts-core` | Use `resource()` builder for new definitions |
| `@/mcp-server/prompts/utils/promptDefinition.js` | `@cyanheads/mcp-ts-core/prompts` or `@cyanheads/mcp-ts-core` | Use `prompt()` builder for new definitions |
| `@/mcp-server/tasks/utils/taskToolDefinition.js` | `@cyanheads/mcp-ts-core/tasks` | Only for raw `TaskToolDefinition` escape hatch; prefer `task: true` |
| `@/mcp-server/transports/auth/lib/withAuth.js` | **Delete** — use inline `auth: ['scope']` on definitions. `checkScopes()` from `@cyanheads/mcp-ts-core/auth` for dynamic auth. |  |
| `@/types-global/errors.js` | `@cyanheads/mcp-ts-core/errors` | |
| `@/utils/internal/logger.js` | **Delete from tool/resource files** — use `ctx.log`. Global `logger` still available from `@cyanheads/mcp-ts-core/utils/logger` for non-request contexts. |  |
| `@/utils/internal/requestContext.js` | **Delete from tool/resource files** — handler receives unified `ctx: Context`. `RequestContext` still available from `@cyanheads/mcp-ts-core/utils/requestContext` for internal use. |  |
| `@/utils/formatting/markdownBuilder.js` | `@cyanheads/mcp-ts-core/utils/formatting` | |
| `@/utils/network/fetchWithTimeout.js` | `@cyanheads/mcp-ts-core/utils/network` | |
| `@/utils/security/sanitization.js` | `@cyanheads/mcp-ts-core/utils/security` | |
| `@/utils/pagination/pagination.js` | `@cyanheads/mcp-ts-core/utils/pagination` | |
| `@/container/core/container.js` | **Delete** — no DI container in core. Use `setup()` callback + lazy accessors. |  |
| `@/container/core/tokens.js` | **Delete** — no DI tokens in core. Services accessed via `CoreServices` or lazy accessors. |  |

### API rewrite mapping

Beyond import paths, the definition API itself changes. See [12-developer-api.md](12-developer-api.md) for full details.

| Before | After |
|:-------|:------|
| `inputSchema` | `input` |
| `outputSchema` | `output` |
| `logic: (input, appContext, sdkContext) => ...` | `handler: (input, ctx) => ...` |
| `responseFormatter` | `format` |
| `argumentsSchema` | `args` |
| `withToolAuth(scopes, logicFn)` | `auth: ['scope']` on definition |
| `logger.info(msg, { ...appContext })` | `ctx.log.info(msg)` |
| `storage.set(key, val, { tenantId })` | `ctx.state.set(key, val)` |
| `hasElicitInput(sdkContext)` guard | `ctx.elicit ? ...` |
| `hasSamplingCapability(sdkContext)` guard | `ctx.sample ? ...` |
| `TaskToolDefinition` + `taskHandlers` | `tool()` with `task: true` |
| `definitions: { tools, resources, prompts }` | `tools: [...], resources: [...], prompts: [...]` |

### What makes this tractable

- The infra/app boundary is already clean — `definitions/` files only import from `utils/` and `types-global/`, never from each other's internals
- DI tokens are centralized — downstream just registers its own definitions via top-level `tools`/`resources`/`prompts` arrays
- Servers that trimmed unused utils don't need migration for those — they simply don't import them
- Field renames (`inputSchema` → `input`, `logic` → `handler`, etc.) are mechanical find-and-replace within definition files
- Import rewriting is mechanical: ~10 `@/` prefix patterns → subpaths, plus several deletions (logger, requestContext, withAuth)

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
3. `src/index.ts` — the `createApp()` call
4. `src/worker.ts` — the worker factory call
5. `src/mcp-server/tools/definitions/` — one example tool + `index.ts` barrel
6. `src/mcp-server/resources/definitions/` — one example resource + `index.ts` barrel
7. `src/mcp-server/prompts/definitions/` — one example prompt + `index.ts` barrel
8. `CLAUDE.md` — agent protocol extending core's reference
9. `vitest.config.ts`, `biome.json`, `wrangler.toml` (from core's shared configs)
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
- [ ] Imports rewritten from `@/` to `@cyanheads/mcp-ts-core/` subpaths (logger/requestContext/withAuth deleted from tool files)
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

### `create-mcp-server` CLI (deferred)
- [ ] Scaffolding generates valid project structure
- [ ] Generated project builds and passes `devcheck`
- [ ] Interactive prompts work for transport and auth selection
- [ ] Published to npm as `create-mcp-server`
