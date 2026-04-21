---
name: design-mcp-server
description: >
  Design the tool surface, resources, and service layer for a new MCP server. Use when starting a new server, planning a major feature expansion, or when the user describes a domain/API they want to expose via MCP. Produces a design doc at docs/design.md that drives implementation.
metadata:
  author: cyanheads
  version: "2.3"
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

Before designing, verify the APIs and services the server will wrap. Read the docs, then **hit the API** — real requests reveal what docs omit.

If the Agent tool is available, spawn background agents to research in parallel while you proceed with domain mapping:

- Fetch API docs, confirm endpoint availability, auth methods, rate limits
- Check for official SDKs or client libraries (npm packages)
- Note any API quirks, pagination patterns, or data format considerations

If the Agent tool is not available, do this research inline — fetch docs, read SDK readmes, confirm assumptions before committing them to the design.

**Live API probing.** After reading docs, make real requests against the API to verify assumptions:

- **Response shapes** — confirm actual field names, nesting, and types. Docs frequently lag or omit fields.
- **Batch/filter endpoints** — look for `filter.ids`, bulk GET, or query-by-multiple-IDs patterns. A single batch request replaces N individual fetches and eliminates serial-request bottlenecks and rate-limit accumulation.
- **Field selection** — check if the API supports `fields` or `select` parameters to request only the data you need. This reduces payload size dramatically for large objects.
- **Pagination behavior** — verify token format, page size limits, and what happens when results exceed one page.
- **Error shapes** — trigger real 400/404/429 responses to see the actual error format, not just what docs claim.

This step prevents building a service layer against assumed response shapes that don't match reality.

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

**Tools are the primary interface.** Not all MCP clients expose resources — many are tool-only (Claude Code, Cursor, most chat UIs). Design the tool surface to be self-sufficient: an agent with only tool access should be able to do everything the server is built for. Resources add convenience for clients that support them (injectable context, stable URIs), but are not a reliable access path.

| Primitive | Use when | Examples |
|:----------|:---------|:--------|
| **Tool** | The default. Any operation or data access an agent needs to accomplish the server's purpose. | Search, create, update, analyze, fetch-by-ID, list reference data |
| **App Tool** | Tool whose results benefit from interactive HTML UI (data visualization, forms, rich rendering). Uses `appTool()` + paired `appResource()`. Hosts without MCP Apps support receive the text fallback from `format()`. | Dashboards, data explorers, interactive charts, form-based workflows |
| **Resource** | *Additionally* expose as a resource when the data is addressable by stable URI, read-only, and useful as injectable context. | Config, schemas, status, entity-by-ID lookups |
| **Prompt** | Reusable message template that structures how the LLM approaches a task | Analysis framework, report template, review checklist |
| **Neither** | Internal detail, admin-only, not useful to an LLM | Token refresh, webhook setup, migrations |

What the tool surface needs to cover depends on the server: a read-only research server has different economics than a CRUD project management server. Consider the domain, the expected agent workflows, whether it wraps one API or many, and what data relationships exist. The test is: can a tool-only agent accomplish everything this server is for?

**Common traps:**

- **Data locked behind resources**: If something an agent needs is only accessible via a resource, it's invisible to tool-only clients. That data might warrant its own tool, or it might already be covered by an existing tool's output — but it needs a tool path somewhere.
- **CRUD explosion**: Don't map every REST endpoint to a tool. Related operations on the same noun often belong in one tool with an `operation`/`mode` parameter (see Step 4).
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
  description: 'Matches patient demographics and medical profile to eligible clinical trials. Filters by age, sex, conditions, location, and healthy volunteer status. Returns ranked list of matching studies with eligibility explanations.',
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

**Audit: does each tool earn its keep?** After mapping tools, review the full list critically. A tool that covers a niche use case, serves a tiny fraction of agents, or duplicates what another tool already handles is a candidate for deferral. Drop it from the design and note it as a future addition if demand warrants. Every tool in the surface is cognitive load for tool selection — a tight surface outperforms a comprehensive one.

