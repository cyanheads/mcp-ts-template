# README.md Conventions for MCP Servers

Structure and content guide for creating or updating a README for an MCP server built on `@cyanheads/mcp-ts-core`. If a README already exists, use this as a reference to audit and improve it — don't blindly rewrite sections that are already accurate.

## Structure

Use this section order. Omit sections that don't apply (e.g., skip Docker/Workers if the server doesn't deploy there).

```text
# {Server Name}                        ← centered HTML block
Badges row                             ← npm, Docker, Version, MCP Spec, SDK, License, Status, TS, Bun, Coverage
---
## Tools                               ← summary table, then per-tool subsections
## Resources (if any)                  ← summary table
## Prompts (if any)                    ← summary table
## Features                            ← framework + domain-specific bullets
## Getting Started                     ← hosted instance (if any), MCP client config, prerequisites, install
## Configuration                       ← env var table
## Running the Server                  ← dev, production, Workers/Docker
## Project Structure                   ← directory/purpose table
## Development Guide                   ← link to CLAUDE.md, key rules
## Contributing                        ← brief
## License                             ← one line
```

## Section Guide

### Title Block

Centered HTML. The `<h1>` is the server name (package name). The `<p>` is a bold one-liner: what the server wraps, key capabilities, transport/deployment options. Follow with a badge row.

```html
<div align="center">
  <h1>my-mcp-server</h1>
  <p><b>MCP server for the Acme API. Search projects, manage tasks, track teams. Runs over stdio or HTTP.</b></p>
</div>

<div align="center">

[![npm](https://img.shields.io/npm/v/my-mcp-server?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/my-mcp-server) [![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg?style=flat-square)](./CHANGELOG.md) [![MCP SDK](https://img.shields.io/badge/MCP%20SDK-^1.27.1-green.svg?style=flat-square)](https://modelcontextprotocol.io/) [![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg?style=flat-square)](./LICENSE) [![TypeScript](https://img.shields.io/badge/TypeScript-^5.9.3-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/)

</div>
```

**Badge selection:** All badges use `style=flat-square`. Include what applies — don't add badges for things the server doesn't have:

| Badge | When to include |
|:------|:----------------|
| npm | Published to npm |
| Docker | Published to ghcr.io or Docker Hub |
| Version | Always — link to CHANGELOG.md |
| MCP Spec | Always — link to the spec version implemented |
| MCP SDK | Always — show the `@modelcontextprotocol/sdk` version |
| License | Always |
| Status | Optional — Stable, Beta, etc. |
| TypeScript | Always |
| Bun | If using Bun |
| Code Coverage | If coverage is tracked |

Add a `---` horizontal rule after the badge block.

### Tools

This is the most important section — it tells humans and LLMs exactly what the server exposes. Two layers: summary table, then per-tool subsections for tools with non-trivial behavior.

**Summary table:**

```markdown
## Tools

Seven tools for working with Acme data:

| Tool Name | Description |
|:----------|:------------|
| `search_projects` | Search projects by name, status, or team. |
| `create_task` | Create a new task in a project. |
| `get_task` | Fetch one or more tasks by ID, with full or summary data. |
```

Lead with a one-line count: "Seven tools for working with X data:" (or "Three tools", etc.).

**Per-tool subsections:**

Below the table, add a `### tool_name` subsection for each tool that has meaningful detail beyond its one-line description. Include:

- Bullet list of key capabilities (what inputs it accepts, what filtering/pagination it supports, edge cases it handles)
- Link to example file if one exists: `[View detailed examples](./examples/tool_name.md)`
- Separate subsections with `---` horizontal rules

```markdown
### `search_projects`

Search for projects using free-text queries and filters.

- Full-text search plus typed status/phase filters
- Geographic proximity filtering by coordinates and distance
- Pagination (up to 100 per page) and sorting
- Field selection to limit response size

[View detailed examples](./examples/search_projects.md)

---

### `get_task`

Fetch one or more tasks by ID, with full data or concise summaries.

- Batch fetch up to 5 tasks at once
- Full data includes subtasks, comments, attachments, and history
- Partial success reporting when some tasks in a batch fail

[View detailed examples](./examples/get_task.md)
```

Skip the per-tool subsection for simple tools where the table description says everything (e.g., a `get_field_values` lookup tool).

### Resources (if any)

```markdown
## Resources

| URI Pattern | Description |
|:------------|:------------|
| `acme://projects/{projectId}` | Project details by ID |
| `acme://tasks/{taskId}` | Task details by ID |
```

### Prompts (if any)

```markdown
## Prompts

| Prompt | Description |
|:-------|:------------|
| `project_summary` | Summarize a project's status and open tasks |
```

Derive all tool/resource/prompt tables directly from the actual definitions. Use the real names and descriptions from the Zod schemas.

### Features

Two subsection groups: framework capabilities, then domain-specific capabilities. Bullet lists, not prose.

```markdown
## Features

