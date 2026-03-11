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

```markdown
# Agent Protocol — [Server Name]

## Core Framework

This server is built on `@cyanheads/mcp-ts-core`. For infrastructure
documentation (exports reference, tool/resource/prompt contracts, DI,
transports, storage, utils, auth, error handling):

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

Read that file for the exports catalog and common patterns.
Only read it once per session — the content is stable between updates.

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

- **`external`** — For developers building MCP servers with `@cyanheads/mcp-ts-core`. Copied into consumer projects during init/setup.
- **`internal`** — For developers working on `@cyanheads/mcp-ts-core` itself. Ships in the package but is NOT copied into consumer projects.

| Skill | Audience | Description | What it does |
|:------|:---------|:------------|:-------------|
| `setup` | external | First-time project setup for an MCP server using `@cyanheads/mcp-ts-core` | Detects installed agents, copies `audience: external` skills to agent-specific directories (`.claude/skills/`, `.codex/skills/`, etc.). Creates initial `CLAUDE.md` from template. Validates project structure. |
| `add-tool` | external | Scaffold a new MCP tool definition | Creates `.tool.ts` with `tool()` builder, Zod schemas with `.describe()`, `handler(input, ctx)`, inline `auth`, `format`. Registers in `definitions/index.ts`. For long-running tools, prompts to add `task: true`. |
| `add-resource` | external | Scaffold a new MCP resource definition | Creates `.resource.ts` with `resource()` builder, URI template, `params` schema, `handler(params, ctx)` with `ctx.uri`, optional `list()` with pagination. Registers in `definitions/index.ts`. |
| `add-prompt` | external | Scaffold a new MCP prompt template | Creates `.prompt.ts` with `prompt()` builder, `args` schema, `generate` function. Registers in `definitions/index.ts`. |
| `add-service` | external | Scaffold a new service integration | Creates `services/[name]/` with init/accessor pattern for lazy singletons. Service methods receive `Context` for correlated logging and scoped storage. |
| `devcheck` | external | Lint, format, typecheck, and audit the project | Runs `bun run devcheck`. Interprets output, fixes issues, re-runs until clean. |
| `migrate-imports` | external | Migrate a template fork to use `@cyanheads/mcp-ts-core` | Rewrites `@/` imports to `@cyanheads/mcp-ts-core/` subpaths using the mapping table from [07-migration.md](07-migration.md). Validates no internal paths remain. |
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
| `metadata.audience` | `external` / `internal` | Controls whether the skill is copied into consumer projects during init/setup |
| `metadata.author` | e.g. `cyanheads` | Skill authorship |
| `metadata.version` | e.g. `"1.0"` | Skill version for tracking updates |

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

**The Checklist section is mandatory.** Every skill must end with a markdown checklist of specific, verifiable goals. The checklist serves as both acceptance criteria for the agent and a progress tracker for the user. The agent must not consider a skill complete until every checkbox could be checked.

### The `/setup` skill

The setup skill is the entry point for a new project — invoked by `@cyanheads/mcp-ts-core init` or manually via `/setup`. Its instructions tell the agent to self-identify and adapt placement accordingly.

**What the skill's SKILL.md instructs the agent to do:**

1. **Identify yourself.** Determine which agent you are and what skill directory you use:
   - Claude Code → `.claude/skills/`
   - OpenAI Codex → `.codex/skills/` or `.agents/skills/`
   - Cursor → `.cursor/skills/`
   - Other → check your own documentation for skill directory conventions
2. **Copy external skills.** Read each skill's `SKILL.md` frontmatter from `node_modules/@cyanheads/mcp-ts-core/skills/`. Copy only skills where `metadata.audience` is `external` into the appropriate project-level skill directory identified in step 1.
3. **Generate CLAUDE.md.** Create the server's `CLAUDE.md` from a template, with the core framework pointer and server-specific sections (adapt if the agent uses a different convention, e.g. `AGENTS.md`)
4. **Validate structure.** Check that `src/mcp-server/tools/definitions/`, `src/mcp-server/resources/definitions/`, and `src/mcp-server/prompts/definitions/` exist with their barrel files
5. **Run devcheck.** Verify the project builds and passes all checks

The key insight: the agent knows what it is. The skill doesn't need to enumerate every possible agent — it tells the agent to figure out its own skill directory and copy there.

**Setup checklist:**

- [ ] Agent's skill directory identified and created
- [ ] External skills (where `metadata.audience: external`) copied from `node_modules/@cyanheads/mcp-ts-core/skills/`
- [ ] `CLAUDE.md` (or equivalent agent instructions file) created with core framework pointer
- [ ] Project structure validated (definitions directories, barrel files)
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
  add-export/SKILL.md                     # audience: internal
  add-provider/SKILL.md                   # audience: internal
  release/SKILL.md                        # audience: internal
```

After setup, in a Claude Code consumer project (only externals copied):
```
.claude/skills/
  setup/SKILL.md
  add-tool/SKILL.md
  add-resource/SKILL.md
  add-prompt/SKILL.md
  add-service/SKILL.md
  devcheck/SKILL.md
  migrate-imports/SKILL.md
  ...
  query-pubmed/SKILL.md          # server-specific (added later)
  update-citations/SKILL.md      # server-specific (added later)
```

Internal skills (`add-export`, `add-provider`, `release`) remain in `node_modules` — accessible to anyone working on the core package but not copied into consumer projects. Servers can override any core skill by replacing its directory with a local version. Server-specific skills are created directly in the agent's skill directory following the same `SKILL.md` format with mandatory checklist.

### Progressive disclosure

| Tier | What loads | When | Token cost |
|:-----|:-----------|:-----|:-----------|
| Discovery | `name` + `description` only | Agent startup | ~50 tokens/skill |
| Activation | Full `SKILL.md` body | On relevance or `/skill-name` | ~500–5,000 tokens |
| Execution | `scripts/`, `references/`, `assets/` | Skill instructions reference them | ~2,000+ tokens |

With 11 skills: ~550 tokens at startup. The agent knows what it can do without full instructions in context. This is why skills scale better than cramming workflows into CLAUDE.md.

---

## Checklist

- [ ] Core `CLAUDE.md` written: exports catalog, patterns, contracts, error codes, common imports (no DI/container references)
- [ ] Core `CONTRIBUTING.md` written (repo-only, not in `files`)
- [ ] Server `CLAUDE.md` template created with core framework pointer
- [ ] All skills written in `skills/` with `metadata.audience` set (`external` or `internal`) and mandatory checklists
- [ ] `skills/` directory included in package `files` array
- [ ] `/setup` skill correctly filters by `metadata.audience: external` when copying to consumer projects
- [ ] Progressive disclosure verified (frontmatter-only at startup)
