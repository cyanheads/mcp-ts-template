---
name: design-mcp-server
description: >
  Design the tool surface, resources, and service layer for a new MCP server. Use when starting a new server, planning a major feature expansion, or when the user describes a domain/API they want to expose via MCP. Produces a design doc at docs/design.md that drives implementation.
metadata:
  author: cyanheads
  version: "1.1"
  audience: external
  type: workflow
---

## When to Use

- User says "I want to build a ___ MCP server"
- User has an API, database, or system they want to expose to LLMs
- User wants to plan tools before scaffolding
- Existing server needs a new capability area (design the addition, not just a single tool)

Do NOT use for single-tool additions — use `add-tool` directly.

## Inputs

Gather before designing. Ask the user if not obvious from context:

1. **Domain** — what system, API, or capability is this server wrapping?
2. **Data sources** — APIs, databases, file systems, external services?
3. **Target users** — what will the LLM (and its human) be trying to accomplish?
4. **Scope constraints** — read-only? write access? admin operations? what's off-limits?

If the domain has a public API, read its docs before designing. Don't design from vibes.

## Steps

### 1. Research External Dependencies

Before designing, verify the APIs and services the server will wrap.

If the Agent tool is available, spawn background agents to research in parallel while you proceed with domain mapping:

- Fetch API docs, confirm endpoint availability, auth methods, rate limits
- Check for official SDKs or client libraries (npm packages)
- Note any API quirks, pagination patterns, or data format considerations

If the Agent tool is not available, do this research inline — fetch docs, read SDK readmes, confirm assumptions before committing them to the design.

### 2. Map the Domain

List the concrete operations the underlying system supports. Group by domain noun.

Example for a project management API:

| Noun | Operations |
|:-----|:-----------|
| Project | list, get, create, archive |
| Task | list (by project), get, create, update status, assign, comment |
| User | list, get current |

This is the raw material. Not everything becomes a tool.

### 3. Classify into MCP Primitives

| Primitive | Use when | Examples |
|:----------|:---------|:--------|
| **Tool** | Needs parameters beyond a simple ID, has side effects, or requires LLM decisions about inputs | Search, create, update, analyze, transform |
| **Resource** | Addressable by stable URI, read-only, useful as injectable context | Config, schemas, status, entity-by-ID lookups |
| **Prompt** | Reusable message template that structures how the LLM approaches a task | Analysis framework, report template, review checklist |
| **Neither** | Internal detail, admin-only, not useful to an LLM | Token refresh, webhook setup, migrations |

**Common traps:**

- **Everything-is-a-tool**: "Fetch by ID" with no other params is a resource. Resources let clients inject context without a tool call.
- **CRUD explosion**: Don't map every REST endpoint to a tool. One `update_task` beats `update_task_status` + `assign_task` + `update_task_fields`.
- **Ignoring resources**: If the server has reference data, schemas, or entities the LLM should read — expose them as resources.

### 4. Design Tools

For each tool:

| Aspect | Decision |
|:-------|:---------|
| **Name** | `snake_case`, verb-noun: `search_papers`, `create_task`. Prefix with server domain if ambiguous. |
| **Granularity** | One tool per user intent, not per API call. A tool can call multiple APIs internally. |
| **Input schema** | What the LLM provides. `.describe()` on every field. Prefer enums/literals over free strings. Optional fields with defaults over required where reasonable. |
| **Output schema** | What the LLM needs to see. Curate — not a raw API dump. Design for the LLM's next decision, not for a UI. |
| **Annotations** | `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. Helps clients auto-approve safely. |
| **Auth scopes** | `tool:noun:read`, `tool:noun:write`. Skip for read-only or stdio-only servers. |

### 5. Design Resources

For each resource:

| Aspect | Decision |
|:-------|:---------|
| **URI template** | `scheme://{param}/path`. Server domain as scheme. Keep shallow. |
| **Params** | Minimal — typically just an identifier. Complex queries belong in tools. |
| **Pagination** | Needed if lists exceed ~50 items. Opaque cursors via `extractCursor`/`paginateArray`. |
| **list()** | Provide if discoverable. Top-level categories or recent items, not exhaustive dumps. |

### 6. Design Prompts (if needed)

Optional. Use when the server has recurring interaction patterns worth structuring:
- Analysis frameworks, report templates, multi-step workflows

Skip for purely data/action-oriented servers.

### 7. Plan Services and Config

**Services** — one per external dependency. Init/accessor pattern. Skip if all tools are thin wrappers with no shared state.

**Config** — list env vars (API keys, base URLs). Goes in `src/config/server-config.ts` as a separate Zod schema.

### 8. Write the Design Doc

Create `docs/design.md` with the structure below. The MCP surface (tools, resources, prompts) goes first — it's what matters most and what the developer will reference during implementation.

```markdown
# {{Server Name}} — Design

## MCP Surface

### Tools
| Name | Description | Key Inputs | Annotations |
|:-----|:------------|:-----------|:------------|

### Resources
| URI Template | Description | Pagination |
|:-------------|:------------|:-----------|

### Prompts
| Name | Description | Args |
|:-----|:------------|:-----|

## Overview

What this server does, what system it wraps, who it's for.

## Requirements

- Bullet list of capabilities and constraints
- Auth requirements, rate limits, data access scope

## Services
| Service | Wraps | Used By |
|:--------|:------|:--------|

## Config
| Env Var | Required | Description |
|:--------|:---------|:------------|

## Implementation Order

1. Config and server setup
2. Services (external API clients)
3. Read-only tools
4. Write tools
5. Resources
6. Prompts

Each step is independently testable.
```

Keep it concise. The design doc is a working reference, not a spec document — enough to orient a developer (or agent) implementing the server, not more.

### 9. Confirm and Proceed

If the user has already authorized implementation (e.g., "build me a ___ server"), proceed directly to scaffolding using the design doc as the plan. Otherwise, present the design doc to the user for review before implementing.

## After Design

Execute the plan using the scaffolding skills:

1. `add-service` for each service
2. `add-tool` for each tool
3. `add-resource` for each resource
4. `add-prompt` for each prompt
5. `devcheck` after each addition

## Checklist

- [ ] External APIs/dependencies researched and verified (docs fetched, SDKs identified)
- [ ] Domain operations mapped (nouns + verbs)
- [ ] Each operation classified as tool, resource, prompt, or excluded
- [ ] Tool names follow verb-noun `snake_case` convention
- [ ] Tool outputs designed for LLM consumption, not raw API passthrough
- [ ] Annotations set correctly (`readOnlyHint`, `destructiveHint`, etc.)
- [ ] Input schemas use constrained types (enums, literals) where the domain allows
- [ ] Resource URIs use `{param}` templates, pagination planned for large lists
- [ ] Service layer planned (or explicitly skipped with reasoning)
- [ ] Server config env vars identified
- [ ] Design doc written to `docs/design.md`
- [ ] Design confirmed with user (or user pre-authorized implementation)
