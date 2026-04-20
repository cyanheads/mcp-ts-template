---
name: maintenance
description: >
  Investigate, adopt, and verify dependency updates — with special handling for `@cyanheads/mcp-ts-core`. Captures what changed, understands why, cross-references against the codebase, adopts framework improvements, syncs project skills, and runs final checks. Supports two entry modes: run the full flow end-to-end, or review updates you already applied.
metadata:
  author: cyanheads
  version: "1.3"
  audience: external
  type: workflow
---

## When to Use

- After running `bun update --latest` yourself and wanting to review the impact (**Mode B** — typical)
- To run the whole flow end-to-end — outdated check → update → investigate → adopt → verify (**Mode A**)
- Periodically, to check for skill drift from the package

## Entry Modes

| Mode | Starting Point | First Step |
|:-----|:---------------|:-----------|
| **A — Full flow** | Lockfile is current; want to update | Step 1 |
| **B — Post-update review** | User already ran `bun update --latest` + `bun run rebuild` + `bun run test` | Skip to Step 3 with the update output or `git diff bun.lock` |

Both modes converge at Step 3 and end at Step 8.

## Steps

### 1. Survey what's outdated (Mode A only)

```bash
bun outdated
```

Note: `bun update --latest` crosses semver majors; `bun update` alone respects ranges. Use `--latest` unless a package is intentionally pinned.

### 2. Apply the update (Mode A only)

```bash
bun update --latest
```

Capture the `↑ package old → new` lines from stdout — these feed Step 3. Alternatively, `git diff bun.lock` surfaces version deltas after the fact.

### 3. Investigate changelogs

Invoke the **`changelog`** skill with the captured list of updated packages. It resolves each repo, fetches release notes (or CHANGELOG entries) between old and new versions, and cross-references changes against actual imports in `src/`. Output per package: what changed, impact on this project, action items.

Do not redo this investigation inline — the `changelog` skill handles tag-format detection, monorepo patterns, and fallbacks.

### 4. Framework review (`@cyanheads/mcp-ts-core`)

If `@cyanheads/mcp-ts-core` was updated, do a deeper pass beyond what the `changelog` skill covers. Read:

```bash
node_modules/@cyanheads/mcp-ts-core/CHANGELOG.md
```

Extract entries between the old and new version. Scan specifically for:

| Area | Adoption Check |
|:-----|:---------------|
| New error factories in `/errors` | Replace ad-hoc `new McpError(...)` with factories where applicable |
| New utilities in `/utils` | Identify any that supersede local helper code |
| New context capabilities | Added `ctx.*` methods worth adopting |
| Provider/service APIs | Updates to `OpenRouterProvider`, `SpeechService`, `GraphService`, etc. |
| Deprecations | Migrate now, before the next breaking release |
| Config changes | New env vars, renamed keys, changed defaults |
| Linter rules | New definition-lint rules that may now flag existing tools/resources |

Cross-reference each finding against the server's code. Collect adoption opportunities for Step 6.

**Template review.** The framework also ships `templates/CLAUDE.md` and `templates/AGENTS.md` as scaffolding for consumer agent protocol files. The consumer's `CLAUDE.md`/`AGENTS.md` was copied at init time and has since diverged (local customizations, echo replacements, server-specific sections). Read the upstream template fresh:

```bash
node_modules/@cyanheads/mcp-ts-core/templates/CLAUDE.md
```

Skip the mechanical diff — consumer customizations create too much noise to filter. Instead, read end-to-end with fresh eyes, mentally comparing against the current `CLAUDE.md`. Look for: new conventions, updated skill references, expanded checklists, new callouts, clearer explanations, restructured sections. Present findings; let the user cherry-pick what to adopt. Never auto-merge — the consumer's file is theirs.

### 5. Sync project skills

Skills flow in two hops: package → project `skills/` → agent directories.

**Phase A — Package → Project `skills/`**

1. **Package** — `node_modules/@cyanheads/mcp-ts-core/skills/` (canonical source)
2. **Project** — `skills/` at project root (working copy; may contain local overrides or server-specific skills)

Procedure:

1. List all skill directories in `node_modules/@cyanheads/mcp-ts-core/skills/`
2. For each skill with `metadata.audience: external` in its `SKILL.md` frontmatter:
   - If missing in project `skills/`, copy the full directory
   - If present, compare `metadata.version` — replace if the package version is newer
   - If the local version is equal or newer, skip (local override)
3. Do not touch skills in `skills/` that don't exist in the package (server-specific)

**Phase B — Project `skills/` → Agent directories**

The `setup` skill instructs consumers to copy `skills/*` into their agent's skill directory at init time. Those copies go stale unless re-synced. Detect which agent directories exist and propagate:

| Agent | Directory |
|:------|:----------|
| Claude Code | `.claude/skills/` |
| Generic / shared | `.agents/skills/` |
| Codex | `.codex/skills/` |
| Cursor | `.cursor/skills/` |
| Windsurf | `.windsurf/skills/` |

For each agent directory that exists:

1. For every directory in project `skills/`, copy it into the agent dir (overwrite on match, add if missing)
2. Do **not** delete skills in the agent dir that aren't in project `skills/` — they may be general-purpose skills sourced elsewhere (e.g., `code-security`, `cloudflare`, `changelog`)

If no agent directory exists, skip Phase B — the project hasn't opted in to per-agent skill copies.

**Report** which skills were added/updated in Phase A (with version deltas) and which agent directories were refreshed in Phase B. The user needs to know what new guidance is now available and where.

### 6. Adopt changes in the codebase

Apply the findings from Steps 3 and 4:

- **Breaking changes** — fix call sites
- **Deprecations** — migrate now, while context is fresh
- **New framework features** — refactor targeted spots only; don't cargo-cult everywhere
- **New configuration** — update `.env.example`, server config schema, README if user-facing

Keep diffs focused. Don't sweep refactors beyond the update's scope.

### 7. Rebuild and verify

```bash
bun run rebuild
bun run devcheck
bun run test
```

`rebuild` (clean + build) catches API surface and type-alignment issues that `devcheck` alone may miss — module resolution, path aliases, post-build processing. `devcheck` includes `bun audit` and `bun outdated`, so no separate audit step is needed.

In **Mode B**, the user already ran rebuild + test before invoking this skill, but run them again here — Step 6 made code changes that need verification.

Fix anything that fails. Re-run until clean.

### 8. Summary

Present a concise numbered summary to the user:

1. **Updated packages** — short list with version deltas (N total)
2. **Breaking changes handled** — call sites fixed
3. **Features adopted** — new framework APIs now in use
4. **Skills synced** — added/updated with versions (Phase A) and agent directories refreshed (Phase B)
5. **Needs attention** — anything deferred, flagged for decision, or risky
6. **Status** — rebuild / devcheck / test results

## Checklist

- [ ] Update applied (`bun update --latest`) — Mode A, or already done by user — Mode B
- [ ] `changelog` skill invoked for each updated package
- [ ] Framework CHANGELOG reviewed if `@cyanheads/mcp-ts-core` was updated
- [ ] Adoption opportunities identified and applied
- [ ] Project `skills/` synced from package (Phase A), with a change report
- [ ] Agent skill directories (`.claude/skills/`, `.agents/skills/`, etc.) refreshed from project `skills/` (Phase B)
- [ ] `bun run rebuild` succeeds
- [ ] `bun run devcheck` passes (includes audit + outdated)
- [ ] `bun run test` passes
- [ ] Numbered summary presented to user
