# package.json Metadata

Fields that the `init` scaffold leaves empty or generic. Fill these during polish.

## Fields to Update

| Field | Scaffolded Value | What to Set |
|:------|:----------------|:------------|
| `name` | `{{PACKAGE_NAME}}` (substituted by init) | Verify it's correct. Use scoped name if publishing (`@org/my-server`). |
| `version` | `0.1.0` | Keep for initial development. Bump via the `release` skill. |
| `description` | `""` (empty) | One sentence: what the server does and what it wraps. Appears on npm and in `npm search`. |
| `repository` | _(missing)_ | `{ "type": "git", "url": "https://github.com/org/repo.git" }` |
| `homepage` | _(missing)_ | Repository URL or docs URL. |
| `bugs` | _(missing)_ | `{ "url": "https://github.com/org/repo/issues" }` |
| `author` | _(missing)_ | `"Name <email>"` or `{ "name": "...", "email": "..." }` |
| `keywords` | `["mcp", "mcp-server", "model-context-protocol"]` | Add domain-specific keywords. Keep the MCP ones. |
| `license` | `Apache-2.0` | Change if using a different license. Must match the LICENSE file. |

## Fields to Leave Alone

These are set correctly by `init` and should not need changes:

| Field | Value | Why |
|:------|:------|:----|
| `type` | `"module"` | ESM — required by the framework |
| `main` | `"dist/index.js"` | Entry point after build |
| `types` | `"dist/index.d.ts"` | TypeScript declarations |
| `files` | `["dist/"]` | What npm publishes |
| `engines` | `{ "node": ">=22.0.0" }` | Minimum Node version |
| `scripts` | _(various)_ | Build, dev, test scripts |
| `dependencies` | `@cyanheads/mcp-ts-core`, `pino-pretty` | Core framework + log formatting |

## Keywords

Good keywords improve npm discoverability. Include:

1. The base MCP keywords (already scaffolded): `mcp`, `mcp-server`, `model-context-protocol`
2. The domain: `project-management`, `task-tracking`, `acme-api`
3. The transport if non-default: `http`, `sse`, `cloudflare-workers`

Example:

```json
"keywords": [
  "mcp",
  "mcp-server",
  "model-context-protocol",
  "acme",
  "project-management",
  "task-tracking"
]
```

## Publishing Checklist

If publishing to npm, also verify:

- `name` doesn't conflict with an existing package
- `publishConfig.access` is `"public"` (already set by init for scoped packages)
- `files` includes everything needed at runtime (`dist/` is correct for most servers)
- `bin` is set if the server should be runnable via `npx` (add `"bin": { "my-server": "dist/index.js" }`)

The `bin` field is the most commonly missed one. Without it, `npx my-server` won't work — the client config must use `node dist/index.js` instead.
