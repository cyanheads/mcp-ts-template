# secedgar-mcp-server — helpfulness pattern audit

**Surveyed:** 2026-04-28
**Source:** src/mcp-server/tools/definitions/
**Tool count:** 6

## Pattern matrix

| Tool | Pattern | Field shape | Trigger | Typed in output schema? | Source ref |
|:-----|:--------|:------------|:--------|:------------------------|:-----------|
| `secedgar_company_search` | 4. Auto-resolution | handler calls `api.resolveCik(input.query)` accepting ticker, name, or CIK string; normalizes to padded CIK | always — every call | No (implementation detail, not surfaced in output) | company-search.tool.ts:85 |
| `secedgar_company_search` | 2. Did-you-mean | `throw notFound(\`Multiple matches for '${input.query}': ${matches}. Specify a ticker for an exact match.\`)` — error message embeds candidate list as `ticker (name)` pairs | `resolved.length > 1` (name search returns multiple fuzzy hits) | No — lives in error message string only | company-search.tool.ts:94–99 |
| `secedgar_compare_metric` | 4. Auto-resolution | `resolveConcept(input.concept)` maps friendly name → XBRL tag + taxonomy + unit; falls back to raw input if no mapping | always | No | compare-metric.tool.ts:70–74 |
| `secedgar_compare_metric` | 1. Empty-result recovery | `throw notFound(hint)` where `hint` branches on `!mapping` (unknown concept) vs. valid concept with no data for period | `framesResponse === null` (API 404) | No — lives in error message string only | compare-metric.tool.ts:79–83 |
| `secedgar_get_financials` | 4. Auto-resolution | `api.resolveCik(input.company)` + `resolveConcept(input.concept)` resolves to ordered tag list; tries each tag in sequence via `tryGetCompanyConcept` until one returns data | always | No | get-financials.tool.ts:77–123 |
| `secedgar_get_financials` | 7. Warnings | `tags_tried?: string[]` — XBRL tags attempted when friendly name maps to multiple tags | `tagsTried.length > 1` (multi-tag concepts only) | Yes — `tags_tried: z.array(z.string()).optional()` | get-financials.tool.ts:203–206, output schema line 68–71 |
| `secedgar_get_financials` | 1. Empty-result recovery (no data) | `throw notFound(\`No XBRL data for '${input.concept}' under ${taxonomy} for this company. ${hint}\`)` — hint branches on `taxonomy === 'ifrs-full'` | `conceptResponse === undefined \|\| allUnits.length === 0` | No — lives in error message string only | get-financials.tool.ts:126–133 |
| `secedgar_get_financials` | 1. Empty-result recovery (no frame alignment) | `throw notFound(\`'${conceptResponse.tag}' exists for this company but has no standard-period data. ... Try a related concept.\`)` | `deduped.length === 0` after frame filter | No — lives in error message string only | get-financials.tool.ts:139–144 |
| `secedgar_get_financials` | 1. Empty-result recovery (period_type mismatch) | `throw notFound(\`No ${input.period_type} data for '${conceptResponse.tag}'. ${hint}\`)` — hint branches on instant-frame detection (`/I$/.test(sample.frame)`) and current `period_type` to suggest the corrective value | `filtered.length === 0 && byFrame.size > 0` | No — lives in error message string only | get-financials.tool.ts:163–172 |
| `secedgar_search_filings` | 4. Auto-resolution | `resolveEntityTargeting(query)` parses `ticker:X` or `cik:X` tokens in free-text query, resolves to company name (substituted back into query text) + CIK (used for post-filter); normalizes CIK padding | always (no-op when tokens absent) | No | search-filings.tool.ts:27–65, 150 |
| `secedgar_search_filings` | 3. Next-step pointers | `form_distribution?: Record<string, number>` — count of results by form type, explicitly described as "Helps narrow follow-up searches" | when `response.aggregations?.form_filter?.buckets` is present (most searches) | Yes — `form_distribution: z.record(z.string(), z.number()).optional()` | search-filings.tool.ts:138–141, 198–204 |
| `secedgar_search_filings` | 7. Warnings | `total_is_exact: boolean` — false when result count hits EDGAR's 10,000-result cap | always | Yes — `total_is_exact: z.boolean()` | search-filings.tool.ts:117–118 |
| `secedgar_search_concepts` | 1. Empty-result recovery | `format()` returns `'No concepts matched. Try a broader search, different group, or call with no filters to see the full catalog.'` | `result.total === 0` in `format()` | No — format()-only; output schema has no hint/notice field | search-concepts.tool.ts:113–119 |
| `secedgar_get_filing` | 4. Auto-resolution | `normalizeAccessionNumber()` accepts both dash (`0000320193-23-000106`) and no-dash (`000032019323000106`) formats, normalizes to dash; `resolveCandidateCiks()` infers CIK from accession prefix when not provided | always | No | get-filing.tool.ts:168–176, 227–241 |
| `secedgar_get_filing` | 8. Recovery on errors | `throw notFound(\`Document '${requestedDocument}' not found in this filing. Available documents: ${list}. Use one of these names.\`)` — enumerates valid document names inline in the error | `requestedDocument` not found in archive index | No — lives in error message string only | get-filing.tool.ts:204–208 |
| `secedgar_get_filing` | 8. Recovery on errors | `throw notFound(\`Filing '${accessionNumber}' not found. Verify the accession number or provide the company CIK explicitly.\`)` | CIK resolution failed and no index found | No — lives in error message string only | get-filing.tool.ts:222–225 |
| `secedgar_get_filing` | 7. Warnings | `content_truncated: boolean` + `content_total_length: number` — signals that document text was cut at `content_limit` | always | Yes — both fields typed in output schema | get-filing.tool.ts:81–83 |

