# cdc-health-mcp-server — helpfulness pattern audit

**Surveyed:** 2026-04-28
**Source:** src/mcp-server/tools/definitions/
**Tool count:** 3

## Pattern matrix

| Tool | Pattern | Field shape | Trigger | Typed in output schema? | Source ref |
|:-----|:--------|:------------|:--------|:------------------------|:-----------|
| `cdc_discover_datasets` | 1. Empty-result recovery | `format()`-only prose string: `"No datasets found${criteria}. Try broader search terms, different keywords, or remove category/tag filters. Browse all datasets by calling with no parameters."` | `result.datasets.length === 0` | No | discover-datasets.tool.ts:112–120 |
| `cdc_discover_datasets` | 3. Next-step pointers | Implicit — discovery description says "Use this first to find the right dataset before querying"; schema field `id` described as `"Obtain from cdc_discover_datasets"` in downstream tools | Always (via description text) | No (description-only) | discover-datasets.tool.ts:10–12; get-dataset-schema.tool.ts:18–20; query-dataset.tool.ts:11–14 |
| `cdc_discover_datasets` | 4. Auto-resolution | `appliedFilters` echoes which filters were actually sent — allows consumer to detect filter mismatch; omits keys with falsy/empty values so the echo is clean | Always | Yes (`appliedFilters` in output schema) | discover-datasets.tool.ts:95–102 |
| `cdc_query_dataset` | 1. Empty-result recovery | `format()`-only bulleted suggestion list: verify spelling via GROUP BY enumeration, check column types, broaden WHERE clause | `!result.rows[0]` | No | query-dataset.tool.ts:82–98 |
| `cdc_query_dataset` | 3. Next-step pointers | `format()` empty-path explicitly suggests GROUP BY enumeration pattern as a spell-check idiom | `!result.rows[0]` | No | query-dataset.tool.ts:85–97 |
| `cdc_query_dataset` | 7. Warnings | `format()` display-truncation notice: `"...and N more rows (truncated in display)"` | `result.rows.length > 50` | No | query-dataset.tool.ts:118–120 |
| `cdc_query_dataset` | 8. Recovery on errors | Service-layer error message for 404: `"Dataset not found (404). Verify the dataset ID exists — it may have been retired or replaced. Search again with cdc_discover_datasets."` | HTTP 404 from Socrata API | No (thrown Error message) | socrata-service.ts:206–209 |
| `cdc_query_dataset` | 8. Recovery on errors | Service-layer error message for 429: `"Rate limited by Socrata API (429). Retry after a brief delay. Consider setting CDC_APP_TOKEN for higher limits."` | HTTP 429 from Socrata API | No (thrown Error message) | socrata-service.ts:210–213 |
| `cdc_query_dataset` | 8. Recovery on errors | Service-layer formatted error for `query.soql.no-such-column`: `'No such column "${col}". Use cdc_get_dataset_schema to see available columns for this dataset.'` | HTTP 400 + Socrata errorCode `query.soql.no-such-column` | No (thrown Error message) | socrata-service.ts:164–167 |
| `cdc_query_dataset` | 8. Recovery on errors | Service-layer formatted error for `query.soql.type-mismatch`: `"SoQL type mismatch: … Use cdc_get_dataset_schema to verify column data types."` | HTTP 400 + Socrata errorCode `query.soql.type-mismatch` | No (thrown Error message) | socrata-service.ts:168–170 |
| `cdc_get_dataset_schema` | 8. Recovery on errors | Same service-layer 404 and 400 error messages as `cdc_query_dataset` (shared `fetchJson` path) | HTTP 404/400 from Socrata API | No (thrown Error message) | socrata-service.ts:204–218 |

## Tool inventory

- `cdc_discover_datasets` — search the CDC dataset catalog by keyword, category, or tag; returns IDs and metadata for downstream use.
- `cdc_get_dataset_schema` — fetch column schema, row count, and timestamps for a specific dataset by four-by-four ID. [no output-schema patterns; participates in shared service error patterns]
- `cdc_query_dataset` — execute a SoQL query against any CDC dataset with filtering, aggregation, and sorting.

## Idiosyncratic patterns

**`appliedFilters` echo object** — `cdc_discover_datasets` returns the filters it actually applied as a typed output field, rather than reflecting the raw input. Keys are omitted when the corresponding input was absent or empty, so the echo is sparse-by-design — a consumer can distinguish "I searched with no query" from "I searched with query=X" without re-examining the input.

```ts
// discover-datasets.tool.ts:95–102
return {
  ...result,
  appliedFilters: {
    ...(input.query ? { query: input.query } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.tags?.length ? { tags: input.tags } : {}),
  },
};
```

Output schema (discover-datasets.tool.ts:76–81):
```ts
appliedFilters: z.object({
  query: z.string().optional().describe('Search query used.'),
  category: z.string().optional().describe('Category filter used.'),
  tags: z.array(z.string()).optional().describe('Tag filters used.'),
}).describe('Filters applied to this search (echoed for diagnostics).'),
```

**Structured HTTP-error parsing in service layer** — `formatBadRequestError` inspects Socrata's JSON error envelope (`errorCode`, `data.column`) and returns tool-redirecting prose rather than a raw HTTP message. This is service-layer logic, not tool output schema or `format()`.

