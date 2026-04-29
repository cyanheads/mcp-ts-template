# pubchem-mcp-server — helpfulness pattern audit

**Surveyed:** 2026-04-28
**Source:** src/mcp-server/tools/definitions/
**Tool count:** 8

## Pattern matrix

| Tool | Pattern | Field shape | Trigger | Typed in output schema? | Source ref |
|:-----|:--------|:------------|:--------|:------------------------|:-----------|
| `pubchem_get_summary` | 5. Partial-success envelopes | `{ identifier: string \| number; found: boolean; data?: EntitySummaryData }` per array entry | Always — every requested identifier gets its own result object with `found: boolean` | Yes — `found: z.boolean()`, `data` optional | `get-summary.tool.ts:76-91` |
| `pubchem_get_summary` | 5. Partial-success envelopes (format) | `**Identifier ${s.identifier}** — not found` rendered for `found === false` entries | `!s.found \|\| !s.data` | format()-only rendering of the typed `found` flag | `get-summary.tool.ts:120-124` |
| `pubchem_get_compound_details` | 5. Partial-success envelopes | `{ cid: number; found: boolean; properties: Record<string, unknown>; descriptions?: ...; synonyms?: ...; drugLikeness?: ...; classification?: ... }` per array entry | Always — every requested CID gets a result with `found: boolean` | Yes — `found: z.boolean().describe('False when the CID does not exist in PubChem...')` | `get-compound-details.tool.ts:186-230` |
| `pubchem_get_compound_details` | 5. Partial-success envelopes (format) | `## CID ${c.cid} — not found in PubChem` block | `!c.found` | format()-only; the typed `found` field drives it | `get-compound-details.tool.ts:349-351` |
| `pubchem_get_compound_details` | 7. Warnings | `_+${more} more description${...} from other sources — increase maxDescriptions to see them._` inline in `format()` | `descriptionsTotal > descriptions.length` | format()-only; `descriptionsTotal?: z.number()` is typed but hint text is only in format | `get-compound-details.tool.ts:474-478` |
| `pubchem_get_compound_details` | 7. Warnings (descriptionsTotal) | `descriptionsTotal?: z.number().describe('Total distinct descriptions available before truncation. Larger than descriptions.length when more sources exist — increase maxDescriptions to see them.')` | `includeDescription === true && descriptions exist` | Yes — typed in output schema with actionable guidance embedded in `.describe()` | `get-compound-details.tool.ts:213-218` |
| `pubchem_get_compound_details` | 7. Warnings (PUG View cap) | `ctx.log.info('PUG View fetch capped at 10 CIDs', { requested, fetching })` | `(includeDescription \|\| includeClassification) && viewCids.length < foundCids.length` | No — logged only, not surfaced to caller | `get-compound-details.tool.ts:264-269` |
| `pubchem_get_compound_safety` | 5. Partial-success envelopes | `{ cid: number; hasData: boolean; ghs?: GHSData; source?: string }` | Always — `hasData: false` when no GHS data exists | Yes — `hasData: z.boolean()`, `ghs` optional | `get-compound-safety.tool.ts:24-56` |
| `pubchem_get_compound_safety` | 5. Partial-success envelopes (format) | `No GHS safety data available for CID ${result.cid}.` | `!result.hasData \|\| !result.ghs` | format()-only message; `hasData` field is typed | `get-compound-safety.tool.ts:82-84` |
| `pubchem_get_compound_xrefs` | 7. Warnings | `{ type: string; ids: (string \| number)[]; totalAvailable: number; truncated: boolean }` per xref type | Always reported; `truncated: true` when `totalAvailable > maxPerType` | Yes — `totalAvailable: z.number()`, `truncated: z.boolean()` | `get-compound-xrefs.tool.ts:46-66` |
| `pubchem_get_compound_xrefs` | 7. Warnings (format) | `${xref.ids.length} of ${xref.totalAvailable} total — truncated` in format header | `xref.truncated === true` | format()-only rendering of the typed `truncated` flag | `get-compound-xrefs.tool.ts:106-109` |
| `pubchem_search_compounds` | 4. Auto-resolution | Handler switches on `identifierType` to call `client.searchByName`, `client.searchBySmiles`, or `client.searchByInchiKey` — all return `number[]` (CIDs). Input is a free string; the resolution path (name→CID, SMILES→CID, InChIKey→CID) is chosen by `identifierType` enum, not inferred. | `searchType === 'identifier'` | No typed resolution-path output field; `identifier` on each result echoes the input string | `search-compounds.tool.ts:134-157` |
| `pubchem_search_compounds` | 4. Auto-resolution (SMILES POST) | SMILES posted as form body to avoid URL-encoding issues — transparent to caller | `identifierType === 'smiles'` | No — implementation detail only | `pubchem-client.ts:337-342` |
| `pubchem_search_assays` | 4. Auto-resolution | `targetType` enum `'proteinaccession'` silently remapped to `'accession'` before PubChem API call | `targetType === 'proteinaccession'` | No — silent client-side normalization | `pubchem-client.ts:727` |
| `pubchem_get_bioactivity` | 5. Partial-success envelopes | `{ totalAssays: number; activeCount: number; inactiveCount: number; results: AssayResult[] }` — `results` may be empty while counts are non-zero when `outcomeFilter` eliminates all visible rows | Always — summary counters always present regardless of filter | Yes — all four fields typed | `get-bioactivity.tool.ts:40-81` |
| `pubchem_get_bioactivity` | 1. Empty-result recovery | `'No matching assay results.'` rendered in `format()` when `results.length === 0` | `result.results.length === 0` | format()-only; not in output schema | `get-bioactivity.tool.ts:123-125` |
| `pubchem_search_assays` | 1. Empty-result recovery | `'No assays found.'` in `format()` when `aids.length === 0` | `result.aids.length === 0` | format()-only; not in output schema | `search-assays.tool.ts:86-87` |
| `pubchem_search_compounds` | 1. Empty-result recovery | `'No results.'` in `format()` when `results.length === 0` | `result.results.length === 0` | format()-only; not in output schema | `search-compounds.tool.ts:230-232` |

