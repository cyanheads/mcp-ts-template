---
name: security-pass
description: >
  Review an MCP server for common security gaps: tool output as LLM injection, scope blast radius, destructive ops without consent, upstream auth shape, input sinks, tenant isolation, leaked data, unbounded resources. Use before a release, after a batch of handler changes, or when the user asks for a security review, audit, or hardening pass. Produces grouped findings and a numbered options list.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: audit
---

## Context

An MCP server is a new attack surface with unique properties — tool output feeds back into the LLM's context, scopes gate what the model can do on the user's behalf, and per-request state must stay tenant-scoped. This skill walks a server through eight axes shaped around what the server builder actually controls. Framework-level concerns (transport, JSON-RPC parsing, auto-correlation, error classification) are out of scope — `mcp-ts-core` handles those.

**Read the code. Don't trust patterns from memory.**

## When to Use

- Before a release
- After adding or modifying a batch of handlers or services
- Periodically (quarterly-ish)
- User asks for a "security review", "audit", "hardening pass", or similar

## Inputs

Gather before starting. Ask if unclear:

1. **Scope** — whole server, specific module, or recent diff?
2. **Known concerns** — anything the user already suspects?
3. **Deployment context** — multi-tenant? public network? auth mode? (stdio / local-http / public-http behave differently)
4. **Severity floor** — report all findings, or skip medium/low?

## Steps

### 1. Build the map

Surface what you're auditing before diving in.

```bash
find src/mcp-server/tools/definitions -name "*.tool.ts" | sort
find src/mcp-server/resources/definitions -name "*.resource.ts" 2>/dev/null | sort
find src/services -maxdepth 1 -mindepth 1 -type d | sort
```

Note: tool count, auth mode, storage provider, upstream APIs, which tools have `destructiveHint`, which services hold module-scope state.

Use `TaskCreate` — one task per axis. Mark complete as you go.

### 2. Walk the eight axes

#### Axis 1 — Tool output as LLM injection vector

Tool output enters the next LLM turn. Relayed upstream content (tickets, scraped text, emails, DB rows) can contain adversarial instructions even when your code is honest.

**Look in:** every `*.tool.ts` — `output` schema + `format()`.

**Check:**

- Handlers that return raw upstream text without structural framing?
- Does `format()` wrap untrusted content in delimiters (blockquote, fenced code, `<data>` tags)?
- Output schema distinguishes "data" fields from free-form text?

**Smell:** `return { body: await fetch(url).then(r => r.text()) }` rendered directly in `format()`.

#### Axis 2 — Scope granularity

Every `auth: [...]` entry is a blast-radius dial.

**Look in:** every `*.tool.ts` — `auth:` array.

```bash
grep -rn "auth: \[" src/mcp-server/tools/definitions/
```

**Check:**

- Tools with `['admin']`, `['*']`, or `[]`?
- A single scope covering two capabilities that should be separated (read vs write)?
- Read-only tools never require write scopes?

**Smell:** every tool shares the same scope string.

#### Axis 3 — Destructive ops without elicit

`ctx.elicit` moves consent off the LLM and onto the user. Destructive tools without it trust the LLM not to be tricked.

**Look in:** handlers with `destructiveHint: true` or side-effecting verbs in names (`delete_*`, `send_*`, `pay_*`, `publish_*`, `drop_*`).

```bash
grep -rn "destructiveHint" src/mcp-server/tools/definitions/
grep -rn "ctx.elicit" src/mcp-server/tools/definitions/
```

**Check:**

- Each destructive handler calls `ctx.elicit` before the side effect?
- Fallback when client doesn't support elicit — refuses, not silently proceeds?

**Smell:** `destructiveHint: true` file with no `ctx.elicit?.(...)` in it.

#### Axis 4 — Upstream auth shape

What credentials the server holds, and the blast radius if one leaks.

**Look in:** `src/services/*`, `src/config/server-config.ts`.

**Check:**

- Each upstream API key scoped to minimum required? (No admin keys for read workflows.)
- Services re-mint downstream tokens with correct `aud`, or passthrough the caller's?
- Server holds OAuth for N services × M tenants — what does one-tenant compromise expose?
- Per-tenant rate limits on upstream calls?

**Smell:** one global `API_KEY` used across all tenants + retry loop with no upper bound.

#### Axis 5 — Input sinks

LLM-supplied inputs feel internal but aren't. Classic sinks apply, amplified.

**Look in:** all handlers.

```bash
# URL sinks — SSRF
grep -rn "z.string().url()" src/

# Path sinks — traversal
grep -rn "readFile\|writeFile\|readdirSync\|createReadStream\|statSync" src/

# Shell sinks — command injection
grep -rnE "\b(exec|spawn|execSync|spawnSync)\b" src/

# Merges — prototype pollution
grep -rn "Object.assign\b\|structuredClone" src/
```

**Check:**

- URL-taking tools block private IPs, `file://`, `ftp://`, `localhost`, DNS rebind?
- Path-taking tools canonicalize (`path.resolve` + assert `startsWith(root + sep)`)?
- Shell-using tools use an allowlist (never string-concat)?
- Regex / query / expression inputs bounded?
- User-JSON merges reject `__proto__`, `constructor`, `prototype` keys?

