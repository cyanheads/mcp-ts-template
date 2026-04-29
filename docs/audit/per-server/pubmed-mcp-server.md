# pubmed-mcp-server — helpfulness pattern audit

**Surveyed:** 2026-04-28
**Source:** src/mcp-server/tools/definitions/
**Tool count:** 9

## Pattern matrix

| Tool | Pattern | Field shape | Trigger | Typed in output schema? | Source ref |
|:-----|:--------|:------------|:--------|:------------------------|:-----------|
| `pubmed_search_articles` | 1. Empty-result recovery | `notice?: string` | `totalFound === 0`, filters present → filter-removal advice; no filters → spell-check suggestion; offset overshoot → reset-offset advice | Yes (`notice` on output schema) | search-articles.tool.ts:173–177 |
| `pubmed_search_articles` | 1. Empty-result recovery (format) | blockquote in `format()`: `> ${result.notice}` | Same as above; rendered in `format()` | n/a (same field) | search-articles.tool.ts:371 |
| `pubmed_find_related` | 1. Empty-result recovery | `notice?: string` | `foundPmids.length === 0 && relationship === 'references'` → PMCID lookup to produce relationship-aware hint | Yes (`notice` on output schema) | find-related.tool.ts:99–101, 177–199 |
| `pubmed_find_related` | 1. Empty-result recovery (format) | blockquote in `format()`: `> ${result.notice}` | `result.notice` present | n/a (same field) | find-related.tool.ts:237 |
| `pubmed_lookup_mesh` | 1. Empty-result recovery | `notice?: string` | `ids.length === 0` after eSearch → suggests `pubmed_spell_check` or `pubmed_search_articles` | Yes (`notice` on output schema) | lookup-mesh.tool.ts:129–133, 159–164 |
| `pubmed_lookup_mesh` | 1. Empty-result recovery (format) | blockquote in `format()`: `> ${result.notice}` | `result.notice` present | n/a (same field) | lookup-mesh.tool.ts:185 |
| `pubmed_fetch_articles` | 1. Empty-result recovery (format-only) | Inline string in `format()`: `> No articles were returned…` | `result.totalReturned === 0` | No (not a typed output field) | fetch-articles.tool.ts:198–201 |
| `pubmed_format_citations` | 1. Empty-result recovery (format-only) | Inline string in `format()`: `> No articles were returned…` | `result.totalFormatted === 0` | No (not a typed output field) | format-citations.tool.ts:99–103 |
| `pubmed_search_articles` | 2. Did-you-mean | `notice?: string` (directs caller to `pubmed_spell_check`) | `totalFound === 0 && !hasFilters` — hint points to spell-check tool rather than embedding a correction | Yes (same `notice` field) | search-articles.tool.ts:42–44 |
| `pubmed_lookup_mesh` | 2. Did-you-mean | `notice?: string` (directs caller to `pubmed_spell_check`) | `ids.length === 0` | Yes (same `notice` field) | lookup-mesh.tool.ts:163 |
| `pubmed_spell_check` | 2. Did-you-mean | `{ original: string; corrected: string; hasSuggestion: boolean }` | Always — `hasSuggestion` gates whether the correction differs from original | Yes (full output schema) | spell-check.tool.ts:23–27 |
| `pubmed_lookup_citation` | 3. Next-step pointers | `format()` only — per-status `**Next Step:**` string rendered in Markdown | `status === 'matched'` (with/without mismatch), `'ambiguous'`, `'not_found'` | No (not a typed output field) | lookup-citation.tool.ts:284–307 |
| `pubmed_lookup_citation` | 3. Next-step pointers (candidatePmids guidance) | `candidatePmids?: string[]` with `.describe(…Add more bibliographic fields and retry…or fetch each candidate via pubmed_fetch_articles…)` | `status === 'ambiguous'` | Yes (schema description only; no separate typed pointer field) | lookup-citation.tool.ts:93–96 |
| `pubmed_convert_ids` | 3. Next-step pointers (errmsg rewrite) | `errmsg?: string` — PMC-not-found error rewritten to mention `pubmed_fetch_articles` / `pubmed_search_articles` | `PMC_NOT_FOUND_RE` matches NCBI error string | Yes (`errmsg` on record schema) | convert-ids.tool.ts:16–18, 83–90 |
| `pubmed_fetch_articles` | 3. Next-step pointers (format-only) | Inline string: `Try \`pubmed_search_articles\` to discover valid PMIDs` | `totalReturned === 0` | No | fetch-articles.tool.ts:200 |
| `pubmed_format_citations` | 3. Next-step pointers (format-only) | Inline string: `Try \`pubmed_search_articles\`…or \`pubmed_spell_check\`…` | `totalFormatted === 0` | No | format-citations.tool.ts:101–103 |
| `pubmed_fetch_fulltext` | 4. Auto-resolution | Handler-side: PMID → PMC ID Converter → PMCID (for PMC path) or DOI (for Unpaywall fallback). Secondary DOI fetch from PubMed `eFetch` when converter returns no DOI. | `input.pmids` provided (vs `input.pmcids` direct path) | No (transparent; `source` discriminant reveals which path was taken) | fetch-fulltext.tool.ts:271–293, 356–365 |
| `pubmed_search_articles` | 4. Auto-resolution (normalization) | Date separator normalization: `input.dateRange.minDate.trim().replace(/[-.]/g, '/')` before building effective query | `dateRange.minDate` / `.maxDate` present | No (typed `effectiveQuery` reflects normalized form) | search-articles.tool.ts:193–195 |
| `pubmed_search_articles` | 4. Auto-resolution (sanitization) | `sanitization.sanitizeString(input.query, { context: 'text' })` applied to query and all filter strings | Always | No | search-articles.tool.ts:184 |
| `pubmed_fetch_articles` | 5. Partial-success envelopes | `{ articles: FetchedArticleSchema[]; totalReturned: number; unavailablePmids?: string[] }` | `unavailablePmids` populated when requested PMIDs absent from NCBI response | Yes (`unavailablePmids?: z.array(z.string())`) | fetch-articles.tool.ts:139–143, 179–189 |
| `pubmed_fetch_fulltext` | 5. Partial-success envelopes | `{ articles: ArticleSchema[]; totalReturned: number; unavailable?: UnavailableSchema[]; unavailablePmcIds?: string[] }` | `unavailable` per-PMID with typed `reason` enum; `unavailablePmcIds` for PMC-level misses | Yes (all fields on output schema) | fetch-fulltext.tool.ts:246–258 |
| `pubmed_format_citations` | 5. Partial-success envelopes | `{ citations: …[]; totalSubmitted: number; totalFormatted: number; unavailablePmids?: string[] }` | `unavailablePmids` when NCBI returns no record for a PMID | Yes (`unavailablePmids?: z.array(z.string())`) | format-citations.tool.ts:52–56, 80–87 |
| `pubmed_convert_ids` | 5. Partial-success envelopes | `{ records: RecordSchema[]; totalConverted: number; totalSubmitted: number }` — per-record `errmsg?: string` is the failure signal | Always; `errmsg` present on failure records | Yes (all fields typed) | convert-ids.tool.ts:43–68 |
| `pubmed_lookup_citation` | 5. Partial-success envelopes | `{ results: ResultSchema[]; totalMatched: number; totalSubmitted: number; totalWarnings: number }` — per-result `status: 'matched' | 'not_found' | 'ambiguous'` | Always | Yes (all fields typed) | lookup-citation.tool.ts:76–127 |
| `pubmed_lookup_citation` | 7. Warnings | `warnings?: Array<{ code: 'author_mismatch' | 'year_mismatch'; message: string }>` | Author surname not in matched article's author list; queried year ≠ matched article year | Yes (typed discriminated enum on `code`) | lookup-citation.tool.ts:106–117 |
| `pubmed_lookup_citation` | 7. Warnings (aggregate count) | `totalWarnings: number` | Always (0 when none) | Yes | lookup-citation.tool.ts:124–127 |
| `pubmed_lookup_citation` | 7. Warnings (format) | `format()` renders `[author_mismatch]` / `[year_mismatch]` labels with message | `r.warnings?.length` | n/a (same data) | lookup-citation.tool.ts:277–282 |
| `pubmed_find_related` | 8. Recovery on errors | `elink_error` contract entry with `code: ServiceUnavailable` and structured `data: { pmid, relationship, ncbiError }` | NCBI ELink `<ERROR>` payload in XML | Yes (typed error contract via `errors:` array) | find-related.tool.ts:53–60, 140–145 |
| `pubmed_convert_ids` | 8. Recovery on errors | `errmsg?: string` rewrite: `PMC_NOT_FOUND_RE` → actionable recovery string (mentions alternate tools) | `r.errmsg` matches `/^identifier not found in pmc$/i` | Yes (`errmsg` on record schema) | convert-ids.tool.ts:83–91 |