## Tool inventory

| Tool | Purpose | Patterns |
|:-----|:--------|:---------|
| `pubchem_search_assays` | Find bioassay IDs (AIDs) by biological target (gene symbol, protein name, Gene ID, UniProt accession) | 1. Empty-result recovery, 4. Auto-resolution |
| `pubchem_get_compound_image` | Fetch 2D structure PNG (base64) for a CID | [no patterns] |
| `pubchem_get_compound_safety` | Get GHS hazard classification, signal word, pictograms, H/P codes for a CID | 5. Partial-success envelopes |
| `pubchem_get_summary` | Batch-fetch entity summaries (assay, gene, protein, taxonomy) with per-identifier found/not-found | 5. Partial-success envelopes |
| `pubchem_get_compound_details` | Batch compound details: properties, descriptions, synonyms, drug-likeness, classification (1-100 CIDs) | 5. Partial-success envelopes, 7. Warnings |
| `pubchem_get_compound_xrefs` | External DB cross-references (PubMed, patents, gene IDs, CAS, etc.) with per-type truncation flags | 7. Warnings |
| `pubchem_search_compounds` | Search by name/SMILES/InChIKey/formula/substructure/similarity; optional property hydration | 1. Empty-result recovery, 4. Auto-resolution |
| `pubchem_get_bioactivity` | Compound bioactivity profile with outcome filter and aggregate counts | 1. Empty-result recovery, 5. Partial-success envelopes |

## Idiosyncratic patterns

**Dedup-before-deliver on descriptions and safety data.**
All three retrieval paths that aggregate multi-depositor PubChem data (descriptions, GHS hazard statements, pictograms) explicitly deduplicate before returning. In `pubchem-client.ts`, `dedupDescriptions` normalizes whitespace and lowercases before checking a `Set`; GHS parsing deduplicates hazard codes and pictogram strings inline with `Set`. The output schema communicates the dedup only indirectly through the prose in `.describe()` on `descriptionsTotal`. There is no typed `deduplicatedFrom?: number` or `rawCount?: number` field.

```ts
// pubchem-client.ts:164-175
function dedupDescriptions<T extends { text: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = item.text.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
```

