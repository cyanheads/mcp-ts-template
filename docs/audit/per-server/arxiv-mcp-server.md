# arxiv-mcp-server — helpfulness pattern audit

**Surveyed:** 2026-04-28
**Source:** src/mcp-server/tools/definitions/
**Tool count:** 4

## Pattern matrix

| Tool | Pattern | Field shape | Trigger | Typed in output schema? | Source ref |
|:-----|:--------|:------------|:--------|:------------------------|:-----------|
| `arxiv_search` | 1. Empty-result recovery | `format()`-only: plain text string `'No papers found. Try broader search terms, remove field prefixes (ti:, au:), or check category codes with arxiv_list_categories.'` | `result.papers.length === 0 && !(result.total_results > 0 && result.start >= result.total_results)` | No — format() only; output schema has no hint field | `arxiv-search.tool.ts:116-119` |
| `arxiv_search` | 1. Empty-result recovery (pagination overrun) | `format()`-only: string naming last valid `start` offset: `'Offset ${start} exceeds total results (${total}). Last valid page starts at ${lastValidStart}.'` | `result.papers.length === 0 && result.total_results > 0 && result.start >= result.total_results` | No — format() only | `arxiv-search.tool.ts:104-111` |
| `arxiv_search` | 2. Did-you-mean (invalid category) | Thrown error message: `"Unknown arXiv category '${category}'. Did you mean: ${suggestions.join(', ')}?"` + `error.data.suggestions: string[]` | `options.category` is set and not in `VALID_CATEGORY_CODES`; suggestions populated from `suggestCategories()` | Partially — `suggestions: string[]` in the thrown error's `data` object (not in the success output schema) | `arxiv-service.ts:176-184` |
| `arxiv_search` | 3. Next-step pointers | `format()`-only: inline text `'check category codes with arxiv_list_categories'` in the empty-result hint | `result.papers.length === 0` (non-pagination case) | No — format() only | `arxiv-search.tool.ts:117` |
| `arxiv_search` | 4. Auto-resolution (query normalization) | Input schema: `.trim()` on the `query` field; arXiv category injected into query string as `(${query}) AND cat:${category}` before API call | Always — `.trim()` is a Zod transform; category wrapping is always applied when category is present | Yes for `.trim()` (Zod schema); No for the category-wrapping rewrite (service-internal) | `arxiv-search.tool.ts:17` (trim), `arxiv-service.ts:193` (rewrite) |
| `arxiv_get_metadata` | 5. Partial-success envelope | `{ papers: PaperMetadata[]; not_found?: string[] }` — `papers` holds found results, `not_found` lists IDs with no API response | `not_found` populated when `ids.filter(id => !foundBaseIds.has(stripVersion(id)))` is non-empty; only present on the result when non-empty | Yes — `not_found: z.array(z.string()).optional()` in output schema | `arxiv-get-metadata.tool.ts:38-39`, `arxiv-service.ts:224-229` |
| `arxiv_get_metadata` | 4. Auto-resolution (ID version stripping) | `stripVersion(id)` removes trailing `v\d+` before cross-referencing returned IDs against requested IDs, so `2401.12345` and `2401.12345v2` are treated as the same paper in not-found detection | Always — applied to both requested IDs and returned IDs during cross-reference | No — transparent normalization; not exposed in schema or output | `arxiv-service.ts:144-146`, `arxiv-service.ts:224` |
| `arxiv_get_metadata` | 8. Recovery on errors (all-miss path) | Thrown `notFound` error message: `"No papers found for the given IDs. Verify ID format (e.g., '2401.12345' or '2401.12345v2')."` + `error.data.ids: string[]` | `result.papers.length === 0` after service call | No — thrown error, not typed in success output schema | `arxiv-get-metadata.tool.ts:46-51` |
| `arxiv_read_paper` | 7. Warnings (truncation notice) | Typed output field `truncated: boolean` + typed field `body_characters: number`; `format()` renders `[Truncated: showing X of Y body characters]` when `truncated` is true | `bodyCharacters > maxCharacters` | Yes — `truncated: z.boolean()`, `body_characters: z.number()`, `total_characters: z.number()` | `arxiv-read-paper.tool.ts:34-43`, `arxiv-read-paper.tool.ts:68-72` |
| `arxiv_read_paper` | 4. Auto-resolution (HTML source fallback) | Service tries `arxiv.org/html/${baseId}` first; on 404/4xx silently falls back to `ar5iv.labs.arxiv.org/html/${baseId}`; resolved `source` field in output reports which was used | Always attempted; fallback triggered on non-OK, non-5xx response from primary | Yes — `source: z.enum(['arxiv_html', 'ar5iv'])` in output schema | `arxiv-read-paper.tool.ts:33-35`, `arxiv-service.ts:341-383` |
| `arxiv_read_paper` | 4. Auto-resolution (version stripping for HTML fetch) | `stripVersion(paperId)` called before constructing HTML URL, so versioned IDs like `2401.12345v2` resolve to `arxiv.org/html/2401.12345` | Always, when `paper_id` contains a version suffix | No — transparent; not reflected in output | `arxiv-service.ts:346` |
| `arxiv_read_paper` | 8. Recovery on errors (paper not found) | Thrown `notFound` message: `"Paper '${paperId}' not found. Verify the ID format (e.g., '2401.12345' or '2401.12345v2')."` | `lookup.papers` is empty after metadata fetch | No — thrown error | `arxiv-service.ts:242-245` |
| `arxiv_read_paper` | 8. Recovery on errors (no HTML available) | Thrown `notFound` message: `"HTML content not available for paper '${paperId}'. The PDF is available at https://arxiv.org/pdf/${baseId}"` — includes a working fallback URL | Both `arxiv.org/html` and `ar5iv` return non-OK responses | No — thrown error message only | `arxiv-service.ts:385-388` |
| `arxiv_list_categories` | — | — | — | — | (no patterns) |

