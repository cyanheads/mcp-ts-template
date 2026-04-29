# openalex-mcp-server — helpfulness pattern audit

**Surveyed:** 2026-04-28
**Source:** src/mcp-server/tools/definitions/
**Tool count:** 3

## Pattern matrix

| Tool | Pattern | Field shape | Trigger | Typed in output schema? | Source ref |
|:-----|:--------|:------------|:--------|:------------------------|:-----------|
| `openalex_analyze_trends` | 1. Empty-result recovery | `format()` text: `"Try removing filters or grouping by a different field."` | `result.groups.length === 0` | No — format() only | analyze-trends.tool.ts:104 |
| `openalex_analyze_trends` | 4. Auto-resolution (echo) | `meta.echo: string` — compact restatement of input criteria | Always | Yes — `meta.echo: z.string()` | analyze-trends.tool.ts:52–56 |
| `openalex_search_entities` | 1. Empty-result recovery | `format()` text: `"Try broadening the query, removing filters, or switching search_mode."` | `result.results.length === 0` | No — format() only | search-entities.tool.ts:291–295 |
| `openalex_search_entities` | 4. Auto-resolution (echo) | `meta.echo: string` — compact restatement of input criteria | Always | Yes — `meta.echo: z.string()` | search-entities.tool.ts:219–223 |
| `openalex_search_entities` | 4. Auto-resolution (ID normalization) | `normalizeId(id)` — detects DOI URL, bare DOI, ORCID, ROR URL, ISSN, PMCID, pure-numeric PMID, OpenAlex URL, and prefixed passthrough | `input.id` present | No — service layer, transparent to caller | openalex-service.ts:55–100 |
| `openalex_search_entities` | 4. Auto-resolution (sort) | `normalizeSort(sort)` — translates `-field` prefix to `field:desc` | `input.sort` present | No — service layer, transparent to caller | openalex-service.ts:264–267 |
| `openalex_search_entities` | 3. Next-step pointers | Description inline: `"Use openalex_resolve_name to resolve names to IDs before filtering"` / `"Use openalex_resolve_name to find the ID if unknown."` | Static — in `description` and `id` field `describe()` | No — description prose only | search-entities.tool.ts:154, 164 |
| `openalex_resolve_name` | 2. Did-you-mean (disambiguation hints) | `hint: z.string().nullable()` — per-result context string (author names for works, last institution for authors, host org for sources, location for institutions) | Always (when API returns a non-null hint) | Yes — `hint: z.string().nullable()` | resolve-name.tool.ts:55–61 |
| `openalex_resolve_name` | 1. Empty-result recovery | `format()` text: `"No matches found."` (bare) | `result.results.length === 0` | No — format() only | resolve-name.tool.ts:91 |
| `openalex_resolve_name` | 4. Auto-resolution (cross-entity filter) | `data.results.filter((r) => KNOWN_AUTOCOMPLETE_TYPES.has(r.entity_type))` — strips non-entity types (country, license, etc.) from cross-entity autocomplete results | `params.entityType` absent | No — service layer, transparent to caller | openalex-service.ts:515–517 |

## Tool inventory

- `openalex_analyze_trends` — group-by aggregation over any entity type; returns groups with counts and pagination cursor.
- `openalex_search_entities` — search, filter, sort, or retrieve-by-ID across all OpenAlex entity types; core discovery tool.
- `openalex_resolve_name` — autocomplete name-to-ID resolution; returns up to 10 candidates with per-result disambiguation hints.

## Idiosyncratic patterns

**Abstract reconstruction (inverted-index → plaintext).** The service layer transparently converts OpenAlex's `abstract_inverted_index` format (a `{ word: position[] }` map, ~2x token cost) to a plaintext `abstract` field before the result reaches the tool output. The tool schema exposes `abstract` via `.passthrough()` on result items; callers simply request `select: ["abstract"]`.

```ts
// openalex-service.ts:108–117
function reconstructAbstract(invertedIndex: Record<string, number[]>): string {
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, word]) => word).join(' ');
}
```

openalex-service.ts:108–117 (reconstruction), 183–194 (splice into normalized record)

---

**HTML entity decoding.** `deepDecodeHtmlEntities` is applied recursively to every entity record and autocomplete result before returning. Handles numeric (`&#38;`), hex (`&#x27E9;`), and common named entities; malformed/unknown pass through unchanged. This is purely defensive normalization — not surfaced in any schema field.

```ts
// openalex-service.ts:144–157
function decodeHtmlEntities(input: string): string {
  if (!input.includes('&')) return input;
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, body: string) => { ... });
}
```

openalex-service.ts:144–157

---

**`select` field alias translation.** The tool accepts `"abstract"` in the `select` array even though the OpenAlex API only accepts `"abstract_inverted_index"`. The service translates the alias before the request, keeping tool ergonomics symmetric with the normalized response.

```ts
// openalex-service.ts:220–224
function translateSelect(entityType: SearchParams['entityType'], fields: string[]): string[] {
  const withRequired = Array.from(new Set([...REQUIRED_SEARCH_FIELDS, ...fields]));
  if (entityType !== 'works') return withRequired;
  return withRequired.map((field) => (field === 'abstract' ? 'abstract_inverted_index' : field));
}
```

