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

This skill assumes `@cyanheads/mcp-ts-core init` has already run. The CLI created the project's `CLAUDE.md` and `AGENTS.md` (identical content), copied external skills to `skills/`, and scaffolded the directory structure with echo definitions as starting points. This skill covers what was created and what to do next.

## Agent Protocol File

The init CLI generates both `CLAUDE.md` and `AGENTS.md` with identical content. Keep the one your agent uses, discard the other:

- **Claude Code** — keep `CLAUDE.md`, discard `AGENTS.md`
- **All other agents** (Codex, Cursor, Windsurf, etc.) — keep `AGENTS.md`, discard `CLAUDE.md`

Both files serve the same purpose: project-specific agent instructions. Only one should exist in the committed project.

For the full framework API, read:

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

Read that file once per session. It contains the exports catalog, tool/resource/prompt contracts, error codes, context API, and common import patterns.

## Project Structure

What `init` actually creates:

```text
CLAUDE.md                                       # Agent protocol (project-specific)
AGENTS.md                                       # Same content — discard whichever you don't use
.github/ISSUE_TEMPLATE/                         # GitHub issue templates (bug report, feature request)
skills/                                         # Project skills (source of truth)
src/
  index.ts                                      # createApp() entry point
  mcp-server/
    tools/definitions/
      echo.tool.ts                              # Echo tool (starter — replace when ready)
    resources/definitions/
      echo.resource.ts                          # Echo resource (starter — replace when ready)
    prompts/definitions/
      echo.prompt.ts                            # Echo prompt (starter — replace when ready)
```

Add these as needed:

```text
src/
  worker.ts                                     # createWorkerHandler() — only for Cloudflare Workers
  config/
    server-config.ts                            # Server-specific env vars (own Zod schema)
  services/
    [domain]/
      [domain]-service.ts                       # Init/accessor pattern
      types.ts
```

## Scaffolded Echo Definitions

The init creates echo definitions for tools, resources, and prompts. They're functional examples with inline comments explaining conventions. After init:

1. Clean up what you don't need. If your server has no prompts, the echo prompt definition and its registration in `src/index.ts` can go. Same for resources.
2. Rename and replace what you keep. The echo definitions show the pattern — swap them out for your real tools/resources/prompts.
3. Definitions register directly in `src/index.ts`. No barrel files, just import and add to the arrays.

## Conventions

| Convention | Rule |
|:-----------|:-----|
| File names | kebab-case |
| Tool/resource/prompt names | snake_case, prefixed with server name (e.g. `tasks_fetch_list`) |
| File suffixes | `.tool.ts`, `.resource.ts`, `.prompt.ts` |
| Imports (framework) | `@cyanheads/mcp-ts-core` and subpaths |
| Imports (server code) | `@/` path alias for `src/` |

## Skill Sync

Copy all project skills into your agent's skill directory so they're available as context. `skills/` is the source of truth.

**For Claude Code:**

```bash
mkdir -p .claude/skills && cp -R skills/* .claude/skills/
```

**For other agents** (Codex, Cursor, Windsurf, etc.) — copy to the equivalent directory (e.g., `.codex/skills/`, `.cursor/skills/`).

After the initial copy, use the `maintenance` skill to keep them in sync after package updates.

## Project Scaffolding

After installing dependencies (`npm install`, or `bun install` if using Bun), complete these one-time setup tasks:

1. **Update dependencies to latest** — `npx npm-check-updates -u && npm install` (or `bun update --latest` if using Bun). The scaffolded `package.json` pins minimum versions from when the framework was published; updating ensures you start with the latest compatible releases.
2. **Initialize git** — `git init && git add -A && git commit -m "chore: scaffold from @cyanheads/mcp-ts-core"`
3. **Verify agent protocol placeholders** — if the `init` CLI was run without a `[name]` argument, `{{PACKAGE_NAME}}` may remain as a literal in `CLAUDE.md`/`AGENTS.md` and `package.json`. Replace it with the actual server name.

## Checklist

- [ ] Agent protocol file selected — keep `CLAUDE.md` or `AGENTS.md`, discard the other
- [ ] `{{PACKAGE_NAME}}` placeholders replaced in agent protocol file (if not auto-substituted by init)
- [ ] Core framework CLAUDE.md read (`node_modules/@cyanheads/mcp-ts-core/CLAUDE.md`)
- [ ] Unused echo definitions cleaned up (and unregistered from `src/index.ts`)
- [ ] Skills copied to agent directory (`cp -R skills/* .claude/skills/` or equivalent)
- [ ] Project structure understood (definitions directories, entry point)
- [ ] `npm run devcheck` passes
- [ ] If new server: proceed to `design-mcp-server` skill to plan the tool surface