## Tool inventory

- `arxiv_search` — Search arXiv papers by query string with optional category filter, sort, and pagination.
- `arxiv_list_categories` — Return the static arXiv category taxonomy, optionally filtered by top-level group. [no patterns]
- `arxiv_read_paper` — Fetch full HTML body of a paper by ID with automatic source fallback and configurable truncation.
- `arxiv_get_metadata` — Batch metadata lookup by arXiv ID(s); returns found papers and a typed `not_found` list.

## Idiosyncratic patterns

**Category suggestion via Levenshtein + prefix matching (`suggestCategories`)**

When an invalid category code is supplied to `arxiv_search`, the service calls `suggestCategories(code, limit=5)` before throwing. The function first tries prefix-based filtering (codes whose lowercased form starts with the input's archive prefix, e.g., `"cs"` for `"cs.INVALID"`); if no prefix match, it falls back to full Levenshtein edit distance over all ~155 category codes. Suggestions are appended to the error message and also placed in `error.data.suggestions`.

```ts
// arxiv-service.ts:176-184
if (options.category && !VALID_CATEGORY_CODES.has(options.category)) {
  const suggestions = suggestCategories(options.category);
  const hint =
    suggestions.length > 0
      ? ` Did you mean: ${suggestions.join(', ')}?`
      : ' Use arxiv_list_categories to list valid codes.';
  throw validationError(`Unknown arXiv category '${options.category}'.${hint}`, {
    category: options.category,
    suggestions,
  });
}
```

**Pagination overrun distinguished from genuine no-results**

`arxiv_search`'s `format()` branches on `total_results > 0 && start >= total_results` to distinguish "you paged past the end" from "query returned nothing." The overrun branch reports the last valid `start` value; the genuine-empty branch gives search-broadening advice. Neither branch surfaces as a typed field — both are `format()`-only strings.

```ts
// arxiv-search.tool.ts:102-119
if (result.papers.length === 0) {
  if (result.total_results > 0 && result.start >= result.total_results) {
    const lastValidStart = Math.max(0, result.total_results - 1);
    return [{ type: 'text', text: `Offset ${result.start} exceeds total results (${result.total_results}). Last valid page starts at ${lastValidStart}.` }];
  }
  return [{ type: 'text', text: 'No papers found. Try broader search terms, remove field prefixes (ti:, au:), or check category codes with arxiv_list_categories.' }];
}
```

**HTML character accounting: two distinct counts**

`arxiv_read_paper` exposes two character counts in its typed output: `total_characters` (raw body HTML after stripping `<head>` and site chrome) and `body_characters` (after `stripLatexmlNoise()` removes LaTeXML class/id attributes). The latter is what `max_characters` trims against. Both appear in `format()`. The output schema comment explains the typical 3-4x ratio for math-heavy papers.

```ts
// arxiv-read-paper.tool.ts:36-43
truncated: z.boolean().describe('Whether content was truncated due to max_characters.'),
total_characters: z.number().describe('Character count of the original unprocessed HTML body.'),
body_characters: z.number().describe(
  'Character count of the cleaned body HTML — what fits into max_characters. Typically 3-4× smaller than total_characters for math-heavy papers.',
),
```

**`not_found` conditionality: omitted vs. empty array**

`arxiv_get_metadata` conditionally includes `not_found` only when it is non-empty (via spread: `...(notFoundIds.length > 0 ? { not_found: notFoundIds } : {})`). The output schema reflects this with `.optional()`. The `format()` gates on `result.not_found && result.not_found.length > 0` before rendering.

```ts
// arxiv-service.ts:226-230
return {
  papers: result.entries,
  ...(notFoundIds.length > 0 ? { not_found: notFoundIds } : {}),
};
```

## Adoption gaps

- **`arxiv_search` empty-result hints are `format()`-only.** The search tool's empty-result text (`'No papers found. Try broader search terms...'`) and pagination-overrun hint exist only in `format()`. Clients that consume `structuredContent` (e.g., Claude Code) receive `{ total_results: 0, start: N, papers: [] }` with no machine-readable hint. A typed field (e.g., `hint?: string` or `guidance?: string`) on the output schema would make the recovery text reachable by both client surfaces.

- **`arxiv_search` did-you-mean is error-path only.** Category suggestions surface via `validationError(..., { suggestions })` in `error.data` — a non-standard location that requires the client to inspect error data specifically. If suggestions were returned on the success path (e.g., as a `warnings` or `suggestions` field when category is provided but borderline), structured consumers could act on them without error handling.

- **`arxiv_read_paper` has no hint when both HTML sources fail.** The thrown `notFound` message does include a PDF URL, but it is a free-form string in the error message rather than a typed field (`pdf_url` exists on the success schema but isn't reachable on the error path). A typed `error.data.pdf_url` would let clients surface a clickable fallback without parsing the message string.

## Concrete shape excerpts

**1a. Empty-result recovery — `format()`-only string (genuine empty)**

```ts
// arxiv-search.tool.ts:113-118
return [
  {
    type: 'text' as const,
    text: 'No papers found. Try broader search terms, remove field prefixes (ti:, au:), or check category codes with arxiv_list_categories.',
  },
];
```

**1b. Empty-result recovery — `format()`-only string (pagination overrun)**

```ts
// arxiv-search.tool.ts:104-111
const lastValidStart = Math.max(0, result.total_results - 1);
return [
  {
    type: 'text' as const,
    text: `Offset ${result.start} exceeds total results (${result.total_results}). Last valid page starts at ${lastValidStart}.`,
  },
];
```

**2. Did-you-mean — error `data.suggestions: string[]`**

```ts
// arxiv-service.ts:176-184
const suggestions = suggestCategories(options.category);
const hint =
  suggestions.length > 0
    ? ` Did you mean: ${suggestions.join(', ')}?`
    : ' Use arxiv_list_categories to list valid codes.';
throw validationError(`Unknown arXiv category '${options.category}'.${hint}`, {
  category: options.category,
  suggestions,
});
```

**5. Partial-success envelope — Zod output schema**

```ts
// arxiv-get-metadata.tool.ts:34-39
output: z.object({
  papers: z
    .array(PaperMetadataSchema)
    .describe('Papers found. May be fewer than requested if some IDs are invalid.'),
  not_found: z.array(z.string()).optional().describe('Paper IDs that returned no results.'),
}),
```

**7. Truncation warning — typed output fields**

```ts
// arxiv-read-paper.tool.ts:33-43
source: z
  .enum(['arxiv_html', 'ar5iv'])
  .describe('Which HTML source the content was fetched from.'),
truncated: z.boolean().describe('Whether content was truncated due to max_characters.'),
total_characters: z.number().describe('Character count of the original unprocessed HTML body.'),
body_characters: z.number().describe(
  'Character count of the cleaned body HTML — what fits into max_characters. Typically 3-4× smaller than total_characters for math-heavy papers.',
),
```

**8a. Recovery on errors — `notFound` message with format hint (no HTML)**

```ts
// arxiv-service.ts:385-388
throw notFound(
  `HTML content not available for paper '${paperId}'. The PDF is available at https://arxiv.org/pdf/${baseId}`,
);
```

**8b. Recovery on errors — `notFound` message with format hint (all-miss metadata)**

```ts
// arxiv-get-metadata.tool.ts:46-51
if (result.papers.length === 0) {
  throw notFound(
    `No papers found for the given IDs. Verify ID format (e.g., '2401.12345' or '2401.12345v2').`,
    { ids },
  );
}
```

**4a. Auto-resolution — `stripVersion` for ID normalization**

```ts
// arxiv-service.ts:144-146
function stripVersion(id: string): string {
  return id.replace(/v\d+$/, '');
}
```

**4b. Auto-resolution — HTML source fallback (service-layer)**

```ts
// arxiv-service.ts:349-363
const response = await fetch(`https://arxiv.org/html/${baseId}`, { signal });
if (response.ok) return { content: await response.text(), source: 'arxiv_html' };
if (response.status >= 500) {
  throw new TransientError(`arxiv.org/html returned HTTP ${response.status}`);
}
// 404 or other 4xx → fall through to ar5iv
```