**Smell:** `z.string().url()` with no allowlist; `readFile(input.path)` with no canonicalization.

#### Axis 6 — Tenant isolation

`ctx.state` is tenant-scoped. Module-scope state is not.

**Look in:** `src/services/*`.

```bash
grep -rnE "^(const|let) .* = new (Map|Set|WeakMap|Array)" src/services/
grep -rn "^let " src/services/
```

**Check:**

- Module-scope `Map` / `Set` / cache near tenant-handling code?
- Upstream connections pooled per-tenant or shared?
- Any code path uses the global `logger` while carrying per-tenant data (bypassing auto-correlated `ctx.log`)?
- Could tenant B, served after tenant A, read tenant A's cached data?

**Smell:** service file with top-level `const cache = new Map()`.

#### Axis 7 — Leakage back

What accidentally reaches the LLM, user, or logs.

**Look in:** `throw new McpError(...)` sites, `McpError.data` fields, output schemas, `ctx.log.*` calls.

```bash
grep -rn "new McpError" src/
grep -rn "ctx.log\." src/
```

**Check:**

- Error `data` fields carry upstream response bodies, auth headers, stack traces?
- Output schemas include token prefixes, internal IDs, session identifiers?
- `format()` renders fields that shouldn't leave the server?
- `ctx.log.info(msg, body)` where `body` is the raw request (may contain secrets)?

**Smell:** `throw new McpError(code, upstream.message, { raw: upstream.body })`.

#### Axis 8 — Resource bounds

Unbounded = DoS of self, upstream, or the LLM's context window (billing-DoS is real).

**Look in:** handlers with loops, pagination, retries.

```bash
grep -rnE "while\s*\(|for\s*\(.*of" src/mcp-server/tools/definitions/
grep -rn "cursor\|nextPage\|paginate" src/
```

**Check:**

- Pagination loops have a total-items cap?
- Retry logic has max attempts + exponential backoff?
- Output size proportional to input — is there a ceiling?
- Tools callable in a loop fail-fast on degenerate input (empty string, `0`, `null`)?

**Smell:** `while (cursor) { results.push(...); cursor = next; }` with no max count.

### 3. Quick sanity pass

Fast, sometimes high-leverage. Outside the eight axes.

- `bun audit` — any direct high/critical?
- `package.json` — `postinstall` / lifecycle scripts on added deps?
- `.env.example` — placeholder values only, never real?
- Server-specific `ConfigSchema` — fails loudly on missing required keys (not silent defaults)?
- Any `process.env.*` reads outside the config parser (bypasses validation)?

**Automated assist.** `fuzzTool` from `@cyanheads/mcp-ts-core/testing/fuzz` catches crashes, memory leaks, and prototype pollution automatically — run it on each tool as a cheap first pass.

### 4. Report

Three sections. Summary → findings → numbered options.

#### Summary (1 paragraph)

Definitions reviewed, axes covered, count by severity, the single most important finding.

#### Findings

Group by severity. Each 3–5 lines.

| Severity | Meaning |
|:---------|:--------|
| **critical** | Exploitable now: auth bypass, exfiltration, arbitrary code/file/network access |
| **high** | Structural gap with clear attacker benefit even without immediate PoC (destructive op without elicit, admin scope on read tool, SSRF-capable URL input) |
| **medium** | Defense-in-depth gap weakening a boundary (missing per-tenant rate limit, error carries upstream response) |
| **low** | Hardening / polish (tighter output schema, narrower error data, minor comment) |

Format:

```
**<file_or_tool> — Axis <N> — <critical|high|medium|low>**
Issue: <one line: what's wrong>
Impact: <one line: what can go wrong>
Fix: <one line: the change>
```

#### Options

Numbered, cherry-pickable.

```
1. Add SSRF guard to `fetch_url.tool.ts` — block private IPs + non-http schemes (critical, #1)
2. Gate `delete_record.tool.ts` behind `ctx.elicit` (high, #3)
3. Split `admin` into `record:read` + `record:write` across 4 tools (high, #4)
4. Move `const tokenCache = new Map()` out of module scope in `auth-service.ts` (medium, #7)
5. Cap pagination loop in `list_all_tickets` at 1000 items (medium, #9)
6. Strip upstream response body from `McpError.data` in `sync-service.ts` (low, #11)
```

End with:

> Pick by number (e.g. "do 1, 3, 5" or "expand on 2").

## Checklist

- [ ] Scope confirmed (whole server / module / diff)
- [ ] Map built: tool count, services, upstream APIs, auth mode
- [ ] Axis 1 — tool output framing reviewed
- [ ] Axis 2 — scope granularity audited
- [ ] Axis 3 — destructive ops verified to elicit
- [ ] Axis 4 — upstream auth + token passthrough reviewed
- [ ] Axis 5 — input sinks (URL / path / shell / proto) checked
- [ ] Axis 6 — tenant isolation: module-scope state swept
- [ ] Axis 7 — leakage back: errors / outputs / logs reviewed
- [ ] Axis 8 — resource bounds on loops / retries / pagination
- [ ] Quick sanity pass: `bun audit`, lifecycle scripts, `.env.example`, config validation
- [ ] Report: summary → grouped findings → numbered options