**Property name normalization for PubChem API mismatch.**
PubChem returns `"SMILES"` for what callers request as `"IsomericSMILES"` and `"ConnectivitySMILES"` for `"CanonicalSMILES"`. The client silently renames them on the way out. No field on the output schema signals that normalization occurred.

```ts
// pubchem-client.ts:72-75
const PROPERTY_NAME_MAP: Record<string, string> = {
  SMILES: 'IsomericSMILES',
  ConnectivitySMILES: 'CanonicalSMILES',
};
```

**Drug-likeness: typed `null` for incomplete data, not a boolean.**
`drugLikeness.pass` is `z.boolean().nullable()`. `null` explicitly signals "insufficient property data" — different from `false` (failed). Same pattern on each individual rule: `pass: z.boolean().nullable()`, `value: z.number().nullable()`. This is a deliberate three-way: pass / fail / unavailable.

```ts
// get-compound-details.tool.ts:101-103
const hasGap = [...lipinskiRules, ...veberRules].some((r) => r.pass === null);
const pass = hasGap ? null : lipinskiViolations <= 1 && veberViolations === 0;
```

**ListKey polling for async PubChem searches.**
Structure/similarity searches return a `ListKey` instead of results when PubChem defers computation. The client detects `'Waiting' in data` and polls up to 20 times (1.5 s intervals). This is invisible to the tool layer and completely untyped in output — callers only see the final `number[]`. Timeout throws a plain `Error`.

```ts
// pubchem-client.ts:304-310
private async fetchCids(url: string, init?: RequestInit): Promise<number[]> {
  const data = await this.fetchJson<CidListResponse | ListKeyResponse>(url, init);
  if ('Waiting' in data) return this.pollListKey(data.Waiting.ListKey);
  return data.IdentifierList.CID;
}
```

**PUG View cap at 10 CIDs is silently partial.**
When `includeDescription` or `includeClassification` is requested for more than 10 found CIDs, the handler silently fetches only the first 10 and logs internally. The caller's response contains no field indicating that description/classification data was omitted for the remaining CIDs beyond 10.

```ts
// get-compound-details.tool.ts:258-269
const viewCids = foundCids.slice(0, 10);
if ((input.includeDescription || input.includeClassification) && viewCids.length < foundCids.length) {
  ctx.log.info('PUG View fetch capped at 10 CIDs', { requested: foundCids.length, fetching: viewCids.length });
}
```

**HTTP 400 treated as not-found for entity summaries.**
PubChem returns `400` (not `404`) for nonexistent entity IDs on some summary endpoints. The client detects this pattern by message text and converts to `null` (not-found), which is then surfaced as `found: false` in the output.

```ts
// pubchem-client.ts:770-772
if (error instanceof Error && /PubChem HTTP 400/.test(error.message)) return null;
```

## Adoption gaps

- **`pubchem_search_compounds` (identifier mode) — no per-identifier found/not-found.** When searching by name/SMILES/InChIKey for a batch of identifiers, failed lookups (zero CIDs returned) silently produce no entries in `results`. There is no `{ identifier: string; found: false }` row. A caller asking for ["aspirin", "not_a_real_compound"] gets results only for aspirin with no signal that the second lookup failed. `pubchem_get_summary` solves this with `found: boolean` — the same pattern is absent from identifier-mode compound search.

- **`pubchem_search_assays` — no empty-result hint beyond "No assays found."** The `format()` output says "No assays found." but the output schema carries no `notice` or `hint` field. Callers reading `structuredContent` (e.g. Claude Code) get `totalFound: 0` and `aids: []` with nothing to suggest trying a different `targetType` or broader `targetQuery`. The description advertises four target types — none of that guidance surfaces on a zero result.

- **`pubchem_get_compound_details` — silent partial data when PUG View capped.** When the 10-CID PUG View cap activates, CIDs 11-100 receive `properties` but no `descriptions` or `classification`, with no per-CID field indicating the omission. A `descriptionsFetched?: boolean` or `classificationFetched?: boolean` per compound record would make the gap machine-readable rather than requiring the caller to infer from missing optional fields.