## Tool inventory

- `pubmed_search_articles` — full-syntax PubMed search with filters, pagination, and optional brief summaries
- `pubmed_find_related` — ELink-based related-article discovery (similar/cited_by/references)
- `pubmed_lookup_mesh` — MeSH controlled vocabulary search with descriptor details
- `pubmed_convert_ids` — batch DOI/PMID/PMCID conversion via NCBI PMC ID Converter
- `pubmed_fetch_articles` — fetch full article metadata by PMID (abstract, authors, MeSH, grants)
- `pubmed_lookup_citation` — ECitMatch citation-to-PMID resolution with author/year mismatch detection
- `pubmed_spell_check` — NCBI ESpell query correction
- `pubmed_fetch_fulltext` — PMC JATS full text with transparent Unpaywall fallback for non-PMC articles
- `pubmed_format_citations` — generate APA/MLA/BibTeX/RIS citations from PMIDs

No tools are entirely without patterns; every tool surfaces at least one helpfulness mechanism.

## Idiosyncratic patterns

**1. Relationship-aware empty-result notice with secondary API call (`pubmed_find_related`)**

When `relationship === 'references'` and no results return, the handler fires a secondary `eSummary` call on the *source* PMID to determine whether it has a PMCID. The resulting `notice` is conditioned on that lookup: if PMCID exists, the message notes "No reference list found in PMC for PMID X (PMCID Y)"; if not, it explains the PMC indexing requirement and names three alternate tools by name. This is the only tool that makes an extra network round-trip to produce a more precise recovery hint rather than a generic message.

