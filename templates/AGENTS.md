# Agent Protocol

**Server:** {{PACKAGE_NAME}}
**Version:** 0.1.0
**Framework:** [@cyanheads/mcp-ts-core](https://www.npmjs.com/package/@cyanheads/mcp-ts-core)

> **Read the framework docs first:** `node_modules/@cyanheads/mcp-ts-core/CLAUDE.md` contains the full API reference — builders, Context, error codes, exports, patterns. This file covers server-specific conventions only.

---

## Core Rules

- **Logic throws, handlers catch.** Tool/resource handlers are pure — throw `McpError`, no `try/catch`. The framework catches and formats.
- **Use `ctx.log`** for request-scoped logging. No `console` calls.
- **Use `ctx.state`** for tenant-scoped storage. Never access persistence directly.
- **Check `ctx.elicit` / `ctx.sample`** for presence before calling.
- **Secrets in env vars only** — never hardcoded.

---

## Structure

```
src/
  index.ts                              # createApp() entry point
  config/
    server-config.ts                    # Server-specific env vars (Zod schema)
  services/
    [domain]/
      [domain]-service.ts               # Domain service (init/accessor pattern)
      types.ts                          # Domain types
  mcp-server/
    tools/definitions/
      [tool-name].tool.ts               # Tool definitions
    resources/definitions/
      [resource-name].resource.ts       # Resource definitions
    prompts/definitions/
      [prompt-name].prompt.ts           # Prompt definitions
```

---

## Naming

| What | Convention | Example |
|:-----|:-----------|:--------|
| Files | kebab-case with suffix | `search-docs.tool.ts` |
| Tool/resource/prompt names | snake_case | `search_docs` |
| Directories | kebab-case | `src/services/doc-search/` |

---

## Skills

Skills are modular instructions in `skills/`. They guide you through common tasks.

**Sync:** Keep your agent skill directory (e.g., `.claude/skills/`) in sync with `skills/`. Copy any missing or updated skills from `skills/` to your directory.

Available skills:

| Skill | Purpose |
|:------|:--------|
| `setup` | Post-init project orientation |
| `add-tool` | Scaffold a new tool definition |
| `add-resource` | Scaffold a new resource definition |
| `add-prompt` | Scaffold a new prompt definition |
| `add-service` | Scaffold a new service integration |
| `devcheck` | Lint, format, typecheck, audit |
| `maintenance` | Sync skills and dependencies after updates |
| `migrate-mcp-ts-template` | Migrate legacy template fork to package dependency |
| `api-auth` | Auth modes, scopes, JWT/OAuth |
| `api-config` | AppConfig, parseConfig, env vars |
| `api-context` | Context interface, logger, state, progress |
| `api-errors` | McpError, JsonRpcErrorCode, error patterns |
| `api-services` | LLM, Speech, Graph services |
| `api-testing` | createMockContext, test patterns |
| `api-utils` | Formatting, parsing, security, pagination, scheduling |
| `api-workers` | Cloudflare Workers runtime |

When you complete a skill's checklist, check the boxes and add a completion timestamp at the end (e.g., `Completed: 2026-03-11`).

---

## Commands

| Command | Purpose |
|:--------|:--------|
| `bun run build` | Compile TypeScript |
| `bun run devcheck` | Lint + format + typecheck |
| `bun run test` | Run tests |
| `bun run format` | Auto-fix formatting |
| `bun run dev:stdio` | Dev mode (stdio) |
| `bun run dev:http` | Dev mode (HTTP) |

---

## Imports

```ts
// Framework — from node_modules
import { tool } from '@cyanheads/mcp-ts-core';
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

// Server's own code — via path alias
import { getMyService } from '@/services/my-domain/my-service.js';
```

---

## Checklist

- [ ] Zod schemas: all fields have `.describe()`
- [ ] JSDoc `@fileoverview` + `@module` on every file
- [ ] `ctx.log` for logging, `ctx.state` for storage
- [ ] Handlers throw `McpError`, no try/catch
- [ ] Registered in `src/index.ts` arrays
- [ ] Tests use `createMockContext()` from `@cyanheads/mcp-ts-core/testing`
- [ ] `bun run devcheck` passes
