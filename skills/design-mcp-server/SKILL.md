---
name: design-mcp-server
description: >
  Design the tool surface, resources, and service layer for a new MCP server. Use when starting a new server, planning a major feature expansion, or when the user describes a domain/API they want to expose via MCP. Produces a design doc at docs/design.md that drives implementation.
metadata:
  author: cyanheads
  version: "2.0"
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
- **CRUD explosion**: Don't map every REST endpoint to a tool. Related operations on the same noun often belong in one tool with an `operation`/`mode` parameter (see Step 4).
- **Ignoring resources**: If the server has reference data, schemas, or entities the LLM should read — expose them as resources.
- **1:1 endpoint mirroring**: API endpoints are designed for programmatic consumers. LLM tools should be designed for workflows — what an agent is *trying to accomplish*, not what HTTP calls happen under the hood.

### 4. Design Tools

This is the highest-leverage step. Tool definitions — names, descriptions, parameters, output schemas — are the **entire interface contract** the LLM reads to decide whether and how to call a tool. Every field is context. Design accordingly.

#### Think in workflows, not endpoints

The unit of a tool is a *useful action*, not an API call. Ask: "What is the agent trying to accomplish?" — not "What endpoints does the API have?"

A single tool can call multiple APIs internally, apply local filtering, reshape data, and return enriched results. The LLM doesn't know or care about the underlying calls.

**Consolidation via operation/mode enum.** When a domain noun has several related operations that share parameters, consolidate into one tool with a discriminated parameter. This keeps the tool surface small and lets the LLM discover all capabilities in one place.

```ts
// One tool for all branch operations — not five separate tools
const gitBranch = tool('git_branch', {
  description: 'Manage branches: list, show current, create, delete, or rename.',
  input: z.object({
    operation: z.enum(['list', 'create', 'delete', 'rename', 'show-current'])
      .describe('Branch operation to perform.'),
    name: z.string().optional().describe('Branch name (required for create/delete/rename).'),
    newName: z.string().optional().describe('New name (required for rename).'),
  }),
  output: z.object({ /* branch info */ }),
  // ...
});
```

```ts
// Workflow tool — search + local filter pipeline, not a raw API proxy
const findEligibleStudies = tool('clinicaltrials_find_eligible_studies', {
  description: 'Matches patient demographics and medical profile to eligible clinical trials. '
    + 'Filters by age, sex, conditions, location, and healthy volunteer status. '
    + 'Returns ranked list of matching studies with eligibility explanations.',
  // handler: listStudies() → filter by eligibility → rank by location proximity → slice
});
```

**When to consolidate vs. split:**

| Consolidate (one tool) | Split (separate tools) |
|:------------------------|:-----------------------|
| Operations share the same noun and most parameters | Operations have fundamentally different inputs/outputs |
| Related CRUD on a single entity | Read-only lookup vs. multi-step workflow |
| Agent would naturally think of them together | Agent would use them in different contexts |

There is no fixed ceiling on tool count — tools need to earn their keep, but don't artificially limit the surface. If the domain genuinely has 20 distinct workflows, expose 20 tools.

#### Tool descriptions

The description is the LLM's primary signal for tool selection. It must answer: *what does this do, and when should I use it?*

- **Be concrete about capability.** "Search for clinical trial studies using queries and filters" beats "Interact with studies."
- **Include operational guidance when it matters.** If the tool has prerequisites, constraints, or gotchas the LLM needs to know, say so in the description. Don't add boilerplate workflow hints when the tool is self-explanatory.

```ts
// Good — describes a prerequisite the LLM must know
description: 'Set the session working directory for all git operations. '
  + 'This allows subsequent git commands to omit the path parameter.'

// Good — self-explanatory, no workflow hints needed
description: 'Show the working tree status including staged, unstaged, and untracked files.'

// Good — warns about constraints
description: 'Fetches trial results data for completed studies. '
  + 'Only available for studies where hasResults is true.'
```

Context-dependent: a simple read-only tool needs a one-line description. A tool with prerequisites, modes, or non-obvious behavior needs more. Match depth of description to complexity of tool.

#### Parameter descriptions

Every `.describe()` is prompt text the LLM reads. Parameters should convey: what the value is, what it affects, and (where non-obvious) how to use it well.

- **Constrain the type.** Enums and literals over free strings. Regex validation for formatted IDs. Ranges for numeric bounds.
- **Explain costs and tradeoffs** when a parameter choice has meaningful consequences.
- **Name alternative approaches** when a simpler path exists.
- **Include format patterns** for structured values, but don't pad descriptions with redundant examples.

