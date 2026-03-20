# Finalizing the Agent Protocol File

Guide for updating the project's `CLAUDE.md` or `AGENTS.md` after implementation is complete. The scaffolded template contains onboarding instructions and generic examples — this reference covers what to change.

## What to Update

### 1. Strip the "First Session" Block

The template contains a `## First Session` section with one-time onboarding steps. Once setup and design are complete, this block is dead weight. Delete the entire section (header through the `---` separator after it).

**Before:**

```markdown
## First Session

> **Remove this section** from CLAUDE.md / AGENTS.md after completing these steps.

1. **Read the framework API** — ...
2. **Run the `setup` skill** — ...
3. **Design the server** — ...

---
```

**After:** Section removed entirely.

### 2. Replace Example Patterns with Real Definitions

The template has generic `searchItems` / `itemData` / `reviewCode` examples in the Patterns section. Replace these with actual tool/resource/prompt definitions from the server — or the most representative ones if there are many.

Pick examples that:
- Show the most common or important capability
- Demonstrate any non-trivial patterns the server uses (e.g., `ctx.state`, `ctx.elicit`, `task: true`, services)
- Include a handler with real business logic, not just passthrough

Keep 1-2 examples per primitive type (tool, resource, prompt). Don't list every definition — the README handles that.

### 3. Update the Structure Diagram

The template shows a generic structure. Update it to reflect actual directories that exist:

- Add `config/server-config.ts` if the server has one
- Add service directories under `services/`
- Remove any directories that don't exist (e.g., if no prompts, remove the prompts line)
- Add `worker.ts` if using Cloudflare Workers

### 4. Update the Context Table

If the server doesn't use certain `ctx` features, they can be removed from the table for clarity. For example, if no tools use `ctx.elicit` or `ctx.sample`, drop those rows. Keep the table accurate to what this server actually uses.

### 5. Update Server Config Example

If the server has a `server-config.ts`, replace the generic example in the Patterns section with the actual schema (or a representative subset).

### 6. Update the Skills Table

If server-specific skills were added to `skills/`, add them to the skills table. Remove any framework skills the server doesn't use (rare — most are useful).

### 7. Update the Commands Table

If custom scripts were added to `package.json`, add them. If scripts were removed or renamed, update accordingly.

### 8. Update the Checklist

Add any server-specific items. For example:
- Specific env vars that must be set
- External service dependencies
- Custom naming conventions

## What to Keep

- **Core Rules** — these apply to all servers, keep as-is
- **Errors section** — the three-level escalation pattern is universal
- **Imports section** — keep unless you changed the alias convention
- **Framework reference pointer** — the line directing agents to `node_modules/@cyanheads/mcp-ts-core/CLAUDE.md`

## What NOT to Do

- Don't duplicate the full framework CLAUDE.md into the project file. The project file covers server-specific conventions; the framework file covers the API. The pointer at the top connects them.
- Don't remove the `## Core Rules` section even if it seems obvious. Agents read this fresh each session.
- Don't add implementation details that change frequently. The agent protocol file should be stable — update it when the server's shape changes, not on every commit.