```ts
// find-related.tool.ts:177–199
if (input.relationship === 'references') {
  try {
    const summaryResult = await ncbi.eSummary(
      { db: 'pubmed', id: input.pmid },
      { signal: ctx.signal },
    );
    const summaries = await extractBriefSummaries(summaryResult);
    const sourcePmcId = summaries[0]?.pmcId;
    notice = sourcePmcId
      ? `No reference list found in PMC for PMID ${input.pmid} (PMCID ${sourcePmcId}).`
      : `Reference lists require the source article to be indexed in PMC. PMID ${input.pmid} has no PMCID — references unavailable. Use pubmed_fetch_articles to inspect the article record, or try relationship: "similar" / "cited_by".`;
  } catch (err) {
    ctx.log.debug('Failed to look up source PMCID for references hint', { err });
  }
}
```

**2. `buildNotice()` extracted as a named function (`pubmed_search_articles`)**

Search is the only tool where the notice-building logic is extracted into a standalone module-level function rather than inlined. The function takes `{ totalFound, pmidCount, offset, hasFilters }` and covers three distinct branches (zero results + filters, zero results without filters, pagination overshoot). This makes the branching logic inspectable in isolation.

```ts
// search-articles.tool.ts:32–48
function buildNotice(args: {
  totalFound: number;
  pmidCount: number;
  offset: number;
  hasFilters: boolean;
}): string | undefined {
  const { totalFound, pmidCount, offset, hasFilters } = args;
  if (totalFound === 0) {
    return hasFilters
      ? 'No results matched your query with the applied filters. Try removing filters…'
      : 'No results matched your query. Try running pubmed_spell_check…';
  }
  if (pmidCount === 0 && offset > 0 && offset >= totalFound) {
    return `Offset ${offset} exceeds totalFound (${totalFound}). Reset offset to 0…`;
  }
  return;
}
```