## Tool inventory

- `secedgar_company_search` — find companies by ticker, name, or CIK; returns entity info and recent filings. Entry point for most workflows.
- `secedgar_compare_metric` — rank all reporting companies by a financial metric for a given calendar period.
- `secedgar_get_financials` — historical XBRL time series for a single company's financial concept.
- `secedgar_search_filings` — full-text search across EDGAR filing documents since 1993.
- `secedgar_search_concepts` — discover friendly concept names accepted by `get_financials` and `compare_metric`; reverse-lookup XBRL tags.
- `secedgar_get_filing` — fetch metadata and document text for a specific filing by accession number.

All 6 tools appear in the matrix; none are `[no patterns]`.

## Idiosyncratic patterns

**Multi-tag sequential fallback (`get-financials`):** The handler iterates through an ordered list of XBRL tags and aggregates units from all successful responses, merging data across historical naming changes (e.g., pre- vs. post-ASC 606 revenue tags). This is more than "try the first that works" — it intentionally collects from multiple tags and deduplicates by frame. The `tags_tried` output field is the only typed signal of this behavior.

```ts
// get-financials.tool.ts:108–123
for (const tag of tags) {
  tagsTried.push(tag);
  const resp = await api.tryGetCompanyConcept(match.cik, taxonomy, tag);
  if (!resp) continue;
  if (!conceptResponse) {
    conceptResponse = { units: resp.units, label: resp.label, description: resp.description ?? undefined, tag: resp.tag };
  }
  for (const units of Object.values(resp.units)) {
    allUnits.push(...units);
  }
}
```

**Entity-targeting syntax in free-text query (`search-filings`):** Users embed `ticker:AAPL` or `cik:320193` tokens inside the full-text query string rather than as separate input parameters. The handler parses these tokens, resolves them to entity metadata, rewrites the query (substituting company name as a quoted phrase), and uses the CIK for a separate post-filter pass. This is a hybrid auto-resolution + query rewriting pattern with no analogue in the other 5 tools.

```ts
// search-filings.tool.ts:27–65 (resolveEntityTargeting)
const tickerMatch = query.match(/\bticker:(\S+)/i);
const cikMatch = query.match(/\bcik:(\S+)/i);
// ...resolves → { query: rewritten query, entityCik: padded CIK }
```

**`total_is_exact` cap sentinel (`search-filings`):** EDGAR's full-text search index caps accessible results at 10,000. The `total_is_exact: boolean` field (always present, typed) signals whether the returned `total` count reflects the actual match count or the cap. This is a domain-specific data-fidelity warning, not a standard operational warning.

```ts
// search-filings.tool.ts:117–118
total_is_exact: z.boolean().describe('False when total hits the 10,000 cap.'),
```

**Instant-frame period detection in error hint (`get-financials`):** When a period_type filter removes all results, the handler inspects the frame string of the first surviving unfiltered entry to detect whether the concept is an instant-type (balance sheet) item (`/I$/.test(sample.frame)`). This drives a more specific hint than a generic "try another period_type."

