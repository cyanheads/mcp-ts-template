---
name: setup
description: >
  Post-init orientation for an MCP server built on @cyanheads/mcp-ts-core. Use after running `@cyanheads/mcp-ts-core init` to understand the project structure, conventions, and skill sync model. Also use when onboarding to an existing project for the first time.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Context

This skill assumes `@cyanheads/mcp-ts-core init` has already run. The CLI created the project's `CLAUDE.md`, copied external skills to `skills/`, and scaffolded the directory structure. This skill orients you to what was created.

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
      [tool-name].tool.ts                       # Tool definitions
      index.ts                                  # allToolDefinitions barrel
    resources/definitions/
      [resource-name].resource.ts               # Resource definitions
      index.ts                                  # allResourceDefinitions barrel
    prompts/definitions/
      [prompt-name].prompt.ts                   # Prompt definitions
      index.ts                                  # allPromptDefinitions barrel
```

## Conventions

| Convention | Rule |
|:-----------|:-----|
| File names | kebab-case |
| Tool/resource/prompt names | snake_case |
| File suffixes | `.tool.ts`, `.resource.ts`, `.prompt.ts` |
| Imports (framework) | `@cyanheads/mcp-ts-core` and subpaths |
| Imports (server code) | `@/` path alias for `src/` |
| Barrel exports | One per definitions directory |

## Skill Sync

Your agent skill directory (e.g., `.claude/skills/`) must stay in sync with the project's `skills/` directory. The project `skills/` is the source of truth.

1. Compare your agent skill directory against `skills/`
2. Copy any missing or updated skills into your agent directory
3. Do not remove server-specific skills from either location

For detailed sync procedures, see the `/maintenance` skill.

## Checklist

- [ ] Core framework CLAUDE.md read (`node_modules/@cyanheads/mcp-ts-core/CLAUDE.md`)
- [ ] Agent skill directory in sync with project `skills/`
- [ ] Project structure understood (definitions directories, barrel files, entry point)
- [ ] `bun run devcheck` passes
