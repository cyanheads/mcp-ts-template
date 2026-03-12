---
name: setup
description: >
  Post-init orientation for an MCP server built on @cyanheads/mcp-ts-core. Use after running `@cyanheads/mcp-ts-core init` to understand the project structure, conventions, and skill sync model. Also use when onboarding to an existing project for the first time.
metadata:
  author: cyanheads
  version: "1.1"
  audience: external
  type: workflow
---

## Context

This skill assumes `@cyanheads/mcp-ts-core init` has already run. The CLI created the project's `CLAUDE.md` and `AGENTS.md` (identical content), copied external skills to `skills/`, and scaffolded the directory structure with echo definitions as starting points. This skill orients you to what was created.

## Agent Protocol File

The init CLI generates both `CLAUDE.md` and `AGENTS.md` with identical content. Keep the one your agent uses and delete the other:

- **Claude Code** — keep `CLAUDE.md`, delete `AGENTS.md`
- **All other agents** (Codex, Cursor, Windsurf, etc.) — keep `AGENTS.md`, delete `CLAUDE.md`

Both files serve the same purpose: project-specific agent instructions. Only one should exist in the committed project.

For the full framework API, read:

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

Read that file once per session. It contains the exports catalog, tool/resource/prompt contracts, error codes, context API, and common import patterns.

## Project Structure

```
CLAUDE.md                                       # Agent protocol (project-specific)
skills/                                         # Project skills (source of truth)
src/
  index.ts                                      # createApp() entry point
  worker.ts                                     # createWorkerHandler() (if using Workers)
  config/
    server-config.ts                            # Server-specific env vars (own Zod schema)
  services/
    [domain]/
      [domain]-service.ts                       # Init/accessor pattern
      types.ts
  mcp-server/
    tools/definitions/
      echo.tool.ts                              # Echo tool (starter — replace or delete)
    resources/definitions/
      echo.resource.ts                          # Echo resource (starter — replace or delete)
    prompts/definitions/
      echo.prompt.ts                            # Echo prompt (starter — replace or delete)
```

## Scaffolded Echo Definitions

The init creates echo definitions for tools, resources, and prompts as starting points. They're functional examples with inline comments explaining conventions. After init:

1. **Delete what you don't need.** If your server has no prompts, delete `echo.prompt.ts` and remove its import/registration from `src/index.ts`. Same for resources.
2. **Rename and replace what you keep.** The echo definitions show the pattern — swap them out for your real tools/resources/prompts.
3. **Definitions register directly in `src/index.ts`.** No barrel files — just import and add to the arrays.

## Conventions

| Convention | Rule |
|:-----------|:-----|
| File names | kebab-case |
| Tool/resource/prompt names | snake_case, prefixed with server name (e.g. `tasks_fetch_list`) |
| File suffixes | `.tool.ts`, `.resource.ts`, `.prompt.ts` |
| Imports (framework) | `@cyanheads/mcp-ts-core` and subpaths |
| Imports (server code) | `@/` path alias for `src/` |

## Skill Sync

Your agent skill directory (e.g., `.claude/skills/`) must stay in sync with the project's `skills/` directory. The project `skills/` is the source of truth.

1. Compare your agent skill directory against `skills/`
2. Copy any missing or updated skills into your agent directory
3. Do not remove server-specific skills from either location

For detailed sync procedures, see the `/maintenance` skill.

## Project Scaffolding

After `bun install`, complete these one-time setup tasks:

1. **Initialize git** — `git init && git add -A && git commit -m "chore: scaffold from @cyanheads/mcp-ts-core"`
2. **Verify agent protocol placeholders** — if the `init` CLI was run without a `[name]` argument, `{{PACKAGE_NAME}}` may remain as a literal in `CLAUDE.md`/`AGENTS.md` and `package.json`. Replace it with the actual server name.

## Checklist

- [ ] Agent protocol file selected — keep `CLAUDE.md` or `AGENTS.md`, delete the other
- [ ] `{{PACKAGE_NAME}}` placeholders replaced in agent protocol file (if not auto-substituted by init)
- [ ] Core framework CLAUDE.md read (`node_modules/@cyanheads/mcp-ts-core/CLAUDE.md`)
- [ ] Unused echo definitions deleted (and unregistered from `src/index.ts`)
- [ ] Agent skill directory in sync with project `skills/`
- [ ] Project structure understood (definitions directories, entry point)
- [ ] `bun run devcheck` passes
