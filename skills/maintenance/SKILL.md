---
name: maintenance
description: >
  Sync skills and dependencies after package updates. Use after running `bun update @cyanheads/mcp-ts-core` to ensure project skills are up to date, or periodically to check for drift.
metadata:
  author: cyanheads
  version: "1.2"
  audience: external
  type: workflow
---

## Context

Skills flow from the package to the project:

1. **Package** — `node_modules/@cyanheads/mcp-ts-core/skills/` (canonical source, updated via `bun update`)
2. **Project** — `skills/` at project root (working copy, can have local overrides or server-specific skills)

After `bun update @cyanheads/mcp-ts-core`, the package may have newer skills than the project. This skill syncs them and handles general dependency upkeep.

## Steps

### Sync project skills (Package → Project)

1. List all skill directories in `node_modules/@cyanheads/mcp-ts-core/skills/`
2. For each skill with `metadata.audience: external` in its `SKILL.md` frontmatter:
   - If the skill does not exist in project `skills/`, copy the full directory
   - If it exists, compare `metadata.version` — if the package version is newer, replace the full directory
   - If the local version is equal or newer, skip (local override)
3. Do not touch skills in `skills/` that don't exist in the package (server-specific)

### Dependency updates

1. Run `bun outdated` to see what's available
2. For any major version bumps, review changelogs before proceeding
3. Run `bun update` to apply updates
4. Run `bun audit` to check for vulnerabilities introduced by the update
5. Run `bun run devcheck` to confirm lint, definitions, types, and dependency/security checks still pass
6. Run `bun run test` to confirm runtime behavior still passes

## Checklist

- [ ] Package skills compared against project `skills/` (version check)
- [ ] New or updated skills copied to project `skills/`
- [ ] Dependencies updated (`bun update`)
- [ ] `bun audit` passes (no new vulnerabilities)
- [ ] `bun run devcheck` passes
- [ ] `bun run test` passes
