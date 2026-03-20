---
name: release
description: >
  Prepare and publish a core package release. Use when bumping the version, updating the changelog, and publishing to npm/Docker/GitHub. Stops before publish commands for user confirmation.
metadata:
  author: cyanheads
  version: "1.1"
  audience: internal
  type: workflow
---

## Context

Publishing is a multi-step process with irreversible actions (npm publish, Docker push). This skill handles preparation but stops before destructive commands, requiring the user to execute them manually.

## Steps

### 1. Determine Version Bump

Ask the user: patch, minor, or major? Use the CHANGELOG diff to guide the recommendation — breaking changes → major, new features → minor, fixes only → patch.

### 2. Update Version Strings

Update the version in **all** of these locations:

| File | What to Update |
|:-----|:---------------|
| `package.json` | `version` field |
| `server.json` | Root `version` + `version` in each `packages[]` entry (3 total) |
| `CLAUDE.md` | Version in the header (`**Version:** X.Y.Z`) |
| `README.md` | Version badge (`Version-X.Y.Z-blue`) and any other version references |

Search for the old version string across the repo to catch anything else.

### 3. Update README.md

Beyond the version badge, review and update:

- Feature counts (tool count, resource count, etc.) if the surface area changed
- Descriptions and capability lists if new features were added
- MCP SDK version badge if the SDK dependency was bumped
- Code examples if APIs changed

### 4. Update Template Files

Update version in scaffolded templates so new projects start with the correct version:

| File | What to Update |
|:-----|:---------------|
| `templates/CLAUDE.md` | `**Version:** X.Y.Z` in the header |
| `templates/AGENTS.md` | Same — these files are identical |

### 5. Bump Modified Skill Versions

For any skills whose `SKILL.md` was modified in this release cycle, bump `metadata.version` in their YAML frontmatter. This is how the `maintenance` skill detects updates — if the version doesn't bump, consumers won't get the new content on `bun update`.

### 6. Update CHANGELOG.md

Add a new entry with:

- Concrete version number and date (NEVER use `[Unreleased]`)
- Grouped changes: Added, Changed, Fixed, Removed
- Reference relevant PRs or commits

### 7. Regenerate `docs/tree.md`

```bash
bun run tree
```

Review the output for accuracy. Skip if no structural changes occurred.

### 8. Verify

Run all checks — all must pass:

```bash
bun run devcheck
bun run test
bun run build
```

### 9. Commit

```text
chore: release v{{VERSION}}
```

### 10. Tag

Create an **annotated** git tag with a concise summary of the release:

```bash
git tag -a v{{VERSION}} -m "v{{VERSION}}: <one-line summary of key changes>"
```

The tag message should capture the most important change(s) — not the full changelog, just enough to orient someone browsing tags. Examples:

```text
v0.2.0: Cloudflare Workers support, task tools, Graph service
v0.1.7: OTel instrumentation refactor, lighter semconv
v0.1.6: Error factory functions, auto-classification patterns
```

### 11. Stop and Inform the User

The following commands are irreversible and require manual execution:

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

## Checklist

- [ ] Version bumped in all locations (package.json, server.json ×3, CLAUDE.md, README.md)
- [ ] README.md reviewed — feature counts, badges, descriptions current
- [ ] Template files updated (templates/CLAUDE.md, templates/AGENTS.md)
- [ ] Modified skill versions bumped in YAML frontmatter
- [ ] CHANGELOG.md updated with concrete version and date
- [ ] `docs/tree.md` regenerated (if structure changed)
- [ ] `bun run devcheck` passes
- [ ] `bun run test` passes
- [ ] `bun run build` succeeds
- [ ] Release commit created
- [ ] Annotated git tag created: `v{{VERSION}}`
- [ ] User informed of publish commands (push, npm, Docker, mcp-publisher)
