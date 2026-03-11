---
name: release
description: >
  Prepare and publish a core package release. Use when bumping the version, updating the changelog, and publishing to npm/Docker/GitHub. Stops before publish commands for user confirmation.
metadata:
  author: cyanheads
  version: "1.0"
  audience: internal
---

## Context

Publishing is a multi-step process with irreversible actions (npm publish,
Docker push). This skill handles preparation but stops before destructive
commands, requiring the user to execute them manually.

## Steps

1. **Determine version bump** — ask the user: patch, minor, or major?
2. **Update version** in:
   - `package.json` (`version` field)
   - `server.json` (`version` field, if present)
   - `CLAUDE.md` (version reference at the top)
   - `README.md` (version badge, if present)
3. **Update CHANGELOG.md** — add a new entry with:
   - Concrete version number and date (NEVER use `[Unreleased]`)
   - Grouped changes: Added, Changed, Fixed, Removed
   - Reference relevant PRs or commits
4. **Run `bun run devcheck`** — must pass cleanly
5. **Run `bun run test`** — all tests must pass
6. **Run `bun run build`** — verify build succeeds
7. **Commit** with message: `chore(release): v{{VERSION}}`
8. **Stop and inform the user** — the following commands require manual execution:

```bash
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

## Wrapup Checklist

Before committing, verify these files are in sync:

- `README.md` — version badge, feature counts, descriptions
- `package.json` — version
- `server.json` — version (if present)
- `CHANGELOG.md` — new entry with concrete version and date
- `CLAUDE.md` — version reference
- `docs/tree.md` — updated if structure changed

## Checklist

- [ ] Version bumped in all locations (package.json, server.json, CLAUDE.md, README.md)
- [ ] CHANGELOG.md updated with concrete version number and date
- [ ] `bun run devcheck` passes
- [ ] `bun run test` passes
- [ ] `bun run build` succeeds
- [ ] Release commit created: `chore(release): v{{VERSION}}`
- [ ] User informed of publish commands (npm, Docker, mcp-publisher)
