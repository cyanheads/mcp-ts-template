---
name: polish
description: >
  Finalize documentation and project metadata for a ship-ready MCP server. Use after implementation is complete, tests pass, and devcheck is clean. Safe to run at any stage — each step checks current state and only acts on what still needs work.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: workflow
---

## When to Use

- Server implementation is functionally complete (tools, resources, prompts, services all working)
- `bun run devcheck` passes, tests pass
- You're preparing for first commit, first release, or making the repo public
- User says "polish", "finalize", "make it ship-ready", "clean up docs", or similar
- Re-running after adding/removing tools, resources, or other surface area changes

Prefer running after implementation is complete, but safe to re-run at any point — steps are idempotent.

## Prerequisites

- [ ] All tools/resources/prompts implemented and registered
- [ ] `bun run devcheck` passes
- [ ] Tests pass (`npm test`)

If these aren't met, address them first.

## Steps

### 1. Audit the Surface Area

Read all tool, resource, and prompt definitions. Build a mental model of what the server actually does — names, descriptions, input/output shapes, auth scopes. This inventory drives every document below.

Read:
- `src/index.ts` (what's registered in `createApp()`)
- All files in `src/mcp-server/tools/definitions/`
- All files in `src/mcp-server/resources/definitions/`
- All files in `src/mcp-server/prompts/definitions/`
- All files in `src/services/` (if any)
- `src/config/server-config.ts` (if any)

Capture: tool count, resource count, prompt count, service count, required env vars.

### 2. README.md

Read `references/readme.md` for structure and conventions. If `README.md` doesn't exist, create it from scratch. If it exists, diff the current content against the audit — update tool/resource/prompt tables, env var lists, and descriptions to match the actual surface area. Don't rewrite sections that are already accurate.

### 3. Agent Protocol (CLAUDE.md / AGENTS.md)

Update the project's agent protocol file to reflect the actual server.

Read `references/agent-protocol.md` for the full update checklist, then review the current file and address what's stale or missing:

- If a "First Session" onboarding block is still present, remove it
- If example patterns still use generic/template names (e.g., `searchItems`, `itemData`), replace with real definitions from this server
- If server-specific skills were added, update the skills table
- Verify the structure diagram matches the actual directory layout
- If custom scripts were added to `package.json`, update the commands table

### 4. `.env.example`

Compare `.env.example` against the server config Zod schema. Add any missing server-specific vars with a comment and default (if any). Remove vars for features that no longer exist. Group by category. Preserve existing framework vars that are still relevant.

### 5. `package.json` Metadata

Check for empty or placeholder metadata fields. Read `references/package-meta.md` for which fields matter and why. Fill in anything still missing — skip fields that are already correct.

Key fields: `description`, `repository`, `author`, `homepage`, `bugs`, `keywords`.

### 6. `CHANGELOG.md`

If `CHANGELOG.md` doesn't exist, create it with an initial entry. If it exists, verify the latest entry reflects the current state:

```markdown
# Changelog

## 0.1.0 — YYYY-MM-DD

Initial release.

### Added
- [list tools, resources, prompts, key capabilities]
```

Use a concrete version and date. Never `[Unreleased]`.

### 7. `LICENSE`

Confirm a license file exists. If not, ask the user which license to use (default: Apache-2.0, matching the scaffolded `package.json`). Create the file.

### 8. `docs/tree.md`

Regenerate the directory structure:

```bash
bun run tree
```

Review the output for anything unexpected (leftover files, missing directories).

### 9. Final Verification

Run the full check suite one last time:

```bash
bun run devcheck
npm test
```

Both must pass clean.

## Checklist

- [ ] Surface area audited — tool/resource/prompt/service inventory built
- [ ] `README.md` created/updated (see `references/readme.md`)
- [ ] Agent protocol file updated — onboarding stripped, real examples, accurate structure (see `references/agent-protocol.md`)
- [ ] `.env.example` includes all server-specific env vars
- [ ] `package.json` metadata filled (`description`, `repository`, `author`, `keywords`)
- [ ] `CHANGELOG.md` exists with initial entry
- [ ] `LICENSE` file present
- [ ] `docs/tree.md` regenerated
- [ ] `bun run devcheck` passes
- [ ] `npm test` passes
