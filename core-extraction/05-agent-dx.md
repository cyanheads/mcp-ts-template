# 05 — Agent DX

> Agent discovery, `CLAUDE.md` management, Agent Skills, internal vs external audience.

---

## Audience Distinction

Every artifact in this project targets one of two audiences:

| Audience | Who | Examples |
|:---------|:----|:--------|
| **Internal** | Us — core package developers | `core-extraction/` docs, `CONTRIBUTING.md`, skills with `audience: internal` (`add-export`, `release`) |
| **External** | Consumers — developers building MCP servers with `@cyanheads/mcp-ts-core` | `CLAUDE.md`, skills with `audience: external` (`add-tool`, `add-resource`, `setup`) |

Both audiences' artifacts ship in the npm package. The audience distinction controls **what gets copied into consumer projects** during init/setup — only `audience: external` skills are copied. Internal skills remain available in `node_modules` for anyone working on the core package itself.

When adding a new artifact, always ask: "Is this for us building the core, or for someone using the core to build their server?"

---

## Why This Matters

The primary consumer of this framework is an LLM coding agent. Discovery — knowing what's available, where to find it, and how to use it — is a first-class design concern, not an afterthought.

In the current monolith, the agent reads `CLAUDE.md` and has the full codebase locally — Grep, Glob, LSP all work. After extraction, infrastructure lives in `node_modules/`. The agent can still read those files, but it needs to know what exists and where to look.

---

## Three Layers of Discovery

### Layer 1: Core's `CLAUDE.md` as agent reference

Ships in the published package at the root. This is the primary orientation mechanism. The agent reads it once and understands the full surface area of the framework. Structured for consumption, not contribution — documents how to *use* core, not how to *develop* it. Internal development instructions stay in `CONTRIBUTING.md` (not shipped).

### Layer 2: Exports catalog

A compact, scannable reference of every subpath export — what it provides, key symbols, one-line purpose. Included as a section in core's `CLAUDE.md`. This is what the agent checks when it needs to know "where do I import X from?"

| Subpath | Key Exports | Purpose |
|:--------|:------------|:--------|
| `@cyanheads/mcp-ts-core` | `createApp`, `CreateAppOptions`, `ServerHandle`, `CoreServices` | Node.js server entry point |
| `@cyanheads/mcp-ts-core/worker` | `createWorkerHandler`, `CloudflareBindings` | Cloudflare Workers entry point |
| `@cyanheads/mcp-ts-core/tools` | `ToolDefinition`, `ToolAnnotations` | Tool definition type and factory |
| `@cyanheads/mcp-ts-core/resources` | `ResourceDefinition` | Resource definition type and factory |
| `@cyanheads/mcp-ts-core/prompts` | `PromptDefinition` | Prompt definition type |
| `@cyanheads/mcp-ts-core/tasks` | `TaskToolDefinition`, `RequestTaskStore` | Async task tool definitions |
| `@cyanheads/mcp-ts-core/errors` | `McpError`, `JsonRpcErrorCode` | Error types and codes |
| `@cyanheads/mcp-ts-core/config` | `AppConfig`, `parseConfig` | Zod-validated config types |
| `@cyanheads/mcp-ts-core/auth` | `checkScopes` | Dynamic scope checking for advanced auth patterns |
| `@cyanheads/mcp-ts-core/storage` | `StorageService` | Tenant-scoped storage abstraction |
| `@cyanheads/mcp-ts-core/utils/logger` | `logger` | Pino structured logger |
| `@cyanheads/mcp-ts-core/utils/requestContext` | `requestContextService`, `RequestContext` | Request tracing context |
| `@cyanheads/mcp-ts-core/utils/errorHandler` | `ErrorHandler` | `tryCatch` for service-level recovery |
| `@cyanheads/mcp-ts-core/utils/formatting` | `markdown`, `MarkdownBuilder` | Markdown response builder |
| `@cyanheads/mcp-ts-core/utils/parsing` | `yamlParser`, `csvParser`, `xmlParser`, ... | Content parsers (lazy, Tier 3) |
| `@cyanheads/mcp-ts-core/utils/security` | `sanitization`, `rateLimiter`, `idGenerator` | Security utilities (lazy, Tier 3) |
| `@cyanheads/mcp-ts-core/utils/network` | `fetchWithTimeout` | HTTP client with timeout/abort |
| `@cyanheads/mcp-ts-core/utils/pagination` | `extractCursor`, `paginateArray` | Opaque cursor pagination |
| `@cyanheads/mcp-ts-core/utils/runtime` | `runtimeCaps` | Runtime feature detection (Node vs Workers) |
| `@cyanheads/mcp-ts-core/utils/scheduling` | `scheduler` | Cron scheduling (lazy, Tier 3) |
| `@cyanheads/mcp-ts-core/utils/types` | `isErrorWithCode`, `isRecord` | Type guard utilities |
| `@cyanheads/mcp-ts-core/testing` | `createMockContext` | Test helpers |