- **`pubchem_get_bioactivity` — `results: []` with nonzero `totalAssays` has no guidance.** When `outcomeFilter: 'active'` is set but `activeCount: 0`, the caller gets an empty `results` array. The `format()` says "No matching assay results." but the output schema has no hint that relaxing `outcomeFilter` to `'all'` would yield data. The counts (`activeCount`, `inactiveCount`) are present and a consumer can infer this, but the schema doesn't make the connection explicit.

## Concrete shape excerpts

**Partial-success envelope — `get-summary` (typed, per-identifier):**
```ts
// get-summary.tool.ts:76-91
z.array(
  z.object({
    identifier: z.union([z.string(), z.number()]).describe('Queried identifier.'),
    found: z.boolean().describe('Whether the entity was found.'),
    data: entitySummaryDataSchema.optional().describe('Entity summary data. Populated fields depend on entityType.'),
  }).describe('Per-identifier summary result.'),
).describe('Summary results.')
```

**Partial-success envelope — `get-compound-details` (typed, per-CID):**
```ts
// get-compound-details.tool.ts:186-230
z.object({
  cid: z.number().describe('PubChem Compound ID.'),
  found: z.boolean().describe('False when the CID does not exist in PubChem (properties, description, etc. are empty).'),
  properties: z.record(z.string(), z.unknown()).describe('Requested physicochemical properties.'),
  descriptions: z.array(z.object({ source: z.string().optional(), text: z.string() })).optional(),
  descriptionsTotal: z.number().optional().describe('Total distinct descriptions available before truncation. Larger than descriptions.length when more sources exist — increase maxDescriptions to see them.'),
  synonyms: z.array(z.string()).optional(),
  drugLikeness: drugLikenessSchema.optional(),
  classification: classificationSchema.optional(),
}).describe('Per-CID compound detail record.')
```

**Partial-success envelope — `get-compound-safety` (typed, hasData flag):**
```ts
// get-compound-safety.tool.ts:24-56
z.object({
  cid: z.number().describe('PubChem Compound ID.'),
  hasData: z.boolean().describe('Whether GHS safety data is available for this compound.'),
  ghs: z.object({ signalWord: z.string().optional(), pictograms: z.array(z.string()), hazardStatements: z.array(...), precautionaryStatements: z.array(...) }).optional(),
  source: z.string().optional().describe('Data source attribution.'),
})
```

**Truncation warning — `get-compound-xrefs` (typed, per-type):**
```ts
// get-compound-xrefs.tool.ts:46-66
z.object({
  type: z.string().describe('Cross-reference type.'),
  ids: z.array(z.union([z.string(), z.number()])).describe('Cross-reference IDs (capped by maxPerType).'),
  totalAvailable: z.number().describe('Total IDs available before truncation.'),
  truncated: z.boolean().describe('Whether results were truncated.'),
}).describe('Cross-reference group for one type.')
```

**Truncation warning — `get-compound-details` descriptions (typed `descriptionsTotal` + format-only hint text):**
```ts
// get-compound-details.tool.ts:474-478
const more = total - shown;
if (more > 0) {
  descLines.push(`_+${more} more description${more === 1 ? '' : 's'} from other sources — increase maxDescriptions to see them._`);
}
```

**Drug-likeness nullable three-way — `get-compound-details`:**
```ts
// get-compound-details.tool.ts:100-103
const hasGap = [...lipinskiRules, ...veberRules].some((r) => r.pass === null);
const pass = hasGap ? null : lipinskiViolations <= 1 && veberViolations === 0;
// Schema:
pass: z.boolean().nullable().describe('Overall drug-likeness pass. Null when insufficient properties were available.')
```

**Empty-result recovery — format()-only, no schema field (all three search tools):**
```ts
// search-compounds.tool.ts:229-232
if (result.results.length === 0) {
  lines.push('No results.');
  return [{ type: 'text', text: lines.join('\n') }];
}

// search-assays.tool.ts:85-87
} else {
  lines.push('No assays found.');
}

// get-bioactivity.tool.ts:123-125
if (result.results.length === 0) {
  lines.push('No matching assay results.');
  return [{ type: 'text', text: lines.join('\n') }];
}
```