#### Tool descriptions

The description is the LLM's primary signal for tool selection. It must answer: *what does this do, and when should I use it?*

- **Be concrete about capability.** "Search for clinical trial studies using queries and filters" beats "Interact with studies."
- **Include operational guidance when it matters.** If the tool has prerequisites, constraints, or gotchas the LLM needs to know, say so in the description. Don't add boilerplate workflow hints when the tool is self-explanatory.
- **Prefer a single cohesive paragraph.** Pack operational guidance into prose sentences (separated by periods or em-dashes) rather than bullet lists or blank-line-separated sections. Descriptions render inline in most clients, and bullet structure reads as visual noise rather than signal. Operation-by-operation bullets also duplicate info that already lives in the `operation` enum's `.describe()`.
- **Don't leak implementation details.** Descriptions are for the consumer, not the author. Internal endpoint paths, API call counts, internal parameter name mappings, and routing logic don't belong — describe what the tool does and when to use it, not how it's wired up.

```ts
// Good — describes a prerequisite the LLM must know
description: 'Set the session working directory for all git operations. This allows subsequent git commands to omit the path parameter.'

// Good — self-explanatory, no workflow hints needed
description: 'Show the working tree status including staged, unstaged, and untracked files.'

// Good — warns about constraints
description: 'Fetches trial results data for completed studies. Only available for studies where hasResults is true.'
```

Descriptions should be as long as needed — concise but complete. Don't artificially truncate, and don't pad with filler.

#### Parameter descriptions

Every `.describe()` is prompt text the LLM reads. Parameters should convey: what the value is, what it affects, and (where non-obvious) how to use it well.

- **Constrain the type.** Enums and literals over free strings. Regex validation for formatted IDs. Ranges for numeric bounds.
- **Use JSON-Schema-serializable types only.** The MCP SDK serializes schemas to JSON Schema for `tools/list`. Types like `z.custom()`, `z.date()`, `z.transform()`, `z.bigint()`, `z.symbol()`, `z.void()`, `z.map()`, `z.set()` throw at runtime. Use structural equivalents (e.g., `z.string().describe('ISO 8601 date')` instead of `z.date()`).
- **Explain costs and tradeoffs** when a parameter choice has meaningful consequences.
- **Name alternative approaches** when a simpler path exists.
- **Include format patterns** for structured values, but don't pad descriptions with redundant examples.

```ts
// Good — explains cost, recommends action, names the alternative
fields: z.array(z.string()).optional()
  .describe('Specific fields to return (reduces payload size). Without this, the full study record (~70KB each) is returned. Use full data only when you need detailed eligibility criteria, locations, or results.'),

// Good — explains what the flag does AND how to override
autoExclude: z.boolean().default(true)
  .describe('Automatically exclude lock files and generated files from diff output to reduce context bloat. Set to false if you need to inspect these files.'),

// Good — names the format and gives one example
nctIds: z.union([z.string(), z.array(z.string()).max(5)])
  .describe('A single NCT ID (e.g., "NCT12345678") or an array of up to 5 NCT IDs to fetch.'),
```

#### Output design