Initially hand-maintained. Can be auto-generated from TypeScript source (JSDoc + export names from each subpath entry point) once exports stabilize.

### Layer 3: Type signatures on demand

When the agent needs exact API details — "what fields does `CreateAppOptions` have?" — it reads the `.d.ts` file from `node_modules`. The exports catalog tells it which subpath to look at:

```
node_modules/@cyanheads/mcp-ts-core/dist/app.d.ts
```

Standard file reading. No special tooling.

### Agent workflow on a downstream server

1. Read the server's `CLAUDE.md` → sees pointer to core's reference
2. Read `node_modules/@cyanheads/mcp-ts-core/CLAUDE.md` → gets exports catalog, patterns, contracts
3. For exact signatures, read specific `.d.ts` files from `node_modules/@cyanheads/mcp-ts-core/dist/`
4. For common tasks, invoke skills (`/add-tool`, `/add-resource`, `/setup`, etc.) — see Agent Skills below
5. For server-specific code, use standard Grep/Glob/LSP on `src/`

---

## CLAUDE.md Management

Two distinct documents serve different audiences.

### Core's `CLAUDE.md` (ships in the package)

Consumer-facing reference. Structured for an LLM agent working on a downstream server. Contains:
- **Exports Reference** — the catalog table (Layer 2)
- **Patterns** — tool/resource/prompt definitions, context objects, error handling, auth wrappers
- **Contracts** — `ToolDefinition`, `ResourceDefinition`, `PromptDefinition` shapes; `createApp()` / `createWorkerHandler()` options
- **Error codes** — `JsonRpcErrorCode` table with when-to-use guidance
- **App wiring** — `createApp()` options, `CoreServices`, `setup()` callback, lazy accessor pattern for server-specific services
- **Common imports** — the 10 most-used import lines, copy-paste ready

Does **not** contain: internal development instructions, contribution guide, CI setup, release process. Those live in `CONTRIBUTING.md` in the repo (not shipped in the package).

### Core's `CONTRIBUTING.md` (repo only, not shipped)

Internal development guide: directory structure internals, how to add subpath exports, test infrastructure, release process, pre-extraction cleanup notes.

### Server's `CLAUDE.md`

Generated by `@cyanheads/mcp-ts-core init` from a template shipped at `skills/setup/assets/CLAUDE.md.template`. The CLI copies the template into the project root — servers can customize it freely after init.

```markdown
# Agent Protocol — {{SERVER_NAME}}

## Core Framework

This server is built on `@cyanheads/mcp-ts-core`. For infrastructure
documentation (exports reference, tool/resource/prompt contracts,
transports, storage, utils, auth, error handling):

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

Read that file for the exports catalog and common patterns.
Only read it once per session — the content is stable between updates.

## Skills

The project's `skills/` directory (project root) is the single source
of truth for skill definitions. It is populated by
`@cyanheads/mcp-ts-core init` from the package's canonical skills in
`node_modules/@cyanheads/mcp-ts-core/skills/`.

Your agent skill directory (e.g., `.claude/skills/`) must stay in sync
with `skills/`. When skills are added or updated in `skills/`, copy
them into your agent directory. When in doubt, diff the two directories.

## Server-Specific

[Domain instructions, tool patterns, service integrations, server config]
```

