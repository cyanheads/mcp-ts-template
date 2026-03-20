# README.md Conventions for MCP Servers

Structure and content guide for creating or updating a README for an MCP server built on `@cyanheads/mcp-ts-core`. If a README already exists, use this as a reference to audit and improve it — don't blindly rewrite sections that are already accurate.

## Structure

Use this section order. Omit sections that don't apply (e.g., skip Docker if the server doesn't ship a container image).

```text
# {Server Name}

One-line description of what the server does.

## Overview
## Features (tool/resource table)
## Installation
## Configuration
## Usage
## Development
## License
```

## Section Guide

### Title + Description

The `h1` is the server name. Follow it with a single sentence or short paragraph explaining what the server wraps and who it's for. Include badges if publishing to npm.

```markdown
# my-mcp-server

MCP server for the Acme API — exposes project management, task tracking, and team operations to LLM clients.

[![npm](https://img.shields.io/npm/v/my-mcp-server)](https://www.npmjs.com/package/my-mcp-server)
```

### Overview

2-4 sentences expanding on the description. What system does it wrap? What can the LLM do through it? What's the value proposition?

Avoid marketing language. State what it does, not why it's amazing.

### Features

A table of tools and resources is the most useful thing a README can provide. It tells both humans and LLMs exactly what the server exposes.

**Tools table:**

```markdown
### Tools

| Tool | Description | Key Inputs |
|:-----|:------------|:-----------|
| `search_projects` | Search projects by name or status | `query`, `status?` |
| `create_task` | Create a new task in a project | `projectId`, `title`, `description?` |
| `update_task` | Update task status or assignment | `taskId`, `status?`, `assignee?` |
```

**Resources table (if any):**

```markdown
### Resources

| URI Pattern | Description |
|:------------|:------------|
| `acme://projects/{projectId}` | Project details by ID |
| `acme://tasks/{taskId}` | Task details by ID |
```

**Prompts table (if any):**

```markdown
### Prompts

| Prompt | Description |
|:-------|:------------|
| `project_summary` | Summarize a project's status and open tasks |
```

Derive these tables directly from the actual tool/resource/prompt definitions. Use the real names and descriptions from the Zod schemas.

### Installation

Show the install command and minimum viable configuration.

```markdown
## Installation

\`\`\`bash
npm install my-mcp-server
\`\`\`

### MCP Client Configuration

Add to your MCP client config (e.g., `claude_desktop_config.json`):

\`\`\`json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "npx",
      "args": ["my-mcp-server"],
      "env": {
        "ACME_API_KEY": "your-api-key"
      }
    }
  }
}
\`\`\`
```

If the server supports HTTP transport, show that config too.

### Configuration

Table of environment variables. Include framework vars only if the server uses non-default values.

```markdown
## Configuration

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `ACME_API_KEY` | Yes | — | API key for the Acme service |
| `ACME_BASE_URL` | No | `https://api.acme.com` | API base URL |
| `MCP_TRANSPORT_TYPE` | No | `stdio` | Transport: `stdio` or `http` |
| `MCP_LOG_LEVEL` | No | `info` | Log level |
```

Source this from the server config Zod schema and `.env.example`.

### Usage

Brief examples of how an LLM (or human via MCP client) would use the server. Show 1-2 tool calls with example inputs/outputs if it helps understanding. Keep it short — the tool descriptions should be self-explanatory.

### Development

Commands table for contributors.

```markdown
## Development

| Command | Purpose |
|:--------|:--------|
| `npm run build` | Compile TypeScript |
| `npm run dev:stdio` | Dev mode (stdio, watch) |
| `npm run dev:http` | Dev mode (HTTP, watch) |
| `bun run devcheck` | Lint + format + typecheck |
| `npm test` | Run tests |
```

### License

One line referencing the LICENSE file.

```markdown
## License

Apache-2.0 — see [LICENSE](LICENSE) for details.
```

## Principles

- **Accuracy over aspiration.** Only document what exists. Don't describe planned features as if they're implemented.
- **Tables over prose** for structured data (tools, config, commands). Scannable and diff-friendly.
- **Real names from code.** Tool names, env vars, and URIs should match the source exactly. Copy from the definitions, don't paraphrase.
- **No badges unless publishing.** Badges for unpublished packages are noise.
- **Keep it current.** The README should be updated whenever tools are added or removed. The `polish-docs-meta` skill handles both initial creation and subsequent updates.
