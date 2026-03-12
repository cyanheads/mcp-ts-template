---
name: maintenance
description: >
  Sync skills and dependencies after package updates. Use after running `bun update @cyanheads/mcp-ts-core` to ensure project skills and agent skill directories are up to date, or periodically to check for drift.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: workflow
---

## Context

Skills flow through three tiers:

1. **Package** — `node_modules/@cyanheads/mcp-ts-core/skills/` (canonical source)
2. **Project** — `skills/` at project root (source of truth for this project)
3. **Agent** — your agent skill directory (e.g., `.claude/skills/`)

After `bun update @cyanheads/mcp-ts-core`, Tier 1 may have newer skills than Tier 2 And Tier 3 may be out of sync with Tier 2 at any time.

## Steps

### Sync project skills (Tier 1 → Tier 2)

1. List all skill directories in `node_modules/@cyanheads/mcp-ts-core/skills/`
2. For each skill with `metadata.audience: external` in its `SKILL.md` frontmatter:
   - If the skill does not exist in project `skills/`, copy the full directory
   - If it exists, compare `metadata.version` — if the package version is newer, replace the full directory
   - If the local version is equal or newer, skip (local override)
3. Do not touch skills in `skills/` that don't exist in the package (server-specific)

### Sync agent skills (Tier 2 → Tier 3)

1. Compare your agent skill directory against project `skills/`
2. Copy any missing skills from `skills/` to your agent directory
3. For existing skills, compare file contents — update if `skills/` is newer
4. Do not remove skills from your agent directory that aren't in `skills/`

### Dependency updates

1. Run `bun update` to update all dependencies
2. Check `bun outdated` for any remaining outdated packages
3. Review changelogs for major version bumps before updating

## Checklist

- [ ] Package skills compared against project `skills/` (version check)
- [ ] New or updated skills copied to project `skills/`
- [ ] Agent skill directory in sync with project `skills/`
- [ ] Dependencies updated (`bun update`)
- [ ] `bun run devcheck` passes
