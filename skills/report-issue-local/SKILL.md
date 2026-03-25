---
name: report-issue-local
description: >
  File a bug or feature request against this MCP server's own repo. Use for server-specific issues — tool logic, service integrations, config problems, or domain bugs that aren't caused by the framework.
metadata:
  author: cyanheads
  version: "1.1"
  audience: external
  type: workflow
---

## When to Use

The bug is in this server's code, not in `@cyanheads/mcp-ts-core`. Typical triggers:

- A tool handler returns wrong results or throws on valid input
- A service integration (external API, database, third-party SDK) fails or misbehaves
- Server-specific config (`server-config.ts`) rejects valid env vars or has wrong defaults
- Resource handlers return stale, incomplete, or incorrect data
- Domain logic errors — wrong calculations, missing edge cases, bad state transitions
- Missing or incorrect `.describe()` on schema fields causing poor LLM tool use

**If the issue is in the framework itself** (builders, Context, utilities, type exports, linter), use `report-issue-framework` instead.

## Before Filing

1. **Identify the repo**:

```bash
gh repo view --json nameWithOwner -q '.nameWithOwner'
```

2. **Search existing issues**:

```bash
gh issue list --search "your error message or keyword"
```

3. **Reproduce the issue** — confirm it's reproducible. Note the exact input, transport mode, and any relevant env vars.

4. **Check logs** — review `ctx.log` output and any framework telemetry for clues. If running HTTP, check the response body for structured error details.

## Redact Before Posting

GitHub issues are **public and permanent**. Before submitting any issue, scrub the title, body, logs, and code snippets for:

- **Secrets** — API keys, tokens, passwords, env var values from `.env` or server config
- **Credentials** — auth headers (`Authorization: Bearer ...`), session IDs, cookie values
- **PII** — names, emails, IP addresses, user IDs tied to real people
- **Internal URLs** — private API endpoints, internal hostnames, database connection strings
- **Env dumps** — `process.env` output, `.env` file contents, Worker bindings

Replace sensitive values with obvious placeholders: `REDACTED`, `sk-...REDACTED`, `https://internal.example.com`, `user-id-123`. Do not rely on partial masking (`sk-abc...xyz`) — partial keys can still be exploited.

## Filing a Bug

This repo includes YAML form issue templates (scaffolded from the framework). Use `--web` to open the form in the browser (preferred when available), or pass `--title` + `--body` for non-interactive use.

### Browser (interactive)

```bash
gh issue create --template "Bug Report" --web
```

### CLI (non-interactive)

Structure the `--body` to match the template's form fields:

````bash
gh issue create \
  --title "bug(tool_name): concise description" \
  --label "bug" \
  --body "$(cat <<'ISSUE'
### Server version

0.1.0

### mcp-ts-core version

0.1.29

### Runtime

Bun

### Runtime version

Bun 1.2.x

### Transport

stdio

### Description

What happened and what you expected instead.

### Steps to reproduce

1. Call `tool_name` with input: `{ "key": "value" }`
2. Observe error / wrong output

### Actual behavior

```
Error or incorrect output here
```

### Expected behavior

What should have happened.

### Additional context

Relevant `ctx.log` output, stack traces, or telemetry spans.
ISSUE
)"
````

### Title conventions

Format: `type(scope): description`

- **type:** `bug`, `feat`, `docs`, `chore`
- **scope:** tool name, service name, resource name, `config`, `auth`, or domain area

Examples:
- `bug(search_docs): returns empty results for queries with special characters`
- `feat(analytics): add date range filter to usage_report tool`
- `docs(setup): .env.example missing REDIS_URL`

### Labels

| Label | When |
|:------|:-----|
| `bug` | Something broken |
| `enhancement` | New feature or improvement |
| `docs` | Documentation issue |
| `config` | Configuration or environment issue |
| `regression` | Worked before, broken after a change |

Combine labels: `--label "bug" --label "regression"`.

### Attaching logs or large output

```bash
bun run dev:stdio 2>&1 | head -200 > /tmp/server-error.log

# As part of a new issue
gh issue create \
  --title "bug(ingest): crashes on large payload" \
  --label "bug" \
  --body-file /tmp/server-error.log

# Or as a comment on an existing issue
gh issue comment <number> --body-file /tmp/server-error.log
```

## Filing a Feature Request

### Browser (interactive)

```bash
gh issue create --template "Feature Request" --web
```

### CLI (non-interactive)

````bash
gh issue create \
  --title "feat(scope): concise description" \
  --label "enhancement" \
  --body "$(cat <<'ISSUE'
### Use case

What problem does this solve? Who benefits?

### Proposed behavior

Describe the expected behavior or API change.

### Alternatives considered

What you tried or considered instead.
ISSUE
)"
````

## Triage: Framework vs Server

Not sure where the bug lives? Quick checks:

| Signal | Likely framework | Likely server |
|:-------|:-----------------|:--------------|
| Error originates in `node_modules/@cyanheads/mcp-ts-core/` | Yes | |
| Error in `src/mcp-server/tools/` or `src/services/` | | Yes |
| Same bug reproduces with a bare `tool()` definition (no services) | Yes | |
| Bug disappears when you swap in a dummy handler | | Yes |
| `ctx.state`, `ctx.log`, `ctx.elicit` behave wrong on any tool | Yes | |
| Only one specific tool/resource is affected | | Yes |

When genuinely ambiguous, file against this server's repo and note that it might be a framework issue. The maintainer can transfer it upstream.

## Following Up

```bash
# View issue details
gh issue view <number>

# Add context
gh issue comment <number> --body "Additional findings..."

# List your open issues
gh issue list --author @me

# Close if resolved
gh issue close <number> --reason completed --comment "Fixed in <commit or PR>"
```

## Checklist

- [ ] Confirmed bug is in server code, not the framework
- [ ] Searched existing issues — no duplicate found
- [ ] All secrets, credentials, PII, and internal URLs redacted
- [ ] Issue filed with: version, runtime, repro steps, actual vs expected behavior