```ts
// Good — explains cost, recommends action, names the alternative
fields: z.array(z.string()).optional()
  .describe('Specific fields to return (reduces payload size). '
    + 'STRONGLY RECOMMENDED — without this, the full study record (~70KB each) is returned. '
    + 'Use full data only when you need detailed eligibility criteria, locations, or results.'),

// Good — explains what the flag does AND how to override
autoExclude: z.boolean().default(true)
  .describe('Automatically exclude lock files and generated files from diff output '
    + 'to reduce context bloat. Set to false if you need to inspect these files.'),

// Good — names the format and gives one example
nctIds: z.union([z.string(), z.array(z.string()).max(5)])
  .describe('A single NCT ID (e.g., "NCT12345678") or an array of up to 5 NCT IDs to fetch.'),
```

#### Output design

The output schema and `format` function control what the LLM reads back. Design for the agent's *next decision*, not for a UI or an API consumer.

**Principles:**

- **Include IDs and references for chaining.** If the agent might act on a result, return the identifiers it needs for follow-up tool calls.
- **Curate vs. pass-through depends on domain.** Medical/scientific data — don't trim fields that could alter correctness. CRUD responses — return what the agent needs, not the full API payload. Match fidelity to consequence.
- **Surface what was done, not just results.** After a write operation, include the new state. (`git_commit` auto-includes post-commit `git status`. The LLM sees the repo state without an extra round trip.)
- **Communicate filtering.** If the tool silently excluded content, tell the LLM what was excluded and how to get it back. The agent can't act on what it doesn't know about.

```ts
// git_diff — when lock files are filtered, the output tells the LLM
output: z.object({
  diff: z.string().describe('Unified diff output.'),
  excludedFiles: z.array(z.string()).optional()
    .describe('Files automatically excluded from the diff (e.g., lock files). '
      + 'Call again with autoExclude=false to include them.'),
}),
```

- **Truncate large output with counts.** When a list exceeds a reasonable display size, show the top N and append "...and X more". Don't silently drop results.
- **Use the `format` function for readable summaries** while keeping the full structured data in the output object for programmatic use.

#### Error messages as LLM guidance

When a tool throws, the error message is the agent's only signal for recovery. A good error message tells the LLM *what happened and what to do next*.

```ts
// Bad — the LLM has no recovery path
throw new Error('Not found');

// Good — names both resolution options
"No session working directory set. Please specify a 'path' or use 'git_set_working_dir' first."

// Good — structured hint in error data
throw new McpError(JsonRpcErrorCode.Forbidden,
  "Cannot perform 'reset --hard' on protected branch 'main' without explicit confirmation.",
  { branch: 'main', operation: 'reset --hard', hint: 'Set the confirmed parameter to true to proceed.' },
);
```

Think about the common failure modes for each tool and write error messages that guide recovery. This is part of the tool's interface design, not an afterthought.

#### Design table

Summarize each tool:

| Aspect | Decision |
|:-------|:---------|
| **Name** | `snake_case`, verb-noun: `search_papers`, `create_task`. Prefix with server domain if ambiguous. |
| **Granularity** | One tool per user-meaningful workflow, not per API call. Consolidate related operations with `operation`/`mode` enum. |
| **Description** | Concrete capability statement. Add operational guidance (prerequisites, constraints, gotchas) when non-obvious. |
| **Input schema** | `.describe()` on every field. Constrained types (enums, literals, regex). Explain costs/tradeoffs of parameter choices. |
| **Output schema** | Designed for the LLM's next action. Include chaining IDs. Communicate filtering. Post-write state where useful. |
| **Error messages** | Name what went wrong and what the LLM should do about it. Include hints for common recovery paths. |
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
- [ ] Related operations consolidated (operation/mode enum) — not one tool per endpoint
- [ ] Tool descriptions are concrete and include operational guidance where non-obvious
- [ ] Parameter `.describe()` text explains what the value is, what it affects, and tradeoffs
- [ ] Input schemas use constrained types (enums, literals, regex) over free strings
- [ ] Output schemas designed for LLM's next action — chaining IDs, post-write state, filtering communicated
- [ ] Error messages guide recovery — name what went wrong and what to do next
- [ ] Annotations set correctly (`readOnlyHint`, `destructiveHint`, etc.)
- [ ] Resource URIs use `{param}` templates, pagination planned for large lists
- [ ] Service layer planned (or explicitly skipped with reasoning)
- [ ] Server config env vars identified
- [ ] Design doc written to `docs/design.md`
- [ ] Design confirmed with user (or user pre-authorized implementation)