The output schema and `format` function control what the LLM reads back. Design for the agent's *next decision*, not for a UI or an API consumer. See the `add-tool` skill's **Tool Response Design** section for implementation-level patterns (partial success, empty results, metadata, context budget).

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
    .describe('Files automatically excluded from the diff (e.g., lock files). Call again with autoExclude=false to include them.'),
}),
```

- **Truncate large output with counts.** When a list exceeds a reasonable display size, show the top N and append "...and X more". Don't silently drop results.
- **`format()` is the markdown twin of `structuredContent` — make both content-complete.** Different MCP clients forward different surfaces to the model: some (e.g., Claude Code) read `structuredContent` from `output`, others (e.g., Claude Desktop) read `content[]` from `format()`. Both must carry the same data so every client sees the same picture — `format()` just dresses it up with markdown. A thin `format()` that returns only a count or title leaves `content[]`-only clients blind to data that `structuredContent` clients can see. Render all fields the LLM needs, with structured markdown (headers, bold labels, lists) for readability.

#### Batch input design

Some tools naturally operate on multiple items — fetching several entities, updating a set of records, running checks across a list. Decide during design whether a tool accepts single items, arrays, or both.

**When to accept array input:**

| Accept array | Keep single-item | Separate batch tool |
|:-------------|:-----------------|:--------------------|
| The upstream API supports batch requests (fetch-by-IDs, bulk update) | The operation is inherently single-target (read a file, run a query) | Batch has fundamentally different output shape or error semantics |
| Reduces N+1 round trips for a common workflow | Array input adds complexity with no backend efficiency gain | Single-item tool is simple; batch version needs progress, partial failure handling |
| Agent commonly needs multiple items in one step | The tool already returns a collection (search results) | |

**If a tool accepts arrays, design for partial success.** When 3 of 5 items succeed, the agent needs to know which succeeded, which failed, and why — not just a success/failure boolean. Plan the output schema to report per-item results:

```ts
output: z.object({
  succeeded: z.array(ItemResultSchema).describe('Items that completed successfully.'),
  failed: z.array(z.object({
    id: z.string().describe('Item ID that failed.'),
    error: z.string().describe('What went wrong and how to resolve it.'),
  })).describe('Items that failed with per-item error details.'),
}),
```

Single-item tools don't need this — they either succeed or throw. The partial success question only arises when the tool can partially complete.

**Telemetry:** The framework automatically detects partial success — when a handler returns a result with a non-empty `failed` array, the span gets `mcp.tool.partial_success`, `mcp.tool.batch.succeeded_count`, and `mcp.tool.batch.failed_count` attributes. No manual instrumentation needed.

#### Convenience shortcuts for complex inputs

When a tool wraps a complex query language or filter system, provide a simple shortcut parameter for the 80% case alongside the full-power escape hatch. This keeps simple queries simple while preserving full expressiveness.

```ts
// text_search handles the common case; query handles everything else
text_search: z.string().optional()
  .describe('Convenience shortcut: full-text search across title and abstract. For structured filters or field-specific matching, use the query parameter instead.'),
query: z.record(z.unknown()).optional()
  .describe('Full query object for structured filters. Supports operators: _eq, _gt, _and, _or, ...'),
```

The pattern: name the shortcut for what it does (`text_search`, `name_search`), document what it expands to, and point to the full parameter for advanced use. Validate that at least one of the two is provided.

#### Error design

Errors are part of the tool's interface — design them during the design phase, not as an afterthought. Two aspects: **classification** (what error code) and **messaging** (what the LLM reads).

**Classify errors by origin.** Different error sources need different codes and different recovery guidance. Map the failure modes for each tool during design:

| Origin | Examples | Error code | Agent can recover? |
|:-------|:---------|:-----------|:-------------------|
| **Client input** | Bad ID format, invalid params, missing required field, out-of-range value | `InvalidParams` | Yes — fix the input and retry |
| **Upstream API** | 5xx, rate limit (429), timeout, network error | `ServiceUnavailable` | Maybe — retry later, or the upstream is down |
| **Not found** | Valid ID format but entity doesn't exist | `NotFound` (or `InvalidParams` if ambiguous) | Yes — check the ID, try a search |
| **Auth/permissions** | Insufficient scopes, expired token | `Forbidden` / `Unauthorized` | Maybe — escalate or re-auth |
| **Server internal** | Parse failure, missing config, unexpected state | `InternalError` | No — server-side issue |

The framework auto-classifies many of these at runtime (HTTP status codes, JS error types, common patterns), but explicit classification in the handler gives better error messages. Use error factories (`notFound()`, `validationError()`, etc.) when you want a specific code; plain `throw new Error()` when the framework's auto-classification is good enough.

**Write error messages as recovery instructions.** The message is the agent's only signal for what to do next.

```ts
// Bad — dead end, no recovery path
throw new Error('Not found');

