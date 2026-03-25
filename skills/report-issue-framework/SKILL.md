---
name: report-issue-framework
description: >
  File a bug or feature request against @cyanheads/mcp-ts-core when you hit a framework issue. Use when a builder, utility, context method, or config behaves contrary to the documented API — not for server-specific application bugs.
metadata:
  author: cyanheads
  version: "1.1"
  audience: external
  type: workflow
---

## When to Use

You've isolated a problem to `@cyanheads/mcp-ts-core` itself — not your server code, not a misconfiguration, not a missing peer dependency. Typical triggers:

- Framework builder (`tool()`, `resource()`, `prompt()`) rejects valid input or produces incorrect output
- `createApp()` or `createWorkerHandler()` fails on a valid config
- `Context` properties (`ctx.log`, `ctx.state`, `ctx.elicit`, etc.) behave contrary to docs
- A utility from `/utils`, `/errors`, `/auth`, `/storage`, `/services` returns wrong results or throws unexpectedly
- Type exports are incorrect or missing (compile error on documented usage)
- The definition linter (`bun run lint:mcp`) produces false positives or misses real violations

## Before Filing

1. **Confirm framework version** — `bun pm ls @cyanheads/mcp-ts-core` or check `node_modules/@cyanheads/mcp-ts-core/package.json`
2. **Check you're on latest** — `bun outdated @cyanheads/mcp-ts-core`. If behind, update and retest before filing.
3. **Isolate the issue** — reproduce with a minimal handler or standalone script. Strip server-specific services, config, and dependencies. If the bug disappears when isolated, it's likely in your server code.
4. **Search existing issues** — don't file duplicates:

```bash
gh issue list -R cyanheads/mcp-ts-core --search "your error message or keyword"
```

## Redact Before Posting

GitHub issues are **public and permanent**. Before submitting any issue, scrub the title, body, logs, and code snippets for:

- **Secrets** — API keys, tokens, passwords, `MCP_AUTH_SECRET_KEY`, `OPENROUTER_API_KEY`, JWT values
- **Credentials** — auth headers (`Authorization: Bearer ...`), session IDs, cookie values
- **PII** — names, emails, IP addresses, user IDs tied to real people
- **Internal URLs** — private API endpoints, internal hostnames, database connection strings
- **Env dumps** — `process.env` output, `.env` file contents, Cloudflare Worker bindings

Replace sensitive values with obvious placeholders: `REDACTED`, `sk-...REDACTED`, `https://internal.example.com`, `user-id-123`. Do not rely on partial masking (`sk-abc...xyz`) — partial keys can still be exploited.

## Filing a Bug

The repo has YAML form issue templates. Use `--web` to open the form in the browser (preferred when available), or pass `--title` + `--body` for non-interactive use.

### Browser (interactive)

```bash
gh issue create -R cyanheads/mcp-ts-core --template "Bug Report" --web
```

### CLI (non-interactive)

Structure the `--body` to match the template's form fields:

````bash
gh issue create -R cyanheads/mcp-ts-core \
  --title "bug(scope): concise description" \
  --label "bug" \
  --body "$(cat <<'ISSUE'
### mcp-ts-core version

0.1.29

### Runtime

Bun

### Runtime version

Bun 1.2.x

### Transport

stdio

### OS

macOS 15.x

### Description

Brief explanation of the bug — what you expected vs what happened.

### Reproduction

```ts
import { tool, z } from '@cyanheads/mcp-ts-core';

export const broken = tool('broken_example', {
  description: 'Minimal repro.',
  input: z.object({ id: z.string().describe('ID') }),
  output: z.object({
    name: z.string().describe('Name'),
    extra: z.string().optional().describe('Optional field'),
  }),
  async handler(input, ctx) {
    return { name: 'test' }; // omitting optional field causes validation error
  },
});
```

### Actual behavior

```
Error: Output validation failed: ...
```

### Expected behavior

Omitting an optional output field should pass validation.

### Additional context

Any workarounds, related issues, or observations.
ISSUE
)"
````

### Title conventions

Format: `bug(<scope>): concise description`

| Scope | When |
|:------|:-----|
| `tool` | Tool builder, handler, format, annotations |
| `resource` | Resource builder, handler, list, params |
| `prompt` | Prompt builder, generate, args |
| `context` | Context, logger, state, progress, elicit, sample |
| `config` | AppConfig, parseConfig, env parsing |
| `errors` | McpError, error factories, auto-classification |
| `auth` | Auth modes, scope checking, JWT/OAuth |
| `storage` | StorageService, providers |
| `transport` | stdio/http transport, SSE, session handling |
| `worker` | createWorkerHandler, Worker runtime |
| `utils` | Utilities (formatting, parsing, pagination, etc.) |
| `linter` | Definition linter false positives/negatives |
| `types` | Type exports, type inference |
| `services` | LLM, Speech, Graph services |
| `deps` | Dependency issues, peer dep conflicts |

### Labels

| Label | When |
|:------|:-----|
| `bug` | Something broken |
| `regression` | Worked before, broken after update |
| `types` | TypeScript type issue |
| `docs` | Documentation is wrong or misleading |
| `enhancement` | Feature request or improvement (not a bug) |

Combine labels: `--label "bug" --label "types"`.

### Attaching logs or stack traces

For long output, write to a file and attach:

```bash
bun run dev:stdio 2>&1 | head -100 > /tmp/mcp-error.log

# As part of a new issue
gh issue create -R cyanheads/mcp-ts-core \
  --title "bug(transport): stdio crashes on large payload" \
  --label "bug" \
  --body-file /tmp/mcp-error.log

# Or as a comment on an existing issue
gh issue comment <number> -R cyanheads/mcp-ts-core --body-file /tmp/mcp-error.log
```

## Filing a Feature Request

### Browser (interactive)

```bash
gh issue create -R cyanheads/mcp-ts-core --template "Feature Request" --web
```

### CLI (non-interactive)

````bash
gh issue create -R cyanheads/mcp-ts-core \
  --title "feat(scope): concise description" \
  --label "enhancement" \
  --body "$(cat <<'ISSUE'
### Use case

Describe the problem you're solving and why the framework should handle it.

### Proposed API

```ts
import { withRetry } from '@cyanheads/mcp-ts-core/utils';

const result = await withRetry(() => fetchExternal(url), {
  maxAttempts: 3,
  backoff: 'exponential',
});
```

### Alternatives considered

What you tried or considered instead.
ISSUE
)"
````

## Following Up

```bash
# Check issue status
gh issue view <number> -R cyanheads/mcp-ts-core

# Add context or respond to maintainer questions
gh issue comment <number> -R cyanheads/mcp-ts-core --body "Additional context..."

# List your open issues
gh issue list -R cyanheads/mcp-ts-core --author @me
```

## Checklist

- [ ] Confirmed bug is in `@cyanheads/mcp-ts-core`, not server code
- [ ] Running latest (or documented) framework version
- [ ] Searched existing issues — no duplicate found
- [ ] All secrets, credentials, PII, and internal URLs redacted
- [ ] Issue filed with: version, runtime, repro code, actual vs expected behavior
