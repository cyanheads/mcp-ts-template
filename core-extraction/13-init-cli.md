# 13 — Init CLI

> The `@cyanheads/mcp-ts-core init` command: project scaffolding, skill distribution, and CLAUDE.md generation.

---

## Overview

`@cyanheads/mcp-ts-core init` is a CLI command (like `shadcn@latest init`) that bootstraps a consumer project. It copies skills, generates a `CLAUDE.md`, and scaffolds the directory structure. It is **idempotent** — safe to re-run after `bun update @cyanheads/mcp-ts-core` to pick up new or updated skills.

---

## What It Does

| Step | First Run | Subsequent Runs |
|:-----|:----------|:----------------|
| Copy `audience: external` skills to `skills/` | Full copy (SKILL.md + assets/) | Update if `metadata.version` in package is newer than local |
| Generate `CLAUDE.md` from template | Copy as-is (agent fills in placeholders) | Skip (file exists) |
| Generate `package.json` from template | Copy as-is (agent fills in name/version) | Skip (file exists) |
| Generate config files (`tsconfig.json`, `biome.json`, `vitest.config.ts`) | Copy from templates | Skip (file exists) |
| Generate `.env.example` | Copy from template | Skip (file exists) |
| Scaffold `src/index.ts` entry point | Create with `createApp()` boilerplate | Skip (file exists) |
| Scaffold `src/mcp-server/{tools,resources,prompts}/definitions/` | Create directories + barrel `index.ts` files | Skip (directories exist) |

### Skill update logic (subsequent runs)

1. Read each skill's `SKILL.md` frontmatter from `node_modules/@cyanheads/mcp-ts-core/skills/`
2. Filter to `metadata.audience: external`
3. For each external skill, check if `skills/<name>/SKILL.md` exists locally
   - **Not found locally:** copy full directory (new skill added upstream)
   - **Found locally:** compare `metadata.version` — if package version is newer, replace the full directory
   - **Found locally, not in package:** leave it alone (server-specific skill)

Server-specific skills and local overrides (where a consumer has modified a core skill) are preserved. If a consumer wants to pin a skill and prevent updates, they can bump the local `metadata.version` above the package's.

### What it does NOT do

- Does not touch `.claude/`, `.codex/`, `.cursor/`, or any agent-specific directories — that's the agent's responsibility (instructed by the CLAUDE.md and `/setup` skill)
- Does not run `devcheck` or `build` — the agent or user does that after
- Does not install dependencies — assumes `bun install` / `npm install` has already run
- Does not modify existing source files

---

## CLI Interface

```bash
# First-time setup
bunx @cyanheads/mcp-ts-core init

# After updating the package
bun update @cyanheads/mcp-ts-core
bunx @cyanheads/mcp-ts-core init
```

### Arguments / flags

| Flag | Purpose |
|:-----|:--------|
| `--force` | Overwrite all skills regardless of version comparison. Does NOT overwrite other files. |
| `--dry-run` | Show what would be created/updated without writing files. |

---

## Package Entry Point

```jsonc
// package.json (core package)
{
  "bin": {
    "mcp-ts-core": "./dist/cli/init.js"
  }
}
```

The CLI entry point lives at `src/cli/init.ts` in the core package. It should be minimal — read frontmatter, compare versions, copy files. No heavy dependencies beyond what core already ships.

---

## Template Directory

All templates ship in the core package under `templates/`. The init script copies them as-is into the consumer project — no substitution, no template engine. Files contain `{{PLACEHOLDER}}` markers (e.g., `{{SERVER_NAME}}`) as reference points for the agent or developer to fill in after init.

```
templates/
  CLAUDE.md                                       # Server CLAUDE.md
  package.json                                    # Consumer package.json with scripts
  tsconfig.json                                   # Extends core's tsconfig.base.json
  biome.json                                      # Extends core's biome.json
  vitest.config.ts                                # Extends core's vitest config
  .env.example                                    # Environment variable reference
  src/
    index.ts                                      # createApp() entry point
    mcp-server/
      tools/definitions/index.ts                  # Tools barrel
      resources/definitions/index.ts              # Resources barrel
      prompts/definitions/index.ts                # Prompts barrel
```

The `templates/` directory is included in the package's `files` array alongside `skills/` and `dist/`.

### package.json template

Includes scripts and dependencies. The agent or developer fills in name/version after init.

```jsonc
{
  "name": "{{PACKAGE_NAME}}",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc && tsc-alias",
    "devcheck": "biome check . && tsc --noEmit",
    "format": "biome check --fix .",
    "test": "vitest run",
    "dev:stdio": "tsx src/index.ts",
    "dev:http": "MCP_TRANSPORT_TYPE=http tsx src/index.ts",
    "start:stdio": "node dist/index.js",
    "start:http": "MCP_TRANSPORT_TYPE=http node dist/index.js"
  },
  "dependencies": {
    "@cyanheads/mcp-ts-core": "^0.1.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "tsc-alias": "^1.8.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

The init script only writes files that don't already exist. It never overwrites or merges existing files (except skills, by version comparison).

---

## Output Structure

After `init` on a fresh project:

```
project-root/
  CLAUDE.md                                       # from template
  package.json                                    # from template (skip if exists)
  tsconfig.json                                   # from template (skip if exists)
  biome.json                                      # from template (skip if exists)
  vitest.config.ts                                # from template (skip if exists)
  .env.example                                    # from template (skip if exists)
  skills/
    setup/SKILL.md                                # audience: external
    add-tool/SKILL.md
    add-tool/assets/tool-template.ts
    add-resource/SKILL.md
    add-resource/assets/resource-template.ts
    add-prompt/SKILL.md
    add-service/SKILL.md
    devcheck/SKILL.md
    migrate-imports/SKILL.md
    maintenance/SKILL.md
  src/
    index.ts                                      # createApp() entry point
    mcp-server/
      tools/definitions/index.ts                  # barrel
      resources/definitions/index.ts              # barrel
      prompts/definitions/index.ts                # barrel
```

---

## Relationship to Skills

| Concern | Who handles it |
|:--------|:---------------|
| Copying skills from package to project `skills/` | `init` CLI |
| Syncing `skills/` to agent directory (`.claude/skills/`) | The agent, instructed by CLAUDE.md and `/setup` skill |
| Updating skills after `bun update` | `init` CLI (re-run) |
| Agent-specific skill directory detection | The agent itself |

The `init` CLI is agent-agnostic. It writes to a single `skills/` directory. Each agent is responsible for syncing from there into its own directory.

---

## Checklist

- [ ] `src/cli/init.ts` implemented
- [ ] `bin` field added to core `package.json`
- [ ] `templates/` directory created with all template files
- [ ] `templates/` included in core package `files` array
- [ ] `package.json` template includes correct scripts and dependency versions
- [ ] Config templates (`tsconfig.json`, `biome.json`, `vitest.config.ts`) extend core's base configs
- [ ] Skill version comparison logic works correctly
- [ ] Idempotent: safe to re-run without data loss — existing files never overwritten (except skills by version)
- [ ] Server-specific skills in `skills/` are not touched
- [ ] `--dry-run` flag implemented
- [ ] Tested: fresh project init (all files created)
- [ ] Tested: re-run after version bump (only skills updated)
- [ ] Tested: server-specific skills preserved
- [ ] Tested: existing package.json/CLAUDE.md/config files not overwritten
