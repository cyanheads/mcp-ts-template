---
name: migrate-mcp-ts-template
description: >
  Migrate an existing mcp-ts-template fork to use @cyanheads/mcp-ts-core as a package dependency. Use when a project was cloned/forked from github.com/cyanheads/mcp-ts-template and carries framework source code in its own src/ — this skill rewrites those internal imports to package subpath imports and removes the bundled framework files.
metadata:
  author: cyanheads
  version: "2.0"
  audience: external
  type: workflow
---

## Context

Before `@cyanheads/mcp-ts-core` was published as a package, users built servers by forking/cloning the `mcp-ts-template` repo. Those forks carry the full framework source code in their `src/` and use `@/` path aliases to import framework internals alongside their own server code.

This skill converts such a project to use `@cyanheads/mcp-ts-core` as a dependency — rewriting framework imports to package subpaths and removing the bundled framework files, while leaving server-specific code (tools, resources, prompts, services) untouched.

For the full exports catalog, see `CLAUDE.md` → Exports Reference.

## Steps

1. **Install the package**: `bun add @cyanheads/mcp-ts-core`
2. **Search for all `@/` imports** across `src/` that reference framework internals
3. **Rewrite each import** using the mapping table below
4. **Remove migrated framework source files** that now live in `node_modules`
5. **Update entry point** (`src/index.ts`) to use `createApp()` from the package
6. **Update build configs**: `tsconfig.json` extends `@cyanheads/mcp-ts-core/tsconfig.base.json`, `biome.json` extends `@cyanheads/mcp-ts-core/biome.json`
7. **Run `bun run devcheck`** to verify no broken imports remain
8. **Verify no `@/` imports** point to files that were removed

## Import Mapping

These are the actual `@/` import paths used in framework source. Rewrite any that appear in server-specific files (tools, resources, services, config).

### Core

| Old `@/` import | New package import |
|:----------------|:-------------------|
| `@/config/index.js` | `@cyanheads/mcp-ts-core/config` |
| `@/context.js` | `@cyanheads/mcp-ts-core/context` or `@cyanheads/mcp-ts-core` |
| `@/types-global/errors.js` | `@cyanheads/mcp-ts-core/errors` |
| `@/storage/core/StorageService.js` | `@cyanheads/mcp-ts-core/storage` |
| `@/storage/core/IStorageProvider.js` | `@cyanheads/mcp-ts-core/storage/types` |
| `@/mcp-server/transports/auth/lib/checkScopes.js` | `@cyanheads/mcp-ts-core/auth` |
| `@/testing/index.js` | `@cyanheads/mcp-ts-core/testing` |

### Definition types

| Old `@/` import | New package import |
|:----------------|:-------------------|
| `@/mcp-server/tools/utils/toolDefinition.js` | `@cyanheads/mcp-ts-core/tools` |
| `@/mcp-server/tools/utils/newToolDefinition.js` | `@cyanheads/mcp-ts-core/tools` or `@cyanheads/mcp-ts-core` (for `tool()` builder) |
| `@/mcp-server/resources/utils/resourceDefinition.js` | `@cyanheads/mcp-ts-core/resources` |
| `@/mcp-server/resources/utils/newResourceDefinition.js` | `@cyanheads/mcp-ts-core/resources` or `@cyanheads/mcp-ts-core` (for `resource()` builder) |
| `@/mcp-server/prompts/utils/promptDefinition.js` | `@cyanheads/mcp-ts-core/prompts` |
| `@/mcp-server/prompts/utils/newPromptDefinition.js` | `@cyanheads/mcp-ts-core/prompts` or `@cyanheads/mcp-ts-core` (for `prompt()` builder) |
| `@/mcp-server/tasks/utils/taskToolDefinition.js` | `@cyanheads/mcp-ts-core/tasks` |

### Utils

| Old `@/` import | New package import |
|:----------------|:-------------------|
| `@/utils/internal/logger.js` | `@cyanheads/mcp-ts-core/utils` |
| `@/utils/internal/requestContext.js` | `@cyanheads/mcp-ts-core/utils` |
| `@/utils/internal/error-handler/errorHandler.js` | `@cyanheads/mcp-ts-core/utils` |
| `@/utils/internal/runtime.js` | `@cyanheads/mcp-ts-core/utils` |
| `@/utils/formatting/*.js` | `@cyanheads/mcp-ts-core/utils` |
| `@/utils/parsing/*.js` | `@cyanheads/mcp-ts-core/utils` |
| `@/utils/security/*.js` | `@cyanheads/mcp-ts-core/utils` |
| `@/utils/network/*.js` | `@cyanheads/mcp-ts-core/utils` |
| `@/utils/pagination/pagination.js` | `@cyanheads/mcp-ts-core/utils` |
| `@/utils/types/guards.js` | `@cyanheads/mcp-ts-core/utils` |
| `@/utils/scheduling/*.js` | `@cyanheads/mcp-ts-core/utils` |

## Files to Remove

After rewriting imports, remove these framework directories/files. **Do not remove** server-specific code under `mcp-server/tools/definitions/`, `mcp-server/resources/definitions/`, `mcp-server/prompts/definitions/`, `services/` (server's own), or `config/server-config.ts`.

Framework files to delete:

- `src/app.ts`, `src/worker.ts`, `src/context.ts`
- `src/config/index.ts` (keep `server-config.ts` if it exists)
- `src/types-global/`
- `src/storage/`
- `src/mcp-server/server.ts`
- `src/mcp-server/transports/`
- `src/mcp-server/roots/`
- `src/mcp-server/tasks/` (core task infra — not tool definitions)
- `src/mcp-server/tools/utils/`, `tool-registration.ts`
- `src/mcp-server/resources/utils/`, `resource-registration.ts`
- `src/mcp-server/prompts/utils/`, `prompt-registration.ts`
- `src/utils/internal/`
- `src/utils/telemetry/`
- `src/utils/metrics/`
- `src/testing/`
- `src/services/llm/`, `src/services/speech/`, `src/services/graph/` (framework services)

## Entry Point Rewrite

Replace the fork's `src/index.ts` with:

```ts
#!/usr/bin/env node
import { createApp } from '@cyanheads/mcp-ts-core';
import { allToolDefinitions } from './mcp-server/tools/definitions/index.js';
import { allResourceDefinitions } from './mcp-server/resources/definitions/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/definitions/index.js';

await createApp({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
});
```

## Checklist

- [ ] `@cyanheads/mcp-ts-core` installed as a dependency
- [ ] All framework `@/` imports rewritten to `@cyanheads/mcp-ts-core/*` subpaths
- [ ] No `@/` imports point to removed framework files
- [ ] `src/index.ts` uses `createApp()` from the package
- [ ] `tsconfig.json` extends `@cyanheads/mcp-ts-core/tsconfig.base.json`
- [ ] `biome.json` extends `@cyanheads/mcp-ts-core/biome.json`
- [ ] Framework source files removed from `src/`
- [ ] Server-specific `@/` imports (own tools, services) still work
- [ ] `bun run devcheck` passes