**3. Discriminated union on `source` for structural reliability signaling (`pubmed_fetch_fulltext`)**

The output schema uses `z.discriminatedUnion('source', [PmcArticleSchema, UnpaywallArticleSchema])`. The discriminant isn't just routing sugar — it's a reliability signal: `pmc` guarantees structured JATS sections and an optional reference list; `unpaywall` has `contentFormat: 'html-markdown' | 'pdf-text'` and explicitly documents that section structure is not guaranteed. The `format()` function renders a `> Section structure is not guaranteed…` callout only for `unpaywall` articles.

```ts
// fetch-fulltext.tool.ts:159–163
const ArticleSchema = z
  .discriminatedUnion('source', [PmcArticleSchema, UnpaywallArticleSchema])
  .describe(
    'Full-text article; shape depends on `source` (pmc = structured, unpaywall = best-effort)',
  );
```

**4. Typed `reason` enum on `UnavailableSchema` (`pubmed_fetch_fulltext`)**

The `unavailable` array uses a typed `reason` enum covering six distinct failure modes rather than a free-form message. This allows callers to branch programmatically on the failure cause.

```ts
// fetch-fulltext.tool.ts:166–176
const UnavailableReasonSchema = z
  .enum([
    'no-pmc-fallback-disabled',
    'no-doi',
    'no-oa',
    'fetch-failed',
    'parse-failed',
    'service-error',
  ])
  .describe(`Why the PMID has no full text. no-pmc-fallback-disabled: not in PMC and UNPAYWALL_EMAIL is unset…`);
```

**5. `matchedFirstAuthor` eyeball-signal field (`pubmed_lookup_citation`)**

A `matchedFirstAuthor?: string` field is populated from eSummary data on every matched result. It's explicitly described as "useful eyeball signal for verifying a match" — distinct from the `warnings` mechanism, it's proactive surfacing of a human-verifiable data point rather than a computed check.

```ts
// lookup-citation.tool.ts:97–100
matchedFirstAuthor: z
  .string()
  .optional()
  .describe(
    'First author of the matched article (e.g., "Husain M"). Useful eyeball signal for verifying a match.',
  ),
```

**6. Per-status `**Next Step:**` in `format()` only (`pubmed_lookup_citation`)**

The `format()` function renders a `**Next Step:**` line for every result, with the content conditioned on `status` and whether `warnings` are present. This is not a typed output field — it's purely a `format()` presentational affordance. Three distinct branches: matched+warnings (confirm before citing), matched+clean (ready for downstream), ambiguous (add fields or fetch candidates), not_found (verify or search).

```ts
// lookup-citation.tool.ts:284–307
if (r.status === 'matched') {
  const mismatches = r.warnings?.map((w) => w.code) ?? [];
  const hasMismatch = mismatches.length > 0;
  lines.push(`**Status:** Matched`);
  lines.push(
    hasMismatch
      ? `**Next Step:** ${mismatches.join(' + ')} detected — confirm this PMID…`
      : `**Next Step:** PMID is ready for downstream PubMed fetch or citation tools.`,
  );
  continue;
}
if (r.status === 'ambiguous') {
  lines.push(`**Status:** Ambiguous`);
  lines.push(
    r.candidatePmids?.length
      ? `**Next Step:** Add more citation fields to disambiguate, or fetch the candidate PMIDs above via pubmed_fetch_articles…`
      : `**Next Step:** Add more citation fields such as journal, year, volume, firstPage, or authorName, then retry.`,
  );
  continue;
}
lines.push(`**Status:** No match`);
lines.push(`**Next Step:** Verify the citation details or try pubmed_search_articles.`);
```

## Adoption gaps

- **`pubmed_find_related`** — `notice` is only populated for `relationship === 'references'` with zero results. For `cited_by` and `similar` with zero results, the output is a bare `{ articles: [], totalFound: 0 }` with no guidance. A newly-published article with no citers and an article with no computed neighbors both look identical to a misconfigured call.

- **`pubmed_spell_check`** — The tool returns `hasSuggestion: boolean` but provides no guidance in the `false` case for what to do if the query is "correct as written" but still returns zero results elsewhere. The `format()` message says "appears correct as written" with no next-step pointer. Callers coming here as a recovery step from a failed search get confirmation but no forward path.