// Good — names both resolution options
"No session working directory set. Please specify a 'path' or use 'git_set_working_dir' first."

// Good — structured hint in error data
throw new McpError(JsonRpcErrorCode.Forbidden,
  "Cannot perform 'reset --hard' on protected branch 'main' without explicit confirmation.",
  { branch: 'main', operation: 'reset --hard', hint: 'Set the confirmed parameter to true to proceed.' },
);

// Good — upstream error with actionable context
throw notFound(`Paper '${id}' not found on arXiv. Verify the ID format (e.g., '2401.12345' or '2401.12345v2').`);
```

**During design, list the expected failure modes for each tool.** Not every mode needs a custom message, but the common ones should have clear recovery guidance baked in. Include these in the tool's section of the design doc — they inform both the handler implementation and the error factory choices.

#### Design table

Summarize each tool:

| Aspect | Decision |
|:-------|:---------|
| **Name** | `snake_case`, `{domain}_{verb}_{noun}` — aim for 3 words: `patentsview_search_patents`, `clinicaltrials_find_studies`. Use the **canonical platform/brand name** as prefix (not abbreviations — `patentsview_` not `patents_`, `clinicaltrials_` not `ct_`). The verb+noun pair should be unambiguous within the server — if two tools could plausibly share a name, the noun isn't specific enough (e.g., `read_fulltext` not `read_text` when structured metadata is a separate concept). |
| **Granularity** | One tool per user-meaningful workflow, not per API call. Consolidate related operations with `operation`/`mode` enum. |
| **Description** | Concrete capability statement. Add operational guidance (prerequisites, constraints, gotchas) when non-obvious. |
| **Input schema** | `.describe()` on every field. Constrained types (enums, literals, regex). Explain costs/tradeoffs of parameter choices. |
| **Output schema** | Designed for the LLM's next action. Include chaining IDs. Communicate filtering. Post-write state where useful. |
| **Error messages** | Name what went wrong and what the LLM should do about it. Include hints for common recovery paths. |
| **Annotations** | `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`. Helps clients auto-approve safely. |
| **Auth scopes** | `tool:noun:read`, `tool:noun:write`. Skip for read-only or stdio-only servers. |

### 5. Design Resources

Resources are supplementary — a convenience for clients that support injectable context via stable URIs. Since many clients are tool-only, verify that any data exposed via resources is also reachable through the tool surface. This doesn't require a 1:1 resource-to-tool mapping — the data might be covered by an existing tool's output, bundled into a broader tool, or warrant its own dedicated tool, depending on the server's purpose and how agents will use it.

For each resource:

| Aspect | Decision |
|:-------|:---------|
| **URI template** | `scheme://{param}/path`. Server domain as scheme. Keep shallow. |
| **Params** | Minimal — typically just an identifier. Complex queries belong in tools. |
| **Pagination** | Needed if lists exceed ~50 items. Opaque cursors via `extractCursor`/`paginateArray`. |
| **list()** | Provide if discoverable. Top-level categories or recent items, not exhaustive dumps. |
| **Tool coverage** | Verify the data is reachable via tools — either a dedicated tool, included in another tool's output, or not needed for tool-only agents. |

### 6. Design Prompts (if needed)

Optional. Use when the server has recurring interaction patterns worth structuring:

- Analysis frameworks, report templates, multi-step workflows

Skip for purely data/action-oriented servers.

### 7. Plan Services and Config

**Services** — one per external dependency. Init/accessor pattern. Skip if all tools are thin wrappers with no shared state.

For services wrapping external APIs, plan the resilience layer. See `docs/service-resilience.md` for full rationale.

