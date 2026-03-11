---
name: migrate-imports
description: >
  Migrate a template fork to use @cyanheads/mcp-ts-core as a dependency. Use when converting a project that was forked from the template repo into one that imports from the published package instead.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Context

Projects forked from the template repo use `@/` path aliases to import
framework internals directly from `src/`. After extraction, those internals
live in the `@cyanheads/mcp-ts-core` package. This skill rewrites imports
to use the published package's subpath exports.

For the full exports catalog (what maps where), read:

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

## Steps

1. **Ensure the package is installed**: `bun add @cyanheads/mcp-ts-core`
2. **Search for all `@/` imports** across `src/` that reference framework internals
3. **Rewrite each import** using the mapping table below
4. **Remove migrated source files** — framework code that now lives in `node_modules`
5. **Update `tsconfig.json`** to extend the core base config
6. **Run `bun run devcheck`** to verify no broken imports remain
7. **Verify no `@/` imports** point to files that were removed

## Import Mapping

| Old `@/` import pattern | New package import |
|:-------------------------|:-------------------|
| `@/config/app-config.js` | `@cyanheads/mcp-ts-core/config` |
| `@/services/storage/*.js` | `@cyanheads/mcp-ts-core/storage` |
| `@/utils/logger.js` | `@cyanheads/mcp-ts-core/utils/logger` |
| `@/utils/error-handler.js` | `@cyanheads/mcp-ts-core/utils/errorHandler` |
| `@/utils/request-context.js` | `@cyanheads/mcp-ts-core/utils/requestContext` |
| `@/utils/formatting/*.js` | `@cyanheads/mcp-ts-core/utils/formatting` |
| `@/utils/parsing/*.js` | `@cyanheads/mcp-ts-core/utils/parsing` |
| `@/utils/security/*.js` | `@cyanheads/mcp-ts-core/utils/security` |
| `@/utils/network/*.js` | `@cyanheads/mcp-ts-core/utils/network` |
| `@/utils/pagination.js` | `@cyanheads/mcp-ts-core/utils/pagination` |
| `@/utils/runtime.js` | `@cyanheads/mcp-ts-core/utils/runtime` |
| `@/types/errors.js` | `@cyanheads/mcp-ts-core/errors` |
| `@/types/tool.js` | `@cyanheads/mcp-ts-core/tools` |
| `@/types/resource.js` | `@cyanheads/mcp-ts-core/resources` |
| `@/types/prompt.js` | `@cyanheads/mcp-ts-core/prompts` |
| `@/types/context.js` | `@cyanheads/mcp-ts-core/context` |

`@/` imports for **server-specific code** (tools, resources, services) stay as `@/`.
Only framework internals are rewritten.

## Checklist

- [ ] `@cyanheads/mcp-ts-core` installed as a dependency
- [ ] All framework `@/` imports rewritten to `@cyanheads/mcp-ts-core/*` subpaths
- [ ] No `@/` imports point to removed framework files
- [ ] `tsconfig.json` extends `@cyanheads/mcp-ts-core/tsconfig.base.json`
- [ ] Migrated framework source files removed from `src/`
- [ ] `bun run devcheck` passes
