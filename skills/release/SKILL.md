---
name: release
description: >
  Verify release readiness and publish. The git wrapup protocol handles version bumps, changelog, README, commits, and tagging during the coding session. This skill verifies nothing was missed, runs final checks, and presents the irreversible publish commands.
metadata:
  author: cyanheads
  version: "1.2"
  audience: internal
  type: workflow
---

## Context

By the time this skill runs, the git wrapup protocol should have already handled: changelog entry, version bumps, README updates, atomic commits, and an annotated tag. This skill is the **final verification gate** before irreversible publish commands. Its job is to catch anything the wrapup missed or got wrong — not to redo the work.

## Steps

### 1. Confirm the Target Version

Read `package.json` to get the version. This is the source of truth. If the user hasn't decided on the bump level yet (patch/minor/major), ask now — but usually this was already set during wrapup.

### 2. Verify Version Consistency

The wrapup protocol bumps versions, but sometimes a file gets missed. **Search for the old version string** across the repo and verify the new version appears in all required locations:

| File | What to Verify |
|:-----|:---------------|
| `package.json` | `version` field |
| `server.json` | Root `version` + `version` in each `packages[]` entry (3 total) |
| `CLAUDE.md` | Version in the header (`**Version:** X.Y.Z`) |
| `README.md` | Version badge (`Version-X.Y.Z-blue`) and any other version references |
| `templates/CLAUDE.md` | `**Version:** X.Y.Z` in the header |
| `templates/AGENTS.md` | Same — these files are identical |

Fix any mismatches. A grep for the **old** version is the fastest way to find stragglers.

### 3. Verify CHANGELOG.md

Confirm the changelog entry:

- Uses a **concrete version number and date** (never `[Unreleased]`)
- Groups changes correctly: Added, Changed, Fixed, Removed
- Accurately reflects what actually shipped — cross-reference with `git log` since the last tag

### 4. Verify README.md

Beyond the version badge, confirm:

- Feature counts (tool count, resource count, etc.) match reality if the surface area changed
- Descriptions and capability lists reflect new features
- MCP SDK version badge is current if the dependency was bumped
- Code examples still match current APIs

### 5. Verify Skill Versions

For any skills whose `SKILL.md` was modified in this release cycle, confirm `metadata.version` in their YAML frontmatter was bumped. This is how the `maintenance` skill detects updates — if the version didn't bump, consumers won't get the new content on `bun update`.

### 6. Verify `docs/tree.md`

If the file structure changed, regenerate and confirm it's current:

```bash
bun run tree
```

Skip if no structural changes occurred.

### 7. Run Final Checks

All must pass:

```bash
bun run devcheck
bun run test
bun run build
```

### 8. Verify Commit and Tag

Confirm a clean release commit and annotated tag exist:

- Commit message: `chore: release v{{VERSION}}`
- Annotated tag: `v{{VERSION}}` with a concise summary of key changes

If the wrapup created the commit and tag already, verify they're correct. If not, create them now.

Tag message examples:

```text
v0.2.0: Cloudflare Workers support, task tools, Graph service
v0.1.7: OTel instrumentation refactor, lighter semconv
v0.1.6: Error factory functions, auto-classification patterns
```

### 9. Stop and Present Publish Commands

The following commands are irreversible. Present them to the user for manual execution:

```bash
# Push commit and tag
git push && git push --tags

# Publish to npm
bun publish --access public

# Build and push Docker image
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/cyanheads/mcp-ts-core:{{VERSION}} \
  -t ghcr.io/cyanheads/mcp-ts-core:latest \
  --push .

# Publish MCP listing (if applicable)
mcp-publisher publish
```

## Pre-Publish Checklist

- [ ] Version consistent across all files (package.json, server.json ×3, CLAUDE.md, README.md, templates)
- [ ] No stale old-version references found in repo
- [ ] CHANGELOG.md has concrete version and date, content matches actual changes
- [ ] README.md current — feature counts, badges, descriptions, examples
- [ ] Modified skill versions bumped in YAML frontmatter
- [ ] `docs/tree.md` current (if structure changed)
- [ ] `bun run devcheck` passes
- [ ] `bun run test` passes
- [ ] `bun run build` succeeds
- [ ] Clean release commit exists
- [ ] Annotated git tag exists with summary message
- [ ] User presented with publish commands (push, npm, Docker, mcp-publisher)