| Concern | Decision |
|:--------|:---------|
| **Retry boundary** | Service method wraps full pipeline (fetch + parse), not just the network call. Use `withRetry` from `/utils`. |
| **Backoff calibration** | Match base delay to upstream recovery time: 200–500ms (ephemeral), 1–2s (rate-limited), 2–5s (degraded). |
| **HTTP status check** | `fetchWithTimeout` already handles this — non-OK → `ServiceUnavailable`. |
| **Parse failure classification** | Response handler detects HTML error pages and throws transient errors, not `SerializationError`. |
| **Exhausted retry messaging** | `withRetry` enriches the final error with attempt count automatically. |

For API efficiency, design the service methods to minimize upstream calls:

| Concern | Decision |
|:--------|:---------|
| **Batch over N+1** | If the API supports filter-by-IDs or bulk-GET endpoints, use a single batch request instead of N individual fetches. Cross-reference the response against requested IDs to detect missing items. |
| **Field selection** | If the API supports `fields`/`select` parameters, request only the fields the tool needs. A full study record might be 70KB; selecting 4 fields might be 5KB. |
| **Request consolidation** | When a tool needs data from multiple related endpoints, check if a single endpoint with broader field selection can serve the same data in one round trip. |
| **Pagination awareness** | If a batch request might exceed the API's page size, either paginate internally or assert/throw when results are truncated so callers aren't silently missing data. |

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

<!-- Optional sections for API-wrapping servers: -->
## Domain Mapping          <!-- nouns × operations → API endpoints -->
## Workflow Analysis        <!-- how tools chain for real tasks -->
## Design Decisions         <!-- rationale for consolidation, naming, tradeoffs -->
## Known Limitations        <!-- inherent API/data constraints the server can't solve -->
## API Reference            <!-- query language, pagination, rate limits -->
```

Keep it concise. The design doc is a working reference, not a spec document — enough to orient a developer (or agent) implementing the server, not more.

### 9. Confirm and Proceed

If the user has already authorized implementation (e.g., "build me a ___ server"), proceed directly to scaffolding using the design doc as the plan. Otherwise, present the design doc to the user for review before implementing.

## After Design

Execute the plan using the scaffolding skills:

1. `add-service` for each service
2. `add-tool` for each standard tool
3. `add-app-tool` for each MCP Apps tool (creates paired tool + UI resource)
4. `add-resource` for each standalone resource
5. `add-prompt` for each prompt
6. `devcheck` after each addition

## Checklist

- [ ] External APIs/dependencies researched and verified (docs fetched, SDKs identified)
- [ ] Domain operations mapped (nouns + verbs)
- [ ] Each operation classified as tool, resource, prompt, or excluded
- [ ] Related operations consolidated (operation/mode enum) — not one tool per endpoint
- [ ] Tool descriptions are concrete and include operational guidance where non-obvious
- [ ] Parameter `.describe()` text explains what the value is, what it affects, and tradeoffs
- [ ] Input schemas use constrained types (enums, literals, regex) over free strings
- [ ] Output schemas designed for LLM's next action — chaining IDs, post-write state, filtering communicated
- [ ] `format()` renders all data the LLM needs — different clients forward different surfaces (Claude Code → `structuredContent`, Claude Desktop → `content[]`); both must carry the same data, not just a count or title
- [ ] Error messages guide recovery — name what went wrong and what to do next
- [ ] Annotations set correctly (`readOnlyHint`, `destructiveHint`, etc.)
- [ ] Tool surface is self-sufficient — a tool-only agent can accomplish everything the server is for
- [ ] MCP Apps tools identified where interactive UI adds value (and `format()` provides full text fallback for non-app hosts)
- [ ] Resource URIs use `{param}` templates, pagination planned for large lists
- [ ] Service layer planned (or explicitly skipped with reasoning)
- [ ] Resilience planned for external API services (retry boundary, backoff, parse classification)
- [ ] Server config env vars identified
- [ ] Design doc written to `docs/design.md`
- [ ] Design confirmed with user (or user pre-authorized implementation)
