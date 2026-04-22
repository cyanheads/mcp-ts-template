---
name: release
description: >
  Verify release readiness and publish. The git wrapup protocol handles version bumps, changelog, README, commits, and tagging during the coding session. This skill verifies nothing was missed, runs final checks, and presents the irreversible publish commands.
metadata:
  author: cyanheads
  version: "1.5"
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

### 3. Finalize the Per-Version Changelog File

The changelog is directory-based, grouped by minor series using the `.x` semver-wildcard convention: per-version files live at `changelog/<major.minor>.x/<version>.md` (e.g. `changelog/0.5.x/0.5.4.md`), and `CHANGELOG.md` is an auto-generated rollup (`bun run changelog:build`). `changelog/template.md` is a **pristine format reference** — never edited, never moved, never renamed. At release time, you're authoring (or finalizing) the per-version file for the version being shipped.

Create or finalize `changelog/<series>/<version>.md`:

1. Determine the series: `0.5.5` → `0.5.x/`. Create the directory if it doesn't exist: `mkdir -p changelog/<series>`
2. If the file doesn't exist yet, scaffold it by copying the structure of `changelog/template.md` into the new path. Do **not** `git mv` or otherwise rename `template.md` itself — it stays where it is.
3. Set the H1: `# <version> — <date>` (em-dash, ISO date)
4. **Fill in the frontmatter** at the top of the file:
   - `summary:` — one-line headline, ≤250 chars, no markdown. Write it like a GitHub Release title. Required.
   - `breaking:` — set to `true` if this release requires consumer code changes (API removal, signature change, config rename). Defaults to `false`. Renders `· ⚠️ Breaking` in the rollup when true.
5. Verify content:
   - Sections grouped correctly (Added / Changed / Fixed / Removed)
   - Accurately reflects what shipped — cross-reference with `git log` since the last tag
   - If this release absorbed pre-release versions (e.g., `0.6.0-beta.1`), consolidate their entries as `##`/`###` sub-headers inside this file (they share this version's frontmatter — no separate files)
   - **Issue/PR references use full URLs**, not bare `#NN`. GitHub's auto-link only renders inside its own UI; these files are read from `node_modules` too, where bare `#NN` is dead text. Use `[#38](https://github.com/<owner>/<repo>/issues/38)` (or `/pull/NN` for PRs). Only link numbers verified via `gh issue view NN` / `gh pr view NN` — never speculate on future numbers, since GitHub will happily resolve `#42` to whatever unrelated item already owns 42 and pull its title into timeline previews.
6. Regenerate the rollup: `bun run changelog:build` — warnings about missing summaries are expected during the legacy-file backfill period but should not include this release

Never hand-edit `CHANGELOG.md` — it's a build artifact. Devcheck's `Changelog Sync` step will fail if it drifts. Never edit `changelog/template.md` — it's the format reference, not a worksheet.

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
- [ ] `changelog/<major.minor>.x/<version>.md` created/finalized with concrete version, date, and frontmatter; `CHANGELOG.md` regenerated via `bun run changelog:build`; `changelog/template.md` untouched
- [ ] README.md current — feature counts, badges, descriptions, examples
- [ ] Modified skill versions bumped in YAML frontmatter
- [ ] `docs/tree.md` current (if structure changed)
- [ ] `bun run devcheck` passes
- [ ] `bun run test` passes
- [ ] `bun run build` succeeds
- [ ] Clean release commit exists
- [ ] Annotated git tag exists with summary message
- [ ] User presented with publish commands (push, npm, Docker, mcp-publisher)
