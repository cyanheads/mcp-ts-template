---
name: api-auth
description: >
  Authentication, authorization, and multi-tenancy patterns for `@cyanheads/mcp-ts-core`. Use when implementing auth scopes on tools/resources, configuring auth modes (none/jwt/oauth), working with JWT/OAuth env vars, or understanding how tenantId flows through ctx.state.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Overview

The framework handles auth at the handler factory level — tools and resources declare required scopes declaratively, and the framework enforces them before calling the handler. No try/catch or manual scope checking required for the common case.

---

## Inline Auth (Primary Pattern)

Declare required scopes directly on the tool or resource definition via the `auth` property. The handler factory checks `ctx.auth.scopes` against these before calling `handler`.

```ts
import { tool } from '@cyanheads/mcp-ts-core';

const myTool = tool('my_tool', {
  auth: ['tool:my_tool:read'],
  async handler(input, ctx) {
    // Only reached if caller has 'tool:my_tool:read' scope
  },
});
```

When `MCP_AUTH_MODE=none`, auth checks are skipped and defaults are allowed.

---

## Dynamic Auth

For runtime-computed scopes (e.g., scopes that depend on input values like a team or resource ID), use `checkScopes` from `@cyanheads/mcp-ts-core/auth` inside the handler:

```ts
import { checkScopes } from '@cyanheads/mcp-ts-core/auth';

handler: async (input, ctx) => {
  checkScopes(ctx, [`team:${input.teamId}:write`]);
  // Continues only if scope is satisfied; throws McpError(Forbidden) otherwise
},
```

---

## Auth Modes

Set via `MCP_AUTH_MODE` environment variable.

| Mode | Value | Behavior |
|:-----|:------|:---------|
| Disabled | `none` | No auth enforcement. All requests allowed. |
| JWT | `jwt` | Local secret verification via `MCP_AUTH_SECRET_KEY`. Dev bypass if key is missing. |
| OAuth | `oauth` | JWKS verification against an external issuer. |

### JWT Config

| Variable | Purpose |
|:---------|:--------|
| `MCP_AUTH_SECRET_KEY` | Signing secret for HS256 JWT verification |

### OAuth Config

| Variable | Required | Purpose |
|:---------|:---------|:--------|
| `OAUTH_ISSUER_URL` | Yes | Token issuer URL (used for JWKS discovery) |
| `OAUTH_AUDIENCE` | Yes | Expected `aud` claim value |
| `OAUTH_JWKS_URI` | No | Override JWKS endpoint (defaults to `{issuer}/.well-known/jwks.json`) |

### JWT Claims Mapping

| Claim | JWT Field | Purpose |
|:------|:----------|:--------|
| `clientId` | `cid` / `client_id` | Identifies the calling client |
| `scopes` | `scp` / `scope` | Space-separated list of granted scopes |
| `sub` | `sub` | Subject (user or service identity) |
| `tenantId` | `tid` | Tenant identifier — drives `ctx.state` scoping |

---

## Endpoints

| Endpoint | Protected |
|:---------|:----------|
| `GET /healthz` | No |
| `GET /mcp` | No |
| `POST /mcp` | Yes (when auth enabled) |
| `OPTIONS /mcp` | Yes (when auth enabled) |

**CORS:** Set `MCP_ALLOWED_ORIGINS` to a comma-separated list of allowed origins, or `*` for open access.

**Stdio mode:** No HTTP auth layer. Authorization is handled entirely by the host process.

---

## Multi-Tenancy

`ctx.state` is automatically scoped to the current tenant — no manual key prefixing needed.

### tenantId Sources

| Transport | Source | Value |
|:----------|:-------|:------|
| HTTP with auth | JWT `tid` claim | Auto-propagated from token |
| Stdio | Hardcoded default | `'default'` |

### Tenant ID Validation Rules

- Max 128 characters
- Characters: alphanumeric, hyphens, underscores, dots
- Must start and end with an alphanumeric character
- No path traversal sequences (`../`)
- No consecutive dots (`..`)

### Using ctx.state

```ts
handler: async (input, ctx) => {
  // Automatically scoped to ctx.tenantId — no manual prefixing
  await ctx.state.set('item:123', JSON.stringify(data));
  const value = await ctx.state.get('item:123');
  await ctx.state.delete('item:123');

  const page = await ctx.state.list('item:', { cursor, limit: 20 });
  // page: { items: Array<{ key, value }>, cursor?: string }
},
```

`ctx.state` throws `McpError(InvalidRequest)` if `tenantId` is missing. In stdio mode, `tenantId` defaults to `'default'` so `ctx.state` works without auth.

---

## Auth Context Shape

Available on `ctx.auth` inside handlers (when auth is enabled):

```ts
interface AuthContext {
  clientId?: string;
  scopes: string[];
  sub?: string;
  tenantId?: string;
}
```

Access directly for conditional logic:

```ts
handler: async (input, ctx) => {
  const isAdmin = ctx.auth?.scopes.includes('admin:write') ?? false;
  // ...
},
```