openalex-service.ts:220–224

---

**Default field projection per entity type.** When no `select` is specified, the service substitutes a per-entity-type curated field list from `DEFAULT_SELECT` (types.ts:23–78) to prevent 20–70 KB per-record payloads from blowing up LLM context. Not surfaced to the caller; described only in a comment.

---

**Input echo field (`meta.echo`).** Both `analyze-trends` and `search-entities` inject a compact human-readable restatement of the actual query criteria into `meta.echo`. The stated purpose is to help callers identify what was actually sent when results are empty. It is typed in the output schema with an explanatory `describe()`, making it explicitly part of the contract.

```ts
// analyze-trends.tool.ts:52–56
echo: z
  .string()
  .describe(
    'Compact echo of the input criteria (entity_type, group_by, filters) — useful when no groups are returned so callers see what was actually requested.',
  ),
```

analyze-trends.tool.ts:52–56 (schema); search-entities.tool.ts:219–223 (analogous)

## Adoption gaps

- **`openalex_resolve_name` empty-result recovery is bare.** When no autocomplete matches are found, `format()` emits only `"No matches found."` with no actionable hint (e.g., try a shorter prefix, try a different entity_type, or pass the query directly to `search-entities` with `search_mode=semantic`). Given that this tool is explicitly positioned as the required first step before filtering, a zero-result response with no recovery path is a dead end for the caller.

- **`openalex_search_entities` empty-result recovery is untyped.** The hint `"Try broadening the query, removing filters, or switching search_mode."` lives only in `format()` — it is not present in the structured output. Clients that consume `structuredContent` (e.g., Claude Code) receive `meta.count === 0` and `results: []` with no recovery guidance at all.

- **`openalex_analyze_trends` empty-result recovery is untyped.** Same gap as above: the broadening hint (`"Try removing filters or grouping by a different field."`) is format()-only and absent from `structuredContent`.

## Concrete shape excerpts

**Echo field (typed, in output schema) — two tools:**

```ts
// analyze-trends.tool.ts:52–56
echo: z
  .string()
  .describe(
    'Compact echo of the input criteria (entity_type, group_by, filters) — useful when no groups are returned so callers see what was actually requested.',
  ),
```

```ts
// search-entities.tool.ts:219–223
echo: z
  .string()
  .describe(
    'Compact echo of the input criteria (entity_type, query, filters, sort, search_mode) — useful when results are empty so callers see what was actually searched.',
  ),
```

---

**Disambiguation hint field (typed, per result item) — resolve-name:**

```ts
// resolve-name.tool.ts:55–61
hint: z
  .string()
  .nullable()
  .describe(
    'Disambiguation context: author names (works), last institution (authors), host org (sources), location (institutions).',
  ),
```

---

**Empty-result recovery in format() — analyze-trends (format()-only, not in schema):**

```ts
// analyze-trends.tool.ts:100–107
if (result.groups.length === 0) {
  return [
    {
      type: 'text',
      text: `No groups found for ${result.meta.echo}. (count=${result.meta.count}, groups_count=${result.meta.groups_count ?? 0})\n\nTry removing filters or grouping by a different field.`,
    },
  ];
}
```

---

**Empty-result recovery in format() — search-entities (format()-only, not in schema):**

```ts
// search-entities.tool.ts:289–295
if (result.results.length === 0) {
  lines.push(
    '',
    `No matches for ${result.meta.echo}.`,
    'Try broadening the query, removing filters, or switching search_mode.',
  );
  return [{ type: 'text', text: lines.join('\n') }];
}
```

---

**ID normalization (service layer, transparent to caller):**

```ts
// openalex-service.ts:55–100
function normalizeId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.startsWith('https://openalex.org/')) { return trimmed.replace('https://openalex.org/', ''); }
  if (trimmed.startsWith('https://doi.org/')) { return `doi:${trimmed.replace('https://doi.org/', '')}`; }
  if (/^10\.\d{4,}\//.test(trimmed)) { return `doi:${trimmed}`; }
  if (trimmed.startsWith('https://ror.org/')) { return `ror:${trimmed}`; }
  if (/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(trimmed)) { return `orcid:${trimmed}`; }
  if (/^\d{4}-\d{3}[\dX]$/i.test(trimmed)) { return `issn:${trimmed}`; }
  if (/^PMC\d+$/i.test(trimmed)) { return `pmcid:${trimmed}`; }
  if (/^\d{5,}$/.test(trimmed)) { return `pmid:${trimmed}`; }
  return trimmed;
}
```

openalex-service.ts:55–100

---

**Cross-entity autocomplete filtering (service layer, transparent to caller):**

```ts
// openalex-service.ts:514–517
const results = params.entityType
  ? data.results
  : data.results.filter((r) => KNOWN_AUTOCOMPLETE_TYPES.has(r.entity_type));
```

openalex-service.ts:514–517