The server's `CLAUDE.md` focuses on what's unique — its domain, its tools, its services. Infrastructure docs live in one place and update with `bun update @cyanheads/mcp-ts-core`.

---

## Agent Skills

[Agent Skills](https://agentskills.io/specification) is an open standard (developed by Anthropic, adopted by 25+ tools including Claude Code, GitHub Copilot, OpenAI Codex, Gemini CLI, Cursor) for packaging modular, reusable agent capabilities. Each skill is a directory with a `SKILL.md` file — YAML frontmatter for discovery + markdown body for instructions.

Skills complement Discovery (knowing what exists) and CLAUDE.md (knowing the patterns) with executable recipes for common tasks. Core ships skill definitions that downstream servers inherit.

### Why skills over CLAUDE.md for workflows

| Concern | CLAUDE.md | Skills |
|:--------|:----------|:-------|
| Loading | Always in context | Progressive disclosure — ~50 tokens/skill at startup |
| Scope | General patterns and contracts | Specific task workflows |
| Invocation | Passive (agent reads once) | On-demand (`/skill-name`) or auto-triggered |
| Portability | Agent-specific | Open standard (Claude Code, Copilot, Codex, etc.) |

### All skills

All skills live in a single `skills/` directory within the core package. Each skill declares its audience via `metadata.audience` in the SKILL.md frontmatter:

- **`external`** — For developers building MCP servers with `@cyanheads/mcp-ts-core`. Copied into consumer projects by the `init` CLI.
- **`internal`** — For developers working on `@cyanheads/mcp-ts-core` itself. Ships in the package but is NOT copied into consumer projects.

| Skill | Audience | Description | What it does |
|:------|:---------|:------------|:-------------|
| `setup` | external | Post-init orientation for an MCP server using `@cyanheads/mcp-ts-core` | Orients the agent to the project structure, conventions, skill sync model, and core framework reference. Read after `@cyanheads/mcp-ts-core init` has run. |
| `add-tool` | external | Scaffold a new MCP tool definition | Creates `.tool.ts` with `tool()` builder, Zod schemas with `.describe()`, `handler(input, ctx)`, inline `auth`, `format`. Registers in `definitions/index.ts`. For long-running tools, prompts to add `task: true`. |
| `add-resource` | external | Scaffold a new MCP resource definition | Creates `.resource.ts` with `resource()` builder, URI template, `params` schema, `handler(params, ctx)` with `ctx.uri`, optional `list()` with pagination. Registers in `definitions/index.ts`. |
| `add-prompt` | external | Scaffold a new MCP prompt template | Creates `.prompt.ts` with `prompt()` builder, `args` schema, `generate` function. Registers in `definitions/index.ts`. |
| `add-service` | external | Scaffold a new service integration | Creates `services/[name]/` with init/accessor pattern for lazy singletons. Service methods receive `Context` for correlated logging and scoped storage. |
| `devcheck` | external | Lint, format, typecheck, and audit the project | Runs `bun run devcheck`. Interprets output, fixes issues, re-runs until clean. |
| `migrate-imports` | external | Migrate a template fork to use `@cyanheads/mcp-ts-core` | Rewrites `@/` imports to `@cyanheads/mcp-ts-core/` subpaths using the mapping table from [07-migration.md](07-migration.md). Validates no internal paths remain. |
| `maintenance` | external | Sync skills and dependencies after updates | Compares project `skills/` against `node_modules/@cyanheads/mcp-ts-core/skills/` for drift. Syncs agent skill directory with project `skills/`. Updates dependencies. |
| `add-export` | internal | Add a new subpath export to the core package | Creates the entry point file, adds the subpath to `package.json` `exports`, updates the exports catalog in `CLAUDE.md`, runs the export verification script. |
| `add-provider` | internal | Add a new storage or service provider to core | Creates provider file in the correct directory, implements the provider interface, adds lazy dep import if Tier 3, updates the serverless whitelist if needed. |
| `release` | internal | Prepare and publish a core release | Version bump, CHANGELOG entry, `devcheck`. Stops and asks the user to run publish commands (⚠️ user action required for npm publish, Docker push). Enforces the wrapup checklist. |

**Design change from earlier plan:** `add-task-tool` merged into `add-tool`. The `task: true` flag is a single-line addition to a normal tool — it doesn't warrant a separate skill. `add-tool` prompts the user about whether the tool is long-running and adds the flag accordingly.

### SKILL.md format

Each skill follows the [Agent Skills specification](https://agentskills.io/specification).

**Spec-defined frontmatter fields:**

| Field | Required | Type | Purpose |
|:------|:---------|:-----|:--------|
| `name` | Yes | string | 1–64 chars, lowercase + hyphens, must match parent directory name |
| `description` | Yes | string | 1–1024 chars, what the skill does and when to use it |
| `license` | No | string | License name or reference to bundled file |
| `compatibility` | No | string | 1–500 chars, environment requirements |
| `metadata` | No | `Record<string, string>` | Arbitrary key-value pairs for custom properties |
| `allowed-tools` | No | string | Space-delimited pre-approved tools (experimental) |

**Our custom metadata keys:**

| Key | Values | Purpose |
|:----|:-------|:--------|
| `metadata.audience` | `external` / `internal` | Controls whether the skill is copied into consumer projects by `init` |
| `metadata.author` | e.g. `cyanheads` | Skill authorship |
| `metadata.version` | e.g. `"1.0"` | Skill version — `init` compares this to decide whether to update an existing skill |

```markdown
---
name: add-tool
description: >
  Scaffold a new MCP tool definition. Use when the user asks to add a tool,
  create a new tool, or implement a new capability.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Context

[What the agent needs to know — imports, file conventions, key types.
Reference core's CLAUDE.md for contracts rather than duplicating them.]

## Steps

1. [Concrete, ordered instructions]
2. [Each step is actionable — no ambiguity]
3. [Include the specific files to create/modify]

## Template

[The skeleton code to generate, with placeholders marked as `{{TOOL_NAME}}` etc.]

## Checklist

Every skill MUST include a checklist. This is the acceptance criteria — the
skill is not complete until every item passes.

- [ ] File created with correct suffix (`.tool.ts` / `.resource.ts` / `.prompt.ts`)
- [ ] All Zod schema fields have `.describe()` annotations
- [ ] Auth declared via `auth: ['scope']` on the definition (if applicable)
- [ ] Registered in `definitions/index.ts` barrel
- [ ] `bun run devcheck` passes
- [ ] Smoke-tested with `bun run dev:stdio` or `dev:http`
```

**The Checklist section is mandatory.** Every skill must end with a markdown checklist of specific, verifiable goals. As the agent completes each item, it checks the box in the SKILL.md and adds a completion timestamp to the end of the checklist (e.g., `Completed: 2026-03-11`). This turns the skill file into a run record — on subsequent invocations, the agent can see what was already done and when, and decide whether to re-run or skip. The agent must not consider a skill complete until every item is checked.

### The `init` CLI and the `/setup` skill

See [13-init-cli.md](13-init-cli.md) for full `init` CLI specification. Summary of the separation:

- **`@cyanheads/mcp-ts-core init`** — A real CLI command (like `shadcn@latest init`). This is executable code that copies files into the **project root**: `CLAUDE.md` from the template, `audience: external` skills into `skills/`, and scaffolded directories. Re-running it after `bun update` syncs core skills in `skills/` — preserving local overrides and server-specific skills.

- **`/setup`** — A skill (pure text). The agent reads it for orientation after `init` has already run. It describes the project structure, where things live, what conventions to follow, and instructs the agent to sync its own skill directory (e.g., `.claude/skills/`) with the project's `skills/`. It does not copy files or run commands — the CLI already did that.

**What `init` does (CLI, executable):**

1. Copy `audience: external` skills from `node_modules/@cyanheads/mcp-ts-core/skills/` into project root `skills/`
2. Copy `CLAUDE.md.template` to project root as `CLAUDE.md` (skip if one already exists)
3. Scaffold `src/mcp-server/{tools,resources,prompts}/definitions/` with barrel files (skip if they exist)

**What `/setup` does (skill, text the agent reads):**

1. Orients the agent to the project structure created by `init`
2. Points to core's `CLAUDE.md` in `node_modules` for framework reference
3. Instructs the agent to sync its own skill directory (e.g., `.claude/skills/`) with the project's `skills/` directory
4. Describes conventions: file suffixes, naming, barrel exports

**`/setup` skill checklist** (agent verifies these after `init` has run):

- [ ] Project `skills/` directory exists and contains core skills
- [ ] Agent's own skill directory (e.g., `.claude/skills/`) is in sync with `skills/`
- [ ] `CLAUDE.md` exists with core framework pointer
- [ ] Project structure valid (definitions directories, barrel files)
- [ ] `bun run devcheck` passes

### Distribution

All skills live in a single directory within the core package:

```
node_modules/@cyanheads/mcp-ts-core/skills/
  setup/SKILL.md                          # audience: external
  add-tool/SKILL.md                       # audience: external
  add-tool/assets/tool-template.ts
  add-resource/SKILL.md                   # audience: external
  add-resource/assets/resource-template.ts
  add-prompt/SKILL.md                     # audience: external
  add-service/SKILL.md                    # audience: external
  devcheck/SKILL.md                       # audience: external
  migrate-imports/SKILL.md                # audience: external
  maintenance/SKILL.md                    # audience: external
  add-export/SKILL.md                     # audience: internal
  add-provider/SKILL.md                   # audience: internal
  release/SKILL.md                        # audience: internal
```

After `init`, in a consumer project (full directories copied for externals):
```
skills/                                  # project root — source of truth
  setup/SKILL.md
  setup/assets/CLAUDE.md.template
  add-tool/SKILL.md
  add-tool/assets/tool-template.ts
  add-resource/SKILL.md
  add-resource/assets/resource-template.ts
  add-prompt/SKILL.md
  add-service/SKILL.md
  devcheck/SKILL.md
  migrate-imports/SKILL.md
  maintenance/SKILL.md
  query-pubmed/SKILL.md                 # server-specific (added later)
  update-citations/SKILL.md             # server-specific (added later)
```

The agent keeps its own directory in sync with `skills/`:
```
.claude/skills/                          # agent's copy (Claude Code)
  setup/SKILL.md                         # synced from skills/
  add-tool/SKILL.md                      # synced from skills/
  ...
  query-pubmed/SKILL.md                 # synced from skills/
```

Internal skills (`add-export`, `add-provider`, `release`) remain in `node_modules` — accessible to anyone working on the core package but not copied into the project. Servers can override any core skill by replacing its directory in `skills/`. Server-specific skills are added directly to `skills/` following the same `SKILL.md` format with mandatory checklist.

### Progressive disclosure

| Tier | What loads | When | Token cost |
|:-----|:-----------|:-----|:-----------|
| Discovery | `name` + `description` only | Agent startup | ~50 tokens/skill |
| Activation | Full `SKILL.md` body | On relevance or `/skill-name` | ~500–5,000 tokens |
| Execution | `scripts/`, `references/`, `assets/` | Skill instructions reference them | ~2,000+ tokens |

With 12 skills: ~600 tokens at startup. The agent knows what it can do without full instructions in context. This is why skills scale better than cramming workflows into CLAUDE.md.

---

## Checklist

- [ ] Core `CLAUDE.md` written: exports catalog, patterns, contracts, error codes, common imports (no DI/container references)
- [ ] Core `CONTRIBUTING.md` written (repo-only, not in `files`)
- [ ] Server `CLAUDE.md` template created with core framework pointer
- [ ] All skills written in `skills/` with `metadata.audience` set (`external` or `internal`) and mandatory checklists
- [ ] `skills/` directory included in package `files` array
- [ ] `init` CLI correctly filters by `metadata.audience: external` when copying to project `skills/`
- [ ] `init` CLI skips existing `CLAUDE.md` (no overwrite)
- [ ] Server `CLAUDE.md` template instructs agent to sync its skill directory with `skills/`
- [ ] Progressive disclosure verified (frontmatter-only at startup)