```ts
// get-financials.tool.ts:163–172
if (filtered.length === 0 && byFrame.size > 0) {
  const sample = byFrame.values().next().value;
  const hasInstant = sample && /I$/.test(sample.frame);
  const hint = hasInstant
    ? 'This is a balance sheet (instant) item — try period_type: "quarterly" or "all".'
    : input.period_type === 'annual'
      ? 'No annual data found — try period_type: "quarterly" or "all".'
      : 'No quarterly data found — try period_type: "annual" or "all".';
  throw notFound(`No ${input.period_type} data for '${conceptResponse.tag}'. ${hint}`);
}
```

## Adoption gaps

- **`secedgar_search_concepts` — no typed empty-result field.** The empty-result hint (`'No concepts matched. Try a broader search...'`) exists only in `format()`. Since this tool is explicitly a discovery tool used before other tools, an `hint?: string` or `suggestion?: string` on the output schema would make the recovery guidance available to `structuredContent`-only clients.

- **`secedgar_compare_metric` — no typed next-step pointer.** When a metric returns data, there's no structured pointer toward `secedgar_get_filing` (to fetch the source filing for any ranked entry), even though every data row includes an `accession_number` field explicitly described as "Source filing for secedgar_get_filing." A `next_steps` or `related_tools` field would make the workflow connection explicit for content[]-only consumers.

- **`secedgar_company_search` — did-you-mean candidates are error-only.** When multiple fuzzy matches are found, the candidate list is serialized into the `notFound` error message string. A partial-success envelope (e.g., returning a `candidates` array when ambiguous rather than throwing) would let callers programmatically handle disambiguation, but this is a design choice (fail-fast) not an oversight.

## Concrete shape excerpts

**`tags_tried?: string[]` — typed warning field (get-financials output schema)**
```ts
// get-financials.tool.ts:68–71
tags_tried: z
  .array(z.string())
  .optional()
  .describe(
    'XBRL tags that were attempted (shown when using friendly names that map to multiple tags).',
  ),
```

**`form_distribution?: Record<string, number>` — typed next-step pointer (search-filings output schema)**
```ts
// search-filings.tool.ts:138–141
form_distribution: z
  .record(z.string(), z.number())
  .optional()
  .describe('Count of results by form type. Helps narrow follow-up searches.'),
```

**`total_is_exact: boolean` — typed data-fidelity warning (search-filings output schema)**
```ts
// search-filings.tool.ts:117–118
total_is_exact: z.boolean().describe('False when total hits the 10,000 cap.'),
```

**`content_truncated: boolean` + `content_total_length: number` — typed truncation warnings (get-filing output schema)**
```ts
// get-filing.tool.ts:81–83
content_truncated: z.boolean().describe('True if content was truncated.'),
content_total_length: z.number().describe('Full document length before truncation.'),
```

**Branched error hint in `compare-metric` (error message string, not typed)**
```ts
// compare-metric.tool.ts:79–83
const hint = !mapping
  ? `Unknown concept '${input.concept}'. Use a friendly name (e.g., "revenue", "assets") or a valid XBRL tag.`
  : `No data for ${label}/${unit}/${input.period}. Check: duration vs. instant period (add "I" for balance sheet items), correct unit (USD-per-shares for EPS), and period exists (data starts ~CY2009).`;
throw notFound(hint);
```

**`format()`-only empty-result hint in `search-concepts` (not typed)**
```ts
// search-concepts.tool.ts:113–119
format: (result) => {
  if (result.total === 0) {
    return [{ type: 'text', text: 'No concepts matched. Try a broader search, different group, or call with no filters to see the full catalog.' }];
  }
  // ...
```

**`resolveEntityTargeting` — query token rewriting (search-filings handler)**
```ts
// search-filings.tool.ts:34–46
if (tickerMatch?.[1]) {
  const token = tickerMatch[0];
  const ticker = tickerMatch[1];
  const resolved = await api.resolveCik(ticker);
  const match = Array.isArray(resolved) ? resolved[0] : resolved;
  if (match?.name) {
    return {
      query: query.replace(token, `"${match.name}"`).trim(),
      entityCik: match.cik,
    };
  }
  return { query: query.replace(token, '').trim() };
}
```

**Document-list enumeration in notFound error (get-filing handler)**
```ts
// get-filing.tool.ts:204–208
throw notFound(
  `Document '${requestedDocument}' not found in this filing. Available documents: ${lastIndexedItems.map((item) => item.name).join(', ')}. Use one of these names.`,
);
```
