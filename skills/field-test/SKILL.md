---
name: field-test
description: >
  Exercise tools, resources, and prompts with real-world inputs to verify behavior end-to-end. Use after adding or modifying definitions, or when the user asks to test, try out, or verify their MCP surface. Calls each definition with realistic and adversarial inputs and produces a report of issues, pain points, and recommendations.
metadata:
  author: cyanheads
  version: "1.2"
  audience: external
  type: debug
---

## Context

Unit tests (`add-test` skill) verify handler logic with mocked context. Field testing verifies the full picture: real server, real transport, real inputs, real outputs. It catches issues that unit tests miss — bad descriptions, awkward input shapes, unhelpful error messages, missing format functions, schema mismatches, silent divergence between `structuredContent` and model-visible `content[]`, and surprising edge-case behavior.

**Actively use** the tools — don't just read their code.

---

## Steps

### 1. Surface available definitions

List the MCP tools, resources, and prompts available in your environment. This confirms the server is connected and gives you everything you need — names, descriptions, parameter schemas — to plan your tests.

If you don't see any MCP tools from this server, ask the user to connect it first (e.g. `claude mcp add` for Claude Code, or the equivalent for their client). Don't proceed until the tools are visible.

Present what you find: each definition's name, parameters (with types and descriptions), and any notable schema details (optional fields, enums, constraints). This is your test surface.

### 2. Test each definition

For every tool, resource, and prompt, run through these categories:

#### Tools

| Category | What to test |
|:---------|:-------------|
| **Happy path** | Realistic input that should succeed. Verify output shape matches the output schema. Verify format function produces sensible content blocks. |
| **`structuredContent` parity** | The `format-parity` lint rule already asserts every terminal field in the output schema appears in `format()`'s rendered text (via sentinel injection at startup). Field testing layers real-data checks on top: are values rendered accurately (not just their labels)? Do conditional-render branches in `format()` still render every field when specific values are present? Does the content look right to a human reading the LLM's view? |
| **Variations** | Different valid input combinations — optional fields omitted, optional fields included, different enum values, min/max boundaries. |
| **Field selection / projection** | For tools with `fields`, `include`, `expand`, `view`, or similar parameters, call the tool with non-default selections. Verify the handler returns the requested fields and `format()` renders each requested field rather than a hardcoded summary subset. |
| **Edge cases** | Empty strings, zero values, very long inputs, special characters, Unicode. |
| **Error paths** | Missing required fields, wrong types, nonexistent IDs, inputs that should trigger domain errors. Verify errors are clear and actionable — they should name what went wrong, why, and what to do next. |
| **Empty results** | Inputs that match nothing. Verify the response explains *why* (echoes criteria, suggests broadening) rather than returning a bare empty array. |
| **Partial success** | For tools that operate on multiple items, test cases where some succeed and some fail. Verify both outcomes are reported — not just the successes. |
| **Annotations** | Review tool `annotations` (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) against actual behavior. If a tool is marked read-only, verify it does not mutate state. If it is marked idempotent, verify retries with the same input are safe. If it is marked open-world false, verify it is not silently depending on live external systems. |
| **Workflow chaining** | For servers with multi-step workflows, execute 1-2 representative chains end-to-end. Example: search → detail → follow-up action. Verify each step returns the IDs, cursors, URIs, tokens, or state needed for the next step without guessing. |
| **Response quality** | Inspect successful responses for: (1) chaining IDs needed for follow-up calls, (2) operational metadata (counts, applied filters, truncation notices), (3) filtering transparency (if anything was excluded, does the response say what and how to include it?), (4) reasonable response size (not dumping unbounded data into context). See the `add-tool` skill's **Tool Response Design** section for the full set of patterns. |
| **Resilience** | For tools backed by external APIs or slow subsystems, test or explicitly note rate-limit, timeout, and transient-failure behavior. Verify retries/backoff happen where intended, or at minimum that the error message clearly tells the user whether to retry, wait, or change input. |
| **Descriptions** | Read every field's `.describe()` — would a user/LLM understand what to provide? Flag vague or missing descriptions. |

#### Resources

| Category | What to test |
|:---------|:-------------|
| **Happy path** | Valid URI with known params. Verify returned content and MIME type. |
| **List** | Call `list` if defined. Verify returned resources have names and valid URIs. |
| **Not found** | URI with nonexistent params. Verify a clear error, not a crash. |
| **Pagination** | If the resource uses `extractCursor`/`paginateArray`, test with varying limits and cursors. |

#### Prompts

| Category | What to test |
|:---------|:-------------|
| **Happy path** | Valid args. Verify generated messages are well-formed. |
| **Defaults** | Omit optional args. Verify the output still makes sense. |
| **Content quality** | Read the generated messages — are they clear, well-structured prompts? |

### 3. Track progress

Use a todo list to track each definition and its test status. Mark each as you go — don't batch.

### 4. Produce the report

After testing everything, present a structured report:

#### Summary table

| Definition | Type | Status | Issues |
|:-----------|:-----|:-------|:-------|
| `search_items` | tool | pass | — |
| `get_item` | tool | issues | Error message unhelpful for missing ID |
| `item://` | resource | fail | Crashes on nonexistent ID |

#### Detailed findings

For each definition with issues, include:

- **What happened** — the input, the output or error, and what was expected
- **Severity** — `bug` (broken behavior), `ux` (works but confusing/unhelpful), `nit` (minor polish)
- **Recommendation** — specific fix suggestion

#### Pain points

Cross-cutting observations that aren't tied to a single definition:

- Inconsistent error message patterns across tools
- Missing format functions (raw JSON returned to user)
- `structuredContent` contains data that `content[]` silently drops
- Requested projected fields are returned programmatically but not rendered for the model
- Description quality issues (vague, missing, or misleading)
- Schema design issues (required fields that should be optional, missing defaults, overly broad types, non-JSON-Schema-serializable types like `z.custom()` or `z.date()`)
- Annotation hints that do not match real behavior (`readOnlyHint`, `idempotentHint`, `openWorldHint`)
- Response quality issues (empty results with no context, silent filtering, missing chaining IDs, oversized payloads, no operational metadata)
- Multi-step workflows that cannot be completed because intermediate outputs omit required IDs, cursors, or URIs
- Error messages that don't guide recovery (generic "not found" instead of naming alternatives)
- Resilience issues (rate limits, timeouts, transient upstream failures handled poorly or explained poorly)
- Performance observations (unexpectedly slow responses)

---

## Checklist

- [ ] All registered tools tested (happy path + edge cases + empty results)
- [ ] All registered resources tested (happy path + not found)
- [ ] All registered prompts tested (happy path + defaults)
- [ ] Error messages reviewed for clarity and recovery guidance
- [ ] Empty-result responses reviewed for context (criteria echo, suggestions)
- [ ] `structuredContent` and `content[]` reviewed for parity
- [ ] Field-selection / projection behavior reviewed where applicable
- [ ] Response quality reviewed (chaining IDs, metadata, filtering transparency, payload size)
- [ ] Tool annotations reviewed against actual behavior
- [ ] Representative multi-step workflows exercised where applicable
- [ ] External API resilience reviewed where applicable (rate limits, timeouts, transient failures)
- [ ] Descriptions reviewed for completeness and accuracy
- [ ] Format functions verified (or absence noted)
- [ ] Summary report presented to user
