# Helpfulness patterns audit — 2026

**Date:** 2026-04-28
**Issue:** [#81](https://github.com/cyanheads/mcp-ts-core/issues/81) — empirical foundation for [#80](https://github.com/cyanheads/mcp-ts-core/issues/80) (`RecoveryHint`)
**Inputs:** [`docs/audit/per-server/`](./per-server/) — 8 servers, 47 tools, ~133 pattern instances
**Scope:** descriptive — what shapes servers actually use today, not what they should use.

The framework has been considering an augmentation lifecycle (`augment.onEmpty`, `augment.onSuccess`) and a typed `RecoveryHint`. Before adding primitives we need to know what server authors are already doing in practice. This doc rolls up the per-server findings into shape comparisons and decision-ready proposals.

---

## 1. Pattern frequency

Adoption per pattern across the 8 surveyed servers. *Tools-using* counts distinct tools that surface the pattern at least once (typed or format-only). *Servers-using* is binary per server.

| # | Pattern | Servers using | Tools using | Notes |
|--:|:--------|:--------------|:------------|:------|
| 1 | Empty-result recovery | **8 / 8** | ~26 | Universal. Three field shapes converge; format-only-vs-typed split is the dominant gap. |
| 2 | Did-you-mean | 4 / 8 | 6 | pubmed, arxiv, openalex, secedgar. Five distinct shapes — no convergence. |
| 3 | Next-step pointers | **8 / 8** | ~14 | Universal but mostly free-form prose (descriptions or `format()` strings). One typed field (`form_distribution`). |
| 4 | Auto-resolution | 7 / 8 | ~22 | Universal except nhtsa. Mostly invisible service-layer normalization; rarely surfaced as discriminants. |
| 5 | Partial-success envelopes | 5 / 8 | 11 | Two crystallized shapes: top-level missing-IDs arrays (3 servers) and per-item flags (3 servers, divergent shape). |
| 6 | Post-action state | **0 / 8** | 0 | Zero instances. All 8 are read-oriented servers — pattern doesn't apply to this corpus. |
| 7 | Warnings | 7 / 8 | 13 | All but openalex. Truncation + counter shape converges across 3 servers. |
| 8 | Recovery on errors | 6 / 8 | 11 | Almost always free-form prose in `error.message`; structured `error.data` is rare. |

**One-line takeaway:** Empty-result recovery, next-step pointers, and auto-resolution are universal practices; warnings are nearly universal; partial-success and error-recovery are common; post-action state is absent (out of scope for read-only servers).

---

## 2. Shape variance per pattern

For each pattern, the distinct field shapes observed. Field names quoted verbatim from source.

### Pattern 1 — Empty-result recovery

| Shape | Field name(s) | Servers | Cardinality |
|:------|:--------------|:--------|:-----------:|
| `notice?: string` | `notice` | pubmed (3 tools) | singular |
| `message?: string` | `message` | nhtsa (3 tools) | singular |
| `noMatchHints?: string[]` | `noMatchHints` | clinicaltrialsgov (3 tools) | array |
| Throw `notFound(hint)` | error.message string | secedgar (4 tools), arxiv (1) | error-path |
| `format()`-only string | none | cdc-health (2), openalex (3), pubchem (3), arxiv (1), pubmed (2), clinicaltrialsgov (1), secedgar (1), nhtsa (2) | format-only |

**Convergence:** singular-text optional field (`notice` / `message`) — same shape, different name. Array form (`noMatchHints`) is a stylistic divergence from the same intent.

### Pattern 2 — Did-you-mean

| Shape | Example | Server |
|:------|:--------|:-------|
| Dedicated tool returning `{ original, corrected, hasSuggestion }` | `pubmed_spell_check` | pubmed |
| `error.data.suggestions: string[]` via `validationError` | invalid arXiv category | arxiv |
| Per-item `hint: string \| null` for disambiguation context | `openalex_resolve_name` | openalex |
| Multi-match candidate list embedded in error message string | `secedgar_company_search` "Multiple matches for ..." | secedgar |
| Tool-pointer redirect via `notice` (no embedded correction) | pubmed search → `pubmed_spell_check` | pubmed |

**No convergence.** Five distinct shapes; the term covers spell-correction, disambiguation, and tool-redirect — three different problems.

### Pattern 3 — Next-step pointers

| Shape | Example | Servers |
|:------|:--------|:--------|
| Inline in tool/field `description` (static) | "Use this first to find the right dataset" | cdc-health, openalex |
| Per-status `**Next Step:**` line in `format()` | pubmed `lookup_citation` | pubmed, clinicaltrialsgov |
| Schema field with action-oriented `.describe()` | `candidatePmids`, `form_distribution` | pubmed, secedgar |
| Echo of input criteria as object/string | `searchCriteria`, `meta.echo`, `appliedFilters` | clinicaltrialsgov, openalex, cdc-health |
| `errmsg` rewrite naming alternate tools | pubmed `convert_ids` PMC_NOT_FOUND_REWRITE | pubmed |
| `format()`-only tool-name reference | "Use clinicaltrials_get_study_results for full data." | clinicaltrialsgov, nhtsa, pubchem |

The closest thing to a typed primitive is the **echo-input** sub-pattern (3 servers, divergent shapes). Cross-tool chaining is almost always prose in either descriptions or `format()`.

### Pattern 4 — Auto-resolution

| Shape | Example | Servers |
|:------|:--------|:--------|
| Service-layer normalization, transparent | `normalizeId(id)` (DOI/ORCID/ROR/PMID detection); `stripVersion(arxivId)` | openalex, arxiv, secedgar, pubchem, pubmed, clinicaltrialsgov, cdc-health |
| Discriminant on output naming the path taken | `source: 'arxiv_html' \| 'ar5iv'`; `source: 'pmc' \| 'unpaywall'` | arxiv, pubmed |
| Echo of resolved/applied input | `searchCriteria`, `meta.echo`, `appliedFilters` | clinicaltrialsgov, openalex, cdc-health |
| Multi-tag sequential fallback with surfaced `tags_tried` | secedgar `get_financials` | secedgar |
| Scalar-to-array coercion before service call | `Array.isArray(x) ? x : [x]` | clinicaltrialsgov (4 tools) |

Most auto-resolution is invisible. The **discriminant-on-output** sub-pattern (2 servers, same shape: `z.enum([...])` on a `source`/`path` field) is the only typed surface for "which resolver path got taken."

### Pattern 5 — Partial-success envelopes

| Shape | Example | Servers |
|:------|:--------|:--------|
| Top-level array of failed IDs | `unavailablePmids?: string[]`, `not_found?: string[]`, `studiesWithoutResults?: string[]` | pubmed (3 tools), arxiv (1), clinicaltrialsgov (1) |
| Per-item `found: boolean` flag | `pubchem_get_summary`, `pubchem_get_compound_details` | pubchem (2) |
| Per-item `hasData: boolean` flag | `pubchem_get_compound_safety` | pubchem (1) |
| Per-item discriminated `status: enum` | `pubmed_lookup_citation` (`'matched' \| 'not_found' \| 'ambiguous'`) | pubmed (1) |
| Top-level typed-reason array | `unavailable: Array<{ pmid; reason: enum }>` (6-value enum) | pubmed (1) |
| `fetchErrors: Array<{ id; error: string }>` | `clinicaltrials_get_study_results` | clinicaltrialsgov (1) |
| Per-record `errmsg?: string` (presence = failure signal) | `pubmed_convert_ids` | pubmed (1) |
| Composite `sectionStatus: { foo: 'available'\|'partial'\|'unavailable' }` | `nhtsa_get_vehicle_safety` | nhtsa (1) |

Two clusters:
- **Top-level missing-IDs array** — 3 servers, same shape (string[]), three different names.
- **Per-item outcome flag** — 3 servers, same role, divergent shapes (`boolean`, `enum`, status string).

### Pattern 7 — Warnings

| Shape | Example | Servers |
|:------|:--------|:--------|
| `truncated: boolean` + `total*: number` counter | `total_characters/body_characters`, `totalAvailable`, `content_total_length` | arxiv, pubchem, secedgar |
| `warnings: z.array(z.string())` always-present | `nhtsa_get_vehicle_safety` | nhtsa |
| `warnings?: Array<{ code: enum; message: string }>` | `pubmed_lookup_citation` (`author_mismatch \| year_mismatch`) | pubmed |
| Per-item `errorCode?: string; errorText?: string` | `nhtsa_decode_vin` (VPIC sentinel `'0'` = success) | nhtsa |
| Sentinel boolean flag (cap reached) | `total_is_exact: boolean` (10K cap) | secedgar |
| `tags_tried?: string[]` (multi-tag fallback) | `secedgar_get_financials` | secedgar |
| `format()`-only truncation prose | "...and N more rows (truncated in display)" | cdc-health, pubchem |
| Log-only (invisible to caller) | PUG View 10-CID cap → `ctx.log.info(...)` | pubchem |

**Convergence:** truncation pair (`truncated: boolean` + total counter) — 3 servers, very similar shape, distinct field-name conventions.

### Pattern 8 — Recovery on errors

| Shape | Example | Servers |
|:------|:--------|:--------|
| Free-form hint embedded in `error.message` | "Verify the campaign number format..."; "Try a related concept." | nhtsa, secedgar (multiple), arxiv, cdc-health, pubmed |
| Enumerated valid options in `error.message` | "Available documents: a, b, c. Use one of these names." | clinicaltrialsgov, secedgar |
| Error contract entry with code + structured `data` | `find_related` `elink_error` (code + `data: { pmid, relationship, ncbiError }`) | pubmed |
| Service-layer error rewriting based on upstream error code | Socrata `query.soql.no-such-column` → cdc tool-pointer prose | cdc-health |
| `error.data.suggestions: string[]` | invalid arXiv category | arxiv |
| Free-text error message with fallback URL inline | "PDF is available at https://..." | arxiv |
| Per-record `errmsg` rewrite based on regex match | pubmed `convert_ids` PMC_NOT_FOUND_REWRITE | pubmed |

The dominant practice is unstructured prose in `error.message`. Structured `error.data` payloads are rare (2 instances total).

---

## 3. Adoption gaps

Tools that plausibly *should* carry recovery hints but don't, drawn from the per-server gap sections. Conservative — only clear cases.

### 3a. Cross-cutting: format-only-vs-typed split

The single most common gap. Servers add zero-result hints in `format()` only, leaving `structuredContent`-consuming clients (Claude Code) blind to guidance that `content[]` clients (Claude Desktop) see. Affected:

| Server | Tools |
|:-------|:------|
| arxiv | `arxiv_search` (both empty branch and pagination overrun) |
| cdc-health | `cdc_discover_datasets`, `cdc_query_dataset` |
| openalex | `openalex_analyze_trends`, `openalex_search_entities`, `openalex_resolve_name` |
| pubchem | `pubchem_search_compounds`, `pubchem_search_assays`, `pubchem_get_bioactivity` |
| pubmed | `pubmed_fetch_articles`, `pubmed_format_citations` |
| nhtsa | `nhtsa_search_recalls`, `nhtsa_search_complaints` |
| secedgar | `secedgar_search_concepts` |

**At least 7 of 8 servers** have this gap on at least one tool. The same servers often have *typed* hint fields on other tools — the gap is intra-server inconsistency more than across-the-board absence.

### 3a-bis. Silent truncation (caller-invisible data loss)

A separate cross-cutting concern. The audit surfaced one instance, but it's worth calling out as a category because it's an unconditional anti-pattern.

| Server | Tool | What's silent | Mitigation |
|:-------|:-----|:--------------|:-----------|
| pubchem | `get_compound_details` | PUG View 10-CID cap drops description/classification data for CIDs 11–N; logged via `ctx.log.info` only, no field on the response indicates the gap | Per-CID cursor pagination, OR typed `Truncation` per CID with a configurable `maxViewCids` input, OR split into a dedicated single-CID tool |

Silent truncation is strictly worse than typed truncation: the caller cannot tell their response is incomplete. See §4.3 for the full precedence hierarchy (native pagination → server-side cursor → typed Truncation → display-only).

### 3b. Per-server gaps (one per server, condensed)

| Server | Gap |
|:-------|:----|
| pubmed | `find_related` `notice` only populated for `relationship: 'references'` — `cited_by` / `similar` empty results carry no signal |
| clinicaltrialsgov | `get_study` not-found surfaces as unstructured throw; no recovery suggestion to `search_studies` |
| arxiv | `arxiv_search` did-you-mean for invalid category lives in `error.data` only; no success-path field for borderline categories |
| cdc-health | `discover_datasets` recovery exists only in `format()`; no typed `notice` carrier |
| openalex | `resolve_name` empty result returns bare "No matches found." with no actionable next step — and this tool is the documented prerequisite for `search_entities` filtering |
| pubchem | `search_compounds` (identifier mode) silently drops failed lookups — no per-identifier `found` row, unlike `get_summary` |
| secedgar | `compare_metric` returns ranked rows but no typed pointer to `get_filing` despite each row having an `accession_number` |
| nhtsa | `search_recalls` and `search_complaints` zero-result hints are `format()`-only despite the server having a typed `message` field on three sibling tools |

---

## 4. Crystallized shapes — proposals

Patterns where ≥3 servers converged on a similar shape. Each gets a concrete decision: **bless as type**, **document as pattern**, or **skip**.

### 4.1 Optional empty-result hint — `notice` / `message` / `noMatchHints`

- **Servers:** pubmed (3 tools, `notice?: string`), nhtsa (3 tools, `message?: string`), clinicaltrialsgov (3 tools, `noMatchHints?: string[]`).
- **Shape variance:** singular text vs array of strings; field name differs.
- **Trigger convergence:** all populate on `result.length === 0`, conditioned on input flags (filters present, age/sex extremes, pagination overshoot).
- **Proposal: BLESS AS TYPE.** Strongest crystallization signal in the corpus. Resolve naming + cardinality with a single typed alias and an opt-in helper.
  ```ts
  // candidate
  export type RecoveryHint = {
    /** Human-readable guidance. Markdown allowed. */
    hint: string;
    /** Optional structured pointers — tool names callers may try next. */
    suggestedTools?: string[];
  };
  ```
  Cardinality choice (single `hint: string` vs `hints: string[]`): the singular form is more common (pubmed + nhtsa = 6 tools) than the array form (clinicaltrialsgov = 3 tools); array semantics are recoverable with `hint.split('\n')` or composition. Recommend singular.
  Servers can opt into `output: z.object({ recoveryHint: RecoveryHintSchema.optional(), ... })` instead of redefining the shape per tool.

### 4.2 Top-level missing-IDs array

- **Servers:** pubmed (`unavailablePmids` × 3 tools, `unavailablePmcIds` × 1), arxiv (`not_found`), clinicaltrialsgov (`studiesWithoutResults`).
- **Shape:** `string[]` at the top level, omitted when empty.
- **Variance:** field names diverge sharply; semantics identical.
- **Proposal: DOCUMENT AS PATTERN.** Field-name convention only. Resist a generic `unavailable: string[]` alias because the ID-type information is meaningful — `unavailablePmids` is more useful to a caller than `unavailable`. Recommend the `add-tool` skill suggest two shapes depending on failure-cause distinguishability:
  - **Simple case** (failure cause is "didn't exist"): `unavailable<IdType>: string[]` with `.optional()`, omitted when empty. Caller doesn't need a per-ID reason because the implicit reason is uniform.
  - **Rich case** (failure causes are meaningfully discriminated *and not recoverable by retry*): `unavailable: Array<{ <id>: string; reason: enum }>` with a typed reason enum, as in pubmed's `fetch_fulltext` (`'no-pmc-fallback-disabled' | 'no-doi' | 'no-oa' | 'fetch-failed' | 'parse-failed' | 'service-error'`). Different reasons typically demand different caller responses; collapsing this to a bare `string[]` drops information the caller cannot reconstruct from any other tool call.

### 4.3 Truncation pair — `truncated: boolean` + total counter

**Before reaching for truncation: prefer pagination.** Truncation drops data the caller may need. The framework's strong default is "don't truncate unless there is no other path" — and even then, ensure the caller has a way to recover the dropped portion. Precedence hierarchy:

| Tier | Approach | When to use | Drops data? | Deployment-safe? |
|--:|:---------|:------------|:-----------:|:----------------:|
| 1 | **Native upstream pagination** — pass through `retstart`/`retmax`, `pageToken`, `cursor`, `start`/`max_results` from the underlying API | Upstream supports it (pubmed eUtils, ClinicalTrials.gov `pageToken`, OpenAlex cursor, arxiv `start`) | No | Yes (everywhere) |
| 2a | **Stateless cursor over a re-fetched full set** — `extractCursor` / `paginateArray` from `/utils`, with the full upstream fetch on every page | Upstream is unbounded with no native pagination; the working set fits in memory; bandwidth-per-page cost is acceptable | No | Yes (everywhere) |
| 2b | **Cached full set + cursor** — same as 2a but the full set is cached in service memory across calls | Stdio or single-instance HTTP only; staleness bounded by TTL | No | **Risky on Workers / multi-instance HTTP** |
| 3 | **Per-sub-collection caps** with `Truncation` per group | Aggregate response has multiple groups of varied cardinality and the upstream doesn't paginate per-group | Yes (caller raises limit to recover) | Yes |
| 4 | **Body/blob truncation** with `Truncation` and a `max_*`/`*_limit` input | Single monolithic resource (document text, HTML body) with no internal pagination handle | Yes (caller raises limit to recover) | Yes |
| 5 | **Display-only truncation** in `format()` while `structuredContent` carries the full set | Cosmetic — too many rows to render readably, but the structured surface is complete | No | Yes |

**Tier 1 > 2a > 2b is the precedence for paginating.** The cursor itself is always stateless (`paginateArray` is pure: base64-encodes `{ offset, limit }` and slices the array passed in). The risk is in *how the array is produced on each call.* Tier 2b stores the full set in service-instance memory — fine for stdio and single-instance HTTP, but on Cloudflare Workers the per-request `McpServer` factory means a fresh isolate may be allocated, so the cache often doesn't survive between requests; on multi-instance HTTP the caller's next page may hit a different instance (cold cache or cursor drift). Real Tier 2b on Workers requires KV/D1/Cache API, which is no longer "just memoize." Tier 2a (re-fetch the full set every page) is correct everywhere — pay the bandwidth cost, get deployment portability for free. **Hand-rolling truncation when the upstream supports Tier 1 is a code smell** — it caps the caller's reach for no defensible reason.

The corpus's truncating tools all fall into Tier 4 (arxiv `read_paper` HTML body, secedgar `get_filing` content, pubchem `get_compound_details` descriptions) or Tier 3 (pubchem `get_compound_xrefs` per-type cap). cdc-health `query_dataset` is Tier 5 (display-only). nhtsa `search_investigations` is the corpus's only Tier 2 — and it's Tier 2b (`private investigationCache: { data; fetchedAt }` with TTL): correct for its current stdio/HTTP deployment, but would silently degrade to Tier 2a on Workers (cold isolate every page → cache never warm → bandwidth cost on every page). That's the well-formed picture.

**Silent truncation is never acceptable.** A cap with no flag, no count, and no input parameter to raise leaves the caller blind to the loss. The audit found one instance: pubchem `get_compound_details` PUG View 10-CID cap — log-only, caller-invisible. The fix is one of:

1. Per-call cursor pagination over the over-cap CIDs.
2. Expose the cap as a typed `Truncation` field plus a configurable `maxViewCids` input.
3. Split into a dedicated tool that handles a single CID at a time.

A `Truncation` field without a configurable input limit is the same anti-pattern wearing a typed disguise — the caller knows data was dropped but has no way to retrieve it.

#### Proposal — Tier 3 / Tier 4 typed signal

- **Servers:** arxiv (`truncated` + `total_characters/body_characters`), pubchem (`truncated` + `totalAvailable`), secedgar (`content_truncated` + `content_total_length`).
- **Shape:** `{ truncated: boolean; totalAvailable: number }` (with naming variance on the counter).
- **Trigger convergence:** caller-supplied limit (`max_characters`, `maxPerType`, `content_limit`) exceeded.
- **Proposal: BLESS AS TYPE — but as a Tier 3/4 signal, not a default.** Clean, narrow, three-server convergence with no domain-specific baggage.
  ```ts
  // candidate
  export type Truncation = {
    truncated: boolean;
    /** Full count before truncation. Caller raises the input limit by (totalAvailable − returned) to recover. */
    totalAvailable: number;
  };
  ```
  **Required companion:** a corresponding `max_*` / `*_limit` input parameter on the tool. The "secondary tool call to retrieve more" path the framework relies on is a parameter-change retry — that's the only mechanism that keeps Tier 4 honest. Without it, `Truncation` is silent truncation in a structured wrapper.

  The `add-tool` skill should default callers to Tiers 1 & 2 and require an explicit reason to use Tiers 3 or 4. A "have you considered pagination?" prompt before scaffolding a Truncation field would catch most cases of premature capping. Could ship with a renderer helper that emits the `_+${more} more — increase max to see them._` line that pubchem and secedgar both write by hand.

### 4.4 Per-item partial-success flag

- **Servers:** pubchem (`found: boolean`, `hasData: boolean`), pubmed (`status: 'matched'|'not_found'|'ambiguous'`), nhtsa (`sectionStatus: enum`).
- **Shape variance:** boolean (binary) vs enum (multi-state). `found` and `hasData` are the same role with different names.
- **Proposal: DOCUMENT AS PATTERN.** Two-state and three-state cases are genuinely different problems. The synthesis lacks shape convergence. Recommend documenting both forms in `add-tool`:
  - Two-state: `found: boolean` (preferred name) on each item; `data: T` optional.
  - Multi-state: `z.discriminatedUnion('status', [...])` per item with explicit branches.

### 4.5 Echo / appliedFilters / searchCriteria

- **Servers:** cdc-health (`appliedFilters`: typed object), clinicaltrialsgov (`searchCriteria`: `Record<string, unknown>`), openalex (`meta.echo`: string).
- **Shape variance:** typed object vs untyped record vs prose string.
- **Proposal: DOCUMENT AS PATTERN.** Convergent intent (echo what was actually queried so callers can verify on empty results), divergent shape. Skip a primitive — the underlying input shape is too server-specific. Recommend the `add-tool` skill mention this as an option for search tools, with the prose-form (`meta.echo: string`) as the cheapest to implement.

### 4.6 Tool-pointer in `error.message` (anti-crystallization)

- **Servers:** at least 5 (cdc-health, secedgar, nhtsa, arxiv, pubmed).
- **Pattern:** error message strings name a recovery tool (`Use cdc_get_dataset_schema`, `Use nhtsa_lookup_vehicles`, `try pubmed_search_articles`).
- **Anti-pattern:** consistently free-form prose; never structured into `error.data`.
- **Proposal: BLESS AS TYPE on `error.data`.** Five servers reinvent the same prose pattern — typing it removes brittle string parsing.
  ```ts
  // candidate (lives in error.data — already extensible)
  type ErrorRecoveryData = {
    suggestedTools?: string[];        // names of tools to try next
    suggestedInputs?: Record<string, unknown>; // alternative inputs to try
  };
  ```
  **Strictly additive — `error.message` keeps its prose unchanged.** Today's messages carry per-tool rationale (`"Use cdc_get_dataset_schema to see available columns for this dataset."` — the "to see available columns" half is context, not redundant). A bare `suggestedTools: string[]` strips that rationale; collapsing the prose into the structured field would drop information the caller has no other path to recover. The structured field is a *parallel* surface for clients that want to act programmatically; the human-readable rationale stays in `error.message`. If a server wants the rationale typed too, the richer shape `Array<{ name: string; reason?: string }>` is the upgrade path.
  Pairs naturally with the existing error-factory pattern (`notFound(msg, data)`). The `add-tool` skill could nudge handlers to populate `data.suggestedTools` whenever the error message names a tool — without removing the message text.

### 4.7 Format-only-vs-typed gap (universal anti-pattern)

- Not a shape — a structural inconsistency that affects 7 / 8 servers.
- **Proposal: LINTER + SKILL GUIDANCE.** Two complementary moves:
  1. **`add-tool` skill guidance:** for any handler with an `if (result.length === 0)` branch in `format()`, prefer a typed `recoveryHint` (4.1) over a prose-only string. If the synthesis is right that 7 of 8 servers have this gap, the scaffold should make the typed path the path of least resistance.
  2. **Optional linter rule** (`prefer-typed-empty-result-hint`): warn when a `format()` body contains a string literal matching `/no .* (found|matched|results)/i` *and* the output schema has no recovery field. Warning, not error — sometimes a bare "No results." is genuinely all the caller needs.

### Crystallization summary

| # | Shape | Decision |
|--:|:------|:---------|
| 4.1 | Optional empty-result hint (`hint?: string`) | **BLESS** as `RecoveryHint` |
| 4.2 | Top-level missing-IDs array | **DOCUMENT** (naming convention) |
| 4.3 | `truncated: boolean` + total counter | **BLESS** as `Truncation` |
| 4.4 | Per-item partial-success flag | **DOCUMENT** (boolean and enum forms) |
| 4.5 | Input-echo field | **DOCUMENT** (intent only; shape too varied) |
| 4.6 | Tool-pointer in error.message | **BLESS** structured `error.data.suggestedTools` |
| 4.7 | Format-only-vs-typed gap | **LINT + SKILL** (no new type) |

---

## 5. Idiosyncratic patterns

Server-domain-specific shapes that don't generalize. Surfaced for completeness — these should stay as one-offs.

| Server | Pattern | Why it doesn't generalize |
|:-------|:--------|:--------------------------|
| pubmed | Relationship-aware secondary lookup before producing `notice` (find_related fires extra eSummary call to inform empty-result hint) | Cost-of-hint trade-off is workflow-specific |
| pubmed | `matchedFirstAuthor` "eyeball signal" field for human verification | Domain-specific (citation matching has eyeball-verifiable surface) |
| pubmed | Discriminated `source: 'pmc' \| 'unpaywall'` union with structural reliability semantics | Specific to two-source full-text retrieval |
| clinicaltrialsgov | Condition auto-quoting for Essie query syntax | API-specific |
| clinicaltrialsgov | Batch→sequential fallback with per-ID `fetchErrors` | Specific to ClinicalTrials.gov batch all-or-nothing rejection |
| arxiv | Levenshtein + prefix-match category suggestions | Closed-set vocabulary problem |
| arxiv | Pagination-overrun branch distinct from genuine empty | Generic-enough to mention in skill, but the "two-different-empties" framing is rare |
| cdc-health | Regex-gated dataset ID with cross-tool source hint embedded in `.describe()` | Belt-and-suspenders pattern; useful but optional |
| openalex | Inverted-index → plaintext abstract reconstruction | OpenAlex API-specific format |
| openalex | `select` field alias translation (`abstract` ↔ `abstract_inverted_index`) | OpenAlex-specific |
| openalex | Default field projection per entity type | Payload-control workaround |
| pubchem | Dedup-before-deliver across multi-depositor data | PubChem aggregation model |
| pubchem | Property name normalization (`SMILES` ↔ `IsomericSMILES`) | API-specific |
| pubchem | `null` vs `false` three-way drug-likeness flag | Domain-specific (insufficient-data semantics) |
| pubchem | ListKey polling (transparent retry on async PubChem search) | API-specific async pattern |
| pubchem | HTTP 400 → not-found conversion based on message text | API-specific quirk |
| secedgar | Multi-tag sequential fallback for historical XBRL naming changes | Domain-specific (accounting standard transitions) |
| secedgar | `ticker:X` / `cik:X` token rewriting inside free-text query | UX innovation; could inform a hybrid-input convention but no other server has the same shape |
| secedgar | Instant-frame period detection in error hint (`/I$/.test(frame)`) | XBRL-specific |
| nhtsa | Code-label translation parallel fields (`investigationType` + `investigationTypeName`) | Common API pattern but rendered as parallel fields rather than `{ code, label }` object |
| nhtsa | `sectionStatus` + `warnings` dual-channel (machine-readable status + human-readable explanation) | Generalizable but only one tool uses it |
| nhtsa | VPIC `errorCode: '0'` sentinel | API-specific |

None of these need framework support. Some (pubmed's `source` discriminant, nhtsa's dual-channel, arxiv's pagination-overrun branching) could become example patterns in skill docs without crystallizing as types.

---

## Decisions enabled

The audit feeds into three concrete decisions for issue #80 and the framework roadmap.

1. **`RecoveryHint` (issue #80) is the right minimal type.** Three servers converged on essentially the same shape (`hint?: string` / `message?: string` / `noMatchHints?: string[]`); cardinality choice (singular vs array) is the only open question, and singular wins on prevalence (6 tools to 3). Recommend shipping `RecoveryHint = { hint: string; suggestedTools?: string[] }` as a typed alias and an opt-in `output` field convention.

2. **Skip `augment.onEmpty` / `augment.onSuccess` lifecycle primitives.** None of the 8 servers reinvent a *lifecycle hook* — they all build hints inline in handlers. Three of them extract a helper (pubmed's `buildNotice()`, clinicaltrialsgov's per-parameter hint pushers, secedgar's `tags_tried` accumulator) but those are local refactors, not lifecycle abstractions. The empirical evidence for `augment.onEmpty` is weak; revisit if 3+ servers later reinvent the same lifecycle pattern.

3. **Bless two additional narrow primitives + one error.data convention.** Beyond `RecoveryHint`:
   - `Truncation = { truncated: boolean; totalAvailable: number }` — 3-server convergence, clean shape. **Position as a last-resort Tier 3/4 signal, not a default** — see §4.3 for the precedence hierarchy. Truncation primitive must always pair with a configurable `max_*`/`*_limit` input so the caller can recover the dropped data; without that, it's silent truncation in disguise.
   - `error.data.suggestedTools?: string[]` — 5+ servers reinvent prose-form tool pointers; type the structured surface.
   - Skip everything else; document the rest as patterns in `add-tool` and (optionally) a lint rule for the format-only-vs-typed gap.

4. **`add-tool` skill update.** Add a "helpfulness checklist" to the scaffold guidance:
   - Empty-result `RecoveryHint` field.
   - **Pagination first.** Before suggesting `Truncation`, the skill should walk the precedence in §4.3: native upstream pagination (Tier 1) → stateless `paginateArray` over a re-fetched full set (Tier 2a) → cached full set + cursor (Tier 2b, **stdio / single-instance HTTP only**; risky on Workers and multi-instance HTTP) → typed `Truncation` (Tier 3/4). Only fall through to `Truncation` when no upstream pagination handle exists — and always require an `*_limit` input alongside. The skill should ask "is the runtime target portable to Workers?" before suggesting Tier 2b.
   - Structured `error.data` for not-founds.
   - Keep the bar low — these are opt-in conventions, not requirements.

5. **No retroactive migration.** Existing servers' custom shapes (`unavailablePmids`, `searchCriteria`, `sectionStatus`, etc.) keep working. Newly-blessed types are aliases servers opt into — not coercion.

---

## Source attribution

Per-server findings: [`per-server/`](./per-server/). Each per-server doc includes a pattern matrix with file:line refs into its respective source repo (`/Users/casey/Developer/github/<server>/src/`).

| Server | Tools | Per-server doc |
|:-------|:-----:|:---------------|
| pubmed-mcp-server | 9 | [`per-server/pubmed-mcp-server.md`](./per-server/pubmed-mcp-server.md) |
| clinicaltrialsgov-mcp-server | 7 | [`per-server/clinicaltrialsgov-mcp-server.md`](./per-server/clinicaltrialsgov-mcp-server.md) |
| pubchem-mcp-server | 8 | [`per-server/pubchem-mcp-server.md`](./per-server/pubchem-mcp-server.md) |
| nhtsa-vehicle-safety-mcp-server | 7 | [`per-server/nhtsa-vehicle-safety-mcp-server.md`](./per-server/nhtsa-vehicle-safety-mcp-server.md) |
| secedgar-mcp-server | 6 | [`per-server/secedgar-mcp-server.md`](./per-server/secedgar-mcp-server.md) |
| arxiv-mcp-server | 4 | [`per-server/arxiv-mcp-server.md`](./per-server/arxiv-mcp-server.md) |
| cdc-health-mcp-server | 3 | [`per-server/cdc-health-mcp-server.md`](./per-server/cdc-health-mcp-server.md) |
| openalex-mcp-server | 3 | [`per-server/openalex-mcp-server.md`](./per-server/openalex-mcp-server.md) |