Built on [`@cyanheads/mcp-ts-core`](https://github.com/cyanheads/mcp-ts-core):

- Declarative tool definitions — single file per tool, framework handles registration and validation
- Unified error handling across all tools
- Pluggable auth (`none`, `jwt`, `oauth`)
- Swappable storage backends: `in-memory`, `filesystem`, `Supabase`, `Cloudflare KV/R2/D1`
- Structured logging with optional OpenTelemetry tracing
- Runs locally (stdio/HTTP) or on Cloudflare Workers from the same codebase

Acme-specific:

- Type-safe client for the Acme v2 API
- Automatic cleaning and simplification of API responses for agent consumption
```

### Getting Started

Lead with the lowest-friction option. If a public hosted instance exists, show that first. Then self-hosted via `bunx`/`npx`. Then manual clone/install.

```markdown
## Getting Started

### Public Hosted Instance

A public instance is available at `https://my-server.example.com/mcp` — no installation required:

\`\`\`json
{
  "mcpServers": {
    "my-server": {
      "type": "streamable-http",
      "url": "https://my-server.example.com/mcp"
    }
  }
}
\`\`\`

### Self-Hosted / Local

Add to your MCP client config (e.g., `claude_desktop_config.json`):

\`\`\`json
{
  "mcpServers": {
    "my-mcp-server": {
      "type": "stdio",
      "command": "bunx",
      "args": ["my-mcp-server@latest"],
      "env": {
        "ACME_API_KEY": "your-api-key",
        "MCP_TRANSPORT_TYPE": "stdio"
      }
    }
  }
}
\`\`\`

### Prerequisites

- [Bun v1.2.0](https://bun.sh/) or higher.

### Installation

1. **Clone the repository:**
\`\`\`sh
git clone https://github.com/cyanheads/my-mcp-server.git
\`\`\`

2. **Navigate into the directory:**
\`\`\`sh
cd my-mcp-server
\`\`\`

3. **Install dependencies:**
\`\`\`sh
bun install
\`\`\`
```

Omit the hosted instance subsection if there isn't one. Omit the clone/install steps if the server is npm-only (not meant to be cloned).

### Configuration

Table of environment variables. Include framework vars only if the server uses non-default values.

```markdown
## Configuration

| Variable | Description | Default |
|:---------|:------------|:--------|
| `ACME_API_KEY` | **Required.** API key for the Acme service. | — |
| `ACME_BASE_URL` | API base URL. | `https://api.acme.com` |
| `MCP_TRANSPORT_TYPE` | Transport: `stdio` or `http`. | `stdio` |
| `MCP_HTTP_PORT` | Port for HTTP server. | `3010` |
| `MCP_AUTH_MODE` | Auth mode: `none`, `jwt`, or `oauth`. | `none` |
| `MCP_LOG_LEVEL` | Log level (RFC 5424). | `info` |
| `STORAGE_PROVIDER_TYPE` | Storage backend. | `in-memory` |
| `OTEL_ENABLED` | Enable OpenTelemetry. | `false` |
```

Source from the server config Zod schema and `.env.example`. Mark required vars with bold **Required.** in the description rather than a separate column.

### Running the Server

Separate from Getting Started. Show build + run commands, and Workers/Docker deployment if applicable.

```markdown
## Running the Server

### Local Development

- **Build and run the production version:**
  \`\`\`sh
  bun run build
  bun run start:http   # or start:stdio
  \`\`\`

- **Run checks and tests:**
  \`\`\`sh
  bun run devcheck     # Lints, formats, type-checks
  bun run test         # Runs test suite
  \`\`\`

### Cloudflare Workers

1. **Build the Worker bundle:**
\`\`\`sh
bun run build:worker
\`\`\`

2. **Deploy:**
\`\`\`sh
bun run deploy:prod
\`\`\`
```

Include the Docker or Workers subsection only if the server supports it.

### Project Structure

Directory/purpose table orienting contributors to the codebase.

```markdown
## Project Structure

| Directory | Purpose |
|:----------|:--------|
| `src/mcp-server/tools` | Tool definitions (`*.tool.ts`). |
| `src/mcp-server/resources` | Resource definitions (`*.resource.ts`). |
| `src/services` | Domain service integrations. |
| `src/config` | Environment variable parsing and validation with Zod. |
| `tests/` | Unit and integration tests mirroring `src/`. |
```

### Development Guide

Brief — link to CLAUDE.md for full details. State 2-3 key rules.

```markdown
## Development Guide

See [`CLAUDE.md`](./CLAUDE.md) for development guidelines and architectural rules. The short version:

- Handlers throw, framework catches — no `try/catch` in tool logic
- Use `ctx.log` for domain-specific logging, `ctx.state` for storage
- Register new tools and resources in the `index.ts` barrel files
```

### Contributing

```markdown
## Contributing

Issues and pull requests are welcome. Run checks before submitting:

\`\`\`sh
bun run devcheck
bun run test
\`\`\`
```

### License

One line referencing the LICENSE file.

```markdown
## License

Apache-2.0 — see [LICENSE](LICENSE) for details.
```

## Principles

- **Accuracy over aspiration.** Only document what exists. Don't describe planned features as if they're implemented.
- **Tools first.** The tool surface is the most important content. Lead with it.
- **Tables over prose** for structured data (tools, config, directories). Scannable and diff-friendly.
- **Two-layer tool docs.** Summary table for quick scanning, per-tool subsections for detail. Skip subsections for trivial tools.
- **Real names from code.** Tool names, env vars, and URIs must match the source exactly. Copy from the definitions, don't paraphrase.
- **Lowest friction first.** In Getting Started, lead with the easiest option (hosted instance > bunx > clone).
- **No badges unless publishing.** Badges for unpublished packages are noise.
- **Keep it current.** Update the README whenever tools are added or removed.
