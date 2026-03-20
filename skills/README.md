# Skills

Agent Skills for `@cyanheads/mcp-ts-core`. Each subdirectory contains a `SKILL.md` following the [Agent Skills specification](https://agentskills.io/specification).

## Three-Tier Distribution

Skills flow through three locations. Each tier has a distinct role:

| Tier | Location | Written by | Purpose |
|:-----|:---------|:-----------|:--------|
| 1. Package | `node_modules/@cyanheads/mcp-ts-core/skills/` | `npm publish` / `bun publish` | Canonical source. Ships with the package. |
| 2. Project | `skills/` (project root) | `@cyanheads/mcp-ts-core init` CLI | Project's source of truth. Committed to git. Server-specific skills live here too. |
| 3. Agent | `.claude/skills/`, `.codex/skills/`, etc. | The agent itself | Agent's working copy. Synced from project `skills/`. Checklists are checked here. |

### Flow

```text
npm publish                    init CLI                    agent sync
[package skills/] ──────────> [project skills/] ──────────> [.claude/skills/]
                                     │
                                     ├── core skills (from package)
                                     └── server-specific skills (added by devs)
```

## Audience

Each skill declares `metadata.audience` in its SKILL.md frontmatter:

- **`external`** — For consumers building MCP servers. Copied to project `skills/` by `init`.
- **`internal`** — For core package developers. Stays in `node_modules`, not copied.

## Versioning

Skills declare `metadata.version` in frontmatter. When `init` is re-run after `bun update`, it compares versions and updates skills where the package version is newer. To pin a skill and prevent updates, bump its local `metadata.version` above the package's.

## Adding Server-Specific Skills

Create a new directory in `skills/` with a `SKILL.md` following the same format. The agent will pick it up on next sync. Use the core skills as examples for structure and checklist conventions.
