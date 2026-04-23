---
name: release-and-publish
description: >
  Ship a release end-to-end across every registry the project targets (npm, MCP Registry, GHCR). Runs the final verification gate, pushes commits and tags, then publishes to each applicable destination. Assumes git wrapup (version bumps, changelog, commit, annotated tag) is already complete — this skill is the post-wrapup publish workflow. Halts and alerts the user on the first failure.
metadata:
  author: cyanheads
  version: "2.0"
  audience: external
  type: workflow
---

## Preconditions

This skill runs **after** git wrapup. By the time it's invoked:

- `package.json` version is bumped
- `changelog/<major.minor>.x/<version>.md` is authored
- `CHANGELOG.md` is regenerated
- README and every version-bearing file is in sync
- Release commit (`chore: release v<version>`) exists
- Annotated tag (`v<version>`) exists locally
- Working tree is clean

If any are missing, halt and tell the user to finish wrapup first. Do not attempt to redo wrapup work from inside this skill.

## Failure Protocol

**Stop on the first non-zero exit.** No retries, no remediation from inside the skill. Report to the user:

1. Which step failed
2. The exact error output
3. Which destinations already received the release (npm published? tag pushed? etc.) so they know the partial state

The user fixes locally and re-invokes, or runs the remaining steps manually. Publishes hard-fail with "version already exists" if replayed — that's the signal the step already succeeded.

## Steps

### 1. Sanity-check wrapup outputs

Read `package.json` → capture `version`. Then verify:

```bash
git status --porcelain          # must be empty — clean working tree
git describe --exact-match --tags HEAD 2>&1   # must equal v<version>
git rev-parse --abbrev-ref HEAD  # note the branch name for step 3
```

If working tree is dirty or HEAD isn't on `v<version>`, halt.

### 2. Run the verification gate

All three must succeed. Use `test:all` if the script exists in `package.json`, otherwise fall back to `test`:

```bash
bun run devcheck
bun run rebuild
bun run test:all        # or `bun run test` if no test:all
```

Any non-zero exit → halt with the failing command's output.

### 3. Push to origin

```bash
git push
git push --tags
```

If the remote rejects either push, halt.

### 4. Publish to npm

```bash
bun publish --access public
```

`bun publish` uses whatever npm auth the user has configured in `~/.npmrc`. If 2FA is enabled on the npm account, the command will prompt for an OTP or open a browser — that's expected; the user completes it interactively.

**Friction reducers (optional, configure once):**

| Option | How |
|:--|:--|
| **npm granular access token** with "Bypass 2FA for publish" | Generate at npmjs.com → replace `_authToken` in `~/.npmrc` → no OTP prompt at all |
| **1Password CLI TOTP injection** (requires `brew install --cask 1password-cli` + signed-in `op`) | `bun publish --access public --otp="$(op item get 'npm' --otp)"` |

Halt on publish error other than "version already exists" (which means this step already ran).

### 5. Publish to MCP Registry

Only if `server.json` exists at the repo root (otherwise skip).

```bash
bun run publish-mcp
```

If `publish-mcp` isn't defined in `package.json`, add it (macOS):

```json
"publish-mcp": "mcp-publisher login github -token \"$(security find-generic-password -a \"$USER\" -s mcp-publisher-github-pat -w)\" && mcp-publisher publish"
```

Prereq: a GitHub PAT with `read:org` + `read:user` scopes stored in Keychain under the service name `mcp-publisher-github-pat`:

```bash
security add-generic-password -a "$USER" -s mcp-publisher-github-pat -w
# paste PAT at the silent prompt
```

Halt on any publisher error other than "cannot publish duplicate version".

### 6. Publish Docker image

Only if `Dockerfile` exists at the repo root (otherwise skip).

Derive:

- `OWNER/REPO` from `git remote get-url origin` (strip `.git`, handle both `https://github.com/<owner>/<repo>` and `git@github.com:<owner>/<repo>` forms)
- `VERSION` from `package.json` (step 1)

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/<OWNER>/<REPO>:<VERSION> \
  -t ghcr.io/<OWNER>/<REPO>:latest \
  --push .
```

If the project uses a non-GHCR registry or a custom image name, respect the project's convention. Halt on build or push failure.

### 7. Report the deployed artifacts

Print clickable URLs for every destination that succeeded:

- npm: `https://www.npmjs.com/package/<package.json#name>/v/<version>`
- MCP Registry: `https://registry.modelcontextprotocol.io/v0/servers?search=<package.json#mcpName>`
- GHCR: `ghcr.io/<OWNER>/<REPO>:<VERSION>`

Skip any destination that was skipped in its step.

## Checklist

- [ ] Working tree clean; HEAD tagged `v<version>`
- [ ] `bun run devcheck` passes
- [ ] `bun run rebuild` succeeds
- [ ] `bun run test:all` (or `test`) passes
- [ ] `git push` succeeds
- [ ] `git push --tags` succeeds
- [ ] `bun publish --access public` succeeds
- [ ] `bun run publish-mcp` succeeds (if `server.json` present)
- [ ] Docker buildx multi-arch push succeeds (if `Dockerfile` present)
- [ ] Deployed artifact URLs reported to the user
