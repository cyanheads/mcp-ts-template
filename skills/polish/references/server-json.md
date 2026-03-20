# server.json — MCP Server Manifest

Optional metadata file that describes the server for MCP registries, clients, and tooling. Place at the project root.

## When to Create

Create `server.json` if:
- Publishing to npm or a registry
- The server will be listed in an MCP client's server catalog
- You want machine-readable metadata beyond what `package.json` provides

Skip for internal/private servers where discoverability doesn't matter.

## Schema

```json
{
  "name": "my-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for the Acme API — project management and task tracking.",
  "author": "your-name",
  "license": "Apache-2.0",
  "repository": "https://github.com/your-org/my-mcp-server",
  "transport": {
    "stdio": {
      "command": "npx",
      "args": ["my-mcp-server"]
    }
  },
  "env": {
    "ACME_API_KEY": {
      "description": "API key for the Acme service",
      "required": true
    },
    "ACME_BASE_URL": {
      "description": "API base URL",
      "required": false,
      "default": "https://api.acme.com"
    }
  },
  "tools": [
    {
      "name": "search_projects",
      "description": "Search projects by name or status"
    },
    {
      "name": "create_task",
      "description": "Create a new task in a project"
    }
  ],
  "resources": [
    {
      "uriTemplate": "acme://projects/{projectId}",
      "description": "Project details by ID"
    }
  ],
  "prompts": [
    {
      "name": "project_summary",
      "description": "Summarize a project's status and open tasks"
    }
  ]
}
```

## Field Reference

| Field | Required | Description |
|:------|:---------|:------------|
| `name` | Yes | Package name, matches `package.json` |
| `version` | Yes | Semver version, matches `package.json` |
| `description` | Yes | One-line description of the server |
| `author` | No | Author name or org |
| `license` | No | SPDX license identifier |
| `repository` | No | URL to source repository |
| `transport` | Yes | How to start the server (see below) |
| `env` | No | Environment variables the server reads |
| `tools` | No | Tool name + description pairs |
| `resources` | No | Resource URI template + description pairs |
| `prompts` | No | Prompt name + description pairs |

### Transport

Describes how clients launch the server. At minimum include `stdio`:

```json
"transport": {
  "stdio": {
    "command": "npx",
    "args": ["my-mcp-server"]
  }
}
```

For HTTP:

```json
"transport": {
  "stdio": { "command": "npx", "args": ["my-mcp-server"] },
  "http": {
    "url": "http://localhost:3000/mcp"
  }
}
```

### Env

Each key is the env var name. Value is an object:

```json
{
  "description": "Human-readable purpose",
  "required": true,
  "default": "optional-default-value"
}
```

Derive from the server config Zod schema and `.env.example`.

### Tools / Resources / Prompts

Lightweight summaries — just `name` and `description`. Derive directly from the definition files. Don't include full schemas; this is for discovery, not invocation.

## Generating

Build `server.json` from the audit in step 1 of the polish skill:

1. Copy `name`, `version`, `description`, `author`, `license`, `repository` from `package.json`
2. Set `transport.stdio.command` to `npx` and `args` to `[packageName]` (or `node dist/index.js` for non-published servers)
3. List env vars from server config schema
4. List tools/resources/prompts from the definition barrels

## Keeping in Sync

`server.json` is a snapshot. Update it when:
- Adding or removing tools/resources/prompts
- Bumping the version
- Changing required env vars

The `polish` skill covers the initial creation. For subsequent updates, treat it like any other metadata file in the release checklist.