- **`pubmed_lookup_mesh`** — `notice` is only populated on zero results. A partial result (some matches but none matching the exact queried term) carries no signal — the handler does sort exact matches to the top but emits no notice that only approximate matches were found. A queried term that has near-matches but no exact descriptor could mislead.

## Concrete shape excerpts

**`notice?: string` (empty-result recovery — canonical form, three tools)**

```ts
// search-articles.tool.ts:173–177
notice: z
  .string()
  .optional()
  .describe(
    'Optional guidance when results are empty or paging overshot — e.g. how to broaden filters or reset offset. Absent on successful result pages.',
  ),
```

```ts
// find-related.tool.ts:97–101
notice: z
  .string()
  .optional()
  .describe(
    'Optional guidance when results are empty due to a known limitation — e.g. references for a non-PMC source. Absent on successful result pages.',
  ),
```

```ts
// lookup-mesh.tool.ts:128–133
notice: z
  .string()
  .optional()
  .describe(
    'Optional guidance when no descriptors matched — suggests spell-check or free-text search. Absent on successful results.',
  ),
```

**`pubmed_spell_check` did-you-mean output (only tool with a dedicated correction field)**

```ts
// spell-check.tool.ts:23–27
output: z.object({
  original: z.string().describe('Original query'),
  corrected: z.string().describe('Corrected query (same as original if no suggestion)'),
  hasSuggestion: z.boolean().describe('Whether NCBI suggested a correction'),
}),
```

**`pubmed_lookup_citation` warnings (typed discriminated code)**

```ts
// lookup-citation.tool.ts:106–117
warnings: z
  .array(
    z
      .object({
        code: z
          .enum(['author_mismatch', 'year_mismatch'])
          .describe('Machine-readable warning code'),
        message: z.string().describe('Human-readable description of the warning'),
      })
      .describe('Non-fatal warning about the match'),
  )
  .optional()
  .describe(
    'Non-fatal warnings about this match. A PMID may be returned even when the queried author or year disagrees with the matched article — verify before treating the PMID as authoritative.',
  ),
```

**`pubmed_fetch_articles` / `pubmed_format_citations` partial-success envelope (shared pattern)**

```ts
// fetch-articles.tool.ts:139–143
unavailablePmids: z
  .array(z.string())
  .optional()
  .describe('PMIDs that returned no article data'),

// format-citations.tool.ts:52–56
unavailablePmids: z
  .array(z.string())
  .optional()
  .describe('Requested PMIDs that did not return article metadata'),
```

**`pubmed_fetch_fulltext` typed reason enum (most granular failure surface)**

```ts
// fetch-fulltext.tool.ts:166–176
const UnavailableReasonSchema = z
  .enum([
    'no-pmc-fallback-disabled',
    'no-doi',
    'no-oa',
    'fetch-failed',
    'parse-failed',
    'service-error',
  ])
  .describe(
    `Why the PMID has no full text. no-pmc-fallback-disabled: not in PMC and UNPAYWALL_EMAIL is unset so the Unpaywall fallback is off. no-doi: not in PMC and the ID Converter returned no DOI to try Unpaywall with. no-oa: DOI exists but Unpaywall has no open-access copy indexed. fetch-failed: OA location found but the content could not be downloaded. parse-failed: content was downloaded but text extraction produced nothing usable. service-error: Unpaywall or an upstream host returned a server error.`,
  );
```

**`pubmed_convert_ids` errmsg rewrite (recovery hint in failure field)**

```ts
// convert-ids.tool.ts:13–18
const PMC_NOT_FOUND_RE = /^identifier not found in pmc$/i;
const PMC_NOT_FOUND_REWRITE =
  'Not in PMC ID Converter. Article may still exist in PubMed — try pubmed_fetch_articles (PMID → DOI) or pubmed_search_articles.';
```

```ts
// convert-ids.tool.ts:56–60
errmsg: z
  .string()
  .optional()
  .describe(
    'Error message if conversion failed. Presence of `errmsg` is the failure signal; absence means the conversion succeeded.',
  ),
```
