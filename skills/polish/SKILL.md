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

Create or rewrite `README.md`. This is the face of the project.

Read `references/readme.md` for structure and conventions, then generate the README from the audit above. Key sections: overview, features (tool/resource table), installation, configuration, development commands.

### 3. Agent Protocol (CLAUDE.md / AGENTS.md)

Update the project's agent protocol file to reflect the actual server.

Read `references/agent-protocol.md` for the update checklist, then:

- Strip the "First Session" onboarding block (it's one-time only)
- Replace example patterns with real tool/resource/prompt examples from this server
- Update the skills table if server-specific skills were added
- Verify the structure diagram matches reality
- Update commands table if custom scripts were added

### 4. `.env.example`

Merge server-specific env vars into `.env.example`. For each var in the server config Zod schema, add a commented line with description and default (if any). Group by category. Preserve the existing framework vars.

### 5. `package.json` Metadata

Fill in fields that `init` left empty. Read `references/package-meta.md` for which fields matter and why.

Key fields: `description`, `repository`, `author`, `homepage`, `bugs`, `keywords`.

### 6. `CHANGELOG.md`

Create `CHANGELOG.md` with an initial entry if it doesn't exist:

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