```ts
// socrata-service.ts:158–178
private formatBadRequestError(body: string): string {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const code = parsed.errorCode as string | undefined;
    const data = parsed.data as Record<string, unknown> | undefined;

    if (code === 'query.soql.no-such-column') {
      const col = data?.column ?? 'unknown';
      return `No such column "${col}". Use cdc_get_dataset_schema to see available columns for this dataset.`;
    }
    if (code === 'query.soql.type-mismatch') {
      return `SoQL type mismatch: ${(parsed.message as string)?.split(';')[1]?.trim() ?? 'check column types'}. Use cdc_get_dataset_schema to verify column data types.`;
    }
    // ...
  } catch { /* fall through */ }
}
```

**Regex-gated input with cross-tool source hint** — Both `cdc_get_dataset_schema` and `cdc_query_dataset` apply a `regex(/^[a-z0-9]{4}-[a-z0-9]{4}$/)` constraint on `datasetId` and embed the sourcing hint (`"Obtain from cdc_discover_datasets"`) directly in the Zod `.describe()`. The service also calls `validateDatasetId` which throws a formatted error message including the same redirect. This is a belt-and-suspenders pattern: schema-level rejection with a Zod message, plus a service-level guard with an actionable error string.

```ts
// get-dataset-schema.tool.ts:15–20
datasetId: z
  .string()
  .regex(/^[a-z0-9]{4}-[a-z0-9]{4}$/)
  .describe('Four-by-four dataset identifier (e.g., "bi63-dtpu"). Obtain from cdc_discover_datasets.'),
```

```ts
// socrata-service.ts:180–185
private validateDatasetId(datasetId: string): void {
  if (!DATASET_ID_PATTERN.test(datasetId)) {
    throw new Error(
      `Invalid dataset ID "${datasetId}" — must match format [a-z0-9]{4}-[a-z0-9]{4} (e.g., "bi63-dtpu"). Get valid IDs from cdc_discover_datasets.`,
    );
  }
}
```

**Display-row truncation with explicit count** — `cdc_query_dataset` `format()` renders up to 50 rows in a markdown table and appends an explicit count of omitted rows. The `rowCount` field in `structuredContent` carries the full count; the `format()` truncation is a display-only affordance with a disclosure notice.

```ts
// query-dataset.tool.ts:108–120
const displayRows = result.rows.slice(0, 50);
// ...
if (result.rows.length > 50) {
  lines.push('', `*...and ${result.rows.length - 50} more rows (truncated in display)*`);
}
```

## Adoption gaps

- **`cdc_get_dataset_schema` has no empty-column-list handling.** If a dataset returns zero columns (malformed upstream metadata), `format()` renders an empty markdown table with no notice. A non-empty-column guard analogous to `discover-datasets`'s zero-results branch would be consistent.

- **`cdc_discover_datasets` has no empty-result handling in `structuredContent`.** The zero-results guidance (try broader terms, remove filters, browse without parameters) exists only in `format()`. Clients that read `structuredContent` exclusively (e.g., Claude Code) receive an empty `datasets: []` with `totalCount: 0` and no recovery text. The `output` schema has no `notice` or `hint` field, so there is no typed carrier for that guidance.

- **`cdc_query_dataset` empty-result suggestions are `format()`-only.** The three actionable suggestions (spell-check via GROUP BY, verify column types, broaden WHERE) are rendered as markdown bullets but have no typed counterpart in the output schema. A `suggestions?: string[]` or similar field would make them available to `structuredContent` consumers.

## Concrete shape excerpts

**Shape A — `format()`-only empty-result prose (discover-datasets.tool.ts:112–119)**
```ts
if (result.datasets.length === 0) {
  const criteria = filterParts.length > 0 ? ` for ${filterParts.join(', ')}` : '';
  return [
    {
      type: 'text',
      text: `No datasets found${criteria}. Try broader search terms, different keywords, or remove category/tag filters. Browse all datasets by calling with no parameters.`,
    },
  ];
}
```

**Shape B — `format()`-only bulleted suggestion list (query-dataset.tool.ts:82–98)**
```ts
if (!result.rows[0]) {
  return [
    {
      type: 'text',
      text: [
        'No rows matched the query.',
        '',
        `**Query:** \`${result.query}\``,
        '',
        'Suggestions:',
        '- Verify string values are spelled exactly as stored (check with a GROUP BY enumeration)',
        '- Check that numeric/date filters match the column type from the schema',
        '- Broaden the WHERE clause or remove filters to confirm data exists',
      ].join('\n'),
    },
  ];
}
```

**Shape C — typed `appliedFilters` echo (discover-datasets.tool.ts output schema, lines 76–82)**
```ts
appliedFilters: z.object({
  query: z.string().optional().describe('Search query used.'),
  category: z.string().optional().describe('Category filter used.'),
  tags: z.array(z.string()).optional().describe('Tag filters used.'),
}).describe('Filters applied to this search (echoed for diagnostics).'),
```

**Shape D — service-layer tool-redirecting error messages (socrata-service.ts:164–170, 206–213)**
```ts
// Column not found
return `No such column "${col}". Use cdc_get_dataset_schema to see available columns for this dataset.`;

// Type mismatch
return `SoQL type mismatch: ${...}. Use cdc_get_dataset_schema to verify column data types.`;

// Dataset not found
throw new Error('Dataset not found (404). Verify the dataset ID exists — it may have been retired or replaced. Search again with cdc_discover_datasets.');

// Rate limited
throw new Error('Rate limited by Socrata API (429). Retry after a brief delay. Consider setting CDC_APP_TOKEN for higher limits.');
```

**Shape E — display-truncation warning (query-dataset.tool.ts:118–120)**
```ts
if (result.rows.length > 50) {
  lines.push('', `*...and ${result.rows.length - 50} more rows (truncated in display)*`);
}
```
