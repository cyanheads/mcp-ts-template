# 13 — Init CLI

> The `@cyanheads/mcp-ts-core init` command: project scaffolding, skill distribution, and CLAUDE.md generation.

---

## Overview

`@cyanheads/mcp-ts-core init` is a CLI command (like `shadcn@latest init`) that bootstraps a new consumer project from scratch. It copies skills, generates a `CLAUDE.md`, scaffolds the directory structure, and creates config files. Works from an empty directory — no prior install required.

---

## What It Does

| Step | What it does |
|:-----|:-------------|
| Copy `audience: external` skills to `skills/` | Full copy of each skill directory (SKILL.md + assets/) |
| Generate `CLAUDE.md` and `AGENTS.md` from template | Both contain identical content — agent picks one during `/setup` |
| Generate `package.json` from template | Copy as-is (name filled in from `[name]` argument if provided) |
| Generate config files (`tsconfig.json`, `biome.json`, `vitest.config.ts`) | Copy standalone configs from templates |
| Generate `.env.example` | Copy from template |
| Scaffold `src/index.ts` entry point | Copy `createApp()` boilerplate from template |
| Scaffold `src/mcp-server/{tools,resources,prompts}/definitions/` | Copy barrel `index.ts` files from template |

### Skill selection logic

1. Read each skill's `SKILL.md` frontmatter from the package's bundled `skills/` directory
2. Filter to `metadata.audience: external`
3. Copy each external skill's full directory to the project's `skills/`

Skill syncing after package updates is handled separately by the `maintenance` skill (agent-driven) or a future dedicated script — not by re-running `init`.

### What it does NOT do

- Does not touch `.claude/`, `.codex/`, `.cursor/`, or any agent-specific directories — that's the agent's responsibility (instructed by the CLAUDE.md and `/setup` skill)
- Does not run `devcheck` or `build` — the agent or user does that after
- Does not install dependencies — user runs `bun install` after init
- Does not modify existing source files

---

## CLI Interface

```bash
npx @cyanheads/mcp-ts-core init my-mcp-server
bunx @cyanheads/mcp-ts-core init my-mcp-server
```

### Arguments / flags

| Argument / Flag | Purpose |
|:----------------|:--------|
| `[name]` | Optional project name — written into `package.json` as the package name. If omitted, placeholder is left as-is. |
| `--dry-run` | Show what would be created without writing files. |

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

All templates ship in the core package under `templates/`. The init script copies them as-is into the consumer project — no template engine. The only substitution is `{{PACKAGE_NAME}}` in `package.json` if a `[name]` argument is provided. Other `{{PLACEHOLDER}}` markers (e.g., `{{SERVER_NAME}}`) are left as reference points for the agent or developer to fill in after init.

**Naming convention:** Files that would conflict with the core package's own tooling (e.g., `biome.json` triggers Biome's nested config detection) are stored with a `.template.json` suffix. The init CLI strips the `.template` part when copying to the consumer project.

```
templates/
  CLAUDE.md                                       # Agent protocol (Claude)
  AGENTS.md                                       # Agent protocol (all other agents) — identical content
  package.json                                    # Consumer package.json with scripts
  tsconfig.json                                   # Standalone TypeScript config
  biome.template.json                             # Standalone Biome config (copied as biome.json)
  vitest.config.ts                                # Standalone Vitest config
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

Includes scripts and dependencies. `{{PACKAGE_NAME}}` is replaced if a `[name]` argument is provided; otherwise the agent or developer fills it in.

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

---

## Output Structure

After `init` on a fresh project:

```
project-root/
  CLAUDE.md                                       # from template (agent protocol — Claude)
  AGENTS.md                                       # from template (agent protocol — all others)
  package.json                                    # from template (skip if exists)
  tsconfig.json                                   # from template (skip if exists)
  biome.json                                      # from template (skip if exists)
  vitest.config.ts                                # from template (skip if exists)
  .env.example                                    # from template (skip if exists)
  skills/
    setup/SKILL.md                                # audience: external
    add-tool/SKILL.md
    add-resource/SKILL.md
    add-prompt/SKILL.md
    add-service/SKILL.md
    devcheck/SKILL.md
    migrate-mcp-ts-template/SKILL.md
    maintenance/SKILL.md
    api-*/SKILL.md                                # api reference skills
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
| Copying skills from package to project `skills/` | `init` CLI (first-time only) |
| Syncing `skills/` to agent directory (`.claude/skills/`) | The agent, instructed by CLAUDE.md and `/setup` skill |
| Updating skills after `bun update` | `maintenance` skill (agent-driven) or future script |
| Agent-specific skill directory detection | The agent itself |

The `init` CLI is agent-agnostic. It writes to a single `skills/` directory. Each agent is responsible for syncing from there into its own directory.

---

## Checklist

- [x] `src/cli/init.ts` implemented
- [x] `bin` field updated in core `package.json`
- [x] `templates/` directory created with all template files
- [x] `skills/` and `templates/` included in core package `files` array (alongside `dist`)
- [x] `package.json` template includes correct scripts and dependency versions
- [x] Config templates (`tsconfig.json`, `biome.json`, `vitest.config.ts`) are standalone — no `extends`, work without prior install
- [x] Only `audience: external` skills are copied
- [x] `--dry-run` flag implemented
- [x] `[name]` argument populates `{{PACKAGE_NAME}}` in package.json
- [ ] Tested: fresh project init from empty directory (all files created)
- [ ] Tested: works via `npx` / `bunx` without prior install
